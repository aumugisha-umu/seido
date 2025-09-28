"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Eye, EyeOff, CheckCircle, Shield, Check, X } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"

interface PasswordCriteria {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
}

export default function SetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [error, setError] = useState("")
  const [criteria, setCriteria] = useState<PasswordCriteria>({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false
  })

  const router = useRouter()
  const { user, loading, refreshUser } = useAuth()

  useEffect(() => {
    const checkUserPasswordStatus = async () => {
      console.log('🔐 [SET-PASSWORD] Component mounted, checking user state...')

      // Si pas d'utilisateur connecté et pas en cours de chargement, rediriger
      if (!loading && !user) {
        console.log('❌ [SET-PASSWORD] No authenticated user, redirecting to login')
        router.push('/auth/login?message=session-required')
        return
      }

      if (user) {
        console.log('✅ [SET-PASSWORD] User authenticated:', user.email, 'role:', user.role)

        // ✅ SÉCURITÉ: Vérifier que l'utilisateur a vraiment besoin de définir son mot de passe
        let shouldRedirect = user.password_set === true

        // Pour les utilisateurs JWT-only, vérifier depuis la base de données
        if (user.id.startsWith('jwt_') && !shouldRedirect) {
          try {
            const authUserId = user.id.replace('jwt_', '')
            const response = await fetch('/api/get-user-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ authUserId: authUserId })
            })

            if (response.ok) {
              const profileData = await response.json()
              if (profileData.success && profileData.user) {
                shouldRedirect = profileData.user.password_set === true
                console.log('🔍 [SET-PASSWORD] Retrieved password_set from DB:', profileData.user.password_set)
              }
            }
          } catch (error) {
            console.warn('⚠️ [SET-PASSWORD] Failed to check password_set from DB:', error)
          }
        }

        if (shouldRedirect) {
          console.log('⚠️ [SET-PASSWORD] User already has password set, redirecting to dashboard')
          const dashboardPath = `/${user.role}/dashboard`
          router.push(dashboardPath)
          return
        }
      }
    }

    checkUserPasswordStatus()
  }, [user, loading, router])

  useEffect(() => {
    // Vérifier les critères du mot de passe en temps réel
    const newCriteria: PasswordCriteria = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password)
    }
    setCriteria(newCriteria)
  }, [password])

  const isPasswordValid = () => {
    return Object.values(criteria).every(criterion => criterion)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validations
    if (!password || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      setIsLoading(false)
      return
    }

    if (!isPasswordValid()) {
      setError("Le mot de passe ne respecte pas tous les critères requis")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    try {
      console.log("🔐 [SET-PASSWORD] Updating user password...")

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error("❌ [SET-PASSWORD] Error updating password:", updateError.message)
        setError("Erreur lors de la définition du mot de passe : " + updateError.message)
      } else {
        console.log("✅ [SET-PASSWORD] Password set successfully")

        // ✅ NOUVEAU: Marquer password_set à true en base de données
        try {
          const response = await fetch('/api/update-user-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password_set: true })
          })

          if (response.ok) {
            console.log("✅ [SET-PASSWORD] password_set marked as true in database")
          } else {
            console.warn("⚠️ [SET-PASSWORD] Failed to update password_set in database")
          }
        } catch (dbError) {
          console.warn("⚠️ [SET-PASSWORD] Error updating password_set:", dbError)
        }

        setIsCompleted(true)
        setError("")

        // ✅ Refresh user data pour s'assurer de la synchronisation, puis rediriger après 1 seconde
        try {
          await refreshUser()
          console.log("✅ [SET-PASSWORD] User data refreshed")
        } catch (refreshError) {
          console.warn("⚠️ [SET-PASSWORD] Failed to refresh user data:", refreshError)
        }

        setTimeout(() => {
          if (user?.role) {
            const dashboardPath = `/${user.role}/dashboard`
            console.log("🔄 [SET-PASSWORD] Redirecting to dashboard:", dashboardPath)
            router.push(dashboardPath)
          } else {
            router.push('/auth/login')
          }
        }, 1000)
      }
    } catch (error) {
      console.error("❌ [SET-PASSWORD] Unexpected error:", error)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // État de chargement pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="flex items-center justify-center p-8">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-600">Vérification de l'authentification...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Si le mot de passe a été défini avec succès
  if (isCompleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-slate-200 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">Mot de passe défini !</CardTitle>
                <CardDescription className="text-slate-600">
                  Votre compte est maintenant configuré et prêt à être utilisé
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm text-emerald-800">
                  <strong>Bienvenue dans SEIDO !</strong><br />
                  Vous allez être redirigé vers votre tableau de bord dans quelques secondes.
                </p>
              </div>
              <Button
                onClick={() => {
                  if (user?.role) {
                    router.push(`/${user.role}/dashboard`)
                  }
                }}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
              >
                Accéder au tableau de bord
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Formulaire principal de définition du mot de passe
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-sky-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-slate-900">Définir votre mot de passe</CardTitle>
              <CardDescription className="text-slate-600">
                Bienvenue ! Choisissez un mot de passe sécurisé pour finaliser votre compte
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

              {user && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-sky-600" />
                    <p className="text-sm text-sky-800">
                      <strong>Compte :</strong> {user.email}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-900">
                  Nouveau mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white border-slate-200 pr-10"
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
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>

                {/* Critères de sécurité du mot de passe */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-slate-700">Critères de sécurité :</p>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className={`flex items-center space-x-1 ${criteria.minLength ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {criteria.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>8 caractères min.</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${criteria.hasUppercase ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {criteria.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Majuscule</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${criteria.hasLowercase ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {criteria.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Minuscule</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${criteria.hasNumber ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {criteria.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Chiffre</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-900">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-white border-slate-200 pr-10"
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
                      <EyeOff className="h-4 w-4 text-slate-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </Button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-600">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                disabled={isLoading || !isPasswordValid() || password !== confirmPassword}
              >
                {isLoading ? "Configuration..." : "Définir le mot de passe"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-500">
                En définissant votre mot de passe, vous acceptez nos conditions d'utilisation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
