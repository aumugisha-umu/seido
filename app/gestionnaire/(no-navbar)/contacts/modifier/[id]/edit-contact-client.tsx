"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { StepProgressHeader } from "@/components/ui/step-progress-header"
import { contactSteps } from "@/lib/step-configurations"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { logger } from "@/lib/logger"
import { useAuth } from "@/hooks/use-auth"
import { Step1Type } from "../../nouveau/steps/step-1-type"
import { Step2Company } from "../../nouveau/steps/step-2-company"
import { Step3Contact } from "../../nouveau/steps/step-3-contact"
import { Step4Confirmation } from "../../nouveau/steps/step-4-confirmation"
import { createContactService } from '@/lib/services'

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

    // Step 4: Invitation (Read-only status for edit)
    inviteToApp: boolean
}

interface EditContactClientProps {
    contactId: string
    initialData: any
    initialCompanies: Company[]
    teamId: string
}

export function EditContactClient({
    contactId,
    initialData,
    initialCompanies,
    teamId
}: EditContactClientProps) {
    const router = useRouter()
    const { userProfile } = useAuth()
    const [currentStep, setCurrentStep] = useState(1)
    const [isSaving, setIsSaving] = useState(false)

    // Helper pour mapper les types anglais vers français (pour l'affichage)
    const mapContactTypeToFrench = (englishType: string): ContactFormData['contactType'] => {
        const mapping: Record<string, ContactFormData['contactType']> = {
            'tenant': 'locataire',
            'provider': 'prestataire',
            'manager': 'gestionnaire',
            'owner': 'proprietaire',
            'other': 'autre'
        }
        return mapping[englishType] || englishType as ContactFormData['contactType']
    }

    // Helper pour mapper les types français vers anglais (pour la BDD)
    const mapContactTypeToEnglish = (frenchType: string): string => {
        const mapping: Record<string, string> = {
            'locataire': 'tenant',
            'prestataire': 'provider',
            'gestionnaire': 'manager',
            'proprietaire': 'owner',
            'autre': 'other'
        }
        return mapping[frenchType] || frenchType
    }

    // Initialiser le formulaire avec les données existantes
    const [formData, setFormData] = useState<ContactFormData>({
        contactType: mapContactTypeToFrench(initialData.role || 'tenant'),
        personOrCompany: initialData.is_company ? 'company' : 'person',
        specialty: initialData.speciality || '',

        // Company info
        companyMode: initialData.company_id ? 'existing' : 'new',
        companyId: initialData.company_id || '',
        companyName: initialData.company_name || (initialData.is_company ? initialData.name : ''),
        vatNumber: initialData.vat_number || '',
        street: initialData.street || '',
        streetNumber: initialData.street_number || '',
        postalCode: initialData.postal_code || '',
        city: initialData.city || '',
        country: initialData.country || 'Belgique',

        // Contact info
        firstName: initialData.first_name || '',
        lastName: initialData.last_name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        notes: initialData.notes || '',

        // Invitation status (read-only based on existing status)
        inviteToApp: !!initialData.auth_user_id
    })

    // Gérer les changements de formulaire
    const handleInputChange = (field: keyof ContactFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // Validation par étape
    const isCurrentStepValid = (): boolean => {
        switch (currentStep) {
            case 1: // Type de contact
                if (!formData.contactType) return false
                if (!formData.personOrCompany) return false
                if (formData.contactType === 'prestataire' && !formData.specialty) return false
                return true

            case 2: // Informations société (seulement si company)
                if (formData.personOrCompany === 'company') {
                    if (formData.companyMode === 'existing') {
                        if (!formData.companyId) return false
                    } else {
                        // Nouvelle société
                        if (!formData.companyName?.trim()) return false
                        if (!formData.vatNumber?.trim()) return false
                        if (!formData.street?.trim()) return false
                        if (!formData.streetNumber?.trim()) return false
                        if (!formData.postalCode?.trim()) return false
                        if (!formData.city?.trim()) return false
                        if (!formData.country?.trim()) return false
                    }
                }
                return true

            case 3: // Informations contact
                // Email optionnel en mode edit sauf si on veut l'inviter (mais ici inviteToApp est read only)
                if (formData.email?.trim()) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(formData.email)) return false
                }

                // Pour les contacts société : au moins email OU téléphone requis
                if (formData.personOrCompany === 'company') {
                    const hasEmail = formData.email?.trim()
                    const hasPhone = formData.phone?.trim()
                    if (!hasEmail && !hasPhone) return false
                }

                // Si personne physique, prénom OU nom requis
                if (formData.personOrCompany === 'person') {
                    if (!formData.firstName?.trim() && !formData.lastName?.trim()) return false
                }
                return true

            case 4: // Confirmation
                return true

            default:
                return true
        }
    }

    // Navigation: Suivant
    const handleNext = () => {
        if (!isCurrentStepValid()) {
            toast.error("Veuillez remplir tous les champs obligatoires")
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

    // Sauvegarde
    const handleSave = async () => {
        setIsSaving(true)

        try {
            logger.info("💾 Saving contact:", formData)

            const updateData = {
                name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.companyName || 'Contact',
                first_name: formData.firstName || null,
                last_name: formData.lastName || null,
                email: formData.email,
                phone: formData.phone || null,
                role: mapContactTypeToEnglish(formData.contactType),
                speciality: formData.specialty || null,
                notes: formData.notes || null,
                // Company fields if applicable
                company_id: formData.personOrCompany === 'company' && formData.companyMode === 'existing' ? formData.companyId : null,
                // If new company, we might need to handle that differently or assume backend handles it
                // For now, let's assume we update basic contact info. 
                // NOTE: Complex company update/creation logic might be needed if we allow changing company details here.
                // Given the scope, we focus on contact properties.
            }

            const contactService = createContactService()
            await contactService.update(contactId, updateData, userProfile?.id)

            toast.success("Contact modifié avec succès")
            router.push("/gestionnaire/contacts")
            router.refresh()

        } catch (error) {
            logger.error("❌ Error saving contact:", error)
            toast.error(error instanceof Error ? error.message : "Erreur lors de la sauvegarde")
        } finally {
            setIsSaving(false)
        }
    }

    // Déterminer le sous-titre du header
    const getStepSubtitle = () => {
        switch (currentStep) {
            case 1: return "Type de contact"
            case 2: return "Informations de la société"
            case 3: return "Coordonnées du contact"
            case 4: return "Vérifiez les informations"
            default: return ""
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header avec progression */}
            <StepProgressHeader
                title="Modifier le contact"
                subtitle={getStepSubtitle()}
                backButtonText="Retour à la liste"
                onBack={() => router.push('/gestionnaire/contacts')}
                steps={contactSteps}
                currentStep={currentStep}
            />

            {/* Contenu principal */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-4 pb-20">
                <div className="content-max-width">
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
                            // Disable invite checkbox in edit mode if already invited or handle separately
                            // For now we pass it but it might be read-only in Step3 if we wanted, 
                            // but the requirement was specifically for confirmation step.
                            // Let's keep it editable in Step 3 but read-only in Step 4.
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
                <div className={`flex flex-col sm:flex-row gap-2 content-max-width ${currentStep === 1 ? 'justify-end' : 'justify-between'}`}>
                    {currentStep > 1 && (
                        <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={isSaving}
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Retour
                        </Button>
                    )}

                    <Button
                        onClick={() => {
                            if (currentStep === contactSteps.length) {
                                handleSave()
                            } else {
                                handleNext()
                            }
                        }}
                        disabled={isSaving || !isCurrentStepValid()}
                        className={currentStep === contactSteps.length ? 'bg-blue-600 hover:bg-blue-700' : ''}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Enregistrement...
                            </>
                        ) : currentStep === contactSteps.length ? (
                            "Enregistrer les modifications"
                        ) : (
                            "Continuer"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
