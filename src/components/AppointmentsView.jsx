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

    // Query corretta per la tua struttura SQL (con la tabella ponte appointment_services)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        status,
        total_price,
        barbers ( name ),
        appointment_services (
          services ( name, price )
        )
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('Errore Supabase:', error.message)
      setErrorMsg(error.message)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  // Funzione di supporto per formattare la data da timestamp ISO
  function formatDateTime(isoString) {
    if (!isoString) return { date: 'N/D', time: '' }
    const dt = new Date(isoString)
    const date = dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    return { date, time }
  }

  if (loading) {
    return <p style={{ color: '#AAA' }}>Caricamento prenotazioni...</p>
  }

  if (errorMsg) {
    return (
      <div>
        <h3>📅 Le Tue Prenotazioni</h3>
        <p style={{ color: '#D32F2F', fontSize: '14px' }}>Errore caricamento: {errorMsg}</p>
      </div>
    )
  }

  return (
    <div>
      <h3>📅 Le Tue Prenotazioni</h3>
      {appointments.length === 0 ? (
        <p style={{ color: '#888' }}>Non hai ancora effettuato nessuna prenotazione.</p>
      ) : (
        appointments.map((item) => {
          const { date, time } = formatDateTime(item.start_time)
          
          // Estrae i nomi dei servizi prenotati
          const serviceList = item.appointment_services
            ?.map(as => as.services?.name)
            .filter(Boolean)
            .join(', ') || 'Servizio Generico'

          return (
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
                  {serviceList}
                </span>
                <span style={{ color: '#D32F2F', fontWeight: 'bold' }}>
                  {item.total_price ? `${item.total_price}€` : ''}
                </span>
              </div>
              <p style={{ margin: '3px 0', fontSize: '13px', color: '#AAA' }}>
                💈 Barbiere: {item.barbers?.name || 'Non specificato'}
              </p>
              <p style={{ margin: '3px 0', fontSize: '13px', color: '#AAA' }}>
                📅 Data: {date} ore {time}
              </p>
              {item.status && (
                <p style={{ margin: '3px 0', fontSize: '11px', color: item.status === 'confirmed' ? '#4CAF50' : '#FFA726' }}>
                  Stato: {item.status.toUpperCase()}
                </p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
