/**
 * Contract Validator
 * Zod schema and validation for contract (bail) imports
 */

import { z } from 'zod';
import type {
  RawContractRow,
  ParsedContract,
  ImportRowError,
} from '../types';
import {
  CONTRACT_TYPES,
  ERROR_MESSAGES,
  VALIDATION_CONSTRAINTS,
  SHEET_NAMES,
} from '../constants';

// ============================================================================
// Zod Schema
// ============================================================================

// Helper schema for email list validation
const emailListSchema = z
  .array(z.string().email('Format d\'email invalide'))
  .optional()
  .nullable();

export const contractImportSchema = z.object({
  title: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.contract.title.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Titre')
    )
    .max(
      VALIDATION_CONSTRAINTS.contract.title.maxLength,
      `Le titre ne doit pas dépasser ${VALIDATION_CONSTRAINTS.contract.title.maxLength} caractères`
    ),
  lot_reference: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.contract.lot_reference.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Réf Lot')
    )
    .max(
      VALIDATION_CONSTRAINTS.contract.lot_reference.maxLength,
      `La référence lot ne doit pas dépasser ${VALIDATION_CONSTRAINTS.contract.lot_reference.maxLength} caractères`
    ),
  start_date: z
    .string()
    .regex(
      VALIDATION_CONSTRAINTS.contract.start_date.pattern,
      'Format de date invalide. Utilisez AAAA-MM-JJ (ex: 2024-01-01)'
    ),
  duration_months: z
    .number()
    .int('La durée doit être un nombre entier')
    .min(
      VALIDATION_CONSTRAINTS.contract.duration_months.min,
      `La durée minimum est ${VALIDATION_CONSTRAINTS.contract.duration_months.min} mois`
    )
    .max(
      VALIDATION_CONSTRAINTS.contract.duration_months.max,
      `La durée maximum est ${VALIDATION_CONSTRAINTS.contract.duration_months.max} mois`
    ),
  rent_amount: z
    .number()
    .min(
      VALIDATION_CONSTRAINTS.contract.rent_amount.min,
      'Le loyer doit être positif'
    )
    .max(
      VALIDATION_CONSTRAINTS.contract.rent_amount.max,
      `Le loyer ne peut pas dépasser ${VALIDATION_CONSTRAINTS.contract.rent_amount.max}€`
    ),
  charges_amount: z
    .number()
    .min(
      VALIDATION_CONSTRAINTS.contract.charges_amount.min,
      'Les charges doivent être positives'
    )
    .max(
      VALIDATION_CONSTRAINTS.contract.charges_amount.max,
      `Les charges ne peuvent pas dépasser ${VALIDATION_CONSTRAINTS.contract.charges_amount.max}€`
    )
    .optional()
    .nullable(),
  contract_type: z
    .enum(CONTRACT_TYPES as unknown as [string, ...string[]])
    .default('bail_habitation'),
  guarantee_amount: z
    .number()
    .min(
      VALIDATION_CONSTRAINTS.contract.guarantee_amount.min,
      'La garantie doit être positive'
    )
    .max(
      VALIDATION_CONSTRAINTS.contract.guarantee_amount.max,
      `La garantie ne peut pas dépasser ${VALIDATION_CONSTRAINTS.contract.guarantee_amount.max}€`
    )
    .optional()
    .nullable(),
  tenant_emails: emailListSchema,
  guarantor_emails: emailListSchema,
  comments: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.contract.comments.maxLength,
      `Les commentaires ne doivent pas dépasser ${VALIDATION_CONSTRAINTS.contract.comments.maxLength} caractères`
    )
    .optional()
    .nullable(),
});

export type ContractImportData = z.infer<typeof contractImportSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single contract row
 */
