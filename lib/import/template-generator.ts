/**
 * Template Generator
 * Generate Excel templates for bulk import
 */

import * as XLSX from 'xlsx';
import {
  BUILDING_TEMPLATE,
  LOT_TEMPLATE,
  CONTACT_TEMPLATE,
  CONTRACT_TEMPLATE,
  LOT_CATEGORY_LABELS,
  CONTACT_ROLE_LABELS,
  CONTRACT_TYPE_LABELS,
  COUNTRY_LABELS,
  INTERVENTION_TYPE_LABELS,
} from './constants';
import type { TemplateConfig } from './types';

// ============================================================================
// Template Generation
// ============================================================================

/**
 * Generate a complete multi-sheet Excel template
 */
export function generateFullTemplate(includeExamples: boolean = true): Blob {
  const workbook = XLSX.utils.book_new();

  // Add each sheet
  addTemplateSheet(workbook, BUILDING_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, LOT_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, CONTACT_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, CONTRACT_TEMPLATE, includeExamples);

  // Add instructions sheet
  addInstructionsSheet(workbook);

  // Write to buffer
  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    bookSST: false,
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate a single-entity template
 */
export function generateEntityTemplate(
  entityType: 'building' | 'lot' | 'contact' | 'contract',
  includeExamples: boolean = true
): Blob {
  const workbook = XLSX.utils.book_new();

  const configs: Record<string, TemplateConfig> = {
    building: BUILDING_TEMPLATE,
    lot: LOT_TEMPLATE,
    contact: CONTACT_TEMPLATE,
    contract: CONTRACT_TEMPLATE,
  };

  const config = configs[entityType];
  if (!config) {
    throw new Error(`Type d'entité inconnu: ${entityType}`);
  }

  addTemplateSheet(workbook, config, includeExamples);

  const buffer = XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
    bookSST: false,
  });

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a template sheet to the workbook
 */
function addTemplateSheet(
  workbook: XLSX.WorkBook,
  config: TemplateConfig,
  includeExample: boolean
): void {
  // Prepare data with headers
  const data: (string | number)[][] = [config.headers];

  // Add all example rows if requested
  if (includeExample && config.exampleRows.length > 0) {
    data.push(...config.exampleRows);
  }

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  worksheet['!cols'] = config.columnWidths.map((width) => ({ wch: width }));

  // Style header row (bold) - Note: basic xlsx doesn't support styling
  // Would need xlsx-style or similar for full styling support

  // Add to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, config.sheetName);
}

/**
 * Add instructions sheet with help content
 */
