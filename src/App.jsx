import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useStore from './store'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Wizard from './pages/Wizard'
import Dashboard from './pages/Dashboard'
import './styles/global.css'

export default function App() {
  const { user, setUser, userProfile, activePlan, loadUserData, reset } = useStore()
  const [appLoading, setAppLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted && session?.user) {
          setUser(session.user)
          await loadUserData(session.user.id)
        }
      } catch (e) {
        console.log('init error:', e)
      } finally {
        if (mounted) setAppLoading(false)
      }
    }

    init()

    // Timeout de sécurité : max 5 secondes
    const timeout = setTimeout(() => {
      if (mounted) setAppLoading(false)
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        reset()
        setAppLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const handleAuthSuccess = async (authUser) => {
    setAppLoading(true)
    setUser(authUser)
    await loadUserData(authUser.id)
    setAppLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    reset()
  }

  // Chargement initial
  if (appLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1rem'
      }}>
        <div style={{ fontSize: '3rem' }}>⏳</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>Chargement...</div>
      </div>
    )
  }

  // Pas connecté
  if (!user) return <Auth onAuthSuccess={handleAuthSuccess} />

  // Pas de profil → onboarding
  if (!userProfile) return <Onboarding onComplete={() => setShowWizard(true)} />

  // Pas de plan → wizard
  if (showWizard || !activePlan) {
    return (
      <Wizard onComplete={async () => {
        await loadUserData(user.id)
        setShowWizard(false)
      }} />
    )
  }

  // Dashboard principal
  return <Dashboard onLogout={handleLogout} />
}
