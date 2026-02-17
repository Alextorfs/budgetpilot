import { useState } from 'react'
import useStore from '../store'
import '../styles/Onboarding.css'

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

export default function Onboarding({ onComplete }) {
  const { setUserProfile, createPlan } = useStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    year: new Date().getFullYear(),
    startMonth: new Date().getMonth() + 1,
    existingSavings: 0,
    monthlySalary: 0,
    funSavingsTarget: 0,
    hasSharedAccount: false,
    sharedMonthlyTransfer: 0,
    partnerMonthlyTransfer: 0,
  })

  const upd = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const canNext = () => {
    if (step === 0) return form.firstName.trim().length > 0
    if (step === 3) return form.monthlySalary > 0
    if (step === 5) return !form.hasSharedAccount || form.sharedMonthlyTransfer > 0
    return true
  }

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1)
    } else {
      setLoading(true)
      setError('')
      try {
        await setUserProfile({
          firstName: form.firstName,
          existingSavings: form.existingSavings,
          hasSharedAccount: form.hasSharedAccount,
          sharedMonthlyTransfer: form.sharedMonthlyTransfer,
          partnerMonthlyTransfer: form.partnerMonthlyTransfer,
        })
        await createPlan({
          year: form.year,
          startMonth: form.startMonth,
          monthlySalaryNet: form.monthlySalary,
          funSavingsMonthlyTarget: form.funSavingsTarget,
        })
        onComplete()
      } catch (e) {
        setError('Erreur : ' + e.message)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>
        <div className="step-indicator">Étape {step + 1} / 6</div>

        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

        {/* Étape 0 : Prénom */}
        {step === 0 && (
          <div className="step fade-in">
            <div className="step-icon">👋</div>
            <h1>Bienvenue sur BudgetPilot</h1>
            <p className="step-subtitle">Créons ensemble ton plan financier</p>
            <div className="form-group">
              <label>Ton prénom</label>
              <input type="text" value={form.firstName} onChange={e => upd('firstName', e.target.value)} placeholder="Ex: Alex" autoFocus />
            </div>
          </div>
        )}

        {/* Étape 1 : Période */}
        {step === 1 && (
          <div className="step fade-in">
            <div className="step-icon">📅</div>
            <h2>Quelle période veux-tu planifier ?</h2>
            <div className="form-group">
              <label>Année</label>
              <select value={form.year} onChange={e => upd('year', parseInt(e.target.value))}>
                {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Mois de départ</label>
              <select value={form.startMonth} onChange={e => upd('startMonth', parseInt(e.target.value))}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Étape 2 : Épargne existante */}
        {step === 2 && (
          <div className="step fade-in">
            <div className="step-icon">🏦</div>
            <h2>As-tu déjà de l'épargne ?</h2>
            <p className="step-subtitle">Montant disponible sur tes comptes d'épargne actuellement</p>
            <div className="amount-display">{form.existingSavings.toLocaleString('fr-FR')} €</div>
            <div className="form-group">
              <input type="range" min="0" max="50000" step="100" value={form.existingSavings} onChange={e => upd('existingSavings', parseInt(e.target.value))} />
              <div className="range-labels"><span>0 €</span><span>50 000 €</span></div>
            </div>
          </div>
        )}

        {/* Étape 3 : Salaire */}
        {step === 3 && (
          <div className="step fade-in">
            <div className="step-icon">💰</div>
            <h2>Ton salaire net mensuel ?</h2>
            <div className="amount-display primary">{form.monthlySalary.toLocaleString('fr-FR')} €</div>
            <div className="form-group">
              <input type="range" min="0" max="10000" step="50" value={form.monthlySalary} onChange={e => upd('monthlySalary', parseInt(e.target.value))} />
              <div className="range-labels"><span>0 €</span><span>10 000 €</span></div>
            </div>
          </div>
        )}

        {/* Étape 4 : Épargne projet */}
        {step === 4 && (
          <div className="step fade-in">
            <div className="step-icon">🎯</div>
            <h2>Combien vires-tu sur ton épargne chaque mois ?</h2>
            <p className="step-subtitle">C'est l'argent que tu mets de côté chaque mois pour tes futurs projets (vacances, voiture, travaux…). Ce n'est PAS ton budget loisirs mensuel.</p>
            <div className="amount-display purple">{form.funSavingsTarget.toLocaleString('fr-FR')} €</div>
            {form.monthlySalary > 0 && (
              <div className="percentage-display">{Math.round((form.funSavingsTarget / form.monthlySalary) * 100)}% de ton salaire</div>
            )}
            <div className="form-group">
              <input type="range" min="0" max={Math.min(form.monthlySalary, 3000)} step="10" value={form.funSavingsTarget} onChange={e => upd('funSavingsTarget', parseInt(e.target.value))} />
              <div className="range-labels"><span>0 €</span><span>{Math.min(form.monthlySalary, 3000).toLocaleString('fr-FR')} €</span></div>
            </div>
          </div>
        )}

        {/* Étape 5 : Compte commun */}
        {step === 5 && (
          <div className="step fade-in">
            <div className="step-icon">👥</div>
            <h2>As-tu un compte commun ?</h2>
            <p className="step-subtitle">Pour gérer les dépenses partagées avec ton/ta partenaire</p>

            <div className="toggle-container">
              <label className="toggle">
                <input type="checkbox" checked={form.hasSharedAccount} onChange={e => upd('hasSharedAccount', e.target.checked)} />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">{form.hasSharedAccount ? 'Oui, j\'ai un compte commun' : 'Non'}</span>
            </div>

            {form.hasSharedAccount && (
              <div className="shared-amount-section fade-in">

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>💳 Ton virement mensuel sur ce compte</label>
                  <div className="amount-display orange">{form.sharedMonthlyTransfer.toLocaleString('fr-FR')} €</div>
                  <input type="range" min="0" max="3000" step="50" value={form.sharedMonthlyTransfer} onChange={e => upd('sharedMonthlyTransfer', parseInt(e.target.value))} />
                  <div className="range-labels"><span>0 €</span><span>3 000 €</span></div>
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>💳 Virement mensuel de ton/ta partenaire</label>
                  <p className="help-text">Pour calculer le total disponible sur le compte commun et détecter les manques</p>
                  <div className="amount-display orange">{form.partnerMonthlyTransfer.toLocaleString('fr-FR')} €</div>
                  <input type="range" min="0" max="3000" step="50" value={form.partnerMonthlyTransfer} onChange={e => upd('partnerMonthlyTransfer', parseInt(e.target.value))} />
                  <div className="range-labels"><span>0 €</span><span>3 000 €</span></div>
                </div>

                <div className="total-common-preview">
                  <span>Total mensuel sur le compte commun :</span>
                  <strong>{(form.sharedMonthlyTransfer + form.partnerMonthlyTransfer).toLocaleString('fr-FR')} €</strong>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="button-group">
          {step > 0 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)} disabled={loading}>Précédent</button>}
          <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={!canNext() || loading}>
            {loading ? 'Sauvegarde...' : step === 5 ? 'Commencer !' : 'Suivant'}
          </button>
        </div>
      </div>
    </div>
  )
}
