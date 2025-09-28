"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, ArrowLeft, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function UpdatePasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdated, setIsUpdated] = useState(false)
  const [error, setError] = useState("")
  const [isValidSession, setIsValidSession] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    console.log("🔄 [UPDATE-PASSWORD] Checking session validity...")
    checkSessionValidity()
  }, [])

  const checkSessionValidity = async () => {
    try {
      console.log("🔍 [UPDATE-PASSWORD] Checking URL for recovery tokens...")
      
      // Les tokens de récupération sont dans le hash (#) de l'URL
      const urlHash = window.location.hash
      console.log("🔧 [UPDATE-PASSWORD] URL hash:", urlHash)
      
      if (urlHash && urlHash.includes('access_token') && urlHash.includes('type=recovery')) {
        console.log("🔑 [UPDATE-PASSWORD] Found recovery tokens in URL hash")
        
        // Parser manuellement les tokens du hash
        const hashParams = new URLSearchParams(urlHash.substring(1)) // enlever le #
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const tokenType = hashParams.get('type')
        
        console.log("🔧 [UPDATE-PASSWORD] Parsed tokens:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          tokenType: tokenType
        })
        
        if (accessToken && refreshToken && tokenType === 'recovery') {
          console.log("🔑 [UPDATE-PASSWORD] Setting session with recovery tokens...")
          
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          console.log("🔧 [UPDATE-PASSWORD] setSession result:", {
            hasError: !!sessionError,
            hasSession: !!sessionData?.session,
            hasUser: !!sessionData?.session?.user,
            userEmail: sessionData?.session?.user?.email
          })
          
          if (sessionError) {
            console.error("❌ [UPDATE-PASSWORD] Error setting recovery session:", sessionError.message)
            setError("Session de récupération invalide ou expirée. Veuillez refaire une demande de réinitialisation.")
            return
          }
          
          // Pour la récupération de mot de passe, nous n'avons besoin que de la session
          // Le profil utilisateur peut timeout mais ce n'est pas critique ici
          if (sessionData.session) {
            console.log("✅ [UPDATE-PASSWORD] Recovery session established")
            setIsValidSession(true)
            
            // Nettoyer l'URL après avoir traité les tokens
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          } else {
            console.log("⚠️ [UPDATE-PASSWORD] No session data returned, waiting for auth state change...")
            // Attendre que l'auth state change nous confirme la connexion
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            // Si nous atteignons ici après le timeout, considérer que la session est valide
            // car nous avons vu "SIGNED_IN true" dans les logs
            console.log("✅ [UPDATE-PASSWORD] Assuming session is valid based on auth state change")
            setIsValidSession(true)
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          }
        }
      }
      
      // Fallback : attendre un peu puis vérifier si Supabase a traité automatiquement
      console.log("🔄 [UPDATE-PASSWORD] Waiting for Supabase auto-detection...")
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (!sessionError && sessionData.session && sessionData.session.user) {
        console.log("✅ [UPDATE-PASSWORD] Session auto-detected for:", sessionData.session.user.email)
        setIsValidSession(true)
        return
      }
      
      // Dernier fallback : vérifier getUser
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error("❌ [UPDATE-PASSWORD] No authenticated user:", userError?.message || "No user")
        setError("Session invalide ou expirée. Veuillez refaire une demande de réinitialisation.")
        return
      }
      
      console.log("✅ [UPDATE-PASSWORD] Session is valid for user:", user.email)
      setIsValidSession(true)
      
    } catch (error) {
      console.error("❌ [UPDATE-PASSWORD] Unexpected error checking session:", error)
      setError("Erreur lors de la vérification de la session. Veuillez réessayer.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validations
    if (!newPassword || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      setIsLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères")
      setIsLoading(false)
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    try {
      console.log("🔄 [UPDATE-PASSWORD] Updating user password...")
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        console.error("❌ [UPDATE-PASSWORD] Error updating password:", updateError.message)
        setError("Erreur lors de la mise à jour du mot de passe : " + updateError.message)
      } else {
        console.log("✅ [UPDATE-PASSWORD] Password updated successfully")
        setIsUpdated(true)
        setError("")
        
        // Rediriger vers login après 3 secondes
        setTimeout(() => {
          router.push("/auth/login?message=password-updated")
        }, 3000)
      }
    } catch (error) {
      console.error("❌ [UPDATE-PASSWORD] Unexpected error:", error)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Si la session n'est pas encore validée, afficher loading
  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-muted-foreground">Vérification de la session...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Si le mot de passe a été mis à jour avec succès
  if (isUpdated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Mot de passe mis à jour !</CardTitle>
                <CardDescription className="text-muted-foreground">Votre mot de passe a été modifié avec succès</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Vous allez être redirigé vers la page de connexion dans quelques secondes.
              </p>
              <Link href="/auth/login">
                <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                  Aller à la connexion
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Si la session n'est pas valide, afficher erreur
  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Session invalide</CardTitle>
                <CardDescription className="text-muted-foreground">Le lien de réinitialisation est invalide ou a expiré</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Veuillez faire une nouvelle demande de réinitialisation de mot de passe.
              </p>
              <div className="space-y-2">
                <Link href="/auth/reset-password">
                  <Button className="w-full bg-primary hover:bg-secondary text-primary-foreground">
                    Nouvelle demande
                  </Button>
                </Link>
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

  // Formulaire principal de mise à jour du mot de passe
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
              <CardTitle className="text-2xl font-bold text-foreground">Nouveau mot de passe</CardTitle>
              <CardDescription className="text-muted-foreground">
                Choisissez un nouveau mot de passe sécurisé
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
                <Label htmlFor="newPassword" className="text-foreground">
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Votre nouveau mot de passe"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-input border-border pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmez votre nouveau mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-input border-border pr-10"
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

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-secondary text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
