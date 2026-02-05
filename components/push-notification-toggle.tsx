"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle, Smartphone, ExternalLink } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { pushManager } from "@/lib/push-notification-manager"
import { cn } from "@/lib/utils"
import { checkUserPushSubscription, deleteUserPushSubscriptions } from "@/app/actions/push-subscription-actions"
import { detectPlatform, type PlatformInfo } from "@/lib/utils/platform-detection"

interface PushNotificationToggleProps {
  userId: string
  className?: string
  onShowInstallGuide?: () => void
}

export function PushNotificationToggle({ userId, className, onShowInstallGuide }: PushNotificationToggleProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [platform, setPlatform] = useState<PlatformInfo>(() => detectPlatform())

  const [swReady, setSwReady] = useState(true)

  // Check support and subscription status on mount
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true)

      // Refresh platform detection
      const detectedPlatform = detectPlatform()
      setPlatform(detectedPlatform)

      // Check if push notifications are supported
      const supported = pushManager.isSupported()
      setIsSupported(supported)

      if (!supported) {
        setIsLoading(false)
        return
      }

      // Check if service worker is registered (may be disabled in dev mode)
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        if (registrations.length === 0) {
          console.warn('⚠️ [PushToggle] No service worker registered. Push notifications require production build.')
          setSwReady(false)
          setIsLoading(false)
          return
        }
      } catch {
        setSwReady(false)
        setIsLoading(false)
        return
      }

      // Check permission status
      const currentPermission = pushManager.getPermissionStatus()
      setPermission(currentPermission)

      // Check if user is subscribed - DOUBLE CHECK: browser + database
      const browserSubscribed = await pushManager.isSubscribed()
      const { hasSubscription: dbSubscribed } = await checkUserPushSubscription()

      // Source de vérité = base de données
      // Si browser=true mais DB=false, c'est une incohérence (subscription locale sans serveur)
      const isActuallySubscribed = dbSubscribed
      setIsEnabled(isActuallySubscribed)

      console.log('🔔 [PushToggle] Subscription status:', {
        browserSubscribed,
        dbSubscribed,
        isActuallySubscribed
      })

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

        // Vérifier que la subscription a bien été créée en DB
        const { hasSubscription: dbSubscribed } = await checkUserPushSubscription()

        if (!dbSubscribed) {
          console.error('❌ [PushToggle] Subscription created locally but not saved to database')
          setError('La subscription n\'a pas été enregistrée. Veuillez réessayer.')
          setIsEnabled(false)
        } else {
          setIsEnabled(true)
          setPermission('granted')
          setSuccess('✅ Notifications push activées avec succès !')
          setTimeout(() => setSuccess(null), 3000)
        }
      } else {
        // Disable push notifications - supprimer côté navigateur ET serveur
        await pushManager.unsubscribe(userId)
        await deleteUserPushSubscriptions()

        setIsEnabled(false)
        setSuccess('🔕 Notifications push désactivées')
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

  // If service worker is not ready (disabled in dev mode)
  if (!swReady) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BellOff className="h-5 w-5 text-amber-500" />
            <div>
              <Label className="text-base">Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des notifications sur cet appareil
              </p>
            </div>
          </div>
        </div>
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Mode développement :</strong> Le Service Worker est désactivé. Pour tester les notifications push, lancez l'application en mode production avec <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">npm run build && npm run start</code>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // iOS Safari without PWA installed - push notifications require PWA
  if (platform.isIOSSafari) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5 text-blue-500" />
            <div>
              <Label className="text-base">Notifications push</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des notifications sur cet appareil
              </p>
            </div>
          </div>
          <Switch
            id="push-notifications-ios"
            checked={false}
            disabled={true}
          />
        </div>
        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p className="mb-2">
              <strong>Sur iOS, installez l'app pour les notifications</strong>
            </p>
            <p className="text-sm mb-3">
              Les notifications push nécessitent d'ajouter SEIDO à votre écran d'accueil.
            </p>
            {onShowInstallGuide ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onShowInstallGuide}
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Comment installer ?
              </Button>
            ) : (
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Appuyez sur le bouton Partager <span className="inline-block">⬆️</span> puis "Sur l'écran d'accueil"
              </p>
            )}
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
