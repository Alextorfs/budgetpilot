import { useState } from 'react'
import useStore from '../store'
import '../styles/ManagePlan.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function ManagePlan({ onBack }) {
  const { items, activePlan, userProfile, addItem, updateItem, deleteItem } = useStore()
  const [filter, setFilter] = useState('all')
  const [showUnplannedModal, setShowUnplannedModal] = useState(false)
  const [showNormalModal, setShowNormalModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const expenses = items.filter(i => i.kind === 'expense')
  const incomes = items.filter(i => i.kind === 'income')

  const filteredExpenses = expenses.filter(item => {
    if (filter === 'all') return true
    if (filter === 'monthly') return item.frequency === 'monthly'
    if (filter === 'yearly') return item.frequency === 'yearly'
    if (filter === 'personal') return item.sharing_type === 'individual'
    if (filter === 'common') return item.sharing_type === 'common'
    if (filter === 'unplanned') return item.is_unplanned
    return true
  })

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await deleteItem(id)
  }

  const handleEdit = (item) => {
    setEditingItem(item)
  }

  const handleSaveEdit = async () => {
    if (!editingItem) return
    try {
      await updateItem(editingItem.id, {
        title: editingItem.title,
        amount: editingItem.amount,
        frequency: editingItem.frequency,
        payment_month: editingItem.frequency === 'monthly' ? null : editingItem.payment_month,
        allocation_mode: editingItem.frequency === 'monthly' ? null : editingItem.allocation_mode,
        sharing_type: editingItem.sharing_type,
        my_share_percent: editingItem.my_share_percent,
        is_included_in_shared_transfer: editingItem.is_included_in_shared_transfer,
      })
      setEditingItem(null)
    } catch (e) {
      alert('Erreur : ' + e.message)
    }
  }

  return (
    <div className="manage-plan-page">
      <div className="manage-plan-container">
        
        <div className="manage-header">
          <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
          <h1>📝 Gérer mes dépenses</h1>
        </div>

        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => setShowNormalModal(true)}>
            + Nouvelle dépense
          </button>
          <button className="btn btn-secondary" onClick={() => setShowUnplannedModal(true)}>
            ⚡ Dépense imprévue
          </button>
        </div>

        {/* Filtres */}
        <div className="filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Toutes ({expenses.length})
          </button>
          <button className={`filter-btn ${filter === 'monthly' ? 'active' : ''}`} onClick={() => setFilter('monthly')}>
            Mensuelles
          </button>
          <button className={`filter-btn ${filter === 'yearly' ? 'active' : ''}`} onClick={() => setFilter('yearly')}>
            Annuelles
          </button>
          <button className={`filter-btn ${filter === 'personal' ? 'active' : ''}`} onClick={() => setFilter('personal')}>
            Personnelles
          </button>
          <button className={`filter-btn ${filter === 'common' ? 'active' : ''}`} onClick={() => setFilter('common')}>
            Communes
          </button>
          <button className={`filter-btn ${filter === 'unplanned' ? 'active' : ''}`} onClick={() => setFilter('unplanned')}>
            Imprévues
          </button>
        </div>

        {/* Liste dépenses */}
        <div className="items-list">
          {filteredExpenses.length === 0 ? (
            <div className="empty-state">Aucune dépense dans cette catégorie</div>
          ) : (
            filteredExpenses.map(item => (
              <div key={item.id} className="item-card">
                {editingItem?.id === item.id ? (
                  <EditItemForm item={editingItem} setItem={setEditingItem} onSave={handleSaveEdit} onCancel={() => setEditingItem(null)} />
                ) : (
                  <>
                    <div className="item-header">
                      <div className="item-title">
                        {item.title}
                        {item.is_unplanned && <span className="badge-unplanned">⚡ Imprévue</span>}
                        {item.sharing_type === 'common' && <span className="badge-common">👥</span>}
                      </div>
                      <div className="item-amount">
                        {fmt(item.amount)}
                        {item.sharing_type === 'common' && <span className="item-share"> ({item.my_share_percent}%)</span>}
                      </div>
                    </div>
                    <div className="item-meta">
                      {item.frequency === 'monthly' ? (
                        'Mensuel'
                      ) : item.is_unplanned ? (
                        `Ponctuel · ${MONTHS[(item.unplanned_month || 1) - 1]}`
                      ) : (
                        `Annuel · ${MONTHS[(item.payment_month || 1) - 1]} · ${item.allocation_mode === 'spread' ? 'Lissé' : 'Prorata'}`
                      )}
                      {item.is_included_in_shared_transfer && ' · Inclus dans virement'}
                    </div>
                    {item.is_unplanned && (
                      <div className="unplanned-funding">
                        Financé par :
                        {item.funded_from_savings > 0 && ` Épargne projet ${fmt(item.funded_from_savings)}`}
                        {item.funded_from_free > 0 && ` Argent libre ${fmt(item.funded_from_free)}`}
                        {item.funded_from_shared_savings > 0 && ` Épargne commune ${fmt(item.funded_from_shared_savings)}`}
                      </div>
                    )}
                    <div className="item-actions">
                      {!item.is_unplanned && (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)}>✏️ Modifier</button>
                      )}
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑️ Supprimer</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Revenus exceptionnels */}
        {incomes.length > 0 && (
          <div className="incomes-section">
            <h2>🎁 Revenus exceptionnels ({incomes.length})</h2>
            {incomes.map(item => (
              <div key={item.id} className="item-card income-card">
                <div className="item-header">
                  <div className="item-title">
                    {item.title}
                    {item.goes_to_savings && <span className="badge-savings">→ épargne</span>}
                  </div>
                  <div className="item-amount income">+{fmt(item.amount)}</div>
                </div>
                <div className="item-meta">{MONTHS[(item.payment_month || 1) - 1]} · Revenu ponctuel</div>
                <div className="item-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>🗑️ Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {showNormalModal && (
        <NormalExpenseModal 
          onClose={() => setShowNormalModal(false)}
          activePlan={activePlan}
          userProfile={userProfile}
          addItem={addItem}
        />
      )}

      {showUnplannedModal && (
        <UnplannedExpenseModal 
          onClose={() => setShowUnplannedModal(false)}
          activePlan={activePlan}
          userProfile={userProfile}
          addItem={addItem}
        />
      )}
    </div>
  )
}

function EditItemForm({ item, setItem, onSave, onCancel }) {
  return (
    <div className="edit-form">
      <div className="form-group">
        <label>Titre</label>
        <input 
          type="text" 
          value={item.title} 
          onChange={e => setItem({...item, title: e.target.value})}
        />
      </div>
      <div className="form-group">
        <label>Montant</label>
        <input 
          type="number" 
          value={item.amount} 
          onChange={e => setItem({...item, amount: parseFloat(e.target.value) || 0})}
        />
      </div>
      {item.frequency === 'yearly' && !item.is_unplanned && (
        <div className="form-group">
          <label>Mois de paiement</label>
          <select 
            value={item.payment_month || 1} 
            onChange={e => setItem({...item, payment_month: parseInt(e.target.value)})}
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
      )}
      <div className="form-actions">
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Sauvegarder</button>
      </div>
    </div>
  )
}

function UnplannedExpenseModal({ onClose, activePlan, userProfile, addItem }) {
  const [form, setForm] = useState({
    title: '',
    amount: 0,
    sharingType: 'individual',
    fundingSavings: 0,
    fundingFree: 0,
    fundingSharedSavings: 0,
  })
  const [saving, setSaving] = useState(false)

  const currentMonth = new Date().getMonth() + 1
  const existingSavings = userProfile.existing_savings || 0
  const existingSharedSavings = userProfile.existing_shared_savings || 0
  const hasShared = userProfile.has_shared_account || false

  const totalFunding = form.fundingSavings + form.fundingFree + form.fundingSharedSavings
  const isValid = form.title.trim() && form.amount > 0 && Math.abs(totalFunding - form.amount) < 0.01

  const handleQuickFund = (source) => {
    if (source === 'savings') {
      setForm(p => ({ ...p, fundingSavings: p.amount, fundingFree: 0, fundingSharedSavings: 0 }))
    } else if (source === 'free') {
      setForm(p => ({ ...p, fundingSavings: 0, fundingFree: p.amount, fundingSharedSavings: 0 }))
    } else if (source === 'shared') {
      setForm(p => ({ ...p, fundingSavings: 0, fundingFree: 0, fundingSharedSavings: p.amount }))
    } else if (source === 'half') {
      const half = Math.round(form.amount / 2)
      setForm(p => ({ ...p, fundingSavings: half, fundingFree: p.amount - half, fundingSharedSavings: 0 }))
    }
  }

  const handleSubmit = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      await addItem({
        title: form.title,
        category: 'other',
        kind: 'expense',
        frequency: 'yearly',
        amount: form.amount,
        payment_month: null,
        allocation_mode: null,
        sharing_type: form.sharingType,
        my_share_percent: 100,
        is_included_in_shared_transfer: false,
        is_unplanned: true,
        unplanned_month: currentMonth,
        funded_from_savings: form.fundingSavings,
        funded_from_free: form.fundingFree,
        funded_from_shared_savings: form.fundingSharedSavings,
      })
      
      // Mise à jour automatique des stocks
      const updates = {}
      
      // Si financé par épargne projet
      if (form.fundingSavings > 0) {
        updates.existing_savings = (userProfile.existing_savings || 0) - form.fundingSavings
      }
      
      // Si financé par épargne commune
      if (form.fundingSharedSavings > 0) {
        updates.existing_shared_savings = (userProfile.existing_shared_savings || 0) - form.fundingSharedSavings
      }
      
      // Appliquer les mises à jour
      if (Object.keys(updates).length > 0) {
        const { updateProfile } = useStore.getState()
        await updateProfile(updates)
      }
      
      onClose()
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content unplanned-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚡ Dépense imprévue</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Titre de la dépense</label>
            <input 
              type="text" 
              value={form.title} 
              onChange={e => setForm(p => ({...p, title: e.target.value}))}
              placeholder="Ex: Amende, Réparation urgente..."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Montant : <strong>{form.amount.toLocaleString('fr-FR')} €</strong></label>
            <input 
              type="range" 
              min="0" 
              max="2000" 
              step="10" 
              value={form.amount} 
              onChange={e => setForm(p => ({...p, amount: parseInt(e.target.value)}))}
            />
            <input 
              type="number" 
              className="amount-input-direct" 
              value={form.amount} 
              onChange={e => setForm(p => ({...p, amount: parseInt(e.target.value) || 0}))}
            />
          </div>

          {hasShared && (
            <div className="form-group">
              <label>Type de dépense</label>
              <div className="funding-buttons">
                <button 
                  type="button" 
                  className={`funding-btn ${form.sharingType === 'individual' ? 'active' : ''}`}
                  onClick={() => setForm(p => ({...p, sharingType: 'individual'}))}
                >
                  👤 Personnelle
                </button>
                <button 
                  type="button" 
                  className={`funding-btn ${form.sharingType === 'common' ? 'active' : ''}`}
                  onClick={() => setForm(p => ({...p, sharingType: 'common'}))}
                >
                  👥 Commune
                </button>
              </div>
            </div>
          )}

          <div className="funding-section">
            <h3>Comment financer ces {fmt(form.amount)} ?</h3>
            
            <div className="quick-funding">
              <button 
                className="btn btn-sm btn-outline" 
                onClick={() => handleQuickFund('savings')}
                disabled={form.amount > existingSavings}
              >
                🎯 Épargne projet ({fmt(existingSavings)})
              </button>
              <button 
                className="btn btn-sm btn-outline" 
                onClick={() => handleQuickFund('free')}
              >
                💰 Argent libre
              </button>
              {hasShared && form.sharingType === 'common' && (
                <button 
                  className="btn btn-sm btn-outline" 
                  onClick={() => handleQuickFund('shared')}
                  disabled={form.amount > existingSharedSavings}
                >
                  🏠 Épargne commune ({fmt(existingSharedSavings)})
                </button>
              )}
              <button 
                className="btn btn-sm btn-outline" 
                onClick={() => handleQuickFund('half')}
              >
                ⚖️ Moitié-moitié
              </button>
            </div>

            <div className="funding-details">
              <div className="form-group">
                <label>Depuis épargne projet : {fmt(form.fundingSavings)}</label>
                <input 
                  type="range" 
                  min="0" 
                  max={Math.min(form.amount, existingSavings)} 
                  step="10" 
                  value={form.fundingSavings} 
                  onChange={e => setForm(p => ({...p, fundingSavings: parseInt(e.target.value)}))}
                />
              </div>

              <div className="form-group">
                <label>Depuis argent libre : {fmt(form.fundingFree)}</label>
                <input 
                  type="range" 
                  min="0" 
                  max={form.amount} 
                  step="10" 
                  value={form.fundingFree} 
                  onChange={e => setForm(p => ({...p, fundingFree: parseInt(e.target.value)}))}
                />
              </div>

              {hasShared && form.sharingType === 'common' && (
                <div className="form-group">
                  <label>Depuis épargne commune : {fmt(form.fundingSharedSavings)}</label>
                  <input 
                    type="range" 
                    min="0" 
                    max={Math.min(form.amount, existingSharedSavings)} 
                    step="10" 
                    value={form.fundingSharedSavings} 
                    onChange={e => setForm(p => ({...p, fundingSharedSavings: parseInt(e.target.value)}))}
                  />
                </div>
              )}

              <div className="funding-summary">
                <span>Total financé :</span>
                <strong className={totalFunding === form.amount ? 'valid' : 'invalid'}>
                  {fmt(totalFunding)} / {fmt(form.amount)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!isValid || saving}
          >
            {saving ? 'Ajout...' : 'Ajouter cette dépense'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NormalExpenseModal({ onClose, userProfile, addItem }) {
  const [form, setForm] = useState({
    title: '',
    amount: 0,
    frequency: 'monthly',
    paymentMonth: new Date().getMonth() + 1,
    allocMode: 'prorata',
    sharingType: 'individual',
    sharePercent: 50,
    includedInTransfer: false,
  })
  const [saving, setSaving] = useState(false)

  const hasShared = userProfile?.has_shared_account || false
  const isValid = form.title.trim() && form.amount > 0

  const handleSubmit = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      await addItem({
        title: form.title,
        category: 'other',
        kind: 'expense',
        frequency: form.frequency,
        amount: form.amount,
        payment_month: form.frequency === 'monthly' ? null : form.paymentMonth,
        allocation_mode: form.frequency === 'monthly' ? null : form.allocMode,
        sharing_type: form.sharingType,
        my_share_percent: form.sharingType === 'common' ? form.sharePercent : 100,
        is_included_in_shared_transfer: form.sharingType === 'common' ? form.includedInTransfer : false,
      })
      onClose()
    } catch (e) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>+ Nouvelle dépense</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Titre</label>
            <input 
              type="text" 
              value={form.title} 
              onChange={e => setForm(p => ({...p, title: e.target.value}))}
              placeholder="Ex: Netflix, Loyer..."
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Fréquence</label>
            <div className="funding-buttons">
              <button 
                type="button" 
                className={`funding-btn ${form.frequency === 'monthly' ? 'active' : ''}`}
                onClick={() => setForm(p => ({...p, frequency: 'monthly'}))}
              >
                📅 Mensuel
              </button>
              <button 
                type="button" 
                className={`funding-btn ${form.frequency === 'yearly' ? 'active' : ''}`}
                onClick={() => setForm(p => ({...p, frequency: 'yearly'}))}
              >
                📆 Annuel
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Montant : <strong>{form.amount.toLocaleString('fr-FR')} €</strong></label>
            <input 
              type="range" 
              min="0" 
              max="5000" 
              step="10" 
              value={form.amount} 
              onChange={e => setForm(p => ({...p, amount: parseInt(e.target.value)}))}
            />
            <input 
              type="number" 
              className="amount-input-direct" 
              value={form.amount} 
              onChange={e => setForm(p => ({...p, amount: parseInt(e.target.value) || 0}))}
            />
          </div>

          {form.frequency === 'yearly' && (
            <>
              <div className="form-group">
                <label>Mois de paiement</label>
                <select value={form.paymentMonth} onChange={e => setForm(p => ({...p, paymentMonth: parseInt(e.target.value)}))}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Mode de provision</label>
                <div className="funding-buttons">
                  <button 
                    type="button" 
                    className={`funding-btn ${form.allocMode === 'prorata' ? 'active' : ''}`}
                    onClick={() => setForm(p => ({...p, allocMode: 'prorata'}))}
                  >
                    Prorata (mois restants)
                  </button>
                  <button 
                    type="button" 
                    className={`funding-btn ${form.allocMode === 'spread' ? 'active' : ''}`}
                    onClick={() => setForm(p => ({...p, allocMode: 'spread'}))}
                  >
                    Lissé (toute l'année)
                  </button>
                </div>
              </div>
            </>
          )}

          {hasShared && (
            <>
              <div className="form-group">
                <label>Type de dépense</label>
                <div className="funding-buttons">
                  <button 
                    type="button" 
                    className={`funding-btn ${form.sharingType === 'individual' ? 'active' : ''}`}
                    onClick={() => setForm(p => ({...p, sharingType: 'individual'}))}
                  >
                    👤 Personnelle
                  </button>
                  <button 
                    type="button" 
                    className={`funding-btn ${form.sharingType === 'common' ? 'active' : ''}`}
                    onClick={() => setForm(p => ({...p, sharingType: 'common'}))}
                  >
                    👥 Commune
                  </button>
                </div>
              </div>

              {form.sharingType === 'common' && (
                <>
                  <div className="form-group">
                    <label>Ta part : <strong>{form.sharePercent}%</strong></label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="10" 
                      value={form.sharePercent} 
                      onChange={e => setForm(p => ({...p, sharePercent: parseInt(e.target.value)}))}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={form.includedInTransfer} 
                        onChange={e => setForm(p => ({...p, includedInTransfer: e.target.checked}))}
                        style={{ width: 'auto' }}
                      />
                      Inclus dans le virement compte commun
                    </label>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={!isValid || saving}
          >
            {saving ? 'Ajout...' : 'Ajouter cette dépense'}
          </button>
        </div>
      </div>
    </div>
  )
}
