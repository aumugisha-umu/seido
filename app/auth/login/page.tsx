"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Eye, EyeOff, Mail, CheckCircle } from "@/lib/icons"
import { useAuth } from "@/hooks/use-auth"
// Redirections supprimées - gérées par le middleware
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showResendConfirmation, setShowResendConfirmation] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [showConfirmationSuccess, setShowConfirmationSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, user, loading, resendConfirmation } = useAuth()

  useEffect(() => {
    // ✅ REFACTORISÉ: Uniquement gestion des messages de succès
    const confirmed = searchParams.get('confirmed')
    const message = searchParams.get('message')

    if (confirmed === 'true') {
      console.log('🎉 [LOGIN-REFACTORED] User confirmed email - showing success message')
      setShowConfirmationSuccess(true)
    }

    if (message === 'password-updated') {
      console.log('🔑 [LOGIN-REFACTORED] User updated password - showing success message')
      setShowConfirmationSuccess(true)
    }

    if (message === 'session-required') {
      console.log('🔐 [LOGIN-REFACTORED] Session required for password setup - showing info message')
      setError("Vous devez être connecté pour accéder à la configuration du mot de passe")
    }

    console.log('🔄 [LOGIN-REFACTORED] Login page loaded - no auto-redirections')
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (!email || !password) {
      setError("Veuillez remplir tous les champs")
      setIsLoading(false)
      return
    }

    try {
      console.log("🚀 [LOGIN-REFACTORED] Starting signIn process for:", email)

      const { user: authUser, error: authError } = await signIn(email, password)

      if (authError) {
        console.log("❌ [LOGIN-REFACTORED] Authentication error:", authError.message)

        // ✅ REFACTORISÉ: Gestion d'erreurs simplifiée
        if (authError.message.includes('Email not confirmed')) {
          setError("Votre email n'a pas encore été confirmé. Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.")
          setShowResendConfirmation(true)
        } else if (authError.message.includes('Invalid login credentials')) {
          setError("Email ou mot de passe incorrect")
        } else {
          setError("Erreur de connexion : " + authError.message)
        }
      } else if (authUser) {
        console.log("✅ [LOGIN-REFACTORED] Login successful for:", authUser.email, "role:", authUser.role)
        setError("")

        // ✅ REFACTORISÉ: Redirection immédiate via router
        const dashboardPath = `/${authUser.role}/dashboard`
        console.log("🔄 [LOGIN-REFACTORED] Redirecting immediately to:", dashboardPath)

        router.push(dashboardPath)

      } else {
        console.log("⚠️ [LOGIN-REFACTORED] No user and no error - unusual state")
        setError("Erreur de connexion inattendue")
      }
    } catch (error) {
      console.error("❌ [LOGIN-REFACTORED] Exception during login:", error)
      setError("Une erreur est survenue lors de la connexion")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError("Veuillez entrer votre email d'abord")
      return
    }

    setResendLoading(true)
    setResendSuccess(false)
    
    try {
      const { error: resendError } = await resendConfirmation(email)
      
      if (resendError) {
        setError("Erreur lors de l'envoi de l'email de confirmation")
      } else {
        setResendSuccess(true)
        setError("")
      }
    } catch (error) {
      console.error("Erreur lors du renvoi de confirmation:", error)
      setError("Une erreur est survenue lors du renvoi de l'email")
    } finally {
      setResendLoading(false)
    }
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
              <CardTitle className="text-2xl font-bold text-foreground">Connexion à SEIDO</CardTitle>
              <CardDescription className="text-muted-foreground">
                Accédez à votre espace de gestion immobilière
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {showConfirmationSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {searchParams.get('message') === 'password-updated' ? (
                      <>
                        <strong>Mot de passe mis à jour avec succès !</strong><br />
                        Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                      </>
                    ) : (
                      <>
                        <strong>Email confirmé avec succès !</strong><br />
                        Vous pouvez maintenant vous connecter avec vos identifiants.
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
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

              {showResendConfirmation && (
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

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-border pr-10"
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
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/auth/reset-password"
                  className="text-sm text-primary hover:text-secondary underline-offset-4 hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-secondary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>



            <div className="mt-6 text-center">
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
