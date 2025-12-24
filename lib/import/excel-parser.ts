/**
 * Excel Parser
 * Wrapper for SheetJS to parse Excel/CSV files
 */

import * as XLSX from 'xlsx';
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
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    // Parse each expected sheet
    const buildings = parseSheet<RawBuildingRow>(
      workbook,
      SHEET_NAMES.BUILDINGS,
      findSheetName(workbook.SheetNames, SHEET_NAMES.BUILDINGS)
    );

    const lots = parseSheet<RawLotRow>(
      workbook,
      SHEET_NAMES.LOTS,
      findSheetName(workbook.SheetNames, SHEET_NAMES.LOTS)
    );

    const contacts = parseSheet<RawContactRow>(
      workbook,
      SHEET_NAMES.CONTACTS,
      findSheetName(workbook.SheetNames, SHEET_NAMES.CONTACTS)
    );

    const contracts = parseSheet<RawContractRow>(
      workbook,
      SHEET_NAMES.CONTRACTS,
      findSheetName(workbook.SheetNames, SHEET_NAMES.CONTRACTS)
    );

    const companies = parseSheet<RawCompanyRow>(
      workbook,
      SHEET_NAMES.COMPANIES,
      findSheetName(workbook.SheetNames, SHEET_NAMES.COMPANIES)
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
    const text = await file.text();
    const workbook = XLSX.read(text, {
      type: 'string',
      cellDates: true,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return createEmptyResult('Fichier CSV vide');
    }

    const result = createEmptyResult();
    result.success = true;
    result.error = undefined;

    switch (entityType) {
      case 'building':
        result.buildings = parseSheet<RawBuildingRow>(workbook, SHEET_NAMES.BUILDINGS, sheetName);
        break;
      case 'lot':
        result.lots = parseSheet<RawLotRow>(workbook, SHEET_NAMES.LOTS, sheetName);
        break;
      case 'contact':
        result.contacts = parseSheet<RawContactRow>(workbook, SHEET_NAMES.CONTACTS, sheetName);
        break;
      case 'contract':
        result.contracts = parseSheet<RawContractRow>(workbook, SHEET_NAMES.CONTRACTS, sheetName);
        break;
      case 'company':
        result.companies = parseSheet<RawCompanyRow>(workbook, SHEET_NAMES.COMPANIES, sheetName);
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
 * Parse a single sheet from the workbook
 */
function parseSheet<T>(
  workbook: XLSX.WorkBook,
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

  const worksheet = workbook.Sheets[actualName];
  if (!worksheet) {
    return emptySheet;
  }

  // Get raw data as 2D array
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawRows.length === 0) {
    return { ...emptySheet, name: actualName };
  }

  // First row is headers
  const headers = (rawRows[0] as unknown[]).map((h) => normalizeHeader(String(h || '')));

  // Remaining rows are data
  const dataRows = rawRows.slice(1).filter((row) => {
    // Skip completely empty rows
    return (row as unknown[]).some((cell) => cell !== undefined && cell !== null && cell !== '');
  });

  // Check row limit
  if (dataRows.length > FILE_CONSTRAINTS.maxRows) {
    console.warn(
      `Sheet "${actualName}" has ${dataRows.length} rows, truncating to ${FILE_CONSTRAINTS.maxRows}`
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
    name: actualName,
    headers,
    rows,
    rawRows: rawRows as unknown[][],
  };
}

/**
 * Find a sheet by name (case-insensitive, accent-insensitive)
 */
function findSheetName(sheetNames: string[], expected: string): string | null {
  const normalizedExpected = normalizeSheetName(expected);

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
  if (!FILE_CONSTRAINTS.allowedExtensions.includes(extension)) {
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
