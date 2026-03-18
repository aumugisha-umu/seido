/**
 * Shared Validator Utilities
 * Common helper functions used across all import validators
 */

import { z } from 'zod';
import type { ImportRowError } from '../types';

// ============================================================================
// Zod Error Mapping
// ============================================================================

/**
 * Map Zod error code to import error code
 */
export function mapZodErrorToCode(
  zodCode: z.ZodIssueCode
): ImportRowError['code'] {
  switch (zodCode) {
    case 'too_small':
    case 'too_big':
      return 'REQUIRED_FIELD';
    case 'invalid_type':
      return 'INVALID_FORMAT';
    case 'invalid_enum_value':
      return 'INVALID_ENUM';
    case 'invalid_string':
      return 'INVALID_FORMAT';
    default:
      return 'UNKNOWN';
  }
}

// ============================================================================
// Normalization Helpers
// ============================================================================

/**
 * Normalize country value to a standard country string
 */
export function normalizeCountry(value: unknown, defaultValue: string = 'france'): string {
  if (!value) return defaultValue;

  const str = String(value).toLowerCase().trim();

  // Handle common variations
  const mappings: Record<string, string> = {
    'france': 'france',
    'fr': 'france',
    'belgique': 'belgique',
    'be': 'belgique',
    'belgium': 'belgique',
    'suisse': 'suisse',
    'ch': 'suisse',
    'switzerland': 'suisse',
    'luxembourg': 'luxembourg',
    'lu': 'luxembourg',
    'allemagne': 'allemagne',
    'de': 'allemagne',
    'germany': 'allemagne',
    'pays-bas': 'pays-bas',
    'nl': 'pays-bas',
    'netherlands': 'pays-bas',
    'autre': 'autre',
    'other': 'autre',
  };

  return mappings[str] || 'autre';
}

/**
 * Normalize phone number
 */
export function normalizePhone(value: unknown): string | undefined {
  if (!value) return undefined;

  let phone = String(value).trim();

  // Remove common separators
  phone = phone.replace(/[\s.-]/g, '');

  // Add French prefix if needed
  if (phone.startsWith('0') && phone.length === 10) {
    // Keep as is
  } else if (phone.startsWith('+33')) {
    // Already has country code
  } else if (phone.length === 9 && !phone.startsWith('0')) {
    phone = '0' + phone;
  }

  return phone || undefined;
}
