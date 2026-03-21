/**
 * Template Generator
 * Generate Excel templates for bulk import
 *
 * ⚡ OPTIMIZED: ExcelJS is lazy-loaded to reduce initial bundle size
 */

import {
  BUILDING_TEMPLATE,
  LOT_TEMPLATE,
  CONTACT_TEMPLATE,
  CONTRACT_TEMPLATE,
  COMPANY_TEMPLATE,
  LOT_CATEGORY_LABELS,
  CONTACT_ROLE_LABELS,
  CONTRACT_TYPE_LABELS,
  COUNTRY_LABELS,
  INTERVENTION_TYPE_LABELS,
} from './constants';
import type { TemplateConfig } from './types';
import type * as ExcelJSTypes from 'exceljs';

// ⚡ Lazy load ExcelJS to avoid bloating initial bundle
let excelModule: typeof import('exceljs') | null = null;

async function getExcelJS() {
  if (!excelModule) {
    excelModule = await import('exceljs');
  }
  return excelModule;
}

// ============================================================================
// Template Generation (Async - Lazy Loaded)
// ============================================================================

/**
 * Generate a complete multi-sheet Excel template
 */
export async function generateFullTemplate(includeExamples: boolean = true): Promise<Blob> {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();

  // Add each sheet
  addTemplateSheet(workbook, BUILDING_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, LOT_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, CONTACT_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, CONTRACT_TEMPLATE, includeExamples);
  addTemplateSheet(workbook, COMPANY_TEMPLATE, includeExamples);

  // Add instructions sheet
  addInstructionsSheet(workbook);

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Generate a single-entity template
 */
export async function generateEntityTemplate(
  entityType: 'building' | 'lot' | 'contact' | 'contract' | 'company',
  includeExamples: boolean = true
): Promise<Blob> {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();

  const configs: Record<string, TemplateConfig> = {
    building: BUILDING_TEMPLATE,
    lot: LOT_TEMPLATE,
    contact: CONTACT_TEMPLATE,
    contract: CONTRACT_TEMPLATE,
    company: COMPANY_TEMPLATE,
  };

  const config = configs[entityType];
  if (!config) {
    throw new Error(`Type d'entité inconnu: ${entityType}`);
  }

  addTemplateSheet(workbook, config, includeExamples);

  const buffer = await workbook.xlsx.writeBuffer();

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
  workbook: ExcelJSTypes.Workbook,
  config: TemplateConfig,
  includeExample: boolean
): void {
  const worksheet = workbook.addWorksheet(config.sheetName);

  // Add header row with bold styling
  const headerRow = worksheet.addRow(config.headers);
  headerRow.font = { bold: true };

  // Add example rows if requested
  if (includeExample && config.exampleRows.length > 0) {
    for (const row of config.exampleRows) {
      worksheet.addRow(row);
    }
  }

  // Set column widths
  config.columnWidths.forEach((width, index) => {
    const col = worksheet.getColumn(index + 1);
    col.width = width;
  });
}

/**
 * Add instructions sheet with help content
 */
function addInstructionsSheet(workbook: ExcelJSTypes.Workbook): void {
  const worksheet = workbook.addWorksheet('Instructions');

  const instructions = [
    ['INSTRUCTIONS D\'IMPORT'],
    [''],
    ['Ce fichier contient 5 onglets pour importer vos données:'],
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
    ['   - Société : Nom de la société (doit exister dans l\'onglet Sociétés)'],
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
    ['5. SOCIÉTÉS'],
    ['   - Nom* : Nom de la société (obligatoire)'],
    ['   - Nom Légal : Raison sociale officielle'],
    ['   - N° TVA : Numéro de TVA intracommunautaire'],
    ['   - Rue : Adresse de la société'],
    ['   - Numéro : Numéro de rue'],
    ['   - Code Postal : Code postal'],
    ['   - Ville : Ville'],
    ['   - Pays : Pays (belgique, france, etc.)'],
    ['   - Email : Email de contact'],
    ['   - Téléphone : Téléphone de contact'],
    ['   - Site Web : Site internet'],
    [''],
    ['NOTES IMPORTANTES:'],
    ['- Les champs marqués * sont obligatoires'],
    ['- L\'ordre d\'import: Géolocalisation → Sociétés → Contacts → Immeubles → Lots → Baux'],
    ['- Les adresses sont automatiquement géolocalisées pour affichage sur carte'],
    ['- Les lots sont liés aux immeubles par "Nom Immeuble"'],
    ['- Les baux sont liés aux lots par "Réf Lot"'],
    ['- Les contacts peuvent être liés à des sociétés par "Société"'],
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

  for (const row of instructions) {
    worksheet.addRow(row);
  }

  // Set column width
  worksheet.getColumn(1).width = 70;
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
export async function downloadFullTemplate(): Promise<void> {
  const blob = await generateFullTemplate(true);
  downloadBlob(blob, 'template_import_seido.xlsx');
}

/**
 * Generate and download a single-entity template
 */
export async function downloadEntityTemplate(
  entityType: 'building' | 'lot' | 'contact' | 'contract' | 'company'
): Promise<void> {
  const blob = await generateEntityTemplate(entityType, true);
  const names: Record<string, string> = {
    building: 'template_immeubles.xlsx',
    lot: 'template_lots.xlsx',
    contact: 'template_contacts.xlsx',
    contract: 'template_baux.xlsx',
    company: 'template_societes.xlsx',
  };
  downloadBlob(blob, names[entityType] || 'template.xlsx');
}

// ============================================================================
// Server-Side Generation (for API routes)
// ============================================================================

/**
 * Generate template as Buffer (for server-side)
 */
export async function generateTemplateBuffer(
  type: 'full' | 'building' | 'lot' | 'contact' | 'contract' | 'company' = 'full',
  includeExamples: boolean = true
): Promise<Buffer> {
  const ExcelJS = await getExcelJS();
  const workbook = new ExcelJS.Workbook();

  if (type === 'full') {
    addTemplateSheet(workbook, BUILDING_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, LOT_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, CONTACT_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, CONTRACT_TEMPLATE, includeExamples);
    addTemplateSheet(workbook, COMPANY_TEMPLATE, includeExamples);
    addInstructionsSheet(workbook);
  } else {
    const configs: Record<string, TemplateConfig> = {
      building: BUILDING_TEMPLATE,
      lot: LOT_TEMPLATE,
      contact: CONTACT_TEMPLATE,
      contract: CONTRACT_TEMPLATE,
      company: COMPANY_TEMPLATE,
    };
    addTemplateSheet(workbook, configs[type], includeExamples);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
