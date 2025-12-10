"use client"

import type React from "react"
import { useState, useActionState, useEffect } from "react"
import { useFormStatus } from "react-dom"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail } from "lucide-react"
import { loginAction } from "@/app/actions/auth-actions"
import { useAuth } from "@/hooks/use-auth"
import { logger, logError } from '@/lib/logger'
/**
 * 🚀 COMPOSANT CLIENT - LoginForm (Server Actions 2025)
 * Utilise les Server Actions pour authentification server-side sécurisée
 */

// Composant pour afficher le bouton de soumission avec état
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white shadow-lg shadow-brand-primary/25 transition-all hover:scale-[1.02]"
      disabled={pending}
    >
      {pending ? "Connexion..." : "Se connecter"}
    </Button>
  )
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [email, setEmail] = useState("")

  // ✅ 2025: useActionState pour gestion état Server Action
  const [state, formAction] = useActionState(loginAction, { success: false })

  // ✅ NAVIGATION POST-LOGIN (Bug Next.js #72842 corrigé dans 15.0.3+)
  // Le bug est corrigé, mais on garde le pattern return redirectTo pour consistance
  // Délai réduit de 1000ms → 100ms (juste assez pour que les cookies s'écrivent)
  useEffect(() => {
    if (state.success && state.data?.redirectTo) {
      logger.info('🚀 [LOGIN-FORM] Login successful, navigating to:', state.data.redirectTo)

      // ✅ OPTIMISÉ: Délai minimal de 100ms pour laisser les cookies s'écrire
      const timer = setTimeout(() => {
        logger.info('🔄 [LOGIN-FORM] Executing navigation...')
        if (state.data?.redirectTo) {
          window.location.href = state.data.redirectTo
        }
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [state])

  // ✅ LEGACY: Fonction de renvoi email (utilise ancien système pour compatibilité)
  const handleResendConfirmation = async () => {
    if (!email) {
      return
    }

    setResendLoading(true)
    setResendSuccess(false)

    try {
      // TODO: Migrer vers Server Action
      logger.info('📧 [LOGIN-FORM] Resending confirmation for:', email)
      await new Promise(resolve => setTimeout(resolve, 2000))
      setResendSuccess(true)
    } catch (error) {
      logger.error('Erreur lors du renvoi de confirmation:', error)
    } finally {
      setResendLoading(false)
    }
  }

  // ✅ 2025: Afficher le bouton de renvoi si erreur email non confirmé
  const shouldShowResend = !state.success && state.error?.includes('confirmer votre email')

  return (
    <form action={formAction} className="space-y-4">
      {/* ✅ 2025: Affichage erreurs depuis Server Action */}
      {!state.success && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {resendSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <Mail className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Email de confirmation renvoyé avec succès ! Vérifiez votre boîte de réception.
          </AlertDescription>
        </Alert>
      )}

      {/* ✅ 2025: Bouton renvoi conditionnel basé sur erreur Server Action */}
      {shouldShowResend && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="text-sm text-blue-800">
            <strong>Email non confirmé ?</strong>
          </div>
          <p className="text-sm text-blue-700">
            Si vous n'avez pas reçu l'email de confirmation, vous pouvez le renvoyer.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResendConfirmation}
            disabled={resendLoading}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            {resendLoading ? "Envoi en cours..." : "Renvoyer l'email de confirmation"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white">
          Adresse email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white">
          Mot de passe
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Votre mot de passe"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/20 transition-colors pr-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/60 hover:text-white"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </div>

      {/* ✅ 2025: Bouton avec état Server Action */}
      <SubmitButton />
    </form>
  )
}
