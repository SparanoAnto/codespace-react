import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AppointmentsView({ userId, isAdmin, onEditAppointment }) {
  const [appointments, setAppointments] = useState([])
  const [barbers, setBarbers] = useState([])
  const [selectedBarberId, setSelectedBarberId] = useState('all')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (isAdmin) {
      fetchBarbers()
    }
  }, [isAdmin])

  useEffect(() => {
    if (userId) {
      fetchAppointments()
    } else {
      setLoading(false)
    }
  }, [userId, isAdmin, selectedDate, selectedBarberId])

  async function fetchBarbers() {
    const { data } = await supabase.from('barbers').select('id, name').eq('is_active', true)
    if (data) setBarbers(data)
  }

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

        if (selectedBarberId !== 'all') {
          query = query.eq('barber_id', selectedBarberId)
        }
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

  /**
   * Helper per verificare le regole di modifica/annullamento
   */
  function checkAppointmentPermissions(startTime) {
    if (isAdmin) return { canModify: true, canCancel: true, reason: '' }

    const now = new Date().getTime()
    const start = new Date(startTime).getTime()
    const diffMs = start - now
    const fifteenMinutesMs = 15 * 60 * 1000

    if (diffMs <= 0) {
      return {
        canModify: false,
        canCancel: false,
        reason: 'L\'appuntamento è già passato.'
      }
    }

    if (diffMs < fifteenMinutesMs) {
      return {
        canModify: true,
        canCancel: false,
        reason: 'Impossibile annullare a meno di 15 minuti dall\'orario.'
      }
    }

    return { canModify: true, canCancel: true, reason: '' }
  }

  async function handleCancelAppointment(item) {
    const { canCancel, reason } = checkAppointmentPermissions(item.start_time)

    if (!canCancel) {
      alert(reason || "Non hai i permessi per annullare questo appuntamento.")
      return
    }

    const confirmCancel = window.confirm("Sei sicuro di voler annullare questo appuntamento?")
    if (!confirmCancel) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', item.id)

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
      <div style={{ marginBottom: '15px' }}>
        <h3 className="section-title">
          {isAdmin ? 'Agenda Salone Centralizzata' : 'Le Tue Prenotazioni'}
        </h3>
      </div>

      {isAdmin && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Data Agenda:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={filterInputStyle}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Operatore:
            </label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              style={filterInputStyle}
            >
              <option value="all">💈 Tutti gli Operatori</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Caricamento prenotazioni...</p>
      ) : errorMsg ? (
        <p style={{ color: 'var(--barber-red)', fontSize: '14px' }}>Errore caricamento: {errorMsg}</p>
      ) : appointments.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {isAdmin ? 'Nessun appuntamento attivo per i filtri selezionati.' : 'Non hai ancora effettuato nessuna prenotazione attiva.'}
        </p>
      ) : (
        appointments.map((item) => {
          const { date, time } = formatDateTime(item.start_time)
          const { canModify, canCancel, reason } = checkAppointmentPermissions(item.start_time)
          const isPast = new Date(item.start_time) <= new Date()

          const serviceList = item.appointment_services
            ?.map((as) => as.services?.name)
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
              className="info-card"
              style={{
                marginBottom: '12px',
                borderLeft: `4px solid ${isAdmin ? 'var(--barber-red)' : 'var(--barber-blue)'}`,
                padding: '16px',
                opacity: isPast && !isAdmin ? 0.75 : 1
              }}
            >
              {isAdmin && (
                <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: '#FFF', fontSize: '0.95rem' }}>
                  👤 {clientName} <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal' }}>{clientPhone}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#ffffff' }}>
                  {serviceList}
                </span>
                <span style={{ color: 'var(--barber-red)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                  {item.total_price ? `€${parseFloat(item.total_price).toFixed(2)}` : ''}
                </span>
              </div>

              <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                💈 Barbiere: <strong style={{ color: '#FFF' }}>{item.barbers?.name || 'Non specificato'}</strong>
              </p>
              <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                📅 Data: <strong style={{ color: '#FFF' }}>{date}</strong> ore <strong style={{ color: '#FFF' }}>{time}</strong>
                {isPast && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#888', fontWeight: 'bold' }}>
                    (Scaduto)
                  </span>
                )}
              </p>

              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                {/* Pulsante Modifica */}
                <button
                  disabled={!canModify}
                  onClick={() => onEditAppointment(item)}
                  title={!canModify ? reason : ''}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    backgroundColor: !canModify ? '#333' : 'var(--barber-blue)',
                    color: !canModify ? '#777' : '#FFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: !canModify ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseDown={(e) => canModify && (e.currentTarget.style.opacity = '0.8')}
                  onMouseUp={(e) => canModify && (e.currentTarget.style.opacity = '1')}
                >
                  ✏️ Modifica {isAdmin && isPast ? '(Admin)' : ''}
                </button>

                {/* Pulsante Annulla */}
                <button
                  disabled={!canCancel}
                  onClick={() => handleCancelAppointment(item)}
                  title={!canCancel ? reason : ''}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    backgroundColor: 'transparent',
                    color: !canCancel ? '#555' : 'var(--barber-red)',
                    border: !canCancel ? '1px solid #444' : '1px solid var(--barber-red)',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: !canCancel ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseDown={(e) => canCancel && (e.currentTarget.style.opacity = '0.8')}
                  onMouseUp={(e) => canCancel && (e.currentTarget.style.opacity = '1')}
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

const filterInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'rgba(20, 20, 20, 0.9)',
  color: '#FFF',
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: '13px'
}
