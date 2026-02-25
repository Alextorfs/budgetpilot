import { useState } from 'react'
import useStore from '../store'
import CheckIn from './CheckIn'
import '../styles/Dashboard.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Dashboard({ selectedMonth, setSelectedMonth }) {
  const { userProfile, activePlan, items } = useStore()
  const currentMonth = selectedMonth || (new Date().getMonth() + 1)
  const [showCheckIn, setShowCheckIn] = useState(false)

  if (!activePlan || !userProfile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ fontSize: '3rem' }}>⏳</div>
        <div style={{ fontSize: '1.25rem' }}>Chargement du plan...</div>
      </div>
    )
  }

  if (showCheckIn) return <CheckIn onBack={() => setShowCheckIn(false)} />

  const salary = activePlan.monthly_salary_net || 0
  const funSavings = activePlan.fun_savings_monthly_target || 0
  const myTransfer = userProfile.shared_monthly_transfer || 0
  const partnerTransfer = userProfile.partner_monthly_transfer || 0
  const totalCommonTransfer = myTransfer + partnerTransfer
  const hasShared = userProfile.has_shared_account || false
  const existingSavings = userProfile.existing_savings || 0
  const existingSharedSavings = userProfile.existing_shared_savings || 0

  // ══════════════════════════════════════════════════════════════════════
  // REVENUS EXCEPTIONNELS ce mois
  // ══════════════════════════════════════════════════════════════════════
  const bonusItems = items.filter(i => 
    i.kind === 'income' && 
    i.frequency === 'yearly' && 
    i.payment_month === currentMonth
  )
  const bonusToSavings = bonusItems.filter(i => i.goes_to_savings).reduce((s, i) => s + i.amount, 0)
  const bonusToFree = bonusItems.filter(i => !i.goes_to_savings).reduce((s, i) => s + i.amount, 0)

  // ══════════════════════════════════════════════════════════════════════
  // DÉPENSES IMPRÉVUES ce mois
  // ══════════════════════════════════════════════════════════════════════
  const unplannedItems = items.filter(i => 
    i.is_unplanned && 
    i.unplanned_month === currentMonth
  )
  const unplannedFromSavings = unplannedItems.reduce((s, i) => s + (i.funded_from_savings || 0), 0)
  const unplannedFromFree = unplannedItems.reduce((s, i) => s + (i.funded_from_free || 0), 0)
  const unplannedFromSharedSavings = unplannedItems.reduce((s, i) => s + (i.funded_from_shared_savings || 0), 0)

  // Dépenses imprévues COMMUNES pour calcul estimation
  const unplannedCommon = unplannedItems.filter(i => i.sharing_type === 'common')
  const partnerUnplannedFromShared = unplannedCommon.reduce((s, i) => {
    const totalAmount = i.amount
    const mySharePercent = i.my_share_percent || 100
    const partnerPart = totalAmount * ((100 - mySharePercent) / 100)
    return s + partnerPart
  }, 0)

  // ══════════════════════════════════════════════════════════════════════
  // DÉPENSES MENSUELLES PERSO
  // ══════════════════════════════════════════════════════════════════════
  const personalMonthlyExpenses = items
    .filter(i => i.frequency === 'monthly' && i.sharing_type === 'individual' && i.kind === 'expense' && !i.is_unplanned)
    .reduce((s, i) => s + i.amount, 0)

  // ══════════════════════════════════════════════════════════════════════
  // COMPTE COMMUN : Dépenses mensuelles INCLUSES dans virement
  // ══════════════════════════════════════════════════════════════════════
  const commonMonthlyIncluded = items
    .filter(i => 
      i.frequency === 'monthly' && 
      i.sharing_type === 'common' && 
      i.is_included_in_shared_transfer && 
      i.kind === 'expense' &&
      !i.is_unplanned
    )
    .reduce((s, i) => s + i.amount, 0)

  const commonBalanceMonthly = totalCommonTransfer - commonMonthlyIncluded
  const hasShortfallMonthly = commonBalanceMonthly < 0

  // ══════════════════════════════════════════════════════════════════════
  // PROVISIONS
  // ══════════════════════════════════════════════════════════════════════
  const computeProvision = (item) => {
    if (!item.payment_month || item.frequency === 'monthly') return 0
    
    const myAmount = item.sharing_type === 'common'
      ? item.amount * ((item.my_share_percent || 100) / 100)
      : item.amount
    
    // LISSÉ : provision constante toute l'année (continue après paiement)
    if (item.allocation_mode === 'spread') return myAmount / 12
    
    // PRORATA : provision selon mois restants (arrête après paiement)
    if (currentMonth > item.payment_month) return 0
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

  const provisionItems = items.filter(i => {
    if (i.frequency === 'monthly' || i.kind !== 'expense' || i.is_unplanned) return false
    // Mode LISSÉ : apparaît toute l'année
    if (i.allocation_mode === 'spread') return true
    // Mode PRORATA : seulement avant/pendant le mois de paiement
    return i.payment_month >= currentMonth
  })
  
  const personalProvisionItems = provisionItems.filter(i => i.sharing_type === 'individual')
  const personalProvisions = personalProvisionItems.reduce((s, i) => s + computeProvision(i), 0)

  // ÉPARGNE COMMUNE : Provisions NON incluses dans virement mensuel
  const commonProvisionItems = provisionItems.filter(i => 
    i.sharing_type === 'common' && 
    !i.is_included_in_shared_transfer
  )
  const commonProvisions = commonProvisionItems.reduce((s, i) => s + computeProvision(i), 0)

  // ══════════════════════════════════════════════════════════════════════
  // TOTAUX
  // ══════════════════════════════════════════════════════════════════════
  const totalToSavePersonal = personalProvisions + funSavings
  const totalToSaveShared = hasShared ? commonProvisions : 0
  const totalToSave = totalToSavePersonal + (hasShared ? myTransfer : 0) + totalToSaveShared

  // Argent libre = Salaire - dépenses mensuelles perso - épargne perso - virement commun - épargne commune - dépenses imprévues (free) + bonus (free)
  const freeMoney = salary - personalMonthlyExpenses - totalToSavePersonal - (hasShared ? myTransfer : 0) - (hasShared ? totalToSaveShared : 0) - unplannedFromFree + bonusToFree

  const pct = salary > 0 ? (freeMoney / salary) * 100 : 0
  const status = pct < 10
    ? { label: '⚠️ Budget tendu — marge faible', cls: 'tight' }
    : pct < 20 ? { label: '✓ Budget équilibré', cls: 'balanced' }
    : { label: '🌿 Budget confortable', cls: 'comfortable' }

  // Projection épargne projet : stock + virements mensuels restants + bonus - dépenses imprévues
  const monthsLeft = 12 - currentMonth + 1
  const projectedSavings = existingSavings + (funSavings * monthsLeft) + bonusToSavings - unplannedFromSavings

  // Projection épargne commune
  const projectedSharedSavings = existingSharedSavings + (commonProvisions * monthsLeft) - unplannedFromSharedSavings

  // Estimation totale épargne commune (basée sur moyenne des %)
  const avgSharedPercent = commonProvisionItems.length > 0
    ? commonProvisionItems.reduce((s, i) => s + (i.my_share_percent || 50), 0) / commonProvisionItems.length
    : 50
  const estimatedTotalSharedSavings = (existingSharedSavings / avgSharedPercent) * 100
  const estimatedAfterUnplanned = estimatedTotalSharedSavings - unplannedFromSharedSavings - partnerUnplannedFromShared

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1>Bonjour {userProfile.first_name} 👋</h1>
            <p className="current-month">{MONTHS[currentMonth - 1]} {activePlan.year}</p>
          </div>
          <select className="month-selector" value={currentMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>

        {/* Check-in button */}
        <button className="btn btn-primary btn-lg checkin-btn" onClick={() => setShowCheckIn(true)} style={{ marginBottom: 'var(--spacing-lg)' }}>
          📝 Check-in de {MONTHS[currentMonth - 1]}
        </button>

        {/* Alertes dépenses imprévues */}
        {unplannedItems.length > 0 && (
          <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <strong>💡 Dépenses imprévues ce mois-ci :</strong>
            {unplannedItems.map(item => (
              <div key={item.id} style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                • {item.title} : {fmt(item.amount)}
                {item.funded_from_savings > 0 && ` (${fmt(item.funded_from_savings)} épargne projet)`}
                {item.funded_from_free > 0 && ` (${fmt(item.funded_from_free)} argent libre)`}
                {item.funded_from_shared_savings > 0 && ` (${fmt(item.funded_from_shared_savings)} épargne commune)`}
              </div>
            ))}
          </div>
        )}

        {/* Alertes revenus exceptionnels */}
        {bonusItems.length > 0 && (
          <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <strong>🎁 Revenus exceptionnels ce mois-ci :</strong>
            {bonusItems.map(item => (
              <div key={item.id} style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                • {item.title} : +{fmt(item.amount)}
                {item.goes_to_savings ? ' → épargne projet' : ' → argent libre'}
              </div>
            ))}
          </div>
        )}

        {/* Projection épargne projet */}
        <div className="projection-card">
          <div className="projection-icon">🎯</div>
          <div className="projection-content">
            <h3>Projection épargne projet fin {activePlan.year}</h3>
            <p>En virant {fmt(funSavings)}/mois sur ton compte épargne :</p>
            <div className="projection-amount">{fmt(projectedSavings)}</div>
            <p className="projection-detail">
              <small>
                {monthsLeft} mois × {fmt(funSavings)} + {fmt(existingSavings)} stock
                {bonusToSavings > 0 && ` + ${fmt(bonusToSavings)} bonus`}
                {unplannedFromSavings > 0 && ` - ${fmt(unplannedFromSavings)} dépenses imprévues`}
              </small>
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
          {bonusToFree > 0 && (
            <div className="info-row">
              <span className="info-label">+ Revenus exceptionnels</span>
              <span className="info-value green">+{fmt(bonusToFree)}</span>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Dépenses mensuelles perso</span>
            <span className="info-value">{fmt(personalMonthlyExpenses)}</span>
          </div>
          {unplannedFromFree > 0 && (
            <div className="info-row">
              <span className="info-label">Dépenses imprévues (argent libre)</span>
              <span className="info-value">{fmt(unplannedFromFree)}</span>
            </div>
          )}
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
              <span className="info-value orange">{fmt(myTransfer)}</span>
            </div>
          )}
          {hasShared && commonProvisions > 0 && (
            <div className="info-row">
              <span className="info-label">Virement épargne commune</span>
              <span className="info-value purple">{fmt(commonProvisions)}</span>
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

        {/* Détail des virements */}
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
            <>
              <div className="transfer-section">
                <div className="transfer-header">
                  <span className="transfer-icon">🏠</span>
                  <h4>Compte commun (dépenses courantes)</h4>
                </div>
                <div className="transfer-item">
                  <span>Virement mensuel fixe</span>
                  <strong className="transfer-amount orange">{fmt(myTransfer)}</strong>
                </div>
              </div>

              {commonProvisionItems.length > 0 && (
                <div className="transfer-section">
                  <div className="transfer-header">
                    <span className="transfer-icon">💰</span>
                    <h4>Épargne commune (provisions futures)</h4>
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
                    <span>Total épargne commune</span>
                    <strong>{fmt(commonProvisions)}</strong>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="transfer-grand-total">
            <span>🔄 Total à virer ce mois-ci</span>
            <strong className="grand-total-amount">{fmt(totalToSave)}</strong>
          </div>
        </div>

        {/* Provisions détail */}
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

        {/* Compte commun */}
        {hasShared && (
          <div className="budget-zone common-zone">
            <h2>🏠 Compte Commun (dépenses courantes)</h2>
            <p className="zone-subtitle">Loyer, courses, électricité...</p>
            <div className="info-row">
              <span className="info-label">Ton virement</span>
              <span className="info-value">{fmt(myTransfer)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Virement de ta conjointe</span>
              <span className="info-value">{fmt(partnerTransfer)}</span>
            </div>
            <div className="info-row" style={{ borderTop: '2px solid #E5E7EB', paddingTop: '0.75rem' }}>
              <span className="info-label" style={{ fontWeight: 700 }}>Total disponible</span>
              <span className="info-value green" style={{ fontWeight: 700 }}>{fmt(totalCommonTransfer)}</span>
            </div>
            <div className="divider"></div>
            <div className="info-row">
              <span className="info-label">Dépenses mensuelles incluses</span>
              <span className="info-value">{fmt(commonMonthlyIncluded)}</span>
            </div>

            {hasShortfallMonthly ? (
              <div className="common-balance-card danger">
                <div className="balance-icon">⚠️</div>
                <div>
                  <strong>Manque de {fmt(Math.abs(commonBalanceMonthly))} !</strong>
                  <p>Les dépenses mensuelles ({fmt(commonMonthlyIncluded)}) dépassent les virements ({fmt(totalCommonTransfer)}).</p>
                </div>
              </div>
            ) : (
              <div className="common-balance-card ok">
                <div className="balance-icon">✅</div>
                <div>
                  <strong>Compte commun équilibré</strong>
                  <p>Solde après dépenses : <strong>{fmt(commonBalanceMonthly)}</strong></p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Épargne commune */}
        {hasShared && commonProvisionItems.length > 0 && (
          <div className="budget-zone shared-savings-zone">
            <h2>💰 Épargne Commune (provisions futures)</h2>
            <p className="zone-subtitle">Assurance, charges copro, taxe foncière...</p>
            
            <div className="info-row">
              <span className="info-label">Stock épargne commune (ta part)</span>
              <span className="info-value purple">{fmt(existingSharedSavings)}</span>
            </div>

            <div className="info-row" style={{ fontSize: '0.875rem', color: '#6B7280', fontStyle: 'italic' }}>
              <span className="info-label">Estimation totale</span>
              <span className="info-value">{fmt(estimatedTotalSharedSavings)}</span>
            </div>

            {(unplannedFromSharedSavings > 0 || partnerUnplannedFromShared > 0) && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#FEF3C7', borderRadius: '0.375rem', fontSize: '0.8125rem' }}>
                <strong>💡 Dépense(s) imprévue(s) ce mois :</strong>
                <div style={{ marginTop: '0.25rem' }}>
                  • Toi : {fmt(unplannedFromSharedSavings)} prélevé
                  {partnerUnplannedFromShared > 0 && (
                    <div>• Partenaire : ~{fmt(partnerUnplannedFromShared)} (estimé)</div>
                  )}
                  <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                    → Estimation après dépenses : {fmt(estimatedAfterUnplanned)}
                  </div>
                </div>
              </div>
            )}

            <div className="divider"></div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>Provisions ce mois :</h4>
            {commonProvisionItems.map(item => {
              const provision = computeProvision(item)
              return (
                <div key={item.id} className="info-row" style={{ fontSize: '0.875rem' }}>
                  <span className="info-label">{item.title} ({item.my_share_percent}%)</span>
                  <span className="info-value">{fmt(provision)}</span>
                </div>
              )
            })}
            <div className="info-row" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <span className="info-label" style={{ fontWeight: 600 }}>Total à virer</span>
              <span className="info-value" style={{ fontWeight: 700 }}>{fmt(commonProvisions)}</span>
            </div>

            <div className="projection-mini" style={{ marginTop: '1rem', padding: '0.75rem', background: '#F9FAFB', borderRadius: '0.5rem' }}>
              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: '0.25rem' }}>Projection fin {activePlan.year}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7C3AED' }}>{fmt(projectedSharedSavings)}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