function addInstructionsSheet(workbook: XLSX.WorkBook): void {
  const instructions = [
    ['INSTRUCTIONS D\'IMPORT'],
    [''],
    ['Ce fichier contient 4 onglets pour importer vos données:'],
    [''],
    ['1. IMMEUBLES'],
    ['   - Nom* : Nom de l\'immeuble (obligatoire)'],
    ['   - Adresse* : Adresse complète (obligatoire)'],
    ['   - Ville* : Ville (obligatoire)'],
    ['   - Code Postal* : Code postal (obligatoire)'],
    ['   - Pays : France par défaut'],
    ['   - Description : Notes internes'],
    [''],
    ['2. LOTS'],
    ['   - Référence* : Identifiant unique du lot (ex: LOT-001)'],
    ['   - Nom Immeuble : Pour rattacher le lot à un immeuble'],
    ['   - Catégorie : ' + Object.values(LOT_CATEGORY_LABELS).join(', ')],
    ['   - Étage : Numéro d\'étage (-10 à 200)'],
    ['   - Rue/Ville/Code Postal : Adresse complète si lot indépendant'],
    [''],
    ['3. CONTACTS'],
    ['   - Nom* : Nom complet (obligatoire)'],
    ['   - Email : Adresse email'],
    ['   - Téléphone : Numéro de téléphone'],
    ['   - Rôle* : ' + Object.values(CONTACT_ROLE_LABELS).join(', ')],
    ['   - Spécialité : Pour les prestataires (' + Object.keys(INTERVENTION_TYPE_LABELS).join(', ') + ')'],
    [''],
    ['4. BAUX (Contrats)'],
    ['   - Titre* : Nom du contrat'],
    ['   - Réf Lot* : Référence du lot associé'],
    ['   - Date Début* : Format AAAA-MM-JJ (ex: 2024-01-01)'],
    ['   - Durée (mois)* : Durée en mois (1 à 120)'],
    ['   - Loyer* : Montant mensuel'],
    ['   - Charges : Montant des charges'],
    ['   - Type : ' + Object.values(CONTRACT_TYPE_LABELS).join(', ')],
    ['   - Garantie : Montant de la garantie'],
    ['   - Email Locataires : Emails des locataires séparés par virgule'],
    ['   - Email Garants : Emails des garants séparés par virgule'],
    [''],
    ['NOTES IMPORTANTES:'],
    ['- Les champs marqués * sont obligatoires'],
    ['- L\'ordre d\'import: Contacts → Immeubles → Lots → Baux'],
    ['- Les lots sont liés aux immeubles par "Nom Immeuble"'],
    ['- Les baux sont liés aux lots par "Réf Lot"'],
    ['- Les locataires/garants sont liés par leurs emails (ex: "a@test.com, b@test.com")'],
    [''],
    ['VALEURS AUTORISÉES:'],
    [''],
    ['Catégories de lots:'],
    ...Object.entries(LOT_CATEGORY_LABELS).map(([k, v]) => [`   - ${k} : ${v}`]),
    [''],
    ['Rôles de contacts:'],
    ...Object.entries(CONTACT_ROLE_LABELS).map(([k, v]) => [`   - ${k} : ${v}`]),
    [''],
    ['Spécialités (pour prestataires):'],
    ...Object.entries(INTERVENTION_TYPE_LABELS).map(([k, v]) => [`   - ${k} : ${v}`]),
    [''],
    ['Types de contrats:'],
    ...Object.entries(CONTRACT_TYPE_LABELS).map(([k, v]) => [`   - ${k} : ${v}`]),
    [''],
    ['Pays supportés:'],
    ...Object.entries(COUNTRY_LABELS).map(([k, v]) => [`   - ${k} : ${v}`]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(instructions);
  worksheet['!cols'] = [{ wch: 70 }];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Instructions');
}

// ============================================================================
// Download Helpers
// ============================================================================

/**
 * Trigger download of a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download the full template
 */
export function downloadFullTemplate(): void {
  const blob = generateFullTemplate(true);
  downloadBlob(blob, 'template_import_seido.xlsx');
}

/**
 * Generate and download a single-entity template
 */
export function downloadEntityTemplate(
  entityType: 'building' | 'lot' | 'contact' | 'contract'
): void {
  const blob = generateEntityTemplate(entityType, true);
  const names: Record<string, string> = {
    building: 'template_immeubles.xlsx',
    lot: 'template_lots.xlsx',
    contact: 'template_contacts.xlsx',
    contract: 'template_baux.xlsx',
  };
  downloadBlob(blob, names[entityType] || 'template.xlsx');
}

// ============================================================================
// Server-Side Generation (for API routes)
// ============================================================================

/**
 * Generate template as Buffer (for server-side)
 */
export function generateTemplateBuffer(
  type: 'full' | 'building' | 'lot' | 'contact' | 'contract' = 'full',
  includeExamples: boolean = true
): Buffer {
  const workbook = XLSX.utils.book_new();

  if (type === 'full') {
    addTemplateSheet(workbook, BUILDING_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, LOT_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, CONTACT_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, CONTRACT_TEMPLATE, includeExamples);
    addInstructionsSheet(workbook);
  } else {
    const configs: Record<string, TemplateConfig> = {
      building: BUILDING_TEMPLATE,
      lot: LOT_TEMPLATE,
      contact: CONTACT_TEMPLATE,
      contract: CONTRACT_TEMPLATE,
    };
    addTemplateSheet(workbook, configs[type], includeExamples);
  }

  return Buffer.from(
    XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: false,
    })
  );
}
