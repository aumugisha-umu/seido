"use client"

import type React from "react"
import { useState, useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Check, Phone } from "lucide-react"
import { signupAction } from "@/app/actions/auth-actions"
import { logger, logError } from '@/lib/logger'
/**
 * 🚀 COMPOSANT CLIENT - SignupForm (Server Actions 2025)
 * Utilise les Server Actions pour inscription server-side sécurisée
 */

// Composant pour afficher le bouton de soumission avec état
function SubmitButton({ isFormValid }: { isFormValid: boolean }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
      disabled={pending || !isFormValid}
    >
      {pending ? "Création du compte..." : "Créer mon compte"}
    </Button>
  )
}

export function SignupForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    acceptTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ✅ 2025: useActionState pour gestion état Server Action
  const [state, formAction] = useActionState(signupAction, { success: true })
  const router = useRouter()

  // ✅ Gérer la redirection après signup réussi
  // Pattern: Identique à login-form.tsx (workaround bug Next.js 15 #72842)
  // Issue: redirect() dans Server Action ne fonctionne pas avec useActionState
  // Solution: Utiliser window.location.href pour forcer un vrai refresh de page
  // Refs: https://github.com/vercel/next.js/issues/72842
  useEffect(() => {
    if (state.success && state.data?.redirectTo) {
      logger.info('🚀 [SIGNUP-FORM] Signup successful, navigating in 500ms to:', state.data.redirectTo)

      // ✅ DÉLAI: 500ms pour afficher le message de succès
      const timer = setTimeout(() => {
        logger.info('🔄 [SIGNUP-FORM] Executing navigation with window.location.href...')
        window.location.href = state.data.redirectTo
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [state.success, state.data?.redirectTo])

  const passwordRequirements = [
    { text: "Au moins 8 caractères", met: formData.password.length >= 8 },
    { text: "Une majuscule", met: /[A-Z]/.test(formData.password) },
    { text: "Une minuscule", met: /[a-z]/.test(formData.password) },
    { text: "Un chiffre", met: /\d/.test(formData.password) },
  ]

  const isPasswordValid = passwordRequirements.every(req => req.met)
  const isFormValid =
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.password.trim() &&
    formData.confirmPassword.trim() &&
    formData.password === formData.confirmPassword &&
    isPasswordValid &&
    formData.acceptTerms

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* ✅ Message de succès avant redirection */}
      {state.success && !state.error && state.data?.redirectTo && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Compte créé avec succès !</strong><br />
            Redirection en cours...
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ 2025: Affichage erreurs depuis Server Action */}
      {!state.success && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Prénom et Nom */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-foreground font-medium">
            Prénom
          </Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            placeholder="Votre prénom"
            value={formData.firstName}
            onChange={(e) => handleInputChange("firstName", e.target.value)}
            className="bg-input border-border h-11 transition-colors focus:border-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-foreground font-medium">
            Nom
          </Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Votre nom de famille"
            value={formData.lastName}
            onChange={(e) => handleInputChange("lastName", e.target.value)}
            className="bg-input border-border h-11 transition-colors focus:border-primary"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-foreground font-medium">
          Adresse email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="votre@email.com"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          className="bg-input border-border h-11 transition-colors focus:border-primary"
          required
        />
      </div>

      {/* Mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-foreground font-medium">
          Mot de passe
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Créez un mot de passe sécurisé"
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            className="bg-input border-border h-11 pr-10 transition-colors focus:border-primary"
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
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {formData.password && (
          <div className="bg-muted/20 border border-muted/50 rounded-md p-3 space-y-1.5">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2.5 text-xs">
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                  req.met ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                }`}>
                  <Check className="h-2.5 w-2.5" />
                </div>
                <span className={`${req.met ? "text-green-700 font-medium" : "text-muted-foreground"} transition-colors`}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation mot de passe */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-foreground font-medium">
          Confirmer le mot de passe
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirmez votre mot de passe"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
            className="bg-input border-border h-11 pr-10 transition-colors focus:border-primary"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* Téléphone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-foreground font-medium">
          <Phone className="w-4 h-4 inline mr-1" />
          Téléphone (optionnel)
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="Votre numéro de téléphone"
          value={formData.phone}
          onChange={(e) => handleInputChange("phone", e.target.value)}
          className="bg-input border-border h-11 transition-colors focus:border-primary"
        />
      </div>

      {/* Terms and Conditions Section */}
      <div className="bg-muted/30 border border-muted rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={formData.acceptTerms}
            onCheckedChange={(checked) => handleInputChange("acceptTerms", checked as boolean)}
            className="mt-0.5 h-5 w-5 border-2 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
          />
          {/* Hidden input for form submission */}
          <input type="hidden" name="acceptTerms" value={formData.acceptTerms ? "true" : "false"} />
          <div className="flex-1">
            <div
              className="text-sm text-foreground leading-relaxed cursor-pointer"
              onClick={(e) => {
                // Ne pas déclencher si on clique sur un lien
                if ((e.target as HTMLElement).tagName !== 'A') {
                  handleInputChange("acceptTerms", !formData.acceptTerms)
                }
              }}
            >
              <div>
                En créant mon compte, j'accepte les{" "}
                <Link
                  href="/terms"
                  className="text-primary hover:text-primary/80 underline decoration-primary/60 underline-offset-2 font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  conditions d'utilisation
                </Link>
              </div>
              <div>
                et la{" "}
                <Link
                  href="/privacy"
                  className="text-primary hover:text-primary/80 underline decoration-primary/60 underline-offset-2 font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  politique de confidentialité
                </Link>{" "}
                de SEIDO.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ 2025: Bouton avec état Server Action */}
      <SubmitButton isFormValid={isFormValid} />
    </form>
  )
}
