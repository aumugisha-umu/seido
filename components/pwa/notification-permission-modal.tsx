'use client'

import { useEffect } from 'react'
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
  Settings
} from 'lucide-react'
import { useNotificationPrompt, type NotificationPromptState } from '@/hooks/use-notification-prompt'
import { useAuth } from '@/hooks/use-auth'
import { NotificationSettingsGuide } from './notification-settings-guide'
import { cn } from '@/lib/utils'

/**
 * Modale de permission pour les notifications PWA
 *
 * S'affiche automatiquement à chaque ouverture de l'app PWA si :
 * - L'utilisateur n'a pas encore accordé la permission
 * - Les notifications ne sont pas activées
 *
 * Deux modes d'affichage :
 * 1. Normal (permission = 'default') : Boutons "Activer" / "Plus tard"
 * 2. Denied (permission = 'denied') : Guide vers les paramètres système
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
      {
        icon: Bell,
        title: 'Nouvelles demandes',
        description: 'Soyez alerté des demandes d\'intervention',
        color: 'blue'
      },
      {
        icon: MessageSquare,
        title: 'Messages locataires',
        description: 'Répondez rapidement aux questions',
        color: 'green'
      },
      {
        icon: FileText,
        title: 'Devis reçus',
        description: 'Validez les devis des prestataires',
        color: 'purple'
      }
    ],
    prestataire: [
      {
        icon: Briefcase,
        title: 'Nouvelles missions',
        description: 'Ne manquez aucune opportunité',
        color: 'blue'
      },
      {
        icon: MessageSquare,
        title: 'Messages gestionnaires',
        description: 'Communiquez efficacement',
        color: 'green'
      },
      {
        icon: Calendar,
        title: 'Rappels RDV',
        description: 'Soyez ponctuel à chaque intervention',
        color: 'purple'
      }
    ],
    locataire: [
      {
        icon: Wrench,
        title: 'Suivi intervention',
        description: 'Suivez l\'avancement en temps réel',
        color: 'blue'
      },
      {
        icon: MessageSquare,
        title: 'Réponses',
        description: 'Recevez les réponses du gestionnaire',
        color: 'green'
      },
      {
        icon: Calendar,
        title: 'Visites planifiées',
        description: 'Soyez notifié des RDV',
        color: 'purple'
      }
    ],
    admin: [
      {
        icon: Bell,
        title: 'Alertes système',
        description: 'Surveillez l\'activité de la plateforme',
        color: 'blue'
      },
      {
        icon: MessageSquare,
        title: 'Messages importants',
        description: 'Communications prioritaires',
        color: 'green'
      },
      {
        icon: Wrench,
        title: 'Incidents',
        description: 'Réagissez rapidement aux problèmes',
        color: 'purple'
      }
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

export function NotificationPermissionModal() {
  const { user } = useAuth()
  const {
    shouldShowModal,
    state,
    permission,
    error,
    dismissModal,
    enableNotifications
  } = useNotificationPrompt()

  const benefits = getBenefitsByRole(user?.role || 'locataire')
  const isLoading = state === 'subscribing'
  const isSuccess = state === 'success'
  const isDenied = permission === 'denied'

  // Auto-fermer après succès
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        dismissModal()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess, dismissModal])

  // Ne rien afficher si pas nécessaire
  if (!shouldShowModal && !isSuccess) {
    return null
  }

  // État de succès
  if (isSuccess) {
    return (
      <UnifiedModal open={true} onOpenChange={dismissModal} size="sm">
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
      </UnifiedModal>
    )
  }

  // Mode "denied" : Guide vers paramètres
  if (isDenied) {
    return (
      <UnifiedModal open={shouldShowModal} onOpenChange={dismissModal} size="md">
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
          <Button onClick={dismissModal} className="w-full">
            J'ai compris
          </Button>
        </UnifiedModalFooter>
      </UnifiedModal>
    )
  }

  // Mode normal : Demande de permission
  return (
    <UnifiedModal open={shouldShowModal} onOpenChange={dismissModal} size="sm">
      <UnifiedModalHeader
        title="Activez les notifications"
        subtitle="Restez informé en temps réel"
        icon={<Bell className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        <div className="space-y-3">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div
                key={index}
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg',
                  colorClasses[benefit.color]
                )}
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', iconColorClasses[benefit.color])} />
                <div>
                  <p className={cn('font-medium text-sm', titleColorClasses[benefit.color])}>
                    {benefit.title}
                  </p>
                  <p className={cn('text-xs', descColorClasses[benefit.color])}>
                    {benefit.description}
                  </p>
                </div>
              </div>
            )
          })}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={dismissModal}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Plus tard
        </Button>
        <Button
          onClick={enableNotifications}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
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
    </UnifiedModal>
  )
}
