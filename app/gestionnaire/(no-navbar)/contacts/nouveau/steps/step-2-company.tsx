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
import { getVatCodeForCountry } from "@/lib/constants/vat"

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
  const normalizeVatNumber = (value: string): string => {
    return value
      .replace(/\s+/g, '') // Supprimer tous les espaces
      .replace(/[^A-Za-z0-9]/g, '') // Garder seulement lettres et chiffres
      .toUpperCase() // Tout en majuscule
  }

  // Formater le numéro de TVA pour l'affichage avec espaces
  const formatVatNumberDisplay = (value: string): string => {
    const clean = normalizeVatNumber(value)
    if (!clean) return ''

    // Extraire le code pays (2 ou 3 lettres) ou utiliser le pays sélectionné
    let countryCode = clean.startsWith('CHE') ? 'CHE' : clean.substring(0, 2)
    let digits = clean.substring(countryCode.length)

    // Si pas de code pays détecté mais que ce sont uniquement des chiffres, utiliser le pays sélectionné
    if (!/^[A-Z]{2,3}$/.test(countryCode) && /^\d+$/.test(clean)) {
      countryCode = getVatCodeForCountry(country)
      digits = clean
    }

    // Formatage selon le pays
    if (countryCode === 'BE' && digits.length === 10) {
      // BE: BE 0123 456 789
      return `${countryCode} ${digits.substring(0, 4)} ${digits.substring(4, 7)} ${digits.substring(7, 10)}`
    } else if (countryCode === 'FR' && digits.length === 11) {
      // FR: FR 12 345 678 901
      return `${countryCode} ${digits.substring(0, 2)} ${digits.substring(2, 5)} ${digits.substring(5, 8)} ${digits.substring(8, 11)}`
    } else if (countryCode === 'NL' && digits.length === 12) {
      // NL: NL 123456789 B01
      return `${countryCode} ${digits.substring(0, 9)} ${digits.substring(9, 12)}`
    } else if (countryCode === 'DE' && digits.length === 9) {
      // DE: DE 123 456 789
      return `${countryCode} ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 9)}`
    } else if (countryCode === 'LU' && digits.length === 8) {
      // LU: LU 123 456 78
      return `${countryCode} ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 8)}`
    } else if (countryCode === 'CHE' && digits.length === 9) {
      // CHE: CHE 123 456 789
      return `${countryCode} ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 9)}`
    }

    // Format par défaut : espace après le code pays
    return `${countryCode} ${digits}`
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
        <h2 className="text-2xl font-semibold text-foreground mb-2">Informations de la société</h2>
        <p className="text-muted-foreground">
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
              className="flex flex-col items-start h-full rounded-lg border-2 border-border bg-card p-4 hover:bg-muted peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 dark:peer-data-[state=checked]:bg-purple-950 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-5 w-5" />
                <div className="font-semibold text-foreground">Nouvelle société</div>
              </div>
              <div className="text-sm text-muted-foreground">
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
              className="flex flex-col items-start h-full rounded-lg border-2 border-border bg-card p-4 hover:bg-muted peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:bg-purple-50 dark:peer-data-[state=checked]:bg-purple-950 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5" />
                <div className="font-semibold text-foreground">Société existante</div>
              </div>
              <div className="text-sm text-muted-foreground">
                Sélectionner une société déjà enregistrée ({companies.length} disponible{companies.length > 1 ? 's' : ''})
              </div>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Sélection société existante */}
      {companyMode === 'existing' && (
        <div className="space-y-4 p-6 border rounded-lg bg-purple-50/30 dark:bg-purple-950/30">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-foreground">Sélection de la société</h3>
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
            <p className="text-sm text-muted-foreground">
              Sélectionnez une société existante de votre équipe.
            </p>
          </div>
        </div>
      )}

      {/* Détails nouvelle société */}
      {companyMode === 'new' && (
        <div className="space-y-6 p-6 border rounded-lg bg-purple-50/30 dark:bg-purple-950/30">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-foreground">Détails de la nouvelle société</h3>
          </div>

          {/* Recherche unifiée */}
          <CompanySearch
            searchType="auto"
            teamId={teamId}
            onSelect={handleCompanySelect}
            label="Rechercher une société"
            placeholder="Nom d'entreprise ou numéro de TVA..."
          />

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-purple-50/30 dark:bg-purple-950/30 text-muted-foreground">
                Ou remplissez manuellement le formulaire ci-dessous
              </span>
            </div>
          </div>

          {/* Nom de la société + Numéro de TVA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="vat-number">
                Numéro de TVA <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vat-number"
                value={vatNumber ? formatVatNumberDisplay(vatNumber) : ''}
                onChange={(e) => {
                  const normalized = normalizeVatNumber(e.target.value)
                  // Si ce sont uniquement des chiffres, ajouter le préfixe du pays sélectionné
                  if (normalized && /^\d+$/.test(normalized)) {
                    const vatCode = getVatCodeForCountry(country)
                    onFieldChange('vatNumber', `${vatCode}${normalized}`)
                  } else {
                    onFieldChange('vatNumber', normalized)
                  }
                }}
                placeholder="0123456789"
              />
              <p className="text-sm text-muted-foreground">
                Format: BE 0123 456 789, FR 12 345 678 901, etc.
              </p>
            </div>
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
