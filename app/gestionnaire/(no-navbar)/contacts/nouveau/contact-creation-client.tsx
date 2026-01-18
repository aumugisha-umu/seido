"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { contactSteps } from "@/lib/step-configurations"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { Step1Type } from "./steps/step-1-type"
import { Step2Company } from "./steps/step-2-company"
import { Step3Contact } from "./steps/step-3-contact"
import { Step4Confirmation } from "./steps/step-4-confirmation"
import { getTypeLabel } from "@/components/interventions/intervention-type-icon"
import { isValidEmail } from "@/lib/validation/patterns"

// Types
interface Company {
  id: string
  name: string
  vat_number?: string | null
}

interface ContactFormData {
  // Step 1: Type de contact
  contactType: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'autre'
  personOrCompany: 'person' | 'company'
  specialty?: string
  customRoleDescription?: string // Description personnalisée pour le rôle "autre"

  // Step 2: Informations société (si company)
  companyMode: 'new' | 'existing'
  companyId?: string
  companyName?: string
  vatNumber?: string
  street?: string
  streetNumber?: string
  postalCode?: string
  city?: string
  country?: string

  // Step 3: Informations contact
  firstName?: string
  lastName?: string
  email: string
  phone?: string
  notes?: string

  // Step 4: Invitation
  inviteToApp: boolean

  // Statut email (calculé automatiquement dans Step3)
  existsInCurrentTeam?: boolean
  hasAuthAccount?: boolean

  // Liaison à une entité (optionnel)
  linkedEntityType?: 'building' | 'lot' | 'contract' | 'intervention' | null
  linkedBuildingId?: string | null
  linkedLotId?: string | null
  linkedContractId?: string | null
  linkedInterventionId?: string | null
}

interface Building {
  id: string
  name: string
  address?: string | null
}

interface Lot {
  id: string
  reference: string
  building_id: string
  category?: string | null
  building?: Building | null
}

interface ContactCreationClientProps {
  teamId: string
  initialCompanies: Company[]
  initialBuildings: Building[]
  initialLots: Lot[]
  // Redirect parameters when coming from another form (e.g., building creation)
  prefilledType?: string | null
  sessionKey?: string | null
  returnUrl?: string | null
}

