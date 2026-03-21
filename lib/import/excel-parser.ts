/**
 * Excel Parser
 * Wrapper for ExcelJS to parse Excel/CSV files
 *
 * ⚡ OPTIMIZED: ExcelJS is lazy-loaded to reduce initial bundle size
 */

import type {
  ParseResult,
  ParsedSheet,
  RawBuildingRow,
  RawLotRow,
  RawContactRow,
  RawContractRow,
  RawCompanyRow,
} from './types';
import { SHEET_NAMES, FILE_CONSTRAINTS } from './constants';
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
// Parse Functions
// ============================================================================

/**
 * Parse an Excel or CSV file into structured data
 */
export async function parseExcelFile(file: File): Promise<ParseResult> {
  // Validate file
  const validationError = validateFile(file);
  if (validationError) {
    return createEmptyResult(validationError);
  }

  try {
    const ExcelJS = await getExcelJS();
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    // Parse each expected sheet
    const buildings = parseSheet<RawBuildingRow>(
      workbook,
      SHEET_NAMES.BUILDINGS,
      findSheetName(workbook, SHEET_NAMES.BUILDINGS)
    );

    const lots = parseSheet<RawLotRow>(
      workbook,
      SHEET_NAMES.LOTS,
      findSheetName(workbook, SHEET_NAMES.LOTS)
    );

    const contacts = parseSheet<RawContactRow>(
      workbook,
      SHEET_NAMES.CONTACTS,
      findSheetName(workbook, SHEET_NAMES.CONTACTS)
    );

    const contracts = parseSheet<RawContractRow>(
      workbook,
      SHEET_NAMES.CONTRACTS,
      findSheetName(workbook, SHEET_NAMES.CONTRACTS)
    );

    const companies = parseSheet<RawCompanyRow>(
      workbook,
      SHEET_NAMES.COMPANIES,
      findSheetName(workbook, SHEET_NAMES.COMPANIES)
    );

    return {
      success: true,
      buildings,
      lots,
      contacts,
      contracts,
      companies,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de lecture du fichier';
    return createEmptyResult(message);
  }
}

/**
 * Parse a CSV file (single entity type)
 */
export async function parseCsvFile(
  file: File,
  entityType: 'building' | 'lot' | 'contact' | 'contract' | 'company'
): Promise<ParseResult> {
  const validationError = validateFile(file);
  if (validationError) {
    return createEmptyResult(validationError);
  }

  try {
    const ExcelJS = await getExcelJS();
    const text = await file.text();

    // ExcelJS supports CSV via csv.readFile but we need to parse from string
    // Convert CSV text to a buffer and load as CSV
    const workbook = new ExcelJS.Workbook();
    const csvBuffer = Buffer.from(text, 'utf-8');
    await workbook.csv.read(new (await import('stream')).Readable({
      read() {
        this.push(csvBuffer);
        this.push(null);
      }
    }), {
      dateFormats: ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'],
    });

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount === 0) {
      return createEmptyResult('Fichier CSV vide');
    }

    const sheetName = worksheet.name;
    const result = createEmptyResult();
    result.success = true;
    result.error = undefined;

    switch (entityType) {
      case 'building':
        result.buildings = parseWorksheet<RawBuildingRow>(worksheet, SHEET_NAMES.BUILDINGS);
        break;
      case 'lot':
        result.lots = parseWorksheet<RawLotRow>(worksheet, SHEET_NAMES.LOTS);
        break;
      case 'contact':
        result.contacts = parseWorksheet<RawContactRow>(worksheet, SHEET_NAMES.CONTACTS);
        break;
      case 'contract':
        result.contracts = parseWorksheet<RawContractRow>(worksheet, SHEET_NAMES.CONTRACTS);
        break;
      case 'company':
        result.companies = parseWorksheet<RawCompanyRow>(worksheet, SHEET_NAMES.COMPANIES);
        break;
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur de lecture du fichier CSV';
    return createEmptyResult(message);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a single sheet from the workbook by name
 */
function parseSheet<T>(
  workbook: ExcelJSTypes.Workbook,
  expectedName: string,
  actualName: string | null
): ParsedSheet<T> {
  const emptySheet: ParsedSheet<T> = {
    name: expectedName,
    headers: [],
    rows: [],
    rawRows: [],
  };

  if (!actualName) {
    return emptySheet;
  }

  const worksheet = workbook.getWorksheet(actualName);
  if (!worksheet || worksheet.rowCount === 0) {
    return emptySheet;
  }

  return parseWorksheet<T>(worksheet, actualName);
}

/**
 * Parse a worksheet into structured data
 */
function parseWorksheet<T>(
  worksheet: ExcelJSTypes.Worksheet,
  name: string
): ParsedSheet<T> {
  const rawRows: unknown[][] = [];

  worksheet.eachRow((row) => {
    const values = row.values as unknown[];
    // ExcelJS row.values is 1-indexed (index 0 is undefined), so slice from 1
    rawRows.push(values.slice(1));
  });

  if (rawRows.length === 0) {
    return { name, headers: [], rows: [], rawRows: [] };
  }

  // First row is headers
  const headers = (rawRows[0] as unknown[]).map((h) => normalizeHeader(String(h || '')));

  // Remaining rows are data
  const dataRows = rawRows.slice(1).filter((row) => {
    return (row as unknown[]).some((cell) => cell !== undefined && cell !== null && cell !== '');
  });

  // Check row limit
  if (dataRows.length > FILE_CONSTRAINTS.maxRows) {
    console.warn(
      `Sheet "${name}" has ${dataRows.length} rows, truncating to ${FILE_CONSTRAINTS.maxRows}`
    );
  }

  const limitedRows = dataRows.slice(0, FILE_CONSTRAINTS.maxRows);

  // Convert to objects
  const rows = limitedRows.map((row) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      const value = (row as unknown[])[i];
      if (value !== undefined && value !== null) {
        obj[header] = value;
      }
    });
    return obj as T;
  });

  return {
    name,
    headers,
    rows,
    rawRows: rawRows as unknown[][],
  };
}

