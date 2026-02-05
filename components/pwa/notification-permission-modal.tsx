'use client'

import { useEffect, useState } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from '@/components/ui/unified-modal'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Bell,
  BellRing,
  MessageSquare,
  Calendar,
  Briefcase,
  Wrench,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Download,
  Smartphone,
  Share,
  PlusSquare
} from 'lucide-react'
import { useNotificationPrompt, type NotificationPromptState } from '@/hooks/use-notification-prompt'
import { usePWAInstallWithNotifications } from '@/hooks/use-pwa-install-with-notifications'
import { useAuth } from '@/hooks/use-auth'
import { NotificationSettingsGuide } from './notification-settings-guide'
import { cn } from '@/lib/utils'

/**
 * Modale unifiée de notification pour Web et PWA
 *
 * 3 modes d'affichage selon le contexte :
 * 1. Web non-PWA : Propose d'installer la PWA puis active les notifications
 * 2. PWA installée : Active les notifications directement
 * 3. iOS Safari non-PWA : Guide d'installation manuelle (obligatoire sur iOS)
 *
 * Comportement dismiss : Réapparaît après 24h
 */

type UserRole = 'gestionnaire' | 'prestataire' | 'locataire' | 'admin'

interface BenefitItem {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  color: string
}

// Bénéfices personnalisés par rôle
const getBenefitsByRole = (role: UserRole | string): BenefitItem[] => {
  const benefits: Record<UserRole, BenefitItem[]> = {
    gestionnaire: [
      { icon: Bell, title: 'Nouvelles demandes', description: 'Soyez alerté des demandes d\'intervention', color: 'blue' },
      { icon: MessageSquare, title: 'Messages locataires', description: 'Répondez rapidement aux questions', color: 'green' },
      { icon: FileText, title: 'Devis reçus', description: 'Validez les devis des prestataires', color: 'purple' }
    ],
    prestataire: [
      { icon: Briefcase, title: 'Nouvelles missions', description: 'Ne manquez aucune opportunité', color: 'blue' },
      { icon: MessageSquare, title: 'Messages gestionnaires', description: 'Communiquez efficacement', color: 'green' },
      { icon: Calendar, title: 'Rappels RDV', description: 'Soyez ponctuel à chaque intervention', color: 'purple' }
    ],
    locataire: [
      { icon: Wrench, title: 'Suivi intervention', description: 'Suivez l\'avancement en temps réel', color: 'blue' },
      { icon: MessageSquare, title: 'Réponses', description: 'Recevez les réponses du gestionnaire', color: 'green' },
      { icon: Calendar, title: 'Visites planifiées', description: 'Soyez notifié des RDV', color: 'purple' }
    ],
    admin: [
      { icon: Bell, title: 'Alertes système', description: 'Surveillez l\'activité de la plateforme', color: 'blue' },
      { icon: MessageSquare, title: 'Messages importants', description: 'Communications prioritaires', color: 'green' },
      { icon: Wrench, title: 'Incidents', description: 'Réagissez rapidement aux problèmes', color: 'purple' }
    ]
  }
  return benefits[role as UserRole] || benefits.locataire
}

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-50 dark:bg-blue-950',
  green: 'bg-green-50 dark:bg-green-950',
  purple: 'bg-purple-50 dark:bg-purple-950'
}

const iconColorClasses: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-green-600 dark:text-green-400',
  purple: 'text-purple-600 dark:text-purple-400'
}

const titleColorClasses: Record<string, string> = {
  blue: 'text-blue-900 dark:text-blue-100',
  green: 'text-green-900 dark:text-green-100',
  purple: 'text-purple-900 dark:text-purple-100'
}

const descColorClasses: Record<string, string> = {
  blue: 'text-blue-700 dark:text-blue-300',
  green: 'text-green-700 dark:text-green-300',
  purple: 'text-purple-700 dark:text-purple-300'
}

