"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { pushManager } from "@/lib/push-notification-manager"
import { cn } from "@/lib/utils"

interface PushNotificationToggleProps {
  userId: string
  className?: string
}

export function PushNotificationToggle({ userId, className }: PushNotificationToggleProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  // Check support and subscription status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true)

      // Check if push notifications are supported
      const supported = pushManager.isSupported()
      setIsSupported(supported)

      if (!supported) {
        setIsLoading(false)
        return
      }

      // Check permission status
      const currentPermission = pushManager.getPermissionStatus()
      setPermission(currentPermission)

      // Check if user is subscribed
      const subscribed = await pushManager.isSubscribed()
      setIsEnabled(subscribed)

      setIsLoading(false)
    }

    checkStatus()
  }, [])

  const handleToggle = async (enabled: boolean) => {
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      if (enabled) {
        // Enable push notifications
        await pushManager.subscribe(userId)
        setIsEnabled(true)
        setPermission('granted')
        setSuccess('✅ Notifications push activées avec succès !')

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      } else {
        // Disable push notifications
        await pushManager.unsubscribe(userId)
        setIsEnabled(false)
        setSuccess('🔕 Notifications push désactivées')

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err: any) {
      console.error('❌ [PushToggle] Error:', err)
      setError(err.message || 'Une erreur est survenue')
      setIsEnabled(!enabled) // Revert the toggle
    } finally {
      setIsLoading(false)
    }
  }

  // If push notifications are not supported
  if (!isSupported) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="text-base">Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des notifications sur cet appareil
              </p>
            </div>
          </div>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Les notifications push ne sont pas supportées par votre navigateur ou appareil.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // If permission is denied
  if (permission === 'denied') {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellOff className="h-5 w-5 text-destructive" />
            <div>
              <Label className="text-base">Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des notifications sur cet appareil
              </p>
            </div>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Les notifications push sont bloquées. Veuillez autoriser les notifications dans les paramètres de votre navigateur.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isEnabled ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="push-notifications" className="text-base cursor-pointer">
              Notifications push
            </Label>
            <p className="text-sm text-muted-foreground">
              Recevoir des notifications sur cet appareil
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id="push-notifications"
            checked={isEnabled}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Success message */}
      {success && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info about push notifications */}
      {isEnabled && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Conseil :</strong> Les notifications push fonctionnent même quand l'application est fermée. Vous recevrez des alertes pour les nouvelles interventions, messages et mises à jour importantes.
          </p>
        </div>
      )}
    </div>
  )
}
