"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Building2, Mail, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { contactService } from "@/lib/database-service"
import { supabase } from "@/lib/supabase"

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (contactData: ContactFormData) => Promise<void>
  defaultType?: string
}

interface ContactFormData {
  type: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  speciality?: string
  notes: string
  inviteToApp: boolean
}

interface ValidationError {
  field: string
  message: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  general?: string
}

const contactTypes = [
  { value: "locataire", label: "Locataire" },
  { value: "propriétaire", label: "Propriétaire" },
  { value: "prestataire", label: "Prestataire" },
  { value: "syndic", label: "Syndic" },
  { value: "notaire", label: "Notaire" },
  { value: "assurance", label: "Assurance" },
  { value: "gestionnaire", label: "Gestionnaire" },
  { value: "autre", label: "Autre" },
]

const specialityTypes = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
  { value: "autre", label: "Autre" },
]

const getContactTitle = (type: string) => {
  switch (type) {
    case "locataire":
      return { title: "Créer un locataire", subtitle: "Personne qui occupe le logement" }
    case "propriétaire":
      return { title: "Créer un propriétaire", subtitle: "Personne qui possède le bien immobilier" }
    case "prestataire":
      return { title: "Créer un prestataire", subtitle: "Entreprise ou artisan pour les interventions" }
    case "syndic":
      return { title: "Créer un syndic", subtitle: "Gestionnaire de la copropriété" }
    case "notaire":
      return { title: "Créer un notaire", subtitle: "Professionnel du droit immobilier" }
    case "assurance":
      return { title: "Créer une assurance", subtitle: "Compagnie d'assurance du bien" }
    case "gestionnaire":
      return { title: "Créer un gestionnaire", subtitle: "Responsable de la gestion des biens" }
    default:
      return { title: "Créer un contact", subtitle: "Ajouter un contact pour votre bien" }
  }
}

