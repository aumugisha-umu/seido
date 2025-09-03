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
import { Building2, Eye, EyeOff, Check, CheckCircle, Mail } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function SignupPage() {
  const router = useRouter()
  const { signUp, user, loading } = useAuth()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Rediriger si déjà connecté
  useEffect(() => {
    if (!loading && user) {
      router.push(`/dashboard/${user.role}`)
    }
  }, [user, loading, router])

  const passwordRequirements = [
    { text: "Au moins 8 caractères", met: formData.password.length >= 8 },
    { text: "Une majuscule", met: /[A-Z]/.test(formData.password) },
    { text: "Une minuscule", met: /[a-z]/.test(formData.password) },
    { text: "Un chiffre", met: /\d/.test(formData.password) },
  ]

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
        role: "gestionnaire",
      })

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setError("Un compte avec cet email existe déjà")
        } else {
          setError("Erreur lors de la création du compte: " + authError.message)
        }
      } else if (authUser) {
        console.log("✅ Compte créé avec succès", authUser)
        setError("") // Clear any previous errors
        setSuccess(true) // Afficher le message de succès
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
                Créez votre compte pour commencer
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {success ? (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    Compte créé avec succès !
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Mail className="w-5 h-5" />
                      <span className="font-medium">Vérifiez votre email</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Un email de confirmation a été envoyé à <strong>{formData.email}</strong>. 
                      Cliquez sur le lien de confirmation avant de vous connecter.
                    </p>
                    <p className="text-xs text-blue-600">
                      N'oubliez pas de vérifier vos spams si vous ne trouvez pas l'email.
                    </p>
                  </div>
                  <Link
                    href="/auth/login"
                    className="inline-block w-full"
                  >
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      Aller à la connexion
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
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
                {isLoading ? "Création du compte..." : "Créer mon compte"}
              </Button>
              </form>

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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
