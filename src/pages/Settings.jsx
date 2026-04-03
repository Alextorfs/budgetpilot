import { useState } from 'react'
import useStore from '../store'
import { supabase } from '../supabaseClient'
import '../styles/Settings.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Settings({ onBack }) {
  const { userProfile, activePlan, items, updateProfile, updatePlan, addItem, updateItem, deleteItem } = useStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  const [salary, setSalary] = useState(activePlan.monthly_salary_net || 0)
  const [funSavings, setFunSavings] = useState(activePlan.fun_savings_monthly_target || 0)

  const [hasShared, setHasShared] = useState(userProfile.has_shared_account || false)
  const [myTransfer, setMyTransfer] = useState(userProfile.shared_monthly_transfer || 0)
  const [partnerTransfer, setPartnerTransfer] = useState(userProfile.partner_monthly_transfer || 0)

  const [existingSavings, setExistingSavings] = useState(userProfile.existing_savings || 0)
  const [existingSharedSavings, setExistingSharedSavings] = useState(userProfile.existing_shared_savings || 0)

  const [showBonusForm, setShowBonusForm] = useState(false)
  const [editingBonus, setEditingBonus] = useState(null)
  const [bonusForm, setBonusForm] = useState({
    title: '',
    amount: 0,
    month: new Date().getMonth() + 1,
    goesToSavings: false,
  })

  const bonusItems = items.filter(i => i.kind === 'income' && i.frequency === 'yearly')

  const showSaved = (msg) => {
    setSaved(msg)
    setTimeout(() => setSaved(''), 3000)
  }

  const handleSaveBasics = async () => {
    setSaving(true)
    try {
      await updatePlan({
        monthly_salary_net: salary,
        fun_savings_monthly_target: funSavings,
      })
      await updateProfile({
        has_shared_account: hasShared,
        shared_monthly_transfer: hasShared ? myTransfer : 0,
        partner_monthly_transfer: hasShared ? partnerTransfer : 0,
      })
      showSaved('✅ Paramètres sauvegardés !')
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStocks = async () => {
    setSaving(true)
    try {
      await updateProfile({
        existing_savings: existingSavings,
        existing_shared_savings: hasShared ? existingSharedSavings : 0,
      })
      showSaved('✅ Stocks sauvegardés !')
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddBonus = async () => {
    if (!bonusForm.title.trim() || bonusForm.amount <= 0) return
    setSaving(true)
    try {
      if (editingBonus) {
        await updateItem(editingBonus.id, {
          title: bonusForm.title,
          amount: bonusForm.amount,
          payment_month: bonusForm.month,
          goes_to_savings: bonusForm.goesToSavings,
        })
        showSaved('✅ Revenu modifié !')
      } else {
        await addItem({
          title: bonusForm.title,
          category: 'other',
          kind: 'income',
          frequency: 'yearly',
          amount: bonusForm.amount,
          payment_month: bonusForm.month,
          allocation_mode: null,
          sharing_type: 'individual',
          my_share_percent: 100,
          is_included_in_shared_transfer: false,
          goes_to_savings: bonusForm.goesToSavings,
        })
        
        // Si le revenu va dans l'épargne projet, ajouter immédiatement au stock
        if (bonusForm.goesToSavings) {
          await updateProfile({
            existing_savings: (userProfile.existing_savings || 0) + bonusForm.amount
          })
        }
        
        showSaved('✅ Revenu exceptionnel ajouté !')
      }
      setBonusForm({ title: '', amount: 0, month: new Date().getMonth() + 1, goesToSavings: false })
      setShowBonusForm(false)
      setEditingBonus(null)
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEditBonus = (item) => {
    setBonusForm({
      title: item.title,
      amount: item.amount,
      month: item.payment_month || new Date().getMonth() + 1,
      goesToSavings: item.goes_to_savings || false,
    })
    setEditingBonus(item)
    setShowBonusForm(true)
  }

  const handleCancelBonus = () => {
    setBonusForm({ title: '', amount: 0, month: new Date().getMonth() + 1, goesToSavings: false })
    setEditingBonus(null)
    setShowBonusForm(false)
  }

  const handleDeleteBonus = async (id) => {
    if (!confirm('Supprimer ce revenu exceptionnel ?')) return
    setSaving(true)
    try {
      // Récupérer l'item avant suppression pour savoir s'il allait vers l'épargne
      const itemToDelete = items.find(i => i.id === id)
      
      await deleteItem(id)
      
      // Si le revenu allait vers l'épargne projet, diminuer le stock
      if (itemToDelete && itemToDelete.goes_to_savings) {
        await updateProfile({
          existing_savings: Math.max(0, (userProfile.existing_savings || 0) - itemToDelete.amount)
        })
      }
      
      showSaved('✅ Revenu supprimé !')
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        
        <div className="settings-header">
          <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
          <h1>⚙️ Paramètres</h1>
        </div>

        {saved && <div className="saved-banner">{saved}</div>}

        {/* Paramètres de base */}
        <div className="settings-section">
          <h2>💰 Budget mensuel</h2>
          
          <div className="form-group">
            <label>Salaire net mensuel</label>
            <input 
              type="number" 
              value={salary} 
              onChange={e => setSalary(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label>Épargne projet mensuelle</label>
            <input 
              type="number" 
              value={funSavings} 
              onChange={e => setFunSavings(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={hasShared}
                onChange={e => setHasShared(e.target.checked)}
                style={{ width: 'auto' }}
              />
              J'ai un compte commun
            </label>
          </div>

          {hasShared && (
            <>
              <div className="form-group">
                <label>Mon virement mensuel au compte commun</label>
                <input 
                  type="number" 
                  value={myTransfer} 
                  onChange={e => setMyTransfer(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="form-group">
                <label>Virement mensuel du/de la partenaire</label>
                <input 
                  type="number" 
                  value={partnerTransfer} 
                  onChange={e => setPartnerTransfer(parseFloat(e.target.value) || 0)}
                />
              </div>
            </>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleSaveBasics}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>

        {/* Stocks */}
        <div className="settings-section">
          <h2>🏦 Stocks d'épargne existants</h2>
          <p className="section-subtitle">Saisis tes montants déjà épargnés si tu commences en cours d'année</p>

          <div className="form-group">
            <label>Stock épargne projet actuel</label>
            <input 
              type="number" 
              value={existingSavings} 
              onChange={e => setExistingSavings(parseFloat(e.target.value) || 0)}
            />
          </div>

          {hasShared && (
            <div className="form-group">
              <label>Stock épargne commune actuel (ta part)</label>
              <input 
                type="number" 
                value={existingSharedSavings} 
                onChange={e => setExistingSharedSavings(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleSaveStocks}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder les stocks'}
          </button>
        </div>

        {/* Revenus exceptionnels */}
        <div className="settings-section">
          <h2>💸 Revenus exceptionnels</h2>
          <p className="section-subtitle">Prime, 13ème mois, vente, héritage...</p>

          {bonusItems.length > 0 && (
            <div className="bonus-list">
              {bonusItems.map(item => (
                <div key={item.id} className="bonus-item">
                  <div className="bonus-info">
                    <div className="bonus-title">
                      {item.title}
                      {item.goes_to_savings && <span className="bonus-badge">→ épargne</span>}
                    </div>
                    <div className="bonus-details">
                      {fmt(item.amount)} • {MONTHS[(item.payment_month || 1) - 1]}
                    </div>
                  </div>
                  <div className="bonus-actions">
                    <button className="btn-icon-sm" onClick={() => handleEditBonus(item)} title="Modifier">✏️</button>
                    <button className="btn-icon-sm" onClick={() => handleDeleteBonus(item.id)} title="Supprimer">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!showBonusForm && (
            <button 
              className="btn btn-outline" 
              onClick={() => setShowBonusForm(true)}
            >
              + Ajouter un revenu exceptionnel
            </button>
          )}

          {showBonusForm && (
            <div className="bonus-form">
              <div className="form-group">
                <label>Titre</label>
                <input 
                  type="text" 
                  value={bonusForm.title} 
                  onChange={e => setBonusForm({...bonusForm, title: e.target.value})}
                  placeholder="Ex: Prime annuelle"
                />
              </div>

              <div className="form-group">
                <label>Montant</label>
                <input 
                  type="number" 
                  value={bonusForm.amount} 
                  onChange={e => setBonusForm({...bonusForm, amount: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="form-group">
                <label>Mois de réception</label>
                <select 
                  value={bonusForm.month} 
                  onChange={e => setBonusForm({...bonusForm, month: parseInt(e.target.value)})}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={bonusForm.goesToSavings}
                    onChange={e => setBonusForm({...bonusForm, goesToSavings: e.target.checked})}
                    style={{ width: 'auto' }}
                  />
                  Va directement dans l'épargne projet
                </label>
              </div>

              <div className="bonus-form-actions">
                <button className="btn btn-secondary" onClick={handleCancelBonus}>Annuler</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddBonus}
                  disabled={!bonusForm.title.trim() || bonusForm.amount <= 0 || saving}
                >
                  {saving ? (editingBonus ? 'Modification...' : 'Ajout...') : (editingBonus ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bouton déconnexion */}
        <div className="logout-section">
          <button 
            className="btn btn-danger btn-lg"
            onClick={async () => {
              if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                await supabase.auth.signOut()
              }
            }}
          >
            🚪 Se déconnecter
          </button>
        </div>

      </div>
    </div>
  )
}
