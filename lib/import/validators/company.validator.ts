/**
 * Company Validator
 * Zod schema and validation for company imports
 */

import { z } from 'zod';
import type {
  RawCompanyRow,
  ParsedCompany,
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

export const companyImportSchema = z.object({
  name: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.company.name.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Nom')
    )
    .max(
      VALIDATION_CONSTRAINTS.company.name.maxLength,
      `Le nom ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.name.maxLength} caractères`
    ),
  legal_name: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.legal_name.maxLength,
      `Le nom légal ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.legal_name.maxLength} caractères`
    )
    .optional()
    .nullable(),
  vat_number: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.vat_number.maxLength,
      `Le numéro TVA ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.vat_number.maxLength} caractères`
    )
    .optional()
    .nullable(),
  street: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.street.maxLength,
      `La rue ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.street.maxLength} caractères`
    )
    .optional()
    .nullable(),
  street_number: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.street_number.maxLength,
      `Le numéro ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.street_number.maxLength} caractères`
    )
    .optional()
    .nullable(),
  postal_code: z
    .string()
    .optional()
    .nullable(),
  city: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.city.maxLength,
      `La ville ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.city.maxLength} caractères`
    )
    .optional()
    .nullable(),
  country: z
    .enum(COUNTRIES as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  email: z
    .string()
    .email('Format d\'email invalide')
    .max(255, 'L\'email ne doit pas dépasser 255 caractères')
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.phone.maxLength,
      `Le téléphone ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.phone.maxLength} caractères`
    )
    .optional()
    .nullable(),
  website: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.company.website.maxLength,
      `Le site web ne doit pas dépasser ${VALIDATION_CONSTRAINTS.company.website.maxLength} caractères`
    )
    .optional()
    .nullable()
    .or(z.literal('')),
});

export type CompanyImportData = z.infer<typeof companyImportSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single company row
 */
export function validateCompanyRow(
  row: RawCompanyRow,
  rowIndex: number
): { data?: ParsedCompany; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];

  // Transform raw data
  const email = row['Email'] ? String(row['Email']).trim().toLowerCase() : undefined;
  const transformed = {
    name: String(row['Nom'] || row['Nom*'] || '').trim(),
    legal_name: row['Nom Légal'] ? String(row['Nom Légal']).trim() : undefined,
    vat_number: normalizeVatNumber(row['N° TVA']),
    street: row['Rue'] ? String(row['Rue']).trim() : undefined,
    street_number: row['Numéro'] ? String(row['Numéro']).trim() : undefined,
    postal_code: row['Code Postal'] ? String(row['Code Postal']).trim() : undefined,
    city: row['Ville'] ? String(row['Ville']).trim() : undefined,
    country: normalizeCountry(row['Pays']),
    email: email && email.length > 0 ? email : undefined,
    phone: normalizePhone(row['Téléphone']),
    website: normalizeWebsite(row['Site Web']),
  };

  // Validate with Zod
  const result = companyImportSchema.safeParse(transformed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex + 2,
        sheet: SHEET_NAMES.COMPANIES,
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
      name: result.data.name,
      legal_name: result.data.legal_name || undefined,
      vat_number: result.data.vat_number || undefined,
      street: result.data.street || undefined,
      street_number: result.data.street_number || undefined,
      postal_code: result.data.postal_code || undefined,
      city: result.data.city || undefined,
      country: result.data.country || undefined,
      email: result.data.email || undefined,
      phone: result.data.phone || undefined,
      website: result.data.website || undefined,
      _rowIndex: rowIndex,
    },
    errors: [],
  };
}

/**
 * Validate all company rows
 */
export function validateCompanyRows(
  rows: RawCompanyRow[]
): { data: ParsedCompany[]; errors: ImportRowError[] } {
  const allErrors: ImportRowError[] = [];
  const validData: ParsedCompany[] = [];
  const seenNames = new Map<string, number>();
  const seenVatNumbers = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const { data, errors } = validateCompanyRow(rows[i], i);

    if (errors.length > 0) {
      allErrors.push(...errors);
      continue;
    }

    if (data) {
      // Check for duplicate names within file
      const normalizedName = data.name.toLowerCase().trim();
      const existingNameRow = seenNames.get(normalizedName);

      if (existingNameRow !== undefined) {
        allErrors.push({
          row: i + 2,
          sheet: SHEET_NAMES.COMPANIES,
          field: 'name',
          value: data.name,
          message: ERROR_MESSAGES.DUPLICATE_IN_FILE('Nom', data.name),
          code: 'DUPLICATE_IN_FILE',
        });
        continue;
      }

      seenNames.set(normalizedName, i + 2);

      // Check for duplicate VAT numbers within file
      if (data.vat_number) {
        const normalizedVat = data.vat_number.toUpperCase().replace(/\s/g, '');
        const existingVatRow = seenVatNumbers.get(normalizedVat);

        if (existingVatRow !== undefined) {
          allErrors.push({
            row: i + 2,
            sheet: SHEET_NAMES.COMPANIES,
            field: 'vat_number',
            value: data.vat_number,
            message: ERROR_MESSAGES.DUPLICATE_IN_FILE('N° TVA', data.vat_number),
            code: 'DUPLICATE_IN_FILE',
          });
          continue;
        }

        seenVatNumbers.set(normalizedVat, i + 2);
      }

      validData.push(data);
    }
  }

  return { data: validData, errors: allErrors };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize VAT number
 */
function normalizeVatNumber(value: unknown): string | undefined {
  if (!value) return undefined;

  let vat = String(value).trim().toUpperCase();

  // Remove spaces and common separators
  vat = vat.replace(/[\s.-]/g, '');

  // Add BE prefix if Belgian number without prefix
  if (/^\d{10}$/.test(vat)) {
    vat = 'BE' + vat;
  }

  return vat || undefined;
}

/**
 * Normalize country value
 */
function normalizeCountry(value: unknown): string | undefined {
  if (!value) return undefined;

  const str = String(value).toLowerCase().trim();

  // Handle common variations
  const mappings: Record<string, string> = {
    'belgique': 'belgique',
    'belgium': 'belgique',
    'be': 'belgique',
    'france': 'france',
    'fr': 'france',
    'suisse': 'suisse',
    'switzerland': 'suisse',
    'ch': 'suisse',
    'luxembourg': 'luxembourg',
    'lu': 'luxembourg',
    'allemagne': 'allemagne',
    'germany': 'allemagne',
    'de': 'allemagne',
    'pays-bas': 'pays-bas',
    'netherlands': 'pays-bas',
    'nl': 'pays-bas',
    'autre': 'autre',
    'other': 'autre',
  };

  return mappings[str] || str;
}

/**
 * Normalize phone number
 */
function normalizePhone(value: unknown): string | undefined {
  if (!value) return undefined;

  let phone = String(value).trim();

  // Remove common separators
  phone = phone.replace(/[\s.-]/g, '');

  return phone || undefined;
}

/**
 * Normalize website URL
 */
function normalizeWebsite(value: unknown): string | undefined {
  if (!value) return undefined;

  let url = String(value).trim();

  if (!url) return undefined;

  // Add https:// if no protocol
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  return url;
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
    case 'invalid_string':
      return 'INVALID_FORMAT';
    default:
      return 'UNKNOWN';
  }
}
