import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// COLORI BRAND: Nero #121212, Rosso #E53935, Blu #1E88E5, Bianco #FFFFFF
export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services') // 'info', 'services', 'appointments', 'profile', 'admin'
  
  // Stati Form Auth
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    // 1. Controlla la sessione attiva
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // 2. Ascolta i cambiamenti di stato Auth (login/logout)
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

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error("Errore profilo:", err.message)
    } finally {
      setLoading(false)
    }
  }

  // Gestione Login
  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setLoading(false)
  }

  // Gestione Registrazione
  async function handleRegister(e) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    // Registrazione Utente Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setAuthError(signUpError.message)
      setLoading(false)
      return
    }

    if (authData?.user) {
      // Inserimento dettagli Profilo
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        age: parseInt(age) || null,
        email,
        role: 'client',
        is_approved: false
      }])

      if (profileError) setAuthError(profileError.message)
      else alert("Registrazione effettuata! Controlla la mail per confermare il link e attendi l'approvazione del salone.")
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: '#121212', color: '#FFF', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        Caricamento 31Th Street...
      </div>
    )
  }

  // -------------------------------------------------------------
  // VISTA: LOGIN / REGISTRAZIONE
  // -------------------------------------------------------------
  if (!session) {
    return (
      <div style={{ backgroundColor: '#121212', color: '#FFF', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', maxWidth: '450px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', color: '#E53935', marginTop: '40px' }}>31Th Street</h1>
        <h3 style={{ textAlign: 'center', color: '#AAA', marginBottom: '30px' }}>Barber Shop</h3>

        {authError && <div style={{ background: '#E53935', color: '#FFF', padding: '10px', borderRadius: '6px', marginBottom: '15px' }}>{authError}</div>}

        {!isRegistering ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" style={btnPrimaryStyle}>Accedi</button>
            <p style={{ textAlign: 'center', color: '#AAA' }}>
              Non hai un account? <span onClick={() => setIsRegistering(true)} style={{ color: '#1E88E5', cursor: 'pointer', textDecoration: 'underline' }}>Registrati</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" placeholder="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
            <input type="text" placeholder="Cognome" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
            <input type="number" placeholder="Età" value={age} onChange={(e) => setAge(e.target.value)} required style={inputStyle} />
            <input type="tel" placeholder="Numero di Cellulare" value={phone} onChange={(e) => setPhone(e.target.value)} required style={inputStyle} />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" style={btnPrimaryStyle}>Crea Account</button>
            <p style={{ textAlign: 'center', color: '#AAA' }}>
              Hai già un account? <span onClick={() => setIsRegistering(false)} style={{ color: '#1E88E5', cursor: 'pointer', textDecoration: 'underline' }}>Accedi</span>
            </p>
          </form>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------
  // VISTA: UTENTE IN ATTESA DI APPROVAZIONE ADMIN
  // -------------------------------------------------------------
  if (profile && !profile.is_approved && profile.role !== 'admin') {
    return (
      <div style={{ backgroundColor: '#121212', color: '#FFF', height: '100vh', padding: '30px', textAlign: 'center', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h2 style={{ color: '#E53935' }}>Account in Attesa</h2>
        <p style={{ color: '#CCC', lineHeight: '1.6' }}>
          Ciao <strong>{profile.first_name}</strong>, la tua registrazione è stata ricevuta. Il proprietario del salone deve convalidare il tuo account prima che tu possa prenotare.
        </p>
        <button onClick={() => supabase.auth.signOut()} style={{ ...btnSecondaryStyle, marginTop: '20px' }}>Esci</button>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VISTA PRINCIPALE (APP APPROVATA)
  // -------------------------------------------------------------
  return (
    <div style={{ backgroundColor: '#121212', color: '#FFF', minHeight: '100vh', paddingBottom: '70px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ padding: '15px 20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#E53935', margin: 0 }}>31Th Street</h2>
        {profile?.role === 'admin' && (
          <span style={{ background: '#1E88E5', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>ADMIN</span>
        )}
      </div>

      {/* CONTENUTO SCHEDE (TAB) */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'info' && (
          <div>
            <h3>📍 Dove Siamo</h3>
            <p style={{ color: '#BBB' }}>Via 31Th Street, Napoli</p>
            <p style={{ color: '#BBB' }}>📞 Tel: +39 081 000000</p>
            <p style={{ color: '#BBB' }}>🕒 Orari: Mar - Dom (8:30 - 19:00)</p>
            <p style={{ color: '#E53935' }}>Chiuso il Lunedì</p>
          </div>
        )}

        {activeTab === 'services' && (
          <div>
            <h3>✂️ Seleziona Servizi</h3>
            <p style={{ color: '#AAA' }}>Scegli i servizi da prenotare per sbloccare il calendario.</p>
            {/* Il modulo di selezione e calendario verrà integrato nello step successivo */}
          </div>
        )}

        {activeTab === 'appointments' && (
          <div>
            <h3>📅 Le Tue Prenotazioni</h3>
            <p style={{ color: '#AAA' }}>Nessuna prenotazione attiva al momento.</p>
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <h3>👤 Il Tuo Profilo</h3>
            <p><strong>Nome:</strong> {profile?.first_name} {profile?.last_name}</p>
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Telefono:</strong> {profile?.phone}</p>
            <button onClick={() => supabase.auth.signOut()} style={{ ...btnSecondaryStyle, marginTop: '20px' }}>Disconnettiti</button>
          </div>
        )}

        {activeTab === 'admin' && profile?.role === 'admin' && (
          <div>
            <h3 style={{ color: '#1E88E5' }}>⚙️ Pannello Gestione Salone</h3>
            <p style={{ color: '#AAA' }}>Gestione approvazioni e appuntamenti clienti.</p>
          </div>
        )}
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: '#1E1E1E', borderTop: '1px solid #333', display: 'flex', justifyContent: 'space-around', padding: '10px 0', maxWidth: '500px', margin: '0 auto' }}>
        <button onClick={() => setActiveTab('info')} style={navBtnStyle(activeTab === 'info')}>📍<br/>Info</button>
        <button onClick={() => setActiveTab('services')} style={navBtnStyle(activeTab === 'services')}>✂️<br/>Prenota</button>
        <button onClick={() => setActiveTab('appointments')} style={navBtnStyle(activeTab === 'appointments')}>📅<br/>I miei App.</button>
        <button onClick={() => setActiveTab('profile')} style={navBtnStyle(activeTab === 'profile')}>👤<br/>Profilo</button>
        {profile?.role === 'admin' && (
          <button onClick={() => setActiveTab('admin')} style={navBtnStyle(activeTab === 'admin')}>⚙️<br/>Admin</button>
        )}
      </div>

    </div>
  )
}

// -------------------------------------------------------------
// STILI inline PER MOBILE
// -------------------------------------------------------------
const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #333',
  backgroundColor: '#1E1E1E',
  color: '#FFF',
  fontSize: '14px',
  boxSizing: 'border-box'
}

const btnPrimaryStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: 'none',
  backgroundColor: '#E53935',
  color: '#FFF',
  fontWeight: 'bold',
  fontSize: '16px',
  cursor: 'pointer'
}

const btnSecondaryStyle = {
  width: '100%',
  padding: '10px',
  borderRadius: '6px',
  border: '1px solid #E53935',
  backgroundColor: 'transparent',
  color: '#E53935',
  fontWeight: 'bold',
  cursor: 'pointer'
}

const navBtnStyle = (isActive) => ({
  background: 'none',
  border: 'none',
  color: isActive ? '#E53935' : '#888',
  fontSize: '11px',
  fontWeight: isActive ? 'bold' : 'normal',
  cursor: 'pointer',
  textAlign: 'center'
})
