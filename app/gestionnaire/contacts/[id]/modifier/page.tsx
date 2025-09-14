"use client"

import { useState, useEffect, use } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building2, 
  Save, 
  AlertCircle, 
  Check,
  Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { contactService } from "@/lib/database-service"

interface ContactData {
  id: string
  name: string
  first_name?: string
  last_name?: string
  email: string
  phone?: string
  address?: string
  company?: string
  role: string // ✅ Champ principal de la nouvelle architecture
  provider_category?: string // ✅ Champ secondaire pour les prestataires
  speciality?: string
  notes?: string
  team_id?: string
}

// ✅ Rôles principaux basés sur le nouvel enum user_role de la DB
const userRoles = [
  { value: "locataire", label: "Locataire", color: "bg-blue-100 text-blue-800" },
  { value: "gestionnaire", label: "Gestionnaire", color: "bg-purple-100 text-purple-800" },
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" },
  { value: "admin", label: "Administrateur", color: "bg-red-100 text-red-800" }
]

// ✅ Catégories de prestataires (pour role = 'prestataire')
const providerCategories = [
  { value: "prestataire", label: "Service général" },
  { value: "syndic", label: "Syndic" },
  { value: "notaire", label: "Notaire" },
  { value: "assurance", label: "Assurance" },
  { value: "proprietaire", label: "Propriétaire" },
  { value: "autre", label: "Autre" }
]

const specialities = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
  { value: "autre", label: "Autre" },
]

export default function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const resolvedParams = use(params)
  
  const [contact, setContact] = useState<ContactData | null>(null)
  const [formData, setFormData] = useState<ContactData>({
    id: "",
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    role: "prestataire", // ✅ Valeur par défaut directement avec le rôle DB
    provider_category: "prestataire", // ✅ Catégorie par défaut
    speciality: "",
    notes: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})

  // Charger les données du contact
  useEffect(() => {
    if (resolvedParams.id && user) {
      loadContact()
    }
  }, [resolvedParams.id, user])

  const loadContact = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("📞 Loading contact:", resolvedParams.id)
      
      const contactData = await contactService.getById(resolvedParams.id)
      console.log("✅ Contact loaded:", contactData)
      
      setContact(contactData)
      setFormData({
        id: contactData.id,
        name: contactData.name || "",
        first_name: contactData.first_name || "",
        last_name: contactData.last_name || "",
        email: contactData.email || "",
        phone: contactData.phone || "",
        address: contactData.address || "",
        company: contactData.company || "",
        role: contactData.role || "prestataire", // ✅ Utilisation directe du rôle DB
        provider_category: contactData.provider_category || "prestataire", // ✅ Catégorie directe
        speciality: contactData.speciality || "",
        notes: contactData.notes || "",
        team_id: contactData.team_id
      })
      
    } catch (error) {
      console.error("❌ Error loading contact:", error)
      setError("Erreur lors du chargement du contact")
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors: {[key: string]: string} = {}
    
    if (!formData.name.trim()) {
      errors.name = "Le nom est obligatoire"
    }
    
    if (!formData.email.trim()) {
      errors.email = "L'email est obligatoire"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format d'email invalide"
    }
    
    if (!formData.role) {
      errors.role = "Le rôle est obligatoire"
    }
    
    // ✅ Validation spécifique pour les prestataires
    if (formData.role === "prestataire" && !formData.provider_category) {
      errors.provider_category = "La catégorie de prestataire est obligatoire"
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez corriger les erreurs dans le formulaire",
        variant: "destructive"
      })
      return
    }

    try {
      setSaving(true)
      setError(null)
      
      console.log("💾 Saving contact:", formData)
      
      // ✅ Préparer les données pour la mise à jour (sans conversion)
      const updateData = {
        name: formData.name,
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        company: formData.company || null,
        role: formData.role, // ✅ Utilisation directe du rôle
        provider_category: formData.provider_category, // ✅ Utilisation directe de la catégorie
        speciality: formData.speciality || null,
        notes: formData.notes || null,
      }
      
      const updatedContact = await contactService.update(resolvedParams.id, updateData)
      console.log("✅ Contact updated:", updatedContact)
      
      toast({
        title: "Contact modifié",
        description: `${updatedContact.name} a été modifié avec succès`,
      })
      
      // Retourner à la liste des contacts
      router.push("/gestionnaire/contacts")
      
    } catch (error) {
      console.error("❌ Error saving contact:", error)
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la sauvegarde"
      setError(errorMessage)
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ContactData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Nettoyer les erreurs de validation lors de la saisie
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // ✅ Nouvelle fonction pour obtenir le label du rôle/catégorie
  const getRoleLabel = (contact: ContactData) => {
    // Trouver le label du rôle principal
    const roleLabel = userRoles.find(r => r.value === contact.role)?.label || contact.role
    
    // Pour les prestataires, ajouter la catégorie
    if (contact.role === "prestataire" && contact.provider_category) {
      const categoryLabel = providerCategories.find(c => c.value === contact.provider_category)?.label
      return categoryLabel || roleLabel
    }
    
    return roleLabel
  }

  const getSpecialityLabel = (speciality: string) => {
    return specialities.find(s => s.value === speciality)?.label || speciality
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Contact non trouvé ou erreur de chargement
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.push("/gestionnaire/contacts")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour aux contacts</span>
            </Button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Modifier le contact</h1>
              <p className="text-gray-600">Modifiez les informations de {contact.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {getRoleLabel(contact)} {/* ✅ Utilisation directe des nouveaux champs */}
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informations du contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nom complet */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className={validationErrors.name ? "border-red-500" : ""}
                />
                {validationErrors.name && (
                  <p className="text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Ex: jean.dupont@email.com"
                    className={`pl-10 ${validationErrors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {/* Prénom */}
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Ex: Jean"
                />
              </div>

              {/* Nom de famille */}
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom de famille</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Ex: Dupont"
                />
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Ex: +33 1 23 45 67 89"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Entreprise */}
              <div className="space-y-2">
                <Label htmlFor="company">Entreprise</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Ex: SARL Dupont"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* ✅ Rôle utilisateur */}
              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <SelectTrigger className={validationErrors.role ? "border-red-500" : ""}>
                    <SelectValue placeholder="Sélectionner le rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {userRoles.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${role.color}`}></div>
                          <span>{role.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.role && (
                  <p className="text-sm text-red-600">{validationErrors.role}</p>
                )}
              </div>

              {/* ✅ Catégorie prestataire (affiché seulement si rôle = prestataire) */}
              {formData.role === "prestataire" && (
                <div className="space-y-2">
                  <Label htmlFor="provider_category">Catégorie de prestataire *</Label>
                  <Select
                    value={formData.provider_category || ""}
                    onValueChange={(value) => handleInputChange("provider_category", value)}
                  >
                    <SelectTrigger className={validationErrors.provider_category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Sélectionner la catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {providerCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.provider_category && (
                    <p className="text-sm text-red-600">{validationErrors.provider_category}</p>
                  )}
                </div>
              )}

              {/* Spécialité */}
              <div className="space-y-2">
                <Label htmlFor="speciality">Spécialité</Label>
                <Select
                  value={formData.speciality}
                  onValueChange={(value) => handleInputChange("speciality", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner la spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.map((speciality) => (
                      <SelectItem key={speciality.value} value={speciality.value}>
                        {speciality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Ex: 123 Rue de la République, 75001 Paris"
                  className="pl-10 min-h-[80px]"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes additionnelles..."
                className="min-h-[100px]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => router.push("/gestionnaire/contacts")}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
