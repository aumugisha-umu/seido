"use client"

import { useEffect, useState } from 'react'
import { logger, logError } from '@/lib/logger'
/**
 * Bouton d'urgence pour forcer l'affichage du debug panel
 * Ce composant très simple s'affiche toujours et permet de débugger
 * même si le debug panel principal a des problèmes
 */
export function EmergencyDebugButton() {
  const [show, setShow] = useState(false)
  const [activated, setActivated] = useState(false)

  useEffect(() => {
    // Afficher le bouton d'urgence après 3 secondes si le debug panel n'est pas ouvert
    const timer = setTimeout(() => {
      const debugPanelVisible = localStorage.getItem('debug-panel-visible') === 'true'
      if (!debugPanelVisible) {
        setShow(true)
      }
    }, 3000)

    // Raccourci d'urgence Alt + Shift + D
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key === 'D') {
        event.preventDefault()
        forceActivateDebugPanel()
        logger.info('🚨 [EMERGENCY] Emergency debug activation triggered')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const forceActivateDebugPanel = () => {
    try {
      // Forcer l'ouverture du debug panel
      localStorage.setItem('debug-panel-visible', 'true')
      
      // Déclencher un événement personnalisé pour notifier les composants
      window.dispatchEvent(new CustomEvent('force-debug-panel-open'))
      
      // Recharger la page si nécessaire
      setActivated(true)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
      
      logger.info('🚨 [EMERGENCY] Debug panel forced open, reloading page...')
    } catch (error) {
      logger.error('❌ [EMERGENCY] Error forcing debug panel:', error)
      alert('🚨 Erreur critique. Rechargez la page manuellement (F5)')
    }
  }

  if (!show || activated) return null

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 9999,
        background: '#dc2626',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
        animation: 'pulse 2s infinite',
        border: '2px solid #fca5a5'
      }}
      onClick={forceActivateDebugPanel}
      title="Bouton d'urgence pour activer le debug panel"
    >
      🚨 DEBUG
      <div style={{ fontSize: '10px', marginTop: '2px', opacity: 0.9 }}>
        Alt+Shift+D
      </div>
    </div>
  )
}

export default EmergencyDebugButton
