import { useState, useEffect } from 'react'
import useStore from '../store'
import '../styles/CheckIn.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function CheckIn({ onBack }) {
  const { userProfile, activePlan, items, createCheckIn } = useStore()
  const [currentMonth] = useState(new Date().getMonth() + 1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    funSavingsDone: null,
    funSavingsAmount: 0,
    personalProvisionsDone: null,
    personalProvisionsAmount: 0,
    commonTransferDone: null,
    commonTransferAmount: 0,
  })

  const hasShared = userProfile?.has_shared_account || false
  const funSavingsTarget = activePlan?.fun_savings_monthly_target || 0

  // Calcul provisions perso
  const computeProvision = (item) => {
    if (!item.payment_month || item.frequency === 'monthly') return 0
    if (currentMonth > item.payment_month) return 0
    const myAmount = item.sharing_type === 'common'
      ? item.amount * ((item.my_share_percent || 100) / 100)
      : item.amount
    if (item.allocation_mode === 'spread') return myAmount / 12
    const monthsLeft = item.payment_month - currentMonth
    if (monthsLeft <= 0) return myAmount
    return myAmount / monthsLeft
  }

  const provisionItems = items.filter(i => i.frequency !== 'monthly' && i.kind === 'expense' && i.payment_month >= currentMonth)
  const personalProvisionItems = provisionItems.filter(i => i.sharing_type === 'individual')
  const commonProvisionItems = provisionItems.filter(i => i.sharing_type === 'common' && !i.is_included_in_shared_transfer)

  const personalProvisionsTarget = personalProvisionItems.reduce((s, i) => s + computeProvision(i), 0)
  const commonProvisionsTarget = commonProvisionItems.reduce((s, i) => s + computeProvision(i), 0)
  const commonTransferTarget = (userProfile?.shared_monthly_transfer || 0) + commonProvisionsTarget

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      funSavingsAmount: funSavingsTarget,
      personalProvisionsAmount: personalProvisionsTarget,
      commonTransferAmount: commonTransferTarget,
    }))
  }, [funSavingsTarget, personalProvisionsTarget, commonTransferTarget])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await createCheckIn({
        month: currentMonth,
        year: activePlan.year,
        fun_savings_done: form.funSavingsDone,
        fun_savings_amount: form.funSavingsDone ? form.funSavingsAmount : 0,
        personal_provisions_done: form.personalProvisionsDone,
        personal_provisions_amount: form.personalProvisionsDone ? form.personalProvisionsAmount : 0,
        common_transfer_done: form.commonTransferDone,
        common_transfer_amount: form.commonTransferDone ? form.commonTransferAmount : 0,
      })
      alert('✅ Check-in enregistré !')
      onBack()
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = form.funSavingsDone !== null && 
    (personalProvisionsTarget === 0 || form.personalProvisionsDone !== null) &&
    (!hasShared || form.commonTransferDone !== null)

  return (
    <div className="checkin-page">
      <div className="checkin-container">
        
        <div className="checkin-header">
          <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
          <div>
            <h1>📝 Check-in de {MONTHS[currentMonth - 1]}</h1>
            <p className="checkin-subtitle">Valide tes virements du mois</p>
          </div>
        </div>

        {/* Épargne projet */}
        <div className="checkin-card">
          <div className="checkin-question">
            <div className="question-icon">🎯</div>
            <div className="question-content">
              <h3>As-tu viré ton épargne projet ?</h3>
              <p className="question-detail">Montant prévu : <strong>{fmt(funSavingsTarget)}</strong></p>
            </div>
          </div>

          <div className="answer-buttons">
            <button 
              className={`answer-btn ${form.funSavingsDone === true ? 'active yes' : ''}`}
              onClick={() => setForm(p => ({ ...p, funSavingsDone: true, funSavingsAmount: funSavingsTarget }))}
            >
              ✅ Oui
            </button>
            <button 
              className={`answer-btn ${form.funSavingsDone === false ? 'active no' : ''}`}
              onClick={() => setForm(p => ({ ...p, funSavingsDone: false, funSavingsAmount: 0 }))}
            >
              ❌ Non
            </button>
          </div>

          {form.funSavingsDone === true && (
            <div className="amount-adjust fade-in">
              <label>Montant réellement viré :</label>
              <div className="amount-input-group">
                <input 
                  type="number" 
                  value={form.funSavingsAmount} 
                  onChange={e => setForm(p => ({ ...p, funSavingsAmount: parseFloat(e.target.value) || 0 }))}
                />
                <span>€</span>
              </div>
            </div>
          )}
        </div>

        {/* Provisions perso */}
        {personalProvisionsTarget > 0 && (
          <div className="checkin-card">
            <div className="checkin-question">
              <div className="question-icon">💰</div>
              <div className="question-content">
                <h3>As-tu mis de côté tes provisions perso ?</h3>
                <p className="question-detail">Montant prévu : <strong>{fmt(personalProvisionsTarget)}</strong></p>
                <div className="provision-list">
                  {personalProvisionItems.map(item => (
                    <span key={item.id} className="provision-tag">{item.title} • {fmt(computeProvision(item))}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="answer-buttons">
              <button 
                className={`answer-btn ${form.personalProvisionsDone === true ? 'active yes' : ''}`}
                onClick={() => setForm(p => ({ ...p, personalProvisionsDone: true, personalProvisionsAmount: personalProvisionsTarget }))}
              >
                ✅ Oui
              </button>
              <button 
                className={`answer-btn ${form.personalProvisionsDone === false ? 'active no' : ''}`}
                onClick={() => setForm(p => ({ ...p, personalProvisionsDone: false, personalProvisionsAmount: 0 }))}
              >
                ❌ Non
              </button>
            </div>

            {form.personalProvisionsDone === true && (
              <div className="amount-adjust fade-in">
                <label>Montant réellement mis de côté :</label>
                <div className="amount-input-group">
                  <input 
                    type="number" 
                    value={form.personalProvisionsAmount} 
                    onChange={e => setForm(p => ({ ...p, personalProvisionsAmount: parseFloat(e.target.value) || 0 }))}
                  />
                  <span>€</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compte commun */}
        {hasShared && (
          <div className="checkin-card">
            <div className="checkin-question">
              <div className="question-icon">🏠</div>
              <div className="question-content">
                <h3>As-tu viré sur le compte commun ?</h3>
                <p className="question-detail">Montant prévu : <strong>{fmt(commonTransferTarget)}</strong></p>
                <div className="provision-list">
                  <span className="provision-tag">Virement fixe • {fmt(userProfile.shared_monthly_transfer)}</span>
                  {commonProvisionItems.map(item => (
                    <span key={item.id} className="provision-tag">{item.title} • {fmt(computeProvision(item))}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="answer-buttons">
              <button 
                className={`answer-btn ${form.commonTransferDone === true ? 'active yes' : ''}`}
                onClick={() => setForm(p => ({ ...p, commonTransferDone: true, commonTransferAmount: commonTransferTarget }))}
              >
                ✅ Oui
              </button>
              <button 
                className={`answer-btn ${form.commonTransferDone === false ? 'active no' : ''}`}
                onClick={() => setForm(p => ({ ...p, commonTransferDone: false, commonTransferAmount: 0 }))}
              >
                ❌ Non
              </button>
            </div>

            {form.commonTransferDone === true && (
              <div className="amount-adjust fade-in">
                <label>Montant réellement viré :</label>
                <div className="amount-input-group">
                  <input 
                    type="number" 
                    value={form.commonTransferAmount} 
                    onChange={e => setForm(p => ({ ...p, commonTransferAmount: parseFloat(e.target.value) || 0 }))}
                  />
                  <span>€</span>
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
          {saving ? 'Enregistrement...' : '✅ Valider le check-in'}
        </button>

      </div>
    </div>
  )
}
