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
import { Building2, Eye, EyeOff, Mail, CheckCircle, User } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

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
  
  // États pour la section "Login as demo user"
  const [demoUsers, setDemoUsers] = useState<any[]>([])
  const [selectedDemoUser, setSelectedDemoUser] = useState("")
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn, user, loading, resendConfirmation } = useAuth()

  useEffect(() => {
    // Vérifier si c'est une redirection après confirmation
    const confirmed = searchParams.get('confirmed')
    if (confirmed === 'true') {
      console.log('🎉 User confirmed email - showing success message')
      setShowConfirmationSuccess(true)
    }

    // Redirection automatique si utilisateur déjà connecté
    if (!loading && user) {
      console.log('🔄 [LOGIN] User already connected, redirecting to:', `/${user.role}/dashboard`)
      window.location.href = `/${user.role}/dashboard`
    }
  }, [user, loading, searchParams, router])

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
      const { user: authUser, error: authError } = await signIn(email, password)

      if (authError) {
        // Gérer spécifiquement l'erreur de confirmation d'email
        if (authError.message.includes('Email not confirmed')) {
          setError("Votre email n'a pas encore été confirmé. Vérifiez votre boîte de réception et cliquez sur le lien de confirmation.")
          setShowResendConfirmation(true)
        } else if (authError.message.includes('Invalid login credentials')) {
          setError("Email ou mot de passe incorrect")
        } else {
          setError("Erreur de connexion : " + authError.message)
        }
      } else if (authUser) {
        console.log("✅ [LOGIN] Connexion réussie", authUser)
        console.log("🔄 [LOGIN] Redirection vers:", `/${authUser.role}/dashboard`)
        setError("") // Clear any previous errors
        
        // Redirection complète pour s'assurer que les cookies sont bien transmis
        window.location.href = `/${authUser.role}/dashboard`
      }
    } catch (error) {
      console.error("❌ [LOGIN] Erreur de connexion:", error)
      setError("Une erreur est survenue lors de la connexion")
    } finally {
      console.log("🏁 [LOGIN] Login process finished, isLoading:", false)
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

  // Fonction pour récupérer les utilisateurs demo actifs
  const fetchDemoUsers = async () => {
    try {
      setIsLoadingUsers(true)
      console.log("🔍 Fetching active demo users...")
      
      // Récupérer les utilisateurs demo qui sont également dans auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      
      if (authError) {
        console.error("❌ Error fetching auth users:", authError)
        // Fallback: récupérer uniquement depuis la table users
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .ilike('email', 'arthur+%@seido.pm')
          .order('email')
        
        if (usersError) {
          console.error("❌ Error fetching users:", usersError)
          return
        }
        
        console.log("✅ Found demo users (fallback):", users?.length || 0)
        setDemoUsers(users || [])
        return
      }
      
      // Filtrer les utilisateurs auth qui correspondent au pattern arthur+X@seido.pm
      const demoAuthUsers = authUsers.users.filter(authUser => 
        authUser.email?.match(/^arthur\+\d+@seido\.pm$/) &&
        authUser.email_confirmed_at // S'assurer que l'email est confirmé
      )
      
      if (demoAuthUsers.length === 0) {
        console.log("⚠️ No active demo users found")
        setDemoUsers([])
        return
      }
      
      // Récupérer les détails de profil depuis la table users pour ces utilisateurs actifs
      const { data: profileUsers, error: profileError } = await supabase
        .from('users')
        .select('*')
        .in('id', demoAuthUsers.map(u => u.id))
        .order('email')
      
      if (profileError) {
        console.error("❌ Error fetching user profiles:", profileError)
        return
      }
      
      console.log("✅ Found active demo users:", profileUsers?.length || 0)
      setDemoUsers(profileUsers || [])
      
    } catch (error) {
      console.error("❌ Error in fetchDemoUsers:", error)
      // Fallback silencieux vers une liste vide
      setDemoUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // Fonction pour se connecter avec un utilisateur demo
  const handleDemoLogin = async () => {
    if (!selectedDemoUser) {
      setError("Veuillez sélectionner un utilisateur demo")
      return
    }

    const user = demoUsers.find(u => u.id === selectedDemoUser)
    if (!user) {
      setError("Utilisateur demo introuvable")
      return
    }

    setError("")
    setIsLoadingDemo(true)

    try {
      console.log("🚪 Logging in as demo user:", user.email)
      
      // Se connecter avec l'email et le mot de passe demo (Wxcvbn123)
      const { user: authUser, error: loginError } = await signIn(
        user.email,
        "Wxcvbn123"
      )

      if (loginError) {
        console.error("❌ Demo login error:", loginError)
        setError("Erreur de connexion: " + loginError.message)
      } else if (authUser) {
        console.log("✅ Demo login successful:", authUser.name)
        window.location.href = `/${authUser.role}/dashboard`
      } else {
        setError("Erreur de connexion inattendue")
      }
    } catch (error) {
      console.error("❌ Error in handleDemoLogin:", error)
      setError("Une erreur est survenue lors de la connexion")
    } finally {
      setIsLoadingDemo(false)
    }
  }

  // Charger les utilisateurs demo au montage du composant (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      fetchDemoUsers()
    }
  }, [])

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
                    <strong>Email confirmé avec succès !</strong><br />
                    Vous pouvez maintenant vous connecter avec vos identifiants.
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



            {/* Demo User Section - Development only */}
            {process.env.NODE_ENV === 'development' && demoUsers.length > 0 && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou pour tester</span>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Connexion rapide (Demo)
                  </h4>
                  
                  <div className="space-y-3">
                    <Select value={selectedDemoUser} onValueChange={setSelectedDemoUser}>
                      <SelectTrigger className="w-full bg-white border-blue-300">
                        <SelectValue placeholder={
                          isLoadingUsers ? "Chargement..." : "Choisir un utilisateur demo"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {demoUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-gray-600">{user.email}</span>
                              <span className="text-xs text-blue-600 capitalize">{user.role}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      type="button"
                      variant="default"
                      onClick={handleDemoLogin}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={isLoadingDemo || !selectedDemoUser}
                    >
                      {isLoadingDemo ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Connexion en cours...
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 mr-2" />
                          Se connecter comme
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
