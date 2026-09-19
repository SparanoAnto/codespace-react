import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function BookingView({ services, barbers, userId, isAdmin, editingAppointment, onBookingSuccess, onCancelEdit }) {
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  const [customClientName, setCustomClientName] = useState('')

  const [existingAppointments, setExistingAppointments] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const todayString = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (editingAppointment) {
      const currentServiceIds = editingAppointment.appointment_services?.map(as => as.service_id || as.services?.id)
      const initialServices = services.filter(s => currentServiceIds?.includes(s.id))
      setSelectedServices(initialServices)

      if (editingAppointment.start_time) {
        const dt = new Date(editingAppointment.start_time)
        const dateStr = dt.toISOString().split('T')[0]
        const hours = String(dt.getHours()).padStart(2, '0')
        const minutes = String(dt.getMinutes()).padStart(2, '0')
        setSelectedDate(dateStr)
        setSelectedTime(`${hours}:${minutes}`)
      }

      const barber = barbers.find(b => b.id === editingAppointment.barber_id)
      if (barber) setSelectedBarber(barber)

      if (editingAppointment.custom_client_name) {
        setCustomClientName(editingAppointment.custom_client_name)
      }
    }
  }, [editingAppointment, services, barbers])

  const toggleService = (service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id))
    } else {
      setSelectedServices([...selectedServices, service])
    }
  }

  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((acc, s) => acc + parseFloat(s.price), 0)

  const allTimeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'
    '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
  ]

  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchExistingAppointments()
    } else {
      setExistingAppointments([])
    }
  }, [selectedDate, selectedBarber])

  async function fetchExistingAppointments() {
    setLoadingSlots(true)
    const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString()
    const endOfDay = new Date(`${selectedDate}T23:59:59`).toISOString()

    let query = supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('barber_id', selectedBarber.id)
      .neq('status', 'cancelled')
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)

    if (editingAppointment) {
      query = query.neq('id', editingAppointment.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore recupero appuntamenti:', error.message)
    } else {
      setExistingAppointments(data || [])
    }
    setLoadingSlots(false)
  }

  const isSlotAvailable = (slot) => {
    if (!selectedDate || totalDuration === 0) return false

    const now = new Date()
    const proposedStart = new Date(`${selectedDate}T${slot}:00`)

    if (proposedStart < now) return false

    const proposedStartMs = proposedStart.getTime()
    const proposedEndMs = proposedStartMs + totalDuration * 60000

    for (const app of existingAppointments) {
      const existingStart = new Date(app.start_time).getTime()
      const existingEnd = new Date(app.end_time).getTime()

      if (proposedStartMs < existingEnd && proposedEndMs > existingStart) {
        return false
      }
    }

    return true
  }

  async function handleConfirmBooking() {
    if (!selectedDate || !selectedBarber || !selectedTime || selectedServices.length === 0) {
      alert("Seleziona tutti i campi obbligatori.")
      return
    }

    if (!isSlotAvailable(selectedTime)) {
      alert("L'orario selezionato non è disponibile per la durata dei servizi scelti. Seleziona un altro orario.")
      fetchExistingAppointments()
      return
    }

    const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000)

    try {
      if (editingAppointment) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            barber_id: selectedBarber.id,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            total_price: totalPrice,
            custom_client_name: isAdmin && customClientName.trim() !== '' ? customClientName.trim() : editingAppointment.custom_client_name
          })
          .eq('id', editingAppointment.id)

        if (updateError) throw updateError

        const { error: delError } = await supabase
          .from('appointment_services')
          .delete()
          .eq('appointment_id', editingAppointment.id)

        if (delError) throw delError

        const joins = selectedServices.map(s => ({
          appointment_id: editingAppointment.id,
          service_id: s.id
        }))

        const { error: insertServiceError } = await supabase
          .from('appointment_services')
          .insert(joins)

        if (insertServiceError) throw insertServiceError

        alert("Appuntamento modificato con successo!")
      } else {
        const newAppointment = {
          user_id: userId,
          barber_id: selectedBarber.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          total_price: totalPrice,
          status: 'confirmed'
        }

        if (isAdmin && customClientName.trim() !== '') {
          newAppointment.custom_client_name = customClientName.trim()
        }

        const { data: appData, error: appError } = await supabase
          .from('appointments')
          .insert([newAppointment])
          .select()
          .single()

        if (appError) throw appError

        const joins = selectedServices.map(s => ({
          appointment_id: appData.id,
          service_id: s.id
        }))

        const { error: joinError } = await supabase
          .from('appointment_services')
          .insert(joins)

        if (joinError) throw joinError

        alert("Prenotazione confermata con successo!")
      }

      setSelectedServices([])
      setSelectedDate('')
      setSelectedBarber(null)
      setSelectedTime('')
      setCustomClientName('')
      onBookingSuccess()
    } catch (err) {
      alert("Errore salvataggio: " + err.message)
    }
  }

  return (
    <div>
      {editingAppointment && (
        <div style={{ backgroundColor: 'rgba(211, 47, 47, 0.15)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--barber-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--barber-red)', fontSize: '0.9rem' }}>✏️ Modifica Appuntamento</span>
          <button onClick={onCancelEdit} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', textDecoration: 'underline' }}>Annulla ✖</button>
        </div>
      )}

      {isAdmin && (
        <div className="info-card" style={{ marginBottom: '20px', borderColor: 'var(--barber-blue)' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64B5F6', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            👑 Prenotazione per conto di un cliente (Opzionale):
          </label>
          <input
            type="text"
            placeholder="Es: Mario Rossi (Telefonata)"
            value={customClientName}
            onChange={(e) => setCustomClientName(e.target.value)}
            style={{ ...inputStyle, backgroundColor: 'rgba(15, 15, 15, 0.9)', border: '1px solid var(--border-color)' }}
          />
        </div>
      )}

      <h3 className="section-title">1. Seleziona Servizi</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {services.map(s => {
          const isSelected = selectedServices.some(item => item.id === s.id)
          return (
            <div key={s.id} onClick={() => toggleService(s)} style={{
              padding: '14px 16px',
              borderRadius: '8px',
              border: isSelected ? '1px solid var(--barber-red)' : '1px solid var(--border-color)',
              backgroundColor: isSelected ? 'rgba(211, 47, 47, 0.15)' : 'rgba(24, 24, 24, 0.85)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: isSelected ? '0 0 12px rgba(211, 47, 47, 0.2)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              <div>
                <strong style={{ fontSize: '1rem', color: '#ffffff' }}>{s.name}</strong>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>⏱ {s.duration_minutes} min</div>
              </div>
              <div style={{ color: 'var(--barber-red)', fontWeight: '800', fontSize: '1.1rem' }}>€{parseFloat(s.price).toFixed(2)}</div>
            </div>
          )
        })}
      </div>

      {selectedServices.length > 0 && (
        <>
          <div style={{ padding: '12px 16px', background: 'rgba(30, 30, 30, 0.9)', borderLeft: '4px solid var(--barber-red)', borderRadius: '6px', marginBottom: '25px' }}>
            <strong style={{ color: '#FFF' }}>Riepilogo: {totalDuration} min | €{totalPrice.toFixed(2)}</strong>
          </div>

          <h3 className="section-title">2. Scegli la Data</h3>
          <input 
            type="date" 
            min={todayString}
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
            style={{ ...inputStyle, marginBottom: '25px' }} 
          />

          {selectedDate && (
            <>
              <h3 className="section-title">3. Scegli l'Operatore</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '25px' }}>
                {barbers.map(b => (
                  <button key={b.id} onClick={() => setSelectedBarber(b)} style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: selectedBarber?.id === b.id ? '2px solid var(--barber-blue)' : '1px solid var(--border-color)',
                    backgroundColor: selectedBarber?.id === b.id ? 'rgba(25, 118, 210, 0.2)' : 'rgba(24, 24, 24, 0.85)',
                    color: '#FFF',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}>
                    💈 {b.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedBarber && (
            <>
              <h3 className="section-title">4. Seleziona Orario</h3>
              {loadingSlots ? (
                <p style={{ color: 'var(--text-muted)' }}>Verifica disponibilità orari in corso...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '25px' }}>
                  {allTimeSlots.map(slot => {
                    const available = isSlotAvailable(slot)
                    const isSelected = selectedTime === slot

                    return (
                      <button
                        key={slot}
                        disabled={!available}
                        onClick={() => setSelectedTime(slot)}
                        style={{
                          padding: '12px 8px',
                          borderRadius: '6px',
                          border: isSelected ? '1px solid var(--barber-red)' : '1px solid var(--border-color)',
                          backgroundColor: !available
                            ? '#1a1a1a'
                            : isSelected
                            ? 'var(--barber-red)'
                            : 'rgba(30, 30, 30, 0.8)',
                          color: !available ? '#444' : '#FFF',
                          cursor: !available ? 'not-allowed' : 'pointer',
                          textDecoration: !available ? 'line-through' : 'none',
                          fontWeight: isSelected ? 'bold' : '500',
                          fontSize: '0.9rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              )}

              <button 
                onClick={handleConfirmBooking} 
                disabled={!selectedTime}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !selectedTime ? '#333' : 'var(--barber-red)',
                  color: !selectedTime ? '#777' : '#FFF',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  letterSpacing: '0.5px',
                  cursor: !selectedTime ? 'not-allowed' : 'pointer',
                  boxShadow: !selectedTime ? 'none' : '0 4px 15px rgba(211, 47, 47, 0.4)',
                  transition: 'all 0.2s ease'
                }}
              >
                {editingAppointment ? "Salva Modifiche Appuntamento" : "Conferma Prenotazione"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

const inputStyle = { 
  width: '100%', 
  padding: '12px 14px', 
  borderRadius: '6px', 
  border: '1px solid var(--border-color)', 
  backgroundColor: 'rgba(24, 24, 24, 0.85)', 
  color: '#FFF', 
  boxSizing: 'border-box',
  outline: 'none',
  fontSize: '14px'
}
