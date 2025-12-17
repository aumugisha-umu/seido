/**
 * Import Constants
 * Configuration for Excel/CSV import functionality
 */

import type { TemplateConfig, ColumnMapping } from './types';

// ============================================================================
// Sheet Names (French)
// ============================================================================

export const SHEET_NAMES = {
  BUILDINGS: 'Immeubles',
  LOTS: 'Lots',
  CONTACTS: 'Contacts',
  CONTRACTS: 'Baux',
} as const;

// ============================================================================
// Enum Values
// ============================================================================

export const LOT_CATEGORIES = [
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'autre',
] as const;

export const LOT_CATEGORY_LABELS: Record<string, string> = {
  'appartement': 'Appartement',
  'collocation': 'Collocation',
  'maison': 'Maison',
  'garage': 'Garage',
  'local_commercial': 'Local commercial',
  'autre': 'Autre',
};

export const CONTACT_ROLES = [
  'locataire',
  'prestataire',
  'proprietaire',
] as const;

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  'locataire': 'Locataire',
  'prestataire': 'Prestataire',
  'proprietaire': 'Propriétaire',
};

export const CONTRACT_TYPES = [
  'bail_habitation',
  'bail_meuble',
] as const;

export const INTERVENTION_TYPES = [
  'plomberie',
  'electricite',
  'chauffage',
  'serrurerie',
  'peinture',
  'menage',
  'jardinage',
  'autre',
] as const;

export const INTERVENTION_TYPE_LABELS: Record<string, string> = {
  'plomberie': 'Plomberie',
  'electricite': 'Électricité',
  'chauffage': 'Chauffage',
  'serrurerie': 'Serrurerie',
  'peinture': 'Peinture',
  'menage': 'Ménage',
  'jardinage': 'Jardinage',
  'autre': 'Autre',
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  'bail_habitation': 'Bail d\'habitation',
  'bail_meuble': 'Bail meublé',
};

export const COUNTRIES = [
  'france',
  'belgique',
  'suisse',
  'luxembourg',
  'allemagne',
  'pays-bas',
  'autre',
] as const;

export const COUNTRY_LABELS: Record<string, string> = {
  'france': 'France',
  'belgique': 'Belgique',
  'suisse': 'Suisse',
  'luxembourg': 'Luxembourg',
  'allemagne': 'Allemagne',
  'pays-bas': 'Pays-Bas',
  'autre': 'Autre',
};

// ============================================================================
// Template Configurations
// ============================================================================

export const BUILDING_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.BUILDINGS,
  headers: [
    'Nom*',
    'Adresse*',
    'Ville*',
    'Code Postal*',
    'Pays',
    'Description',
  ],
  exampleRows: [
    // 3 immeubles à Bruxelles, Belgique
    ['Résidence Leopold', '125 Avenue Louise', 'Bruxelles', '1050', 'belgique', 'Immeuble de standing, 5 appartements, ascenseur'],
    ['Le Sablon', '8 Place du Petit Sablon', 'Bruxelles', '1000', 'belgique', 'Immeuble historique rénové, 6 lots, vue sur le parc'],
    ['Bruxelles Centre', '45 Rue Neuve', 'Bruxelles', '1000', 'belgique', 'Immeuble mixte commerce/habitation, 4 lots'],
  ],
  columnWidths: [25, 30, 20, 15, 15, 40],
  requiredColumns: ['Nom*', 'Adresse*', 'Ville*', 'Code Postal*'],
};