function BenefitsList({ role }: { role: string }) {
  const benefits = getBenefitsByRole(role)

  return (
    <div className="space-y-3">
      {benefits.map((benefit, index) => {
        const Icon = benefit.icon
        return (
          <div
            key={index}
            className={cn('flex items-start space-x-3 p-3 rounded-lg', colorClasses[benefit.color])}
          >
            <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColorClasses[benefit.color])} />
            <div>
              <p className={cn('font-medium text-sm', titleColorClasses[benefit.color])}>{benefit.title}</p>
              <p className={cn('text-xs', descColorClasses[benefit.color])}>{benefit.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Écran 1: Installation PWA + Notifications (Web non-PWA, non-iOS)
 */
function InstallPWAScreen({
  role,
  error,
  isLoading,
  onInstall,
  onDismiss
}: {
  role: string
  error: string | null
  isLoading: boolean
  onInstall: () => void
  onDismiss: () => void
}) {
  return (
    <>
      <UnifiedModalHeader
        title="Restez informé en temps réel"
        subtitle="Installez l'application SEIDO"
        icon={<Download className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Installez l'application pour recevoir des notifications instantanées :
          </p>

          <BenefitsList role={role} />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="ghost" onClick={onDismiss} disabled={isLoading} className="text-muted-foreground">
          Plus tard
        </Button>
        <Button onClick={onInstall} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installation...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Installer l'application
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </>
  )
}

/**
 * Écran 2: Activation notifications (PWA installée ou Web push direct)
 */
function ActivateNotificationsScreen({
  role,
  error,
  isLoading,
  onActivate,
  onDismiss
}: {
  role: string
  error: string | null
  isLoading: boolean
  onActivate: () => void
  onDismiss: () => void
}) {
  return (
    <>
      <UnifiedModalHeader
        title="Activez les notifications"
        subtitle="Ne manquez aucune mise à jour importante"
        icon={<Bell className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <BenefitsList role={role} />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="ghost" onClick={onDismiss} disabled={isLoading} className="text-muted-foreground">
          Plus tard
        </Button>
        <Button onClick={onActivate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Activation...
            </>
          ) : (
            <>
              <Bell className="w-4 h-4 mr-2" />
              Activer les notifications
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </>
  )
}

/**
 * Écran 3: iOS Safari - Installation manuelle obligatoire
 */
function IOSInstallGuideScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <>
      <UnifiedModalHeader
        title="Installez l'app pour les notifications"
        subtitle="Requis sur iPhone et iPad"
        icon={<Smartphone className="h-5 w-5" />}
        variant="warning"
      />

      <UnifiedModalBody>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sur iOS, les notifications nécessitent d'installer l'application sur votre écran d'accueil :
          </p>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm flex-shrink-0">
                1
              </div>
              <div className="flex items-center space-x-2">
                <Share className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Appuyez sur le bouton <strong>Partager</strong></span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm flex-shrink-0">
                2
              </div>
              <div className="flex items-center space-x-2">
                <PlusSquare className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Sélectionnez <strong>"Sur l'écran d'accueil"</strong></span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <span className="text-sm">Appuyez sur <strong>"Ajouter"</strong></span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Une fois installée, ouvrez l'app depuis votre écran d'accueil pour activer les notifications.
          </p>
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button onClick={onDismiss} className="w-full">
          J'ai compris
        </Button>
      </UnifiedModalFooter>
    </>
  )
}

/**
 * Écran succès
 */
function SuccessScreen({ onClose }: { onClose: () => void }) {
  return (
    <>
      <UnifiedModalHeader
        title="Notifications activées !"
        icon={<CheckCircle className="h-5 w-5" />}
        variant="success"
      />
      <UnifiedModalBody className="text-center py-6">
        <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900 mb-4">
          <BellRing className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-base text-muted-foreground">
          Vous recevrez désormais les alertes importantes sur cet appareil.
        </p>
      </UnifiedModalBody>
    </>
  )
}

/**
 * Écran permission refusée
 */
function DeniedScreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <>
      <UnifiedModalHeader
        title="Notifications bloquées"
        subtitle="Vous manquez des alertes importantes"
        icon={<AlertCircle className="h-5 w-5" />}
        variant="warning"
      />
      <UnifiedModalBody>
        <NotificationSettingsGuide />
      </UnifiedModalBody>
      <UnifiedModalFooter>
        <Button onClick={onDismiss} className="w-full">
          J'ai compris
        </Button>
      </UnifiedModalFooter>
    </>
  )
}

export function NotificationPermissionModal() {
  const { user } = useAuth()
  const {
    shouldShowModal,
    state,
    permission,
    platform,
    error,
    dismissModal,
    enableNotifications,
    refreshPermissionState
  } = useNotificationPrompt()

  const {
    canInstall,
    isInstalled,
    isLoading: isInstallingPWA,
    triggerInstall,
    error: installError
  } = usePWAInstallWithNotifications()

  const [localError, setLocalError] = useState<string | null>(null)

  const isLoading = state === 'subscribing' || state === 'installing' || isInstallingPWA
  const isSuccess = state === 'success'
  const isDenied = permission === 'denied'

  // Combinaison des erreurs
  const displayError = localError || error || installError

  // Auto-fermer après succès
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        dismissModal()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, dismissModal])

  // Déterminer quel écran afficher
  const getScreenType = (): 'install-pwa' | 'activate' | 'ios-guide' | 'success' | 'denied' => {
    if (isSuccess) return 'success'
    if (isDenied) return 'denied'

    // iOS Safari non-PWA: guide d'installation manuelle
    if (platform.isIOSSafari) return 'ios-guide'

    // Web non-PWA avec install prompt disponible: proposer installation
    if (!platform.isPWAInstalled && canInstall) return 'install-pwa'

    // PWA installée ou web push direct
    return 'activate'
  }

  const screenType = getScreenType()

  // Handler pour installer PWA puis activer notifications
  const handleInstallAndActivate = async () => {
    setLocalError(null)

    const result = await triggerInstall()

    if (result.success) {
      // PWA installée, maintenant on active les notifications
      if (!result.notificationsEnabled) {
        // Si les notifications n'ont pas été activées automatiquement, on les active
        await enableNotifications()
      }
      // Rafraîchir l'état
      await refreshPermissionState()
    } else {
      // L'utilisateur a refusé l'installation, on dismiss avec le timer 24h
      dismissModal()
    }
  }

  // Ne rien afficher si pas nécessaire
  if (!shouldShowModal && !isSuccess) {
    return null
  }

  return (
    <UnifiedModal
      open={shouldShowModal || isSuccess}
      onOpenChange={dismissModal}
      size={screenType === 'ios-guide' ? 'md' : 'sm'}
    >
      {screenType === 'success' && <SuccessScreen onClose={dismissModal} />}

      {screenType === 'denied' && <DeniedScreen onDismiss={dismissModal} />}

      {screenType === 'ios-guide' && <IOSInstallGuideScreen onDismiss={dismissModal} />}

      {screenType === 'install-pwa' && (
        <InstallPWAScreen
          role={user?.role || 'locataire'}
          error={displayError}
          isLoading={isLoading}
          onInstall={handleInstallAndActivate}
          onDismiss={dismissModal}
        />
      )}

      {screenType === 'activate' && (
        <ActivateNotificationsScreen
          role={user?.role || 'locataire'}
          error={displayError}
          isLoading={isLoading}
          onActivate={enableNotifications}
          onDismiss={dismissModal}
        />
      )}
    </UnifiedModal>
  )
}
