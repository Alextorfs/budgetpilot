import { useState } from 'react'
import useStore from '../store'
import ManagePlan from './ManagePlan'
import Settings from './Settings'
import '../styles/Dashboard.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Dashboard({ onLogout }) {
  const { userProfile, activePlan, items } = useStore()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [showManage, setShowManage] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  if (!activePlan || !userProfile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⏳</div>
        <div style={{ fontSize: '1.25rem' }}>Chargement du plan...</div>
      </div>
    )
  }

  if (showManage) return <ManagePlan onBack={() => setShowManage(false)} />
  if (showSettings) return <Settings onBack={() => setShowSettings(false)} />

  const salary = activePlan.monthly_salary_net || 0
  const funSavings = activePlan.fun_savings_monthly_target || 0
  const myTransfer = userProfile.shared_monthly_transfer || 0
  const partnerTransfer = userProfile.partner_monthly_transfer || 0
  const totalCommonTransfer = myTransfer + partnerTransfer
  const hasShared = userProfile.has_shared_account || false
  const existingSavings = userProfile.existing_savings || 0

  // Dépenses mensuelles perso
  const personalMonthlyExpenses = items
    .filter(i => i.frequency === 'monthly' && i.sharing_type === 'individual' && i.kind === 'expense')
    .reduce((s, i) => s + i.amount, 0)

  // Dépenses mensuelles communes (montant total du couple, pas juste ta part)
  const commonMonthlyExpenses = items
    .filter(i => i.frequency === 'monthly' && i.sharing_type === 'common' && !i.is_included_in_shared_transfer && i.kind === 'expense')
    .reduce((s, i) => s + i.amount, 0)

  // Calcul provision pour un item
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

  // Progression de l'épargne pour un item
  const computeProgress = (item) => {
    if (!item.payment_month || item.frequency === 'monthly') return 0
    const startMonth = activePlan.start_month || 1
    const totalMonths = item.allocation_mode === 'spread'
      ? 12
      : Math.max(1, item.payment_month - startMonth)
    const doneMonths = Math.max(0, currentMonth - startMonth)
    return Math.min(100, Math.round((doneMonths / totalMonths) * 100))
  }

  // Items à provisionner
  const provisionItems = items.filter(i =>
    i.frequency !== 'monthly' && i.kind === 'expense' && i.payment_month >= currentMonth
  )
  const personalProvisionItems = provisionItems.filter(i => i.sharing_type === 'individual')
  const commonProvisionItems = provisionItems.filter(i => i.sharing_type === 'common' && !i.is_included_in_shared_transfer)

  const personalProvisions = personalProvisionItems.reduce((s, i) => s + computeProvision(i), 0)
  const commonProvisions = commonProvisionItems.reduce((s, i) => s + computeProvision(i), 0)

  // Solde compte commun
  const totalCommonExpenses = commonMonthlyExpenses + (commonProvisions / (userProfile.my_share_percent_default || 0.5))
  const commonBalance = totalCommonTransfer - totalCommonExpenses
  const hasShortfall = commonBalance < 0

  // Totaux
  const totalToSave = personalProvisions + funSavings + (hasShared ? myTransfer + commonProvisions : 0)
  const freeMoney = salary - personalMonthlyExpenses - totalToSave

  // Statut
  const pct = salary > 0 ? (freeMoney / salary) * 100 : 0
  const status = pct < 10
    ? { label: '⚠️ Budget tendu — marge faible', cls: 'tight' }
    : pct < 20 ? { label: '✓ Budget équilibré', cls: 'balanced' }
    : { label: '🌿 Budget confortable', cls: 'comfortable' }

  const monthsLeft = 12 - currentMonth + 1
  const projected = existingSavings + funSavings * monthsLeft

  return (
    <div className="dashboard">
      <div className="dashboard-container">

        {/* En-tête */}
        <div className="dashboard-header">
          <div>
            <h1>Bonjour {userProfile.first_name} 👋</h1>
            <p className="current-month">{MONTHS[currentMonth - 1]} {activePlan.year}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="month-selector" value={currentMonth} onChange={e => setCurrentMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <button onClick={() => setShowSettings(true)} className="btn btn-secondary btn-sm">⚙️ Paramètres</button>
            <button onClick={onLogout} className="btn btn-secondary btn-sm">🚪</button>
          </div>
        </div>

        {/* Projection épargne projet */}
        <div className="projection-card">
          <div className="projection-icon">🎯</div>
          <div className="projection-content">
            <h3>Projection de l'épargne pour de futurs projets à la fin {activePlan.year}</h3>
            <p>En virant {fmt(funSavings)}/mois sur ton compte épargne :</p>
            <div className="projection-amount">{fmt(projected)}</div>
            <p className="projection-detail">
              <small>{monthsLeft} mois × {fmt(funSavings)} + {fmt(existingSavings)} déjà épargnés</small>
            </p>
          </div>
        </div>

        {/* Zone perso */}
        <div className="budget-zone personal-zone">
          <h2>💰 Mon Budget Personnel</h2>
          <div className="info-row">
            <span className="info-label">Salaire net</span>
            <span className="info-value green">{fmt(salary)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Dépenses mensuelles perso</span>
            <span className="info-value">{fmt(personalMonthlyExpenses)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Provisions échéances futures</span>
            <span className="info-value">{fmt(personalProvisions)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Virement épargne projet</span>
            <span className="info-value purple">{fmt(funSavings)}</span>
          </div>
          {hasShared && (
            <div className="info-row">
              <span className="info-label">Virement compte commun</span>
              <span className="info-value orange">{fmt(myTransfer + commonProvisions)}</span>
            </div>
          )}
          <div className="divider"></div>
          <div className="free-money-section">
            <div className="free-money-header">
              <span>Argent libre sur ton compte courant</span>
              <span>🔒</span>
            </div>
            <div className={`free-money-amount ${freeMoney < 0 ? 'negative' : ''}`}>{fmt(freeMoney)}</div>
            <div className={`budget-status status-${status.cls}`}>{status.label}</div>
          </div>
        </div>

        {/* Détail des provisions */}
        {provisionItems.length > 0 && (
          <div className="provisions-detail">
            <h3>📋 Ce que tu mets de côté ce mois-ci</h3>
            <p className="provisions-subtitle">Pour être prêt le jour J de chaque paiement</p>
            {[...personalProvisionItems, ...commonProvisionItems].map(item => {
              const provision = computeProvision(item)
              const progress = computeProgress(item)
              const monthsUntil = item.payment_month - currentMonth
              const myAmount = item.sharing_type === 'common'
                ? item.amount * ((item.my_share_percent || 100) / 100)
                : item.amount
              const isWarning = monthsUntil <= 2 && item.allocation_mode === 'prorata'
              const alreadySaved = myAmount * (progress / 100)

              return (
                <div key={item.id} className={`provision-item ${isWarning ? 'provision-warning' : ''}`}>
                  <div className="provision-header">
                    <div className="provision-title">
                      {item.title}
                      {item.sharing_type === 'common' && <span className="badge-small">👥</span>}
                    </div>
                    <div className="provision-amount-badge">{fmt(provision)}<span>/mois</span></div>
                  </div>

                  {isWarning && (
                    <div className="provision-alert">
                      ⚠️ Attention — seulement {monthsUntil} mois avant le paiement ! La mensualité est élevée.
                    </div>
                  )}

                  <div className="provision-message">
                    {item.allocation_mode === 'prorata'
                      ? `Vire ${fmt(provision)} ce mois-ci → tu auras ${fmt(myAmount)} pour ${item.title} en ${MONTHS[item.payment_month - 1]}`
                      : `Vire ${fmt(provision)}/mois (lissé 12 mois) → objectif ${fmt(myAmount)} pour ${MONTHS[item.payment_month - 1]}`
                    }
                  </div>

                  <div className="provision-progress-bar">
                    <div className="provision-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="provision-progress-label">
                    <span>{fmt(alreadySaved)} épargnés</span>
                    <span>{progress}% — objectif {fmt(myAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Zone commune */}
        {hasShared && (
          <div className="budget-zone common-zone">
            <h2>🏠 Compte Commun</h2>
            <div className="info-row">
              <span className="info-label">Ton virement</span>
              <span className="info-value">{fmt(myTransfer)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Virement de ta conjointe</span>
              <span className="info-value">{fmt(partnerTransfer)}</span>
            </div>
            <div className="info-row" style={{ borderTop: '2px solid #E5E7EB', paddingTop: '0.75rem' }}>
              <span className="info-label" style={{ fontWeight: 700 }}>Total disponible sur le compte</span>
              <span className="info-value green" style={{ fontWeight: 700 }}>{fmt(totalCommonTransfer)}</span>
            </div>
            <div className="divider"></div>
            <div className="info-row">
              <span className="info-label">Dépenses communes mensuelles</span>
              <span className="info-value">{fmt(commonMonthlyExpenses)}</span>
            </div>

            {hasShortfall ? (
              <div className="common-balance-card danger">
                <div className="balance-icon">⚠️</div>
                <div>
                  <strong>Manque de {fmt(Math.abs(commonBalance))} sur le compte commun !</strong>
                  <p>Les dépenses communes ({fmt(totalCommonExpenses)}) dépassent les virements ({fmt(totalCommonTransfer)}). Pensez à augmenter vos virements.</p>
                </div>
              </div>
            ) : (
              <div className="common-balance-card ok">
                <div className="balance-icon">✅</div>
                <div>
                  <strong>Compte commun équilibré</strong>
                  <p>Solde estimé après dépenses : <strong>{fmt(commonBalance)}</strong></p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Total à virer */}
        <div className="total-transfer-card">
          <h3>📊 Total à virer ce mois-ci</h3>
          <div className="total-amount">{fmt(totalToSave)}</div>
          <div className="breakdown">
            <span>Épargne projet : {fmt(funSavings)}</span>
            <span>Provisions : {fmt(personalProvisions)}</span>
            {hasShared && <span>Compte commun : {fmt(myTransfer + commonProvisions)}</span>}
          </div>
        </div>

        {/* Stock épargne */}
        <div className="savings-stock-card">
          <div className="stock-label">🏦 Épargne existante (stock)</div>
          <div className="stock-amount">{fmt(existingSavings)}</div>
        </div>

        <button className="btn btn-primary btn-lg manage-plan-btn" onClick={() => setShowManage(true)}>
          📝 Gérer mes dépenses ({items.length})
        </button>

        {items.length > 0 && (
          <div className="quick-expenses-preview">
            <h3>Aperçu de mes dépenses</h3>
            <div className="expenses-grid">
              {items.slice(0, 6).map(item => {
                const myAmount = item.sharing_type === 'common'
                  ? item.amount * ((item.my_share_percent || 100) / 100)
                  : item.amount
                return (
                  <div key={item.id} className="expense-preview-card">
                    <div className="expense-title">{item.title}{item.sharing_type === 'common' && ' 👥'}</div>
                    <div className="expense-amount">{fmt(myAmount)}</div>
                    <div className="expense-frequency">
                      {item.frequency === 'monthly' ? 'Mensuel' : MONTHS[item.payment_month - 1]}
                    </div>
                  </div>
                )
              })}
            </div>
            {items.length > 6 && (
              <button className="btn btn-outline" onClick={() => setShowManage(true)} style={{ marginTop: '1rem' }}>
                Voir les {items.length} dépenses →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