export const LOT_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.LOTS,
  headers: [
    'Référence*',
    'Nom Immeuble',
    'Catégorie',
    'Étage',
    'Rue',
    'Ville',
    'Code Postal',
    'Pays',
    'Description',
  ],
  exampleRows: [
    // Résidence Leopold - 5 lots
    ['BXL-LEO-001', 'Résidence Leopold', 'appartement', 0, '', '', '', 'belgique', 'Studio 35m², idéal investissement'],
    ['BXL-LEO-002', 'Résidence Leopold', 'appartement', 1, '', '', '', 'belgique', 'T2 55m², balcon, vue avenue'],
    ['BXL-LEO-003', 'Résidence Leopold', 'appartement', 2, '', '', '', 'belgique', 'T3 75m², 2 chambres, rénové 2023'],
    ['BXL-LEO-004', 'Résidence Leopold', 'appartement', 3, '', '', '', 'belgique', 'T4 95m², 3 chambres, terrasse'],
    ['BXL-LEO-005', 'Résidence Leopold', 'garage', -1, '', '', '', 'belgique', 'Parking souterrain box fermé'],
    // Le Sablon - 6 lots
    ['BXL-SAB-001', 'Le Sablon', 'appartement', 0, '', '', '', 'belgique', 'T2 50m², charme ancien'],
    ['BXL-SAB-002', 'Le Sablon', 'appartement', 1, '', '', '', 'belgique', 'T3 70m², parquet, cheminée'],
    ['BXL-SAB-003', 'Le Sablon', 'appartement', 1, '', '', '', 'belgique', 'T2 45m², vue parc'],
    ['BXL-SAB-004', 'Le Sablon', 'appartement', 2, '', '', '', 'belgique', 'T4 90m², duplex, 2 SDB'],
    ['BXL-SAB-005', 'Le Sablon', 'appartement', 3, '', '', '', 'belgique', 'T3 65m², sous les toits, charme'],
    ['BXL-SAB-006', 'Le Sablon', 'garage', -1, '', '', '', 'belgique', 'Cave aménagée + parking'],
    // Bruxelles Centre - 4 lots
    ['BXL-CTR-001', 'Bruxelles Centre', 'local_commercial', 0, '', '', '', 'belgique', 'Boutique 80m², vitrine rue Neuve'],
    ['BXL-CTR-002', 'Bruxelles Centre', 'appartement', 1, '', '', '', 'belgique', 'T2 50m², idéal pied-à-terre'],
    ['BXL-CTR-003', 'Bruxelles Centre', 'appartement', 2, '', '', '', 'belgique', 'T3 65m², lumineux, rénové'],
    ['BXL-CTR-004', 'Bruxelles Centre', 'collocation', 3, '', '', '', 'belgique', 'Colocation 4 chambres, 120m²'],
  ],
  columnWidths: [15, 25, 18, 10, 30, 20, 15, 15, 40],
  requiredColumns: ['Référence*'],
};

export const CONTACT_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.CONTACTS,
  headers: [
    'Nom*',
    'Email',
    'Téléphone',
    'Rôle*',
    'Adresse',
    'Spécialité',
    'Notes',
  ],
  exampleRows: [
    // Locataires (utilisés dans les baux)
    ['Marie Dubois', 'locataire1@email.com', '+32 470 12 34 56', 'locataire', '25 Rue de la Loi, 1000 Bruxelles', '', 'Locataire principal BXL-LEO-002'],
    ['Pierre Martin', 'locataire2@email.com', '+32 470 78 90 12', 'locataire', '15 Avenue de Tervuren, 1040 Etterbeek', '', 'Colocataire'],
    ['Sophie Lambert', 'sophie.lambert@email.com', '+32 470 33 44 55', 'locataire', '8 Place Flagey, 1050 Ixelles', '', 'Locataire BXL-SAB-002'],
    ['Thomas Janssen', 'thomas.janssen@email.com', '+32 470 66 77 88', 'locataire', '12 Rue du Midi, 1000 Bruxelles', '', 'Locataire BXL-CTR-002'],
    // Garants (rôle locataire dans users, mais garant dans contract_contacts)
    ['Jean-Paul Garant', 'garant@email.com', '+32 470 99 00 11', 'locataire', '100 Boulevard du Souverain, 1170 Watermael', '', 'Garant pour les locataires Marie et Pierre'],
    ['Françoise Caution', 'francoise.caution@email.com', '+32 470 22 33 44', 'locataire', '5 Avenue des Nerviens, 1040 Etterbeek', '', 'Garante pour Sophie'],
    // Prestataires (spécialité = enum intervention_type: plomberie, electricite, chauffage, serrurerie, peinture, menage, jardinage, autre)
    ['Plomberie Express', 'contact@plomberie-express.be', '+32 2 555 01 01', 'prestataire', '45 Rue de l\'Industrie, 1000 Bruxelles', 'plomberie', 'Intervention 24h/24'],
    ['Électricité Pro', 'info@elec-pro.be', '+32 2 555 02 02', 'prestataire', '78 Avenue de la Toison d\'Or, 1060 Saint-Gilles', 'electricite', 'Agréé certificat RGIE'],
    // Propriétaire
    ['SCI Bruxelles Invest', 'gestion@bxl-invest.be', '+32 2 555 03 03', 'proprietaire', '1 Place de Brouckère, 1000 Bruxelles', '', 'Propriétaire des 3 immeubles'],
  ],
  columnWidths: [25, 30, 18, 15, 35, 20, 30],
  requiredColumns: ['Nom*', 'Rôle*'],
};

