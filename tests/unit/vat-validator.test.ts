/**
 * Unit tests for VAT number validation utilities
 * @see lib/utils/vat-validator.ts
 */

import { describe, it, expect } from 'vitest'
import {
  validateVatNumber,
  formatVatNumber,
  normalizeVatNumber,
  getVatCountryInfo,
} from '@/lib/utils/vat-validator'

describe('validateVatNumber', () => {
  it('validates a correct Belgian VAT number', () => {
    // BE0123456749 → checksum: 97 - (01234567 % 97) = 97 - 48 = 49 ✓
    const result = validateVatNumber('BE0123456749')
    expect(result.isValid).toBe(true)
    expect(result.country).toBe('Belgique')
  })

  it('rejects an empty string', () => {
    const result = validateVatNumber('')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('requis')
  })

  it('rejects an unsupported country code', () => {
    const result = validateVatNumber('XX123456789')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('non supporté')
  })

  it('normalizes whitespace and case before validation', () => {
    const result = validateVatNumber('  be 0123456749  ')
    expect(result.isValid).toBe(true)
  })

  it('rejects a Belgian VAT with wrong checksum', () => {
    const result = validateVatNumber('BE0123456789')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('checksum')
  })

  it('validates a French VAT number', () => {
    const result = validateVatNumber('FR12345678901')
    expect(result.isValid).toBe(true)
    expect(result.country).toBe('France')
  })

  it('rejects invalid French VAT format', () => {
    const result = validateVatNumber('FR1234')
    expect(result.isValid).toBe(false)
  })

  it('enforces strict country when specified', () => {
    const result = validateVatNumber('FR12345678901', 'BE')
    expect(result.isValid).toBe(false)
    expect(result.error).toContain('Belgique')
  })

  it('validates a Dutch VAT number', () => {
    const result = validateVatNumber('NL123456789B01')
    expect(result.isValid).toBe(true)
    expect(result.country).toBe('Pays-Bas')
  })

  it('validates a German VAT number', () => {
    const result = validateVatNumber('DE123456789')
    expect(result.isValid).toBe(true)
    expect(result.country).toBe('Allemagne')
  })

  it('validates a Swiss VAT number', () => {
    const result = validateVatNumber('CHE-123.456.789')
    expect(result.isValid).toBe(true)
    expect(result.country).toBe('Suisse')
  })
})

describe('formatVatNumber', () => {
  it('formats Belgian VAT with dots', () => {
    expect(formatVatNumber('BE0123456789')).toBe('BE 0123.456.789')
  })

  it('formats French VAT with spaces', () => {
    expect(formatVatNumber('FR12345678901')).toBe('FR 12 345678901')
  })

  it('formats Dutch VAT with spaces', () => {
    expect(formatVatNumber('NL123456789B01')).toBe('NL 123456789 B01')
  })

  it('handles lowercase input', () => {
    expect(formatVatNumber('be0123456789')).toBe('BE 0123.456.789')
  })
})

describe('normalizeVatNumber', () => {
  it('removes spaces and uppercases', () => {
    expect(normalizeVatNumber('  be 0123 456 789  ')).toBe('BE0123456789')
  })
})

describe('getVatCountryInfo', () => {
  it('returns country info for Belgian VAT', () => {
    const info = getVatCountryInfo('BE0123456789')
    expect(info?.name).toBe('Belgique')
  })

  it('returns null for unsupported country', () => {
    expect(getVatCountryInfo('XX123')).toBeNull()
  })

  it('handles Swiss CHE prefix', () => {
    const info = getVatCountryInfo('CHE-123.456.789')
    expect(info?.name).toBe('Suisse')
  })
})
