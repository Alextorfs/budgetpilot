import { useState } from 'react'
import useStore from '../store'
import '../styles/Settings.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Settings({ onBack }) {
  const { userProfile, activePlan, items, updateProfile, updatePlan, addItem, deleteItem } = useStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')

  // ── Formulaire salaire / plan ──
  const [salary, setSalary] = useState(activePlan.monthly_salary_net || 0)
  const [funSavings, setFunSavings] = useState(activePlan.fun_savings_monthly_target || 0)

  // ── Formulaire compte commun ──
  const [myTransfer, setMyTransfer] = useState(userProfile.shared_monthly_transfer || 0)
  const [partnerTransfer, setPartnerTransfer] = useState(userProfile.partner_monthly_transfer || 0)

  // ── Formulaire épargne existante ──
  const [existingSavings, setExistingSavings] = useState(userProfile.existing_savings || 0)

  // ── Formulaire revenu exceptionnel ──
  const [showBonusForm, setShowBonusForm] = useState(false)
  const [bonusForm, setBonusForm] = useState({
    title: '',
    amount: 0,
    month: new Date().getMonth() + 1,
  })

  // Revenus exceptionnels existants
  const bonusItems = items.filter(i => i.kind === 'income' && i.frequency === 'yearly')

  const showSaved = (msg) => {
    setSaved(msg)
    setTimeout(() => setSaved(''), 3000)
  }

  const handleSaveSalary = async () => {
    setSaving(true)
    try {
      await updatePlan({ monthly_salary_net: salary, fun_savings_monthly_target: funSavings })
      showSaved('✅ Salaire et épargne mis à jour !')
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCommon = async () => {
    setSaving(true)
    try {
      await updateProfile({
        shared_monthly_transfer: myTransfer,
        partner_monthly_transfer: partnerTransfer,
      })
      showSaved('✅ Virements compte commun mis à jour !')
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSavings = async () => {
    setSaving(true)
    try {
      await updateProfile({ existing_savings: existingSavings })
      showSaved('✅ Épargne mise à jour !')
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
      })
      setBonusForm({ title: '', amount: 0, month: new Date().getMonth() + 1 })
      setShowBonusForm(false)
      showSaved('✅ Revenu exceptionnel ajouté !')
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBonus = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return
    await deleteItem(id)
  }

  return (
    <div className="settings-page">
      <div className="settings-container">

        {/* Header */}
        <div className="settings-header">
          <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
          <h1>⚙️ Paramètres</h1>
        </div>

        {saved && <div className="saved-banner">{saved}</div>}

        {/* ── Salaire & épargne ── */}
        <div className="settings-card">
          <h2>💰 Salaire & Épargne projet</h2>

          <div className="form-group">
            <label>Salaire net mensuel</label>
            <div className="amount-display primary">{salary.toLocaleString('fr-FR')} €</div>
            <input type="range" min="0" max="15000" step="50" value={salary} onChange={e => setSalary(parseInt(e.target.value))} />
            <div className="range-labels"><span>0 €</span><span>15 000 €</span></div>
            <input type="number" className="number-input" value={salary} onChange={e => setSalary(parseInt(e.target.value) || 0)} placeholder="Ou saisir directement..." />
          </div>

          <div className="form-group">
            <label>Virement mensuel épargne projet</label>
            <p className="help-text">L'argent que tu vires chaque mois pour tes futurs projets (vacances, voiture, travaux…)</p>
            <div className="amount-display purple">{funSavings.toLocaleString('fr-FR')} €</div>
            {salary > 0 && <div className="percentage-hint">{Math.round((funSavings / salary) * 100)}% de ton salaire</div>}
            <input type="range" min="0" max={Math.min(salary, 5000)} step="10" value={funSavings} onChange={e => setFunSavings(parseInt(e.target.value))} />
            <div className="range-labels"><span>0 €</span><span>{Math.min(salary, 5000).toLocaleString('fr-FR')} €</span></div>
            <input type="number" className="number-input" value={funSavings} onChange={e => setFunSavings(parseInt(e.target.value) || 0)} />
          </div>

          <button className="btn btn-primary" onClick={handleSaveSalary} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* ── Épargne existante ── */}
        <div className="settings-card">
          <h2>🏦 Épargne disponible (stock)</h2>
          <p className="help-text">Ton épargne actuelle, utilisée pour les projections de fin d'année</p>

          <div className="form-group">
            <div className="amount-display">{existingSavings.toLocaleString('fr-FR')} €</div>
            <input type="range" min="0" max="100000" step="500" value={existingSavings} onChange={e => setExistingSavings(parseInt(e.target.value))} />
            <div className="range-labels"><span>0 €</span><span>100 000 €</span></div>
            <input type="number" className="number-input" value={existingSavings} onChange={e => setExistingSavings(parseInt(e.target.value) || 0)} />
          </div>

          <button className="btn btn-primary" onClick={handleSaveSavings} disabled={saving}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        {/* ── Compte commun ── */}
        {userProfile.has_shared_account && (
          <div className="settings-card">
            <h2>🏠 Compte Commun</h2>

            <div className="form-group">
              <label>💳 Ton virement mensuel</label>
              <div className="amount-display orange">{myTransfer.toLocaleString('fr-FR')} €</div>
              <input type="range" min="0" max="5000" step="50" value={myTransfer} onChange={e => setMyTransfer(parseInt(e.target.value))} />
              <div className="range-labels"><span>0 €</span><span>5 000 €</span></div>
              <input type="number" className="number-input" value={myTransfer} onChange={e => setMyTransfer(parseInt(e.target.value) || 0)} />
            </div>

            <div className="form-group">
              <label>💳 Virement mensuel de ton/ta partenaire</label>
              <div className="amount-display orange">{partnerTransfer.toLocaleString('fr-FR')} €</div>
              <input type="range" min="0" max="5000" step="50" value={partnerTransfer} onChange={e => setPartnerTransfer(parseInt(e.target.value))} />
              <div className="range-labels"><span>0 €</span><span>5 000 €</span></div>
              <input type="number" className="number-input" value={partnerTransfer} onChange={e => setPartnerTransfer(parseInt(e.target.value) || 0)} />
            </div>

            <div className="total-preview">
              <span>Total mensuel compte commun :</span>
              <strong>{(myTransfer + partnerTransfer).toLocaleString('fr-FR')} €</strong>
            </div>

            <button className="btn btn-primary" onClick={handleSaveCommon} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        )}

        {/* ── Revenus exceptionnels ── */}
        <div className="settings-card">
          <div className="card-header-row">
            <div>
              <h2>🎁 Revenus exceptionnels</h2>
              <p className="help-text">Bonus, virement cadeau, prime, remboursement… Un revenu ponctuel qui arrive un mois précis.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowBonusForm(true)}>
              + Ajouter
            </button>
          </div>

          {/* Liste des revenus exceptionnels */}
          {bonusItems.length === 0 ? (
            <div className="empty-bonus">Aucun revenu exceptionnel prévu</div>
          ) : (
            <div className="bonus-list">
              {bonusItems.map(item => (
                <div key={item.id} className="bonus-item">
                  <div className="bonus-info">
                    <div className="bonus-title">{item.title}</div>
                    <div className="bonus-meta">{MONTHS[(item.payment_month || 1) - 1]} · revenu ponctuel</div>
                  </div>
                  <div className="bonus-right">
                    <div className="bonus-amount">+{fmt(item.amount)}</div>
                    <button className="btn-icon-sm" onClick={() => handleDeleteBonus(item.id)} title="Supprimer">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulaire ajout */}
          {showBonusForm && (
            <div className="bonus-form">
              <h3>Nouveau revenu exceptionnel</h3>

              <div className="form-group">
                <label>Titre</label>
                <input
                  type="text"
                  value={bonusForm.title}
                  onChange={e => setBonusForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Bonus annuel, Cadeau anniversaire, Prime..."
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Montant : <strong>{bonusForm.amount.toLocaleString('fr-FR')} €</strong></label>
                <input
                  type="range" min="0" max="20000" step="50"
                  value={bonusForm.amount}
                  onChange={e => setBonusForm(p => ({ ...p, amount: parseInt(e.target.value) }))}
                />
                <div className="range-labels"><span>0 €</span><span>20 000 €</span></div>
                <input
                  type="number" className="number-input"
                  value={bonusForm.amount}
                  onChange={e => setBonusForm(p => ({ ...p, amount: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="form-group">
                <label>Mois de réception</label>
                <select
                  value={bonusForm.month}
                  onChange={e => setBonusForm(p => ({ ...p, month: parseInt(e.target.value) }))}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>

              <div className="bonus-form-actions">
                <button className="btn btn-secondary" onClick={() => setShowBonusForm(false)}>Annuler</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddBonus}
                  disabled={!bonusForm.title.trim() || bonusForm.amount <= 0 || saving}
                >
                  {saving ? 'Ajout...' : 'Ajouter ce revenu'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
