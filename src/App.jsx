import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Auth } from './components/Auth'
import { BookingView } from './components/BookingView'
import { Navigation } from './components/Navigation'
import { AdminApprovals } from './components/AdminApprovals'
import { AppointmentsView } from './components/AppointmentsView'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services')

  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [pendingCount, setPendingCount] = useState(0)

  // Stato per l'appuntamento in corso di modifica
  const [editingAppointment, setEditingAppointment] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
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

  if (!session) return <Auth />

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
      {/* Barra grigia in cima come da immagine */}
      <div className="top-banner" />

      {/* Header */}
      <div className="header-brand">
        <div>
          <h2 className="brand-title">
            31<span style={{ fontSize: '0.9rem', verticalAlign: 'super' }}>th</span> STREET
          </h2>
          <span className="brand-subtitle">Barber Shop</span>
        </div>
        {profile?.role === 'admin' && <span className="admin-badge">ADMIN</span>}
      </div>

      {/* Contenuto dinamico */}
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

        {activeTab === 'profile' && (
          <div>
            <h3 className="section-title">Il Tuo Profilo</h3>
            <div className="info-card">
              <p style={{ margin: '10px 0' }}><strong>Nome:</strong> {profile?.first_name} {profile?.last_name}</p>
              <p style={{ margin: '10px 0' }}><strong>Email:</strong> {profile?.email}</p>
              <p style={{ margin: '10px 0' }}><strong>Telefono:</strong> {profile?.phone}</p>
              <button onClick={() => supabase.auth.signOut()} className="btn-danger" style={{ marginTop: '20px' }}>
                Disconnettiti
              </button>
            </div>
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div>
            <h3 className="section-title">Pannello Admin</h3>
            <AdminApprovals onApprovalChange={fetchPendingCount} />
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
