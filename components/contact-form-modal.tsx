"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Building2, Mail, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { createBrowserSupabaseClient } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (contactData: ContactFormData) => Promise<void>
  defaultType?: string
  teamId: string // ✅ AJOUT: ID de l'équipe pour validation multi-équipes
  disableTypeSelection?: boolean // ✅ AJOUT: Désactiver le dropdown type (ex: forcer "Prestataire" dans création intervention)
  onSuccess?: () => Promise<void> | void // Fonction optionnelle appelée après création réussie
}

interface ContactFormData {
  type: string
  firstName: string
  lastName: string
  email: string
  phone: string
  speciality?: string
  notes: string
  inviteToApp: boolean
}


interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  general?: string
}

// Types de contacts utilisant les clés frontend (cohérente avec ContactSelector)
const contactTypes = [
  { value: "manager", label: "Gestionnaire" },
  { value: "owner", label: "Propriétaire" },
  { value: "tenant", label: "Locataire" },
  { value: "provider", label: "Prestataire" },
  { value: "other", label: "Autre" },
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
    case "manager":
    case "gestionnaire":
      return { title: "Créer un gestionnaire", subtitle: "Responsable de la gestion des biens" }
    case "owner":
    case "proprietaire":
      return { title: "Créer un propriétaire", subtitle: "Personne qui possède le bien immobilier" }
    case "tenant":
    case "locataire":
      return { title: "Créer un locataire", subtitle: "Personne qui occupe le logement" }
    case "provider":
    case "prestataire":
      return { title: "Créer un prestataire", subtitle: "Entreprise ou artisan pour les interventions" }
    default:
      return { title: "Créer un contact", subtitle: "Ajouter un contact pour votre bien" }
  }
}

