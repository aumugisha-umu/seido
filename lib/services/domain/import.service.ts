/**
 * Import Service
 * Orchestrates the bulk import process for buildings, lots, contacts, and contracts
 */

import { logger } from '@/lib/logger';
import type {
  ParsedData,
  ParsedBuilding,
  ParsedLot,
  ParsedContact,
  ParsedContract,
  ImportResult,
  ImportRowError,
  ImportCreatedIds,
  ImportSummary,
  ImportOptions,
  ValidationResult,
} from '@/lib/import/types';
import { ERROR_MESSAGES, SHEET_NAMES } from '@/lib/import/constants';
import { validateAllData } from '@/lib/import/validators';

import {
  BuildingRepository,
  createServerActionBuildingRepository,
} from '../repositories/building.repository';
import {
  LotRepository,
  createServerActionLotRepository,
} from '../repositories/lot.repository';
import {
  UserRepository,
  createServerActionUserRepository,
} from '../repositories/user.repository';
import {
  ImportJobRepository,
  createServerActionImportJobRepository,
} from '../repositories/import-job.repository';
import {
  ContractRepository,
  ContractContactRepository,
  createServerActionContractRepository,
  createServerActionContractContactRepository,
} from '../repositories/contract.repository';
import type { BuildingInsert, LotInsert, UserInsert } from '../core/service-types';
import type { ContractInsert, ContractContactInsert } from '@/lib/types/contract.types';

// ============================================================================
// Service Class
// ============================================================================

export class ImportService {
  constructor(
    private buildingRepo: BuildingRepository,
    private lotRepo: LotRepository,
    private userRepo: UserRepository,
    private importJobRepo: ImportJobRepository,
    private contractRepo: ContractRepository,
    private contractContactRepo: ContractContactRepository
  ) {}

  /**
   * Validate parsed data (dry run)
   * Returns validation errors without creating anything
   */
  async validate(
    parsedData: ParsedData,
    teamId: string
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    logger.info('[IMPORT-SERVICE] Starting validation', {
      teamId,
      buildingsCount: parsedData.buildings.length,
      lotsCount: parsedData.lots.length,
      contactsCount: parsedData.contacts.length,
      contractsCount: parsedData.contracts.length,
    });

    // Run validators
    const result = validateAllData({
      success: true,
      buildings: { name: SHEET_NAMES.BUILDINGS, headers: [], rows: parsedData.buildings as unknown as never[], rawRows: [] },
      lots: { name: SHEET_NAMES.LOTS, headers: [], rows: parsedData.lots as unknown as never[], rawRows: [] },
      contacts: { name: SHEET_NAMES.CONTACTS, headers: [], rows: parsedData.contacts as unknown as never[], rawRows: [] },
      contracts: { name: SHEET_NAMES.CONTRACTS, headers: [], rows: parsedData.contracts as unknown as never[], rawRows: [] },
    });

    // Additional database validation
    const dbErrors = await this.validateAgainstDatabase(parsedData, teamId);
    result.errors.push(...dbErrors);
    result.isValid = result.errors.length === 0;

    logger.info('[IMPORT-SERVICE] Validation completed', {
      teamId,
      isValid: result.isValid,
      errorCount: result.errors.length,
      duration: `${Date.now() - startTime}ms`,
    });

    return result;
  }