/**
 * Find a sheet by name (case-insensitive, accent-insensitive)
 */
function findSheetName(workbook: ExcelJSTypes.Workbook, expected: string): string | null {
  const normalizedExpected = normalizeSheetName(expected);
  const sheetNames = workbook.worksheets.map((ws) => ws.name);

  for (const name of sheetNames) {
    if (normalizeSheetName(name) === normalizedExpected) {
      return name;
    }
  }

  // Try partial match
  for (const name of sheetNames) {
    if (normalizeSheetName(name).includes(normalizedExpected.slice(0, 5))) {
      return name;
    }
  }

  return null;
}

/**
 * Normalize sheet name for comparison
 */
function normalizeSheetName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalize header for consistent access
 */
function normalizeHeader(header: string): string {
  return header.trim();
}

/**
 * Validate file before parsing
 */
function validateFile(file: File): string | null {
  // Check file size
  if (file.size > FILE_CONSTRAINTS.maxFileSize) {
    const maxMB = FILE_CONSTRAINTS.maxFileSize / (1024 * 1024);
    return `Le fichier dépasse la taille maximale autorisée (${maxMB} Mo)`;
  }

  // Check extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!(FILE_CONSTRAINTS.allowedExtensions as readonly string[]).includes(extension)) {
    return `Format de fichier non supporté. Formats acceptés: ${FILE_CONSTRAINTS.allowedExtensions.join(', ')}`;
  }

  return null;
}

/**
 * Create an empty parse result
 */
function createEmptyResult(error?: string): ParseResult {
  const emptySheet = <T>(): ParsedSheet<T> => ({
    name: '',
    headers: [],
    rows: [],
    rawRows: [],
  });

  return {
    success: !error,
    buildings: emptySheet<RawBuildingRow>(),
    lots: emptySheet<RawLotRow>(),
    contacts: emptySheet<RawContactRow>(),
    contracts: emptySheet<RawContractRow>(),
    companies: emptySheet<RawCompanyRow>(),
    error,
  };
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Get sheet statistics
 */
export function getParseStats(result: ParseResult) {
  return {
    buildings: result.buildings.rows.length,
    lots: result.lots.rows.length,
    contacts: result.contacts.rows.length,
    contracts: result.contracts.rows.length,
    companies: result.companies.rows.length,
    total:
      result.buildings.rows.length +
      result.lots.rows.length +
      result.contacts.rows.length +
      result.contracts.rows.length +
      result.companies.rows.length,
  };
}

/**
 * Check if file is a CSV
 */
export function isCsvFile(file: File): boolean {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return extension === '.csv';
}

/**
 * Check if file is an Excel file
 */
export function isExcelFile(file: File): boolean {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return extension === '.xlsx' || extension === '.xls';
}
