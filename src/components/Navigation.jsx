import React from 'react'

export function Navigation({ activeTab, setActiveTab, isAdmin, pendingCount }) {
  return (
    <div style={navBarStyle}>
      <button 
        onClick={() => setActiveTab('info')} 
        style={navBtnStyle(activeTab === 'info')}
      >
        <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>📍</span>
        Info
      </button>

      <button 
        onClick={() => setActiveTab('services')} 
        style={navBtnStyle(activeTab === 'services')}
      >
        <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>✂️</span>
        Prenota
      </button>

      <button 
        onClick={() => setActiveTab('appointments')} 
        style={navBtnStyle(activeTab === 'appointments')}
      >
        <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>📅</span>
        Agenda
      </button>

      <button 
        onClick={() => setActiveTab('profile')} 
        style={navBtnStyle(activeTab === 'profile')}
      >
        <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>👤</span>
        Profilo
      </button>

      {isAdmin && (
        <button 
          onClick={() => setActiveTab('admin')} 
          style={{ ...navBtnStyle(activeTab === 'admin'), position: 'relative' }}
        >
          <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>⚙️</span>
          Admin
          {pendingCount > 0 && (
            <span style={badgeStyle}>
              {pendingCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}

const navBarStyle = { 
  position: 'fixed', 
  bottom: 0, 
  left: 0, 
  right: 0, 
  backgroundColor: 'rgba(18, 18, 18, 0.95)', 
  backdropFilter: 'blur(10px)',
  borderTop: '1px solid var(--border-color)', 
  display: 'flex', 
  justify: 'space-around', 
  padding: '8px 0 12px 0', 
  maxWidth: '480px', 
  margin: '0 auto',
  zIndex: 1000
}

const navBtnStyle = (isActive) => ({ 
  background: 'none', 
  border: 'none', 
  color: isActive ? 'var(--barber-red)' : 'var(--text-muted)', 
  fontSize: '11px', 
  fontWeight: isActive ? 'bold' : '500', 
  cursor: 'pointer', 
  textAlign: 'center',
  flex: 1,
  transition: 'color 0.2s ease'
})

const badgeStyle = {
  position: 'absolute',
  top: '-2px',
  right: '18%',
  backgroundColor: 'var(--barber-red)',
  color: '#ffffff',
  fontSize: '10px',
  fontWeight: 'bold',
  borderRadius: '10px',
  padding: '2px 6px',
  border: '2px solid #121212'
}
