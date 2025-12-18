/**
 * API Route: Validate Import Data (Dry Run)
 * POST /api/import/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { createServerActionImportService } from '@/lib/services/domain/import.service';
import type { ParsedData } from '@/lib/import/types';
import { logger } from '@/lib/logger';

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

  try {
    const body = await request.json();
    const { data } = body as { data: ParsedData };

    if (!data) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    logger.info('[API:import/validate] Starting validation', {
      teamId,
      buildingsCount: data.buildings?.length || 0,
      lotsCount: data.lots?.length || 0,
      contactsCount: data.contacts?.length || 0,
      contractsCount: data.contracts?.length || 0,
    });

    // Create service and validate
    const importService = await createServerActionImportService();
    const result = await importService.validate(data, teamId);

    logger.info('[API:import/validate] Validation completed', {
      teamId,
      isValid: result.isValid,
      errorCount: result.errors.length,
    });

    return NextResponse.json({
      success: true,
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      data: result.data,
    });
  } catch (error) {
    logger.error('[API:import/validate] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la validation',
      },
      { status: 500 }
    );
  }
}
