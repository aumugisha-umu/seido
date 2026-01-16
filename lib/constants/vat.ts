/**
 * VAT (Value Added Tax) constants for European countries
 * Used for VAT number formatting and validation
 */

/**
 * Maps ISO 3166-1 alpha-2 country codes to VAT number prefix codes
 * Note: Switzerland uses CHE (3 letters) instead of CH (2 letters)
 */
export const COUNTRY_TO_VAT_CODE: Record<string, string> = {
  'BE': 'BE',   // Belgium
  'FR': 'FR',   // France
  'NL': 'NL',   // Netherlands
  'DE': 'DE',   // Germany
  'LU': 'LU',   // Luxembourg
  'CH': 'CHE',  // Switzerland (uses 3-letter CHE prefix)
}

/**
 * VAT number length by country (digits only, without country prefix)
 */
export const VAT_DIGITS_LENGTH: Record<string, number> = {
  'BE': 10,   // BE 0123 456 789
  'FR': 11,   // FR 12 345 678 901
  'NL': 12,   // NL 123456789B01
  'DE': 9,    // DE 123456789
  'LU': 8,    // LU 12345678
  'CHE': 9,   // CHE-123.456.789 MWST/TVA/IVA
}

/**
 * Default country code for VAT operations
 */
export const DEFAULT_VAT_COUNTRY = 'BE'

/**
 * Get VAT code prefix for a given country
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns VAT prefix code (e.g., 'BE', 'CHE')
 */
export const getVatCodeForCountry = (countryCode: string | undefined | null): string => {
  return COUNTRY_TO_VAT_CODE[countryCode || DEFAULT_VAT_COUNTRY] || DEFAULT_VAT_COUNTRY
}
