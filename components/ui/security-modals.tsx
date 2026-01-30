"use client"

import { useState } from "react"
import {
  UnifiedModal,
  UnifiedModalHeader,
  UnifiedModalBody,
  UnifiedModalFooter,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { logger } from '@/lib/logger'
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Shield,
  Loader2,
} from "lucide-react"

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ChangeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentEmail: string
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
    return requirements
  }

  const passwordRequirements = validatePassword(formData.newPassword)
  const isPasswordValid = Object.values(passwordRequirements).every(req => req)

  const handleClose = () => {
    setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    setError("")
    setShowPasswords({ current: false, new: false, confirm: false })
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validations côté client
    if (!formData.currentPassword) {
      setError("Veuillez entrer votre mot de passe actuel")
      return
    }

    if (!isPasswordValid) {
      setError("Le nouveau mot de passe ne respecte pas les critères de sécurité")
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("Le nouveau mot de passe doit être différent du mot de passe actuel")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du changement de mot de passe")
      }

      toast({
        title: "Mot de passe modifié",
        description: "Votre mot de passe a été modifié avec succès",
        variant: "default",
      })

      handleClose()

    } catch (error) {
      logger.error("Error changing password:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      handleClose()
    } else {
      onOpenChange(newOpen)
    }
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleOpenChange}
      size="md"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title="Changer le mot de passe"
        subtitle="Modifiez votre mot de passe pour sécuriser votre compte."
        icon={<Lock className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        <form onSubmit={handleSubmit} className="space-y-4" id="change-password-form">
          {/* Mot de passe actuel */}
          <div className="space-y-2">
            <Label htmlFor="current-password">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Entrez votre mot de passe actuel"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Nouveau mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="new-password">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPasswords.new ? "text" : "password"}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Entrez votre nouveau mot de passe"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Critères de sécurité compacts */}
            {formData.newPassword && (
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className={`flex items-center gap-1 ${passwordRequirements.length ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle className="h-3 w-3" />
                  8+ caractères
                </div>
                <div className={`flex items-center gap-1 ${passwordRequirements.uppercase ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle className="h-3 w-3" />
                  Majuscule
                </div>
                <div className={`flex items-center gap-1 ${passwordRequirements.number ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle className="h-3 w-3" />
                  Chiffre
                </div>
                <div className={`flex items-center gap-1 ${passwordRequirements.special ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <CheckCircle className="h-3 w-3" />
                  Spécial
                </div>
              </div>
            )}
          </div>

          {/* Confirmation mot de passe */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Confirmez votre nouveau mot de passe"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Les mots de passe ne correspondent pas
              </p>
            )}
          </div>

          {/* Messages d'erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          type="submit"
          form="change-password-form"
          disabled={isLoading || !isPasswordValid || formData.newPassword !== formData.confirmPassword}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Modification...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Modifier
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}

export function ChangeEmailModal({ open, onOpenChange, currentEmail }: ChangeEmailModalProps) {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newEmail: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const isEmailValid = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleClose = () => {
    setFormData({ currentPassword: "", newEmail: "" })
    setError("")
    setShowPassword(false)
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validations côté client
    if (!formData.currentPassword) {
      setError("Veuillez entrer votre mot de passe actuel")
      return
    }

    if (!formData.newEmail) {
      setError("Veuillez entrer votre nouvel email")
      return
    }

    if (!isEmailValid(formData.newEmail)) {
      setError("Le format de l'email n'est pas valide")
      return
    }

    if (formData.newEmail === currentEmail) {
      setError("Le nouvel email doit être différent de l'email actuel")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/change-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newEmail: formData.newEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du changement d'email")
      }

      toast({
        title: "Email modifié",
        description: "Votre email a été modifié avec succès. Vérifiez votre boîte de réception pour confirmer.",
        variant: "default",
      })

      handleClose()

      // Recharger la page pour récupérer les nouvelles données
      setTimeout(() => {
        window.location.reload()
      }, 1000)

    } catch (error) {
      logger.error("Error changing email:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      handleClose()
    } else {
      onOpenChange(newOpen)
    }
  }

  return (
    <UnifiedModal
      open={open}
      onOpenChange={handleOpenChange}
      size="sm"
      preventCloseOnOutsideClick={isLoading}
      preventCloseOnEscape={isLoading}
    >
      <UnifiedModalHeader
        title="Changer l'email"
        subtitle="Modifiez votre adresse email. Vous devrez confirmer votre nouveau email."
        icon={<Mail className="h-5 w-5" />}
      />

      <UnifiedModalBody>
        <form onSubmit={handleSubmit} className="space-y-4" id="change-email-form">
          {/* Email actuel (lecture seule) */}
          <div className="space-y-2">
            <Label htmlFor="current-email">Email actuel</Label>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-md border">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600 text-sm">{currentEmail}</span>
            </div>
          </div>

          {/* Mot de passe pour confirmation */}
          <div className="space-y-2">
            <Label htmlFor="password-confirm">Mot de passe actuel</Label>
            <div className="relative">
              <Input
                id="password-confirm"
                type={showPassword ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Confirmez avec votre mot de passe"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-600">
              Requis pour des raisons de sécurité
            </p>
          </div>

          <Separator />

          {/* Nouvel email */}
          <div className="space-y-2">
            <Label htmlFor="new-email">Nouvel email</Label>
            <Input
              id="new-email"
              type="email"
              value={formData.newEmail}
              onChange={(e) => setFormData(prev => ({ ...prev, newEmail: e.target.value }))}
              placeholder="exemple@domain.com"
              required
            />
            {formData.newEmail && !isEmailValid(formData.newEmail) && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Format d&apos;email invalide
              </p>
            )}
            <p className="text-xs text-slate-600">
              Un email de confirmation sera envoyé à cette adresse
            </p>
          </div>

          {/* Messages d'erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </form>
      </UnifiedModalBody>

      <UnifiedModalFooter>
        <Button variant="outline" onClick={handleClose} disabled={isLoading}>
          Annuler
        </Button>
        <Button
          type="submit"
          form="change-email-form"
          disabled={isLoading || !isEmailValid(formData.newEmail) || !formData.currentPassword}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Modification...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Modifier
            </>
          )}
        </Button>
      </UnifiedModalFooter>
    </UnifiedModal>
  )
}
