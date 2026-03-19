import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { logger } from '@/lib/logger';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authResult = await getApiAuthContext();

        if (!authResult.success) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { supabase } = authResult.data;

        // Retrieve deleteEmails parameter from body
        let deleteEmails = false;
        try {
            const body = await request.json();
            deleteEmails = body?.deleteEmails === true;
        } catch {
            // Empty body = no email deletion
        }

        // If deleteEmails, delete emails and related items BEFORE the connection
        if (deleteEmails) {
            // Fetch email IDs for this connection
            const { data: emailIds } = await supabase
                .from('emails')
                .select('id')
                .eq('email_connection_id', id);

            if (emailIds && emailIds.length > 0) {
                const ids = emailIds.map(e => e.id);

                // 1. Delete email_links and email_attachments in parallel (independent)
                await Promise.all([
                    supabase
                        .from('email_links')
                        .delete()
                        .in('email_id', ids),
                    supabase
                        .from('email_attachments')
                        .delete()
                        .in('email_id', ids),
                ]);

                // 2. Delete emails (depends on links/attachments being deleted first)
                await supabase
                    .from('emails')
                    .delete()
                    .eq('email_connection_id', id);

                logger.info({ connectionId: id, emailCount: ids.length }, 'Deleted emails and related data for connection');
            }
        }

        // Delete connection (RLS will ensure user can only delete their team's connections)
        const { error } = await supabase
            .from('team_email_connections')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: deleteEmails
                ? 'Connection and emails deleted'
                : 'Connection deleted',
            emailsDeleted: deleteEmails
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error: message }, '[EMAILS-API] Delete connection error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
