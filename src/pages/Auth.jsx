import { useState } from 'react'
import { supabase } from '../supabaseClient'
import '../styles/Auth.css'

export default function Auth({ onAuth }) {
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Compte créé ! Vérifie ton email pour confirmer.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <img src="/logo.png" alt="BudgetPilot" style={{ width: '80px', marginBottom: '1.5rem' }} />
        <h1>BudgetPilot</h1>
        <p className="auth-subtitle">
          {isSignUp ? 'Créer un compte' : 'Connexion'}
        </p>

        <form onSubmit={handleAuth} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Chargement...' : isSignUp ? 'Créer mon compte' : 'Se connecter'}
          </button>

          <button
            type="button"
            className="btn btn-link"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? 'Déjà un compte ? Se connecter' : 'Pas de compte ? S\'inscrire'}
          </button>
        </form>
      </div>
    </div>
  )
}