import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useStore from './store'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Wizard from './pages/Wizard'
import Dashboard from './pages/Dashboard'
import Provisions from './pages/Provisions'
import ManagePlan from './pages/ManagePlan'
import Settings from './pages/Settings'
import Navigation from './components/Navigation'
import './styles/global.css'

export default function App() {
  const { user, setUser, userProfile, activePlan, loadUserData, reset } = useStore()
  const [appLoading, setAppLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

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

  if (appLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Chargement de BudgetPilot...</p>
      </div>
    )
  }

  if (!user) return <Auth onAuth={() => {}} />

  if (!userProfile) return <Onboarding />

  if (!activePlan || showWizard) {
    return <Wizard onComplete={() => setShowWizard(false)} />
  }

  // Render avec navigation
  return (
    <div className="app-container">
      {activeTab === 'dashboard' && (
        <Dashboard 
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />
      )}
      
      {activeTab === 'provisions' && (
        <Provisions 
          selectedMonth={selectedMonth}
        />
      )}
      
      {activeTab === 'manage' && (
        <ManagePlan onBack={() => setActiveTab('dashboard')} />
      )}
      
      {activeTab === 'settings' && (
        <Settings onBack={() => setActiveTab('dashboard')} />
      )}

      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  )
}
