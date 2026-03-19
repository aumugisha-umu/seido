import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User, Building2, Tag, Wrench, Users, Layers, UserPlus, Home, Crown, Shield } from "lucide-react"
import { InterventionTypeCombobox } from "@/components/intervention/intervention-type-combobox"
import { PROVIDER_CATEGORIES, PROVIDER_CATEGORY_ICONS } from "@/components/contact-details/constants"
import type { InterventionTypesData } from "@/lib/services/domain/intervention-types.server"

interface Step1TypeProps {
  contactType: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'garant'
  personOrCompany: 'person' | 'company'
  specialty?: string
  providerCategory?: string
  customRoleDescription?: string
  initialInterventionTypes?: InterventionTypesData | null
  onContactTypeChange: (value: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'garant') => void
  onPersonOrCompanyChange: (value: 'person' | 'company') => void
  onSpecialtyChange: (value: string) => void
  onProviderCategoryChange: (value: string) => void
  onCustomRoleDescriptionChange: (value: string) => void
}

export function Step1Type({
  contactType,
  personOrCompany,
  specialty,
  providerCategory,
  customRoleDescription,
  initialInterventionTypes,
  onContactTypeChange,
  onPersonOrCompanyChange,
  onSpecialtyChange,
  onProviderCategoryChange,
  onCustomRoleDescriptionChange
}: Step1TypeProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Type de contact</h2>
        <p className="text-muted-foreground">
          {contactType === 'gestionnaire'
            ? "Ajoutez un nouveau gestionnaire à votre équipe."
            : "Sélectionnez le type de contact et indiquez s'il s'agit d'une personne physique ou d'une société."}
        </p>
      </div>

      {/* Type de contact + prestataire fields on same row */}
      <div className={`grid grid-cols-1 gap-4 ${contactType === 'prestataire' && providerCategory === 'artisan' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {/* Catégorie de contact */}
        <div className="space-y-3">
          <Label htmlFor="contact-type" icon={Tag} required>
            Catégorie
          </Label>
          <Select value={contactType} onValueChange={onContactTypeChange}>
            <SelectTrigger id="contact-type" className="w-full">
              <SelectValue placeholder="Sélectionnez un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="locataire">Locataire</SelectItem>
              <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
              <SelectItem value="prestataire">Prestataire</SelectItem>
              <SelectItem value="proprietaire">Propriétaire</SelectItem>
              <SelectItem value="garant">Garant</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Catégorie de prestataire (si Prestataire) */}
        {contactType === 'prestataire' && (
          <div className="space-y-3">
            <Label htmlFor="provider-category" icon={Layers}>
              Type de prestataire
            </Label>
            <Select value={providerCategory || ''} onValueChange={(value) => {
              onProviderCategoryChange(value)
              // Clear specialty when switching away from artisan
              if (value !== 'artisan' && specialty) {
                onSpecialtyChange('')
              }
            }}>
              <SelectTrigger id="provider-category" className="w-full">
                <SelectValue placeholder="Sélectionnez un type" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_CATEGORIES.map((cat) => {
                  const Icon = PROVIDER_CATEGORY_ICONS[cat.value]
                  return (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                        {cat.label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Spécialité (si Prestataire + Artisan) */}
        {contactType === 'prestataire' && providerCategory === 'artisan' && (
          <div className="space-y-3">
            <Label htmlFor="specialty" icon={Wrench}>
              Spécialité
            </Label>
            <InterventionTypeCombobox
              value={specialty || ''}
              onValueChange={onSpecialtyChange}
              placeholder="Sélectionnez une spécialité"
              categoryFilter="bien"
              initialData={initialInterventionTypes}
              showCategoryHeaders={false}
            />
          </div>
        )}

        {/* customRoleDescription field removed — garant is a defined role, no description needed */}
      </div>


      {/* Info card per contact type */}
      {contactType === 'prestataire' && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/50 dark:border-green-800 p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-green-100 dark:bg-green-900">
              <Wrench className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-green-900 dark:text-green-100">
                Prestataire de services
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                S'il est invité, ce prestataire pourra consulter ses interventions assignées, soumettre des devis, confirmer des créneaux et échanger avec les gestionnaires et les locataires via le chat des interventions.
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-2">
              Il recevra toutes ses notifications par email et pourra répondre directement par email. Vous trouverez ses réponses dans le chat de l'intervention concernée.
              </p>
            </div>
          </div>
        </div>
      )}

      {contactType === 'locataire' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800 p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
              <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Locataire
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                S'il est invité, ce locataire pourra signaler des problèmes, suivre l'avancement des interventions le concernant et échanger avec les gestionnaires via le chat de l'intervention. 
                
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
              Il recevra toutes ses notifications par email et pourra répondre directement par email. Vous trouverez ses réponses dans le chat de l'intervention concernée.
              </p>
            </div>
          </div>
        </div>
      )}

      {contactType === 'gestionnaire' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-800 p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Nouveau membre d&apos;équipe
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Cette personne rejoindra votre équipe avec un accès complet. Elle recevra un email d&apos;invitation pour activer son compte.
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-2">
                Vous pouvez révoquer cet accès à tout moment dans la section contacts.
              </p>
            </div>
          </div>
        </div>
      )}

      {contactType === 'proprietaire' && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-950/50 dark:border-purple-800 p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900">
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                Propriétaire
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Pour l'instant, les propriétaires ne peuvent pas être invités dans l'application. Cette fonctionnalité arrive prochainement pour leur permettre d'accéder aux informations et rapports sur leur patrimoine. Ce contact peut néanmoins déjà être enregistré dans votre base de données.
              </p>
            </div>
          </div>
        </div>
      )}

      {contactType === 'garant' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-800 p-5">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900">
              <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                Garant
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Les garants ne peuvent pas être invités dans l&apos;application pour l&apos;instant. Ce contact sera enregistré et pourra être lié à un bail en tant que garant.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personne ou Société — for all types except gestionnaire */}
      {contactType !== 'gestionnaire' && (
        <div className="space-y-3">
          <Label icon={Users} required>
            Personne ou Entreprise
          </Label>
          <RadioGroup
            value={personOrCompany}
            onValueChange={onPersonOrCompanyChange}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Personne physique */}
            <div className="relative">
              <RadioGroupItem
                value="person"
                id="person"
                className="peer sr-only"
              />
              <Label
                htmlFor="person"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-border bg-card p-6 hover:bg-muted peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-950 cursor-pointer transition-all"
              >
                <User className="h-12 w-12 mb-3 text-muted-foreground/70 peer-data-[state=checked]:text-blue-600" />
                <div className="text-center">
                  <div className="font-semibold text-foreground">Personne physique</div>
                </div>
              </Label>
            </div>

            {/* Société */}
            <div className="relative">
              <RadioGroupItem
                value="company"
                id="company"
                className="peer sr-only"
              />
              <Label
                htmlFor="company"
                className="flex flex-col items-center justify-between rounded-lg border-2 border-border bg-card p-6 hover:bg-muted peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 dark:peer-data-[state=checked]:bg-purple-950 cursor-pointer transition-all"
              >
                <Building2 className="h-12 w-12 mb-3 text-muted-foreground/70 peer-data-[state=checked]:text-purple-600" />
                <div className="text-center">
                  <div className="font-semibold text-foreground">Société</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  )
}
