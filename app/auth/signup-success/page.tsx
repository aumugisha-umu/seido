"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Building2, CheckCircle, User, Phone } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

export default function SignupSuccessPage() {
  const router = useRouter()
  const { completeProfile, getCurrentAuthSession } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authUser, setAuthUser] = useState<any | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Vérifier la session auth (sans chercher le profil utilisateur)
  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        const { authUser, error } = await getCurrentAuthSession()
        
        if (error || !authUser) {
          console.log("❌ No valid auth session, redirecting to login")
          router.push('/auth/login')
          return
        }
        
        console.log("✅ Valid auth session found:", authUser.email)
        setAuthUser(authUser)
      } catch (error) {
        console.error("❌ Error checking auth session:", error)
        router.push('/auth/login')
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuthSession()
  }, [getCurrentAuthSession, router])

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

    setIsLoading(true)

    try {
      const { user: authUser, error: authError } = await completeProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone.trim() || undefined,
      })

      if (authError) {
        setError("Erreur lors de la complétion du profil: " + authError.message)
      } else if (authUser) {
        console.log("✅ Profil complété avec succès")
        // Redirection automatique vers le dashboard grâce au useEffect
        router.push(`/${authUser.role}/dashboard`)
      }
    } catch (error) {
      console.error("Erreur de complétion du profil:", error)
      setError("Une erreur est survenue lors de la complétion du profil")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Empêcher la fermeture de la modale
  const handleOpenChange = (open: boolean) => {
    // La modale ne peut pas être fermée - obligatoire pour compléter l'inscription
    return
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/20">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Si pas d'auth user, la vérification redirige automatiquement
  if (!authUser) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/20 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="bg-primary rounded-2xl p-3 shadow-lg">
              <Building2 className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Bienvenue sur SEIDO !
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Votre compte a été confirmé avec succès
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Email confirmé !
              </h3>
              <p className="text-sm text-muted-foreground">
                Pour finaliser votre inscription, nous avons besoin de quelques informations supplémentaires.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modale obligatoire pour compléter le profil */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Dernières informations
            </DialogTitle>
            <DialogDescription>
              Complétez votre profil pour accéder à votre espace de gestion
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground font-medium">
                  Prénom *
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
                  Nom *
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
              <Label htmlFor="phone" className="text-foreground font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" />
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Information :</strong> Un espace personnel vous sera automatiquement créé 
                en tant que gestionnaire, avec votre équipe dédiée.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isLoading || !formData.firstName.trim() || !formData.lastName.trim()}
            >
              {isLoading ? "Finalisation..." : "Finaliser mon inscription"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
