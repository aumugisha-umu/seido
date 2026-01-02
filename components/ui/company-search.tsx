'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Building2, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/logger'
import { validateVatNumber } from '@/lib/utils/vat-validator'
import type { CompanyLookupResult } from '@/lib/types/cbeapi.types'

/**
 * Composant réutilisable de recherche d'entreprise
 * Supporte la recherche par nom OU par numéro de TVA
 * Affiche un dropdown avec les résultats
 */

export interface CompanySearchProps {
  /** Type de recherche : 'name' (par nom) ou 'vat' (par numéro de TVA) */
  searchType: 'name' | 'vat'
  /** ID de l'équipe pour la recherche */
  teamId: string
  /** Callback appelé quand l'utilisateur sélectionne une entreprise */
  onSelect: (company: CompanyLookupResult) => void
  /** Placeholder du champ de recherche (optionnel) */
  placeholder?: string
  /** Label du champ (optionnel) */
  label?: string
  /** Valeur initiale (optionnel) */
  initialValue?: string
}

export function CompanySearch({
  searchType,
  teamId,
  onSelect,
  placeholder,
  label,
  initialValue = ''
}: CompanySearchProps) {
  // État de la recherche
  const [searchValue, setSearchValue] = useState(initialValue)
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<CompanyLookupResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // État spécifique pour le formatage des numéros de TVA belges
  const [rawVatInput, setRawVatInput] = useState('')
  const [displayValue, setDisplayValue] = useState('')

  // Helper: Extraire uniquement les chiffres d'un numéro de TVA belge
  const extractBelgianVatDigits = (input: string): string => {
    return input
      .replace(/^BE/i, '') // Retirer le préfixe BE s'il est présent
      .replace(/[^0-9]/g, '') // Garder uniquement les chiffres
      .substring(0, 10) // Maximum 10 chiffres pour une TVA belge
  }

  // Helper: Formater un numéro de TVA belge pour l'affichage
  const formatBelgianVatDisplay = (digits: string): string => {
    if (digits.length === 0) return ''

    // Format: BE 0XXX.XXX.XXX
    let formatted = 'BE '

    if (digits.length <= 4) {
      formatted += digits
    } else if (digits.length <= 7) {
      formatted += digits.substring(0, 4) + '.' + digits.substring(4)
    } else {
      formatted += digits.substring(0, 4) + '.'
        + digits.substring(4, 7) + '.'
        + digits.substring(7, 10)
    }

    return formatted
  }

  // Labels par défaut selon le type de recherche
  const defaultLabel = searchType === 'name'
    ? 'Rechercher par nom d\'entreprise'
    : 'Rechercher par numéro de TVA'

  const defaultPlaceholder = searchType === 'name'
    ? 'Tapez le nom de l\'entreprise...'
    : 'BE 0123.456.789'

  // Recherche avec debounce uniforme
  useEffect(() => {
    // Reset si champ vide
    if (!searchValue || searchValue.trim().length < 2) {
      setResults([])
      setShowResults(false)
      setError(null)
      return
    }

    setError(null)

    // Pour la recherche par TVA, valider le format d'abord
    if (searchType === 'vat') {
      const validation = validateVatNumber(searchValue)
      if (!validation.isValid) {
        setError(validation.error || 'Format de numéro de TVA invalide')
        setResults([])
        setShowResults(false)
        return
      }
    }

    setIsSearching(true)

    // Debounce uniforme pour les deux types de recherche
    const delay = 500

    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/company/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchType,
            [searchType === 'name' ? 'name' : 'vatNumber']: searchValue,
            teamId,
            limit: 10
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()

        if (result.success) {
          // Pour la recherche par nom, result.data est un array
          // Pour la recherche par TVA, result.data peut être un objet ou un array
          const companies = Array.isArray(result.data) ? result.data : [result.data]
          setResults(companies)
          setShowResults(companies.length > 0)
        } else {
          setError(result.error || 'Aucun résultat trouvé')
          setResults([])
          setShowResults(false)
        }
      } catch (err) {
        logger.error('[COMPANY-SEARCH] Search error', err)
        setError('Erreur lors de la recherche')
        setResults([])
        setShowResults(false)
      } finally {
        setIsSearching(false)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [searchValue, searchType, teamId])

  // Gestion de la sélection d'une entreprise
  const handleSelectCompany = (company: CompanyLookupResult) => {
    onSelect(company)
    setShowResults(false)

    // Reset tous les états (search générique + états spécifiques VAT)
    setSearchValue('')
    setDisplayValue('')
    setRawVatInput('')
    setResults([])
  }

  // Gestion du focus
  const handleFocus = () => {
    if (results.length > 0) {
      setShowResults(true)
    }
  }

  // Gestion du blur (fermer dropdown après un délai)
  const handleBlur = () => {
    // Délai augmenté pour garantir que le clic sur résultat soit capturé
    setTimeout(() => {
      setShowResults(false)
    }, 300)
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      {label !== null && (
        <Label htmlFor={`company-search-${searchType}`}>
          {label || defaultLabel}
        </Label>
      )}

      {/* Champ de recherche */}
      <div className="relative">
        <div className="relative">
          {/* Icône de recherche à gauche */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

          {/* Input */}
          <Input
            id={`company-search-${searchType}`}
            value={searchType === 'vat' ? displayValue : searchValue}
            onChange={(e) => {
              const input = e.target.value

              if (searchType === 'vat') {
                // Extraire uniquement les chiffres
                const digits = extractBelgianVatDigits(input)
                setRawVatInput(digits)

                // Formater pour l'affichage
                const formatted = formatBelgianVatDisplay(digits)
                setDisplayValue(formatted)

                // Mettre à jour searchValue avec le préfixe BE pour l'API
                setSearchValue(digits ? `BE${digits}` : '')
              } else {
                // Recherche par nom - comportement normal
                setSearchValue(input)
              }

              setError(null)
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder || defaultPlaceholder}
            className="pl-10"
          />

          {/* Spinner de chargement à droite */}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
          )}
        </div>

        {/* Dropdown des résultats */}
        {showResults && results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.map((company, index) => (
              <button
                key={index}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault() // Empêche le blur de se déclencher avant le clic
                  handleSelectCompany(company)
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors focus:bg-gray-50 focus:outline-none"
              >
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{company.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      TVA: {company.vat_number}
                    </div>
                    <div className="text-xs text-gray-500">
                      {company.street} {company.street_number}, {company.postal_code} {company.city}
                    </div>
                    {company.status === 'inactive' && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
            <AlertCircle className="w-3 h-3" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}
