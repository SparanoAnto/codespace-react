import React from 'react'

export function Navigation({ activeTab, setActiveTab, isAdmin }) {
  return (
    <div style={navBarStyle}>
      <button onClick={() => setActiveTab('info')} style={navBtnStyle(activeTab === 'info')}>📍<br/>Info</button>
      <button onClick={() => setActiveTab('services')} style={navBtnStyle(activeTab === 'services')}>✂️<br/>Prenota</button>
      <button onClick={() => setActiveTab('appointments')} style={navBtnStyle(activeTab === 'appointments')}>📅<br/>Appuntamenti</button>
      <button onClick={() => setActiveTab('profile')} style={navBtnStyle(activeTab === 'profile')}>👤<br/>Profilo</button>
      {isAdmin && (
        <button onClick={() => setActiveTab('admin')} style={navBtnStyle(activeTab === 'admin')}>⚙️<br/>Admin</button>
      )}
    </div>
  )
}

const navBarStyle = { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#1A1A1A', borderTop: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-around', padding: '10px 0', maxWidth: '500px', margin: '0 auto' }
const navBtnStyle = (isActive) => ({ background: 'none', border: 'none', color: isActive ? '#D32F2F' : '#888888', fontSize: '11px', fontWeight: isActive ? 'bold' : 'normal', cursor: 'pointer', textAlign: 'center' })
