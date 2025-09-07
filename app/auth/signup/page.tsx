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
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Eye, EyeOff, Check, CheckCircle, Mail, User, Phone } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { userService, teamService, contactService } from "@/lib/database-service"
import { supabase } from "@/lib/supabase"

export default function SignupPage() {
  const router = useRouter()
  const { signUp, signIn, user, loading } = useAuth()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    acceptTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [justSignedUp, setJustSignedUp] = useState(false)

  // Rediriger si déjà connecté ou après inscription
  useEffect(() => {
    if (!loading && user) {
      console.log('🔄 [SIGNUP] User state detected, redirecting to:', user.role)
      // Utiliser window.location pour une redirection plus fiable après signup
      if (justSignedUp) {
        console.log('🚀 [SIGNUP] Using window.location for post-signup redirect')
        window.location.href = `/${user.role}/dashboard`
      } else {
        console.log('🔄 [SIGNUP] Using router.push for existing user')
        router.push(`/${user.role}/dashboard`)
      }
    }
  }, [user, loading, router, justSignedUp])

  const passwordRequirements = [
    { text: "Au moins 8 caractères", met: formData.password.length >= 8 },
    { text: "Une majuscule", met: /[A-Z]/.test(formData.password) },
    { text: "Une minuscule", met: /[a-z]/.test(formData.password) },
    { text: "Un chiffre", met: /\d/.test(formData.password) },
  ]

  // Fonction pour générer un email de test unique
  const generateDemoEmail = () => {
    const timestamp = Date.now()
    const randomNum = Math.floor(Math.random() * 1000)
    return `arthur+${timestamp}${randomNum}@seido.pm`
  }

  // Fonction pour obtenir le prochain numéro email disponible depuis l'API
  const getNextEmailNumber = async (): Promise<number> => {
    try {
      const response = await fetch('/api/demo-email-counter')
      if (!response.ok) {
        throw new Error('Failed to fetch email counter')
      }
      const data = await response.json()
      console.log("📧 Next email number from server:", data.nextEmailNumber)
      return data.nextEmailNumber
    } catch (error) {
      console.warn("Impossible de lire le compteur depuis l'API:", error)
      return Date.now() % 10000 // Fallback avec timestamp
    }
  }

  // Fonction pour sauvegarder le dernier numéro utilisé via l'API
  const saveLastEmailNumber = async (number: number): Promise<void> => {
    try {
      const response = await fetch('/api/demo-email-counter', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lastEmailNumber: number })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save email counter')
      }
      
      const data = await response.json()
      console.log("📝 Saved last email number to server:", number)
      console.log("🎯 Total demo environments:", data.totalEnvironments)
    } catch (error) {
      console.warn("Impossible de sauvegarder le compteur via l'API:", error)
    }
  }

  // Fonction pour générer un email avec un numéro incrémental
  const generateIncrementalEmail = (number: number) => {
    return `arthur+${number}@seido.pm`
  }

  // Générer un nom et prénom aléatoire réaliste
  const generateRandomName = () => {
    const prenoms = [
      "Alexandre", "Antoine", "Arthur", "Baptiste", "Benjamin", "Charles", "Clément", "Damien", "David", "Étienne",
      "François", "Gabriel", "Guillaume", "Hugo", "Jean", "Julien", "Lucas", "Maxime", "Nicolas", "Olivier",
      "Pierre", "Quentin", "Raphaël", "Sébastien", "Thomas", "Vincent", "Yann", "Adrien", "Aurélien", "Mathieu",
      "Amélie", "Anne", "Camille", "Charlotte", "Claire", "Élise", "Emma", "Julie", "Laura", "Léa",
      "Louise", "Manon", "Marie", "Mathilde", "Pauline", "Sarah", "Sophie", "Valérie", "Virginie", "Zoé"
    ]
    
    const noms = [
      "Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent",
      "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard",
      "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau", "Vincent", "Muller", "Lefevre", "Faure", "Andre",
      "Mercier", "Blanc", "Guerin", "Boyer", "Garnier", "Chevalier", "Francois", "Legrand", "Gauthier", "Garcia",
      "Perrin", "Robin", "Clement", "Morin", "Nicolas", "Henry", "Roussel", "Matthieu", "Gautier", "Masson"
    ]

    const randomPrenom = prenoms[Math.floor(Math.random() * prenoms.length)]
    const randomNom = noms[Math.floor(Math.random() * noms.length)]
    
    return {
      firstName: randomPrenom,
      lastName: randomNom,
      fullName: `${randomPrenom} ${randomNom}`
    }
  }

  // Créer un utilisateur demo avec équipe complète
  const handleDemoSignup = async () => {
    setError("")
    setIsLoading(true)

    try {
      const demoPassword = "Wxcvbn123"
      const mainUserName = generateRandomName()
      let currentEmailNumber = await getNextEmailNumber()
      
      console.log("🧪 Creating main demo user:", mainUserName.fullName)
      console.log("📧 Starting email numbers from:", currentEmailNumber)
      
      // 1. Créer l'utilisateur gestionnaire principal
      const { user: mainAuthUser, error: mainAuthError } = await signUp({
        email: generateDemoEmail(),
        password: demoPassword,
        name: mainUserName.fullName,
        first_name: mainUserName.firstName,
        last_name: mainUserName.lastName,
        phone: undefined,
      })

      if (mainAuthError || !mainAuthUser) {
        setError("Erreur lors de la création du compte demo principal: " + (mainAuthError?.message || "Erreur inconnue"))
        return
      }

      console.log("✅ Main user created:", mainAuthUser.id)

      // 2. Récupérer l'équipe du gestionnaire principal
      const userTeams = await teamService.getUserTeams(mainAuthUser.id)
      if (userTeams.length === 0) {
        setError("Aucune équipe trouvée pour l'utilisateur principal")
        return
      }
      
      const mainTeam = userTeams[0]
      console.log("🏢 Main team found:", mainTeam.id, "for user:", mainAuthUser.id)
      console.log("📋 Team details:", { id: mainTeam.id, name: mainTeam.name })

      // 3. ✅ CORRECTION: Ne créer QUE le gestionnaire principal (pas d'additionnels)
      console.log("✅ Gestionnaire principal créé - pas de gestionnaires additionnels")
      console.log("🔧 Cela évite les problèmes de synchronisation auth/database")

      // 4. Créer 3 locataires comme contacts
      console.log("🏠 Creating 3 tenant contacts...")
      
      const tenantContacts = []
      for (let i = 1; i <= 3; i++) {
        try {
          const tenantName = generateRandomName()
          const tenantEmail = generateIncrementalEmail(currentEmailNumber)
          
          console.log(`📝 Creating tenant contact ${i}: ${tenantName.fullName} (${tenantEmail}) for team: ${mainTeam.id}`)
          
          const tenantContact = await contactService.create({
            name: tenantName.fullName,
            email: tenantEmail,
            phone: `06${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
            company: 'Locataire',
            speciality: 'autre',
            notes: 'Contact créé automatiquement - Locataire demo',
            team_id: mainTeam.id,
            is_active: true
          })

          tenantContacts.push(tenantContact)
          console.log(`✅ Tenant contact ${i} created with team_id:`, tenantContact.team_id)
          
          // Incrémenter le numéro d'email pour le prochain
          currentEmailNumber++
          
        } catch (error) {
          console.error(`❌ Error creating tenant contact ${i}:`, error)
          // En cas d'erreur, on continue mais on incrémente quand même pour éviter les conflits
          currentEmailNumber++
        }
      }

      // 5. Créer 3 prestataires comme contacts
      console.log("🔧 Creating 3 provider contacts...")
      
      const specialities = ['plomberie', 'electricite', 'chauffage']
      const providerContacts = []
      
      for (let i = 1; i <= 3; i++) {
        try {
          const providerName = generateRandomName()
          const providerEmail = generateIncrementalEmail(currentEmailNumber)
          const speciality = specialities[i - 1]
          
          console.log(`📝 Creating provider contact ${i}: ${providerName.fullName} (${providerEmail}) - ${speciality} for team: ${mainTeam.id}`)
          
          const providerContact = await contactService.create({
            name: providerName.fullName,
            email: providerEmail,
            phone: `06${Math.floor(Math.random() * 10000000).toString().padStart(8, '0')}`,
            company: `${providerName.lastName} ${speciality.charAt(0).toUpperCase() + speciality.slice(1)}`,
            speciality: speciality,
            notes: `Contact créé automatiquement - Prestataire ${speciality} demo`,
            team_id: mainTeam.id,
            is_active: true
          })

          providerContacts.push(providerContact)
          console.log(`✅ Provider contact ${i} created with team_id:`, providerContact.team_id)
          
          // Incrémenter le numéro d'email pour le prochain
          currentEmailNumber++
          
        } catch (error) {
          console.error(`❌ Error creating provider contact ${i}:`, error)
          // En cas d'erreur, on continue mais on incrémente quand même pour éviter les conflits
          currentEmailNumber++
        }
      }

      console.log("🎉 Demo environment created successfully!")
      console.log(`✅ Main user: ${mainAuthUser.name}`)
      console.log(`✅ Additional managers: 0 (removed to fix sync issues)`)
      console.log(`✅ Tenant contacts: ${tenantContacts.length}`)
      console.log(`✅ Provider contacts: ${providerContacts.length}`)
      console.log(`🏢 All contacts linked to team: ${mainTeam.id} (${mainTeam.name})`)

      // Sauvegarder le dernier numéro d'email utilisé
      await saveLastEmailNumber(currentEmailNumber - 1)
      console.log(`📧 Last email number saved: ${currentEmailNumber - 1}`)

      // Marquer qu'on vient de s'inscrire et laisser le useEffect gérer la redirection
      console.log("✅ [DEMO-SIGNUP] Environnement demo créé, redirection sera gérée par useEffect")
      setJustSignedUp(true)
      
    } catch (error) {
      console.error("❌ Erreur d'inscription demo:", error)
      setError("Une erreur est survenue lors de la création de l'environnement demo")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation des champs
    if (!formData.firstName.trim()) {
      setError("Veuillez entrer votre prénom")
      return
    }

    if (!formData.lastName.trim()) {
      setError("Veuillez entrer votre nom")
      return
    }

    if (!formData.email.trim()) {
      setError("Veuillez entrer votre email")
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas")
      return
    }

    if (!formData.acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation")
      return
    }

    if (!passwordRequirements.every((req) => req.met)) {
      setError("Le mot de passe ne respecte pas tous les critères")
      return
    }

    setIsLoading(true)

    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`
      const { user: authUser, error: authError } = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        name: fullName,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim() || undefined,
      })

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setError("Un compte avec cet email existe déjà")
        } else {
          setError("Erreur lors de la création du compte: " + authError.message)
        }
      } else if (authUser) {
        console.log("✅ [SIGNUP] Compte créé avec succès, user state sera mis à jour par useAuth")
        console.log("👤 [SIGNUP] User créé:", authUser.name, "role:", authUser.role)
        // Marquer qu'on vient de s'inscrire pour utiliser window.location dans useEffect
        setJustSignedUp(true)
        // Ne pas faire de redirection ici - laisser le useEffect s'en charger
        // quand l'état user sera mis à jour par le hook useAuth
      } else {
        setError("Erreur inattendue lors de la création du compte")
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error)
      setError("Une erreur est survenue lors de la création du compte")
    } finally {
      setIsLoading(false)
    }
  }




  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center space-y-6 pb-8">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
                <Building2 className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Rejoindre SEIDO
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base mt-2">
                Créez votre compte et accédez immédiatement à votre espace
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground font-medium">
                    Prénom
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Votre prénom"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    className="bg-input border-border h-11 transition-colors focus:border-primary"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground font-medium">
                    Nom
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Votre nom de famille"
                    value={formData.lastName}
                    onChange={(e) => updateFormData("lastName", e.target.value)}
                    className="bg-input border-border h-11 transition-colors focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Adresse email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className="bg-input border-border h-11 transition-colors focus:border-primary"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Créez un mot de passe sécurisé"
                    value={formData.password}
                    onChange={(e) => updateFormData("password", e.target.value)}
                    className="bg-input border-border h-11 pr-10 transition-colors focus:border-primary"
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
                {formData.password && (
                  <div className="bg-muted/20 border border-muted/50 rounded-md p-3 space-y-1.5">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2.5 text-xs">
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                          req.met ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                        }`}>
                          <Check className="h-2.5 w-2.5" />
                        </div>
                        <span className={`${req.met ? "text-green-700 font-medium" : "text-muted-foreground"} transition-colors`}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmez votre mot de passe"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                    className="bg-input border-border h-11 pr-10 transition-colors focus:border-primary"
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

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground font-medium">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone (optionnel)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Votre numéro de téléphone"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  className="bg-input border-border h-11 transition-colors focus:border-primary"
                />
              </div>

              {/* Terms and Conditions Section */}
              <div className="bg-muted/30 border border-muted rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="terms"
                    checked={formData.acceptTerms}
                    onCheckedChange={(checked) => updateFormData("acceptTerms", checked as boolean)}
                    className="mt-0.5 h-5 w-5 border-2 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground"
                  />
                  <div className="flex-1">
                    <Label htmlFor="terms" className="text-sm text-foreground leading-relaxed cursor-pointer">
                      <div>
                        En créant mon compte, j'accepte les{" "}
                        <Link
                          href="/terms"
                          className="text-primary hover:text-primary/80 underline decoration-primary/60 underline-offset-2 font-medium transition-colors"
                        >
                          conditions d'utilisation
                        </Link>
                      </div>
                      <div>
                        et la{" "}
                        <Link
                          href="/privacy"
                          className="text-primary hover:text-primary/80 underline decoration-primary/60 underline-offset-2 font-medium transition-colors"
                        >
                          politique de confidentialité
                        </Link>{" "}
                        de SEIDO.
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
                disabled={isLoading || !formData.acceptTerms}
              >
                {isLoading ? "Création du compte..." : "Créer mon compte et accéder"}
              </Button>
              </form>

              {/* Demo User Button - Development only */}
              {process.env.NODE_ENV === 'development' && (
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou pour tester</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDemoSignup}
                  className="w-full mt-4 border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 transition-all duration-200"
                  disabled={isLoading}
                >
                  <User className="w-4 h-4 mr-2" />
                  {isLoading ? "Création de l'environnement demo..." : "Créer environnement demo complet"}
                </Button>
                
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Crée automatiquement : 1 gestionnaire principal + 3 gestionnaires équipe + 3 locataires + 3 prestataires
                </p>
                <p className="text-xs text-muted-foreground mt-1 text-center">
                  Emails auto-générés (arthur+X@seido.pm) • Mot de passe : Wxcvbn123 • Tracking serveur
                </p>

              </div>
              )}

              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link
                    href="/auth/login"
                    className="text-primary hover:text-primary/80 underline decoration-primary/60 underline-offset-2 font-medium transition-colors"
                  >
                    Se connecter
                  </Link>
                </p>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
