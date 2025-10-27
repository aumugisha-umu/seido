"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, Bell, CheckCircle, X, Download, Zap } from "lucide-react"
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {installResult?.success ? (
          // ✅ État de succès
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-2xl">Installation réussie !</DialogTitle>
              <DialogDescription className="text-base">
                {installResult.notificationsEnabled ? (
                  <>
                    <Bell className="inline w-4 h-4 mr-1 text-green-600" />
                    Notifications activées automatiquement
                  </>
                ) : (
                  "Vous pouvez maintenant utiliser SEIDO comme une app native"
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          // 📱 État initial - Prompt d'installation
          <>
            <DialogHeader>
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <DialogTitle className="text-center text-xl">
                Installez SEIDO sur votre appareil
              </DialogTitle>
              <DialogDescription className="text-center text-base">
                Accédez rapidement à votre espace de gestion immobilière
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              {/* Avantages de l'installation */}
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-blue-900">Accès instantané</p>
                  <p className="text-xs text-blue-700">Lancez l'app directement depuis votre écran d'accueil</p>
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
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handleDismiss}
                disabled={isLoading}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <X className="w-4 h-4 mr-2" />
                Plus tard
              </Button>
              <Button
                onClick={handleInstall}
                disabled={isLoading}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white order-1 sm:order-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Installation...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Installer maintenant
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
