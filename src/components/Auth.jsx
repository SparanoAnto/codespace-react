import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function Auth({ isResettingPasswordProps = false, onPasswordUpdated }) {
  const [isRegistering, setIsRegistering] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(isResettingPasswordProps)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  
  // Stati per la Privacy
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setIsResettingPassword(isResettingPasswordProps)
  }, [isResettingPasswordProps])

  async function handleLogin(e) {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setLoading(false)
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setLoading(true)

    const siteUrl = window.location.origin

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl,
    })

    if (error) {
      setAuthError(error.message)
    } else {
      setAuthSuccess('Ti abbiamo inviato un\'email con il link per reimpostare la password!')
    }
    setLoading(false)
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    
    if (error) {
      setAuthError(error.message)
    } else {
      alert('Password aggiornata con successo!')
      setIsResettingPassword(false)
      if (onPasswordUpdated) onPasswordUpdated()
    }
    setLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (!privacyAccepted) {
      setAuthError("Devi accettare l'Informativa sulla Privacy per poter creare un account.")
      return
    }

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
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '15px' }}>
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

  if (isForgotPassword) {
    return (
      <div className="app-container" style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="info-card">
          <h2 style={{ textAlign: 'center', color: '#FFFFFF', marginTop: '10px' }}>Recupera Password</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '15px' }}>
            Inserisci la tua email. Ti invieremo un link per reimpostare la password.
          </p>
          {authError && <div style={errorBoxStyle}>{authError}</div>}
          {authSuccess && <div style={successBoxStyle}>{authSuccess}</div>}
          
          <form onSubmit={handleForgotPassword} style={formStyle}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              style={inputStyle} 
            />
            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Invio in corso...' : 'Invia Link di Recupero'}
            </button>
            <p style={linkTextStyle}>
              Torna al <span onClick={() => { setIsForgotPassword(false); setAuthError(''); setAuthSuccess(''); }} style={linkStyle}>Login</span>
            </p>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container" style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
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
            
            <div style={{ textAlign: 'right', marginTop: '-5px' }}>
              <span 
                onClick={() => { setIsForgotPassword(true); setAuthError(''); }} 
                style={{ ...linkStyle, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}
              >
                Password dimenticata?
              </span>
            </div>

            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
            <p style={linkTextStyle}>
              Non hai un account? <span onClick={() => { setIsRegistering(true); setAuthError(''); }} style={linkStyle}>Registrati</span>
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
            
            {/* CHECKBOX E LINK PRIVACY */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' }}>
              <input 
                type="checkbox" 
                id="privacy" 
                checked={privacyAccepted} 
                onChange={e => setPrivacyAccepted(e.target.checked)} 
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="privacy" style={{ color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
                Ho letto e accetto l'
                <span 
                  onClick={(e) => {
                    e.preventDefault()
                    setShowPrivacyModal(true)
                  }}
                  style={{ color: '#FFF', textDecoration: 'underline', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Informativa sulla Privacy
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading} style={btnPrimaryStyle}>
              {loading ? 'Registrazione...' : 'Crea Account'}
            </button>
            <p style={linkTextStyle}>
              Hai già un account? <span onClick={() => { setIsRegistering(false); setAuthError(''); }} style={linkStyle}>Accedi</span>
            </p>
          </form>
        )}
      </div>

      {/* MODALE INFORMATIVA PRIVACY */}
      {showPrivacyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#1c1c1e',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflowY: 'auto',
            color: '#FFF'
          }}>
            <h3 style={{ color: 'var(--barber-red)', marginTop: 0 }}>Informativa sulla Privacy</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Ai sensi del Regolamento UE 2016/679 (GDPR), informiamo che i dati raccolti (Nome, Cognome, Età, Telefono, Email) vengono trattati esclusivamente per consentire la gestione delle prenotazioni e dell'account utente presso <strong>31th Street Barber Shop</strong>.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              I dati sono conservati in modo sicuro e non verranno ceduti a terzi. Puoi richiedere la cancellazione del tuo profilo e dei relativi dati in qualsiasi momento all'interno della sezione <em>Profilo</em> dell'applicazione.
            </p>
            <button 
              onClick={() => setShowPrivacyModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'var(--barber-red)',
                color: '#FFF',
                fontWeight: 'bold',
                cursor: 'pointer',
                marginTop: '15px'
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

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

const successBoxStyle = { 
  background: 'rgba(46, 125, 50, 0.2)', 
  border: '1px solid #2e7d32',
  color: '#81c784', 
  padding: '10px 14px', 
  borderRadius: '6px', 
  marginBottom: '15px',
  fontSize: '13px',
  textAlign: 'center'
}

const linkTextStyle = { textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginTop: '10px' }
const linkStyle = { color: '#FFFFFF', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }
