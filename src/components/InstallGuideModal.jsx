import React, { useState, useEffect } from 'react'

export function InstallGuideModal() {
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isIOS, setIsIOS] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 1. Rileva se l'app è già stata installata ed è aperta dalla schermata Home
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    setIsStandalone(isPWA)

    // 2. Rileva se il dispositivo è un iPhone/iPad
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))

    // 3. Intercetta il prompt di installazione nativo per Android/Chrome
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  // Se l'app è già aperta come PWA installata o se l'utente chiude l'avviso, non mostra nulla
  if (isStandalone || dismissed) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '15px',
      right: '15px',
      backgroundColor: '#1c1c1e',
      border: '2px solid var(--barber-red)',
      borderRadius: '12px',
      padding: '16px',
      zIndex: 9999,
      boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
      color: '#FFF'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h4 style={{ margin: 0, color: 'var(--barber-red)', fontSize: '15px' }}>📲 Installa l'App del Salone</h4>
        <span 
          onClick={() => setDismissed(true)} 
          style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)', padding: '0 4px' }}
        >
          ✕
        </span>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 12px 0', lineHeight: '1.4' }}>
        Per la migliore esperienza e per prenotare in un click, aggiungi l'app allo schermo del tuo telefono!
      </p>

      {/* Istruzioni specifiche per iOS (iPhone/iPad) */}
      {isIOS ? (
        <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.5' }}>
          1. Tocca il tasto <strong>Condividi</strong> ⎋ (in basso al centro su Safari).<br />
          2. Scorri in basso e seleziona <strong>"Aggiungi alla schermata Home"</strong> ➕.
        </div>
      ) : (
        /* Pulsante o istruzioni per Android / Chrome */
        deferredPrompt ? (
          <button 
            onClick={handleInstallAndroid}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--barber-red)',
              color: '#FFF',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Installa Ora
          </button>
        ) : (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', fontSize: '12px', lineHeight: '1.5' }}>
            Tocca i <strong>3 pallini in alto a destra</strong> e seleziona <strong>"Aggiungi a schermata Home"</strong> o <strong>"Installa app"</strong>.
          </div>
        )
      )}
    </div>
  )
}
