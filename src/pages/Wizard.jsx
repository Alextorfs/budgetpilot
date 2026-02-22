import { useState } from 'react'
import useStore from '../store'
import '../styles/Wizard.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const CATEGORIES_CONFIG = [
  {
    id: 'housing', label: '🏠 Logement',
    questions: [
      { id: 'rent', label: 'Loyer ou crédit immobilier', amount: 800, defaultFreq: 'monthly' },
      { id: 'charges', label: 'Charges de copropriété', amount: 150, defaultFreq: 'monthly' },
      { id: 'electricity', label: 'Électricité', amount: 80, defaultFreq: 'monthly' },
      { id: 'gas', label: 'Gaz', amount: 60, defaultFreq: 'monthly' },
      { id: 'water', label: 'Eau', amount: 40, defaultFreq: 'monthly' },
      { id: 'home_insurance', label: 'Assurance habitation', amount: 200, defaultFreq: 'yearly', month: 1 },
      { id: 'property_tax', label: 'Taxe foncière', amount: 800, defaultFreq: 'yearly', month: 10 },
    ]
  },
  {
    id: 'vehicle', label: '🚗 Véhicule',
    questions: [
      { id: 'fuel', label: 'Carburant', amount: 150, defaultFreq: 'monthly' },
      { id: 'car_insurance', label: 'Assurance auto', amount: 600, defaultFreq: 'yearly', month: 1 },
      { id: 'car_maintenance', label: 'Entretien/révision', amount: 300, defaultFreq: 'yearly', month: 9 },
      { id: 'car_inspection', label: 'Contrôle technique', amount: 80, defaultFreq: 'yearly', month: 6 },
      { id: 'parking', label: 'Parking/garage', amount: 80, defaultFreq: 'monthly' },
    ]
  },
  {
    id: 'subscriptions', label: '📺 Abonnements',
    questions: [
      { id: 'netflix', label: 'Netflix', amount: 14, defaultFreq: 'monthly' },
      { id: 'disney', label: 'Disney+', amount: 9, defaultFreq: 'monthly' },
      { id: 'spotify', label: 'Spotify / Apple Music', amount: 10, defaultFreq: 'monthly' },
      { id: 'gym', label: 'Salle de sport', amount: 40, defaultFreq: 'monthly' },
      { id: 'ai', label: 'Abonnement IA (ChatGPT, Claude...)', amount: 20, defaultFreq: 'monthly' },
      { id: 'cloud', label: 'Stockage cloud (iCloud, Google...)', amount: 3, defaultFreq: 'monthly' },
      { id: 'amazon', label: 'Amazon Prime', amount: 7, defaultFreq: 'monthly' },
    ]
  },
  {
    id: 'health', label: '🏥 Santé',
    questions: [
      { id: 'mutuelle', label: 'Mutuelle santé', amount: 80, defaultFreq: 'monthly' },
      { id: 'life_insurance', label: 'Assurance vie', amount: 50, defaultFreq: 'monthly' },
      { id: 'medical', label: 'Rendez-vous médicaux (kinés, IRM...)', amount: 300, defaultFreq: 'yearly', month: 6 },
      { id: 'dentist', label: 'Dentiste (budget annuel)', amount: 200, defaultFreq: 'yearly', month: 6 },
      { id: 'glasses', label: 'Lunettes/lentilles', amount: 300, defaultFreq: 'yearly', month: 6 },
    ]
  },
  {
    id: 'internet', label: '📱 Internet/Téléphone',
    questions: [
      { id: 'internet', label: 'Box internet', amount: 30, defaultFreq: 'monthly' },
      { id: 'mobile', label: 'Forfait mobile', amount: 20, defaultFreq: 'monthly' },
    ]
  },
  {
    id: 'pension', label: '💼 Épargne retraite',
    questions: [
      { id: 'pension_savings', label: 'Épargne pension', amount: 100, defaultFreq: 'monthly' },
    ]
  },
  {
    id: 'vacation', label: '✈️ Vacances',
    questions: [
      { id: 'vacation', label: 'Budget vacances annuel', amount: 1500, defaultFreq: 'yearly', month: 7 },
      { id: 'weekends', label: 'Week-ends / courts séjours', amount: 500, defaultFreq: 'yearly', month: 4 },
    ]
  },
  {
    id: 'gifts', label: '🎁 Cadeaux',
    questions: [
      { id: 'christmas', label: 'Cadeaux de Noël', amount: 500, defaultFreq: 'yearly', month: 12 },
      { id: 'birthdays', label: 'Anniversaires (budget annuel)', amount: 300, defaultFreq: 'yearly', month: 6 },
    ]
  },
]

