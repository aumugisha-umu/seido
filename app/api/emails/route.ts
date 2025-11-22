import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { EmailRepository } from '@/lib/services/repositories/email.repository';

export async function GET(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get query params
        const { searchParams } = new URL(request.url);
        const folder = searchParams.get('folder') || 'inbox';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const search = searchParams.get('search');

        // Get user's team (assuming first team for now, or use context if available)
        // In a real app, we should get the current team from the session or request
        // For now, let's fetch the first team the user is a member of
        const { data: userTeams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', session.user.id)
            .limit(1);

        if (!userTeams || userTeams.length === 0) {
            return NextResponse.json({ error: 'User has no team' }, { status: 403 });
        }

        const teamId = userTeams[0].team_id;
        const emailRepo = new EmailRepository(supabase);

        let emails;

        if (search) {
            emails = await emailRepo.searchEmails(teamId, search);
        } else {
            // Map folder to status/direction
            let status: 'unread' | 'read' | 'archived' | undefined;
            let direction: 'received' | 'sent' | undefined;

            if (folder === 'inbox') {
                direction = 'received';
                // Inbox usually shows unread and read, but not archived/deleted
                // The repository method filters by exact status if provided.
                // If we want "not archived", we might need to adjust Repository or pass undefined and filter in memory (not ideal)
                // Or update Repository to accept array of statuses.
                // For now, let's assume 'inbox' means everything received that is NOT archived/deleted.
                // But getEmailsByTeam takes a single status.
                // Let's modify getEmailsByTeam in Repository to be more flexible?
                // Or just fetch all and filter?
                // Let's assume for now we just fetch 'received' and filter out archived/deleted in the repo query if status is not provided.
                // Actually, let's look at EmailRepository.getEmailsByTeam implementation.
                // It filters by status ONLY if provided.
                // So if I don't provide status, it returns all.
                // But I want to exclude archived/deleted for inbox.
                // I'll update the API route to handle this logic or just fetch all received and filter here.
                // Better: Update Repository to support 'exclude_status'.
                // But I can't easily update Repository now without rewriting it.
                // I'll just fetch all received and filter in memory for now (MVP).
                direction = 'received';
            } else if (folder === 'sent') {
                direction = 'sent';
            } else if (folder === 'archive') {
                status = 'archived';
            } else if (folder === 'drafts') {
                // We don't have drafts in DB yet (only sent/received)
                // Drafts are usually local or in a separate table.
                // For now return empty.
                return NextResponse.json({ emails: [] });
            }

            emails = await emailRepo.getEmailsByTeam(teamId, {
                limit,
                offset,
                status,
                direction
            });

            // Filter for Inbox (exclude archived/deleted)
            if (folder === 'inbox') {
                emails = emails.filter(e => e.status !== 'archived' && e.status !== 'deleted');
            }
        }

        return NextResponse.json({ emails });
    } catch (error: any) {
        console.error('List emails error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
