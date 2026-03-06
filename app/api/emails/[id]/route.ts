import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { z } from 'zod';

// Allowed fields for email PATCH updates
const emailPatchSchema = z.object({
    status: z.enum(['unread', 'read', 'archived']).optional(),
    building_id: z.string().uuid().nullable().optional(),
    lot_id: z.string().uuid().nullable().optional(),
    deleted: z.literal(true).optional(),
    restored: z.literal(true).optional(),
}).strict();

/**
 * GET /api/emails/[id]
 * Récupère un email complet par son ID avec ses pièces jointes
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { supabase } = authResult.data;
        const { id: emailId } = await params;
        const emailRepo = new EmailRepository(supabase);

        // Récupérer l'email (RLS vérifie l'accès)
        const result = await emailRepo.findById(emailId);

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error?.message || 'Email not found' },
                { status: 404 }
            );
        }

        // Récupérer les pièces jointes
        const attachments = await emailRepo.getAttachments(emailId);

        return NextResponse.json({
            success: true,
            email: { ...result.data, attachments }
        });

    } catch (error: any) {
        console.error('Get email error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { supabase } = authResult.data;
        const { id: emailId } = await params;
        const rawBody = await request.json();

        // Validate input — reject unknown fields
        const parseResult = emailPatchSchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json(
                { error: 'Invalid fields', details: parseResult.error.flatten().fieldErrors },
                { status: 400 }
            );
        }
        const updates = parseResult.data;

        const emailRepo = new EmailRepository(supabase);

        // Handle specific actions if passed, or just raw updates
        if (updates.deleted === true) {
            await emailRepo.softDeleteEmail(emailId);
            return NextResponse.json({ success: true });
        }

        if (updates.restored === true) {
            await emailRepo.restoreEmail(emailId);
            return NextResponse.json({ success: true });
        }

        // Standard update
        const updatedEmail = await emailRepo.updateEmail(emailId, updates);

        return NextResponse.json({ success: true, email: updatedEmail });

    } catch (error: any) {
        console.error('Update email error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
