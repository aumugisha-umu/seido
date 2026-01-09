"use client"

import { useState, useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone, Building2 } from 'lucide-react'
import { completeOAuthProfileAction } from './actions'
import { logger } from '@/lib/logger'

interface CompleteProfileFormProps {
  userData: {
    email: string
    fullName: string
    avatarUrl: string
    provider: string
  }
}

function SubmitButton({ isFormValid }: { isFormValid: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      disabled={pending || !isFormValid}
      className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02] h-11"
    >
      {pending ? (
        <>
          <span className="inline-block animate-spin mr-2">⏳</span>
          Création du profil...
        </>
      ) : (
        'Créer mon profil'
      )}
    </Button>
  )
}

export function CompleteProfileForm({ userData }: CompleteProfileFormProps) {
  const [state, formAction] = useActionState(completeOAuthProfileAction, { success: false })

  // Pré-remplir avec les données Google
  const nameParts = userData.fullName.split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] || '')
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '')
  const [phone, setPhone] = useState('')

  const isFormValid = firstName.trim().length > 0 && lastName.trim().length > 0

  // Gérer la redirection après succès
  useEffect(() => {
    if (state.success && state.data?.redirectTo) {
      logger.info('[COMPLETE-PROFILE-FORM] Profile created, redirecting to:', state.data.redirectTo)
      window.location.href = state.data.redirectTo
    }
  }, [state])

  return (
    <form action={formAction} className="space-y-4">
      {/* Affichage des erreurs */}
      {!state.success && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Prénom et Nom */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-white font-medium">
            Prénom
          </Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="Votre prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 transition-colors focus:bg-white/20"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-white font-medium">
            Nom
          </Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Votre nom de famille"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 transition-colors focus:bg-white/20"
            required
          />
        </div>
      </div>

      {/* Téléphone (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-white font-medium">
          <Phone className="w-4 h-4 inline mr-1" />
          Téléphone (optionnel)
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Votre numéro de téléphone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 transition-colors focus:bg-white/20"
        />
      </div>

      {/* Info sur le rôle */}
      <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/20 rounded-lg">
            <Building2 className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <p className="text-white font-medium">Compte Gestionnaire</p>
            <p className="text-sm text-white/60">
              Gérez vos biens immobiliers et interventions
            </p>
          </div>
        </div>
      </div>

      {/* Hidden fields */}
      <input type="hidden" name="avatarUrl" value={userData.avatarUrl} />

      <SubmitButton isFormValid={isFormValid} />
    </form>
  )
}
