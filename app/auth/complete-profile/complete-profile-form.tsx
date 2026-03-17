"use client"

import { useState, useRef, useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone, Building2, Camera, Loader2 } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { completeProfileAction } from './actions'
import { logger } from '@/lib/logger'
import { AVATAR_MAX_SIZE, AVATAR_ALLOWED_TYPES } from '@/lib/validation/schemas'

interface CompleteProfileFormProps {
  userData: {
    email: string
    fullName: string
    avatarUrl: string
    provider: string
    isEmailSignup: boolean
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
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Création du profil...
        </>
      ) : (
        'Commencer mon essai gratuit'
      )}
    </Button>
  )
}

export function CompleteProfileForm({ userData }: CompleteProfileFormProps) {
  const [state, formAction] = useActionState(completeProfileAction, { success: false })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pre-fill with Google data for OAuth, empty for email signup
  const nameParts = userData.fullName.split(' ')
  const [firstName, setFirstName] = useState(nameParts[0] || '')
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '')
  const [phone, setPhone] = useState('')
  const [organization, setOrganization] = useState('')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(userData.avatarUrl || null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const isFormValid = firstName.trim().length > 0 && lastName.trim().length > 0

  // Initials for avatar fallback
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map(n => n[0]?.toUpperCase())
    .join('')

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setAvatarError(null)

    if (file.size > AVATAR_MAX_SIZE) {
      setAvatarError('Fichier trop volumineux (max 5 MB)')
      return
    }

    if (!(AVATAR_ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      setAvatarError('Format non supporté (JPG, PNG ou WebP)')
      return
    }

    setAvatarFile(file)
    // Revoke old blob URL to prevent memory leak on re-upload
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview)
    }
    const previewUrl = URL.createObjectURL(file)
    setAvatarPreview(previewUrl)
  }

  // Redirect after success
  useEffect(() => {
    if (state.success && state.data?.redirectTo) {
      logger.info('[COMPLETE-PROFILE-FORM] Profile created, redirecting to:', state.data.redirectTo)

      const timer = setTimeout(() => {
        if (state.data?.redirectTo) {
          window.location.href = state.data.redirectTo
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [state])

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  // Wrap formAction to inject avatar file into FormData
  const handleFormAction = (formData: FormData) => {
    if (avatarFile) {
      formData.set('avatar', avatarFile)
    }
    return formAction(formData)
  }

  return (
    <form action={handleFormAction} className="space-y-4">
      {/* Error display */}
      {!state.success && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar className="h-20 w-20 border-2 border-white/20">
            {avatarPreview ? (
              <AvatarImage src={avatarPreview} alt="Photo de profil" />
            ) : (
              <AvatarFallback className="text-lg bg-white/10 text-white">
                {initials || '?'}
              </AvatarFallback>
            )}
          </Avatar>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="absolute -bottom-1 -right-1 rounded-full p-1.5 h-7 w-7 border-white/30 bg-white/10 hover:bg-white/20 text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-3.5 w-3.5" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <p className="text-xs text-white/40">
          {avatarFile ? avatarFile.name : 'Ajouter une photo de profil'}
        </p>
        {avatarError && (
          <p className="text-xs text-red-400">{avatarError}</p>
        )}
      </div>

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

      {/* Organisation (optionnel) */}
      <div className="space-y-2">
        <Label htmlFor="organization" className="text-white font-medium">
          Nom de votre organisation (optionnel)
        </Label>
        <Input
          id="organization"
          name="organization"
          type="text"
          placeholder="Ex: Immobilière Dupont, ABC Gestion..."
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 transition-colors focus:bg-white/20"
        />
        <p className="text-xs text-white/40">
          Sera utilisé comme nom de votre espace de travail
        </p>
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
      <input type="hidden" name="isEmailSignup" value={userData.isEmailSignup ? 'true' : 'false'} />

      <SubmitButton isFormValid={isFormValid} />
    </form>
  )
}