export function validateContractRow(
  row: RawContractRow,
  rowIndex: number
): { data?: ParsedContract; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];

  // Transform raw data
  const transformed = {
    title: String(row['Titre'] || row['Titre*'] || '').trim(),
    lot_reference: String(row['Réf Lot'] || row['Réf Lot*'] || '').trim(),
    start_date: parseDate(row['Date Début'] || row['Date Début*']),
    duration_months: parseNumber(row['Durée (mois)'] || row['Durée (mois)*']),
    rent_amount: parseAmount(row['Loyer'] || row['Loyer*']),
    charges_amount: parseAmount(row['Charges']),
    contract_type: normalizeContractType(row['Type']),
    guarantee_amount: parseAmount(row['Garantie']),
    tenant_emails: parseEmailList(row['Email Locataires']),
    guarantor_emails: parseEmailList(row['Email Garants']),
    comments: row['Commentaires']
      ? String(row['Commentaires']).trim()
      : undefined,
  };

  // Custom validation for required numbers
  if (transformed.duration_months === undefined || isNaN(transformed.duration_months)) {
    errors.push({
      row: rowIndex + 2,
      sheet: SHEET_NAMES.CONTRACTS,
      field: 'duration_months',
      value: row['Durée (mois)'] || row['Durée (mois)*'],
      message: ERROR_MESSAGES.INVALID_NUMBER('Durée (mois)'),
      code: 'INVALID_NUMBER',
    });
  }

  if (transformed.rent_amount === undefined || isNaN(transformed.rent_amount)) {
    errors.push({
      row: rowIndex + 2,
      sheet: SHEET_NAMES.CONTRACTS,
      field: 'rent_amount',
      value: row['Loyer'] || row['Loyer*'],
      message: ERROR_MESSAGES.INVALID_NUMBER('Loyer'),
      code: 'INVALID_NUMBER',
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  // Validate with Zod
  const result = contractImportSchema.safeParse({
    ...transformed,
    duration_months: transformed.duration_months!,
    rent_amount: transformed.rent_amount!,
    charges_amount: transformed.charges_amount ?? undefined,
    guarantee_amount: transformed.guarantee_amount ?? undefined,
    tenant_emails: transformed.tenant_emails || undefined,
    guarantor_emails: transformed.guarantor_emails || undefined,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex + 2,
        sheet: SHEET_NAMES.CONTRACTS,
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
      title: result.data.title,
      lot_reference: result.data.lot_reference,
      start_date: result.data.start_date,
      duration_months: result.data.duration_months,
      rent_amount: result.data.rent_amount,
      charges_amount: result.data.charges_amount ?? undefined,
      contract_type: result.data.contract_type || 'bail_habitation',
      guarantee_amount: result.data.guarantee_amount ?? undefined,
      tenant_emails: result.data.tenant_emails || undefined,
      guarantor_emails: result.data.guarantor_emails || undefined,
      comments: result.data.comments || undefined,
      _rowIndex: rowIndex,
    },
    errors: [],
  };
}

/**
 * Validate all contract rows
 */
export function validateContractRows(
  rows: RawContractRow[]
): { data: ParsedContract[]; errors: ImportRowError[] } {
  const allErrors: ImportRowError[] = [];
  const validData: ParsedContract[] = [];
  const seenContracts = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const { data, errors } = validateContractRow(rows[i], i);

    if (errors.length > 0) {
      allErrors.push(...errors);
      continue;
    }

    if (data) {
      // Check for duplicates (title + lot + start_date)
      const key = `${data.title.toLowerCase()}_${data.lot_reference.toLowerCase()}_${data.start_date}`;
      const existingRow = seenContracts.get(key);

      if (existingRow !== undefined) {
        allErrors.push({
          row: i + 2,
          sheet: SHEET_NAMES.CONTRACTS,
          field: 'title',
          value: data.title,
          message: `Doublon détecté: un bail avec le même titre, lot et date de début existe déjà (ligne ${existingRow})`,
          code: 'DUPLICATE_IN_FILE',
        });
        continue;
      }

      seenContracts.set(key, i + 2);
      validData.push(data);
    }
  }

  return { data: validData, errors: allErrors };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse date value
 */
function parseDate(value: unknown): string {
  if (!value) return '';

  // Handle Date object (from Excel)
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  const str = String(value).trim();

  // Try ISO format (YYYY-MM-DD)
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return str.slice(0, 10);
  }

  // Try French format (DD/MM/YYYY)
  const frMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (frMatch) {
    return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
  }

  // Try other common formats
  const usMatch = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (usMatch) {
    // Assume DD/MM/YYYY for European context
    return `${usMatch[3]}-${usMatch[2]}-${usMatch[1]}`;
  }

  return str;
}

/**
 * Parse number value
 */
function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const num = parseInt(String(value), 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse amount value (handles comma as decimal separator)
 */
function parseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  // Handle number type
  if (typeof value === 'number') {
    return value;
  }

  // Handle string with comma as decimal separator
  const str = String(value)
    .replace(/\s/g, '')  // Remove spaces
    .replace(',', '.');   // Convert comma to dot

  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse email list from comma-separated string
 * Example: "a@test.com, b@test.com" → ["a@test.com", "b@test.com"]
 */
function parseEmailList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const str = String(value).trim();
  if (!str) {
    return undefined;
  }

  // Split by comma, trim each email, filter empty, lowercase
  const emails = str
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);

  return emails.length > 0 ? emails : undefined;
}

/**
 * Normalize contract type
 */
function normalizeContractType(value: unknown): string {
  if (!value) return 'bail_habitation';

  const str = String(value)
    .toLowerCase()
    .trim()
    .replace(/[\s']/g, '_');

  const mappings: Record<string, string> = {
    'bail_habitation': 'bail_habitation',
    'bail_d_habitation': 'bail_habitation',
    'habitation': 'bail_habitation',
    'bail_meuble': 'bail_meuble',
    'bail_meublé': 'bail_meuble',
    'meuble': 'bail_meuble',
    'meublé': 'bail_meuble',
  };

  return mappings[str] || 'bail_habitation';
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
