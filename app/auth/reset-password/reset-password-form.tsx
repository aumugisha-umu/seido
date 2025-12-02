"use client"

import type React from "react"
import { useState, useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, CheckCircle } from "lucide-react"
import { resetPasswordAction } from "@/app/actions/auth-actions"

/**
 * 🚀 COMPOSANT CLIENT - ResetPasswordForm (Server Actions 2025)
 * Utilise les Server Actions pour réinitialisation server-side sécurisée
 */

// Composant pour afficher le bouton de soumission avec état
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
      disabled={pending}
    >
      {pending ? "Envoi en cours..." : "Envoyer l'email de réinitialisation"}
    </Button>
  )
}

export function ResetPasswordForm() {
  const [email, setEmail] = useState("")

  // ✅ 2025: useActionState pour gestion état Server Action
  const [state, formAction] = useActionState(resetPasswordAction, { success: true })

  // ✅ 2025: Affichage de succès
  if (state.success && state.data?.message) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Email envoyé avec succès ! 📧
          </h3>
          <p className="text-white/60">
            Vérifiez votre boîte de réception à l'adresse{" "}
            <span className="font-semibold text-white">{state.data.email}</span>
          </p>
        </div>

        <Alert className="border-blue-500/30 bg-blue-500/10">
          <Mail className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-200">
            <strong>Prochaine étape :</strong> Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe.
            <br />
            <small className="text-blue-200/70">L'email peut prendre quelques minutes à arriver. Vérifiez également vos spams.</small>
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
        >
          Envoyer à une autre adresse
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* ✅ 2025: Affichage erreurs depuis Server Action */}
      {!state.success && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
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

      <div className="bg-white/5 border border-white/10 rounded-md p-4">
        <p className="text-sm text-white/60">
        Entrez l'adresse email associée à votre compte.
          Vous recevrez un lien pour créer un nouveau mot de passe.
        </p>
      </div>

      {/* ✅ 2025: Bouton avec état Server Action */}
      <SubmitButton />
    </form>
  )
}
