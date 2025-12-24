/**
 * API Route: Execute Import
 * POST /api/import/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { createServerActionImportService } from '@/lib/services/domain/import.service';
import type { ParsedData, ImportMode, ErrorMode } from '@/lib/import/types';
import { logger } from '@/lib/logger';

interface ExecuteRequestBody {
  data: ParsedData;
  options?: {
    mode?: ImportMode;
    errorMode?: ErrorMode;
    dryRun?: boolean;
  };
}

export async function POST(request: NextRequest) {
  // Auth check - require gestionnaire
  const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' });
  if (!authResult.success) {
    return authResult.error;
  }

  const { userProfile } = authResult.data;
  
  // Ensure we have the required profile data
  if (!userProfile || !userProfile.team_id) {
    return NextResponse.json(
      { error: 'Profil utilisateur ou équipe non trouvé' },
      { status: 400 }
    );
  }

  const teamId = userProfile.team_id;
  const userId = userProfile.id;

  try {
    const body = (await request.json()) as ExecuteRequestBody;
    const { data, options = {} } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    logger.info('[API:import/execute] Starting import', {
      teamId,
      userId,
      mode: options.mode || 'upsert',
      errorMode: options.errorMode || 'all_or_nothing',
      dryRun: options.dryRun || false,
      buildingsCount: data.buildings?.length || 0,
      lotsCount: data.lots?.length || 0,
      contactsCount: data.contacts?.length || 0,
      contractsCount: data.contracts?.length || 0,
    });

    // Create service and execute import
    const importService = await createServerActionImportService();
    const result = await importService.executeImport(data, {
      teamId,
      userId,
      mode: options.mode || 'upsert',
      errorMode: options.errorMode || 'all_or_nothing',
      dryRun: options.dryRun || false,
    });

    logger.info('[API:import/execute] Import completed', {
      teamId,
      jobId: result.jobId,
      success: result.success,
      created: result.created,
      updated: result.updated,
      errorCount: result.errors.length,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          jobId: result.jobId,
          errors: result.errors,
          summary: result.summary,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      created: result.created,
      updated: result.updated,
      errors: result.errors,
      summary: result.summary,
      createdContacts: result.createdContacts || [],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('[API:import/execute] Error:', {
      message: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name,
      teamId,
      userId,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}
