import React from 'react'

export function Navigation({ activeTab, setActiveTab, isAdmin }) {
  return (
    <div style={navBarStyle}>
      <button onClick={() => setActiveTab('info')} style={navBtnStyle(activeTab === 'info')}>📍<br/>Info</button>
      <button onClick={() => setActiveTab('services')} style={navBtnStyle(activeTab === 'services')}>✂️<br/>Prenota</button>
      <button onClick={() => setActiveTab('appointments')} style={navBtnStyle(activeTab === 'appointments')}>📅<br/>I miei App.</button>
      <button onClick={() => setActiveTab('profile')} style={navBtnStyle(activeTab === 'profile')}>👤<br/>Profilo</button>
      {isAdmin && (
        <button onClick={() => setActiveTab('admin')} style={navBtnStyle(activeTab === 'admin')}>⚙️<br/>Admin</button>
      )}
    </div>
  )
}

const navBarStyle = { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#1E1E1E', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-around', padding: '10px 0', maxWidth: '500px', margin: '0 auto' }
const navBtnStyle = (isActive) => ({ background: 'none', border: 'none', color: isActive ? '#E53935' : '#888', fontSize: '11px', fontWeight: isActive ? 'bold' : 'normal', cursor: 'pointer', textAlign: 'center' })
