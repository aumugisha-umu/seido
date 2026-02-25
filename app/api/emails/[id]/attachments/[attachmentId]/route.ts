import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

/**
 * GET /api/emails/[id]/attachments/[attachmentId]
 * Returns a signed URL for downloading the email attachment.
 * Validates that the attachment belongs to an email in the user's team.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const authResult = await getApiAuthContext()
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userProfile } = authResult.data
    const teamId = userProfile?.team_id
    if (!teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 403 })
    }

    const { id: emailId, attachmentId } = await params

    // Use service role to bypass RLS for cross-table validation
    const supabaseAdmin = createServiceRoleSupabaseClient()

    // Validate: attachment exists AND belongs to an email in user's team
    const { data: attachment, error } = await supabaseAdmin
      .from('email_attachments')
      .select('id, filename, content_type, size_bytes, storage_path, email_id')
      .eq('id', attachmentId)
      .eq('email_id', emailId)
      .limit(1)
      .single()

    if (error || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Verify the email belongs to the user's team
    const { data: email, error: emailError } = await supabaseAdmin
      .from('emails')
      .select('id')
      .eq('id', emailId)
      .eq('team_id', teamId)
      .limit(1)
      .single()

    if (emailError || !email) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('email-attachments')
      .createSignedUrl(attachment.storage_path, 3600)

    if (signedUrlError || !signedUrlData) {
      console.error('Error generating signed URL:', signedUrlError)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: signedUrlData.signedUrl,
      filename: attachment.filename,
      contentType: attachment.content_type || 'application/octet-stream',
      sizeBytes: attachment.size_bytes
    })
  } catch (error: unknown) {
    console.error('Attachment download error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
