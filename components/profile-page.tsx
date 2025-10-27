"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import type { AuthUser } from "@/lib/auth-service"
import { ChangePasswordModal, ChangeEmailModal } from "@/components/ui/security-modals"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { logger, logError } from '@/lib/logger'
import {
  User,
  Mail,
  Phone,
  Save,
  ArrowLeft,
  Shield,
  Lock,
  Camera,
  Building2,
  Home,
  Wrench,
} from "lucide-react"

interface ProfilePageProps {
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  dashboardPath: string
  initialUser?: AuthUser  // ✅ Accepter les données initiales du serveur
}

export default function ProfilePage({ role, dashboardPath, initialUser }: ProfilePageProps) {
  const { user: contextUser, updateProfile } = useAuth()
  // ✅ Utiliser initialUser en priorité (chargé côté serveur), fallback sur contextUser
  const user = initialUser || contextUser
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    phone: user?.phone || ""
  })
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

  // Configuration par rôle
  const roleConfig = {
    admin: {
      title: "Administrateur",
      icon: Shield,
      description: "Gérez les paramètres système et les utilisateurs",
      color: "text-purple-600"
    },
    gestionnaire: {
      title: "Gestionnaire Immobilier", 
      icon: Building2,
      description: "Gérez vos propriétés et interventions",
      color: "text-blue-600"
    },
    locataire: {
      title: "Locataire",
      icon: Home,
      description: "Consultez vos informations de logement",
      color: "text-green-600"
    },
    prestataire: {
      title: "Prestataire de Services",
      icon: Wrench,
      description: "Gérez vos interventions et prestations",
      color: "text-orange-600"
    }
  }

  const config = roleConfig[role]

  // Mettre à jour formData quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        phone: user.phone || ""
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    
    // Validation côté client
    const firstName = formData.firstName.trim()
    const lastName = formData.lastName.trim()
    
    if (!firstName || !lastName) {
      toast({
        title: "Champs requis",
        description: "Le prénom et le nom sont obligatoires",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    try {
      // Composer le nom complet à partir du prénom et nom
      const fullName = `${firstName} ${lastName}`.trim()
      
      logger.info('🔄 [PROFILE-UPDATE] Sending update data:', {
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone: formData.phone
      })
      
      const { error } = await updateProfile({
        name: fullName,
        first_name: firstName,
        last_name: lastName,
        phone: formData.phone
      })

      if (error) {
        logger.error("Erreur lors de la mise à jour du profil:", error)
        const errorMessage = error.message || "Une erreur est survenue lors de la mise à jour de votre profil"
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        })
      } else {
        setIsEditing(false)
        toast({
          title: "Profil mis à jour",
          description: "Vos informations personnelles ont été mises à jour avec succès",
          variant: "default",
        })
      }
    } catch (error) {
      logger.error("Erreur lors de la mise à jour du profil:", error)
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push(dashboardPath)
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validation côté client
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale autorisée est de 5MB",
        variant: "destructive",
      })
      return
    }

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Type de fichier non supporté",
        description: "Seuls les formats JPG, PNG et WebP sont acceptés",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'upload")
      }

      toast({
        title: "Photo mise à jour",
        description: "Votre photo de profil a été mise à jour avec succès",
        variant: "default",
      })

      // Actualiser la page pour récupérer la nouvelle photo
      window.location.reload()

    } catch (error) {
      logger.error("Error uploading avatar:", error)
      toast({
        title: "Erreur d'upload",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Mon Profil</h1>
        </div>

        <div className="space-y-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Gérez vos informations personnelles et vos préférences de compte.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar et infos de base */}
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {user.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                    ) : (
                      <AvatarFallback className="text-lg">
                        {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  
                  {/* Bouton pour changer la photo */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full p-2 h-8 w-8"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                  >
                    <Camera className="h-3 w-3" />
                  </Button>
                  
                  {/* Input file caché */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <div className={`flex items-center gap-2 text-sm ${config.color}`}>
                    <config.icon className="h-4 w-4" />
                    {config.title}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Formulaire d'édition */}
              <div className="grid grid-cols-1 gap-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Votre prénom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Votre nom de famille"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Nom complet</Label>
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user.name}</span>
                    </div>
                  </div>
                )}

                {/* Téléphone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Numéro de téléphone"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{user.phone || "Non renseigné"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="flex justify-end space-x-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                      <Save className="h-4 w-4 mr-2" />
                      {isLoading ? "Sauvegarde..." : "Sauvegarder"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Modifier
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sécurité du compte */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité du compte
              </CardTitle>
              <CardDescription>
                Gérez la sécurité de votre compte en modifiant votre mot de passe ou votre adresse email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-16 flex-col gap-2"
                  onClick={() => setIsPasswordModalOpen(true)}
                >
                  <Lock className="h-5 w-5" />
                  <span className="text-sm font-medium">Modifier le mot de passe</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-16 flex-col gap-2"
                  onClick={() => setIsEmailModalOpen(true)}
                >
                  <Mail className="h-5 w-5" />
                  <span className="text-sm font-medium">Modifier l'email</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Modals de sécurité */}
          <ChangePasswordModal
            open={isPasswordModalOpen}
            onOpenChange={setIsPasswordModalOpen}
          />

          <ChangeEmailModal
            open={isEmailModalOpen}
            onOpenChange={setIsEmailModalOpen}
            currentEmail={user.email}
          />
        </div>
      </div>
    </div>
  )
}
