import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function Auth() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true)
      }
    })
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setLoading(false)
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setAuthError(error.message)
    } else {
      alert('Password aggiornata con successo! Ora puoi accedere.')
      setIsResettingPassword(false)
    }
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) throw signUpError

      if (authData?.user) {
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
        if (profileError) throw profileError

        alert("Registrazione effettuata! Conferma l'email e attendi l'approvazione del salone.")
        setIsRegistering(false)
      }
    } catch (err) {
      setAuthError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (isResettingPassword) {
    return (
      <div className="app-container" style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="info-card">
          <h2 style={{ textAlign: 'center', color: '#FFFFFF', marginTop: '10px' }}>Nuova Password</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            Inserisci la tua nuova password per il tuo account.
          </p>
          {authError && <div style={errorBoxStyle}>{authError}</div>}
          <form onSubmit={handleUpdatePassword} style={formStyle}>
            <input 
              type="password" 
              placeholder="Nuova Password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              required 
              style={inputStyle} 
            />
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Salvataggio...' : 'Salva Nuova Password'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Hero Branding */}
      <div style={{ textAlign: 'center', marginBottom: '25px', position: 'relative', zIndex: 1 }}>
        <h1 className="brand-title" style={{ fontSize: '3rem', justifyContent: 'center' }}>
          31<span style={{ fontSize: '1.3rem', verticalAlign: 'super' }}>th</span> STREET
        </h1>
        <span className="brand-subtitle" style={{ fontSize: '2.5rem', marginTop: '-6px' }}>
          Barber Shop
        </span>
      </div>

      <div className="info-card" style={{ position: 'relative', zIndex: 1 }}>
        {authError && <div style={errorBoxStyle}>{authError}</div>}

        {!isRegistering ? (
          <form onSubmit={handleLogin} style={formStyle}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
            <p style={linkTextStyle}>
              Non hai un account? <span onClick={() => setIsRegistering(true)} style={linkStyle}>Registrati</span>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} style={formStyle}>
            <input type="text" placeholder="Nome" value={firstName} onChange={e => setFirstName(e.target.value)} required style={inputStyle} />
            <input type="text" placeholder="Cognome" value={lastName} onChange={e => setLastName(e.target.value)} required style={inputStyle} />
            <input type="number" placeholder="Età" value={age} onChange={e => setAge(e.target.value)} required style={inputStyle} />
            <input type="tel" placeholder="Cellulare" value={phone} onChange={e => setPhone(e.target.value)} required style={inputStyle} />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Registrazione...' : 'Crea Account'}
            </button>
            <p style={linkTextStyle}>
              Hai già un account? <span onClick={() => setIsRegistering(false)} style={linkStyle}>Accedi</span>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const formStyle = { display: 'flex', flexDirection: 'column', gap: '14px' }

const inputStyle = { 
  width: '100%', 
  padding: '12px 14px', 
  borderRadius: '6px', 
  border: '1px solid var(--border-color)', 
  backgroundColor: 'rgba(15, 15, 15, 0.8)', 
  color: '#FFF', 
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: '14px'
}

const btnPrimaryStyle = { 
  width: '100%', 
  padding: '13px', 
  borderRadius: '6px', 
  border: 'none', 
  backgroundColor: 'var(--barber-red)', 
  color: '#FFF', 
  fontWeight: 'bold', 
  fontSize: '0.95rem',
  letterSpacing: '0.5px',
  cursor: 'pointer',
  marginTop: '5px',
  boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)'
}

const errorBoxStyle = { 
  background: 'rgba(211, 47, 47, 0.2)', 
  border: '1px solid var(--barber-red)',
  color: '#FFF', 
  padding: '10px 14px', 
  borderRadius: '6px', 
  marginBottom: '15px',
  fontSize: '13px'
}

const linkTextStyle = { textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }
const linkStyle = { color: '#FFFFFF', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }
