-- Create the storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (it should be enabled by default, but good to ensure)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to upload files to the email-attachments bucket
-- They can only upload to their own team's folder (enforced by file path convention: team_id/filename)
-- But for now, we just check they are authenticated and targeting the right bucket
CREATE POLICY "Authenticated users can upload email attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-attachments');

-- Policy to allow authenticated users to read files from the email-attachments bucket
CREATE POLICY "Authenticated users can read email attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'email-attachments');

-- Policy to allow authenticated users to delete files (optional, but good for cleanup)
CREATE POLICY "Authenticated users can delete email attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'email-attachments');
