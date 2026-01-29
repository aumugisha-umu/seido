/**
 * Import Service
 * Orchestrates the bulk import process for buildings, lots, contacts, and contracts
 */

import { logger } from '@/lib/logger';
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import type {
  ParsedData,
  ParsedBuilding,
  ParsedLot,
  ParsedContact,
  ParsedContract,
  ParsedCompany,
  ImportResult,
  ImportRowError,
  ImportCreatedIds,
  ImportSummary,
  ImportOptions,
  ValidationResult,
  CreatedContactInfo,
  ImportProgressCallback,
  ImportProgressEvent,
  ImportPhase,
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
import {
  CompanyRepository,
  createServerActionCompanyRepository,
} from '../repositories/company.repository';
import {
  AddressService,
  createAddressService,
} from './address.service';
import type { BuildingInsert, LotInsert, UserInsert } from '../core/service-types';
import type { Database } from '@/lib/database.types';
import type { Address } from '../repositories/address.repository';

type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
import type { ContractInsert, ContractContactInsert } from '@/lib/types/contract.types';

// ============================================================================
// Service Class
// ============================================================================

// Geocoding result type
interface GeocodeResult {
  latitude: number;
  longitude: number;
  placeId: string;
  formattedAddress: string;
}

// Address data for batch processing
interface AddressData {
  key: string;         // Unique key for mapping back to entity
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export class ImportService {
  constructor(
    private buildingRepo: BuildingRepository,
    private lotRepo: LotRepository,
    private userRepo: UserRepository,
    private importJobRepo: ImportJobRepository,
    private contractRepo: ContractRepository,
    private contractContactRepo: ContractContactRepository,
    private companyRepo: CompanyRepository,
    private addressService: AddressService
  ) {}

  /**
   * Geocode addresses in batch with rate limiting
   * Google API limit: 50 requests/second
   * @returns Map of address key to geocode result (or null if geocoding failed)
   */
  private async geocodeAddressesBatch(
    addresses: AddressData[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<Map<string, GeocodeResult | null>> {
    const results = new Map<string, GeocodeResult | null>();
    const BATCH_SIZE = 10;    // Parallel requests per batch
    const DELAY_MS = 250;     // Delay between batches (40 req/sec)

    if (addresses.length === 0) {
      return results;
    }

    logger.info('[IMPORT-SERVICE] Starting batch geocoding', {
      totalAddresses: addresses.length,
      batchSize: BATCH_SIZE,
      estimatedTimeSeconds: Math.ceil(addresses.length / BATCH_SIZE * DELAY_MS / 1000)
    });

    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchPromises = batch.map(async (addr) => {
        try {
          const result = await this.addressService.geocodeAddress(
            addr.street,
            addr.postalCode,
            addr.city,
            addr.country
          );

          if (result.success && result.data) {
            return { key: addr.key, geocode: result.data };
          }
          return { key: addr.key, geocode: null };
        } catch (error) {
          logger.warn('[IMPORT-SERVICE] Geocoding failed for address', {
            key: addr.key,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return { key: addr.key, geocode: null };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Store results
      for (const { key, geocode } of batchResults) {
        results.set(key, geocode);
      }

      // Report progress
      const processed = Math.min(i + BATCH_SIZE, addresses.length);
      onProgress?.(processed, addresses.length);

      // Rate limiting delay (skip on last batch)
      if (i + BATCH_SIZE < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    const successCount = Array.from(results.values()).filter(r => r !== null).length;
    logger.info('[IMPORT-SERVICE] Batch geocoding completed', {
      total: addresses.length,
      success: successCount,
      failed: addresses.length - successCount
    });

    return results;
  }

  /**
   * Create an address in the addresses table (with or without geocoding data)
   */
  private async createAddress(
    data: { street: string; postalCode: string; city: string; country: string },
    geocode: GeocodeResult | null,
    teamId: string
  ): Promise<string | null> {
    try {
      if (geocode) {
        // Create with geocoding data
        const result = await this.addressService.createFromGooglePlace({
          street: data.street,
          postalCode: data.postalCode,
          city: data.city,
          country: data.country,
          latitude: geocode.latitude,
          longitude: geocode.longitude,
          placeId: geocode.placeId,
          formattedAddress: geocode.formattedAddress
        }, teamId);

        return result.success ? result.data.id : null;
      } else {
        // Create without geocoding data (manual address)
        const result = await this.addressService.createManual({
          street: data.street,
          postalCode: data.postalCode,
          city: data.city,
          country: data.country
        }, teamId);

        return result.success ? result.data.id : null;
      }
    } catch (error) {
      logger.error('[IMPORT-SERVICE] Failed to create address', {
        error: error instanceof Error ? error.message : 'Unknown error',
        data
      });
      return null;
    }
  }

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
      companiesCount: parsedData.companies.length,
    });

    // Run validators
    const result = validateAllData({
      success: true,
      buildings: { name: SHEET_NAMES.BUILDINGS, headers: [], rows: parsedData.buildings as unknown as never[], rawRows: [] },
      lots: { name: SHEET_NAMES.LOTS, headers: [], rows: parsedData.lots as unknown as never[], rawRows: [] },
      contacts: { name: SHEET_NAMES.CONTACTS, headers: [], rows: parsedData.contacts as unknown as never[], rawRows: [] },
      contracts: { name: SHEET_NAMES.CONTRACTS, headers: [], rows: parsedData.contracts as unknown as never[], rawRows: [] },
      companies: { name: SHEET_NAMES.COMPANIES, headers: [], rows: parsedData.companies as unknown as never[], rawRows: [] },
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
  /**
   * Execute the import with optional progress callback for streaming
   * @param data - Parsed data to import
   * @param options - Import options
   * @param onProgress - Optional callback called after each phase completes
   */
  async executeImport(
    data: ParsedData,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const { teamId, userId, dryRun } = options;

    // Phase labels for progress reporting
    const PHASE_LABELS: Record<ImportPhase, string> = {
      geocoding: 'Géolocalisation des adresses',
      companies: 'Création des sociétés',
      contacts: 'Création des contacts',
      buildings: 'Création des immeubles',
      lots: 'Création des lots',
      contracts: 'Création des baux',
      completed: 'Import terminé',
    };

    // Helper to emit progress
    const emitProgress = (
      phase: ImportPhase,
      phaseIndex: number,
      phaseCount: number,
      phaseCreated: number,
      phaseUpdated: number,
      phaseErrors: number
    ) => {
      if (!onProgress) return;

      const totalPhases = 6; // Now includes geocoding phase
      const totalProgress = Math.round(((phaseIndex + 1) / totalPhases) * 100);

      const event: ImportProgressEvent = {
        phase,
        phaseIndex,
        totalPhases,
        phaseName: PHASE_LABELS[phase],
        phaseCount,
        phaseCreated,
        phaseUpdated,
        phaseErrors,
        totalProgress: phase === 'completed' ? 100 : totalProgress,
        isComplete: phase === 'completed',
      };

      onProgress(event);
    };

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
          data.contracts.length +
          data.companies.length,
        metadata: {
          import_mode: options.mode,
          error_mode: options.errorMode,
          sheet_counts: {
            buildings: data.buildings.length,
            lots: data.lots.length,
            contacts: data.contacts.length,
            contracts: data.contracts.length,
            companies: data.companies.length,
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
      companies: [],
    };
    const updated: ImportCreatedIds = {
      buildings: [],
      lots: [],
      contacts: [],
      contracts: [],
      companies: [],
    };

    try {
      // =======================================================================
      // Phase 0: GEOCODING - Batch geocode all addresses before import
      // =======================================================================
      logger.info('[IMPORT-SERVICE] Phase 0: Geocoding addresses...');

      // Collect all addresses to geocode
      const addressesToGeocode: AddressData[] = [];

      // Buildings: all have addresses
      for (const building of data.buildings) {
        if (building.address && building.address.trim()) {
          addressesToGeocode.push({
            key: `building:${building.name}`,
            street: building.address,
            postalCode: building.postal_code || '',
            city: building.city || '',
            country: building.country || 'belgique'
          });
        }
      }

      // Independent lots: only those without building_name but with street
      for (const lot of data.lots) {
        if (!lot.building_name && lot.street && lot.street.trim()) {
          addressesToGeocode.push({
            key: `lot:${lot.reference}`,
            street: lot.street,
            postalCode: lot.postal_code || '',
            city: lot.city || '',
            country: 'belgique'
          });
        }
      }

      // Companies: those with street address
      for (const company of data.companies) {
        if (company.street && company.street.trim()) {
          const street = company.street_number
            ? `${company.street} ${company.street_number}`.trim()
            : company.street;
          addressesToGeocode.push({
            key: `company:${company.name}`,
            street,
            postalCode: company.postal_code || '',
            city: company.city || '',
            country: company.country || 'belgique'
          });
        }
      }

      // Execute batch geocoding
      let geocodeResults: Map<string, GeocodeResult | null> = new Map();
      if (addressesToGeocode.length > 0) {
        geocodeResults = await this.geocodeAddressesBatch(
          addressesToGeocode,
          (processed, total) => {
            // Sub-progress for geocoding phase
            logger.debug('[IMPORT-SERVICE] Geocoding progress', { processed, total });
          }
        );
      }

      const geocodeSuccessCount = Array.from(geocodeResults.values()).filter(r => r !== null).length;
      emitProgress('geocoding', 0, addressesToGeocode.length, geocodeSuccessCount, 0, addressesToGeocode.length - geocodeSuccessCount);

      logger.info('[IMPORT-SERVICE] Geocoding complete', {
        total: addressesToGeocode.length,
        success: geocodeSuccessCount,
        failed: addressesToGeocode.length - geocodeSuccessCount
      });

      // =======================================================================
      // Phase 1: Import Companies (no dependencies)
      // =======================================================================
      logger.info('[IMPORT-SERVICE] Phase 1: Importing companies...', { count: data.companies.length });
      const companyResult = await this.importCompanies(data.companies, teamId, geocodeResults);
      logger.info('[IMPORT-SERVICE] Companies imported', {
        created: companyResult.created.length,
        updated: companyResult.updated.length,
        errors: companyResult.errors.length,
      });
      if (companyResult.errors.length > 0) {
        errors.push(...companyResult.errors);
      }
      created.companies = companyResult.created;
      updated.companies = companyResult.updated;
      emitProgress('companies', 1, data.companies.length, companyResult.created.length, companyResult.updated.length, companyResult.errors.length);

      // =======================================================================
      // Phase 2: Import Contacts (depends on companies for linking)
      // =======================================================================
      logger.info('[IMPORT-SERVICE] Phase 2: Importing contacts...', { count: data.contacts.length });
      const contactResult = await this.importContacts(data.contacts, teamId, companyResult.nameToId);
      logger.info('[IMPORT-SERVICE] Contacts imported', {
        created: contactResult.created.length,
        updated: contactResult.updated.length,
        errors: contactResult.errors.length,
        contactsWithInfo: contactResult.createdContactsInfo.length,
      });
      if (contactResult.errors.length > 0) {
        errors.push(...contactResult.errors);
      }
      created.contacts = contactResult.created;
      updated.contacts = contactResult.updated;
      const createdContactsInfo = contactResult.createdContactsInfo;
      emitProgress('contacts', 2, data.contacts.length, contactResult.created.length, contactResult.updated.length, contactResult.errors.length);

      // =======================================================================
      // Phase 3: Import Buildings (with geocoded addresses)
      // =======================================================================
      logger.info('[IMPORT-SERVICE] Phase 3: Importing buildings...', { count: data.buildings.length });
      const buildingResult = await this.importBuildings(data.buildings, teamId, userId, geocodeResults);
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
      emitProgress('buildings', 3, data.buildings.length, buildingResult.created.length, buildingResult.updated.length, buildingResult.errors.length);

      // =======================================================================
      // Phase 4: Import Lots (depends on buildings, with geocoded addresses for independent lots)
      // =======================================================================
      logger.info('[IMPORT-SERVICE] Phase 4: Importing lots...', { count: data.lots.length });
      const lotResult = await this.importLots(data.lots, teamId, userId, buildingResult.nameToId, geocodeResults);
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
      emitProgress('lots', 4, data.lots.length, lotResult.created.length, lotResult.updated.length, lotResult.errors.length);

      // =======================================================================
      // Phase 5: Import Contracts (depends on lots and contacts)
      // =======================================================================
      logger.info('[IMPORT-SERVICE] Phase 5: Importing contracts...', { count: data.contracts.length });
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
      emitProgress('contracts', 5, data.contracts.length, contractResult.created.length, contractResult.updated.length, contractResult.errors.length);

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
          (created.companies?.length || 0) +
          (updated.buildings?.length || 0) +
          (updated.lots?.length || 0) +
          (updated.contacts?.length || 0) +
          (updated.contracts?.length || 0) +
          (updated.companies?.length || 0),
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

      // Emit final completed event
      emitProgress('completed', 5, 0, 0, 0, errors.length);

      // Log complete import to activity_logs
      await this.logCompleteImport({
        teamId,
        userId,
        jobId,
        success: errors.length === 0,
        created,
        updated,
        errors,
        rawData: data,
        duration,
      });

      return {
        success: errors.length === 0,
        jobId,
        created,
        updated,
        errors,
        summary: this.createSummary(created, updated, errors, duration),
        createdContacts: createdContactsInfo,
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

      const failedDuration = Date.now() - startTime;
      const failedErrors: ImportRowError[] = [
        {
          row: 0,
          sheet: '',
          field: '',
          value: '',
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          code: 'UNKNOWN',
        },
      ];

      // Log failed import to activity_logs
      await this.logCompleteImport({
        teamId,
        userId,
        jobId,
        success: false,
        created: { buildings: [], lots: [], contacts: [], contracts: [], companies: [] },
        updated: { buildings: [], lots: [], contacts: [], contracts: [], companies: [] },
        errors: failedErrors,
        rawData: data,
        duration: failedDuration,
      });

      return {
        success: false,
        jobId,
        created: {},
        updated: {},
        errors: failedErrors,
        summary: this.createEmptySummary(failedDuration),
      };
    }
  }

  /**
   * Import contacts
   */
  private async importContacts(
    contacts: ParsedContact[],
    teamId: string,
    companyNameToId: Map<string, string>
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    emailToId: Map<string, string>;
    createdContactsInfo: CreatedContactInfo[];
  }> {
    const errors: ImportRowError[] = [];
    const emailToId = new Map<string, string>();
    const createdContactsInfo: CreatedContactInfo[] = [];

    // Resolve company references and convert to UserInsert format
    const usersToImport: (UserInsert & { _rowIndex: number; _companyId?: string })[] = contacts.map((c) => {
      let companyId: string | undefined;

      // Resolve company_name to company_id
      if (c.company_name) {
        const normalizedName = c.company_name.toLowerCase().trim();
        companyId = companyNameToId.get(normalizedName);

        if (!companyId) {
          errors.push({
            row: c._rowIndex + 2,
            sheet: SHEET_NAMES.CONTACTS,
            field: 'company_name',
            value: c.company_name,
            message: ERROR_MESSAGES.REFERENCE_NOT_FOUND('Société', c.company_name),
            code: 'REFERENCE_NOT_FOUND',
          });
        }
      }

      return {
        name: c.name,
        email: c.email || null,
        phone: c.phone,
        role: c.role as 'locataire' | 'prestataire' | 'proprietaire',
        address: c.address,
        speciality: c.speciality,
        notes: c.notes,
        company_id: companyId || null,
        _rowIndex: c._rowIndex,
        _companyId: companyId,
      };
    });

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
      return { created: [], updated: [], errors, emailToId, createdContactsInfo };
    }

    // Build email to ID map for contract linking AND collect created contact info
    for (const contact of contacts) {
      if (contact.email) {
        const userResult = await this.userRepo.findByEmailInTeam(contact.email, teamId);
        if (userResult.success && userResult.data) {
          emailToId.set(contact.email.toLowerCase(), userResult.data.id);

          // Store contact info for invitation step
          createdContactsInfo.push({
            id: userResult.data.id,
            name: contact.name,
            email: contact.email,
            role: contact.role,
          });
        }
      }
      // Contacts without email are not added to createdContactsInfo
      // since they cannot receive invitations anyway
    }

    return {
      created: result.created,
      updated: result.updated,
      errors,
      emailToId,
      createdContactsInfo,
    };
  }

  /**
   * Import companies
   */
  /**
   * Import companies (refactored for centralized addresses table)
   *
   * Flow:
   * 1. For each company with address data:
   *    a. Create address in addresses table (with geocoding data if available)
   *    b. Create/update company with address_id reference
   */
  private async importCompanies(
    companies: ParsedCompany[],
    teamId: string,
    geocodeResults?: Map<string, GeocodeResult | null>
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    nameToId: Map<string, string>;
  }> {
    const errors: ImportRowError[] = [];
    const nameToId = new Map<string, string>();
    const created: string[] = [];
    const updated: string[] = [];

    if (companies.length === 0) {
      return { created, updated, errors, nameToId };
    }

    for (const company of companies) {
      try {
        // Step 1: Create address if address data provided
        let addressId: string | null = null;
        const hasAddressData = company.street && company.street.trim();

        if (hasAddressData) {
          const geocodeKey = `company:${company.name}`;
          const geocode = geocodeResults?.get(geocodeKey) || null;

          // Combine street and street_number
          const street = company.street_number
            ? `${company.street} ${company.street_number}`.trim()
            : company.street!;

          addressId = await this.createAddress(
            {
              street,
              postalCode: company.postal_code || '',
              city: company.city || '',
              country: company.country || 'belgique'
            },
            geocode,
            teamId
          );
        }

        // Step 2: Check if company exists (for upsert logic)
        const existingResult = await this.companyRepo.findByNameAndTeam(company.name, teamId);

        // Step 3: Create or update company (without address fields - only address_id)
        const companyData: CompanyInsert = {
          name: company.name,
          legal_name: company.legal_name || null,
          vat_number: company.vat_number || null,
          email: company.email || null,
          phone: company.phone || null,
          website: company.website || null,
          team_id: teamId,
          is_active: true,
          address_id: addressId,
        };

        if (existingResult.success && existingResult.data) {
          // Update existing company
          const updateResult = await this.companyRepo.update(existingResult.data.id, companyData);
          if (updateResult.success) {
            const companyId = existingResult.data.id;
            updated.push(companyId);
            nameToId.set(company.name.toLowerCase().trim(), companyId);
          } else {
            errors.push({
              row: company._rowIndex + 2,
              sheet: SHEET_NAMES.COMPANIES,
              field: 'name',
              value: company.name,
              message: `Échec de mise à jour: ${updateResult.error?.message || 'Erreur inconnue'}`,
              code: 'UNKNOWN',
            });
          }
        } else {
          // Create new company
          const createResult = await this.companyRepo.create(companyData);
          if (createResult.success) {
            const companyId = createResult.data.id;
            created.push(companyId);
            nameToId.set(company.name.toLowerCase().trim(), companyId);
          } else {
            errors.push({
              row: company._rowIndex + 2,
              sheet: SHEET_NAMES.COMPANIES,
              field: 'name',
              value: company.name,
              message: `Échec de création: ${createResult.error?.message || 'Erreur inconnue'}`,
              code: 'UNKNOWN',
            });
          }
        }
      } catch (error) {
        errors.push({
          row: company._rowIndex + 2,
          sheet: SHEET_NAMES.COMPANIES,
          field: 'name',
          value: company.name,
          message: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          code: 'UNKNOWN',
        });
      }
    }

    logger.info('[IMPORT-SERVICE] Companies imported', {
      created: created.length,
      updated: updated.length,
      nameMapSize: nameToId.size,
    });

    return { created, updated, errors, nameToId };
  }

  /**
   * Normalize country name to ISO code for company table
   */
  private normalizeCountryCode(country?: string): string {
    if (!country) return 'BE';

    const mappings: Record<string, string> = {
      'belgique': 'BE',
      'belgium': 'BE',
      'be': 'BE',
      'france': 'FR',
      'fr': 'FR',
      'suisse': 'CH',
      'switzerland': 'CH',
      'ch': 'CH',
      'luxembourg': 'LU',
      'lu': 'LU',
      'allemagne': 'DE',
      'germany': 'DE',
      'de': 'DE',
      'pays-bas': 'NL',
      'netherlands': 'NL',
      'nl': 'NL',
    };

    const normalized = country.toLowerCase().trim();
    return mappings[normalized] || 'BE';
  }

  /**
   * Import buildings (refactored for centralized addresses table)
   *
   * Flow:
   * 1. Geocode all building addresses in batch
   * 2. For each building:
   *    a. Create address in addresses table (with geocoding data if available)
   *    b. Create/update building with address_id reference
   * 3. Assign gestionnaire as primary contact
   */
  private async importBuildings(
    buildings: ParsedBuilding[],
    teamId: string,
    userId: string,
    geocodeResults?: Map<string, GeocodeResult | null>
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    nameToId: Map<string, string>;
  }> {
    const errors: ImportRowError[] = [];
    const nameToId = new Map<string, string>();
    const created: string[] = [];
    const updated: string[] = [];

    if (buildings.length === 0) {
      return { created, updated, errors, nameToId };
    }

    const supabase = await createServerSupabaseClient();

    for (const building of buildings) {
      try {
        // Step 1: Create address in addresses table
        const geocodeKey = `building:${building.name}`;
        const geocode = geocodeResults?.get(geocodeKey) || null;

        let addressId: string | null = null;
        if (building.address && building.address.trim()) {
          addressId = await this.createAddress(
            {
              street: building.address,
              postalCode: building.postal_code || '',
              city: building.city || '',
              country: building.country || 'belgique'
            },
            geocode,
            teamId
          );
        }

        // Step 2: Check if building exists (for upsert logic)
        const existingResult = await this.buildingRepo.findByNameAndTeam(
          building.name,
          teamId
        );

        // Step 3: Create or update building (without address fields - only address_id)
        const buildingData: BuildingInsert = {
          name: building.name,
          description: building.description || null,
          team_id: teamId,
          address_id: addressId,
        };

        if (existingResult.success && existingResult.data) {
          // Update existing building
          const updateResult = await this.buildingRepo.update(existingResult.data.id, buildingData);
          if (updateResult.success) {
            const buildingId = existingResult.data.id;
            updated.push(buildingId);
            nameToId.set(building.name.toLowerCase().trim(), buildingId);

            // Assign gestionnaire as primary contact
            if (userId) {
              await this.assignBuildingGestionnaire(supabase, buildingId, userId);
            }
          } else {
            errors.push({
              row: building._rowIndex + 2,
              sheet: SHEET_NAMES.BUILDINGS,
              field: 'name',
              value: building.name,
              message: `Échec de mise à jour: ${updateResult.error?.message || 'Erreur inconnue'}`,
              code: 'UNKNOWN',
            });
          }
        } else {
          // Create new building
          const createResult = await this.buildingRepo.create(buildingData);
          if (createResult.success) {
            const buildingId = createResult.data.id;
            created.push(buildingId);
            nameToId.set(building.name.toLowerCase().trim(), buildingId);

            // Assign gestionnaire as primary contact
            if (userId) {
              await this.assignBuildingGestionnaire(supabase, buildingId, userId);
            }
          } else {
            errors.push({
              row: building._rowIndex + 2,
              sheet: SHEET_NAMES.BUILDINGS,
              field: 'name',
              value: building.name,
              message: `Échec de création: ${createResult.error?.message || 'Erreur inconnue'}`,
              code: 'UNKNOWN',
            });
          }
        }
      } catch (error) {
        errors.push({
          row: building._rowIndex + 2,
          sheet: SHEET_NAMES.BUILDINGS,
          field: 'name',
          value: building.name,
          message: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          code: 'UNKNOWN',
        });
      }
    }

    logger.info('[IMPORT-SERVICE] Buildings imported', {
      created: created.length,
      updated: updated.length,
      errors: errors.length
    });

    return { created, updated, errors, nameToId };
  }

  /**
   * Helper to assign gestionnaire as primary contact for a building
   */
  private async assignBuildingGestionnaire(
    supabase: ReturnType<typeof createServerSupabaseClient> extends Promise<infer T> ? T : never,
    buildingId: string,
    userId: string
  ): Promise<void> {
    const { error: contactError } = await supabase
      .from('building_contacts')
      .upsert({
        building_id: buildingId,
        user_id: userId,
        role: 'gestionnaire',
        is_primary: true,
      }, { onConflict: 'building_id,user_id' });

    if (contactError) {
      logger.warn('[IMPORT-SERVICE] Failed to assign gestionnaire to building', {
        buildingId,
        userId,
        error: contactError.message,
      });
    }
  }

  /**
   * Import lots (refactored for centralized addresses table)
   *
   * Flow:
   * 1. Resolve building references
   * 2. For independent lots (no building_id) with address data:
   *    a. Create address in addresses table (with geocoding data if available)
   *    b. Create lot with address_id
   * 3. For lots linked to buildings:
   *    a. Create lot with building_id (inherits building's address)
   * 4. Assign gestionnaire as primary contact for independent lots
   */
  private async importLots(
    lots: ParsedLot[],
    teamId: string,
    userId: string,
    buildingNameToId: Map<string, string>,
    geocodeResults?: Map<string, GeocodeResult | null>
  ): Promise<{
    created: string[];
    updated: string[];
    errors: ImportRowError[];
    referenceToId: Map<string, string>;
  }> {
    const errors: ImportRowError[] = [];
    const referenceToId = new Map<string, string>();
    const created: string[] = [];
    const updated: string[] = [];

    if (lots.length === 0) {
      return { created, updated, errors, referenceToId };
    }

    const supabase = await createServerSupabaseClient();

    for (const lot of lots) {
      try {
        // Step 1: Resolve building reference if provided
        let buildingId: string | null = null;
        if (lot.building_name) {
          const normalizedName = lot.building_name.toLowerCase().trim();
          buildingId = buildingNameToId.get(normalizedName) || null;

          if (!buildingId) {
            errors.push({
              row: lot._rowIndex + 2,
              sheet: SHEET_NAMES.LOTS,
              field: 'building_name',
              value: lot.building_name,
              message: ERROR_MESSAGES.REFERENCE_NOT_FOUND('Immeuble', lot.building_name),
              code: 'REFERENCE_NOT_FOUND',
            });
            continue; // Skip this lot
          }
        }

        // Step 2: For independent lots, create address if address data provided
        let addressId: string | null = null;
        const isIndependentLot = !buildingId;
        const hasAddressData = lot.street && lot.street.trim();

        if (isIndependentLot && hasAddressData) {
          const geocodeKey = `lot:${lot.reference}`;
          const geocode = geocodeResults?.get(geocodeKey) || null;

          addressId = await this.createAddress(
            {
              street: lot.street!,
              postalCode: lot.postal_code || '',
              city: lot.city || '',
              country: 'belgique' // Default for lots
            },
            geocode,
            teamId
          );
        }

        // Step 3: Check if lot exists (for upsert logic)
        const existingResult = await this.lotRepo.findByReferenceAndTeam(lot.reference, teamId);

        // Step 4: Create or update lot (without address fields - only address_id)
        const lotData: LotInsert = {
          reference: lot.reference,
          building_id: buildingId,
          category: (lot.category || 'autre') as 'appartement' | 'collocation' | 'maison' | 'garage' | 'local_commercial' | 'autre',
          floor: lot.floor || null,
          description: lot.description || null,
          team_id: teamId,
          address_id: addressId,
        };

        if (existingResult.success && existingResult.data) {
          // Update existing lot
          const updateResult = await this.lotRepo.update(existingResult.data.id, lotData);
          if (updateResult.success) {
            const lotId = existingResult.data.id;
            updated.push(lotId);
            referenceToId.set(lot.reference.toLowerCase().trim(), lotId);

            // Assign gestionnaire for independent lots
            if (userId && isIndependentLot) {
              await this.assignLotGestionnaire(supabase, lotId, userId);
            }
          } else {
            errors.push({
              row: lot._rowIndex + 2,
              sheet: SHEET_NAMES.LOTS,
              field: 'reference',
              value: lot.reference,
              message: `Échec de mise à jour: ${updateResult.error?.message || 'Erreur inconnue'}`,
              code: 'UNKNOWN',
            });
          }
        } else {
          // Create new lot - use skipInitialSelect to avoid RLS warning
          // The gestionnaire will be assigned after creation, which enables viewing the lot
          const createResult = await this.lotRepo.create(lotData, { skipInitialSelect: true });
          if (createResult.success) {
            const lotId = createResult.data.id;
            created.push(lotId);
            referenceToId.set(lot.reference.toLowerCase().trim(), lotId);

            // Assign gestionnaire for independent lots - must happen after creation
            if (userId && isIndependentLot) {
              await this.assignLotGestionnaire(supabase, lotId, userId);
            }
          } else {
            errors.push({
              row: lot._rowIndex + 2,
              sheet: SHEET_NAMES.LOTS,
              field: 'reference',
              value: lot.reference,
              message: `Échec de création: ${createResult.error?.message || 'Erreur inconnue'}`,
              code: 'UNKNOWN',
            });
          }
        }
      } catch (error) {
        errors.push({
          row: lot._rowIndex + 2,
          sheet: SHEET_NAMES.LOTS,
          field: 'reference',
          value: lot.reference,
          message: `Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
          code: 'UNKNOWN',
        });
      }
    }

    logger.info('[IMPORT-SERVICE] Lots imported', {
      created: created.length,
      updated: updated.length,
      errors: errors.length
    });

    return { created, updated, errors, referenceToId };
  }

  /**
   * Helper to assign gestionnaire as primary contact for an independent lot
   */
  private async assignLotGestionnaire(
    supabase: ReturnType<typeof createServerSupabaseClient> extends Promise<infer T> ? T : never,
    lotId: string,
    userId: string
  ): Promise<void> {
    const { error: contactError } = await supabase
      .from('lot_contacts')
      .upsert({
        lot_id: lotId,
        user_id: userId,
        role: 'gestionnaire',
        is_primary: true,
      }, { onConflict: 'lot_id,user_id' });

    if (contactError) {
      logger.warn('[IMPORT-SERVICE] Failed to assign gestionnaire to independent lot', {
        lotId,
        userId,
        error: contactError.message,
      });
    }
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
      companies: { created: 0, updated: 0, failed: 0 },
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
    const companyErrors = errors.filter((e) => e.sheet === SHEET_NAMES.COMPANIES).length;

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
      companies: {
        created: created.companies?.length || 0,
        updated: updated.companies?.length || 0,
        failed: companyErrors,
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
      summary.contracts.updated +
      summary.companies.created +
      summary.companies.updated;

    summary.totalProcessed = summary.totalSuccess + summary.totalFailed;

    return summary;
  }

  /**
   * Log complete import to activity_logs
   * Creates a single comprehensive log entry at the end of the import
   */
  private async logCompleteImport(params: {
    teamId: string;
    userId: string;
    jobId: string;
    success: boolean;
    created: ImportCreatedIds;
    updated: ImportCreatedIds;
    errors: ImportRowError[];
    rawData: ParsedData;
    duration: number;
  }): Promise<void> {
    const { teamId, userId, jobId, success, created, updated, errors, rawData, duration } = params;

    try {
      const supabase = await createServerSupabaseClient();

      // Calculate totals
      const totalCreated = 
        (created.companies?.length || 0) +
        (created.contacts?.length || 0) +
        (created.buildings?.length || 0) +
        (created.lots?.length || 0) +
        (created.contracts?.length || 0);

      const totalUpdated =
        (updated.companies?.length || 0) +
        (updated.contacts?.length || 0) +
        (updated.buildings?.length || 0) +
        (updated.lots?.length || 0) +
        (updated.contracts?.length || 0);

      const totalRows =
        rawData.companies.length +
        rawData.contacts.length +
        rawData.buildings.length +
        rawData.lots.length +
        rawData.contracts.length;

      // Build metadata with complete import details
      const metadata = {
        import_job_id: jobId,
        duration_ms: duration,
        summary: {
          total_rows: totalRows,
          total_created: totalCreated,
          total_updated: totalUpdated,
          total_failed: errors.length,
        },
        by_entity: {
          companies: {
            total: rawData.companies.length,
            created: created.companies?.length || 0,
            updated: updated.companies?.length || 0,
            failed: errors.filter(e => e.sheet === SHEET_NAMES.COMPANIES).length,
            created_ids: created.companies || [],
            updated_ids: updated.companies || [],
            data: rawData.companies.map(c => ({
              row: c._rowIndex + 2,
              name: c.name,
              vat_number: c.vat_number,
              city: c.city,
            })),
          },
          contacts: {
            total: rawData.contacts.length,
            created: created.contacts?.length || 0,
            updated: updated.contacts?.length || 0,
            failed: errors.filter(e => e.sheet === SHEET_NAMES.CONTACTS).length,
            created_ids: created.contacts || [],
            updated_ids: updated.contacts || [],
            data: rawData.contacts.map(c => ({
              row: c._rowIndex + 2,
              name: c.name,
              email: c.email,
              role: c.role,
              company_name: c.company_name,
            })),
          },
          buildings: {
            total: rawData.buildings.length,
            created: created.buildings?.length || 0,
            updated: updated.buildings?.length || 0,
            failed: errors.filter(e => e.sheet === SHEET_NAMES.BUILDINGS).length,
            created_ids: created.buildings || [],
            updated_ids: updated.buildings || [],
            data: rawData.buildings.map(b => ({
              row: b._rowIndex + 2,
              name: b.name,
              reference: b.reference,
              address: b.address,
              city: b.city,
            })),
          },
          lots: {
            total: rawData.lots.length,
            created: created.lots?.length || 0,
            updated: updated.lots?.length || 0,
            failed: errors.filter(e => e.sheet === SHEET_NAMES.LOTS).length,
            created_ids: created.lots || [],
            updated_ids: updated.lots || [],
            data: rawData.lots.map(l => ({
              row: l._rowIndex + 2,
              reference: l.reference,
              building_reference: l.building_reference,
              category: l.category,
              floor: l.floor,
            })),
          },
          contracts: {
            total: rawData.contracts.length,
            created: created.contracts?.length || 0,
            updated: updated.contracts?.length || 0,
            failed: errors.filter(e => e.sheet === SHEET_NAMES.CONTRACTS).length,
            created_ids: created.contracts || [],
            updated_ids: updated.contracts || [],
            data: rawData.contracts.map(c => ({
              row: c._rowIndex + 2,
              lot_reference: c.lot_reference,
              tenant_email: c.tenant_email,
              start_date: c.start_date,
              rent_amount: c.rent_amount,
            })),
          },
        },
        errors: errors.map(e => ({
          row: e.row,
          sheet: e.sheet,
          field: e.field,
          value: e.value,
          message: e.message,
          code: e.code,
        })),
      };

      // Insert activity log
      const { error: insertError } = await supabase
        .from('activity_logs')
        .insert({
          team_id: teamId,
          user_id: userId,
          action_type: 'import',
          entity_type: 'import',
          entity_id: jobId,
          entity_name: `Import Excel - ${new Date().toLocaleDateString('fr-FR')}`,
          description: `Import Excel: ${totalCreated} créés, ${totalUpdated} mis à jour, ${errors.length} erreurs`,
          status: success ? 'success' : 'failure',
          metadata,
        });

      if (insertError) {
        logger.error('[IMPORT-SERVICE] Failed to create activity log', {
          error: insertError.message,
          jobId,
        });
      } else {
        logger.info('[IMPORT-SERVICE] Activity log created', {
          jobId,
          totalCreated,
          totalUpdated,
          totalFailed: errors.length,
        });
      }
    } catch (error) {
      // Don't fail the import if logging fails
      logger.error('[IMPORT-SERVICE] Exception creating activity log', {
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      });
    }
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
  const companyRepo = await createServerActionCompanyRepository();

  // Create AddressService for geocoding support
  const supabase = await createServerSupabaseClient();
  const addressService = createAddressService(supabase);

  return new ImportService(
    buildingRepo,
    lotRepo,
    userRepo,
    importJobRepo,
    contractRepo,
    contractContactRepo,
    companyRepo,
    addressService
  );
};
