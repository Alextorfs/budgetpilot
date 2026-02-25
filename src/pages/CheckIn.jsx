import { useState, useEffect } from 'react'
import useStore from '../store'
import '../styles/CheckIn.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function CheckIn({ onBack }) {
  const { userProfile, activePlan, items, createCheckIn, updateProfile, updateMultipleProvisionStocks, getProvisionStock } = useStore()
  const [currentMonth] = useState(new Date().getMonth() + 1)
  const [saving, setSaving] = useState(false)
  
  // États pour les 4 questions
  const [funSavingsDone, setFunSavingsDone] = useState(null)
  const [funSavingsAmount, setFunSavingsAmount] = useState(0)
  
  const [personalProvisionsDone, setPersonalProvisionsDone] = useState(null)
  const [personalProvisionsDetail, setPersonalProvisionsDetail] = useState({})
  
  const [commonTransferDone, setCommonTransferDone] = useState(null)
  const [commonTransferAmount, setCommonTransferAmount] = useState(0)
  
  const [sharedSavingsDone, setSharedSavingsDone] = useState(null)
  const [sharedSavingsDetail, setSharedSavingsDetail] = useState({})

  const hasShared = userProfile?.has_shared_account || false
  const funSavingsTarget = activePlan?.fun_savings_monthly_target || 0
  const myTransfer = userProfile?.shared_monthly_transfer || 0

  const computeProvision = (item) => {
    if (!item.payment_month || item.frequency === 'monthly') return 0
    const myAmount = item.sharing_type === 'common'
      ? item.amount * ((item.my_share_percent || 100) / 100)
      : item.amount
    if (item.allocation_mode === 'spread') return myAmount / 12
    if (currentMonth > item.payment_month) return 0
    const monthsLeft = item.payment_month - currentMonth
    if (monthsLeft <= 0) return myAmount
    return myAmount / monthsLeft
  }

  const provisionItems = items.filter(i => {
    if (i.frequency === 'monthly' || i.kind !== 'expense' || i.is_unplanned) return false
    if (i.allocation_mode === 'spread') return true
    return i.payment_month >= currentMonth
  })
  
  const personalProvisionItems = provisionItems.filter(i => i.sharing_type === 'individual')
  const personalProvisionsTarget = personalProvisionItems.reduce((s, i) => s + computeProvision(i), 0)

  const commonProvisionItems = provisionItems.filter(i => 
    i.sharing_type === 'common' && 
    !i.is_included_in_shared_transfer
  )
  const sharedSavingsTarget = commonProvisionItems.reduce((s, i) => s + computeProvision(i), 0)

  // Initialiser les détails avec les montants cibles
  useEffect(() => {
    const personalDetail = {}
    personalProvisionItems.forEach(item => {
      personalDetail[item.id] = computeProvision(item)
    })
    setPersonalProvisionsDetail(personalDetail)

    const sharedDetail = {}
    commonProvisionItems.forEach(item => {
      sharedDetail[item.id] = computeProvision(item)
    })
    setSharedSavingsDetail(sharedDetail)
  }, [items])

  useEffect(() => {
    setFunSavingsAmount(funSavingsTarget)
    setCommonTransferAmount(myTransfer)
  }, [funSavingsTarget, myTransfer])

  const canSubmit = 
    funSavingsDone !== null &&
    (personalProvisionItems.length === 0 || personalProvisionsDone !== null) &&
    (!hasShared || commonTransferDone !== null) &&
    (commonProvisionItems.length === 0 || sharedSavingsDone !== null)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSaving(true)

    try {
      // 1. Créer le check-in
      await createCheckIn({
        month: currentMonth,
        year: activePlan.year,
        fun_savings_done: funSavingsDone,
        fun_savings_amount: funSavingsDone ? funSavingsAmount : (funSavingsAmount || 0),
        personal_provisions_done: personalProvisionsDone === null ? true : personalProvisionsDone,
        personal_provisions_amount: personalProvisionsDone ? personalProvisionsTarget : Object.values(personalProvisionsDetail).reduce((s, v) => s + v, 0),
        common_transfer_done: commonTransferDone === null ? true : commonTransferDone,
        common_transfer_amount: commonTransferDone ? myTransfer : (commonTransferAmount || 0),
        shared_savings_done: sharedSavingsDone === null ? true : sharedSavingsDone,
        shared_savings_amount: sharedSavingsDone ? sharedSavingsTarget : Object.values(sharedSavingsDetail).reduce((s, v) => s + v, 0),
      })

      // 2. Mettre à jour existing_provisions (provisions perso)
      const totalPersonalProvisions = personalProvisionsDone 
        ? personalProvisionsTarget 
        : Object.values(personalProvisionsDetail).reduce((s, v) => s + v, 0)
      
      if (totalPersonalProvisions > 0) {
        await updateProfile({
          existing_provisions: (userProfile.existing_provisions || 0) + totalPersonalProvisions
        })
      }

      // 3. Mettre à jour les provision_stocks pour provisions perso
      if (personalProvisionItems.length > 0) {
        const updates = []
        
        if (personalProvisionsDone) {
          // Tout validé : ajouter le montant prévu pour chaque provision
          personalProvisionItems.forEach(item => {
            const amount = computeProvision(item)
            const currentStock = getProvisionStock(item.id)
            updates.push({ itemId: item.id, amount: currentStock + amount })
          })
        } else {
          // Détail : ajouter le montant saisi pour chaque provision
          Object.keys(personalProvisionsDetail).forEach(itemId => {
            const amount = personalProvisionsDetail[itemId] || 0
            const currentStock = getProvisionStock(itemId)
            updates.push({ itemId, amount: currentStock + amount })
          })
        }
        
        if (updates.length > 0) {
          await updateMultipleProvisionStocks(updates)
        }
      }

      // 4. Mettre à jour les provision_stocks pour provisions communes
      if (commonProvisionItems.length > 0) {
        const updates = []
        
        if (sharedSavingsDone) {
          // Tout validé
          commonProvisionItems.forEach(item => {
            const amount = computeProvision(item)
            const currentStock = getProvisionStock(item.id)
            updates.push({ itemId: item.id, amount: currentStock + amount })
          })
        } else {
          // Détail
          Object.keys(sharedSavingsDetail).forEach(itemId => {
            const amount = sharedSavingsDetail[itemId] || 0
            const currentStock = getProvisionStock(itemId)
            updates.push({ itemId, amount: currentStock + amount })
          })
        }
        
        if (updates.length > 0) {
          await updateMultipleProvisionStocks(updates)
        }
      }

      alert('✅ Check-in validé !')
      onBack()
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="checkin-page">
      <div className="checkin-container">
        
        <div className="checkin-header">
          <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
          <h1>📋 Check-in {MONTHS[currentMonth - 1]}</h1>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '100%' }}></div>
        </div>

        {/* Question 1 : Épargne projet */}
        <div className="question-card">
          <h3>🎯 Épargne projet</h3>
          <p>As-tu viré ton épargne projet ce mois-ci ?</p>
          <div className="amount-display">Montant prévu : {fmt(funSavingsTarget)}</div>
          
          <div className="choice-buttons">
            <button 
              className={`choice-btn ${funSavingsDone === true ? 'active' : ''}`}
              onClick={() => {
                setFunSavingsDone(true)
                setFunSavingsAmount(funSavingsTarget)
              }}
            >
              ✅ Oui
            </button>
            <button 
              className={`choice-btn ${funSavingsDone === false ? 'active' : ''}`}
              onClick={() => setFunSavingsDone(false)}
            >
              ❌ Non
            </button>
          </div>

          {funSavingsDone === false && (
            <div className="amount-adjust">
              <label>Montant réellement viré :</label>
              <input 
                type="number" 
                value={funSavingsAmount} 
                onChange={e => setFunSavingsAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
        </div>

        {/* Question 2 : Provisions perso */}
        {personalProvisionItems.length > 0 && (
          <div className="question-card">
            <h3>💼 Provisions personnelles</h3>
            <p>As-tu mis de côté tes provisions perso ce mois-ci ?</p>
            <div className="amount-display">Montant prévu : {fmt(personalProvisionsTarget)}</div>
            
            <div className="choice-buttons">
              <button 
                className={`choice-btn ${personalProvisionsDone === true ? 'active' : ''}`}
                onClick={() => setPersonalProvisionsDone(true)}
              >
                ✅ Oui
              </button>
              <button 
                className={`choice-btn ${personalProvisionsDone === false ? 'active' : ''}`}
                onClick={() => setPersonalProvisionsDone(false)}
              >
                ❌ Non
              </button>
            </div>

            {personalProvisionsDone === false && (
              <div className="provisions-detail">
                <p className="detail-subtitle">Montant par provision :</p>
                {personalProvisionItems.map(item => {
                  const target = computeProvision(item)
                  return (
                    <div key={item.id} className="provision-item">
                      <label>{item.title}</label>
                      <div className="provision-input-group">
                        <span className="provision-target">Prévu : {fmt(target)}</span>
                        <input 
                          type="number" 
                          value={personalProvisionsDetail[item.id] || 0}
                          onChange={e => setPersonalProvisionsDetail({
                            ...personalProvisionsDetail,
                            [item.id]: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="provisions-total">
                  Total : {fmt(Object.values(personalProvisionsDetail).reduce((s, v) => s + v, 0))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question 3 : Compte commun */}
        {hasShared && (
          <div className="question-card">
            <h3>🏠 Compte commun</h3>
            <p>As-tu viré ta part au compte commun ?</p>
            <div className="amount-display">Montant prévu : {fmt(myTransfer)}</div>
            
            <div className="choice-buttons">
              <button 
                className={`choice-btn ${commonTransferDone === true ? 'active' : ''}`}
                onClick={() => {
                  setCommonTransferDone(true)
                  setCommonTransferAmount(myTransfer)
                }}
              >
                ✅ Oui
              </button>
              <button 
                className={`choice-btn ${commonTransferDone === false ? 'active' : ''}`}
                onClick={() => setCommonTransferDone(false)}
              >
                ❌ Non
              </button>
            </div>

            {commonTransferDone === false && (
              <div className="amount-adjust">
                <label>Montant réellement viré :</label>
                <input 
                  type="number" 
                  value={commonTransferAmount} 
                  onChange={e => setCommonTransferAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
        )}

        {/* Question 4 : Épargne commune */}
        {hasShared && commonProvisionItems.length > 0 && (
          <div className="question-card">
            <h3>💰 Épargne commune (provisions)</h3>
            <p>As-tu viré tes provisions épargne commune ?</p>
            <div className="amount-display">Montant prévu : {fmt(sharedSavingsTarget)}</div>
            
            <div className="choice-buttons">
              <button 
                className={`choice-btn ${sharedSavingsDone === true ? 'active' : ''}`}
                onClick={() => setSharedSavingsDone(true)}
              >
                ✅ Oui
              </button>
              <button 
                className={`choice-btn ${sharedSavingsDone === false ? 'active' : ''}`}
                onClick={() => setSharedSavingsDone(false)}
              >
                ❌ Non
              </button>
            </div>

            {sharedSavingsDone === false && (
              <div className="provisions-detail">
                <p className="detail-subtitle">Montant par provision :</p>
                {commonProvisionItems.map(item => {
                  const target = computeProvision(item)
                  return (
                    <div key={item.id} className="provision-item">
                      <label>{item.title} ({item.my_share_percent}%)</label>
                      <div className="provision-input-group">
                        <span className="provision-target">Prévu : {fmt(target)}</span>
                        <input 
                          type="number" 
                          value={sharedSavingsDetail[item.id] || 0}
                          onChange={e => setSharedSavingsDetail({
                            ...sharedSavingsDetail,
                            [item.id]: parseFloat(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="provisions-total">
                  Total : {fmt(Object.values(sharedSavingsDetail).reduce((s, v) => s + v, 0))}
                </div>
              </div>
            )}
          </div>
        )}

        <button 
          className="btn btn-primary btn-lg" 
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
        >
          {saving ? 'Validation...' : '✅ Valider le check-in'}
        </button>

      </div>
    </div>
  )
}
