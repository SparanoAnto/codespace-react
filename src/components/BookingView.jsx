import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function BookingView({ services, barbers, userId, onBookingSuccess }) {
  const [selectedServices, setSelectedServices] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [selectedTime, setSelectedTime] = useState('')
  
  // Stato per salvare gli appuntamenti esistenti del barbiere nella data scelta
  const [existingAppointments, setExistingAppointments] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const toggleService = (service) => {
    if (selectedServices.find(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id))
    } else {
      setSelectedServices([...selectedServices, service])
    }
  }

  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((acc, s) => acc + parseFloat(s.price), 0)

  // Lista di tutti gli orari di apertura del salone
  const allTimeSlots = [
    '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'
  ]

  // Carica gli appuntamenti esistenti da Supabase quando cambiano Data o Operatore
  useEffect(() => {
    if (selectedDate && selectedBarber) {
      fetchExistingAppointments()
    } else {
      setExistingAppointments([])
    }
    setSelectedTime('') // Reset orario ad ogni cambio data/barbiere
  }, [selectedDate, selectedBarber])

  async function fetchExistingAppointments() {
    setLoadingSlots(true)
    
    // Inizio e fine della giornata selezionata
    const startOfDay = new Date(`${selectedDate}T00:00:00`).toISOString()
    const endOfDay = new Date(`${selectedDate}T23:59:59`).toISOString()

    const { data, error } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('barber_id', selectedBarber.id)
      .neq('status', 'cancelled') // Ignora eventuali appuntamenti cancellati
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)

    if (error) {
      console.error('Errore recupero appuntamenti:', error.message)
    } else {
      setExistingAppointments(data || [])
    }
    setLoadingSlots(false)
  }

  // Funzione che verifica se un determinato slot orario è disponibile
  const isSlotAvailable = (slot) => {
    if (!selectedDate || totalDuration === 0) return false

    // Convertiamo l'ipotesi di inizio e fine del nuovo appuntamento in timestamp Unix (ms)
    const proposedStart = new Date(`${selectedDate}T${slot}:00`).getTime()
    const proposedEnd = proposedStart + totalDuration * 60000

    // Verifica la sovrapposizione con ogni appuntamento esistente
    for (const app of existingAppointments) {
      const existingStart = new Date(app.start_time).getTime()
      const existingEnd = new Date(app.end_time).getTime()

      // Due intervalli si sovrappongono se: (StartA < EndB) AND (EndA > StartB)
      if (proposedStart < existingEnd && proposedEnd > existingStart) {
        return false // Slot occupato o non sufficiente per la durata richiesta
      }
    }

    return true // Slot libero
  }

  async function handleConfirmBooking() {
    if (!selectedDate || !selectedBarber || !selectedTime || selectedServices.length === 0) {
      alert("Seleziona tutti i campi obbligatori.")
      return
    }

    // Ultima verifica di sicurezza prima di inserire nel DB
    if (!isSlotAvailable(selectedTime)) {
      alert("L'orario selezionato non è più disponibile. Scegli un altro orario.")
      fetchExistingAppointments()
      return
    }

    const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
    const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000)

    try {
      const { data: appData, error: appError } = await supabase.from('appointments').insert([{
        user_id: userId,
        barber_id: selectedBarber.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        total_price: totalPrice,
        status: 'confirmed'
      }]).select().single()

      if (appError) throw appError

      const joins = selectedServices.map(s => ({
        appointment_id: appData.id,
        service_id: s.id
      }))

      await supabase.from('appointment_services').insert(joins)

      alert("Prenotazione confermata con successo!")
      setSelectedServices([])
      setSelectedDate('')
      setSelectedBarber(null)
      setSelectedTime('')
      onBookingSuccess()
    } catch (err) {
      alert("Errore prenotazione: " + err.message)
    }
  }

  return (
    <div>
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
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={inputStyle} />

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
                            ? '#2A2A2A' // Grigio scuro per orario occupato
                            : isSelected
                            ? '#D32F2F'
                            : '#1A1A1A',
                          color: !available ? '#555' : '#FFF', // Testo disabilitato
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
                Conferma Prenotazione
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
