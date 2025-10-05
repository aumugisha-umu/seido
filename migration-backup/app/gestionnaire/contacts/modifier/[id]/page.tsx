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
import { logger, logError } from '@/lib/logger'

interface ContactData {
  id: string
  name: string // Généré automatiquement à partir de first_name + last_name
  first_name?: string
  last_name?: string
  email: string
  phone?: string
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
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" }
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
  const _router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const resolvedParams = use(params)
  
  const [contact, setContact] = useState<ContactData | null>(null)
  const [formData, setFormData] = useState<ContactData>({
    id: "",
    name: "", // Sera généré automatiquement
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "prestataire", // ✅ Valeur par défaut directement avec le rôle DB
    provider_category: "prestataire", // ✅ Catégorie par défaut
    speciality: "",
    notes: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({})
  
  // États pour la gestion des invitations
  const [invitationStatus, setInvitationStatus] = useState<string | null>(null)
  const [invitationId, setInvitationId] = useState<string | null>(null) // ✅ ID de l'invitation pour resend
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revoking, setRevoking] = useState(false)
  
  // États pour renvoyer une invitation
  const [showResendModal, setShowResendModal] = useState(false)
  const [resending, setResending] = useState(false)

  // Charger les données du contact et son statut d'invitation
  useEffect(() => {
    if (resolvedParams.id && user) {
      loadContact()
      loadInvitationStatus()
    }
  }, [resolvedParams.id, user])

  const loadInvitationStatus = async () => {
    try {
      setInvitationLoading(true)
      console.log("🔍 Loading invitation status for contact:", resolvedParams.id)
      
      // Récupérer le statut d'invitation via l'API
      const response = await fetch(`/api/contact-invitation-status?contactId=${resolvedParams.id}`)
      
      if (response.ok) {
        const { status, invitationId: apiInvitationId } = await response.json()
        setInvitationStatus(status)
        setInvitationId(apiInvitationId || null) // ✅ Stocker l'ID de l'invitation
        console.log("✅ Invitation status loaded:", status, "ID:", apiInvitationId)
      } else {
        console.log("ℹ️ No invitation found for this contact")
        setInvitationStatus(null)
        setInvitationId(null)
      }
      
    } catch (error) {
      console.error("❌ Error loading invitation status:", error)
      // Ne pas afficher d'erreur pour le statut d'invitation
      setInvitationStatus(null)
    } finally {
      setInvitationLoading(false)
    }
  }

  const loadContact = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("📞 Loading contact:", resolvedParams.id)
      
      const contactData = await contactService.getById(resolvedParams.id)
      console.log("✅ Contact loaded:", contactData)
      
      setContact(contactData as ContactData)
      setFormData({
        id: contactData.id,
        name: contactData.name || "", // Valeur existante
        first_name: contactData.first_name || "",
        last_name: contactData.last_name || "",
        email: contactData.email || "",
        phone: contactData.phone || "",
        role: contactData.role || "prestataire", // ✅ Utilisation directe du rôle DB
        provider_category: contactData.provider_category || "prestataire", // ✅ Catégorie directe
        speciality: contactData.speciality || "",
        notes: contactData.notes || "",
        team_id: contactData.team_id || undefined
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
    
    if (!formData.first_name?.trim()) {
      errors.first_name = "Le prénom est obligatoire"
    }
    
    if (!formData.last_name?.trim()) {
      errors.last_name = "Le nom de famille est obligatoire"
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
      
      console.log("💾 Saving contact:", JSON.stringify(formData, null, 2))
      
      // ✅ Préparer les données pour la mise à jour - nom généré automatiquement
      const updateData = {
        name: `${formData.first_name} ${formData.last_name}`.trim(), // Généré à partir prénom + nom
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        email: formData.email,
        phone: formData.phone || null,
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
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // ✅ Générer automatiquement le nom complet si prénom ou nom de famille change
      if (field === 'first_name' || field === 'last_name') {
        const firstName = field === 'first_name' ? value : prev.first_name
        const lastName = field === 'last_name' ? value : prev.last_name
        newData.name = `${firstName} ${lastName}`.trim()
      }
      
      // ✅ Logique dynamique : Réinitialiser les champs dépendants
      if (field === 'role' && value !== 'prestataire') {
        newData.provider_category = ""
        newData.speciality = ""
      }
      
      if (field === 'provider_category' && value !== 'prestataire') {
        newData.speciality = ""
      }
      
      return newData
    })
    
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

  const getSpecialityLabel = (_speciality: string) => {
    return specialities.find(s => s.value === speciality)?.label || speciality
  }

  // Gestion des invitations
  const handleRevokeInvitation = async () => {
    try {
      setRevoking(true)
      console.log("🚫 Revoking invitation for contact:", contact?.email)
      
      const response = await fetch('/api/revoke-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          contactEmail: contact?.email,
          contactId: contact?.id 
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        console.log("✅ Invitation/Access revoked successfully")
        
        // ✅ Réinitialiser le statut selon l'action effectuée
        const wasPending = invitationStatus === 'pending'
        setInvitationStatus(wasPending ? 'cancelled' : null)
        setShowRevokeModal(false)
        
        toast({
          title: wasPending ? "Invitation annulée" : "Accès révoqué", 
          description: result.message || `L'action sur ${contact?.name} a été effectuée avec succès`,
          variant: "success"
        })
      } else {
        throw new Error(result.error || 'Erreur lors de la révocation')
      }
      
    } catch (error) {
      console.error("❌ Error revoking invitation:", error)
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la révocation"
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setRevoking(false)
    }
  }

  // Fonction pour renvoyer une invitation
  const handleResendInvitation = async () => {
    if (!contact) return
    
    try {
      setResending(true)
      console.log("📧 Resending invitation for contact:", contact.email, "InvitationId:", invitationId)
      
      let response, result
      
      // ✅ Si une invitation existe déjà (même annulée), utiliser resend-invitation
      if (invitationId) {
        console.log("🔄 Using resend-invitation API for existing invitation")
        response = await fetch('/api/resend-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            invitationId: invitationId
          })
        })
      } 
      // ✅ Sinon, créer une nouvelle invitation avec invite-user
      else {
        console.log("🆕 Using invite-user API for new invitation")
        response = await fetch('/api/invite-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: contact.email,
            firstName: contact.first_name,
            lastName: contact.last_name,
            role: contact.role,
            providerCategory: contact.provider_category,
            teamId: contact.team_id,
            phone: contact.phone,
            speciality: contact.speciality,
            shouldInviteToApp: true // Forcer l'envoi d'invitation
          })
        })
      }

      result = await response.json()
      
      if (response.ok && result.success) {
        console.log("✅ Invitation sent successfully")
        
        // Recharger le statut d'invitation
        await loadInvitationStatus()
        setShowResendModal(false)
        
        toast({
          title: "Invitation envoyée",
          description: `Une nouvelle invitation a été envoyée à ${contact.name}`,
          variant: "success"
        })
      } else {
        throw new Error(result.error || 'Erreur lors de l\'envoi de l\'invitation')
      }
      
    } catch (error) {
      console.error("❌ Error resending invitation:", error)
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'envoi de l'invitation"
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setResending(false)
    }
  }

  const getInvitationStatusBadge = () => {
    if (invitationLoading) {
      return (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-slate-500">Vérification...</span>
        </div>
      )
    }

    if (!invitationStatus) {
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
          Pas de compte
        </Badge>
      )
    }

    const statusConfig = {
      pending: { label: 'Invitation envoyée', class: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Actif', class: 'bg-green-100 text-green-800' },
      expired: { label: 'Invitation expirée', class: 'bg-amber-100 text-amber-800' },
      cancelled: { label: 'Invitation annulée', class: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[invitationStatus as keyof typeof statusConfig] || statusConfig.pending
    
    return (
      <Badge variant="secondary" className={`${config.class} font-medium`}>
        {config.label}
      </Badge>
    )
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
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prénom - Remonté en premier */}
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name || ""}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  placeholder="Ex: Jean"
                  className={`w-full ${validationErrors.first_name ? "border-red-500" : ""}`}
                />
                {validationErrors.first_name && (
                  <p className="text-sm text-red-600">{validationErrors.first_name}</p>
                )}
              </div>

              {/* Nom de famille - Remonté en premier */}
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom de famille *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ""}
                  onChange={(e) => handleInputChange("last_name", e.target.value)}
                  placeholder="Ex: Dupont"
                  className={`w-full ${validationErrors.last_name ? "border-red-500" : ""}`}
                />
                {validationErrors.last_name && (
                  <p className="text-sm text-red-600">{validationErrors.last_name}</p>
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
                    className={`w-full pl-10 ${validationErrors.email ? "border-red-500" : ""}`}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-sm text-red-600">{validationErrors.email}</p>
                )}
              </div>

              {/* Téléphone */}
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    value={formData.phone || ""}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="Ex: +33 1 23 45 67 89"
                    className="w-full pl-10"
                  />
                </div>
              </div>

            </div>

            {/* ✅ Section séparée pour Rôle/Catégorie/Spécialité avec layout dynamique */}
            <div className={`grid grid-cols-1 gap-6 ${
              formData.role === "prestataire" && formData.provider_category === "prestataire" 
                ? 'md:grid-cols-3' 
                : formData.role === "prestataire" 
                  ? 'md:grid-cols-2' 
                  : 'md:grid-cols-1'
            }`}>
              {/* ✅ Rôle utilisateur */}
              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <SelectTrigger className={`w-full ${validationErrors.role ? "border-red-500" : ""}`}>
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
                    <SelectTrigger className={`w-full ${validationErrors.provider_category ? "border-red-500" : ""}`}>
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

              {/* ✅ Spécialité (affiché seulement si catégorie = prestataire) */}
              {formData.role === "prestataire" && formData.provider_category === "prestataire" && (
                <div className="space-y-2">
                  <Label htmlFor="speciality">Spécialité</Label>
                  <Select
                    value={formData.speciality}
                    onValueChange={(value) => handleInputChange("speciality", value)}
                  >
                    <SelectTrigger className="w-full">
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
              )}
            </div>

            {/* ✅ Gestion des invitations - Section séparée selon le design system */}
            <Card className="border-l-4 border-l-sky-500">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-lg">
                  <User className="h-5 w-5 text-sky-600" />
                  <span>Statut d'invitation</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">
                      Accès à l'application
                    </p>
                    <p className="text-sm text-slate-500">
                      Ce contact peut-il se connecter à l'application ?
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {getInvitationStatusBadge()}
                    
                    {/* Actions conditionnelles selon le statut */}
                    {invitationStatus === 'accepted' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowRevokeModal(true)}
                        className="ml-2"
                        aria-label={`Révoquer l'accès de ${contact?.name}`}
                      >
                        Révoquer l'accès
                      </Button>
                    )}
                    
                    {invitationStatus === 'pending' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowRevokeModal(true)}
                        className="ml-2"
                        aria-label={`Annuler l'invitation de ${contact?.name}`}
                      >
                        Annuler l'invitation
                      </Button>
                    )}
                    
                    {(!invitationStatus || invitationStatus === 'cancelled' || invitationStatus === 'expired') && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowResendModal(true)}
                        aria-label={`Envoyer une invitation à ${contact?.name}`}
                      >
                        {!invitationStatus ? 'Envoyer une invitation' : 'Renvoyer une invitation'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Informations contextuelles selon le statut */}
                {invitationStatus === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✅ Ce contact a accès à l'application et peut se connecter
                    </p>
                  </div>
                )}
                
                {invitationStatus === 'pending' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      📧 Une invitation a été envoyée à ce contact. Il doit cliquer sur le lien reçu par email pour activer son accès.
                    </p>
                  </div>
                )}
                
                {invitationStatus === 'expired' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      ⏰ L'invitation de ce contact a expiré. Vous pouvez en envoyer une nouvelle si nécessaire.
                    </p>
                  </div>
                )}
                
                {invitationStatus === 'cancelled' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      🚫 L'invitation de ce contact a été annulée. Vous pouvez en envoyer une nouvelle si nécessaire.
                    </p>
                  </div>
                )}
                
                {!invitationStatus && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-sm text-slate-600">
                      👤 Ce contact existe dans votre base mais n'a pas accès à l'application
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Notes additionnelles..."
                className="w-full min-h-[100px]"
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

        {/* ✅ Modal de révocation selon le design system */}
        {showRevokeModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog" aria-labelledby="revoke-title" aria-describedby="revoke-description">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 id="revoke-title" className="text-lg font-semibold text-slate-900">
                    {invitationStatus === 'accepted' ? 'Révoquer l\'accès' : 'Annuler l\'invitation'}
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p id="revoke-description" className="text-slate-600 mb-4">
                  {invitationStatus === 'accepted' 
                    ? `Êtes-vous sûr de vouloir révoquer l'accès de ${contact?.name} à l'application ? Cette personne ne pourra plus se connecter.`
                    : `Êtes-vous sûr de vouloir annuler l'invitation de ${contact?.name} ? Cette personne ne recevra plus d'email d'invitation.`
                  }
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800">
                    ⚠️ <strong>Important :</strong> Le contact restera dans votre base de données, seul son accès à l'application sera supprimé.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
                <Button
                  variant="secondary"
                  onClick={() => setShowRevokeModal(false)}
                  disabled={revoking}
                  aria-label="Annuler la révocation"
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRevokeInvitation}
                  disabled={revoking}
                  className="min-w-[120px]"
                  aria-label={`Confirmer la ${invitationStatus === 'accepted' ? 'révocation' : 'annulation'}`}
                >
                  {revoking ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {invitationStatus === 'accepted' ? 'Révocation...' : 'Annulation...'}
                    </>
                  ) : (
                    invitationStatus === 'accepted' ? 'Révoquer l\'accès' : 'Annuler l\'invitation'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Modal de confirmation pour renvoyer l'invitation */}
        {showResendModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" role="dialog" aria-labelledby="resend-title" aria-describedby="resend-description">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 id="resend-title" className="text-lg font-semibold text-slate-900">
                    {!invitationStatus ? 'Envoyer une invitation' : 'Renvoyer une invitation'}
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p id="resend-description" className="text-slate-600 mb-4">
                  {!invitationStatus 
                    ? `Voulez-vous envoyer une invitation à ${contact?.name} pour qu'il puisse accéder à l'application ?`
                    : `Voulez-vous envoyer une nouvelle invitation à ${contact?.name} ? L'ancienne invitation sera remplacée.`
                  }
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    📧 <strong>Information :</strong> Un email sera envoyé à {contact?.email} avec un lien pour accéder à l'application.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
                <Button
                  variant="secondary"
                  onClick={() => setShowResendModal(false)}
                  disabled={resending}
                  aria-label="Annuler l'envoi"
                >
                  Annuler
                </Button>
                <Button
                  variant="default"
                  onClick={handleResendInvitation}
                  disabled={resending}
                  className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                  aria-label={`Confirmer l'envoi d'invitation à ${contact?.name}`}
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      {!invitationStatus ? 'Envoyer' : 'Renvoyer'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
