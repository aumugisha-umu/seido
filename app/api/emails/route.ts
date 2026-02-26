import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { getServiceRoleClient } from '@/lib/api-service-role-helper';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { logger } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        // Récupérer le team_id depuis team_members (source de vérité)
        // Cela garantit la cohérence avec les politiques RLS
        const { data: membership, error: membershipError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', userProfile?.id)
            .in('role', ['gestionnaire', 'admin'])
            .is('left_at', null)
            .single();

        if (membershipError || !membership?.team_id) {
            console.warn('📧 [EMAILS-API] No team membership found:', {
                userId: userProfile?.id,
                userTeamId: userProfile?.team_id,
                membershipError: membershipError?.message
            });
            return NextResponse.json({ error: 'User is not a team manager' }, { status: 403 });
        }

        const teamId = membership.team_id;

        // Debug: Compare les deux sources de team_id
        if (userProfile?.team_id !== teamId) {
            console.warn('📧 [EMAILS-API] Team ID mismatch!', {
                usersTableTeamId: userProfile?.team_id,
                teamMembersTeamId: teamId
            });
        }

        // USE SERVICE ROLE CLIENT to bypass slow RLS policies
        // Security: User already validated as team manager above (lines 14-29)
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

        logger.info({ teamId, folder, limit, offset, search, source }, '[EMAILS-API] Fetching emails');

        const result = await emailRepo.getEmailsByFolder(teamId, folder, {
            limit,
            offset,
            search,
            source
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
    } catch (error: any) {
        console.error('📧 [EMAILS-API] List emails error:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
        });
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
