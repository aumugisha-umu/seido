/**
 * Import Job Repository
 * Handles CRUD operations for import_jobs table
 */

import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient,
} from '../core/supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { handleError, createErrorResponse } from '../core/error-handler';
import { logger } from '@/lib/logger';
import type {
  ImportJob,
  ImportJobStatus,
  ImportEntityType,
  ImportRowError,
  ImportCreatedIds,
  ImportJobMetadata,
} from '@/lib/import/types';

// ============================================================================
// Types
// ============================================================================

export interface ImportJobInsert {
  team_id: string;
  user_id: string;
  entity_type: ImportEntityType;
  filename: string;
  total_rows?: number;
  metadata?: ImportJobMetadata;
}

export interface ImportJobUpdate {
  status?: ImportJobStatus;
  total_rows?: number;
  processed_rows?: number;
  success_count?: number;
  error_count?: number;
  errors?: ImportRowError[];
  created_ids?: ImportCreatedIds;
  updated_ids?: ImportCreatedIds;
  metadata?: ImportJobMetadata;
  started_at?: string;
  completed_at?: string;
}

// ============================================================================
// Repository
// ============================================================================

export class ImportJobRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new import job
   */
  async create(data: ImportJobInsert) {
    logger.info('[IMPORT-JOB-REPO] Creating import job...', {
      team_id: data.team_id,
      user_id: data.user_id,
      entity_type: data.entity_type,
      filename: data.filename,
      total_rows: data.total_rows,
    });

    const insertData = {
      ...data,
      status: 'pending' as const,
      errors: [],
      created_ids: {},
      updated_ids: {},
    };

    logger.debug('[IMPORT-JOB-REPO] Insert payload', insertData);

    const { data: job, error } = await this.supabase
      .from('import_jobs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('[IMPORT-JOB-REPO] Create error', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return createErrorResponse(handleError(error, 'import_jobs:create'));
    }

    logger.info('[IMPORT-JOB-REPO] Import job created', { jobId: job?.id });
    return { success: true as const, data: job as ImportJob };
  }

  /**
   * Get import job by ID
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from('import_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true as const, data: null };
      }
      return createErrorResponse(handleError(error, 'import_jobs:findById'));
    }

    return { success: true as const, data: data as ImportJob };
  }

  /**
   * Get import jobs for a team
   */
  async findByTeam(teamId: string, options?: { limit?: number; offset?: number }) {
    let query = this.supabase
      .from('import_jobs')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return createErrorResponse(handleError(error, 'import_jobs:findByTeam'));
    }

    return { success: true as const, data: (data || []) as ImportJob[] };
  }

  /**
   * Get recent import jobs for a user
   */
  async findByUser(userId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('import_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return createErrorResponse(handleError(error, 'import_jobs:findByUser'));
    }

    return { success: true as const, data: (data || []) as ImportJob[] };
  }

  /**
   * Update import job
   */
  async update(id: string, data: ImportJobUpdate) {
    const { data: job, error } = await this.supabase
      .from('import_jobs')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return createErrorResponse(handleError(error, 'import_jobs:update'));
    }

    return { success: true as const, data: job as ImportJob };
  }

  /**
   * Update job status
   */
  async updateStatus(id: string, status: ImportJobStatus) {
    const updates: ImportJobUpdate = { status };

    if (status === 'importing') {
      updates.started_at = new Date().toISOString();
    } else if (['completed', 'failed', 'cancelled'].includes(status)) {
      updates.completed_at = new Date().toISOString();
    }

    return this.update(id, updates);
  }

  /**
   * Update job progress
   */
  async updateProgress(
    id: string,
    processed: number,
    success: number,
    errors: number
  ) {
    return this.update(id, {
      processed_rows: processed,
      success_count: success,
      error_count: errors,
    });
  }

  /**
   * Add errors to job
   */
  async addErrors(id: string, newErrors: ImportRowError[]) {
    // First get existing errors
    const { data: job, error: fetchError } = await this.supabase
      .from('import_jobs')
      .select('errors')
      .eq('id', id)
      .single();

    if (fetchError) {
      return createErrorResponse(handleError(fetchError, 'import_jobs:addErrors'));
    }

    const existingErrors = (job?.errors as ImportRowError[]) || [];
    const allErrors = [...existingErrors, ...newErrors];

    return this.update(id, {
      errors: allErrors,
      error_count: allErrors.length,
    });
  }

  /**
   * Set job results (created and updated IDs)
   */
  async setResults(
    id: string,
    createdIds: ImportCreatedIds,
    updatedIds: ImportCreatedIds
  ) {
    const successCount =
      (createdIds.buildings?.length || 0) +
      (createdIds.lots?.length || 0) +
      (createdIds.contacts?.length || 0) +
      (createdIds.contracts?.length || 0) +
      (updatedIds.buildings?.length || 0) +
      (updatedIds.lots?.length || 0) +
      (updatedIds.contacts?.length || 0) +
      (updatedIds.contracts?.length || 0);

    return this.update(id, {
      created_ids: createdIds,
      updated_ids: updatedIds,
      success_count: successCount,
    });
  }

  /**
   * Delete import job
   */
  async delete(id: string) {
    const { error } = await this.supabase
      .from('import_jobs')
      .delete()
      .eq('id', id);

    if (error) {
      return createErrorResponse(handleError(error, 'import_jobs:delete'));
    }

    return { success: true as const };
  }

  /**
   * Get pending jobs (for processing queue)
   */
  async findPending(limit = 10) {
    const { data, error } = await this.supabase
      .from('import_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return createErrorResponse(handleError(error, 'import_jobs:findPending'));
    }

    return { success: true as const, data: (data || []) as ImportJob[] };
  }

  /**
   * Cancel stale jobs (older than X hours)
   */
  async cancelStaleJobs(hoursOld = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hoursOld);

    const { data, error } = await this.supabase
      .from('import_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
      })
      .in('status', ['pending', 'validating', 'importing'])
      .lt('created_at', cutoff.toISOString())
      .select();

    if (error) {
      return createErrorResponse(handleError(error, 'import_jobs:cancelStaleJobs'));
    }

    return { success: true as const, data: (data || []) as ImportJob[] };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export const createImportJobRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient();
  return new ImportJobRepository(supabase);
};

export const createServerImportJobRepository = async () => {
  const supabase = await createServerSupabaseClient();
  return new ImportJobRepository(supabase);
};

export const createServerActionImportJobRepository = async () => {
  const supabase = await createServerActionSupabaseClient();
  return new ImportJobRepository(supabase);
};
