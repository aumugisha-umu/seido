-- Création du bucket pour les documents d'intervention
-- Note: Cette insertion peut échouer si le bucket existe déjà, c'est normal
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intervention-documents',
  'intervention-documents',
  false, -- Bucket privé (accès via URLs signées uniquement)
  10485760, -- 10MB limit par fichier
  ARRAY[
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Fonction helper pour extraire l'ID d'intervention du chemin de stockage
CREATE OR REPLACE FUNCTION get_intervention_id_from_storage_path(storage_path TEXT)
RETURNS UUID AS $$
BEGIN
  -- Extraire l'ID d'intervention du chemin : interventions/{intervention_id}/filename
  RETURN (string_to_array(storage_path, '/'))[2]::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Index pour améliorer les performances (seulement si pas déjà existants)
CREATE INDEX IF NOT EXISTS interventions_team_id_idx ON interventions(team_id);
CREATE INDEX IF NOT EXISTS team_members_user_team_idx ON team_members(user_id, team_id);

-- Commentaires pour la documentation
COMMENT ON FUNCTION get_intervention_id_from_storage_path(TEXT) IS 'Extrait l''ID d''intervention à partir du chemin de stockage';

/* 
IMPORTANT: Les politiques RLS pour storage.objects doivent être créées 
via l'interface Supabase Dashboard > Storage > intervention-documents > Configuration

Politiques à créer manuellement :

1. UPLOAD - "Users can upload to intervention documents"
   Operation: INSERT
   Policy: 
   bucket_id = 'intervention-documents' 
   AND auth.role() = 'authenticated'
   AND EXISTS (
     SELECT 1 FROM interventions i
     JOIN team_members tm ON i.team_id = tm.team_id
     WHERE tm.user_id = auth.uid()
     AND (storage.foldername(name))[1] = 'interventions'
     AND (storage.foldername(name))[2] = i.id::text
   )

2. SELECT - "Users can read intervention documents from their team"
   Operation: SELECT
   Policy:
   bucket_id = 'intervention-documents'
   AND auth.role() = 'authenticated'
   AND EXISTS (
     SELECT 1 FROM interventions i
     JOIN team_members tm ON i.team_id = tm.team_id
     WHERE tm.user_id = auth.uid()
     AND (storage.foldername(name))[1] = 'interventions'
     AND (storage.foldername(name))[2] = i.id::text
   )

3. DELETE - "Users can delete their own intervention documents"
   Operation: DELETE
   Policy:
   bucket_id = 'intervention-documents'
   AND auth.role() = 'authenticated'
   AND (
     owner = auth.uid()
     OR EXISTS (
       SELECT 1 FROM interventions i
       JOIN team_members tm ON i.team_id = tm.team_id
       WHERE tm.user_id = auth.uid()
       AND tm.role = 'admin'
       AND (storage.foldername(name))[1] = 'interventions'
       AND (storage.foldername(name))[2] = i.id::text
     )
   )
*/
