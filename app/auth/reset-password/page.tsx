"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, ArrowLeft, Mail } from "lucide-react"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulation d'envoi d'email
    setTimeout(() => {
      if (email) {
        setIsEmailSent(true)
      } else {
        setError("Veuillez saisir votre adresse email")
      }
      setIsLoading(false)
    }, 1000)
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Email envoyé !</CardTitle>
                <CardDescription className="text-muted-foreground">Vérifiez votre boîte de réception</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Nous avons envoyé un lien de réinitialisation à{" "}
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Si vous ne recevez pas l'email dans les prochaines minutes, vérifiez votre dossier spam ou réessayez.
              </p>
              <div className="space-y-2">
                <Button onClick={() => setIsEmailSent(false)} variant="outline" className="w-full">
                  Renvoyer l'email
                </Button>
                <Link href="/auth/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Mot de passe oublié ?</CardTitle>
              <CardDescription className="text-muted-foreground">
                Saisissez votre email pour recevoir un lien de réinitialisation
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input border-border"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-secondary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-sm text-primary hover:text-secondary underline-offset-4 hover:underline"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Retour à la connexion
              </Link>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  href="/auth/signup"
                  className="text-primary hover:text-secondary underline-offset-4 hover:underline font-medium"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
