import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailLinkRepository } from '@/lib/services/repositories/email-link.repository';
import { EmailLinkEntityType } from '@/lib/types/email-links';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/emails/[id]/links
 * Récupère tous les liens d'un email avec les détails des entités
 */
export async function GET(request: Request, { params }: RouteParams) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase } = authResult.data;
        const { id: emailId } = await params;

        const emailLinkRepo = new EmailLinkRepository(supabase);

        // Récupère les liens avec détails enrichis
        const links = await emailLinkRepo.getLinksByEmailWithDetails(emailId);

        return NextResponse.json({
            success: true,
            links
        });

    } catch (error: any) {
        console.error('Get email links error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/emails/[id]/links
 * Crée un nouveau lien entre un email et une entité
 *
 * Body: { entity_type: EmailLinkEntityType, entity_id: string, notes?: string }
 */
export async function POST(request: Request, { params }: RouteParams) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;
        const { id: emailId } = await params;

        const body = await request.json();
        const { entity_type, entity_id, notes } = body as {
            entity_type: EmailLinkEntityType;
            entity_id: string;
            notes?: string;
        };

        // Validation basique
        if (!entity_type || !entity_id) {
            return NextResponse.json(
                { success: false, error: 'entity_type et entity_id sont requis' },
                { status: 400 }
            );
        }

        const validTypes: EmailLinkEntityType[] = [
            'building', 'lot', 'contract', 'contact', 'company', 'intervention'
        ];
        if (!validTypes.includes(entity_type)) {
            return NextResponse.json(
                { success: false, error: 'entity_type invalide' },
                { status: 400 }
            );
        }

        const emailLinkRepo = new EmailLinkRepository(supabase);

        // Vérifie si le lien existe déjà
        const exists = await emailLinkRepo.linkExists(emailId, entity_type, entity_id);
        if (exists) {
            return NextResponse.json(
                { success: false, error: 'Ce lien existe déjà' },
                { status: 409 }
            );
        }

        // Crée le lien
        const link = await emailLinkRepo.createLink({
            email_id: emailId,
            entity_type,
            entity_id,
            linked_by: userProfile?.id,
            notes
        });

        return NextResponse.json({
            success: true,
            link
        }, { status: 201 });

    } catch (error: any) {
        console.error('Create email link error:', error);

        // Gestion spéciale pour contrainte d'unicité
        if (error.code === '23505') {
            return NextResponse.json(
                { success: false, error: 'Ce lien existe déjà' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/emails/[id]/links
 * Supprime un lien (via query params linkId ou entity_type+entity_id)
 *
 * Query params:
 * - linkId: UUID du lien à supprimer
 * OR
 * - entity_type: type d'entité
 * - entity_id: UUID de l'entité
 */
export async function DELETE(request: Request, { params }: RouteParams) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase } = authResult.data;
        const { id: emailId } = await params;

        const { searchParams } = new URL(request.url);
        const linkId = searchParams.get('linkId');
        const entityType = searchParams.get('entity_type') as EmailLinkEntityType;
        const entityId = searchParams.get('entity_id');

        const emailLinkRepo = new EmailLinkRepository(supabase);

        if (linkId) {
            // Suppression par linkId
            await emailLinkRepo.deleteLink(linkId);
        } else if (entityType && entityId) {
            // Suppression par email + entité
            await emailLinkRepo.deleteLinkByEntity(emailId, entityType, entityId);
        } else {
            return NextResponse.json(
                { success: false, error: 'linkId ou (entity_type et entity_id) requis' },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete email link error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
