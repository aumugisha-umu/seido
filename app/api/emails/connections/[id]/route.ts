import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createSupabaseServerClient();

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete connection (RLS will ensure user can only delete their team's connections)
        const { error } = await supabase
            .from('team_email_connections')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete connection error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
