"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CheckCircle, Building2, Users, Wrench, ArrowRight, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { PWAInstallPromptModal } from '@/components/pwa/pwa-install-prompt-modal'
import { logger } from '@/lib/logger'

interface SignupSuccessModalProps {
  isOpen: boolean
  firstName: string
  role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  dashboardPath: string
  onContinue?: () => void
}

/**
 * Modale de succès après confirmation d'inscription
 *
 * Affiche:
 * - Message de bienvenue personnalisé
 * - Prochaines étapes selon le rôle
 * - Bouton pour continuer manuellement (pas de redirection automatique)
 */
export const SignupSuccessModal = ({
  isOpen,
  firstName,
  role,
  dashboardPath,
  onContinue
}: SignupSuccessModalProps) => {
  const router = useRouter()
  const [showPWAPrompt, setShowPWAPrompt] = useState(false)

  // 📱 PWA: Déclencher automatiquement le prompt après 2 secondes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        logger.info('📱 [SIGNUP-SUCCESS] Triggering PWA prompt after 2 seconds')
        setShowPWAPrompt(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleContinue = () => {
    if (onContinue) {
      onContinue()
    } else {
      router.push(dashboardPath)
    }
  }

  const handlePWAInstallSuccess = (notificationsEnabled: boolean) => {
    logger.info('✅ [SIGNUP-SUCCESS] PWA installed successfully', { notificationsEnabled })
  }

  const handlePWADismiss = () => {
    logger.info('❌ [SIGNUP-SUCCESS] PWA prompt dismissed by user')
  }

  // Prochaines étapes selon le rôle
  const getNextSteps = () => {
    switch (role) {
      case 'gestionnaire':
      case 'admin':
        return [
          {
            icon: Building2,
            title: 'Centraliser votre patrimoine',
            description: 'Ajoutez vos biens, lots et documents en un seul endroit'
          },
          {
            icon: FileText,
            title: 'Lier locataires et logements',
            description: 'Créez des contrats pour associer vos locataires à leurs lots'
          },
          {
            icon: Users,
            title: 'Collaborer avec votre équipe',
            description: 'Déléguez et suivez les tâches en temps réel'
          },
          {
            icon: Wrench,
            title: 'Piloter toutes vos tâches',
            description: 'Interventions, indexations, renouvellements, assurances... tout en un'
          }
        ]

      case 'prestataire':
        return [
          {
            icon: Building2,
            title: 'Compléter votre profil',
            description: 'Ajoutez vos spécialités et coordonnées'
          },
          {
            icon: Wrench,
            title: 'Consulter les interventions',
            description: 'Trouvez des chantiers qui correspondent à vos compétences'
          },
          {
            icon: Users,
            title: 'Répondre aux demandes',
            description: 'Envoyez vos devis et planifiez vos interventions'
          }
        ]

      case 'locataire':
        return [
          {
            icon: Building2,
            title: 'Voir votre logement',
            description: 'Consultez les informations de votre bien'
          },
          {
            icon: Wrench,
            title: 'Créer une demande d\'intervention',
            description: 'Signalez un problème ou une réparation nécessaire'
          },
          {
            icon: Users,
            title: 'Contacter votre gestionnaire',
            description: 'Communiquez facilement avec votre équipe'
          }
        ]

      default:
        return []
    }
  }

  const nextSteps = getNextSteps()

  return (
    <>
      <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {/* Animation CheckCircle */}
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-full bg-green-100",
                "animate-ping opacity-75"
              )} />
              <div className="relative bg-green-100 rounded-full p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold text-center">
              Bienvenue sur SEIDO, {firstName} ! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-base">
              Votre compte a été créé avec succès et votre profil est prêt.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Prochaines étapes */}
        <div className="space-y-4 py-6">
          <h3 className="font-semibold text-lg">Prochaines étapes</h3>
          <div className="space-y-3">
            {nextSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter className="flex justify-center sm:justify-end">
          <Button
            onClick={handleContinue}
            className="w-full sm:w-auto"
            size="lg"
          >
            Continuer
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* 📱 PWA Installation Prompt - Triggered automatically after 2s */}
    <PWAInstallPromptModal
      isOpen={showPWAPrompt}
      onClose={() => setShowPWAPrompt(false)}
      onInstallSuccess={handlePWAInstallSuccess}
      onDismiss={handlePWADismiss}
    />
    </>
  )
}
