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
}

interface ContactCreationClientProps {
  teamId: string
  initialCompanies: Company[]
}

export function ContactCreationClient({
  teamId,
  initialCompanies
}: ContactCreationClientProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  // État du formulaire
  const [formData, setFormData] = useState<ContactFormData>({
    contactType: 'locataire',
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

  // Validation par étape
  const validateCurrentStep = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    switch (currentStep) {
      case 1: // Type de contact
        if (!formData.contactType) errors.push("Sélectionnez un type de contact")
        if (!formData.personOrCompany) errors.push("Sélectionnez Personne ou Société")
        if (formData.contactType === 'prestataire' && !formData.specialty) {
          errors.push("Sélectionnez une spécialité pour le prestataire")
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
        if (!formData.email?.trim()) {
          errors.push("Email requis")
        } else {
          // Validation basique email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(formData.email)) {
            errors.push("Email invalide")
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
      validation.errors.forEach(error => {
        toast.error(error)
      })
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

  // Création du contact
  const handleCreate = async () => {
    setIsCreating(true)

    try {
      logger.info("📤 [CREATE-CONTACT] Submitting contact creation", { formData })

      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          type: formData.contactType,
          contactType: formData.personOrCompany,
          specialty: formData.specialty,
          companyMode: formData.companyMode,
          companyId: formData.companyId,
          companyName: formData.companyName,
          vatNumber: formData.vatNumber,
          street: formData.street,
          streetNumber: formData.streetNumber,
          postalCode: formData.postalCode,
          city: formData.city,
          country: formData.country,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          notes: formData.notes,
          inviteToApp: formData.inviteToApp
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création du contact')
      }

      logger.info("✅ [CREATE-CONTACT] Contact created successfully")
      toast.success("Contact créé avec succès !")

      // Redirection vers la liste des contacts
      router.push('/gestionnaire/contacts')
      router.refresh()
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header avec progression */}
      <StepProgressHeader
        title="Créer un contact"
        subtitle={getStepSubtitle()}
        backButtonText="Retour à la liste"
        onBack={() => router.push('/gestionnaire/contacts')}
        steps={contactSteps}
        currentStep={currentStep}
      />

      {/* Contenu principal (scrollable) */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 lg:px-10 pt-10 pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Step content will be rendered here */}
          <div className="bg-white rounded-lg border shadow-sm p-6 transition-all duration-500">
            {currentStep === 1 && (
              <Step1Type
                contactType={formData.contactType}
                personOrCompany={formData.personOrCompany}
                specialty={formData.specialty}
                onContactTypeChange={(value) => handleInputChange('contactType', value)}
                onPersonOrCompanyChange={(value) => handleInputChange('personOrCompany', value)}
                onSpecialtyChange={(value) => handleInputChange('specialty', value)}
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
                personOrCompany={formData.personOrCompany}
                firstName={formData.firstName}
                lastName={formData.lastName}
                email={formData.email}
                phone={formData.phone}
                notes={formData.notes}
                inviteToApp={formData.inviteToApp}
                onFieldChange={handleInputChange}
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
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer avec navigation */}
      <div className="sticky bottom-0 z-30 bg-gray-50/95 backdrop-blur-sm border-t border-gray-200 px-5 sm:px-6 lg:px-10 py-4">
        <div className={`flex flex-col sm:flex-row gap-2 max-w-7xl mx-auto ${currentStep === 1 ? 'justify-end' : 'justify-between'}`}>
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
            disabled={isCreating}
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
