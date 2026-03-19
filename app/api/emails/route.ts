import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { getServiceRoleClient } from '@/lib/api-service-role-helper';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { logger } from '@/lib/logger';
import { getTeamManagerContext } from '@/lib/services/helpers/api-team-context';
import { EmailVisibilityService } from '@/lib/services/domain/email-visibility.service';

export async function GET(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        // Retrieve team_id from team_members (source of truth)
        const teamId = await getTeamManagerContext(supabase, userProfile?.id);

        if (!teamId) {
            logger.warn({ userId: userProfile?.id, userTeamId: userProfile?.team_id }, '[EMAILS-API] No team membership found');
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 });
        }

        // Debug: Compare the two sources of team_id
        if (userProfile?.team_id !== teamId) {
            logger.warn({ usersTableTeamId: userProfile?.team_id, teamMembersTeamId: teamId }, '[EMAILS-API] Team ID mismatch!');
        }

        // USE SERVICE ROLE CLIENT to bypass slow RLS policies
        // Security: User already validated as team manager above
        // The emails table has 6 RLS policies that cause 25+ second timeouts
        // when evaluated per-row, especially Policy #6 with 4-level JOINs
        const supabaseAdmin = getServiceRoleClient();
        const emailRepo = new EmailRepository(supabaseAdmin);

        const { searchParams } = new URL(request.url);
        const folder = searchParams.get('folder') || 'inbox';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const search = searchParams.get('search') || undefined;
        const source = searchParams.get('source') || undefined; // 'all' or connection UUID

        // Get accessible connection IDs for visibility filtering
        const connectionIds = await EmailVisibilityService.getAccessibleConnectionIds(
            supabaseAdmin, teamId, userProfile!.id
        );

        logger.info({ teamId, folder, limit, offset, search, source, accessibleConnections: connectionIds.length }, '[EMAILS-API] Fetching emails');

        const result = await emailRepo.getEmailsByFolder(teamId, folder, {
            limit,
            offset,
            search,
            source,
            connectionIds,
        });

        // For inbox/processed: also fetch sent replies to complete conversation threads
        let allEmails = result.data;
        if ((folder === 'inbox' || folder === 'processed') && !search) {
            const sentReplies = await emailRepo.getSentRepliesForThreads(teamId, { source });
            // Merge sent replies, dedup by ID (sent reply might already be in result for some edge cases)
            const existingIds = new Set(allEmails.map(e => e.id));
            const newSentReplies = sentReplies.filter(e => !existingIds.has(e.id));
            allEmails = [...allEmails, ...newSentReplies];
        }

        logger.info({ emailCount: allEmails.length, total: result.count, folder }, '[EMAILS-API] Result');

        return NextResponse.json({
            emails: allEmails,
            total: result.count
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const details = error instanceof Error ? {
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        } : {};
        logger.error({ error: message, ...details }, '[EMAILS-API] List emails error');
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
