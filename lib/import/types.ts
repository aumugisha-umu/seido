/**
 * Import Types
 * TypeScript definitions for Excel/CSV import functionality
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export type ImportJobStatus =
  | 'pending'
  | 'validating'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ImportEntityType =
  | 'building'
  | 'lot'
  | 'contact'
  | 'contract'
  | 'company'
  | 'mixed';

export type ImportMode = 'create_only' | 'upsert';
export type ErrorMode = 'all_or_nothing' | 'skip_errors';

// ============================================================================
// Raw Data Types (from Excel parsing)
// ============================================================================

export interface RawBuildingRow {
  'Nom': string;
  'Adresse': string;
  'Ville': string;
  'Code Postal': string;
  'Pays'?: string;
  'Description'?: string;
}

export interface RawLotRow {
  'Référence': string;
  'Nom Immeuble'?: string;
  'Catégorie'?: string;
  'Étage'?: string | number;
  'Rue'?: string;
  'Ville'?: string;
  'Code Postal'?: string;
  'Description'?: string;
}

export interface RawContactRow {
  'Nom': string;
  'Email'?: string;
  'Téléphone'?: string;
  'Rôle': string;
  'Adresse'?: string;
  'Spécialité'?: string;
  'Société'?: string;  // Référence au nom d'une société de l'onglet Sociétés
  'Notes'?: string;
}

export interface RawContractRow {
  'Titre': string;
  'Réf Lot': string;
  'Date Début': string | Date;
  'Durée (mois)': string | number;
  'Loyer': string | number;
  'Charges'?: string | number;
  'Type'?: string;
  'Garantie'?: string | number;
  'Email Locataires'?: string;  // Plusieurs emails séparés par virgule
  'Email Garants'?: string;     // Plusieurs emails séparés par virgule
  'Commentaires'?: string;
}

export interface RawCompanyRow {
  'Nom': string;
  'Nom Légal'?: string;
  'N° TVA'?: string;
  'Rue'?: string;
  'Numéro'?: string;
  'Code Postal'?: string;
  'Ville'?: string;
  'Pays'?: string;
  'Email'?: string;
  'Téléphone'?: string;
  'Site Web'?: string;
}

// ============================================================================
// Parsed Data Types (after validation)
// ============================================================================

export interface ParsedBuilding {
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  description?: string;
  _rowIndex: number;  // For error tracking
}

export interface ParsedLot {
  reference: string;
  building_name?: string;
  category: string;
  floor?: number;
  street?: string;
  city?: string;
  postal_code?: string;
  description?: string;
  _rowIndex: number;
  _resolvedBuildingId?: string;  // After resolution
}

export interface ParsedContact {
  name: string;
  email?: string;
  phone?: string;
  role: string;
  address?: string;
  speciality?: string;
  company_name?: string;  // Référence au nom d'une société
  notes?: string;
  _rowIndex: number;
  _existingId?: string;  // For upsert
  _resolvedCompanyId?: string;  // After resolution
}

export interface ParsedContract {
  title: string;
  lot_reference: string;
  start_date: string;  // ISO date
  duration_months: number;
  rent_amount: number;
  charges_amount?: number;
  contract_type: string;
  guarantee_amount?: number;
  tenant_emails?: string[];     // Liste d'emails locataires
  guarantor_emails?: string[];  // Liste d'emails garants
  comments?: string;
  _rowIndex: number;
  _resolvedLotId?: string;
}

export interface ParsedCompany {
  name: string;
  legal_name?: string;
  vat_number?: string;
  street?: string;
  street_number?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  website?: string;
  _rowIndex: number;
  _existingId?: string;  // For upsert
}

// ============================================================================
// Parse Result Types
// ============================================================================

export interface ParsedSheet<T> {
  name: string;
  headers: string[];
  rows: T[];
  rawRows: unknown[][];
}

export interface ParseResult {
  success: boolean;
  buildings: ParsedSheet<RawBuildingRow>;
  lots: ParsedSheet<RawLotRow>;
  contacts: ParsedSheet<RawContactRow>;
  contracts: ParsedSheet<RawContractRow>;
  companies: ParsedSheet<RawCompanyRow>;
  error?: string;
}

export interface ParsedData {
  buildings: ParsedBuilding[];
  lots: ParsedLot[];
  contacts: ParsedContact[];
  contracts: ParsedContract[];
  companies: ParsedCompany[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ImportRowError {
  row: number;           // 1-based row number (excluding header)
  sheet: string;         // Sheet name (Immeubles, Lots, etc.)
  field: string;         // Column/field name
  value: unknown;        // Actual value that failed
  message: string;       // User-friendly error message (French)
  code: ImportErrorCode; // Machine-readable code
}

export type ImportErrorCode =
  | 'REQUIRED_FIELD'           // Required field is empty
  | 'INVALID_FORMAT'           // Format validation failed
  | 'INVALID_ENUM'             // Value not in allowed enum
  | 'INVALID_NUMBER'           // Not a valid number
  | 'INVALID_DATE'             // Not a valid date
  | 'DUPLICATE_IN_FILE'        // Duplicate within the import file
  | 'DUPLICATE_IN_DATABASE'    // Already exists in database
  | 'REFERENCE_NOT_FOUND'      // Referenced entity not found
  | 'REFERENCE_AMBIGUOUS'      // Multiple matches for reference
  | 'CONFLICT'                 // Would conflict with existing data
  | 'PERMISSION_DENIED'        // User lacks permission
  | 'UNKNOWN';                 // Unknown error

export interface ValidationResult {
  isValid: boolean;
  errors: ImportRowError[];
  warnings: ImportRowError[];  // Non-blocking issues
  data: ParsedData;
}

// ============================================================================
// Import Job Types
// ============================================================================

export interface ImportJob {
  id: string;
  team_id: string;
  user_id: string;
  entity_type: ImportEntityType;
  status: ImportJobStatus;
  filename: string;
  total_rows: number;
  processed_rows: number;
  success_count: number;
  error_count: number;
  errors: ImportRowError[];
  created_ids: ImportCreatedIds;
  updated_ids: ImportCreatedIds;
  metadata: ImportJobMetadata;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ImportCreatedIds {
  buildings?: string[];
  lots?: string[];
  contacts?: string[];
  contracts?: string[];
  companies?: string[];
}

export interface ImportJobMetadata {
  column_mapping?: Record<string, string>;
  import_mode?: ImportMode;
  error_mode?: ErrorMode;
  original_filename?: string;
  file_size?: number;
  sheet_counts?: {
    buildings?: number;
    lots?: number;
    contacts?: number;
    contracts?: number;
    companies?: number;
  };
}

// ============================================================================
// Import Options
// ============================================================================

export interface ImportOptions {
  mode: ImportMode;
  errorMode: ErrorMode;
  dryRun: boolean;
  teamId: string;
  userId: string;
}

// ============================================================================
// Import Progress Types (for real-time streaming)
// ============================================================================

export type ImportPhase =
  | 'geocoding'    // Phase 0: Geocoding all addresses (buildings, independent lots, companies)
  | 'companies'
  | 'contacts'
  | 'buildings'
  | 'lots'
  | 'contracts'
  | 'completed';

export interface ImportProgressEvent {
  phase: ImportPhase;
  phaseIndex: number;        // 0-5 for the 6 phases, 6 for completed
  totalPhases: number;       // Always 6 (including geocoding)
  phaseName: string;         // French label for display
  phaseCount: number;        // Items in current phase
  phaseCreated: number;      // Created in current phase
  phaseUpdated: number;      // Updated in current phase
  phaseErrors: number;       // Errors in current phase
  totalProgress: number;     // 0-100 percentage overall
  isComplete: boolean;
}

export type ImportProgressCallback = (event: ImportProgressEvent) => void;

// ============================================================================
// Import Result Types
// ============================================================================

export interface CreatedContactInfo {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export interface ImportResult {
  success: boolean;
  jobId: string;
  created: ImportCreatedIds;
  updated: ImportCreatedIds;
  errors: ImportRowError[];
  summary: ImportSummary;
  createdContacts?: CreatedContactInfo[];
}

export interface ImportSummary {
  buildings: { created: number; updated: number; failed: number };
  lots: { created: number; updated: number; failed: number };
  contacts: { created: number; updated: number; failed: number };
  contracts: { created: number; updated: number; failed: number };
  companies: { created: number; updated: number; failed: number };
  totalProcessed: number;
  totalSuccess: number;
  totalFailed: number;
  duration: number;  // ms
}

// ============================================================================
// Template Types
// ============================================================================

export interface TemplateConfig {
  sheetName: string;
  headers: string[];
  exampleRows: (string | number)[][];
  columnWidths: number[];
  requiredColumns: string[];
}

export interface ColumnMapping {
  excelHeader: string;
  dbField: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'enum';
  enumValues?: string[];
  transform?: (value: unknown) => unknown;
}

// ============================================================================
// Progress Types (for SSE)
// ============================================================================

export interface ImportProgress {
  type: 'init' | 'progress' | 'complete' | 'error';
  jobId: string;
  status: ImportJobStatus;
  processed: number;
  total: number;
  success: number;
  errors: number;
  currentSheet?: string;
  currentRow?: number;
  message?: string;
}
