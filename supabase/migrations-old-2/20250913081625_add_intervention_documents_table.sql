-- Création de la table pour stocker les documents/fichiers liés aux interventions
CREATE TABLE intervention_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    
    -- Métadonnées du fichier
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    
    -- Stockage Supabase Storage
    storage_path TEXT NOT NULL, -- Chemin dans Supabase Storage
    storage_bucket TEXT DEFAULT 'intervention-documents',
    
    -- Métadonnées d'upload
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    
    -- Statut et validation
    is_validated BOOLEAN DEFAULT false,
    validated_by UUID REFERENCES auth.users(id),
    validated_at TIMESTAMPTZ,
    
    -- Catégorisation des documents
    document_type TEXT CHECK (document_type IN (
        'rapport', 
        'photo_avant', 
        'photo_apres', 
        'facture', 
        'devis', 
        'plan', 
        'certificat', 
        'garantie',
        'autre'
    )) DEFAULT 'autre',
    
    -- Description optionnelle
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX intervention_documents_intervention_id_idx ON intervention_documents(intervention_id);
CREATE INDEX intervention_documents_uploaded_by_idx ON intervention_documents(uploaded_by);
CREATE INDEX intervention_documents_document_type_idx ON intervention_documents(document_type);
CREATE INDEX intervention_documents_uploaded_at_idx ON intervention_documents(uploaded_at);

-- RLS (Row Level Security)
ALTER TABLE intervention_documents ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir les documents des interventions de leur équipe
CREATE POLICY "Users can view documents from their team interventions" ON intervention_documents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM interventions i
        JOIN team_members tm ON i.team_id = tm.team_id
        WHERE i.id = intervention_documents.intervention_id
        AND tm.user_id = auth.uid()
    )
);

-- Politique : Les utilisateurs peuvent uploader des documents sur les interventions de leur équipe
CREATE POLICY "Users can upload documents to their team interventions" ON intervention_documents
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM interventions i
        JOIN team_members tm ON i.team_id = tm.team_id
        WHERE i.id = intervention_documents.intervention_id
        AND tm.user_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
);

-- Politique : Les utilisateurs peuvent mettre à jour leurs propres documents
CREATE POLICY "Users can update their own documents" ON intervention_documents
FOR UPDATE USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Politique : Les utilisateurs peuvent supprimer leurs propres documents
CREATE POLICY "Users can delete their own documents" ON intervention_documents
FOR DELETE USING (uploaded_by = auth.uid());

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_intervention_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intervention_documents_updated_at
    BEFORE UPDATE ON intervention_documents
    FOR EACH ROW EXECUTE FUNCTION update_intervention_documents_updated_at();

-- Création du bucket Supabase Storage pour les documents d'intervention (si pas déjà existant)
-- Cette commande doit être exécutée via l'interface Supabase ou via les fonctions SQL Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('intervention-documents', 'intervention-documents', false);

-- Commentaires sur les colonnes pour la documentation
COMMENT ON TABLE intervention_documents IS 'Documents et fichiers attachés aux interventions';
COMMENT ON COLUMN intervention_documents.intervention_id IS 'Référence vers l''intervention associée';
COMMENT ON COLUMN intervention_documents.filename IS 'Nom du fichier stocké (souvent avec UUID)';
COMMENT ON COLUMN intervention_documents.original_filename IS 'Nom original du fichier uploadé';
COMMENT ON COLUMN intervention_documents.storage_path IS 'Chemin complet dans Supabase Storage';
COMMENT ON COLUMN intervention_documents.document_type IS 'Type de document pour la catégorisation';
COMMENT ON COLUMN intervention_documents.is_validated IS 'Document validé par un gestionnaire';
