import { useState } from 'react'
import useStore from '../store'
import ManagePlan from './ManagePlan'
import Settings from './Settings'
import CheckIn from './CheckIn'
import '../styles/Dashboard.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Dashboard({ onLogout }) {
  const { userProfile, activePlan, items } = useStore()
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [showManage, setShowManage] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCheckIn, setShowCheckIn] = useState(false)

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
  if (showCheckIn) return <CheckIn onBack={() => setShowCheckIn(false)} />

  const salary = activePlan.monthly_salary_net || 0
  const funSavings = activePlan.fun_savings_monthly_target || 0
  const myTransfer = userProfile.shared_monthly_transfer || 0
  const partnerTransfer = userProfile.partner_monthly_transfer || 0
  const totalCommonTransfer = myTransfer + partnerTransfer
  const hasShared = userProfile.has_shared_account || false
  const existingSavings = userProfile.existing_savings || 0

  const personalMonthlyExpenses = items
    .filter(i => i.frequency === 'monthly' && i.sharing_type === 'individual' && i.kind === 'expense')
    .reduce((s, i) => s + i.amount, 0)

  const commonMonthlyIncluded = items
    .filter(i => i.frequency === 'monthly' && i.sharing_type === 'common' && i.is_included_in_shared_transfer && i.kind === 'expense')
    .reduce((s, i) => s + i.amount, 0)

  const commonMonthlyNotIncluded = items
    .filter(i => i.frequency === 'monthly' && i.sharing_type === 'common' && !i.is_included_in_shared_transfer && i.kind === 'expense')
    .reduce((s, i) => s + i.amount, 0)

  const totalCommonMonthly = commonMonthlyIncluded + commonMonthlyNotIncluded

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

  const computeProgress = (item) => {
    if (!item.payment_month || item.frequency === 'monthly') return 0
    const startMonth = activePlan.start_month || 1
    const totalMonths = item.allocation_mode === 'spread' ? 12 : Math.max(1, item.payment_month - startMonth)
    const doneMonths = Math.max(0, currentMonth - startMonth)
    return Math.min(100, Math.round((doneMonths / totalMonths) * 100))
  }

  const provisionItems = items.filter(i => i.frequency !== 'monthly' && i.kind === 'expense' && i.payment_month >= currentMonth)
  const personalProvisionItems = provisionItems.filter(i => i.sharing_type === 'individual')
  const commonProvisionItems = provisionItems.filter(i => i.sharing_type === 'common' && !i.is_included_in_shared_transfer)

  const personalProvisions = personalProvisionItems.reduce((s, i) => s + computeProvision(i), 0)
  const commonProvisions = commonProvisionItems.reduce((s, i) => s + computeProvision(i), 0)

  const commonProvisionTotal = commonProvisionItems.reduce((s, i) => {
    if (!i.payment_month || currentMonth > i.payment_month) return s
    const totalAmount = i.amount
    if (i.allocation_mode === 'spread') return s + (totalAmount / 12)
    const monthsLeft = i.payment_month - currentMonth
    return s + (totalAmount / Math.max(monthsLeft, 1))
  }, 0)

  const totalCommonExpenses = totalCommonMonthly + commonProvisionTotal
  const commonBalance = totalCommonTransfer - totalCommonExpenses
  const hasShortfall = commonBalance < 0

  const totalToSave = personalProvisions + funSavings + (hasShared ? myTransfer + commonProvisions : 0)
  const freeMoney = salary - personalMonthlyExpenses - totalToSave

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
        <div className="dashboard-header">
          <div>
            <h1>Bonjour {userProfile.first_name} 👋</h1>
            <p className="current-month">{MONTHS[currentMonth - 1]} {activePlan.year}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select className="month-selector" value={currentMonth} onChange={e => setCurrentMonth(parseInt(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <button onClick={() => setShowSettings(true)} className="btn btn-secondary btn-sm">⚙️</button>
            <button onClick={onLogout} className="btn btn-secondary btn-sm">🚪</button>
          </div>
        </div>

        {/* Bouton Check-in */}
        <button className="btn btn-primary btn-lg checkin-btn" onClick={() => setShowCheckIn(true)} style={{ marginBottom: 'var(--spacing-lg)' }}>
          📝 Check-in de {MONTHS[currentMonth - 1]}
        </button>

        <div className="projection-card">
          <div className="projection-icon">🎯</div>
          <div className="projection-content">
            <h3>Projection épargne projet fin {activePlan.year}</h3>
            <p>En virant {fmt(funSavings)}/mois sur ton compte épargne :</p>
            <div className="projection-amount">{fmt(projected)}</div>
            <p className="projection-detail">
              <small>{monthsLeft} mois × {fmt(funSavings)} + {fmt(existingSavings)} déjà épargnés</small>
            </p>
          </div>
        </div>

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

        {/* NOUVEAU : Détail des virements à faire ce mois-ci */}
        <div className="transfer-detail-card">
          <h3>📊 Détail des virements de {MONTHS[currentMonth - 1]}</h3>
          
          <div className="transfer-section">
            <div className="transfer-header">
              <span className="transfer-icon">🎯</span>
              <h4>Épargne projet</h4>
            </div>
            <div className="transfer-item">
              <span>Virement mensuel sur ton compte épargne</span>
              <strong className="transfer-amount purple">{fmt(funSavings)}</strong>
            </div>
          </div>

          {personalProvisionItems.length > 0 && (
            <div className="transfer-section">
              <div className="transfer-header">
                <span className="transfer-icon">💰</span>
                <h4>Provisions personnelles</h4>
              </div>
              {personalProvisionItems.map(item => {
                const provision = computeProvision(item)
                return (
                  <div key={item.id} className="transfer-item">
                    <span>{item.title} — {MONTHS[item.payment_month - 1]}</span>
                    <strong className="transfer-amount">{fmt(provision)}</strong>
                  </div>
                )
              })}
              <div className="transfer-total">
                <span>Total provisions perso</span>
                <strong>{fmt(personalProvisions)}</strong>
              </div>
            </div>
          )}

          {hasShared && (
            <div className="transfer-section">
              <div className="transfer-header">
                <span className="transfer-icon">🏠</span>
                <h4>Compte commun</h4>
              </div>
              <div className="transfer-item">
                <span>Virement mensuel fixe</span>
                <strong className="transfer-amount orange">{fmt(myTransfer)}</strong>
              </div>
              {commonProvisionItems.map(item => {
                const provision = computeProvision(item)
                return (
                  <div key={item.id} className="transfer-item">
                    <span>{item.title} (👥 {item.my_share_percent}%) — {MONTHS[item.payment_month - 1]}</span>
                    <strong className="transfer-amount">{fmt(provision)}</strong>
                  </div>
                )
              })}
              <div className="transfer-total">
                <span>Total compte commun</span>
                <strong>{fmt(myTransfer + commonProvisions)}</strong>
              </div>
            </div>
          )}

          <div className="transfer-grand-total">
            <span>🔄 Total à virer ce mois-ci</span>
            <strong className="grand-total-amount">{fmt(totalToSave)}</strong>
          </div>
        </div>

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

                  <div className="provision-progress-label" style={{ marginTop: '0.5rem' }}>
                    <span>{fmt(alreadySaved)} épargnés (estimation)</span>
                    <span>{progress}% — objectif {fmt(myAmount)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

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
              <span className="info-value">{fmt(totalCommonMonthly)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Provisions communes (total couple)</span>
              <span className="info-value">{fmt(commonProvisionTotal)}</span>
            </div>

            {hasShortfall ? (
              <div className="common-balance-card danger">
                <div className="balance-icon">⚠️</div>
                <div>
                  <strong>Manque de {fmt(Math.abs(commonBalance))} sur le compte commun !</strong>
                  <p>Les dépenses communes ({fmt(totalCommonExpenses)}) dépassent les virements ({fmt(totalCommonTransfer)}).</p>
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
                      {item.frequency === 'monthly' ? 'Mensuel' : MONTHS[(item.payment_month || 1) - 1]}
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
