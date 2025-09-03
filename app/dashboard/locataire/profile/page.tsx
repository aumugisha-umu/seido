"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { User, Mail, Phone, Home, Save, ArrowLeft, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function LocataireProfilePage() {
  const { user, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || ""
  })
  const router = useRouter()

  // Mettre à jour formData quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || ""
      })
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { error } = await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      })

      if (error) {
        console.error("Erreur lors de la mise à jour du profil:", error)
      } else {
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/dashboard/locataire")
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={handleBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Mon Profil</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Overview Card */}
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
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="text-lg">
                    {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    Locataire
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{user.name}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{user.email}</span>
                    </div>
                  )}
                </div>

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

          {/* Housing Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Informations de logement
              </CardTitle>
              <CardDescription>
                Détails de votre logement et bail.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Résidence Les Jardins</div>
                    <div className="text-sm text-muted-foreground">Appartement 3B - 3ème étage</div>
                    <div className="text-sm text-muted-foreground">75 m² • 3 pièces</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="font-semibold">850 €</div>
                    <div className="text-sm text-muted-foreground">Loyer mensuel</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="font-semibold">Mars 2022</div>
                    <div className="text-sm text-muted-foreground">Début du bail</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tenant Activity Card */}
          <Card>
            <CardHeader>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>
                Vos demandes et interventions récentes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">5</div>
                  <div className="text-sm text-muted-foreground">Demandes cette année</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-primary">2</div>
                  <div className="text-sm text-muted-foreground">En cours</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
