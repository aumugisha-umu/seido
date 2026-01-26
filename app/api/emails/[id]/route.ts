import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { EmailRepository } from '@/lib/services/repositories/email.repository';

/**
 * GET /api/emails/[id]
 * Récupère un email complet par son ID avec ses pièces jointes
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSupabaseServerClient();

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
        const supabase = await createSupabaseServerClient();

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id: emailId } = await params;
        const updates = await request.json();

        const emailRepo = new EmailRepository(supabase);

        // Verify email belongs to user's team (implicitly handled by RLS, but good to check existence)
        // RLS will prevent update if not allowed.

        // Handle specific actions if passed, or just raw updates
        // If 'deleted' is true, we might want to set deleted_at
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
