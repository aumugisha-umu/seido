/**
 * Centralized validation patterns and regex
 * Used across the application for consistent validation
 */

/**
 * Email validation regex
 * Validates basic email format: local@domain.tld
 * - No whitespace allowed
 * - Must have @ symbol
 * - Must have domain with at least one dot
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate email format
 * @param email - Email string to validate
 * @returns true if email format is valid
 */
export const isValidEmail = (email: string | null | undefined): boolean => {
  if (!email) return false
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Phone number validation regex (international format)
 * Accepts formats like: +32 123 456 789, +33123456789, 0123456789
 */
export const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/

/**
 * Validate phone number format
 * @param phone - Phone string to validate
 * @returns true if phone format is valid
 */
export const isValidPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false
  const cleaned = phone.replace(/\s+/g, '')
  return cleaned.length >= 6 && PHONE_REGEX.test(cleaned)
}

/**
 * Belgian VAT number regex (format: BE0123456789)
 */
export const BELGIAN_VAT_REGEX = /^BE[01]?\d{9}$/

/**
 * Generic VAT number regex (2-3 letter country prefix + 8-12 digits)
 */
export const VAT_REGEX = /^[A-Z]{2,3}\d{8,12}$/
