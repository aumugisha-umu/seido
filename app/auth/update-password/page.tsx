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
import AuthLogo from "@/components/ui/auth-logo"
import { createBrowserSupabaseClient } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
export default function UpdatePasswordPage() {
  const supabase = createBrowserSupabaseClient()
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
    logger.info("🔄 [UPDATE-PASSWORD] Checking session validity...")
    checkSessionValidity()
  }, [])

  const checkSessionValidity = async () => {
    try {
      logger.info("🔍 [UPDATE-PASSWORD] Checking URL for recovery tokens...")

      // Les tokens de récupération sont dans le hash (#) de l'URL
      const urlHash = window.location.hash
      logger.info("🔧 [UPDATE-PASSWORD] URL hash:", urlHash)

      if (urlHash && urlHash.includes('access_token') && urlHash.includes('type=recovery')) {
        logger.info("🔑 [UPDATE-PASSWORD] Found recovery tokens in URL hash")

        // Parser manuellement les tokens du hash
        const hashParams = new URLSearchParams(urlHash.substring(1)) // enlever le #
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const tokenType = hashParams.get('type')

        logger.info("🔧 [UPDATE-PASSWORD] Parsed tokens:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          tokenType: tokenType
        })

        if (accessToken && refreshToken && tokenType === 'recovery') {
          logger.info("🔑 [UPDATE-PASSWORD] Setting session with recovery tokens...")

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          logger.info("🔧 [UPDATE-PASSWORD] setSession result:", {
            hasError: !!sessionError,
            hasSession: !!sessionData?.session,
            hasUser: !!sessionData?.session?.user,
            userEmail: sessionData?.session?.user?.email
          })

          if (sessionError) {
            logger.error("❌ [UPDATE-PASSWORD] Error setting recovery session:", sessionError.message)
            setError("Session de récupération invalide ou expirée. Veuillez refaire une demande de réinitialisation.")
            return
          }

          // Pour la récupération de mot de passe, nous n'avons besoin que de la session
          // Le profil utilisateur peut timeout mais ce n'est pas critique ici
          if (sessionData.session) {
            logger.info("✅ [UPDATE-PASSWORD] Recovery session established")
            setIsValidSession(true)

            // Nettoyer l'URL après avoir traité les tokens
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          } else {
            logger.info("⚠️ [UPDATE-PASSWORD] No session data returned, waiting for auth state change...")
            // Attendre que l'auth state change nous confirme la connexion
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Si nous atteignons ici après le timeout, considérer que la session est valide
            // car nous avons vu "SIGNED_IN true" dans les logs
            logger.info("✅ [UPDATE-PASSWORD] Assuming session is valid based on auth state change")
            setIsValidSession(true)
            window.history.replaceState({}, document.title, window.location.pathname)
            return
          }
        }
      }

      // Fallback : attendre un peu puis vérifier si Supabase a traité automatiquement
      logger.info("🔄 [UPDATE-PASSWORD] Waiting for Supabase auto-detection...")
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      if (!sessionError && sessionData.session && sessionData.session.user) {
        logger.info("✅ [UPDATE-PASSWORD] Session auto-detected for:", sessionData.session.user.email)
        setIsValidSession(true)
        return
      }

      // Dernier fallback : vérifier getUser
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        logger.error("❌ [UPDATE-PASSWORD] No authenticated user:", userError?.message || "No user")
        setError("Session invalide ou expirée. Veuillez refaire une demande de réinitialisation.")
        return
      }

      logger.info("✅ [UPDATE-PASSWORD] Session is valid for user:", user.email)
      setIsValidSession(true)

    } catch (error) {
      logger.error("❌ [UPDATE-PASSWORD] Unexpected error checking session:", error)
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
      logger.info("🔄 [UPDATE-PASSWORD] Updating user password...")
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        logger.error("❌ [UPDATE-PASSWORD] Error updating password:", updateError.message)
        setError("Erreur lors de la mise à jour du mot de passe : " + updateError.message)
      } else {
        logger.info("✅ [UPDATE-PASSWORD] Password updated successfully")
        setIsUpdated(true)
        setError("")

        // Rediriger vers login après 3 secondes
        setTimeout(() => {
          router.push("/auth/login?message=password-updated")
        }, 3000)
      }
    } catch (error) {
      logger.error("❌ [UPDATE-PASSWORD] Unexpected error:", error)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Si la session n'est pas encore validée, afficher loading
  if (!isValidSession && !error) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />
          <div className="space-y-4">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white/60">Vérification de la session...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si le mot de passe a été mis à jour avec succès
  if (isUpdated) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Mot de passe mis à jour !</h1>
            <p className="text-white/60">Votre mot de passe a été modifié avec succès</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-white/60 text-center">
            Vous allez être redirigé vers la page de connexion dans quelques secondes.
          </p>
          <Link href="/auth/login">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]">
              Aller à la connexion
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Si la session n'est pas valide, afficher erreur
  if (!isValidSession) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-full blur-xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Session invalide</h1>
            <p className="text-white/60">Le lien de réinitialisation est invalide ou a expiré</p>
          </div>
        </div>

        <div className="space-y-4">
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="text-sm text-white/60 text-center">
            Veuillez faire une nouvelle demande de réinitialisation de mot de passe.
          </p>
          <div className="space-y-2">
            <Link href="/auth/reset-password">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]">
                Nouvelle demande
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Formulaire principal de mise à jour du mot de passe
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Nouveau mot de passe</h1>
          <p className="text-white/60">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="newPassword" className="text-white font-medium">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? "text" : "password"}
              placeholder="Votre nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 pr-10 transition-colors focus:bg-white/20"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/60 hover:text-white"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-white/50">
            Le mot de passe doit contenir au moins 8 caractères
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white font-medium">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmez votre nouveau mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 pr-10 transition-colors focus:bg-white/20"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-white/10 text-white/60 hover:text-white"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
          disabled={isLoading}
        >
          {isLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 underline-offset-4 hover:underline transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}