export function ContactCreationClient({
  teamId,
  initialCompanies,
  initialBuildings,
  initialLots,
  prefilledType,
  sessionKey,
  returnUrl
}: ContactCreationClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStepState] = useState(1)
  const [maxStepReached, setMaxStepReached] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  // Wrapper pour setCurrentStep qui met aussi à jour maxStepReached
  const setCurrentStep = (step: number) => {
    const clampedStep = Math.max(1, Math.min(step, contactSteps.length))
    setCurrentStepState(clampedStep)
    if (clampedStep > maxStepReached) {
      setMaxStepReached(clampedStep)
    }
  }

  // Handler pour le clic sur une étape dans le header
  const handleStepClick = (step: number) => {
    setCurrentStep(step)
  }

  // Mapping des types anglais (ContactSelector) vers français (formulaire)
  const mapContactType = (type: string | null | undefined): ContactFormData['contactType'] => {
    if (!type) return 'locataire'

    const mapping: Record<string, ContactFormData['contactType']> = {
      'tenant': 'locataire',
      'provider': 'prestataire',
      'manager': 'gestionnaire',
      'owner': 'proprietaire',
      'other': 'autre',
      // Support direct des valeurs françaises aussi
      'locataire': 'locataire',
      'prestataire': 'prestataire',
      'gestionnaire': 'gestionnaire',
      'proprietaire': 'proprietaire',
      'autre': 'autre'
    }

    return mapping[type.toLowerCase()] || 'locataire'
  }

  // État du formulaire avec pré-remplissage si venant d'un autre formulaire
  const [formData, setFormData] = useState<ContactFormData>({
    contactType: mapContactType(prefilledType),
    personOrCompany: 'person',
    companyMode: 'new',
    email: '',
    country: 'Belgique',
    inviteToApp: true
  })

  // Gérer les changements de formulaire
  const handleInputChange = (field: keyof ContactFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Validation par étape (unique source de vérité pour valid + errors)
  const validateCurrentStep = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    switch (currentStep) {
      case 1: // Type de contact
        if (!formData.contactType) errors.push("Sélectionnez un type de contact")
        if (!formData.personOrCompany) errors.push("Sélectionnez Personne ou Société")
        if (formData.contactType === 'prestataire' && !formData.specialty) {
          errors.push("Sélectionnez une spécialité pour le prestataire")
        }
        if (formData.contactType === 'autre' && !formData.customRoleDescription?.trim()) {
          errors.push("Précisez le type de contact")
        }
        break

      case 2: // Informations société (seulement si company)
        if (formData.personOrCompany === 'company') {
          if (formData.companyMode === 'existing') {
            if (!formData.companyId) errors.push("Sélectionnez une société existante")
          } else {
            // Nouvelle société
            if (!formData.companyName?.trim()) errors.push("Nom de la société requis")
            if (!formData.vatNumber?.trim()) errors.push("Numéro de TVA requis")
            if (!formData.street?.trim()) errors.push("Rue requise")
            if (!formData.streetNumber?.trim()) errors.push("Numéro de rue requis")
            if (!formData.postalCode?.trim()) errors.push("Code postal requis")
            if (!formData.city?.trim()) errors.push("Ville requise")
            if (!formData.country?.trim()) errors.push("Pays requis")
          }
        }
        break

      case 3: // Informations contact
        // Validation email conditionnelle selon inviteToApp
        if (formData.inviteToApp) {
          // Email obligatoire si invitation activée
          if (!formData.email?.trim()) {
            errors.push("Email requis")
          } else {
            // Validation basique email
            if (!isValidEmail(formData.email)) {
              errors.push("Email invalide")
            }
          }
        } else {
          // Email optionnel - valider format seulement si fourni
          if (formData.email?.trim()) {
            if (!isValidEmail(formData.email)) {
              errors.push("Email invalide")
            }
          }

          // Pour les contacts société sans invitation : au moins email OU téléphone requis
          if (formData.personOrCompany === 'company') {
            const hasEmail = formData.email?.trim()
            const hasPhone = formData.phone?.trim()
            if (!hasEmail && !hasPhone) {
              errors.push("Au moins un email ou un numéro de téléphone est requis pour un contact société")
            }
          }
        }

        // Si personne physique, prénom OU nom requis
        if (formData.personOrCompany === 'person') {
          if (!formData.firstName?.trim() && !formData.lastName?.trim()) {
            errors.push("Prénom ou nom requis")
          }
        }
        break

      case 4: // Confirmation - pas de validation
        break
    }

    return { valid: errors.length === 0, errors }
  }

  // Navigation: Suivant
  const handleNext = () => {
    const validation = validateCurrentStep()

    if (!validation.valid) {
      // Grouper les erreurs en un seul toast pour éviter l'empilement
      const errorCount = validation.errors.length
      if (errorCount === 1) {
        toast.error(validation.errors[0])
      } else {
        toast.error(`${errorCount} champs à corriger`, {
          description: validation.errors.join(' • ')
        })
      }
      return
    }

    // Skip step 2 si personne physique
    if (currentStep === 1 && formData.personOrCompany === 'person') {
      setCurrentStep(3)
    } else if (currentStep < contactSteps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Navigation: Retour
  const handleBack = () => {
    // Skip step 2 au retour aussi si personne physique
    if (currentStep === 3 && formData.personOrCompany === 'person') {
      setCurrentStep(1)
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Helper pour formater la spécialité - utilise le mapping centralisé
  const getSpecialtyLabel = (value: string): string => getTypeLabel(value)

  // Générer le message de succès contextuel
  const getSuccessMessage = (): string => {
    const contactName = formData.firstName && formData.lastName
      ? `${formData.firstName} ${formData.lastName}`
      : formData.firstName || formData.lastName || formData.email

    const specialtyText = formData.contactType === 'prestataire' && formData.specialty
      ? ` (${getSpecialtyLabel(formData.specialty)})`
      : ''

    // A. Personne physique seule
    if (formData.personOrCompany === 'person') {
      if (formData.inviteToApp) {
        return `${contactName}${specialtyText} ajouté et invité avec succès !`
      }
      return `${contactName}${specialtyText} ajouté avec succès !`
    }

    // B. Nouvelle société
    if (formData.companyMode === 'new') {
      const hasContactPerson = formData.firstName || formData.lastName

      if (hasContactPerson) {
        if (formData.inviteToApp) {
          return `${contactName}${specialtyText} et la société ${formData.companyName} créés et invitation envoyée !`
        }
        return `${contactName}${specialtyText} et la société ${formData.companyName} créés avec succès !`
      } else {
        if (formData.inviteToApp) {
          return `Société ${formData.companyName} créée et invitation envoyée à ${formData.email} !`
        }
        return `Société ${formData.companyName} créée avec succès !`
      }
    }

    // C. Société existante
    const selectedCompany = formData.companyId
      ? initialCompanies.find(c => c.id === formData.companyId)
      : null
    const companyDisplayName = selectedCompany?.name || formData.companyName || 'la société'

    if (formData.inviteToApp) {
      return `${contactName}${specialtyText} ajouté à ${companyDisplayName} et invité !`
    }
    return `${contactName}${specialtyText} ajouté à ${companyDisplayName} avec succès !`
  }

  // Création du contact
  const handleCreate = async () => {
    setIsCreating(true)

    try {
      logger.info("📤 [CREATE-CONTACT] Submitting contact creation", { formData })

      // Préparer les données à envoyer
      // Note: role doit être en français car le schéma Zod de l'API attend les valeurs françaises
      const payload: any = {
        teamId,
        role: formData.contactType, // Envoie directement 'prestataire', 'locataire', etc.
        contactType: formData.personOrCompany,
        speciality: formData.specialty,
        customRoleDescription: formData.customRoleDescription, // Description pour le rôle "autre"
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        shouldInviteToApp: formData.inviteToApp
      }

      // Ajouter les champs société uniquement si contactType === 'company'
      if (formData.personOrCompany === 'company') {
        payload.companyMode = formData.companyMode
        payload.companyId = formData.companyId
        payload.companyName = formData.companyName
        payload.vatNumber = formData.vatNumber
        payload.street = formData.street
        payload.streetNumber = formData.streetNumber
        payload.postalCode = formData.postalCode
        payload.city = formData.city
        payload.country = formData.country
      }

      // Ajouter les champs de liaison à une entité (si sélectionnés)
      if (formData.linkedEntityType) {
        payload.linkedEntityType = formData.linkedEntityType
        payload.linkedBuildingId = formData.linkedBuildingId
        payload.linkedLotId = formData.linkedLotId
        payload.linkedContractId = formData.linkedContractId
        payload.linkedInterventionId = formData.linkedInterventionId
      }

      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création du contact')
      }

      // Récupérer l'ID du contact créé
      const result = await response.json()
      const newContactId = result.userId || result.contactId || result.id || result.contact?.id

      logger.info("✅ [CREATE-CONTACT] Contact created successfully", { newContactId, result })
      toast.success(getSuccessMessage())

      // Redirection: Retour au formulaire d'origine si returnUrl fourni, sinon liste des contacts
      if (returnUrl && sessionKey) {
        // Créer un objet contact minimal pour le formulaire de retour
        const contactData = {
          id: newContactId,
          name: formData.personOrCompany === 'person'
            ? `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Contact créé'
            : formData.companyName || 'Société créée',
          email: formData.email || '',
          type: formData.contactType,
          phone: formData.phone || '',
          speciality: formData.specialty || ''
        }

        // Stocker les données du contact dans sessionStorage avec le sessionKey
        try {
          sessionStorage.setItem(`contact-data-${sessionKey}`, JSON.stringify(contactData))
          logger.info(`💾 [CREATE-CONTACT] Contact data saved to sessionStorage`)
        } catch (err) {
          logger.error(`❌ [CREATE-CONTACT] Failed to save contact data:`, err)
        }

        const redirectUrl = `${returnUrl}?sessionKey=${sessionKey}&newContactId=${newContactId}&contactType=${formData.contactType}`
        logger.info(`🔙 [CREATE-CONTACT] Returning to origin: ${redirectUrl}`)
        router.push(redirectUrl)
      } else {
        router.push('/gestionnaire/contacts')
        router.refresh()
      }
    } catch (error) {
      logger.error("❌ [CREATE-CONTACT] Error:", error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création')
    } finally {
      setIsCreating(false)
    }
  }

  // Déterminer le sous-titre du header
  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return "Sélectionnez le type de contact"
      case 2:
        return "Informations de la société"
      case 3:
        return "Coordonnées du contact"
      case 4:
        return "Vérifiez les informations"
      default:
        return ""
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header avec progression */}
      <StepProgressHeader
        title="Créer un contact"
        subtitle={getStepSubtitle()}
        backButtonText={returnUrl ? "Annuler" : "Retour"}
        onBack={() => {
          if (returnUrl) {
            // Retour au formulaire d'origine sans créer de contact
            // Si sessionKey existe, on le passe pour restaurer l'état du formulaire
            const redirectUrl = sessionKey
              ? `${returnUrl}?sessionKey=${sessionKey}&cancelled=true`
              : returnUrl // Pas de sessionKey = retour simple (cas de intervention-detail)
            logger.info(`🔙 [CREATE-CONTACT] Cancelled, returning to origin: ${redirectUrl}`)
            router.push(redirectUrl)
          } else {
            router.push('/gestionnaire/contacts')
          }
        }}
        steps={contactSteps}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        allowFutureSteps={false}
        maxReachableStep={maxStepReached}
      />

      {/* Contenu principal (scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-20">
        <div className="content-max-width">
          {/* Step content will be rendered here */}
          <div className="bg-card rounded-lg border border-border shadow-sm p-6 transition-all duration-500">
            {currentStep === 1 && (
              <Step1Type
                contactType={formData.contactType}
                personOrCompany={formData.personOrCompany}
                specialty={formData.specialty}
                customRoleDescription={formData.customRoleDescription}
                onContactTypeChange={(value) => handleInputChange('contactType', value)}
                onPersonOrCompanyChange={(value) => handleInputChange('personOrCompany', value)}
                onSpecialtyChange={(value) => handleInputChange('specialty', value)}
                onCustomRoleDescriptionChange={(value) => handleInputChange('customRoleDescription', value)}
              />
            )}

            {currentStep === 2 && (
              <Step2Company
                teamId={teamId}
                companies={initialCompanies}
                companyMode={formData.companyMode}
                companyId={formData.companyId}
                companyName={formData.companyName}
                vatNumber={formData.vatNumber}
                street={formData.street}
                streetNumber={formData.streetNumber}
                postalCode={formData.postalCode}
                city={formData.city}
                country={formData.country}
                onFieldChange={handleInputChange}
              />
            )}

            {currentStep === 3 && (
              <Step3Contact
                teamId={teamId}
                personOrCompany={formData.personOrCompany}
                contactType={formData.contactType}
                firstName={formData.firstName}
                lastName={formData.lastName}
                email={formData.email}
                phone={formData.phone}
                notes={formData.notes}
                inviteToApp={formData.inviteToApp}
                onFieldChange={handleInputChange}
                // Entity linking props
                buildings={initialBuildings}
                lots={initialLots}
                linkedEntityType={formData.linkedEntityType}
                linkedBuildingId={formData.linkedBuildingId}
                linkedLotId={formData.linkedLotId}
                linkedContractId={formData.linkedContractId}
                linkedInterventionId={formData.linkedInterventionId}
              />
            )}

            {currentStep === 4 && (
              <Step4Confirmation
                contactType={formData.contactType}
                personOrCompany={formData.personOrCompany}
                specialty={formData.specialty}
                companyMode={formData.companyMode}
                companyId={formData.companyId}
                companyName={formData.companyName}
                vatNumber={formData.vatNumber}
                street={formData.street}
                streetNumber={formData.streetNumber}
                postalCode={formData.postalCode}
                city={formData.city}
                country={formData.country}
                firstName={formData.firstName}
                lastName={formData.lastName}
                email={formData.email}
                phone={formData.phone}
                notes={formData.notes}
                inviteToApp={formData.inviteToApp}
                onInviteChange={(value) => handleInputChange('inviteToApp', value)}
                companies={initialCompanies}
                existsInCurrentTeam={formData.existsInCurrentTeam}
                hasAuthAccount={formData.hasAuthAccount}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer avec navigation */}
      <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border px-5 sm:px-6 lg:px-10 py-4">
        <div className={`flex flex-col sm:flex-row gap-2 content-max-width ${currentStep === 1 ? 'justify-end' : 'justify-between'}`}>
          {/* Bouton Retour - Affiché seulement à partir de step 2 */}
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isCreating}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}

          {/* Bouton Suivant/Créer - Toujours affiché */}
          <Button
            onClick={() => {
              if (currentStep === contactSteps.length) {
                handleCreate()
              } else {
                handleNext()
              }
            }}
            disabled={
              isCreating ||
              !validateCurrentStep().valid ||
              (currentStep === contactSteps.length && formData.existsInCurrentTeam)
            }
            className={currentStep === contactSteps.length ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isCreating ? (
              "Création en cours..."
            ) : currentStep === contactSteps.length ? (
              "Créer le contact"
            ) : (
              "Continuer"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
