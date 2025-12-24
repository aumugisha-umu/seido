/**
 * Contact Validator
 * Zod schema and validation for contact imports
 */

import { z } from 'zod';
import type {
  RawContactRow,
  ParsedContact,
  ImportRowError,
} from '../types';
import {
  CONTACT_ROLES,
  INTERVENTION_TYPES,
  ERROR_MESSAGES,
  VALIDATION_CONSTRAINTS,
  SHEET_NAMES,
} from '../constants';

// ============================================================================
// Zod Schema
// ============================================================================

export const contactImportSchema = z.object({
  name: z
    .string()
    .min(
      VALIDATION_CONSTRAINTS.contact.name.minLength,
      ERROR_MESSAGES.REQUIRED_FIELD('Nom')
    )
    .max(
      VALIDATION_CONSTRAINTS.contact.name.maxLength,
      `Le nom ne doit pas dépasser ${VALIDATION_CONSTRAINTS.contact.name.maxLength} caractères`
    ),
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
      VALIDATION_CONSTRAINTS.contact.phone.maxLength,
      `Le téléphone ne doit pas dépasser ${VALIDATION_CONSTRAINTS.contact.phone.maxLength} caractères`
    )
    .optional()
    .nullable(),
  role: z.enum(CONTACT_ROLES as unknown as [string, ...string[]]),
  address: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.contact.address.maxLength,
      `L'adresse ne doit pas dépasser ${VALIDATION_CONSTRAINTS.contact.address.maxLength} caractères`
    )
    .optional()
    .nullable(),
  speciality: z
    .enum(INTERVENTION_TYPES as unknown as [string, ...string[]])
    .optional()
    .nullable(),
  company_name: z
    .string()
    .max(200, 'Le nom de société ne doit pas dépasser 200 caractères')
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(
      VALIDATION_CONSTRAINTS.contact.notes.maxLength,
      `Les notes ne doivent pas dépasser ${VALIDATION_CONSTRAINTS.contact.notes.maxLength} caractères`
    )
    .optional()
    .nullable(),
});

export type ContactImportData = z.infer<typeof contactImportSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single contact row
 */
export function validateContactRow(
  row: RawContactRow,
  rowIndex: number
): { data?: ParsedContact; errors: ImportRowError[] } {
  const errors: ImportRowError[] = [];

  // Transform raw data
  const email = row['Email'] ? String(row['Email']).trim().toLowerCase() : undefined;
  const transformed = {
    name: String(row['Nom'] || row['Nom*'] || '').trim(),
    email: email && email.length > 0 ? email : undefined,
    phone: normalizePhone(row['Téléphone']),
    role: normalizeRole(row['Rôle'] || row['Rôle*']),
    address: row['Adresse'] ? String(row['Adresse']).trim() : undefined,
    speciality: normalizeSpeciality(row['Spécialité']),
    company_name: row['Société'] ? String(row['Société']).trim() : undefined,
    notes: row['Notes'] ? String(row['Notes']).trim() : undefined,
  };

  // Validate role is provided
  if (!transformed.role) {
    errors.push({
      row: rowIndex + 2,
      sheet: SHEET_NAMES.CONTACTS,
      field: 'role',
      value: row['Rôle'] || row['Rôle*'],
      message: ERROR_MESSAGES.REQUIRED_FIELD('Rôle'),
      code: 'REQUIRED_FIELD',
    });
    return { errors };
  }

  // Validate with Zod
  const result = contactImportSchema.safeParse(transformed);

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        row: rowIndex + 2,
        sheet: SHEET_NAMES.CONTACTS,
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
      email: result.data.email || undefined,
      phone: result.data.phone || undefined,
      role: result.data.role,
      address: result.data.address || undefined,
      speciality: result.data.speciality || undefined,
      company_name: result.data.company_name || undefined,
      notes: result.data.notes || undefined,
      _rowIndex: rowIndex,
    },
    errors: [],
  };
}

/**
 * Validate all contact rows
 */
export function validateContactRows(
  rows: RawContactRow[]
): { data: ParsedContact[]; errors: ImportRowError[] } {
  const allErrors: ImportRowError[] = [];
  const validData: ParsedContact[] = [];
  const seenEmails = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const { data, errors } = validateContactRow(rows[i], i);

    if (errors.length > 0) {
      allErrors.push(...errors);
      continue;
    }

    if (data) {
      // Check for duplicate emails within file
      if (data.email) {
        const normalizedEmail = data.email.toLowerCase().trim();
        const existingRow = seenEmails.get(normalizedEmail);

        if (existingRow !== undefined) {
          allErrors.push({
            row: i + 2,
            sheet: SHEET_NAMES.CONTACTS,
            field: 'email',
            value: data.email,
            message: ERROR_MESSAGES.DUPLICATE_IN_FILE('Email', data.email),
            code: 'DUPLICATE_IN_FILE',
          });
          continue;
        }

        seenEmails.set(normalizedEmail, i + 2);
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
 * Normalize role value
 */
function normalizeRole(value: unknown): string | undefined {
  if (!value) return undefined;

  const str = String(value).toLowerCase().trim();

  // Handle common variations
  const mappings: Record<string, string> = {
    'locataire': 'locataire',
    'tenant': 'locataire',
    'prestataire': 'prestataire',
    'provider': 'prestataire',
    'fournisseur': 'prestataire',
    'artisan': 'prestataire',
    'proprietaire': 'proprietaire',
    'propriétaire': 'proprietaire',
    'owner': 'proprietaire',
  };

  return mappings[str];
}

/**
 * Normalize phone number
 */
function normalizePhone(value: unknown): string | undefined {
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

  return phone;
}

/**
 * Normalize speciality to intervention_type enum value
 */
function normalizeSpeciality(value: unknown): string | undefined {
  if (!value) return undefined;

  const str = String(value).trim();
  if (!str) return undefined;

  // Normalize: lowercase, remove accents
  const normalized = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove accents

  // Handle common variations
  const mappings: Record<string, string> = {
    'plomberie': 'plomberie',
    'plombier': 'plomberie',
    'electricite': 'electricite',
    'électricité': 'electricite',
    'electricien': 'electricite',
    'chauffage': 'chauffage',
    'chauffagiste': 'chauffage',
    'serrurerie': 'serrurerie',
    'serrurier': 'serrurerie',
    'peinture': 'peinture',
    'peintre': 'peinture',
    'menage': 'menage',
    'ménage': 'menage',
    'nettoyage': 'menage',
    'jardinage': 'jardinage',
    'jardinier': 'jardinage',
    'autre': 'autre',
    'other': 'autre',
  };

  return mappings[normalized] || normalized;
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
