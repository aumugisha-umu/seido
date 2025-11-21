/**
 * VAT Number Validator
 * Validates European VAT numbers (Belgium, France, and other EU countries)
 */

export type VatValidationResult = {
  isValid: boolean
  country?: string
  error?: string
}

/**
 * VAT number formats by country
 */
const VAT_PATTERNS = {
  BE: {
    regex: /^BE[0-1]\d{9}$/,
    name: 'Belgique',
    description: 'Format: BE0123456789 (10 chiffres après BE)',
    example: 'BE0123456789'
  },
  FR: {
    regex: /^FR[A-Z0-9]{2}\d{9}$/,
    name: 'France',
    description: 'Format: FRXX123456789 (2 caractères + 9 chiffres après FR)',
    example: 'FR12345678901'
  },
  NL: {
    regex: /^NL\d{9}B\d{2}$/,
    name: 'Pays-Bas',
    description: 'Format: NL123456789B01',
    example: 'NL123456789B01'
  },
  DE: {
    regex: /^DE\d{9}$/,
    name: 'Allemagne',
    description: 'Format: DE123456789 (9 chiffres après DE)',
    example: 'DE123456789'
  },
  LU: {
    regex: /^LU\d{8}$/,
    name: 'Luxembourg',
    description: 'Format: LU12345678 (8 chiffres après LU)',
    example: 'LU12345678'
  },
  CH: {
    regex: /^CHE-\d{3}\.\d{3}\.\d{3}$/,
    name: 'Suisse',
    description: 'Format: CHE-123.456.789',
    example: 'CHE-123.456.789'
  }
} as const

/**
 * Validate a VAT number
 * @param vatNumber - The VAT number to validate (e.g., "BE0123456789")
 * @param strictCountry - Optional country code to enforce (e.g., "BE")
 * @returns Validation result with country and error message if invalid
 */
export function validateVatNumber(
  vatNumber: string,
  strictCountry?: keyof typeof VAT_PATTERNS
): VatValidationResult {
  // Remove spaces and convert to uppercase
  const cleanVat = vatNumber.trim().toUpperCase().replace(/\s/g, '')

  if (!cleanVat) {
    return {
      isValid: false,
      error: 'Le numéro de TVA est requis'
    }
  }

  // Extract country code (first 2 characters or 3 for Switzerland)
  const countryCode = cleanVat.startsWith('CHE') ? 'CHE' : cleanVat.substring(0, 2)

  // Check if country code is supported
  const countryKey = countryCode === 'CHE' ? 'CH' : countryCode as keyof typeof VAT_PATTERNS
  if (!(countryKey in VAT_PATTERNS)) {
    return {
      isValid: false,
      error: `Code pays non supporté: ${countryCode}. Codes supportés: ${Object.keys(VAT_PATTERNS).join(', ')}`
    }
  }

  // If strict country is specified, check it matches
  if (strictCountry && countryKey !== strictCountry) {
    return {
      isValid: false,
      country: VAT_PATTERNS[countryKey].name,
      error: `Le numéro de TVA doit être de type ${VAT_PATTERNS[strictCountry].name} (${strictCountry})`
    }
  }

  // Validate format
  const pattern = VAT_PATTERNS[countryKey]
  if (!pattern.regex.test(cleanVat)) {
    return {
      isValid: false,
      country: pattern.name,
      error: `Format invalide pour ${pattern.name}. ${pattern.description}. Exemple: ${pattern.example}`
    }
  }

  // Additional validation for Belgium (checksum)
  if (countryKey === 'BE') {
    const isValidBE = validateBelgianVat(cleanVat)
    if (!isValidBE) {
      return {
        isValid: false,
        country: pattern.name,
        error: 'Numéro de TVA belge invalide (vérification du checksum échouée)'
      }
    }
  }

  return {
    isValid: true,
    country: pattern.name
  }
}

/**
 * Validate Belgian VAT number with checksum verification
 * Belgian VAT format: BE0123456789
 * Checksum: The first 8 digits mod 97 must equal 97 - (last 2 digits)
 */
function validateBelgianVat(vatNumber: string): boolean {
  // Extract digits only (remove BE prefix)
  const digits = vatNumber.substring(2)

  // Must be exactly 10 digits
  if (digits.length !== 10) return false

  // First digit must be 0 or 1
  if (digits[0] !== '0' && digits[0] !== '1') return false

  // Extract first 8 digits and last 2 digits
  const first8 = parseInt(digits.substring(0, 8), 10)
  const last2 = parseInt(digits.substring(8, 10), 10)

  // Checksum validation: (first 8 digits mod 97) should equal (97 - last 2 digits)
  const checksum = 97 - (first8 % 97)

  return checksum === last2
}

/**
 * Validate French VAT number (SIREN-based)
 * French VAT format: FRXX123456789
 * Where XX is a 2-character key (letters or digits)
 * And the 9 digits are the SIREN number
 */
export function validateFrenchVat(vatNumber: string): boolean {
  // Extract components
  const key = vatNumber.substring(2, 4)
  const siren = vatNumber.substring(4, 13)

  // Must be exactly 9 digits for SIREN
  if (siren.length !== 9 || !/^\d{9}$/.test(siren)) return false

  // Key validation (simplified - actual algorithm is complex)
  // For now, we just check format
  return /^[A-Z0-9]{2}$/.test(key)
}

/**
 * Format a VAT number with proper spacing for display
 * @param vatNumber - The VAT number to format
 * @returns Formatted VAT number
 */
export function formatVatNumber(vatNumber: string): string {
  const clean = vatNumber.trim().toUpperCase().replace(/\s/g, '')

  // Belgium: BE 0123.456.789 (official format with dots)
  if (clean.startsWith('BE')) {
    return `${clean.substring(0, 2)} ${clean.substring(2, 6)}.${clean.substring(6, 9)}.${clean.substring(9, 12)}`
  }

  // France: FR 12 123456789
  if (clean.startsWith('FR')) {
    return `${clean.substring(0, 2)} ${clean.substring(2, 4)} ${clean.substring(4, 13)}`
  }

  // Netherlands: NL 123456789 B01
  if (clean.startsWith('NL')) {
    return `${clean.substring(0, 2)} ${clean.substring(2, 11)} ${clean.substring(11, 14)}`
  }

  // Default: just add space after country code
  return `${clean.substring(0, 2)} ${clean.substring(2)}`
}

/**
 * Get VAT country information
 * @param vatNumber - The VAT number
 * @returns Country information or null
 */
export function getVatCountryInfo(vatNumber: string) {
  const clean = vatNumber.trim().toUpperCase().replace(/\s/g, '')
  const countryCode = clean.startsWith('CHE') ? 'CH' : clean.substring(0, 2) as keyof typeof VAT_PATTERNS

  if (!(countryCode in VAT_PATTERNS)) {
    return null
  }

  return VAT_PATTERNS[countryCode]
}

/**
 * Normalize VAT number (remove spaces, uppercase)
 * @param vatNumber - The VAT number to normalize
 * @returns Normalized VAT number
 */
export function normalizeVatNumber(vatNumber: string): string {
  return vatNumber.trim().toUpperCase().replace(/\s/g, '')
}
