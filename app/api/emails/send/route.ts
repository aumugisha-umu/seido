import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { SmtpService } from '@/lib/services/domain/smtp.service';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';

export async function POST(request: Request) {
    try {
        const supabase = await createSupabaseServerClient();

        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { emailConnectionId, to, subject, body, inReplyToEmailId } = await request.json();

        if (!emailConnectionId || !to || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const connectionRepo = new EmailConnectionRepository(supabase);
        const emailRepo = new EmailRepository(supabase);

        // 1. Get connection (and verify ownership via RLS)
        const { data: connectionData, error: connError } = await supabase
            .from('team_email_connections')
            .select('*')
            .eq('id', emailConnectionId)
            .single();

        if (connError || !connectionData) {
            return NextResponse.json({ error: 'Connection not found or access denied' }, { status: 404 });
        }

        const connection = connectionData;

        // 2. Get original email if replying
        let originalEmail = null;
        if (inReplyToEmailId) {
            const { data } = await supabase
                .from('emails')
                .select('message_id, references')
                .eq('id', inReplyToEmailId)
                .single();
            originalEmail = data;
        }

        // 3. Send email
        const { messageId } = await SmtpService.sendEmail(connection, {
            to,
            subject,
            text: body,
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`, // Simple text-to-html
            inReplyTo: originalEmail?.message_id || undefined,
            references: originalEmail?.references || originalEmail?.message_id || undefined
        });

        // 4. Save sent email
        const sentEmail = await emailRepo.createEmail({
            team_id: connection.team_id,
            email_connection_id: connection.id,
            direction: 'sent',
            message_id: messageId,
            from_address: connection.email_address,
            to_addresses: Array.isArray(to) ? to : [to],
            subject,
            body_text: body,
            body_html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
            sent_at: new Date().toISOString(),
            in_reply_to: inReplyToEmailId,
            references: originalEmail?.references || originalEmail?.message_id
        });

        return NextResponse.json({ success: true, emailId: sentEmail.id });
    } catch (error: any) {
        console.error('Send error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
