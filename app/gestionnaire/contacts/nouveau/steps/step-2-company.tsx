'use client'

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CompanySelector } from "@/components/ui/company-selector"
import { CompanySearch } from "@/components/ui/company-search"
import { Building2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { CompanyLookupResult } from '@/lib/types/cbeapi.types'

interface Company {
  id: string
  name: string
  vat_number?: string | null
}

interface Step2CompanyProps {
  teamId: string
  companies: Company[]
  companyMode: 'new' | 'existing'
  companyId?: string
  companyName?: string
  vatNumber?: string
  street?: string
  streetNumber?: string
  postalCode?: string
  city?: string
  country?: string
  onFieldChange: (field: string, value: any) => void
}

export function Step2Company({
  teamId,
  companies,
  companyMode,
  companyId,
  companyName,
  vatNumber,
  street,
  streetNumber,
  postalCode,
  city,
  country,
  onFieldChange
}: Step2CompanyProps) {
  const { toast } = useToast()

  // Formater le numéro de TVA : supprimer espaces et caractères spéciaux, mettre en majuscule
  const formatVatNumber = (value: string): string => {
    return value
      .replace(/\s+/g, '') // Supprimer tous les espaces
      .replace(/[^A-Za-z0-9]/g, '') // Garder seulement lettres et chiffres
      .toUpperCase() // Tout en majuscule
  }

  // Fonction pour pré-remplir le formulaire avec les données d'une entreprise
  const handleCompanySelect = (company: CompanyLookupResult) => {
    onFieldChange('companyName', company.name)
    onFieldChange('vatNumber', company.vat_number)
    onFieldChange('street', company.street)
    onFieldChange('streetNumber', company.street_number)
    onFieldChange('postalCode', company.postal_code)
    onFieldChange('city', company.city)
    onFieldChange('country', company.country)

    toast({
      title: "✅ Entreprise trouvée",
      description: `Les données de ${company.name} ont été pré-remplies.`,
      variant: "default"
    })
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Informations de la société</h2>
        <p className="text-gray-600">
          Créez une nouvelle société ou sélectionnez une société existante dans votre équipe.
        </p>
      </div>

      {/* Mode de création */}
      <div className="space-y-4">
        <RadioGroup
          value={companyMode}
          onValueChange={(value) => onFieldChange('companyMode', value)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {/* Nouvelle société */}
          <div className="relative h-full">
            <RadioGroupItem
              value="new"
              id="new-company"
              className="peer sr-only"
            />
            <Label
              htmlFor="new-company"
              className="flex flex-col items-start h-full rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-5 w-5" />
                <div className="font-semibold">Nouvelle société</div>
              </div>
              <div className="text-sm text-gray-500">
                Créer une nouvelle société avec toutes ses informations
              </div>
            </Label>
          </div>

          {/* Société existante */}
          <div className="relative h-full">
            <RadioGroupItem
              value="existing"
              id="existing-company"
              className="peer sr-only"
            />
            <Label
              htmlFor="existing-company"
              className="flex flex-col items-start h-full rounded-lg border-2 border-gray-200 bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5" />
                <div className="font-semibold">Société existante</div>
              </div>
              <div className="text-sm text-gray-500">
                Sélectionner une société déjà enregistrée ({companies.length} disponible{companies.length > 1 ? 's' : ''})
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Sélection société existante */}
      {companyMode === 'existing' && (
        <div className="space-y-4 p-6 border rounded-lg bg-purple-50/30">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Sélection de la société</h3>
          </div>
          <div className="space-y-3">
            <Label>
              Société <span className="text-red-500">*</span>
            </Label>
            <CompanySelector
              teamId={teamId}
              value={companyId || null}
              onChange={(id) => onFieldChange('companyId', id)}
              placeholder="Sélectionnez une société..."
            />
            <p className="text-sm text-gray-500">
              Sélectionnez une société existante de votre équipe.
            </p>
          </div>
        </div>
      )}

      {/* Détails nouvelle société */}
      {companyMode === 'new' && (
        <div className="space-y-6 p-6 border rounded-lg bg-purple-50/30">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Détails de la nouvelle société</h3>
          </div>

          {/* Barres de recherche côte à côte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CompanySearch
              searchType="name"
              teamId={teamId}
              onSelect={handleCompanySelect}
              label="Rechercher par nom d'entreprise"
              placeholder="Tapez le nom de l'entreprise..."
            />
            <CompanySearch
              searchType="vat"
              teamId={teamId}
              onSelect={handleCompanySelect}
              label="Rechercher par numéro de TVA"
              placeholder="BE0123456789"
            />
          </div>

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-purple-50/30 text-gray-500">
                Ou remplissez manuellement le formulaire ci-dessous
              </span>
            </div>
          </div>

          {/* Nom de la société */}
          <div className="space-y-2">
            <Label htmlFor="company-name">
              Nom de la société <span className="text-red-500">*</span>
            </Label>
            <Input
              id="company-name"
              value={companyName || ''}
              onChange={(e) => onFieldChange('companyName', e.target.value)}
              placeholder="ACME SPRL"
            />
          </div>

          {/* Numéro de TVA (lecture seule après recherche) */}
          <div className="space-y-2">
            <Label htmlFor="vat-number">
              Numéro de TVA <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vat-number"
              value={vatNumber || ''}
              onChange={(e) => onFieldChange('vatNumber', formatVatNumber(e.target.value))}
              placeholder="BE0123456789"
            />
            <p className="text-sm text-gray-500">
              Format: BE0123456789, FR12345678901, etc.
            </p>
          </div>

          {/* Adresse - Grid 6 colonnes */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div className="space-y-2 sm:col-span-4">
              <Label htmlFor="street">
                Rue <span className="text-red-500">*</span>
              </Label>
              <Input
                id="street"
                value={street || ''}
                onChange={(e) => onFieldChange('street', e.target.value)}
                placeholder="Rue de la Paix"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="street-number">
                N° <span className="text-red-500">*</span>
              </Label>
              <Input
                id="street-number"
                value={streetNumber || ''}
                onChange={(e) => onFieldChange('streetNumber', e.target.value)}
                placeholder="42"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal-code">
                Code postal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="postal-code"
                value={postalCode || ''}
                onChange={(e) => onFieldChange('postalCode', e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="city">
                Ville <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={city || ''}
                onChange={(e) => onFieldChange('city', e.target.value)}
                placeholder="Bruxelles"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="country">
                Pays <span className="text-red-500">*</span>
              </Label>
              <Select value={country || 'BE'} onValueChange={(value) => onFieldChange('country', value)}>
                <SelectTrigger id="country" className="w-full">
                  <SelectValue placeholder="Sélectionnez un pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BE">Belgique</SelectItem>
                  <SelectItem value="FR">France</SelectItem>
                  <SelectItem value="NL">Pays-Bas</SelectItem>
                  <SelectItem value="DE">Allemagne</SelectItem>
                  <SelectItem value="LU">Luxembourg</SelectItem>
                  <SelectItem value="CH">Suisse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
