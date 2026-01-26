import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User, Building2 } from "lucide-react"
import { InterventionTypeCombobox } from "@/components/intervention/intervention-type-combobox"

interface Step1TypeProps {
  contactType: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'autre'
  personOrCompany: 'person' | 'company'
  specialty?: string
  customRoleDescription?: string
  onContactTypeChange: (value: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'autre') => void
  onPersonOrCompanyChange: (value: 'person' | 'company') => void
  onSpecialtyChange: (value: string) => void
  onCustomRoleDescriptionChange: (value: string) => void
}

export function Step1Type({
  contactType,
  personOrCompany,
  specialty,
  customRoleDescription,
  onContactTypeChange,
  onPersonOrCompanyChange,
  onSpecialtyChange,
  onCustomRoleDescriptionChange
}: Step1TypeProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Type de contact</h2>
        <p className="text-muted-foreground">
          Sélectionnez le type de contact et indiquez s'il s'agit d'une personne physique ou d'une société.
        </p>
      </div>

      {/* Type de contact et Spécialité sur la même ligne */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Catégorie de contact */}
        <div className="space-y-3">
          <Label htmlFor="contact-type" className="text-base font-medium">
            Catégorie <span className="text-red-500">*</span>
          </Label>
          <Select value={contactType} onValueChange={onContactTypeChange}>
            <SelectTrigger id="contact-type" className="w-full">
              <SelectValue placeholder="Sélectionnez un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="locataire">Locataire</SelectItem>
              <SelectItem value="proprietaire">Propriétaire</SelectItem>
              <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
              <SelectItem value="prestataire">Prestataire</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Spécialité (si Prestataire) */}
        {contactType === 'prestataire' && (
          <div className="space-y-3">
            <Label htmlFor="specialty" className="text-base font-medium">
              Spécialité <span className="text-red-500">*</span>
            </Label>
            <InterventionTypeCombobox
              value={specialty || ''}
              onValueChange={onSpecialtyChange}
              placeholder="Sélectionnez une spécialité"
              categoryFilter="bien"
            />
          </div>
        )}

        {/* Description personnalisée (si Autre) */}
        {contactType === 'autre' && (
          <div className="space-y-3">
            <Label htmlFor="customRoleDescription" className="text-base font-medium">
              Précisez le type de contact <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customRoleDescription"
              placeholder="Ex: Architecte, Notaire, Assureur..."
              value={customRoleDescription || ''}
              onChange={(e) => onCustomRoleDescriptionChange(e.target.value)}
              maxLength={100}
              className="w-full"
            />
          </div>
        )}
      </div>


      {/* Personne ou Société */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          Personne ou Entreprise <span className="text-red-500">*</span>
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
    </div>
  )
}
