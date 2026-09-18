import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AppointmentsView({ userId }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (userId) {
      fetchAppointments()
    } else {
      setLoading(false)
    }
  }, [userId])

  async function fetchAppointments() {
    setLoading(true)
    setErrorMsg(null)

    // Tentativo con JOIN sulle tabelle correlate
    const { data, error } = await supabase
      .from('appointments')
      .select('*, services(name, price), barbers(name)')
      .eq('user_id', userId)
      .order('appointment_date', { ascending: false })

    if (error) {
      console.error('Errore fetch appuntamenti:', error.message)
      setErrorMsg(error.message)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  if (loading) {
    return <p style={{ color: '#AAA' }}>Caricamento prenotazioni...</p>
  }

  if (errorMsg) {
    return (
      <div>
        <h3>📅 Le Tue Prenotazioni</h3>
        <p style={{ color: '#D32F2F', fontSize: '14px' }}>
          Errore nel recupero dati: {errorMsg}
        </p>
        <p style={{ color: '#888', fontSize: '12px' }}>
          Verifica che su Supabase le colonne user_id, service_id e barber_id siano Foreign Keys valide.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3>📅 Le Tue Prenotazioni</h3>
      {appointments.length === 0 ? (
        <p style={{ color: '#888' }}>Non hai ancora effettuato nessuna prenotazione.</p>
      ) : (
        appointments.map((item) => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#1E1E1E',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '10px',
              borderLeft: '4px solid #1A3B8B'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {item.services?.name || 'Servizio Prenotato'}
              </span>
              {item.services?.price && (
                <span style={{ color: '#D32F2F', fontWeight: 'bold' }}>
                  {item.services.price}€
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0', fontSize: '13px', color: '#AAA' }}>
              💈 Barbiere: {item.barbers?.name || 'Non specificato'}
            </p>
            <p style={{ margin: '3px 0', fontSize: '13px', color: '#AAA' }}>
              📅 Data: {item.appointment_date || 'N/D'} {item.appointment_time ? `- ${item.appointment_time}` : ''}
            </p>
          </div>
        ))
      )}
    </div>
  )
}