export const CONTRACT_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.CONTRACTS,
  headers: [
    'Titre*',
    'Réf Lot*',
    'Date Début*',
    'Durée (mois)*',
    'Loyer*',
    'Charges',
    'Type',
    'Garantie',
    'Email Locataires',
    'Email Garants',
    'Commentaires',
  ],
  exampleRows: [
    // Bail colocation avec 2 locataires et 1 garant
    ['Bail Colocation Leopold', 'BXL-LEO-003', '2024-01-01', 36, 1200, 150, 'bail_habitation', 2400, 'locataire1@email.com, locataire2@email.com', 'garant@email.com', 'Colocation 2 personnes, garant solidaire'],
    // Bail individuel avec garant
    ['Bail Sablon T3', 'BXL-SAB-002', '2024-03-01', 36, 1100, 100, 'bail_habitation', 2200, 'sophie.lambert@email.com', 'francoise.caution@email.com', 'Bail classique, paiement le 1er'],
    // Bail meublé sans garant
    ['Bail Meublé Centre', 'BXL-CTR-002', '2024-06-01', 12, 950, 80, 'bail_meuble', 1900, 'thomas.janssen@email.com', '', 'Bail meublé 1 an renouvelable'],
    // Bail commercial
    ['Bail Commercial Rue Neuve', 'BXL-CTR-001', '2024-01-15', 108, 3500, 500, 'bail_habitation', 10500, '', '', 'Bail commercial 9 ans, révision triennale'],
  ],
  columnWidths: [25, 15, 15, 15, 12, 12, 18, 12, 35, 30, 35],
  requiredColumns: ['Titre*', 'Réf Lot*', 'Date Début*', 'Durée (mois)*', 'Loyer*'],
};

// ============================================================================
// Column Mappings (Excel Header → DB Field)
// ============================================================================

export const BUILDING_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Nom*', dbField: 'name', required: true, type: 'string' },
  { excelHeader: 'Adresse*', dbField: 'address', required: true, type: 'string' },
  { excelHeader: 'Ville*', dbField: 'city', required: true, type: 'string' },
  { excelHeader: 'Code Postal*', dbField: 'postal_code', required: true, type: 'string' },
  {
    excelHeader: 'Pays',
    dbField: 'country',
    required: false,
    type: 'enum',
    enumValues: [...COUNTRIES],
    transform: (v) => String(v || 'france').toLowerCase(),
  },
  { excelHeader: 'Description', dbField: 'description', required: false, type: 'string' },
];

export const LOT_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Référence*', dbField: 'reference', required: true, type: 'string' },
  { excelHeader: 'Nom Immeuble', dbField: 'building_name', required: false, type: 'string' },
  {
    excelHeader: 'Catégorie',
    dbField: 'category',
    required: false,
    type: 'enum',
    enumValues: [...LOT_CATEGORIES],
    transform: (v) => String(v || 'appartement').toLowerCase(),
  },
  {
    excelHeader: 'Étage',
    dbField: 'floor',
    required: false,
    type: 'number',
    transform: (v) => v ? parseInt(String(v), 10) : undefined,
  },
  { excelHeader: 'Rue', dbField: 'street', required: false, type: 'string' },
  { excelHeader: 'Ville', dbField: 'city', required: false, type: 'string' },
  { excelHeader: 'Code Postal', dbField: 'postal_code', required: false, type: 'string' },
  {
    excelHeader: 'Pays',
    dbField: 'country',
    required: false,
    type: 'enum',
    enumValues: [...COUNTRIES],
    transform: (v) => String(v || 'france').toLowerCase(),
  },
  { excelHeader: 'Description', dbField: 'description', required: false, type: 'string' },
];

export const CONTACT_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Nom*', dbField: 'name', required: true, type: 'string' },
  { excelHeader: 'Email', dbField: 'email', required: false, type: 'string' },
  { excelHeader: 'Téléphone', dbField: 'phone', required: false, type: 'string' },
  {
    excelHeader: 'Rôle*',
    dbField: 'role',
    required: true,
    type: 'enum',
    enumValues: [...CONTACT_ROLES],
    transform: (v) => String(v || '').toLowerCase(),
  },
  { excelHeader: 'Adresse', dbField: 'address', required: false, type: 'string' },
  {
    excelHeader: 'Spécialité',
    dbField: 'speciality',
    required: false,
    type: 'enum',
    enumValues: [...INTERVENTION_TYPES],
    transform: (v) => {
      if (!v) return undefined;
      // Normalize: remove accents, lowercase, handle common variations
      const normalized = String(v)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim();
      // Direct match or return as-is (will be validated)
      return normalized;
    },
  },
  { excelHeader: 'Notes', dbField: 'notes', required: false, type: 'string' },
];

