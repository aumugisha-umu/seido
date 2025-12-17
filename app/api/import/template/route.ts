/**
 * API Route: Download Import Template
 * GET /api/import/template?type=full|building|lot|contact|contract
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateTemplateBuffer } from '@/lib/import/template-generator';
import { getApiAuthContext } from '@/lib/api-auth-helper';

export async function GET(request: NextRequest) {
  // Auth check - require gestionnaire
  const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' });
  if (!authResult.success) {
    return authResult.error;
  }

  // Get template type from query
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'full';

  // Validate type
  const validTypes = ['full', 'building', 'lot', 'contact', 'contract'];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Type invalide. Types acceptés: ${validTypes.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // Generate template
    const buffer = generateTemplateBuffer(
      type as 'full' | 'building' | 'lot' | 'contact' | 'contract',
      true // Include examples
    );

    // Generate filename
    const filenames: Record<string, string> = {
      full: 'template_import_seido.xlsx',
      building: 'template_immeubles.xlsx',
      lot: 'template_lots.xlsx',
      contact: 'template_contacts.xlsx',
      contract: 'template_baux.xlsx',
    };

    const filename = filenames[type] || 'template.xlsx';

    // Return file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[API:import/template] Error generating template:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération du template' },
      { status: 500 }
    );
  }
}
