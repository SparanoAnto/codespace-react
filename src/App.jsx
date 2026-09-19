import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Auth } from './components/Auth'
import { BookingView } from './components/BookingView'
import { Navigation } from './components/Navigation'
import { AdminApprovals } from './components/AdminApprovals'
import { AppointmentsView } from './components/AppointmentsView'
import { AdminReports } from './components/AdminReports'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services')

  // Stato per il reset password da link email
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  // Stati per il cambio password nel profilo
  const [newPassword, setNewPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMessage, setPwdMessage] = useState({ type: '', text: '' })

  // Sub-tab Admin
  const [adminSubTab, setAdminSubTab] = useState('approvals')

  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [pendingCount, setPendingCount] = useState(0)

  const [editingAppointment, setEditingAppointment] = useState(null)

  useEffect(() => {
    // 🔍 CONTROLLO DIRETTO DELL'URL PER IL RESET PASSWORD
    const hash = window.location.hash
    const search = window.location.search

    if (
      hash.includes('type=recovery') || 
      search.includes('type=recovery') || 
      hash.includes('access_token')
    ) {
      setIsResettingPassword(true)
    }

    // 1. Recupero sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Ascolto dei cambiamenti di stato Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)

      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true)
      }

      if (session) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && (profile?.is_approved || profile?.role === 'admin')) {
      loadSaloneData()
    }
    if (session && profile?.role === 'admin') {
      fetchPendingCount()
    }
  }, [session, profile])

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
    } catch (err) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchPendingCount() {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false)

    if (!error) setPendingCount(count || 0)
  }

  async function loadSaloneData() {
    const { data: sData } = await supabase.from('services').select('*')
    const { data: bData } = await supabase.from('barbers').select('*').eq('is_active', true)
    if (sData) setServices(sData)
    if (bData) setBarbers(bData)
  }

  // Funzione per il cambio password dalla sezione Profilo
  async function handleChangePassword(e) {
    e.preventDefault()
    setPwdMessage({ type: '', text: '' })

    if (!newPassword || newPassword.length < 6) {
      setPwdMessage({ type: 'error', text: 'La password deve contenere almeno 6 caratteri.' })
      return
    }

    setPwdLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPwdMessage({ type: 'error', text: error.message })
    } else {
      setPwdMessage({ type: 'success', text: 'Password aggiornata con successo!' })
      setNewPassword('')
    }
    setPwdLoading(false)
  }

  const handleStartEdit = (appointment) => {
    setEditingAppointment(appointment)
    setActiveTab('services')
  }

  const handleBookingSuccess = () => {
    setEditingAppointment(null)
    setActiveTab('appointments')
  }

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <h1 className="brand-title" style={{ fontSize: '2.8rem' }}>31<span style={{ fontSize: '1.2rem', verticalAlign: 'super' }}>th</span> STREET</h1>
        <span className="brand-subtitle" style={{ fontSize: '2.2rem' }}>Barber Shop</span>
      </div>
    )
  }

  // 🔴 PRIORITÀ ASSOLUTA: Reset Password da email
  if (isResettingPassword) {
    return (
      <Auth 
        isResettingPasswordProps={true} 
        onPasswordUpdated={() => {
          setIsResettingPassword(false)
          window.history.replaceState({}, document.title, window.location.pathname)
        }} 
      />
    )
  }

  // 🟢 Se l'utente non è loggato
  if (!session) return <Auth />

  // 🟡 Se l'utente non è ancora approvato
  if (profile && !profile.is_approved && profile.role !== 'admin') {
    return (
      <div className="app-container" style={{ padding: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <div className="info-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--barber-red)', margin: '0 0 10px 0' }}>Account in Attesa</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Ciao <strong>{profile.first_name}</strong>, la tua registrazione è attiva. Un amministratore deve convalidare il tuo account prima che tu possa prenotare.
          </p>
          <button onClick={() => supabase.auth.signOut()} className="btn-danger" style={{ marginTop: '15px' }}>
            Esci
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="top-banner" />

      <div className="header-brand">
        <div>
          <h2 className="brand-title">
            31<span style={{ fontSize: '0.9rem', verticalAlign: 'super' }}>th</span> STREET
          </h2>
          <span className="brand-subtitle">Barber Shop</span>
        </div>
        {profile?.role === 'admin' && <span className="admin-badge">ADMIN</span>}
      </div>

      <div style={{ padding: '20px', position: 'relative', zIndex: 1 }}>
        {activeTab === 'services' && (
          <BookingView 
            services={services} 
            barbers={barbers} 
            userId={session.user.id} 
            isAdmin={profile?.role === 'admin'}
            editingAppointment={editingAppointment}
            onBookingSuccess={handleBookingSuccess}
            onCancelEdit={() => setEditingAppointment(null)}
          />
        )}

        {activeTab === 'info' && (
          <div>
            <h3 className="section-title">Dove Siamo</h3>
            <div className="info-card">
              <p style={{ margin: '8px 0' }}>📍 Via 31Th Street, Napoli</p>
              <p style={{ margin: '8px 0' }}>📞 Tel: +39 081 000000</p>
              <p style={{ color: 'var(--barber-red)', fontWeight: 'bold', margin: '15px 0 0 0' }}>💈 Chiuso il Lunedì</p>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <AppointmentsView 
            userId={session.user.id} 
            isAdmin={profile?.role === 'admin'}
            onEditAppointment={handleStartEdit}
          />
        )}

        {/* TAB PROFILO AGGIORNATO */}
        {activeTab === 'profile' && (
          <div>
            <h3 className="section-title">Il Tuo Profilo</h3>
            <div className="info-card">
              <p style={{ margin: '10px 0' }}><strong>Nome:</strong> {profile?.first_name} {profile?.last_name}</p>
              <p style={{ margin: '10px 0' }}><strong>Email:</strong> {profile?.email}</p>
              <p style={{ margin: '10px 0' }}><strong>Telefono:</strong> {profile?.phone}</p>
              
              <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

              <h4 style={{ color: '#FFF', margin: '0 0 10px 0' }}>Cambia Password</h4>
              
              {pwdMessage.text && (
                <div style={{
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '13px',
                  backgroundColor: pwdMessage.type === 'error' ? 'rgba(211, 47, 47, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                  border: pwdMessage.type === 'error' ? '1px solid var(--barber-red)' : '1px solid #2e7d32',
                  color: pwdMessage.type === 'error' ? '#FFF' : '#81c784'
                }}>
                  {pwdMessage.text}
                </div>
              )}

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="password" 
                  placeholder="Nuova Password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'rgba(15, 15, 15, 0.8)',
                    color: '#FFF',
                    boxSizing: 'border-box',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button 
                  type="submit" 
                  disabled={pwdLoading}
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--barber-red)',
                    color: '#FFF',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  {pwdLoading ? 'Aggiornamento...' : 'Aggiorna Password'}
                </button>
              </form>

              <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

              <button onClick={() => supabase.auth.signOut()} className="btn-danger" style={{ width: '100%' }}>
                Disconnettiti
              </button>
            </div>
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setAdminSubTab('approvals')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: adminSubTab === 'approvals' ? '1px solid var(--barber-red)' : '1px solid var(--border-color)',
                  backgroundColor: adminSubTab === 'approvals' ? 'var(--barber-red)' : 'rgba(24, 24, 24, 0.85)',
                  color: '#FFF',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📋 Approvazioni
              </button>

              <button
                onClick={() => setAdminSubTab('reports')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: adminSubTab === 'reports' ? '1px solid var(--barber-red)' : '1px solid var(--border-color)',
                  backgroundColor: adminSubTab === 'reports' ? 'var(--barber-red)' : 'rgba(24, 24, 24, 0.85)',
                  color: '#FFF',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                📊 Report & Stats
              </button>
            </div>

            {adminSubTab === 'approvals' ? (
              <div>
                <h3 className="section-title">Pannello Approvazioni</h3>
                <AdminApprovals onApprovalChange={fetchPendingCount} />
              </div>
            ) : (
              <AdminReports />
            )}
          </div>
        )}
      </div>

      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={profile?.role === 'admin'} 
        pendingCount={pendingCount}
      />
    </div>
  )
}
