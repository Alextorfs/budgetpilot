import { useState } from 'react'
import useStore from '../store'
import '../styles/ManagePlan.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']

const CATEGORIES = {
  housing: '🏠 Logement',
  vehicle: '🚗 Véhicule',
  subscriptions: '📺 Abonnements',
  health: '🏥 Santé',
  internet: '📱 Internet/Téléphone',
  taxes: '📄 Impôts',
  vacation: '✈️ Vacances',
  gifts: '🎁 Cadeaux',
  other: '📦 Autres',
}

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function ManagePlan({ onBack }) {
  const { items, addItem, updateItem, deleteItem, userProfile } = useStore()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const hasShared = userProfile?.has_shared_account || false

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)

  // Totaux annuels par catégorie
  const totals = {}
  Object.keys(CATEGORIES).forEach(cat => {
    totals[cat] = items
      .filter(i => i.category === cat && i.kind === 'expense')
      .reduce((s, i) => {
        const a = i.sharing_type === 'common' ? i.amount * ((i.my_share_percent || 100) / 100) : i.amount
        return s + (i.frequency === 'monthly' ? a * 12 : a)
      }, 0)
  })

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await deleteItem(id)
  }

  const handleSave = async (data) => {
    if (editing?.id) {
      await updateItem(editing.id, data)
    } else {
      await addItem(data)
    }
    setEditing(null)
  }

  return (
    <div className="manage-plan">
      <div className="manage-header">
        <button className="btn btn-secondary" onClick={onBack}>← Retour</button>
        <h1>Gérer mes dépenses</h1>
        <button className="btn btn-primary" onClick={() => setEditing({ id: null })}>➕ Nouvelle dépense</button>
      </div>

      {/* Filtres */}
      <div className="category-filters">
        <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Toutes ({items.length})
        </button>
        {Object.entries(CATEGORIES).map(([k, v]) => {
          const n = items.filter(i => i.category === k).length
          return n > 0 ? (
            <button key={k} className={`filter-btn ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
              {v} ({n})
            </button>
          ) : null
        })}
      </div>

      {/* Résumé annuel */}
      {items.length > 0 && (
        <div className="category-summary">
          <h3>Total annuel par catégorie</h3>
          <div className="summary-grid">
            {Object.entries(CATEGORIES).map(([k, v]) => totals[k] > 0 ? (
              <div key={k} className="summary-card">
                <div className="summary-label">{v}</div>
                <div className="summary-amount">{fmt(totals[k])}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="items-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p>Aucune dépense{filter !== 'all' ? ' dans cette catégorie' : ''}</p>
            <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '0.5rem' }}>
              Clique sur "➕ Nouvelle dépense" pour commencer
            </p>
          </div>
        ) : filtered.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            onEdit={() => setEditing(item)}
            onDelete={() => handleDelete(item.id)}
          />
        ))}
      </div>

      {/* Modal */}
      {editing !== null && (
        <ItemModal
          item={editing}
          hasShared={hasShared}
          sharedTransfer={userProfile?.shared_monthly_transfer || 0}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function ItemCard({ item, onEdit, onDelete }) {
  const myAmount = item.sharing_type === 'common'
    ? item.amount * ((item.my_share_percent || 100) / 100)
    : item.amount
  const annual = item.frequency === 'monthly' ? myAmount * 12 : myAmount

  return (
    <div className="item-card">
      <div className="item-main">
        <div className="item-info">
          <h4>{item.title}</h4>
          <div className="item-meta">
            <span className="meta-badge">{CATEGORIES[item.category] || item.category}</span>
            <span className="meta-badge">
              {item.frequency === 'monthly' ? '📅 Mensuel' : `📆 ${MONTHS_SHORT[(item.payment_month || 1) - 1]}`}
            </span>
            {item.sharing_type === 'common' && (
              <span className="meta-badge common">👥 Commun ({item.my_share_percent || 100}%)</span>
            )}
            {item.is_included_in_shared_transfer && (
              <span className="meta-badge included">✓ Inclus virement</span>
            )}
          </div>
        </div>
        <div className="item-amounts">
          <div className="amount-row">
            <span className="amount-label">{item.frequency === 'monthly' ? '/mois' : 'total'}</span>
            <span className="amount-value">{fmt(myAmount)}</span>
          </div>
          {item.frequency === 'monthly' && (
            <div className="amount-row secondary">
              <span className="amount-label">/an</span>
              <span className="amount-value">{fmt(annual)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="item-actions">
        <button className="btn-icon" onClick={onEdit}>✏️</button>
        <button className="btn-icon delete" onClick={onDelete}>🗑️</button>
      </div>
    </div>
  )
}

function ItemModal({ item, hasShared, sharedTransfer, onSave, onCancel }) {
  const isNew = !item.id
  const [form, setForm] = useState({
    title: item.title || '',
    amount: item.amount || 0,
    category: item.category || 'other',
    frequency: item.frequency || 'monthly',
    payment_month: item.payment_month || 1,
    allocation_mode: item.allocation_mode || 'prorata',
    sharing_type: item.sharing_type || 'individual',
    my_share_percent: item.my_share_percent || 100,
    is_included_in_shared_transfer: item.is_included_in_shared_transfer || false,
    kind: item.kind || 'expense',
  })
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    onSave({
      ...form,
      payment_month: form.frequency === 'monthly' ? null : form.payment_month,
      allocation_mode: form.frequency === 'monthly' ? null : form.allocation_mode,
    })
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>{isNew ? '➕ Nouvelle dépense' : '✏️ Modifier'}</h3>

        <div className="form-group">
          <label>Titre</label>
          <input type="text" value={form.title} onChange={e => s('title', e.target.value)} placeholder="Ex: Loyer, Netflix..." />
        </div>

        <div className="form-group">
          <label>Catégorie</label>
          <select value={form.category} onChange={e => s('category', e.target.value)}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Montant : <strong>{form.amount} €</strong></label>
          <input type="range" min="0" max="5000" step="10" value={form.amount} onChange={e => s('amount', parseFloat(e.target.value))} />
          <input type="number" value={form.amount} onChange={e => s('amount', parseFloat(e.target.value) || 0)} style={{ marginTop: '0.5rem' }} />
        </div>

        <div className="form-group">
          <label>Fréquence</label>
          <select value={form.frequency} onChange={e => s('frequency', e.target.value)}>
            <option value="monthly">Mensuel (tous les mois)</option>
            <option value="yearly">Annuel (1 fois par an)</option>
          </select>
        </div>

        {form.frequency === 'yearly' && (
          <>
            <div className="form-group">
              <label>Mois de paiement</label>
              <select value={form.payment_month} onChange={e => s('payment_month', parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Mode de provision</label>
              <select value={form.allocation_mode} onChange={e => s('allocation_mode', e.target.value)}>
                <option value="prorata">Prorata (100% au moment du paiement)</option>
                <option value="spread">Lissé (réparti sur 12 mois)</option>
              </select>
            </div>
          </>
        )}

        {hasShared && (
          <>
            <div className="form-group">
              <label>Type</label>
              <select value={form.sharing_type} onChange={e => s('sharing_type', e.target.value)}>
                <option value="individual">👤 Individuelle</option>
                <option value="common">👥 Commune</option>
              </select>
            </div>
            {form.sharing_type === 'common' && (
              <>
                <div className="form-group">
                  <label>Ma part : <strong>{form.my_share_percent}%</strong> → {(form.amount * form.my_share_percent / 100).toFixed(0)} €</label>
                  <input type="range" min="0" max="100" step="10" value={form.my_share_percent} onChange={e => s('my_share_percent', parseInt(e.target.value))} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_included_in_shared_transfer} onChange={e => s('is_included_in_shared_transfer', e.target.checked)} style={{ width: 'auto' }} />
                    Déjà inclus dans le virement mensuel ({sharedTransfer} €)
                  </label>
                </div>
              </>
            )}
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!form.title.trim() || form.amount <= 0}>
            {isNew ? 'Ajouter' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
