import { useState } from 'react'
import useStore from '../store'
import '../styles/Provisions.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)

export default function Provisions({ selectedMonth }) {
  const { items, userProfile, getProvisionStock } = useStore()
  const currentMonth = selectedMonth || (new Date().getMonth() + 1)
  const hasShared = userProfile?.has_shared_account || false

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
  const commonProvisionItems = provisionItems.filter(i => 
    i.sharing_type === 'common' && 
    !i.is_included_in_shared_transfer
  )

  return (
    <div className="provisions-page">
      <div className="provisions-container">
        
        <div className="provisions-header">
          <h1>💰 Mes Provisions</h1>
          <p className="provisions-subtitle">Suivi détaillé de chaque provision</p>
        </div>

        {/* Provisions personnelles */}
        {personalProvisionItems.length > 0 && (
          <div className="provisions-section">
            <h2>👤 Provisions Personnelles</h2>
            
            {personalProvisionItems.map(item => {
              const target = item.amount
              const saved = getProvisionStock(item.id)
              const monthlyProvision = computeProvision(item)
              const progress = target > 0 ? (saved / target) * 100 : 0
              const isComplete = progress >= 100

              return (
                <div key={item.id} className="provision-card">
                  <div className="provision-header">
                    <div className="provision-title">
                      <span className="provision-name">{item.title}</span>
                      <span className="provision-mode">
                        {item.allocation_mode === 'spread' ? '📆 Lissé' : '📊 Prorata'}
                      </span>
                    </div>
                    <div className="provision-month">
                      {MONTHS[(item.payment_month || 1) - 1]}
                    </div>
                  </div>

                  <div className="provision-amounts">
                    <div className="amount-item">
                      <span className="amount-label">Épargné</span>
                      <span className="amount-value">{fmt(saved)}</span>
                    </div>
                    <div className="amount-divider">/</div>
                    <div className="amount-item">
                      <span className="amount-label">Objectif</span>
                      <span className="amount-value">{fmt(target)}</span>
                    </div>
                  </div>

                  <div className="progress-bar-container">
                    <div 
                      className={`progress-bar-fill ${isComplete ? 'complete' : ''}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>

                  <div className="provision-info">
                    <span className="provision-percent">{progress.toFixed(0)}%</span>
                    <span className="provision-monthly">
                      {fmt(monthlyProvision)}/mois
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Provisions communes */}
        {hasShared && commonProvisionItems.length > 0 && (
          <div className="provisions-section">
            <h2>👥 Provisions Communes (ta part)</h2>
            
            {commonProvisionItems.map(item => {
              const target = item.amount * ((item.my_share_percent || 100) / 100)
              const saved = getProvisionStock(item.id)
              const monthlyProvision = computeProvision(item)
              const progress = target > 0 ? (saved / target) * 100 : 0
              const isComplete = progress >= 100

              return (
                <div key={item.id} className="provision-card">
                  <div className="provision-header">
                    <div className="provision-title">
                      <span className="provision-name">{item.title}</span>
                      <span className="provision-share">({item.my_share_percent}%)</span>
                      <span className="provision-mode">
                        {item.allocation_mode === 'spread' ? '📆 Lissé' : '📊 Prorata'}
                      </span>
                    </div>
                    <div className="provision-month">
                      {MONTHS[(item.payment_month || 1) - 1]}
                    </div>
                  </div>

                  <div className="provision-amounts">
                    <div className="amount-item">
                      <span className="amount-label">Épargné</span>
                      <span className="amount-value">{fmt(saved)}</span>
                    </div>
                    <div className="amount-divider">/</div>
                    <div className="amount-item">
                      <span className="amount-label">Objectif</span>
                      <span className="amount-value">{fmt(target)}</span>
                    </div>
                  </div>

                  <div className="progress-bar-container">
                    <div 
                      className={`progress-bar-fill ${isComplete ? 'complete' : ''}`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>

                  <div className="provision-info">
                    <span className="provision-percent">{progress.toFixed(0)}%</span>
                    <span className="provision-monthly">
                      {fmt(monthlyProvision)}/mois
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {provisionItems.length === 0 && (
          <div className="empty-state">
            <p>📭 Aucune provision en cours</p>
            <p className="empty-subtitle">Ajoute des dépenses annuelles pour commencer à provisionner</p>
          </div>
        )}

      </div>
    </div>
  )
}
