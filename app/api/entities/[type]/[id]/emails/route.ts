import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailLinkRepository } from '@/lib/services/repositories/email-link.repository';
import { EmailLinkEntityType } from '@/lib/types/email-links';

interface RouteParams {
    params: Promise<{ type: string; id: string }>;
}

const VALID_ENTITY_TYPES: EmailLinkEntityType[] = [
    'building', 'lot', 'contract', 'contact', 'company', 'intervention'
];

/**
 * GET /api/entities/[type]/[id]/emails
 * Récupère tous les emails liés à une entité
 *
 * Params:
 * - type: building | lot | contract | contact | company | intervention
 * - id: UUID de l'entité
 *
 * Query params:
 * - limit: nombre max de résultats (default: 20)
 * - offset: décalage pour pagination (default: 0)
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase } = authResult.data;
        const { type, id: entityId } = await params;

        // Validation du type d'entité
        if (!VALID_ENTITY_TYPES.includes(type as EmailLinkEntityType)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Type d'entité invalide. Types valides: ${VALID_ENTITY_TYPES.join(', ')}`
                },
                { status: 400 }
            );
        }

        const entityType = type as EmailLinkEntityType;

        // Parsing des query params
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const emailLinkRepo = new EmailLinkRepository(supabase);

        // Récupère les emails liés avec pagination
        const { data: emails, count } = await emailLinkRepo.getEmailsByEntity(
            entityType,
            entityId,
            { limit, offset }
        );

        return NextResponse.json({
            success: true,
            emails,
            pagination: {
                total: count,
                limit,
                offset,
                hasMore: offset + emails.length < count
            }
        });

    } catch (error: any) {
        console.error('Get entity emails error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/entities/[type]/[id]/emails
 * Supprime le lien entre un email et cette entité
 *
 * Query params:
 * - email_id: UUID de l'email à délier
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase } = authResult.data;
        const { type, id: entityId } = await params;

        // Validation du type d'entité
        if (!VALID_ENTITY_TYPES.includes(type as EmailLinkEntityType)) {
            return NextResponse.json(
                { success: false, error: 'Type d\'entité invalide' },
                { status: 400 }
            );
        }

        const entityType = type as EmailLinkEntityType;

        // Récupère l'email_id depuis les query params
        const { searchParams } = new URL(request.url);
        const emailId = searchParams.get('email_id');

        if (!emailId) {
            return NextResponse.json(
                { success: false, error: 'email_id requis' },
                { status: 400 }
            );
        }

        const emailLinkRepo = new EmailLinkRepository(supabase);

        // Supprime le lien
        await emailLinkRepo.deleteLinkByEntity(emailId, entityType, entityId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete entity email link error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
