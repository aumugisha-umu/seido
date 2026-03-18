# PRD — Email Attachment Download & Preview

## Context

Email attachments are stored in Supabase Storage (`email-attachments` bucket) but:
1. The download button in `email-detail.tsx` is **non-functional** (URL hardcoded to `'#'`, no onClick)
2. No API endpoint generates signed URLs for secure downloads
3. Storage RLS policies are too broad (any authenticated user can access any team's attachments)
4. No preview functionality for images/PDFs
5. Attachment metadata mapping works (size_bytes→file_size, content_type→mime_type) but `url` is always `'#'`

## Scope

- Create a download API endpoint that generates signed URLs
- Wire the UI download button to actually download files
- Add inline preview for images and PDFs
- Tighten storage RLS to enforce team-level isolation
- Add file type icons in the attachment list

## Out of Scope

- Migrating to Gmail API lazy-loading (future)
- Changing the IMAP/webhook ingestion flow
- Modifying how files are uploaded to storage

## Files Involved

### Backend
- `app/api/emails/[id]/attachments/[attachmentId]/route.ts` — NEW: signed URL endpoint
- `supabase/migrations/XXXXXX_tighten_email_attachments_rls.sql` — NEW: team-level RLS

### Frontend
- `app/gestionnaire/(with-navbar)/mail/components/email-detail.tsx` — Wire download + preview
- `app/gestionnaire/(with-navbar)/mail/components/types.ts` — Add `storage_path` to EmailAttachment
- `app/gestionnaire/(with-navbar)/mail/mail-client.tsx` — Pass `storage_path` in adaptEmail

## User Stories

### US-001: Download API endpoint (signed URLs)
As a gestionnaire, I want to download email attachments securely, so that I can access files without exposing storage paths.

**AC:**
- GET `/api/emails/[id]/attachments/[attachmentId]` returns `{ signedUrl, filename, contentType }`
- Auth required (getApiAuthContext)
- Validates attachment belongs to an email in user's team
- Signed URL expires in 1 hour (3600s)
- Returns 404 if attachment not found
- Lint passes

### US-002: Wire download button in UI
As a gestionnaire viewing an email, I want the download button to actually download the file when I click it.

**AC:**
- Clicking download button fetches signed URL from API, then triggers browser download
- Loading state shown while fetching signed URL
- Error toast on failure
- Lint passes

### US-003: Inline preview for images and PDFs
As a gestionnaire, I want to preview images and PDFs inline, so that I don't have to download them to see the content.

**AC:**
- Images (jpeg, png, gif, webp) show inline preview thumbnail
- PDFs show a "Preview" button that opens in new tab
- Click on image opens full-size in new tab
- Non-previewable files show download button only
- Lint passes

### US-004: Tighten storage RLS (team isolation)
As a security measure, storage policies should enforce team-level access, so that users from team A cannot access team B's email attachments.

**AC:**
- RLS policy checks that storage path starts with user's team_id
- Existing policies replaced with team-scoped versions
- Service role can still upload (bypass RLS)
- Lint passes

### US-005: File type icons
As a gestionnaire, I want to see appropriate icons for different file types, so that I can quickly identify attachment types.

**AC:**
- PDF: FileText icon
- Images: Image icon
- Spreadsheets: Sheet icon
- Default: Paperclip icon
- Lint passes
