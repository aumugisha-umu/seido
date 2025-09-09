"use client"

import { useConnectionStatus } from '@/lib/connection-manager'
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

export function ConnectionStatus() {
  const { isOnline, forceReconnection } = useConnectionStatus()
  const [showAlert, setShowAlert] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShowAlert(true)
    } else {
      // Masquer l'alerte après 2 secondes quand la connexion revient
      const timeout = setTimeout(() => setShowAlert(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [isOnline])

  const handleReconnect = async () => {
    setIsReconnecting(true)
    forceReconnection()
    
    // Arrêter l'animation après 3 secondes
    setTimeout(() => setIsReconnecting(false), 3000)
  }

  if (!showAlert) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Alert 
        variant={isOnline ? "default" : "destructive"} 
        className="shadow-lg border-2"
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <div className="flex-1">
            <AlertDescription className="text-sm">
              {isOnline ? (
                "Connexion rétablie"
              ) : (
                <>
                  Connexion interrompue. 
                  {!isReconnecting && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-1 text-sm underline"
                      onClick={handleReconnect}
                    >
                      Reconnecter
                    </Button>
                  )}
                </>
              )}
            </AlertDescription>
          </div>
          {isReconnecting && (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          )}
        </div>
      </Alert>
    </div>
  )
}

/**
 * Composant minimaliste d'indicateur de connexion pour la barre de navigation
 */
export function ConnectionIndicator() {
  const { isOnline } = useConnectionStatus()

  return (
    <div className="flex items-center gap-1">
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" title="Connecté" />
      ) : (
        <WifiOff className="h-4 w-4 text-red-500 animate-pulse" title="Déconnecté" />
      )}
    </div>
  )
}