const ContactFormModal = ({ isOpen, onClose, onSubmit, defaultType = "locataire" }: ContactFormModalProps) => {
  const { toast } = useToast()
  
  // Types de contacts qui doivent avoir la checkbox cochée par défaut
  const shouldInviteByDefault = (type: string) => {
    return ['gestionnaire', 'locataire', 'propriétaire', 'prestataire'].includes(type)
  }

  const [formData, setFormData] = useState<ContactFormData>({
    type: defaultType,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    speciality: "",
    notes: "",
    inviteToApp: shouldInviteByDefault(defaultType),
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mettre à jour la checkbox quand le type change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      inviteToApp: shouldInviteByDefault(prev.type)
    }))
    // Réinitialiser les erreurs quand le type change
    setErrors({})
  }, [formData.type])

  // Fonction pour valider un email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  // Fonction pour valider un numéro de téléphone français
  const isValidPhone = (phone: string): boolean => {
    if (!phone.trim()) return true // Le téléphone n'est pas obligatoire
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // Fonction pour vérifier si l'email existe déjà
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erreur lors de la vérification de l\'email:', error)
        return false
      }

      return data !== null
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'email:', error)
      return false
    }
  }

  // Fonction de validation complète
  const validateForm = async (): Promise<{ isValid: boolean; errors: FormErrors }> => {
    const newErrors: FormErrors = {}

    // Validation du prénom
    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est obligatoire"
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "Le prénom doit contenir au moins 2 caractères"
    } else if (formData.firstName.trim().length > 50) {
      newErrors.firstName = "Le prénom ne peut pas dépasser 50 caractères"
    }

    // Validation du nom
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est obligatoire"
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "Le nom doit contenir au moins 2 caractères"
    } else if (formData.lastName.trim().length > 50) {
      newErrors.lastName = "Le nom ne peut pas dépasser 50 caractères"
    }

    // Validation de l'email
    if (!formData.email.trim()) {
      newErrors.email = "L'email est obligatoire"
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Le format de l'email n'est pas valide"
    } else {
      // Vérifier si l'email existe déjà
      const emailExists = await checkEmailExists(formData.email)
      if (emailExists) {
        newErrors.email = "Un contact avec cet email existe déjà"
      }
    }

    // Validation du téléphone
    if (formData.phone.trim() && !isValidPhone(formData.phone)) {
      newErrors.phone = "Le format du numéro de téléphone n'est pas valide"
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSubmitting) return

    setIsSubmitting(true)
    setErrors({})
    
    try {
      // Validation complète du formulaire
      const validation = await validateForm()
      
      if (!validation.isValid) {
        setErrors(validation.errors)
        
        // Afficher un toast d'erreur général
        const firstError = Object.values(validation.errors)[0]
        toast({
          title: "❌ Erreur de validation",
          description: firstError || "Veuillez corriger les erreurs dans le formulaire",
          variant: "destructive"
        })
        
        setIsSubmitting(false)
        return
      }

      // Appeler la fonction onSubmit et attendre sa completion
      await onSubmit(formData)

      // Construire le message de succès adapté selon l'invitation
      const contactName = `${formData.firstName} ${formData.lastName}`
      const invitationMessage = formData.inviteToApp 
        ? "Une invitation à rejoindre l'application a été envoyée par email."
        : "Aucune invitation n'a été envoyée."

      // Afficher le toast de succès
      toast({
        title: "✅ Contact créé avec succès",
        description: `${contactName} a été ajouté à vos contacts. ${invitationMessage}`,
        variant: "success"
      })

      // Reset form et erreurs
      setFormData({
        type: defaultType,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        speciality: "",
        notes: "",
        inviteToApp: shouldInviteByDefault(defaultType),
      })
      setErrors({})

      // Fermer la modale
      onClose()

      // Rafraîchir la page pour afficher les nouvelles données
      setTimeout(() => {
        window.location.reload()
      }, 1000) // Petit délai pour laisser le temps au toast de s'afficher

    } catch (error: any) {
      console.error('❌ Erreur lors de la création du contact:', error)
      
      // Gestion des erreurs spécifiques
      let errorMessage = "Une erreur est survenue lors de la création du contact. Veuillez réessayer."
      
      if (error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        errorMessage = "Un contact avec cet email existe déjà dans le système."
        setErrors({ email: "Cet email est déjà utilisé" })
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = "Problème de connexion. Vérifiez votre connexion internet et réessayez."
      } else if (error?.message?.includes('permission') || error?.message?.includes('unauthorized')) {
        errorMessage = "Vous n'avez pas les permissions nécessaires pour créer ce contact."
      } else if (error?.message?.includes('validation')) {
        errorMessage = "Les données du formulaire ne sont pas valides."
      }
      
      toast({
        title: "❌ Erreur lors de la création",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Reset form et erreurs
    setFormData({
      type: defaultType,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      speciality: "",
      notes: "",
      inviteToApp: shouldInviteByDefault(defaultType),
    })
    setErrors({})
    onClose()
  }

  // Fonction pour gérer les changements d'input et réinitialiser les erreurs
  const handleInputChange = (field: keyof ContactFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Réinitialiser l'erreur du champ modifié
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const { title, subtitle } = getContactTitle(formData.type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              </div>
            </div>
            
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className={formData.type === "prestataire" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                Type de contact <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Champ Spécialité - À côté du type quand c'est un prestataire */}
            {formData.type === "prestataire" && (
              <div className="space-y-2">
                <Label htmlFor="speciality" className="text-sm font-medium text-gray-700">
                  Spécialité
                </Label>
                <Select 
                  value={formData.speciality || ""} 
                  onValueChange={(value) => handleInputChange('speciality', value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialityTypes.map((speciality) => (
                      <SelectItem key={speciality.value} value={speciality.value}>
                        {speciality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
                className={`w-full ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.firstName && (
                <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.firstName}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
                className={`w-full ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.lastName && (
                <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.lastName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className={`w-full ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {errors.email && (
              <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.email}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
            />
            {errors.phone && (
              <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.phone}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Notes et remarques"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full min-h-[80px] resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox 
              id="inviteToApp" 
              checked={formData.inviteToApp}
              onCheckedChange={(checked) => handleInputChange('inviteToApp', !!checked)}
            />
            <div className="flex-1">
              <Label htmlFor="inviteToApp" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Inviter ce contact à rejoindre l'application
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Un email d'invitation sera envoyé pour qu'il puisse accéder à ses informations et interventions
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} className="px-6 bg-transparent">
              Annuler
            </Button>
            <Button
              type="submit"
              className="px-6 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50"
              disabled={isSubmitting || Object.keys(errors).some(key => errors[key as keyof FormErrors])}
            >
              {isSubmitting ? "Création en cours..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { ContactFormModal }
export default ContactFormModal
