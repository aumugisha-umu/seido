"use client"

import { useState } from 'react'
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, Bell, CheckCircle, X, Download, Zap, Loader2 } from "lucide-react"
import { usePWAInstallWithNotifications } from '@/hooks/use-pwa-install-with-notifications'

/**
 * 📱 MODAL INSTALLATION PWA
 *
 * Modal attrayant pour encourager l'installation de la PWA
 * avec activation automatique des notifications.
 *
 * Features:
 * - UI engageante avec icônes et couleurs
 * - Message clair sur l'activation auto des notifications
 * - Gestion des états: loading, success, error
 * - Callbacks pour tracking (onInstallSuccess, onDismiss)
 *
 * Usage:
 * ```tsx
 * <PWAInstallPromptModal
 *   isOpen={showPWAPrompt}
 *   onClose={() => setShowPWAPrompt(false)}
 *   onInstallSuccess={() => console.log('PWA installed!')}
 * />
 * ```
 */

interface PWAInstallPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onInstallSuccess?: (notificationsEnabled: boolean) => void
  onDismiss?: () => void
}

export function PWAInstallPromptModal({
  isOpen,
  onClose,
  onInstallSuccess,
  onDismiss
}: PWAInstallPromptModalProps) {
  const { canInstall, isLoading, error, triggerInstall } = usePWAInstallWithNotifications()
  const [installResult, setInstallResult] = useState<{ success: boolean; notificationsEnabled: boolean } | null>(null)

  const handleInstall = async () => {
    const result = await triggerInstall()
    setInstallResult(result)

    if (result.success) {
      onInstallSuccess?.(result.notificationsEnabled)
      // Fermer le modal après 2 secondes pour laisser voir le message de succès
      setTimeout(() => {
        onClose()
      }, 2000)
    }
  }

  const handleDismiss = () => {
    onDismiss?.()
    onClose()
  }

  // Si le prompt n'est pas disponible, ne rien afficher
  if (!canInstall && !installResult?.success) {
    return null
  }

  // ✅ État de succès
  if (installResult?.success) {
    return (
      <UnifiedModal open={isOpen} onOpenChange={onClose} size="sm">
        <UnifiedModalHeader
          title="Installation réussie !"
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
        <UnifiedModalBody className="text-center py-6">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-base text-muted-foreground">
            {installResult.notificationsEnabled ? (
              <>
                <Bell className="inline w-4 h-4 mr-1 text-green-600" />
                Notifications activées automatiquement
              </>
            ) : (
              "Vous pouvez maintenant utiliser SEIDO comme une app native"
            )}
          </p>
        </UnifiedModalBody>
      </UnifiedModal>
    )
  }

  // 📱 État initial - Prompt d'installation
  return (
    <UnifiedModal open={isOpen} onOpenChange={onClose} size="sm">
      <UnifiedModalHeader
        title="Installez SEIDO sur votre appareil"
        subtitle="Accédez rapidement à votre espace de gestion immobilière"
        icon={<Smartphone className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        <div className="space-y-3">
          {/* Avantages de l'installation */}
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-blue-900">Accès instantané</p>
              <p className="text-xs text-blue-700">Lancez l&apos;app directement depuis votre écran d&apos;accueil</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <Bell className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-green-900">Notifications activées</p>
              <p className="text-xs text-green-700">Recevez automatiquement les alertes importantes</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
            <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-purple-900">Expérience optimisée</p>
              <p className="text-xs text-purple-700">Interface fluide et rapide, même hors ligne</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button
          variant="outline"
          onClick={handleDismiss}
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Plus tard
        </Button>
        <Button
          onClick={handleInstall}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Installation...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Installer maintenant
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