export default function Wizard({ onComplete }) {
  const { addItems, userProfile } = useStore()
  const [catIndex, setCatIndex] = useState(0)
  const [allItems, setAllItems] = useState([])
  const [catItems, setCatItems] = useState([])
  const [saving, setSaving] = useState(false)

  const currentCat = CATEGORIES_CONFIG[catIndex]
  const hasShared = userProfile?.has_shared_account || false

  const handleAddItem = (item) => {
    setCatItems(prev => [...prev, { ...item, tempId: Date.now() + Math.random() }])
  }

  const handleRemoveItem = (tempId) => {
    setCatItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  const handleNext = async () => {
    const combined = [...allItems, ...catItems]

    if (catIndex < CATEGORIES_CONFIG.length - 1) {
      setAllItems(combined)
      setCatItems([])
      setCatIndex(catIndex + 1)
    } else {
      setSaving(true)
      try {
        if (combined.length > 0) {
          await addItems(combined)
        }
        onComplete()
      } catch (e) {
        alert('Erreur lors de la sauvegarde: ' + e.message)
      } finally {
        setSaving(false)
      }
    }
  }

  const handlePrev = () => {
    if (catIndex > 0) {
      setCatItems([])
      setCatIndex(catIndex - 1)
    }
  }

  return (
    <div className="wizard">
      <div className="wizard-container">
        <div className="wizard-header">
          <h1>Configure ton plan</h1>
          <div className="progress-info">
            <span className="category-name">{currentCat.label}</span>
            <span className="category-progress">{catIndex + 1} / {CATEGORIES_CONFIG.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((catIndex + 1) / CATEGORIES_CONFIG.length) * 100}%` }} />
          </div>
        </div>

        <div className="wizard-content">
          <p className="category-intro-text">Active les dépenses qui te concernent et ajuste les montants</p>

          {currentCat.questions.map(q => (
            <QuestionCard
              key={q.id}
              question={q}
              hasShared={hasShared}
              sharedTransfer={userProfile?.shared_monthly_transfer || 0}
              onAdd={handleAddItem}
            />
          ))}

          <FreeAddCard
            categoryId={currentCat.id}
            hasShared={hasShared}
            sharedTransfer={userProfile?.shared_monthly_transfer || 0}
            onAdd={handleAddItem}
          />

          {catItems.length > 0 && (
            <div className="added-items">
              <h3>✅ Ajoutés pour cette catégorie ({catItems.length})</h3>
              {catItems.map(item => (
                <div key={item.tempId} className="item-summary">
                  <div className="item-info">
                    <div className="item-title">{item.title}</div>
                    <div className="item-meta">
                      {item.frequency === 'monthly' ? 'Mensuel' : `Annuel (${MONTHS[(item.paymentMonth || 1) - 1]})`}
                      {item.sharing_type === 'common' && ` · Commun (${item.my_share_percent}%)`}
                    </div>
                  </div>
                  <div className="item-amount">
                    {item.frequency === 'monthly' ? item.amount : (item.amount * (item.my_share_percent / 100)).toFixed(0)} €
                    <button className="remove-btn" onClick={() => handleRemoveItem(item.tempId)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wizard-footer">
          {catIndex > 0 && <button className="btn btn-secondary" onClick={handlePrev}>Précédent</button>}
          <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={saving}>
            {saving ? 'Sauvegarde...' : catIndex === CATEGORIES_CONFIG.length - 1 ? '🎉 Terminer' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ question, hasShared, sharedTransfer, onAdd }) {
  const [enabled, setEnabled] = useState(false)
  const [amount, setAmount] = useState(question.amount)
  const [frequency, setFrequency] = useState(question.defaultFreq)
  const [paymentMonth, setPaymentMonth] = useState(question.month || 1)
  const [allocMode, setAllocMode] = useState('prorata')
  const [sharingType, setSharingType] = useState('individual')
  const [sharePercent, setSharePercent] = useState(50)
  const [includedInTransfer, setIncludedInTransfer] = useState(false)
  const [added, setAdded] = useState(false)

  const myAmount = sharingType === 'common' ? (amount * sharePercent / 100) : amount

  const handleAdd = () => {
    onAdd({
      title: question.label,
      category: 'other',
      kind: 'expense',
      frequency,
      amount,
      paymentMonth: frequency === 'monthly' ? null : paymentMonth,
      allocation_mode: frequency === 'monthly' ? null : allocMode,
      sharing_type: sharingType,
      my_share_percent: sharingType === 'common' ? sharePercent : 100,
      is_included_in_shared_transfer: sharingType === 'common' ? includedInTransfer : false,
    })
    setAdded(true)
    setEnabled(false)
  }

  if (added) return (
    <div className="question-card card" style={{ opacity: 0.5 }}>
      <div className="question-header">
        <span style={{ color: 'green' }}>✅</span>
        <span className="question-label">{question.label} → {myAmount.toFixed(0)} €</span>
      </div>
    </div>
  )

  return (
    <div className="question-card card">
      <div className="question-header">
        <label className="toggle">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <span className="toggle-slider"></span>
        </label>
        <span className="question-label">{question.label}</span>
      </div>

      {enabled && (
        <div className="question-details fade-in">
          
          {/* Choix fréquence */}
          <div className="form-group">
            <label>Fréquence</label>
            <div className="frequency-selector">
              <button type="button" className={`freq-btn ${frequency === 'monthly' ? 'active' : ''}`} onClick={() => setFrequency('monthly')}>
                📅 Mensuel
              </button>
              <button type="button" className={`freq-btn ${frequency === 'yearly' ? 'active' : ''}`} onClick={() => setFrequency('yearly')}>
                📆 Annuel
              </button>
            </div>
          </div>

          {/* Montant */}
          <div className="form-group">
            <label>Montant : <strong>{amount} €</strong></label>
            <input 
              type="range" 
              min="0" 
              max="5000" 
              step={frequency === 'monthly' ? 10 : 50} 
              value={amount} 
              onChange={e => setAmount(parseInt(e.target.value))} 
            />
            <input 
              type="number" 
              className="amount-input-direct" 
              value={amount} 
              onChange={e => setAmount(parseInt(e.target.value) || 0)} 
              placeholder="Ou saisir directement..."
            />
          </div>

          {/* Options annuelles */}
          {frequency === 'yearly' && (
            <>
              <div className="form-group">
                <label>Mois de paiement</label>
                <select value={paymentMonth} onChange={e => setPaymentMonth(parseInt(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Mode de provision</label>
                <div className="mode-selector">
                  <button type="button" className={`mode-btn ${allocMode === 'prorata' ? 'active' : ''}`} onClick={() => setAllocMode('prorata')}>
                    <div className="mode-title">Prorata</div>
                    <div className="mode-desc">100% disponible au paiement</div>
                  </button>
                  <button type="button" className={`mode-btn ${allocMode === 'spread' ? 'active' : ''}`} onClick={() => setAllocMode('spread')}>
                    <div className="mode-title">Lissé</div>
                    <div className="mode-desc">Répartir sur 12 mois</div>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Compte commun */}
          {hasShared && (
            <>
              <div className="form-group">
                <label>Type de dépense</label>
                <div className="sharing-selector">
                  <button type="button" className={`sharing-btn ${sharingType === 'individual' ? 'active' : ''}`} onClick={() => setSharingType('individual')}>👤 Individuelle</button>
                  <button type="button" className={`sharing-btn ${sharingType === 'common' ? 'active' : ''}`} onClick={() => setSharingType('common')}>👥 Commune</button>
                </div>
              </div>

              {sharingType === 'common' && (
                <>
                  <div className="form-group">
                    <label>Ta part : <strong>{sharePercent}%</strong> → {(amount * sharePercent / 100).toFixed(0)} €</label>
                    <input type="range" min="0" max="100" step="10" value={sharePercent} onChange={e => setSharePercent(parseInt(e.target.value))} />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={includedInTransfer} onChange={e => setIncludedInTransfer(e.target.checked)} style={{ width: 'auto' }} />
                      Déjà inclus dans le virement mensuel ({sharedTransfer} €)
                    </label>
                  </div>
                </>
              )}
            </>
          )}

          <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={amount <= 0}>
            + Ajouter
          </button>
        </div>
      )}
    </div>
  )
}

function FreeAddCard({ categoryId, hasShared, sharedTransfer, onAdd }) {
  const [show, setShow] = useState(false)
  const [form, setForm] = useState({
    title: '', 
    amount: 0, 
    frequency: 'monthly',
    paymentMonth: 1, 
    allocMode: 'prorata',
    sharingType: 'individual', 
    sharePercent: 50, 
    includedInTransfer: false
  })
  const s = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleAdd = () => {
    onAdd({
      title: form.title,
      category: categoryId,
      kind: 'expense',
      frequency: form.frequency,
      amount: form.amount,
      paymentMonth: form.frequency === 'monthly' ? null : form.paymentMonth,
      allocation_mode: form.frequency === 'monthly' ? null : form.allocMode,
      sharing_type: form.sharingType,
      my_share_percent: form.sharingType === 'common' ? form.sharePercent : 100,
      is_included_in_shared_transfer: form.sharingType === 'common' ? form.includedInTransfer : false,
    })
    setShow(false)
    setForm({ 
      title: '', 
      amount: 0, 
      frequency: 'monthly', 
      paymentMonth: 1, 
      allocMode: 'prorata', 
      sharingType: 'individual', 
      sharePercent: 50, 
      includedInTransfer: false 
    })
  }

  if (!show) return (
    <button className="free-add-btn card" onClick={() => setShow(true)}>
      <span className="plus-icon">+</span>
      <span>Ajouter une autre dépense</span>
    </button>
  )

  return (
    <div className="free-add-form card fade-in">
      <h3>Nouvelle dépense</h3>
      
      <div className="form-group">
        <label>Titre</label>
        <input type="text" value={form.title} onChange={e => s('title', e.target.value)} placeholder="Ex: Abonnement magazine" />
      </div>

      <div className="form-group">
        <label>Fréquence</label>
        <div className="frequency-selector">
          <button type="button" className={`freq-btn ${form.frequency === 'monthly' ? 'active' : ''}`} onClick={() => s('frequency', 'monthly')}>
            📅 Mensuel
          </button>
          <button type="button" className={`freq-btn ${form.frequency === 'yearly' ? 'active' : ''}`} onClick={() => s('frequency', 'yearly')}>
            📆 Annuel
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Montant : <strong>{form.amount} €</strong></label>
        <input type="range" min="0" max="5000" step="10" value={form.amount} onChange={e => s('amount', parseInt(e.target.value))} />
        <input type="number" className="amount-input-direct" value={form.amount} onChange={e => s('amount', parseInt(e.target.value) || 0)} placeholder="Ou saisir directement..." />
      </div>

      {form.frequency === 'yearly' && (
        <>
          <div className="form-group">
            <label>Mois de paiement</label>
            <select value={form.paymentMonth} onChange={e => s('paymentMonth', parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Mode de provision</label>
            <div className="mode-selector">
              <button type="button" className={`mode-btn ${form.allocMode === 'prorata' ? 'active' : ''}`} onClick={() => s('allocMode', 'prorata')}>
                <div className="mode-title">Prorata</div><div className="mode-desc">100% au paiement</div>
              </button>
              <button type="button" className={`mode-btn ${form.allocMode === 'spread' ? 'active' : ''}`} onClick={() => s('allocMode', 'spread')}>
                <div className="mode-title">Lissé</div><div className="mode-desc">Sur 12 mois</div>
              </button>
            </div>
          </div>
        </>
      )}

      {hasShared && (
        <>
          <div className="form-group">
            <label>Type</label>
            <div className="sharing-selector">
              <button type="button" className={`sharing-btn ${form.sharingType === 'individual' ? 'active' : ''}`} onClick={() => s('sharingType', 'individual')}>👤 Individuelle</button>
              <button type="button" className={`sharing-btn ${form.sharingType === 'common' ? 'active' : ''}`} onClick={() => s('sharingType', 'common')}>👥 Commune</button>
            </div>
          </div>
          {form.sharingType === 'common' && (
            <>
              <div className="form-group">
                <label>Ta part : <strong>{form.sharePercent}%</strong> → {(form.amount * form.sharePercent / 100).toFixed(0)} €</label>
                <input type="range" min="0" max="100" step="10" value={form.sharePercent} onChange={e => s('sharePercent', parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.includedInTransfer} onChange={e => s('includedInTransfer', e.target.checked)} style={{ width: 'auto' }} />
                  Inclus dans le virement ({sharedTransfer} €)
                </label>
              </div>
            </>
          )}
        </>
      )}
      
      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => setShow(false)}>Annuler</button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={!form.title.trim() || form.amount <= 0}>Ajouter</button>
      </div>
    </div>
  )
}
