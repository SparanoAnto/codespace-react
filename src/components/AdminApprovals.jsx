import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AdminApprovals({ onApprovalChange }) {
  const [pendingUsers, setPendingUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPendingUsers()
  }, [])

  async function fetchPendingUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)

    if (error) {
      console.error('Errore recupero utenti:', error.message)
    } else {
      setPendingUsers(data || [])
    }
    setLoading(false)
  }

  async function approveUser(userId) {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId)

    if (error) {
      alert('Errore nell\'approvazione: ' + error.message)
    } else {
      // Rimuove l'utente approvato dalla lista locale
      setPendingUsers(prev => prev.filter(user => user.id !== userId))
      // Notifica ad App.jsx di aggiornare il contatore del badge
      if (onApprovalChange) onApprovalChange()
    }
  }

  if (loading) return <p style={{ color: '#AAA' }}>Caricamento richieste...</p>

  return (
    <div style={{ marginTop: '20px' }}>
      <h4 style={{ borderBottom: '1px solid #2A2A2A', paddingBottom: '8px' }}>
        Richieste Clienti in Attesa ({pendingUsers.length})
      </h4>

      {pendingUsers.length === 0 ? (
        <p style={{ color: '#888' }}>Nessuna richiesta da approvare.</p>
      ) : (
        pendingUsers.map(user => (
          <div
            key={user.id}
            style={{
              backgroundColor: '#1E1E1E',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                {user.first_name} {user.last_name}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: '#AAA' }}>{user.email}</p>
              {user.phone && (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#888' }}>
                  📞 {user.phone}
                </p>
              )}
            </div>
            <button
              onClick={() => approveUser(user.id)}
              style={{
                backgroundColor: '#2E7D32',
                color: '#FFF',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Approva
            </button>
          </div>
        ))
      )}
    </div>
  )
}
