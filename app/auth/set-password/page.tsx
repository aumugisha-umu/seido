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
import AuthLogo from "@/components/ui/auth-logo"
import { useAuth } from "@/hooks/use-auth"
import { createBrowserSupabaseClient } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
import { PWAInstallPromptModal } from '@/components/pwa/pwa-install-prompt-modal'
interface PasswordCriteria {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
}

export default function SetPasswordPage() {
  const supabase = createBrowserSupabaseClient()
  const [_password, setPassword] = useState("")
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
  const [showPWAPrompt, setShowPWAPrompt] = useState(false)
  // ✅ CRITIQUE: Initialisation SYNCHRONE de isWaitingForSession
  // Détecte verified=true immédiatement, avant tout useEffect
  const [isWaitingForSession, setIsWaitingForSession] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const isVerified = urlParams.get('verified') === 'true'

      if (isVerified) {
        logger.info('✅ [SET-PASSWORD] Detected verified=true SYNCHRONOUSLY, activating grace period')
      }

      return isVerified
    }
    return false
  })

  const router = useRouter()
  const { user, loading, refreshUser } = useAuth()

  // ✅ Timer pour désactiver la période de grâce après 5 secondes
  // Augmenté de 2s → 5s pour laisser plus de temps à onAuthStateChange de fire
  useEffect(() => {
    if (isWaitingForSession) {
      logger.info('⏱️ [SET-PASSWORD] Starting 5s grace period for session sync...')

      const graceTimer = setTimeout(() => {
        logger.info('⏱️ [SET-PASSWORD] Grace period ended, proceeding with auth check')
        setIsWaitingForSession(false)
      }, 5000)

      return () => clearTimeout(graceTimer)
    }
  }, [isWaitingForSession])

  useEffect(() => {
    const checkUserPasswordStatus = async () => {
      logger.info('🔐 [SET-PASSWORD] Component mounted, checking user state...')

      // ✅ NOUVEAU: Vérifier que l'utilisateur vient d'un callback invitation valide
      const callbackContext = sessionStorage.getItem('auth_callback_context')
      if (callbackContext) {
        logger.info('⚠️ [SET-PASSWORD] Found orphaned callback context, cleaning up')
        sessionStorage.removeItem('auth_callback_context')
      }

      // ✅ CRITIQUE: Ne pas rediriger si on attend la synchronisation de session
      if (isWaitingForSession) {
        logger.info('⏳ [SET-PASSWORD] Waiting for session sync, skipping auth check...')
        return
      }

      // ✅ PATTERN DE DOUBLE VÉRIFICATION
      // Si useAuth() ne voit pas de user, vérifier directement avec Supabase
      if (!loading && !user) {
        logger.info('🔍 [SET-PASSWORD] useAuth has no user, performing direct session check...')

        try {
          // Vérification directe avec Supabase (bypass du contexte)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          if (sessionError) {
            logger.error('❌ [SET-PASSWORD] Error getting session directly:', sessionError)
          } else if (session?.user) {
            logger.info('✅ [SET-PASSWORD] Found session directly! User:', session.user.email)
            logger.info('🔄 [SET-PASSWORD] Forcing context refresh to sync useAuth()...')

            // Forcer refresh du contexte (asynchrone, se mettra à jour au prochain render)
            await refreshUser()

            // ✅ CRITIQUE: Ne PAS attendre que user se mette à jour dans un polling
            // React state changes are async and won't be visible in same render cycle
            // Si session existe, on reste sur la page. L'utilisateur peut définir son mot de passe.
            logger.info('✅ [SET-PASSWORD] Session exists, staying on page. User context will sync eventually.')
            return // Ne pas rediriger - la session suffit
          } else {
            logger.info('ℹ️ [SET-PASSWORD] No session found in direct check either')
          }
        } catch (error) {
          logger.error('❌ [SET-PASSWORD] Exception during direct session check:', error)
        }

        // Si vraiment aucune session n'existe nulle part, rediriger
        logger.info('❌ [SET-PASSWORD] No session found anywhere, redirecting to login')
        router.push('/auth/login?message=session-required')
        return
      }

      if (user) {
        logger.info('✅ [SET-PASSWORD] User authenticated:', user.email, 'role:', user.role)

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
                logger.info('🔍 [SET-PASSWORD] Retrieved password_set from DB:', profileData.user.password_set)
              }
            }
          } catch (error) {
            logger.warn('⚠️ [SET-PASSWORD] Failed to check password_set from DB:', error)
          }
        }

        if (shouldRedirect) {
          logger.info('⚠️ [SET-PASSWORD] User already has password set, redirecting to dashboard')
          const dashboardPath = `/${user.role}/dashboard`

          // ✅ SÉCURITÉ: Utiliser router.replace pour éviter retour en arrière
          router.replace(dashboardPath)
          return
        }

        logger.info('✅ [SET-PASSWORD] User needs to set password, showing form')
      }
    }

    checkUserPasswordStatus()
  }, [user, loading, router, isWaitingForSession])

  // ✅ NOUVEAU: Timeout de sécurité - si user reste null après 15s, forcer redirection login
  // Désactivé si on vient d'un flow vérifié (isWaitingForSession)
  // Augmenté à 15s pour laisser le temps aux vérifications de session
  useEffect(() => {
    // Ne pas appliquer ce timeout si on attend la synchronisation
    if (isWaitingForSession) {
      logger.info('⏸️ [SET-PASSWORD] Security timeout disabled during grace period')
      return
    }

    const securityTimeout = setTimeout(() => {
      if (!loading && !user) {
        logger.warn('⚠️ [SET-PASSWORD] Security timeout - no user after 15s, redirecting to login')
        window.location.href = '/auth/login?reason=timeout'
      }
    }, 15000)

    return () => clearTimeout(securityTimeout)
  }, [user, loading, isWaitingForSession])

  useEffect(() => {
    // Vérifier les critères du mot de passe en temps réel
    const newCriteria: PasswordCriteria = {
      minLength: _password.length >= 8,
      hasUppercase: /[A-Z]/.test(_password),
      hasLowercase: /[a-z]/.test(_password),
      hasNumber: /\d/.test(_password)
    }
    setCriteria(newCriteria)
  }, [_password])

  // 📱 PWA: Déclencher automatiquement le prompt après succès
  useEffect(() => {
    if (isCompleted) {
      const timer = setTimeout(() => {
        logger.info('📱 [SET-PASSWORD] Triggering PWA prompt after password setup success')
        setShowPWAPrompt(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isCompleted])

  const isPasswordValid = () => {
    return Object.values(criteria).every(criterion => criterion)
  }

  const handlePWAInstallSuccess = (notificationsEnabled: boolean) => {
    logger.info('✅ [SET-PASSWORD] PWA installed successfully', { notificationsEnabled })
  }

  const handlePWADismiss = () => {
    logger.info('❌ [SET-PASSWORD] PWA prompt dismissed by user')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validations
    if (!_password || !confirmPassword) {
      setError("Veuillez remplir tous les champs")
      setIsLoading(false)
      return
    }

    if (!isPasswordValid()) {
      setError("Le mot de passe ne respecte pas tous les critères requis")
      setIsLoading(false)
      return
    }

    if (_password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      setIsLoading(false)
      return
    }

    try {
      logger.info("🔐 [SET-PASSWORD] Updating user password...")

      const { error: updateError } = await supabase.auth.updateUser({
        password: _password
      })

      if (updateError) {
        logger.error("❌ [SET-PASSWORD] Error updating password:", updateError.message)
        setError("Erreur lors de la définition du mot de passe : " + updateError.message)
      } else {
        logger.info("✅ [SET-PASSWORD] Password set successfully")

        // ✅ ÉTAPE 1: Marquer password_set à true en base de données
        try {
          const response = await fetch('/api/update-user-profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password_set: true })
          })

          if (response.ok) {
            logger.info("✅ [SET-PASSWORD] password_set marked as true in database")
          } else {
            logger.warn("⚠️ [SET-PASSWORD] Failed to update password_set in database")
          }
        } catch (dbError) {
          logger.warn("⚠️ [SET-PASSWORD] Error updating password_set:", dbError)
        }

        // ✅ ÉTAPE 2: Mettre à jour statut invitation si applicable
        try {
          const invitationResponse = await fetch('/api/accept-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })

          if (invitationResponse.ok) {
            logger.info("✅ [SET-PASSWORD] Invitation marked as accepted")
          } else {
            logger.warn("⚠️ [SET-PASSWORD] Failed to update invitation status (non-blocking)")
          }
        } catch (invError) {
          logger.warn("⚠️ [SET-PASSWORD] Error updating invitation:", invError)
        }

        // ✅ CORRECTIF (2025-10-07): Attendre propagation Supabase
        logger.info("⏳ [SET-PASSWORD] Waiting for session propagation...")
        await new Promise(resolve => setTimeout(resolve, 500))

        // Vérifier que la session est bien mise à jour
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          logger.error("❌ [SET-PASSWORD] Session lost after password update")
          setError("Session perdue. Veuillez vous reconnecter.")
          setIsLoading(false)
          return
        }

        logger.info("✅ [SET-PASSWORD] Session still valid after password update")

        setIsCompleted(true)
        setError("")

        // ✅ CORRECTIF (2025-10-07): Hard redirect avec window.location (bypass Next.js cache)
        setTimeout(() => {
          if (user?.role) {
            const dashboardPath = `/${user.role}/dashboard`
            logger.info("🔄 [SET-PASSWORD] Hard redirect to dashboard:", dashboardPath)
            window.location.href = dashboardPath  // Hard redirect au lieu de router.push
          } else {
            window.location.href = '/auth/login'
          }
        }, 1500)  // Augmenté à 1.5s pour laisser temps à la session de se propager
      }
    } catch (error) {
      logger.error("❌ [SET-PASSWORD] Unexpected error:", error)
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // État de chargement pendant la vérification de l'authentification OU période de grâce
  if (loading || isWaitingForSession) {
    return (
      <div className="w-full space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <AuthLogo />
          <div className="space-y-4">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-white/60">
              {isWaitingForSession
                ? 'Synchronisation de votre session...'
                : 'Vérification de l\'authentification...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Si le mot de passe a été défini avec succès
  if (isCompleted) {
    return (
      <>
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
              <h1 className="text-3xl font-bold tracking-tight text-white">Mot de passe défini !</h1>
              <p className="text-white/60">
                Votre compte est maintenant configuré et prêt à être utilisé
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-green-200">
                <strong>Bienvenue dans SEIDO !</strong><br />
                Vous allez être redirigé vers votre tableau de bord dans quelques secondes.
              </p>
            </div>
            <Button
              onClick={() => {
                if (user?.role) {
                  const dashboardPath = `/${user.role}/dashboard`
                  logger.info("🔄 [SET-PASSWORD] Manual redirect to dashboard:", dashboardPath)
                  window.location.href = dashboardPath
                } else {
                  window.location.href = '/auth/login'
                }
              }}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
            >
              Accéder au tableau de bord
            </Button>
          </div>
        </div>

        <PWAInstallPromptModal
          isOpen={showPWAPrompt}
          onClose={() => setShowPWAPrompt(false)}
          onInstallSuccess={handlePWAInstallSuccess}
          onDismiss={handlePWADismiss}
        />
      </>
    )
  }

  // Formulaire principal de définition du mot de passe
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <AuthLogo />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Définir votre mot de passe</h1>
          <p className="text-white/60">
            Bienvenue ! Choisissez un mot de passe sécurisé pour finaliser votre compte
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {user && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-blue-200">
                <strong>Compte :</strong> {user.email}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" className="text-white font-medium">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Votre mot de passe"
              value={_password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-11 pr-10 transition-colors focus:bg-white/20"
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
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Critères de sécurité du mot de passe */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-white/80">Critères de sécurité :</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className={`flex items-center space-x-1 ${criteria.minLength ? 'text-green-400' : 'text-white/50'}`}>
                {criteria.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>8 caractères min.</span>
              </div>
              <div className={`flex items-center space-x-1 ${criteria.hasUppercase ? 'text-green-400' : 'text-white/50'}`}>
                {criteria.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Majuscule</span>
              </div>
              <div className={`flex items-center space-x-1 ${criteria.hasLowercase ? 'text-green-400' : 'text-white/50'}`}>
                {criteria.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Minuscule</span>
              </div>
              <div className={`flex items-center space-x-1 ${criteria.hasNumber ? 'text-green-400' : 'text-white/50'}`}>
                {criteria.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Chiffre</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-white font-medium">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirmez votre mot de passe"
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
          {confirmPassword && _password !== confirmPassword && (
            <p className="text-xs text-red-400">Les mots de passe ne correspondent pas</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02]"
          disabled={isLoading || !isPasswordValid() || _password !== confirmPassword}
        >
          {isLoading ? "Configuration..." : "Définir le mot de passe"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-white/50">
          En définissant votre mot de passe, vous acceptez nos conditions d'utilisation
        </p>
      </div>
    </div>
  )
}
