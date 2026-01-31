import { NextResponse } from 'next/server';
import { getApiAuthContext } from '@/lib/api-auth-helper';
import { SMTPService } from '@/lib/services/domain/smtp.service';

export async function POST(request: Request) {
    try {
        const authContext = await getApiAuthContext();
        if (!authContext) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { supabase } = authContext;

        const { emailConnectionId, to, subject, body, inReplyToEmailId } = await request.json();

        if (!emailConnectionId || !to || !subject || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const smtpService = new SMTPService(supabase);

        const result = await smtpService.sendEmail({
            connectionId: emailConnectionId,
            to,
            subject,
            text: body,
            html: `<p>${body.replace(/\n/g, '<br>')}</p>`, // Simple text-to-html fallback
            inReplyToEmailId
        });

        if (!result.success) {
            throw new Error(result.error);
        }

        return NextResponse.json({ success: true, emailId: result.emailId });
    } catch (error: any) {
        console.error('Send error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