  /**
   * Validate data against existing database records
   */
  private async validateAgainstDatabase(
    data: ParsedData,
    teamId: string
  ): Promise<ImportRowError[]> {
    const errors: ImportRowError[] = [];

    // Check for duplicate building names in DB
    for (const building of data.buildings) {
      const existingResult = await this.buildingRepo.findByNameAndTeam(
        building.name,
        teamId
      );

      if (existingResult.success && existingResult.data) {
        // Not an error for upsert - just note it
        logger.debug(`Building "${building.name}" exists, will be updated`);
      }
    }

    // Check for duplicate lot references in DB
    for (const lot of data.lots) {
      const existingResult = await this.lotRepo.findByReferenceAndTeam(
        lot.reference,
        teamId
      );

      if (existingResult.success && existingResult.data) {
        logger.debug(`Lot "${lot.reference}" exists, will be updated`);
      }
    }

    // Check for email conflicts
    for (const contact of data.contacts) {
      if (contact.email) {
        const existingResult = await this.userRepo.findByEmail(contact.email);

        if (existingResult.success && existingResult.data) {
          // Check if in same team
          const inTeamResult = await this.userRepo.findByEmailInTeam(
            contact.email,
            teamId
          );

          if (!inTeamResult.success || !inTeamResult.data) {
            errors.push({
              row: contact._rowIndex + 2,
              sheet: SHEET_NAMES.CONTACTS,
              field: 'email',
              value: contact.email,
              message: `L'email "${contact.email}" est déjà utilisé par un contact dans une autre équipe`,
              code: 'CONFLICT',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Execute the full import
   * Order: Contacts → Buildings → Lots → Contracts
   */
  async executeImport(
    data: ParsedData,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const { teamId, userId, dryRun } = options;

    logger.info('[IMPORT-SERVICE] Starting import', {
      teamId,
      userId,
      dryRun,
      mode: options.mode,
    });

    // Create import job
    logger.info('[IMPORT-SERVICE] Creating import job...', { teamId, userId });

    let jobResult;
    try {
      jobResult = await this.importJobRepo.create({
        team_id: teamId,
        user_id: userId,
        entity_type: 'mixed',
        filename: 'import.xlsx',
        total_rows:
          data.buildings.length +
          data.lots.length +
          data.contacts.length +
          data.contracts.length,
        metadata: {
          import_mode: options.mode,
          error_mode: options.errorMode,
          sheet_counts: {
            buildings: data.buildings.length,
            lots: data.lots.length,
            contacts: data.contacts.length,
            contracts: data.contracts.length,
          },
        },
      });
      logger.info('[IMPORT-SERVICE] Import job creation result', {
        success: jobResult.success,
        hasData: !!jobResult.data,
        jobId: jobResult.data?.id,
        error: !jobResult.success ? jobResult.error : undefined,
      });
    } catch (createJobError) {
      logger.error('[IMPORT-SERVICE] Exception creating import job', {
        error: createJobError instanceof Error ? createJobError.message : 'Unknown',
        stack: createJobError instanceof Error ? createJobError.stack : undefined,
      });
      throw createJobError;
    }

    if (!jobResult.success || !jobResult.data) {
      logger.error('[IMPORT-SERVICE] Failed to create import job', {
        success: jobResult.success,
        error: !jobResult.success ? jobResult.error : 'No data returned',
      });
      return {
        success: false,
        jobId: '',
        created: {},
        updated: {},
        errors: [
          {
            row: 0,
            sheet: '',
            field: '',
            value: '',
            message: !jobResult.success && jobResult.error
              ? `Erreur: ${jobResult.error.message}`
              : 'Erreur lors de la création du job d\'import (table import_jobs manquante?)',
            code: 'UNKNOWN',
          },
        ],
        summary: this.createEmptySummary(0),
      };
    }

    const jobId = jobResult.data.id;

    // If dry run, just validate
    if (dryRun) {
      const validationResult = await this.validate(data, teamId);
      await this.importJobRepo.update(jobId, {
        status: validationResult.isValid ? 'completed' : 'failed',
        errors: validationResult.errors,
        completed_at: new Date().toISOString(),
      });

      return {
        success: validationResult.isValid,
        jobId,
        created: {},
        updated: {},
        errors: validationResult.errors,
        summary: this.createEmptySummary(Date.now() - startTime),
      };
    }

    // Start import
    await this.importJobRepo.updateStatus(jobId, 'importing');

    const errors: ImportRowError[] = [];
    const created: ImportCreatedIds = {
      buildings: [],
      lots: [],
      contacts: [],
      contracts: [],
    };
    const updated: ImportCreatedIds = {
      buildings: [],
      lots: [],
      contacts: [],
      contracts: [],
    };

    try {
      // 1. Import Contacts first (no dependencies)
      logger.info('[IMPORT-SERVICE] Step 1: Importing contacts...', { count: data.contacts.length });
      const contactResult = await this.importContacts(data.contacts, teamId);
      logger.info('[IMPORT-SERVICE] Contacts imported', {
        created: contactResult.created.length,
        updated: contactResult.updated.length,
        errors: contactResult.errors.length,
      });
      if (contactResult.errors.length > 0) {
        errors.push(...contactResult.errors);
      }
      created.contacts = contactResult.created;
      updated.contacts = contactResult.updated;

      // 2. Import Buildings (no dependencies)
      logger.info('[IMPORT-SERVICE] Step 2: Importing buildings...', { count: data.buildings.length });
      const buildingResult = await this.importBuildings(data.buildings, teamId);
      logger.info('[IMPORT-SERVICE] Buildings imported', {
        created: buildingResult.created.length,
        updated: buildingResult.updated.length,
        errors: buildingResult.errors.length,
      });
      if (buildingResult.errors.length > 0) {
        errors.push(...buildingResult.errors);
      }
      created.buildings = buildingResult.created;
      updated.buildings = buildingResult.updated;

      // 3. Import Lots (depends on buildings)
      logger.info('[IMPORT-SERVICE] Step 3: Importing lots...', { count: data.lots.length });
      const lotResult = await this.importLots(data.lots, teamId, buildingResult.nameToId);
      logger.info('[IMPORT-SERVICE] Lots imported', {
        created: lotResult.created.length,
        updated: lotResult.updated.length,
        errors: lotResult.errors.length,
      });
      if (lotResult.errors.length > 0) {
        errors.push(...lotResult.errors);
      }
      created.lots = lotResult.created;
      updated.lots = lotResult.updated;

      // 4. Import Contracts (depends on lots and contacts)
      logger.info('[IMPORT-SERVICE] Step 4: Importing contracts...', { count: data.contracts.length });
      const contractResult = await this.importContracts(
        data.contracts,
        teamId,
        userId,
        lotResult.referenceToId,
        contactResult.emailToId
      );
      logger.info('[IMPORT-SERVICE] Contracts imported', {
        created: contractResult.created.length,
        updated: contractResult.updated.length,
        errors: contractResult.errors.length,
      });
      if (contractResult.errors.length > 0) {
        errors.push(...contractResult.errors);
      }
      created.contracts = contractResult.created;
      updated.contracts = contractResult.updated;

      // All-or-nothing: if errors and mode is all_or_nothing, rollback
      if (errors.length > 0 && options.errorMode === 'all_or_nothing') {
        // In a real implementation, we'd use a transaction
        // For now, we just report the errors
        await this.importJobRepo.update(jobId, {
          status: 'failed',
          errors,
          completed_at: new Date().toISOString(),
        });

        return {
          success: false,
          jobId,
          created: {},
          updated: {},
          errors,
          summary: this.createSummary(created, updated, errors, Date.now() - startTime),
        };
      }

      // Success (or partial success in skip_errors mode)
      await this.importJobRepo.update(jobId, {
        status: errors.length === 0 ? 'completed' : 'completed',
        created_ids: created,
        updated_ids: updated,
        errors,
        success_count:
          (created.buildings?.length || 0) +
          (created.lots?.length || 0) +
          (created.contacts?.length || 0) +
          (created.contracts?.length || 0) +
          (updated.buildings?.length || 0) +
          (updated.lots?.length || 0) +
          (updated.contacts?.length || 0) +
          (updated.contracts?.length || 0),
        error_count: errors.length,
        completed_at: new Date().toISOString(),
      });

      const duration = Date.now() - startTime;
      logger.info('[IMPORT-SERVICE] Import completed', {
        jobId,
        duration: `${duration}ms`,
        created,
        updated,
        errorCount: errors.length,
      });

      return {
        success: errors.length === 0,
        jobId,
        created,
        updated,
        errors,
        summary: this.createSummary(created, updated, errors, duration),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('[IMPORT-SERVICE] Import failed with exception', {
        message: errorMessage,
        stack: errorStack,
        errorType: error?.constructor?.name,
        jobId,
        teamId,
        userId,
      });

      await this.importJobRepo.update(jobId, {
        status: 'failed',
        errors: [
          {
            row: 0,
            sheet: '',
            field: '',
            value: '',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
            code: 'UNKNOWN',
          },
        ],
        completed_at: new Date().toISOString(),
      });

      return {
        success: false,
        jobId,
        created: {},
        updated: {},
        errors: [
          {
            row: 0,
            sheet: '',
            field: '',
            value: '',
            message: error instanceof Error ? error.message : 'Erreur inconnue',
            code: 'UNKNOWN',
          },
        ],
        summary: this.createEmptySummary(Date.now() - startTime),
      };
    }
  }

  /**
   * Import contacts
   */
  private async importContacts(
    contacts: ParsedContact[],
    teamId: string
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    emailToId: Map<string, string>;
  }> {
    const errors: ImportRowError[] = [];
    const emailToId = new Map<string, string>();

    // Convert to UserInsert format
    const usersToImport: (UserInsert & { _rowIndex: number })[] = contacts.map((c) => ({
      name: c.name,
      email: c.email || null,
      phone: c.phone,
      role: c.role as 'locataire' | 'prestataire' | 'proprietaire',
      address: c.address,
      speciality: c.speciality,
      notes: c.notes,
      _rowIndex: c._rowIndex,
    }));

    const result = await this.userRepo.upsertMany(usersToImport, teamId);

    if (!result.success) {
      errors.push({
        row: 0,
        sheet: SHEET_NAMES.CONTACTS,
        field: '',
        value: '',
        message: result.error.message,
        code: 'UNKNOWN',
      });
      return { created: [], updated: [], errors, emailToId };
    }

    // Build email to ID map for contract linking
    for (const contact of contacts) {
      if (contact.email) {
        const userResult = await this.userRepo.findByEmailInTeam(contact.email, teamId);
        if (userResult.success && userResult.data) {
          emailToId.set(contact.email.toLowerCase(), userResult.data.id);
        }
      }
    }

    return {
      created: result.created,
      updated: result.updated,
      errors,
      emailToId,
    };
  }

  /**
   * Import buildings
   */
  private async importBuildings(
    buildings: ParsedBuilding[],
    teamId: string
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    nameToId: Map<string, string>;
  }> {
    const errors: ImportRowError[] = [];
    const nameToId = new Map<string, string>();

    // Convert to BuildingInsert format
    const buildingsToImport: BuildingInsert[] = buildings.map((b) => ({
      name: b.name,
      address: b.address,
      city: b.city,
      postal_code: b.postal_code,
      country: b.country as 'france' | 'belgique' | 'suisse' | 'luxembourg' | 'allemagne' | 'pays-bas' | 'autre',
      description: b.description,
      team_id: teamId,
    }));

    const result = await this.buildingRepo.upsertMany(buildingsToImport, teamId);

    if (!result.success) {
      errors.push({
        row: 0,
        sheet: SHEET_NAMES.BUILDINGS,
        field: '',
        value: '',
        message: result.error.message,
        code: 'UNKNOWN',
      });
      return { created: [], updated: [], errors, nameToId };
    }

    // Build name to ID map for lot linking
    for (const building of buildings) {
      const buildingResult = await this.buildingRepo.findByNameAndTeam(
        building.name,
        teamId
      );
      if (buildingResult.success && buildingResult.data) {
        nameToId.set(building.name.toLowerCase().trim(), buildingResult.data.id);
      }
    }

    return {
      created: result.created,
      updated: result.updated,
      errors,
      nameToId,
    };
  }

  /**
   * Import lots
   */
  private async importLots(
    lots: ParsedLot[],
    teamId: string,
    buildingNameToId: Map<string, string>
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    referenceToId: Map<string, string>;
  }> {
    const errors: ImportRowError[] = [];
    const referenceToId = new Map<string, string>();

    // Resolve building IDs and convert to LotInsert format
    const lotsToImport: (LotInsert & { _resolvedBuildingId?: string | null })[] = lots.map((l) => {
      let buildingId: string | null = null;

      if (l.building_name) {
        const normalizedName = l.building_name.toLowerCase().trim();
        buildingId = buildingNameToId.get(normalizedName) || null;

        if (!buildingId) {
          errors.push({
            row: l._rowIndex + 2,
            sheet: SHEET_NAMES.LOTS,
            field: 'building_name',
            value: l.building_name,
            message: ERROR_MESSAGES.REFERENCE_NOT_FOUND('Immeuble', l.building_name),
            code: 'REFERENCE_NOT_FOUND',
          });
        }
      }

      return {
        reference: l.reference,
        building_id: buildingId,
        category: l.category as 'appartement' | 'collocation' | 'maison' | 'garage' | 'local_commercial' | 'autre',
        floor: l.floor,
        street: l.street,
        city: l.city,
        postal_code: l.postal_code,
        description: l.description,
        team_id: teamId,
        _resolvedBuildingId: buildingId,
      };
    });

    // Filter out lots with resolution errors
    const validLots = lotsToImport.filter(
      (l) => !l.building_id || buildingNameToId.has((lots.find(
        (ol) => ol.reference === l.reference
      )?.building_name || '').toLowerCase().trim())
    );

    if (validLots.length === 0 && lots.length > 0) {
      return { created: [], updated: [], errors, referenceToId };
    }

    const result = await this.lotRepo.upsertMany(validLots, teamId);

    if (!result.success) {
      errors.push({
        row: 0,
        sheet: SHEET_NAMES.LOTS,
        field: '',
        value: '',
        message: result.error.message,
        code: 'UNKNOWN',
      });
      return { created: [], updated: [], errors, referenceToId };
    }

    // Build reference to ID map for contract linking
    for (const lot of lots) {
      const lotResult = await this.lotRepo.findByReferenceAndTeam(lot.reference, teamId);
      if (lotResult.success && lotResult.data) {
        referenceToId.set(lot.reference.toLowerCase().trim(), lotResult.data.id);
      }
    }

    return {
      created: result.created,
      updated: result.updated,
      errors,
      referenceToId,
    };
  }

  /**
   * Import contracts
   */
  private async importContracts(
    contracts: ParsedContract[],
    teamId: string,
    userId: string,
    lotReferenceToId: Map<string, string>,
    contactEmailToId: Map<string, string>
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
  }> {
    const errors: ImportRowError[] = [];
    const created: string[] = [];
    const updated: string[] = [];

    logger.info('[IMPORT-SERVICE] Starting contract import', {
      contractCount: contracts.length,
    });

    for (const contract of contracts) {
      const lotId = lotReferenceToId.get(contract.lot_reference.toLowerCase().trim());

      if (!lotId) {
        errors.push({
          row: contract._rowIndex + 2,
          sheet: SHEET_NAMES.CONTRACTS,
          field: 'lot_reference',
          value: contract.lot_reference,
          message: ERROR_MESSAGES.REFERENCE_NOT_FOUND('Lot', contract.lot_reference),
          code: 'REFERENCE_NOT_FOUND',
        });
        continue;
      }

      // Resolve tenant emails to user IDs
      const tenantUserIds: string[] = [];
      if (contract.tenant_emails && contract.tenant_emails.length > 0) {
        for (const email of contract.tenant_emails) {
          const normalizedEmail = email.toLowerCase().trim();
          const userId = contactEmailToId.get(normalizedEmail);
          if (userId) {
            tenantUserIds.push(userId);
          } else {
            errors.push({
              row: contract._rowIndex + 2,
              sheet: SHEET_NAMES.CONTRACTS,
              field: 'tenant_emails',
              value: email,
              message: ERROR_MESSAGES.REFERENCE_NOT_FOUND('Locataire', email),
              code: 'REFERENCE_NOT_FOUND',
            });
          }
        }
      }

      // Resolve guarantor emails to user IDs
      const guarantorUserIds: string[] = [];
      if (contract.guarantor_emails && contract.guarantor_emails.length > 0) {
        for (const email of contract.guarantor_emails) {
          const normalizedEmail = email.toLowerCase().trim();
          const userId = contactEmailToId.get(normalizedEmail);
          if (userId) {
            guarantorUserIds.push(userId);
          } else {
            errors.push({
              row: contract._rowIndex + 2,
              sheet: SHEET_NAMES.CONTRACTS,
              field: 'guarantor_emails',
              value: email,
              message: ERROR_MESSAGES.REFERENCE_NOT_FOUND('Garant', email),
              code: 'REFERENCE_NOT_FOUND',
            });
          }
        }
      }

      // Skip contract if any contact reference errors occurred
      if (tenantUserIds.length < (contract.tenant_emails?.length || 0) ||
          guarantorUserIds.length < (contract.guarantor_emails?.length || 0)) {
        continue;
      }

      // Calculate status based on dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const start = new Date(contract.start_date);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(start);
      end.setMonth(end.getMonth() + contract.duration_months);
      end.setHours(0, 0, 0, 0);
      
      let status: 'a_venir' | 'actif' | 'expire';
      if (end < today) {
        status = 'expire';
      } else if (start > today) {
        status = 'a_venir';
      } else {
        status = 'actif';
      }

      // Create the contract
      const contractData: ContractInsert = {
        team_id: teamId,
        lot_id: lotId,
        created_by: userId,
        title: contract.title,
        start_date: contract.start_date,
        duration_months: contract.duration_months,
        rent_amount: contract.rent_amount,
        charges_amount: contract.charges_amount,
        contract_type: contract.contract_type as 'bail_habitation' | 'bail_meuble',
        guarantee_amount: contract.guarantee_amount,
        comments: contract.comments,
        status, // Calculated automatically based on dates
      };

      const createResult = await this.contractRepo.create(contractData);

      if (!createResult.success) {
        errors.push({
          row: contract._rowIndex + 2,
          sheet: SHEET_NAMES.CONTRACTS,
          field: '',
          value: '',
          message: `Erreur lors de la création du contrat: ${createResult.error.message}`,
          code: 'UNKNOWN',
        });
        continue;
      }

      const contractId = createResult.data.id;
      created.push(contractId);

      // Link tenants to contract via contract_contacts table
      let isFirstTenant = true;
      for (const tenantUserId of tenantUserIds) {
        const contactData: ContractContactInsert = {
          contract_id: contractId,
          user_id: tenantUserId,
          role: 'locataire',
          is_primary: isFirstTenant, // First tenant is primary
        };

        const contactResult = await this.contractContactRepo.create(contactData);
        if (!contactResult.success) {
          logger.warn('[IMPORT-SERVICE] Failed to link tenant to contract', {
            contractId,
            tenantUserId,
            error: contactResult.error.message,
          });
        }
        isFirstTenant = false;
      }

      // Link guarantors to contract via contract_contacts table
      for (const guarantorUserId of guarantorUserIds) {
        const contactData: ContractContactInsert = {
          contract_id: contractId,
          user_id: guarantorUserId,
          role: 'garant',
          is_primary: false,
        };

        const contactResult = await this.contractContactRepo.create(contactData);
        if (!contactResult.success) {
          logger.warn('[IMPORT-SERVICE] Failed to link guarantor to contract', {
            contractId,
            guarantorUserId,
            error: contactResult.error.message,
          });
        }
      }

      logger.debug(`[IMPORT-SERVICE] Contract created with contacts`, {
        contractId,
        title: contract.title,
        tenantsCount: tenantUserIds.length,
        guarantorsCount: guarantorUserIds.length,
      });
    }

    logger.info('[IMPORT-SERVICE] Contract import completed', {
      created: created.length,
      errors: errors.length,
    });

    return { created, updated, errors };
  }

  /**
   * Create empty summary
   */
  private createEmptySummary(duration: number): ImportSummary {
    return {
      buildings: { created: 0, updated: 0, failed: 0 },
      lots: { created: 0, updated: 0, failed: 0 },
      contacts: { created: 0, updated: 0, failed: 0 },
      contracts: { created: 0, updated: 0, failed: 0 },
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: 0,
      duration,
    };
  }

  /**
   * Create summary from results
   */
  private createSummary(
    created: ImportCreatedIds,
    updated: ImportCreatedIds,
    errors: ImportRowError[],
    duration: number
  ): ImportSummary {
    const buildingErrors = errors.filter((e) => e.sheet === SHEET_NAMES.BUILDINGS).length;
    const lotErrors = errors.filter((e) => e.sheet === SHEET_NAMES.LOTS).length;
    const contactErrors = errors.filter((e) => e.sheet === SHEET_NAMES.CONTACTS).length;
    const contractErrors = errors.filter((e) => e.sheet === SHEET_NAMES.CONTRACTS).length;

    const summary: ImportSummary = {
      buildings: {
        created: created.buildings?.length || 0,
        updated: updated.buildings?.length || 0,
        failed: buildingErrors,
      },
      lots: {
        created: created.lots?.length || 0,
        updated: updated.lots?.length || 0,
        failed: lotErrors,
      },
      contacts: {
        created: created.contacts?.length || 0,
        updated: updated.contacts?.length || 0,
        failed: contactErrors,
      },
      contracts: {
        created: created.contracts?.length || 0,
        updated: updated.contracts?.length || 0,
        failed: contractErrors,
      },
      totalProcessed: 0,
      totalSuccess: 0,
      totalFailed: errors.length,
      duration,
    };

    summary.totalSuccess =
      summary.buildings.created +
      summary.buildings.updated +
      summary.lots.created +
      summary.lots.updated +
      summary.contacts.created +
      summary.contacts.updated +
      summary.contracts.created +
      summary.contracts.updated;

    summary.totalProcessed = summary.totalSuccess + summary.totalFailed;

    return summary;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export const createServerActionImportService = async () => {
  const buildingRepo = await createServerActionBuildingRepository();
  const lotRepo = await createServerActionLotRepository();
  const userRepo = await createServerActionUserRepository();
  const importJobRepo = await createServerActionImportJobRepository();
  const contractRepo = await createServerActionContractRepository();
  const contractContactRepo = await createServerActionContractContactRepository();

  return new ImportService(buildingRepo, lotRepo, userRepo, importJobRepo, contractRepo, contractContactRepo);
};
