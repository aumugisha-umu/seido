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
      className="w-full bg-primary hover:bg-secondary text-primary-foreground"
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Email envoyé avec succès ! 📧
          </h3>
          <p className="text-muted-foreground">
            Vérifiez votre boîte de réception à l'adresse{" "}
            <span className="font-semibold">{state.data.email}</span>
          </p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Mail className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Prochaine étape :</strong> Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe.
            <br />
            <small>L'email peut prendre quelques minutes à arriver. Vérifiez également vos spams.</small>
          </AlertDescription>
        </Alert>

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="w-full"
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
        <Label htmlFor="email" className="text-foreground">
          Adresse email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-input border-border"
          required
        />
      </div>

      <div className="bg-muted/20 border border-muted/50 rounded-md p-4">
        <p className="text-sm text-muted-foreground">
          <strong>Important :</strong> Entrez l'adresse email associée à votre compte.
          Vous recevrez un lien pour créer un nouveau mot de passe.
        </p>
      </div>

      {/* ✅ 2025: Bouton avec état Server Action */}
      <SubmitButton />
    </form>
  )
}
