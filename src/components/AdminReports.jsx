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
    uniqueClients: 0
  })

  useEffect(() => {
    fetchReportData()
  }, [selectedMonth])

  async function fetchReportData() {
    setLoading(true)

    // Definiamo inizio e fine del mese selezionato
    const [year, month] = selectedMonth.split('-')
    const startOfMonth = new Date(year, month - 1, 1).toISOString()
    const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString()

    try {
      // 1. Recupera tutti gli appuntamenti confermati del mese
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select(`
          id,
          total_price,
          user_id,
          custom_client_name,
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
          uniqueClients: 0
        })
        setLoading(false)
        return
      }

      // 2. Calcola Incasso Totale e Totale Appuntamenti
      const totalAppointments = appointments.length
      const totalRevenue = appointments.reduce((acc, curr) => acc + (parseFloat(curr.total_price) || 0), 0)

      // 3. Calcola il Servizio Più Richiesto
      const serviceCounts = {}
      appointments.forEach(app => {
        app.appointment_services?.forEach(as => {
          const serviceName = as.services?.name || 'Servizio Sconosciuto'
          serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1
        })
      })

      let topService = 'N/D'
      let topServiceCount = 0
      Object.entries(serviceCounts).forEach(([name, count]) => {
        if (count > topServiceCount) {
          topService = name
          topServiceCount = count
        }
      })

      // 4. Calcola il Cliente Top e Clienti Unici
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
        uniqueClients
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          
          {/* Card Incasso */}
          <div className="info-card" style={statCardStyle}>
            <span style={statIconStyle}>💰</span>
            <span style={statLabelStyle}>Incasso Totale</span>
            <strong style={{ ...statValueStyle, color: '#66BB6A' }}>
              €{stats.totalRevenue.toFixed(2)}
            </strong>
          </div>

          {/* Card Appuntamenti */}
          <div className="info-card" style={statCardStyle}>
            <span style={statIconStyle}>📅</span>
            <span style={statLabelStyle}>Appuntamenti</span>
            <strong style={statValueStyle}>{stats.totalAppointments}</strong>
          </div>

          {/* Card Clienti Unici */}
          <div className="info-card" style={statCardStyle}>
            <span style={statIconStyle}>👥</span>
            <span style={statLabelStyle}>Clienti Serviti</span>
            <strong style={statValueStyle}>{stats.uniqueClients}</strong>
          </div>

          {/* Card Servizio Top */}
          <div className="info-card" style={{ ...statCardStyle, gridColumn: 'span 2' }}>
            <span style={statIconStyle}>✂️</span>
            <span style={statLabelStyle}>Servizio Più Richiesto</span>
            <strong style={{ ...statValueStyle, fontSize: '1.1rem', color: '#64B5F6' }}>
              {stats.topService}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ({stats.topServiceCount} prenotazioni)
            </span>
          </div>

          {/* Card Cliente Top */}
          <div className="info-card" style={{ ...statCardStyle, gridColumn: 'span 2' }}>
            <span style={statIconStyle}>👑</span>
            <span style={statLabelStyle}>Cliente più frequente</span>
            <strong style={{ ...statValueStyle, fontSize: '1.1rem', color: 'var(--barber-red)' }}>
              {stats.topClient}
            </strong>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              ({stats.topClientCount} visite questo mese)
            </span>
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
