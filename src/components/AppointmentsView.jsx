import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AppointmentsView({ userId, isAdmin, onEditAppointment }) {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (userId) {
      fetchAppointments()
    } else {
      setLoading(false)
    }
  }, [userId, isAdmin, selectedDate])

  async function fetchAppointments() {
    setLoading(true)
    setErrorMsg(null)

    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          total_price,
          custom_client_name,
          barber_id,
          user_id,
          profiles:user_id ( first_name, last_name, phone ),
          barbers ( id, name ),
          appointment_services (
            service_id,
            services ( id, name, price, duration_minutes )
          )
        `)
        .neq('status', 'cancelled')

      if (isAdmin) {
        const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString()
        const endOfDay = new Date(`${selectedDate}T23:59:59`).toISOString()

        query = query
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay)
          .order('start_time', { ascending: true })
      } else {
        query = query
          .eq('user_id', userId)
          .order('start_time', { ascending: false })
      }

      const { data, error } = await query
      if (error) throw error
      setAppointments(data || [])
    } catch (err) {
      console.error('Errore Supabase:', err.message)
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancelAppointment(appointmentId) {
    const confirmCancel = window.confirm("Sei sicuro di voler annullare questo appuntamento?")
    if (!confirmCancel) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId)

      if (error) throw error

      alert("Appuntamento annullato con successo!")
      fetchAppointments()
    } catch (err) {
      alert("Errore durante l'annullamento: " + err.message)
    }
  }

  function formatDateTime(isoString) {
    if (!isoString) return { date: 'N/D', time: '' }
    const dt = new Date(isoString)
    const date = dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const time = dt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    return { date, time }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>
          {isAdmin ? '📖 Agenda Salone' : '📅 Le Tue Prenotazioni'}
        </h3>
      </div>

      {isAdmin && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', color: '#AAA', display: 'block', marginBottom: '5px' }}>
            Seleziona Data Agenda:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #2A2A2A',
              backgroundColor: '#1A1A1A',
              color: '#FFF',
              boxSizing: 'border-box'
            }}
          />
        </div>
      )}

      {loading ? (
        <p style={{ color: '#AAA' }}>Caricamento prenotazioni...</p>
      ) : errorMsg ? (
        <p style={{ color: '#D32F2F', fontSize: '14px' }}>Errore caricamento: {errorMsg}</p>
      ) : appointments.length === 0 ? (
        <p style={{ color: '#888' }}>
          {isAdmin ? 'Nessun appuntamento attivo per questa data.' : 'Non hai ancora effettuato nessuna prenotazione attiva.'}
        </p>
      ) : (
        appointments.map((item) => {
          const { date, time } = formatDateTime(item.start_time)

          const serviceList = item.appointment_services
            ?.map(as => as.services?.name)
            .filter(Boolean)
            .join(', ') || 'Servizio Generico'

          const clientName = item.custom_client_name 
            ? item.custom_client_name 
            : item.profiles 
            ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim() 
            : 'Cliente'

          const clientPhone = item.profiles?.phone ? ` 📞 ${item.profiles.phone}` : ''

          return (
            <div
              key={item.id}
              style={{
                backgroundColor: '#1E1E1E',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '10px',
                borderLeft: `4px solid ${isAdmin ? '#D32F2F' : '#1A3B8B'}`
              }}
            >
              {isAdmin && (
                <div style={{ marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #2A2A2A', fontWeight: 'bold', color: '#FFF' }}>
                  👤 {clientName} <span style={{ fontSize: '12px', color: '#AAA' }}>{clientPhone}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {serviceList}
                </span>
                <span style={{ color: '#D32F2F', fontWeight: 'bold' }}>
                  {item.total_price ? `€${parseFloat(item.total_price).toFixed(2)}` : ''}
                </span>
              </div>
              <p style={{ margin: '3px 0', fontSize: '13px', color: '#AAA' }}>
                💈 Barbiere: {item.barbers?.name || 'Non specificato'}
              </p>
              <p style={{ margin: '3px 0', fontSize: '13px', color: '#AAA' }}>
                📅 Data: {date} ore {time}
              </p>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  onClick={() => onEditAppointment(item)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#1A3B8B',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Modifica / Integra
                </button>
                <button
                  onClick={() => handleCancelAppointment(item.id)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'transparent',
                    color: '#D32F2F',
                    border: '1px solid #D32F2F',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  ❌ Annulla
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
