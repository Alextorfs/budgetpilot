import './Navigation.css'

export default function Navigation({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'provisions', icon: '💰', label: 'Provisions' },
    { id: 'manage', icon: '📝', label: 'Gérer' },
    { id: 'settings', icon: '⚙️', label: 'Paramètres' },
  ]

  return (
    <nav className="bottom-navigation">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
