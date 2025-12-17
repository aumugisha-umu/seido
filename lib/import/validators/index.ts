/**
 * Validators Index
 * Export all import validators
 */

export {
  buildingImportSchema,
  validateBuildingRow,
  validateBuildingRows,
  type BuildingImportData,
} from './building.validator';

export {
  lotImportSchema,
  validateLotRow,
  validateLotRows,
  type LotImportData,
} from './lot.validator';

export {
  contactImportSchema,
  validateContactRow,
  validateContactRows,
  type ContactImportData,
} from './contact.validator';

export {
  contractImportSchema,
  validateContractRow,
  validateContractRows,
  type ContractImportData,
} from './contract.validator';

import type {
  ParseResult,
  ParsedData,
  ImportRowError,
  ValidationResult,
} from '../types';
import { validateBuildingRows } from './building.validator';
import { validateLotRows } from './lot.validator';
import { validateContactRows } from './contact.validator';
import { validateContractRows } from './contract.validator';

/**
 * Validate all parsed data
 */
export function validateAllData(parseResult: ParseResult): ValidationResult {
  const errors: ImportRowError[] = [];
  const warnings: ImportRowError[] = [];

  // Validate each entity type
  const buildingResult = validateBuildingRows(parseResult.buildings.rows);
  const lotResult = validateLotRows(parseResult.lots.rows);
  const contactResult = validateContactRows(parseResult.contacts.rows);
  const contractResult = validateContractRows(parseResult.contracts.rows);

  // Collect all errors
  errors.push(...buildingResult.errors);
  errors.push(...lotResult.errors);
  errors.push(...contactResult.errors);
  errors.push(...contractResult.errors);

  // Cross-validate references
  const crossValidationErrors = validateCrossReferences(
    lotResult.data,
    buildingResult.data,
    contractResult.data,
    contactResult.data
  );
  errors.push(...crossValidationErrors);

  const data: ParsedData = {
    buildings: buildingResult.data,
    lots: lotResult.data,
    contacts: contactResult.data,
    contracts: contractResult.data,
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data,
  };
}

/**
 * Validate cross-references between entities
 */
function validateCrossReferences(
  lots: ParsedData['lots'],
  buildings: ParsedData['buildings'],
  contracts: ParsedData['contracts'],
  contacts: ParsedData['contacts']
): ImportRowError[] {
  const errors: ImportRowError[] = [];

  // Build lookup maps
  const buildingNames = new Set(
    buildings.map((b) => b.name.toLowerCase().trim())
  );
  const lotReferences = new Set(
    lots.map((l) => l.reference.toLowerCase().trim())
  );
  const contactEmails = new Set(
    contacts.filter((c) => c.email).map((c) => c.email!.toLowerCase().trim())
  );

  // Validate lot → building references
  for (const lot of lots) {
    if (lot.building_name) {
      const normalizedName = lot.building_name.toLowerCase().trim();
      if (!buildingNames.has(normalizedName)) {
        errors.push({
          row: lot._rowIndex + 2,
          sheet: 'Lots',
          field: 'building_name',
          value: lot.building_name,
          message: `Immeuble "${lot.building_name}" non trouvé dans l'onglet Immeubles. Vérifiez le nom ou ajoutez l'immeuble.`,
          code: 'REFERENCE_NOT_FOUND',
        });
      }
    }
  }

  // Validate contract → lot references
  for (const contract of contracts) {
    const normalizedRef = contract.lot_reference.toLowerCase().trim();
    if (!lotReferences.has(normalizedRef)) {
      errors.push({
        row: contract._rowIndex + 2,
        sheet: 'Baux',
        field: 'lot_reference',
        value: contract.lot_reference,
        message: `Lot "${contract.lot_reference}" non trouvé dans l'onglet Lots. Vérifiez la référence ou ajoutez le lot.`,
        code: 'REFERENCE_NOT_FOUND',
      });
    }

    // Validate contract → tenant emails references
    if (contract.tenant_emails && contract.tenant_emails.length > 0) {
      for (const email of contract.tenant_emails) {
        const normalizedEmail = email.toLowerCase().trim();
        if (!contactEmails.has(normalizedEmail)) {
          errors.push({
            row: contract._rowIndex + 2,
            sheet: 'Baux',
            field: 'tenant_emails',
            value: email,
            message: `Locataire avec l'email "${email}" non trouvé dans l'onglet Contacts. Vérifiez l'email ou ajoutez le contact.`,
            code: 'REFERENCE_NOT_FOUND',
          });
        }
      }
    }

    // Validate contract → guarantor emails references
    if (contract.guarantor_emails && contract.guarantor_emails.length > 0) {
      for (const email of contract.guarantor_emails) {
        const normalizedEmail = email.toLowerCase().trim();
        if (!contactEmails.has(normalizedEmail)) {
          errors.push({
            row: contract._rowIndex + 2,
            sheet: 'Baux',
            field: 'guarantor_emails',
            value: email,
            message: `Garant avec l'email "${email}" non trouvé dans l'onglet Contacts. Vérifiez l'email ou ajoutez le contact.`,
            code: 'REFERENCE_NOT_FOUND',
          });
        }
      }
    }
  }

  return errors;
}
