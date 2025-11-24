import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { EmailRepository } from '@/lib/services/repositories/email.repository';

export async function GET(request: Request) {
    try {
        const authResult = await getApiAuthContext();
        if (!authResult.success) return authResult.error;

        const { supabase, userProfile } = authResult.data;

        if (!userProfile?.team_id) {
            return NextResponse.json({ error: 'User has no team' }, { status: 403 });
        }

        const teamId = userProfile.team_id;
        const emailRepo = new EmailRepository(supabase);

        const { searchParams } = new URL(request.url);
        const folder = searchParams.get('folder') || 'inbox';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const search = searchParams.get('search') || undefined;

        const result = await emailRepo.getEmailsByFolder(teamId, folder, {
            limit,
            offset,
            search
        });

        return NextResponse.json({
            emails: result.data,
            total: result.count
        });
    } catch (error: any) {
        console.error('List emails error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
