import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // Recupera i servizi
      const { data: servicesData } = await supabase.from('services').select('*')
      // Recupera i barbieri
      const { data: barbersData } = await supabase.from('barbers').select('*')

      if (servicesData) setServices(servicesData)
      if (barbersData) setBarbers(barbersData)
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>Caricamento dati dal salone...</div>
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Barber Shop - Prenotazioni</h1>

      <h2>1. Seleziona il Servizio</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {services.map((service) => (
          <li key={service.id} style={{ border: '1px solid #ccc', padding: '12px', borderRadius: '8px', marginBottom: '10px' }}>
            <strong>{service.name}</strong> - {service.duration_minutes} min
            <div style={{ color: '#2b8a3e', fontWeight: 'bold', marginTop: '4px' }}>€{service.price}</div>
          </li>
        ))}
      </ul>

      <h2>2. Scegli l'Operatore</h2>
      <div style={{ display: 'flex', gap: '10px' }}>
        {barbers.map((barber) => (
          <div key={barber.id} style={{ border: '1px solid #0070f3', padding: '10px 20px', borderRadius: '6px', background: '#e6f0ff' }}>
            👨‍🦱 {barber.name}
          </div>
        ))}
      </div>
    </div>
  )
}