const ContactFormModal = ({ isOpen, onClose, onSubmit, defaultType = "tenant", teamId, disableTypeSelection = false, onSuccess }: ContactFormModalProps) => {
  const supabase = createBrowserSupabaseClient()
  const { toast } = useToast()
  
  // Types de contacts qui doivent avoir la checkbox cochée par défaut
  const shouldInviteByDefault = (type: string) => {
    return ['manager', 'gestionnaire', 'tenant', 'locataire', 'owner', 'proprietaire', 'provider', 'prestataire'].includes(type)
  }

  const [formData, setFormData] = useState<ContactFormData>({
    type: defaultType,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    speciality: "",
    notes: "",
    inviteToApp: shouldInviteByDefault(defaultType),
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sync defaultType from parent when modal opens or defaultType changes
  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser le formulaire seulement quand le modal se ferme
      setFormData({
        type: defaultType,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        speciality: "",
        notes: "",
        inviteToApp: shouldInviteByDefault(defaultType),
      })
      setErrors({})
      return
    }
    // Quand le modal s'ouvre, seulement mettre à jour le type sans réinitialiser les autres champs
    setFormData(prev => ({
      ...prev,
      type: defaultType,
      speciality: defaultType === "provider" ? prev.speciality : "",
      inviteToApp: shouldInviteByDefault(defaultType)
    }))
    setErrors({})
  }, [defaultType, isOpen])

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
  const isValidEmail = (_email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(_email.trim())
  }

  // Fonction pour valider un numéro de téléphone français
  const isValidPhone = (_phone: string): boolean => {
    if (!_phone.trim()) return true // Le téléphone n'est pas obligatoire
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/
    return phoneRegex.test(_phone.replace(/\s/g, ''))
  }

  // ✅ NOUVELLE FONCTION: Vérifier email avec support multi-équipes (via API avec Service Role)
  const checkEmailAndTeam = async (_email: string): Promise<{
    existsInCurrentTeam: boolean
    existsInOtherTeams: boolean
    canCreate: boolean
    message: string
  }> => {
    try {
      logger.info({ email: _email, teamId }, '🔍 [CONTACT-FORM] Checking email availability for team')

      const response = await fetch('/api/check-email-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: _email.trim().toLowerCase(),
          teamId
        })
      })

      if (!response.ok) {
        // ✅ Gérer de manière robuste les réponses d'erreur (JSON ou texte)
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch (jsonError) {
          // Si le parsing JSON échoue, essayer de récupérer le texte brut
          try {
            const errorText = await response.text()
            errorData = { message: errorText || `HTTP ${response.status}: ${response.statusText}` }
          } catch {
            errorData = { message: `HTTP ${response.status}: ${response.statusText}` }
          }
        }
        logger.error({ error: errorData, status: response.status }, '❌ [CONTACT-FORM] Email validation API error')
        return {
          existsInCurrentTeam: false,
          existsInOtherTeams: false,
          canCreate: true, // En cas d'erreur, permettre la création (le backend fera la validation finale)
          message: 'Erreur de validation, veuillez réessayer'
        }
      }

      // ✅ Parser la réponse de succès avec gestion d'erreur
      try {
        const result = await response.json()
        logger.info({ result }, '✅ [CONTACT-FORM] Email validation result')
        return result
      } catch (jsonError) {
        logger.error({ error: jsonError }, '❌ [CONTACT-FORM] Failed to parse success response')
        // Retourner un résultat sécurisé par défaut
        return {
          existsInCurrentTeam: false,
          existsInOtherTeams: false,
          canCreate: true,
          message: 'Erreur lors du traitement de la réponse'
        }
      }
    } catch (error) {
      // ✅ Gérer les erreurs réseau et autres exceptions
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      const errorType = error instanceof TypeError ? 'network' : 'unknown'

      logger.error({
        error: errorMessage,
        errorType,
        email: _email,
        teamId
      }, '❌ [CONTACT-FORM] Exception in email validation')

      return {
        existsInCurrentTeam: false,
        existsInOtherTeams: false,
        canCreate: true, // En cas d'erreur, permettre la création (le backend fera la validation finale)
        message: errorType === 'network'
          ? 'Problème de connexion. Vérifiez votre réseau et réessayez.'
          : 'Erreur de validation, veuillez réessayer'
      }
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
      // ✅ Vérifier si l'email existe dans l'équipe courante (support multi-équipes)
      const emailCheck = await checkEmailAndTeam(formData.email)
      if (emailCheck.existsInCurrentTeam) {
        newErrors.email = "Un contact avec cet email existe déjà dans votre équipe"
      } else if (emailCheck.existsInOtherTeams) {
        // ℹ️ Email existe dans autre équipe → permis mais on informe l'utilisateur
        logger.info({ email: formData.email }, '📝 [CONTACT-FORM] Email exists in other team, creation allowed')
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

        return // ✅ FIX: Pas besoin de setIsSubmitting(false) ici, le finally le fera
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
        speciality: "",
        notes: "",
        inviteToApp: shouldInviteByDefault(defaultType),
      })
      setErrors({})

      // Fermer la modale
      onClose()

      // Rafraîchir les données si une fonction de callback est fournie
      if (onSuccess) {
        try {
          await onSuccess()
        } catch (refreshError) {
          logger.error('❌ Erreur lors du rafraîchissement des données:', refreshError)
          // Le toast de succès a déjà été affiché, on n'affiche pas d'erreur pour ne pas confuser l'utilisateur
        }
      }

    } catch (error: unknown) {
      logger.error('❌ Erreur lors de la création du contact:', error)
      
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

  // Fonction pour synchroniser la valeur depuis l'input DOM lors du blur
  const handleBlur = (field: keyof ContactFormData, e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const domValue = e.target.value
    // Synchroniser la valeur du DOM avec l'état React si elle diffère
    setFormData(prev => {
      if (prev[field] !== domValue) {
        return { ...prev, [field]: domValue }
      }
      return prev
    })
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
          <div className={formData.type === "provider" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                Type de contact <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)} disabled={disableTypeSelection}>
                <SelectTrigger className="w-full bg-white">
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
            {formData.type === "provider" && (
              <div className="space-y-2">
                <Label htmlFor="speciality" className="text-sm font-medium text-gray-700">
                  Spécialité
                </Label>
                <Select
                  value={formData.speciality || ""}
                  onValueChange={(value) => handleInputChange('speciality', value)}
                >
                  <SelectTrigger className="w-full bg-white">
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
                name="firstName"
                type="text"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={(e) => handleBlur('firstName', e)}
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
                name="lastName"
                type="text"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={(e) => handleBlur('lastName', e)}
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
              name="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={(e) => handleBlur('email', e)}
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
              name="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={(e) => handleBlur('phone', e)}
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
