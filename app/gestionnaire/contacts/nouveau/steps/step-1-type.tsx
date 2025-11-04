import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User, Building2 } from "lucide-react"

interface Step1TypeProps {
  contactType: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'autre'
  personOrCompany: 'person' | 'company'
  specialty?: string
  onContactTypeChange: (value: 'locataire' | 'prestataire' | 'gestionnaire' | 'proprietaire' | 'autre') => void
  onPersonOrCompanyChange: (value: 'person' | 'company') => void
  onSpecialtyChange: (value: string) => void
}

export function Step1Type({
  contactType,
  personOrCompany,
  specialty,
  onContactTypeChange,
  onPersonOrCompanyChange,
  onSpecialtyChange
}: Step1TypeProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Type de contact</h2>
        <p className="text-gray-600">
          Sélectionnez le type de contact et indiquez s'il s'agit d'une personne physique ou d'une société.
        </p>
      </div>

      {/* Type de contact */}
      <div className="space-y-3">
        <Label htmlFor="contact-type" className="text-base font-medium">
          Type de contact <span className="text-red-500">*</span>
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
        <div className="space-y-3 p-4 border rounded-lg bg-purple-50/30">
          <Label htmlFor="specialty" className="text-base font-medium">
            Spécialité <span className="text-red-500">*</span>
          </Label>
          <Select value={specialty || ''} onValueChange={onSpecialtyChange}>
            <SelectTrigger id="specialty" className="w-full">
              <SelectValue placeholder="Sélectionnez une spécialité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="plomberie">Plomberie</SelectItem>
              <SelectItem value="electricite">Électricité</SelectItem>
              <SelectItem value="chauffage">Chauffage</SelectItem>
              <SelectItem value="serrurerie">Serrurerie</SelectItem>
              <SelectItem value="peinture">Peinture et revêtements</SelectItem>
              <SelectItem value="menage">Ménage et nettoyage</SelectItem>
              <SelectItem value="jardinage">Jardinage et espaces verts</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-500">
            La spécialité permettra d'attribuer automatiquement les interventions au bon prestataire.
          </p>
        </div>
      )}

      {/* Personne ou Société */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          Type de contact <span className="text-red-500">*</span>
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
              className="flex flex-col items-center justify-between rounded-lg border-2 border-gray-200 bg-white p-6 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50 cursor-pointer transition-all"
            >
              <User className="h-12 w-12 mb-3 text-gray-400 peer-data-[state=checked]:text-blue-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">Personne physique</div>
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
              className="flex flex-col items-center justify-between rounded-lg border-2 border-gray-200 bg-white p-6 hover:bg-gray-50 peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 cursor-pointer transition-all"
            >
              <Building2 className="h-12 w-12 mb-3 text-gray-400 peer-data-[state=checked]:text-purple-600" />
              <div className="text-center">
                <div className="font-semibold text-gray-900">Société</div>
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )
}
