/**
 * Building Validator
 * Zod schema and validation for building imports
 */

import { z } from 'zod';
import type {
  RawBuildingRow,
  ParsedBuilding,
  ImportRowError,
} from '../types';
import {
  COUNTRIES,
  ERROR_MESSAGES,
  VALIDATION_CONSTRAINTS,
  SHEET_NAMES,
} from '../constants';

// ============================================================================
// Zod Schema
// ============================================================================

export const buildingImportSchema = z.object({
  name: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.building.name.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Nom')
    )
    .max(
      VALIDATION_CONSTRAINTS.building.name.maxLength,
      `Le nom ne doit pas dépasser ${VALIDATION_CONSTRAINTS.building.name.maxLength} caractères`
    ),
  address: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.building.address.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Adresse')
    )
    .max(
      VALIDATION_CONSTRAINTS.building.address.maxLength,
      `L'adresse ne doit pas dépasser ${VALIDATION_CONSTRAINTS.building.address.maxLength} caractères`
    ),
  city: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.building.city.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Ville')
    )
    .max(
      VALIDATION_CONSTRAINTS.building.city.maxLength,
      `La ville ne doit pas dépasser ${VALIDATION_CONSTRAINTS.building.city.maxLength} caractères`
    ),
  postal_code: z
    .string()
    .min(1, ERROR_MESSAGES.REQUIRED_FIELD('Code Postal'))
    .regex(
      VALIDATION_CONSTRAINTS.building.postal_code.pattern,
      'Le code postal doit contenir entre 4 et 10 chiffres'
    ),
  country: z
    .enum(COUNTRIES as unknown as [string, ...string[]])
    .default('france')
    .optional(),
  description: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.building.description.maxLength,
      `La description ne doit pas dépasser ${VALIDATION_CONSTRAINTS.building.description.maxLength} caractères`
    )
    .optional()
    .nullable(),
});

export type BuildingImportData = z.infer<typeof buildingImportSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single building row
 */
export function validateBuildingRow(
  row: RawBuildingRow,
  rowIndex: number
): { data?: ParsedBuilding; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];

  // Transform raw data
  const transformed = {
    name: String(row['Nom'] || row['Nom*'] || '').trim(),
    address: String(row['Adresse'] || row['Adresse*'] || '').trim(),
    city: String(row['Ville'] || row['Ville*'] || '').trim(),
    postal_code: String(row['Code Postal'] || row['Code Postal*'] || '').trim(),
    country: normalizeCountry(row['Pays']),
    description: row['Description'] ? String(row['Description']).trim() : undefined,
  };

  // Validate with Zod
  const result = buildingImportSchema.safeParse(transformed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex + 2, // +2 for 1-based + header row
        sheet: SHEET_NAMES.BUILDINGS,
        field: issue.path[0] as string,
        value: transformed[issue.path[0] as keyof typeof transformed],
        message: issue.message,
        code: mapZodErrorToCode(issue.code),
      });
    }
    return { errors };
  }

  return {
    data: {
      ...result.data,
      country: result.data.country || 'france',
      _rowIndex: rowIndex,
    },
    errors: [],
  };
}

/**
 * Validate all building rows
 */
export function validateBuildingRows(
  rows: RawBuildingRow[]
): { data: ParsedBuilding[]; errors: ImportRowError[] } {
  const allErrors: ImportRowError[] = [];
  const validData: ParsedBuilding[] = [];
  const seenNames = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const { data, errors } = validateBuildingRow(rows[i], i);

    if (errors.length > 0) {
      allErrors.push(...errors);
      continue;
    }

    if (data) {
      // Check for duplicates within file
      const normalizedName = data.name.toLowerCase().trim();
      const existingRow = seenNames.get(normalizedName);

      if (existingRow !== undefined) {
        allErrors.push({
          row: i + 2,
          sheet: SHEET_NAMES.BUILDINGS,
          field: 'name',
          value: data.name,
          message: ERROR_MESSAGES.DUPLICATE_IN_FILE('Nom', data.name),
          code: 'DUPLICATE_IN_FILE',
        });
        continue;
      }

      seenNames.set(normalizedName, i + 2);
      validData.push(data);
    }
  }

  return { data: validData, errors: allErrors };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize country value
 */
function normalizeCountry(value: unknown): string {
  if (!value) return 'france';

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
  };

  return mappings[str] || 'autre';
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
