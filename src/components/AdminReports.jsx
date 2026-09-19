import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function AdminReports() {
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const [stats, setStats] = useState({
    totalAppointments: 0,
    totalRevenue: 0,
    topService: 'N/D',
    topServiceCount: 0,
    topClient: 'N/D',
    topClientCount: 0,
    uniqueClients: 0,
    barberRevenue: [], // Dati per incasso operatore
    serviceBreakdown: [] // Dati per lista servizi ed esecuzioni
  })

  useEffect(() => {
    fetchReportData()
  }, [selectedMonth])

  async function fetchReportData() {
    setLoading(true)

    const [year, month] = selectedMonth.split('-')
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

    try {
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select(`
          id,
          total_price,
          user_id,
          custom_client_name,
          barbers ( id, name ),
          profiles ( first_name, last_name, email ),
          appointment_services (
            service_id,
            services ( name )
          )
        `)
        .gte('start_time', startOfMonth)
        .lte('start_time', endOfMonth)
        .neq('status', 'cancelled')

      if (appError) throw appError

      if (!appointments || appointments.length === 0) {
        setStats({
          totalAppointments: 0,
          totalRevenue: 0,
          topService: 'Nessun dato',
          topServiceCount: 0,
          topClient: 'Nessun dato',
          topClientCount: 0,
          uniqueClients: 0,
          barberRevenue: [],
          serviceBreakdown: []
        })
        setLoading(false)
        return
      }

      // 1. Totali generali
      const totalAppointments = appointments.length
      const totalRevenue = appointments.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0)

      // 2. Calcolo Incasso per Operatore
      const barberMap = {}
      appointments.forEach(app => {
        const barberName = app.barbers?.name || 'Non Assegnato'
        const price = parseFloat(app.total_price) || 0

        if (!barberMap[barberName]) {
          barberMap[barberName] = { count: 0, total: 0 }
        }
        barberMap[barberName].count += 1
        barberMap[barberName].total += price
      })

      const barberRevenue = Object.entries(barberMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.total - a.total)

      // 3. Calcolo Quantità e Dettaglio Servizi
      const serviceMap = {}
      appointments.forEach(app => {
        app.appointment_services?.forEach(as => {
          const serviceName = as.services?.name || 'Servizio Sconosciuto'
          serviceMap[serviceName] = (serviceMap[serviceName] || 0) + 1
        })
      })

      const serviceBreakdown = Object.entries(serviceMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

      // Servizio Top
      const topService = serviceBreakdown[0]?.name || 'N/D'
      const topServiceCount = serviceBreakdown[0]?.count || 0

      // 4. Calcolo Cliente Top e Clienti Unici
      const clientCounts = {}
      appointments.forEach(app => {
        let clientName = ''
        if (app.custom_client_name) {
          clientName = `${app.custom_client_name} (Manuale)`
        } else if (app.profiles) {
          clientName = `${app.profiles.first_name || ''} ${app.profiles.last_name || ''}`.trim() || app.profiles.email
        } else {
          clientName = 'Cliente Anonimo'
        }

        clientCounts[clientName] = (clientCounts[clientName] || 0) + 1
      })

      let topClient = 'N/D'
      let topClientCount = 0
      Object.entries(clientCounts).forEach(([name, count]) => {
        if (count > topClientCount) {
          topClient = name
          topClientCount = count
        }
      })

      const uniqueClients = Object.keys(clientCounts).length

      setStats({
        totalAppointments,
        totalRevenue,
        topService,
        topServiceCount,
        topClient,
        topClientCount,
        uniqueClients,
        barberRevenue,
        serviceBreakdown
      })

    } catch (err) {
      console.error('Errore nel caricamento del report:', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: '20px' }}>
      <h2 className="section-title">📊 Report & Statistiche</h2>

      {/* Selettore Mese */}
      <div className="info-card" style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
          Seleziona Mese:
        </label>
        <input 
          type="month" 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={inputStyle}
        />
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Caricamento dati in corso...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Principali */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div className="info-card" style={statCardStyle}>
              <span style={statIconStyle}>💰</span>
              <span style={statLabelStyle}>Incasso Totale</span>
              <strong style={{ ...statValueStyle, color: '#66BB6A' }}>
                €{stats.totalRevenue.toFixed(2)}
              </strong>
            </div>

            <div className="info-card" style={statCardStyle}>
              <span style={statIconStyle}>📅</span>
              <span style={statLabelStyle}>Appuntamenti</span>
              <strong style={statValueStyle}>{stats.totalAppointments}</strong>
            </div>

            <div className="info-card" style={statCardStyle}>
              <span style={statIconStyle}>👥</span>
              <span style={statLabelStyle}>Clienti Serviti</span>
              <strong style={statValueStyle}>{stats.uniqueClients}</strong>
            </div>

            <div className="info-card" style={statCardStyle}>
              <span style={statIconStyle}>👑</span>
              <span style={statLabelStyle}>Cliente Top</span>
              <strong style={{ ...statValueStyle, fontSize: '1.1rem', color: 'var(--barber-red)' }}>
                {stats.topClient}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                ({stats.topClientCount} visite)
              </span>
            </div>
          </div>

          {/* NUOVA SEZIONE: Incassi per Operatore */}
          <div className="info-card">
            <h3 style={sectionHeaderStyle}>💈 Produttività Operatori</h3>
            {stats.barberRevenue.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nessun dato per questo mese.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.barberRevenue.map((barber) => (
                  <div key={barber.name} style={listRowStyle}>
                    <div>
                      <strong style={{ color: '#FFF', display: 'block' }}>{barber.name}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {barber.count} {barber.count === 1 ? 'appuntamento' : 'appuntamenti'}
                      </span>
                    </div>
                    <strong style={{ color: '#66BB6A', fontSize: '1.1rem' }}>
                      €{barber.total.toFixed(2)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NUOVA SEZIONE: Quantità Servizi Effettuati */}
          <div className="info-card">
            <h3 style={sectionHeaderStyle}>✂️ Servizi Effettuati</h3>
            {stats.serviceBreakdown.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nessun servizio erogato questo mese.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {stats.serviceBreakdown.map((service) => (
                  <div key={service.name} style={listRowStyle}>
                    <span style={{ color: '#FFF' }}>{service.name}</span>
                    <strong style={{ color: '#64B5F6', fontSize: '1rem' }}>
                      {service.count} {service.count === 1 ? 'volta' : 'volte'}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'rgba(24, 24, 24, 0.85)',
  color: '#FFF',
  fontSize: '14px',
  outline: 'none'
}

const statCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  padding: '16px 12px'
}

const statIconStyle = {
  fontSize: '24px',
  marginBottom: '6px'
}

const statLabelStyle = {
  fontSize: '12px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px'
}

const statValueStyle = {
  fontSize: '1.4rem',
  color: '#FFFFFF'
}

const sectionHeaderStyle = {
  fontSize: '1rem',
  color: '#FFF',
  marginTop: 0,
  marginBottom: '15px',
  borderBottom: '1px solid var(--border-color)',
  paddingBottom: '8px'
}

const listRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '8px 0',
  borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
}
