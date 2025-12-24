/**
 * API Route: Execute Import with Streaming Progress
 * POST /api/import/execute-stream
 *
 * Uses Server-Sent Events (SSE) to stream progress updates in real-time.
 * The client receives progress events after each import phase completes.
 */

import { NextRequest } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { createServerActionImportService } from '@/lib/services/domain/import.service';
import type { ParsedData, ImportMode, ErrorMode, ImportProgressEvent, ImportResult } from '@/lib/import/types';
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
    return new Response(
      JSON.stringify({ error: 'Profil utilisateur ou équipe non trouvé' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const teamId = userProfile.team_id;
  const userId = userProfile.id;

  let body: ExecuteRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data, options = {} } = body;

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Données manquantes' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  logger.info('[API:import/execute-stream] Starting streaming import', {
    teamId,
    userId,
    mode: options.mode || 'upsert',
    buildingsCount: data.buildings?.length || 0,
    lotsCount: data.lots?.length || 0,
    contactsCount: data.contacts?.length || 0,
    contractsCount: data.contracts?.length || 0,
  });

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to send SSE event
  const sendEvent = async (eventType: string, data: unknown) => {
    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Run the import in the background
  (async () => {
    let finalResult: ImportResult | null = null;

    try {
      const importService = await createServerActionImportService();

      // Progress callback - sends SSE events
      const onProgress = async (event: ImportProgressEvent) => {
        await sendEvent('progress', event);
      };

      // Execute import with progress callback
      finalResult = await importService.executeImport(
        data,
        {
          teamId,
          userId,
          mode: options.mode || 'upsert',
          errorMode: options.errorMode || 'all_or_nothing',
          dryRun: options.dryRun || false,
        },
        onProgress
      );

      logger.info('[API:import/execute-stream] Import completed', {
        teamId,
        jobId: finalResult.jobId,
        success: finalResult.success,
      });

      // Send final result
      await sendEvent('result', finalResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      logger.error('[API:import/execute-stream] Error:', { message: errorMessage, teamId, userId });

      await sendEvent('error', { error: errorMessage });
    } finally {
      // Close the stream
      await writer.close();
    }
  })();

  // Return the readable side of the stream as SSE response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
