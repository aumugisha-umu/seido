'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Smartphone,
  Monitor,
  Settings,
  Bell,
  ChevronRight,
  RefreshCw,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Guide pour activer les notifications dans les paramètres système
 *
 * Affiché quand permission === 'denied'
 * Détecte automatiquement la plateforme et affiche les instructions appropriées
 */

type Platform = 'ios' | 'android' | 'chrome' | 'edge' | 'firefox' | 'safari' | 'unknown'

interface PlatformInfo {
  platform: Platform
  isMobile: boolean
  browserName: string
}

function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', isMobile: false, browserName: 'Navigateur' }
  }

  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /iphone|ipad|ipod|android/i.test(ua)

  // iOS
  if (/iphone|ipad|ipod/i.test(ua)) {
    return { platform: 'ios', isMobile: true, browserName: 'Safari' }
  }

  // Android
  if (/android/i.test(ua)) {
    return { platform: 'android', isMobile: true, browserName: 'Chrome' }
  }

  // Desktop browsers
  if (/edg/i.test(ua)) {
    return { platform: 'edge', isMobile: false, browserName: 'Edge' }
  }
  if (/firefox/i.test(ua)) {
    return { platform: 'firefox', isMobile: false, browserName: 'Firefox' }
  }
  if (/chrome/i.test(ua)) {
    return { platform: 'chrome', isMobile: false, browserName: 'Chrome' }
  }
  if (/safari/i.test(ua)) {
    return { platform: 'safari', isMobile: false, browserName: 'Safari' }
  }

  return { platform: 'unknown', isMobile, browserName: 'Navigateur' }
}

interface InstructionStep {
  icon?: React.ComponentType<{ className?: string }>
  text: string
  highlight?: string
}

function getInstructions(platform: Platform): InstructionStep[] {
  switch (platform) {
    case 'ios':
      return [
        { text: 'Ouvrez l\'app', highlight: 'Réglages', icon: Settings },
        { text: 'Descendez et trouvez', highlight: 'SEIDO' },
        { text: 'Appuyez sur', highlight: 'Notifications' },
        { text: 'Activez', highlight: 'Autoriser les notifications', icon: Bell }
      ]

    case 'android':
      return [
        { text: 'Ouvrez', highlight: 'Paramètres', icon: Settings },
        { text: 'Allez dans', highlight: 'Applications' },
        { text: 'Trouvez et appuyez sur', highlight: 'SEIDO' },
        { text: 'Appuyez sur', highlight: 'Notifications' },
        { text: 'Activez', highlight: 'Autoriser les notifications', icon: Bell }
      ]

    case 'chrome':
    case 'edge':
      return [
        { text: 'Cliquez sur l\'icône', highlight: '🔒 cadenas', icon: Settings },
        { text: 'Dans la barre d\'adresse (à gauche de l\'URL)' },
        { text: 'Cliquez sur', highlight: 'Paramètres du site' },
        { text: 'Trouvez', highlight: 'Notifications' },
        { text: 'Changez en', highlight: 'Autoriser', icon: Bell }
      ]

    case 'firefox':
      return [
        { text: 'Cliquez sur l\'icône', highlight: 'ℹ️ info', icon: Settings },
        { text: 'Dans la barre d\'adresse (à gauche de l\'URL)' },
        { text: 'Cliquez sur', highlight: 'Autorisations' },
        { text: 'À côté de "Notifications", cliquez sur', highlight: 'Autoriser', icon: Bell }
      ]

    case 'safari':
      return [
        { text: 'Ouvrez', highlight: 'Préférences Safari', icon: Settings },
        { text: 'Allez dans l\'onglet', highlight: 'Sites web' },
        { text: 'Sélectionnez', highlight: 'Notifications' },
        { text: 'Trouvez seido-app.com et sélectionnez', highlight: 'Autoriser', icon: Bell }
      ]

    default:
      return [
        { text: 'Accédez aux', highlight: 'paramètres de votre navigateur', icon: Settings },
        { text: 'Recherchez les', highlight: 'paramètres de notifications' },
        { text: 'Trouvez', highlight: 'seido-app.com' },
        { text: 'Changez la permission en', highlight: 'Autoriser', icon: Bell }
      ]
  }
}

function getPlatformIcon(platform: Platform, isMobile: boolean) {
  if (isMobile) {
    return Smartphone
  }
  return Monitor
}

export function NotificationSettingsGuide() {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    platform: 'unknown',
    isMobile: false,
    browserName: 'Navigateur'
  })

  useEffect(() => {
    setPlatformInfo(detectPlatform())
  }, [])

  const instructions = getInstructions(platformInfo.platform)
  const PlatformIcon = getPlatformIcon(platformInfo.platform, platformInfo.isMobile)

  return (
    <div className="space-y-4">
      {/* Header avec icône plateforme */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
        <PlatformIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {platformInfo.isMobile ? 'Sur votre appareil mobile' : `Sur ${platformInfo.browserName}`}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Les notifications ont été bloquées. Suivez ces étapes pour les réactiver.
          </p>
        </div>
      </div>

      {/* Instructions étape par étape */}
      <div className="space-y-2">
        {instructions.map((step, index) => {
          const StepIcon = step.icon
          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg bg-muted/50',
                'border border-transparent hover:border-primary/20 transition-colors'
              )}
            >
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 text-sm">
                <span className="text-muted-foreground">{step.text} </span>
                {step.highlight && (
                  <span className="font-semibold text-foreground">{step.highlight}</span>
                )}
              </div>
              {StepIcon && (
                <StepIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* Info sur détection automatique */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Détection automatique :</strong> Après avoir activé les notifications dans les
          paramètres, revenez simplement ici. L'application détectera automatiquement le changement
          et activera vos notifications.
        </AlertDescription>
      </Alert>

      {/* Astuce */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Astuce :</strong> Sur certains navigateurs, vous pouvez également cliquer sur
          l'icône de cadenas 🔒 dans la barre d'adresse pour accéder rapidement aux paramètres
          de notification.
        </p>
      </div>
    </div>
  )
}