export const CONTRACT_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Titre*', dbField: 'title', required: true, type: 'string' },
  { excelHeader: 'Réf Lot*', dbField: 'lot_reference', required: true, type: 'string' },
  {
    excelHeader: 'Date Début*',
    dbField: 'start_date',
    required: true,
    type: 'date',
    transform: (v) => {
      if (!v) return undefined;
      if (v instanceof Date) return v.toISOString().split('T')[0];
      const str = String(v);
      // Try to parse various date formats
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return str.slice(0, 10);
      const frMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (frMatch) return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
      return str;
    },
  },
  {
    excelHeader: 'Durée (mois)*',
    dbField: 'duration_months',
    required: true,
    type: 'number',
    transform: (v) => parseInt(String(v), 10),
  },
  {
    excelHeader: 'Loyer*',
    dbField: 'rent_amount',
    required: true,
    type: 'number',
    transform: (v) => parseFloat(String(v).replace(',', '.')),
  },
  {
    excelHeader: 'Charges',
    dbField: 'charges_amount',
    required: false,
    type: 'number',
    transform: (v) => v ? parseFloat(String(v).replace(',', '.')) : undefined,
  },
  {
    excelHeader: 'Type',
    dbField: 'contract_type',
    required: false,
    type: 'enum',
    enumValues: [...CONTRACT_TYPES],
    transform: (v) => String(v || 'bail_habitation').toLowerCase().replace(/['\s]/g, '_'),
  },
  {
    excelHeader: 'Garantie',
    dbField: 'guarantee_amount',
    required: false,
    type: 'number',
    transform: (v) => v ? parseFloat(String(v).replace(',', '.')) : undefined,
  },
  { excelHeader: 'Email Locataires', dbField: 'tenant_emails', required: false, type: 'string' },
  { excelHeader: 'Email Garants', dbField: 'guarantor_emails', required: false, type: 'string' },
  { excelHeader: 'Commentaires', dbField: 'comments', required: false, type: 'string' },
];

// ============================================================================
// Error Messages (French)
// ============================================================================

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `Le champ "${field}" est obligatoire`,
  INVALID_FORMAT: (field: string, expected: string) =>
    `Format invalide pour "${field}". Attendu: ${expected}`,
  INVALID_ENUM: (field: string, allowed: string[]) =>
    `Valeur invalide pour "${field}". Valeurs autorisées: ${allowed.join(', ')}`,
  INVALID_NUMBER: (field: string) =>
    `"${field}" doit être un nombre valide`,
  INVALID_DATE: (field: string) =>
    `"${field}" doit être une date valide (format: AAAA-MM-JJ ou JJ/MM/AAAA)`,
  DUPLICATE_IN_FILE: (field: string, value: string) =>
    `Doublon détecté: "${value}" apparaît plusieurs fois dans "${field}"`,
  DUPLICATE_IN_DATABASE: (entity: string, identifier: string) =>
    `${entity} "${identifier}" existe déjà dans la base de données`,
  REFERENCE_NOT_FOUND: (entity: string, reference: string) =>
    `${entity} "${reference}" introuvable`,
  REFERENCE_AMBIGUOUS: (entity: string, reference: string, count: number) =>
    `${entity} "${reference}" correspond à ${count} entrées. Précisez la référence.`,
  CONFLICT: (message: string) => message,
  PERMISSION_DENIED: () =>
    `Vous n'avez pas les permissions nécessaires pour cette opération`,
  UNKNOWN: (details?: string) =>
    `Erreur inconnue${details ? `: ${details}` : ''}`,
} as const;

// ============================================================================
// Validation Constraints
// ============================================================================

export const VALIDATION_CONSTRAINTS = {
  building: {
    name: { minLength: 1, maxLength: 200 },
    address: { minLength: 1, maxLength: 500 },
    city: { minLength: 1, maxLength: 100 },
    postal_code: { pattern: /^\d{4,10}$/ },  // 4-10 digits (supports various countries)
    description: { maxLength: 5000 },
  },
  lot: {
    reference: { minLength: 1, maxLength: 100 },
    floor: { min: -10, max: 200 },
    street: { maxLength: 500 },
    city: { maxLength: 100 },
    postal_code: { pattern: /^\d{4,10}$/ },
    description: { maxLength: 5000 },
  },
  contact: {
    name: { minLength: 1, maxLength: 200 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { maxLength: 50 },
    address: { maxLength: 500 },
    speciality: { maxLength: 100 },
    notes: { maxLength: 2000 },
  },
  contract: {
    title: { minLength: 1, maxLength: 200 },
    lot_reference: { minLength: 1, maxLength: 100 },
    start_date: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
    duration_months: { min: 1, max: 120 },
    rent_amount: { min: 0, max: 1000000 },
    charges_amount: { min: 0, max: 100000 },
    guarantee_amount: { min: 0, max: 1000000 },
    comments: { maxLength: 5000 },
  },
} as const;

// ============================================================================
// File Constraints
// ============================================================================

export const FILE_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxRows: 5000,  // Per sheet
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
  ],
  allowedExtensions: ['.xlsx', '.xls', '.csv'],
} as const;
