import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authContext = await getApiAuthContext();

        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { supabase } = authContext;

        // Récupérer le paramètre deleteEmails du body
        let deleteEmails = false;
        try {
            const body = await request.json();
            deleteEmails = body?.deleteEmails === true;
        } catch {
            // Body vide = pas de suppression des emails
        }

        // Si deleteEmails, supprimer emails et éléments liés AVANT la connexion
        if (deleteEmails) {
            // Récupérer les IDs des emails de cette connexion
            const { data: emailIds } = await supabase
                .from('emails')
                .select('id')
                .eq('email_connection_id', id);

            if (emailIds && emailIds.length > 0) {
                const ids = emailIds.map(e => e.id);

                // 1. Supprimer les liens email_links
                await supabase
                    .from('email_links')
                    .delete()
                    .in('email_id', ids);

                // 2. Supprimer les pièces jointes
                await supabase
                    .from('email_attachments')
                    .delete()
                    .in('email_id', ids);

                // 3. Supprimer les emails
                await supabase
                    .from('emails')
                    .delete()
                    .eq('email_connection_id', id);

                console.log(`Deleted ${ids.length} emails and related data for connection ${id}`);
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
    } catch (error: any) {
        console.error('Delete connection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
