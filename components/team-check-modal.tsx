'use client'

import { useEffect, useState } from 'react'
import { teamService } from '@/lib/database-service'
import { useAuth } from '@/hooks/use-auth'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Mail } from 'lucide-react'

interface TeamCheckModalProps {
  onTeamResolved?: () => void
}

export function TeamCheckModal({ onTeamResolved }: TeamCheckModalProps) {
  const { user } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (user) {
      checkUserTeam()
    }
  }, [user])

  const checkUserTeam = async () => {
    if (!user) return

    try {
      setIsChecking(true)
      console.log('🔍 Checking team status for user:', user.name)
      
      const result = await teamService.ensureUserHasTeam(user.id)
      
      if (result.hasTeam) {
        console.log('✅ User has team access')
        onTeamResolved?.()
      } else {
        console.log('❌ User has no team access:', result.error)
        setErrorMessage(result.error || 'Erreur inconnue')
        setShowErrorModal(true)
      }
    } catch (error) {
      console.error('❌ Error checking team:', error)
      setErrorMessage('Erreur lors de la vérification de votre équipe. Veuillez réessayer.')
      setShowErrorModal(true)
    } finally {
      setIsChecking(false)
    }
  }

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Demande d\'ajout à une équipe')
    const body = encodeURIComponent(`Bonjour,

Je ne peux pas accéder à mon dashboard car je ne suis assigné à aucune équipe.

Mes informations :
- Nom : ${user?.name}
- Email : ${user?.email}
- Rôle : ${user?.role}

Merci de m'ajouter à une équipe appropriée.

Cordialement,
${user?.name}`)
    
    window.open(`mailto:support@seido.com?subject=${subject}&body=${body}`)
  }

  // Loading pendant la vérification
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification de votre accès...</p>
        </div>
      </div>
    )
  }

  // Modale d'erreur
  return (
    <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Accès restreint
          </DialogTitle>
          <DialogDescription className="text-left space-y-4 pt-4">
            <p>{errorMessage}</p>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Que faire ?</h4>
              <p className="text-blue-800 text-sm">
                Contactez votre gestionnaire ou le support technique pour être ajouté à une équipe. 
                Vous recevrez un email de confirmation une fois l'ajout effectué.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={handleContactSupport}
            className="w-full"
          >
            <Mail className="h-4 w-4 mr-2" />
            Contacter le support
          </Button>
          
          <Button 
            variant="outline" 
            onClick={checkUserTeam}
            className="w-full"
          >
            Réessayer la vérification
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/auth/login'}
            className="w-full text-sm"
          >
            Retour à la connexion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
