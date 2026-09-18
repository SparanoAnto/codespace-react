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
      <div style={containerStyle}>
        <h1 style={{ textAlign: 'center', color: '#FFFFFF', marginTop: '40px' }}>Nuova Password</h1>
        <p style={{ textAlign: 'center', color: '#AAA' }}>Inserisci la tua nuova password per il tuo account.</p>
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
    )
  }

  return (
    <div style={containerStyle}>
      <h1 style={{ textAlign: 'center', color: '#FFFFFF', marginTop: '40px', marginBottom: '0px', fontSize: '36px', letterSpacing: '2px' }}>31Th Street</h1>
      <h4 style={{ textAlign: 'center', color: '#D32F2F', marginTop: '5px', marginBottom: '30px', fontWeight: 'bold' }}>BARBER SHOP</h4>

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
  )
}

const containerStyle = { backgroundColor: '#0A0A0A', color: '#FFF', minHeight: '100vh', padding: '20px', maxWidth: '450px', margin: '0 auto', fontFamily: 'sans-serif' }
const formStyle = { display: 'flex', flexDirection: 'column', gap: '12px' }
const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2A2A2A', backgroundColor: '#1A1A1A', color: '#FFF', boxSizing: 'border-box' }
const btnPrimaryStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#D32F2F', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }
const errorBoxStyle = { background: '#D32F2F', color: '#FFF', padding: '10px', borderRadius: '6px', marginBottom: '15px' }
const linkTextStyle = { textAlign: 'center', color: '#AAA' }
const linkStyle = { color: '#FFFFFF', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }
