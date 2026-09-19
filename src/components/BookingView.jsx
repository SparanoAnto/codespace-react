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
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
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

        await supabase.from('appointment_services').delete().eq('appointment_id', editingAppointment.id)

        const joins = selectedServices.map(s => ({
          appointment_id: editingAppointment.id,
          service_id: s.id
        }))
        await supabase.from('appointment_services').insert(joins)

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

        await supabase.from('appointment_services').insert(joins)

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
        <div style={{ backgroundColor: '#2C1212', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #D32F2F', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: '#D32F2F' }}>✏️ Modifica Appuntamento</span>
          <button onClick={onCancelEdit} style={{ background: 'transparent', border: 'none', color: '#AAA', cursor: 'pointer', fontSize: '14px' }}>Annulla Modifica ✖</button>
        </div>
      )}

      {isAdmin && (
        <div style={{ backgroundColor: '#1A2332', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #1A3B8B' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#64B5F6', display: 'block', marginBottom: '6px' }}>
            👑 Prenotazione per conto di un cliente (Opzionale):
          </label>
          <input
            type="text"
            placeholder="Es: Mario Rossi (Telefonata)"
            value={customClientName}
            onChange={(e) => setCustomClientName(e.target.value)}
            style={{ ...inputStyle, backgroundColor: '#0D1B2A', border: '1px solid #1A3B8B' }}
          />
        </div>
      )}

      <h3>✂️ 1. Seleziona Servizi</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {services.map(s => {
          const isSelected = selectedServices.some(item => item.id === s.id)
          return (
            <div key={s.id} onClick={() => toggleService(s)} style={{
              padding: '12px',
              borderRadius: '8px',
              border: isSelected ? '2px solid #D32F2F' : '1px solid #2A2A2A',
              backgroundColor: isSelected ? '#2C1212' : '#1A1A1A',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <strong>{s.name}</strong>
                <div style={{ fontSize: '12px', color: '#AAA' }}>{s.duration_minutes} min</div>
              </div>
              <div style={{ color: '#D32F2F', fontWeight: 'bold' }}>€{parseFloat(s.price).toFixed(2)}</div>
            </div>
          )
        })}
      </div>

      {selectedServices.length > 0 && (
        <>
          <div style={{ padding: '12px', background: '#1A1A1A', borderLeft: '4px solid #D32F2F', borderRadius: '4px', marginBottom: '20px' }}>
            <strong>Riepilogo: {totalDuration} min | €{totalPrice.toFixed(2)}</strong>
          </div>

          <h3>📅 2. Scegli la Data</h3>
          <input 
            type="date" 
            min={todayString}
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)} 
            style={inputStyle} 
          />

          {selectedDate && (
            <>
              <h3 style={{ marginTop: '20px' }}>💈 3. Scegli l'Operatore</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {barbers.map(b => (
                  <button key={b.id} onClick={() => setSelectedBarber(b)} style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '6px',
                    border: selectedBarber?.id === b.id ? '2px solid #1A3B8B' : '1px solid #2A2A2A',
                    backgroundColor: selectedBarber?.id === b.id ? '#10224D' : '#1A1A1A',
                    color: '#FFF',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}>
                    👨‍🦳 {b.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {selectedBarber && (
            <>
              <h3>🕒 4. Seleziona Orario</h3>
              {loadingSlots ? (
                <p style={{ color: '#AAA' }}>Verifica disponibilità orari in corso...</p>
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
                          padding: '10px',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid #D32F2F' : '1px solid #2A2A2A',
                          backgroundColor: !available
                            ? '#2A2A2A'
                            : isSelected
                            ? '#D32F2F'
                            : '#1A1A1A',
                          color: !available ? '#555' : '#FFF',
                          cursor: !available ? 'not-allowed' : 'pointer',
                          textDecoration: !available ? 'line-through' : 'none'
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
                  ...btnPrimaryStyle,
                  backgroundColor: !selectedTime ? '#444' : '#D32F2F',
                  cursor: !selectedTime ? 'not-allowed' : 'pointer'
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

const inputStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #2A2A2A', backgroundColor: '#1A1A1A', color: '#FFF', boxSizing: 'border-box' }
const btnPrimaryStyle = { width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#D32F2F', color: '#FFF', fontWeight: 'bold', cursor: 'pointer' }
