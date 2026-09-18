import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Auth } from './components/Auth'
import { BookingView } from './components/BookingView'
import { Navigation } from './components/Navigation'
import { AdminApprovals } from './components/AdminApprovals'
import { AppointmentsView } from './components/AppointmentsView'


export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services')

  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [pendingCount, setPendingCount] = useState(0)

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

  if (loading) {
    return (
      <div style={{ backgroundColor: '#0A0A0A', color: '#FFFFFF', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        Caricamento 31Th Street...
      </div>
    )
  }

  if (!session) return <Auth />

  if (profile && !profile.is_approved && profile.role !== 'admin') {
    return (
      <div style={{ backgroundColor: '#0A0A0A', color: '#FFF', height: '100vh', padding: '30px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#D32F2F' }}>Account in Attesa</h2>
        <p>Ciao <strong>{profile.first_name}</strong>, la tua registrazione è attiva. Un amministratore deve convalidare il tuo account prima che tu possa prenotare.</p>
        <button onClick={() => supabase.auth.signOut()} style={{ marginTop: '20px', padding: '10px', background: 'transparent', border: '1px solid #D32F2F', color: '#D32F2F', borderRadius: '6px', cursor: 'pointer' }}>Esci</button>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0A0A0A', color: '#FFF', minHeight: '100vh', paddingBottom: '80px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header */}
      <div style={{ padding: '15px 20px', borderBottom: '1px solid #2A2A2A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#FFFFFF', margin: 0, letterSpacing: '1px' }}>31Th Street</h2>
        {profile?.role === 'admin' && <span style={{ background: '#1A3B8B', color: '#FFF', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>ADMIN</span>}
      </div>

      {/* Contenuto dinamico */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'services' && (
          <BookingView 
            services={services} 
            barbers={barbers} 
            userId={session.user.id} 
            onBookingSuccess={() => setActiveTab('appointments')} 
          />
        )}

        {activeTab === 'info' && (
          <div>
            <h3>📍 Dove Siamo</h3>
            <p style={{ color: '#BBB' }}>Via 31Th Street, Napoli</p>
            <p style={{ color: '#BBB' }}>📞 Tel: +39 081 000000</p>
            <p style={{ color: '#D32F2F', fontWeight: 'bold' }}>Chiuso il Lunedì</p>
          </div>
        )}

        {activeTab === 'appointments' && (
          <AppointmentsView userId={session.user.id} />
        )}

        {activeTab === 'profile' && (
          <div>
            <h3>👤 Il Tuo Profilo</h3>
            <p><strong>Nome:</strong> {profile?.first_name} {profile?.last_name}</p>
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Telefono:</strong> {profile?.phone}</p>
            <button onClick={() => supabase.auth.signOut()} style={{ marginTop: '20px', width: '100%', padding: '12px', background: 'transparent', border: '1px solid #D32F2F', color: '#D32F2F', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Disconnettiti</button>
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div>
            <h3 style={{ color: '#1A3B8B' }}>⚙️ Pannello Admin</h3>
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
