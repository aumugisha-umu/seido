/**
 * Lot Validator
 * Zod schema and validation for lot imports
 */

import { z } from 'zod';
import type {
  RawLotRow,
  ParsedLot,
  ImportRowError,
} from '../types';
import {
  LOT_CATEGORIES,
  ERROR_MESSAGES,
  VALIDATION_CONSTRAINTS,
  SHEET_NAMES,
} from '../constants';

// ============================================================================
// Zod Schema
// ============================================================================

export const lotImportSchema = z.object({
  reference: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.lot.reference.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Référence')
    )
    .max(
      VALIDATION_CONSTRAINTS.lot.reference.maxLength,
      `La référence ne doit pas dépasser ${VALIDATION_CONSTRAINTS.lot.reference.maxLength} caractères`
    ),
  building_name: z
    .string()
    .max(200, 'Le nom d\'immeuble ne doit pas dépasser 200 caractères')
    .optional()
    .nullable(),
  category: z
    .enum(LOT_CATEGORIES as unknown as [string, ...string[]])
    .default('appartement'),
  floor: z
    .number()
    .int('L\'étage doit être un nombre entier')
    .min(
      VALIDATION_CONSTRAINTS.lot.floor.min,
      `L'étage minimum est ${VALIDATION_CONSTRAINTS.lot.floor.min}`
    )
    .max(
      VALIDATION_CONSTRAINTS.lot.floor.max,
      `L'étage maximum est ${VALIDATION_CONSTRAINTS.lot.floor.max}`
    )
    .optional()
    .nullable(),
  street: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.lot.street.maxLength,
      `La rue ne doit pas dépasser ${VALIDATION_CONSTRAINTS.lot.street.maxLength} caractères`
    )
    .optional()
    .nullable(),
  city: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.lot.city.maxLength,
      `La ville ne doit pas dépasser ${VALIDATION_CONSTRAINTS.lot.city.maxLength} caractères`
    )
    .optional()
    .nullable(),
  postal_code: z
    .string()
    .regex(VALIDATION_CONSTRAINTS.lot.postal_code.pattern, 'Code postal invalide')
    .optional()
    .nullable()
    .or(z.literal('')),
  description: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.lot.description.maxLength,
      `La description ne doit pas dépasser ${VALIDATION_CONSTRAINTS.lot.description.maxLength} caractères`
    )
    .optional()
    .nullable(),
});

export type LotImportData = z.infer<typeof lotImportSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single lot row
 */
export function validateLotRow(
  row: RawLotRow,
  rowIndex: number
): { data?: ParsedLot; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];

  // Transform raw data
  const transformed = {
    reference: String(row['Référence'] || row['Référence*'] || '').trim(),
    building_name: row['Nom Immeuble']
      ? String(row['Nom Immeuble']).trim()
      : undefined,
    category: normalizeCategory(row['Catégorie']),
    floor: parseFloor(row['Étage']),
    street: row['Rue'] ? String(row['Rue']).trim() : undefined,
    city: row['Ville'] ? String(row['Ville']).trim() : undefined,
    postal_code: row['Code Postal']
      ? String(row['Code Postal']).trim()
      : undefined,
    description: row['Description']
      ? String(row['Description']).trim()
      : undefined,
  };

  // Validate with Zod
  const result = lotImportSchema.safeParse(transformed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex + 2,
        sheet: SHEET_NAMES.LOTS,
        field: issue.path[0] as string,
        value: transformed[issue.path[0] as keyof typeof transformed],
        message: issue.message,
        code: mapZodErrorToCode(issue.code),
      });
    }
    return { errors };
  }

  // Validate standalone lot has address
  if (!result.data.building_name) {
    if (!result.data.street && !result.data.city) {
      // Warning: standalone lot without full address
      // This is allowed but might be intentional
    }
  }

  return {
    data: {
      ...result.data,
      category: result.data.category || 'appartement',
      floor: result.data.floor ?? undefined,
      street: result.data.street ?? undefined,
      city: result.data.city ?? undefined,
      postal_code: result.data.postal_code ?? undefined,
      description: result.data.description ?? undefined,
      building_name: result.data.building_name ?? undefined,
      _rowIndex: rowIndex,
    },
    errors: [],
  };
}

/**
 * Validate all lot rows
 */
export function validateLotRows(
  rows: RawLotRow[]
): { data: ParsedLot[]; errors: ImportRowError[] } {
  const allErrors: ImportRowError[] = [];
  const validData: ParsedLot[] = [];
  const seenReferences = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const { data, errors } = validateLotRow(rows[i], i);

    if (errors.length > 0) {
      allErrors.push(...errors);
      continue;
    }

    if (data) {
      // Check for duplicates within file
      const normalizedRef = data.reference.toLowerCase().trim();
      const existingRow = seenReferences.get(normalizedRef);

      if (existingRow !== undefined) {
        allErrors.push({
          row: i + 2,
          sheet: SHEET_NAMES.LOTS,
          field: 'reference',
          value: data.reference,
          message: ERROR_MESSAGES.DUPLICATE_IN_FILE('Référence', data.reference),
          code: 'DUPLICATE_IN_FILE',
        });
        continue;
      }

      seenReferences.set(normalizedRef, i + 2);
      validData.push(data);
    }
  }

  return { data: validData, errors: allErrors };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize category value
 */
function normalizeCategory(value: unknown): string {
  if (!value) return 'appartement';

  const str = String(value).toLowerCase().trim();

  // Handle common variations
  // Note: 'collocation'/'coloc' now maps to 'appartement' (collocation is a mode of occupation, not a property type)
  const mappings: Record<string, string> = {
    'appartement': 'appartement',
    'appart': 'appartement',
    'apt': 'appartement',
    'collocation': 'appartement',
    'coloc': 'appartement',
    'maison': 'maison',
    'house': 'maison',
    'garage': 'garage',
    'local_commercial': 'local_commercial',
    'local commercial': 'local_commercial',
    'commerce': 'local_commercial',
    'boutique': 'local_commercial',
    'autre': 'autre',
    'other': 'autre',
  };

  return mappings[str] || 'autre';
}

/**
 * Parse floor value
 */
function parseFloor(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const num = parseInt(String(value), 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Map Zod error code to import error code
 */
function mapZodErrorToCode(
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
    default:
      return 'UNKNOWN';
  }
}
