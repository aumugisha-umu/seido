# 📄 Système de Gestion Documentaire - Property Documents

**Date de création**: 2025-10-10
**Status**: ✅ Spécifié - Prêt pour implémentation
**Version**: 1.0.0

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Schéma de base de données](#schéma-de-base-de-données)
4. [Sécurité et RLS](#sécurité-et-rls)
5. [Supabase Storage](#supabase-storage)
6. [API Routes](#api-routes)
7. [Services et Repositories](#services-et-repositories)
8. [Composants Frontend](#composants-frontend)
9. [Workflows utilisateur](#workflows-utilisateur)
10. [Migration](#migration)
11. [Tests](#tests)
12. [Best Practices](#best-practices)

---

## Vue d'ensemble

### Objectif

Le système de gestion documentaire permet aux gestionnaires d'attacher des documents (photos, PDF, etc.) aux immeubles et lots, avec un contrôle granulaire de la visibilité. Les documents peuvent être partagés temporairement lors d'interventions avec les prestataires et locataires concernés.

### Cas d'usage principaux

1. **Gestion administrative**: Baux, règlements de copropriété, diagnostics
2. **Documentation technique**: Garanties d'appareils, manuels d'utilisation, certificats de conformité
3. **Suivi maintenance**: Photos compteurs, états des lieux, factures de travaux
4. **Partage contextuel**: Partage de documents spécifiques lors d'interventions (ex: photo compteur pour réparation fuite)

### Caractéristiques clés

- ✅ **Polymorphisme**: Un document peut être lié à un immeuble OU un lot
- ✅ **Visibilité granulaire**: 3 niveaux (équipe, locataire, intervention)
- ✅ **Partage temporaire**: Partage spécifique lors d'interventions avec révocation
- ✅ **Alertes expiration**: Suivi automatique des documents avec date d'expiration (baux, diagnostics, garanties)
- ✅ **Full-text search**: Recherche par titre, description, catégorie et tags
- ✅ **Soft delete**: Conservation historique avec traçabilité
- ✅ **Sécurité**: RLS Supabase + Storage RLS pour isolation multi-tenant

---

## Architecture

### Design Patterns

#### 1. Polymorphic Relations

Les documents peuvent être attachés soit à un **building** soit à un **lot**:

```sql
-- Relations polymorphiques
building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,

-- Contrainte: exactement un parent
CONSTRAINT valid_property_reference CHECK (
  (building_id IS NOT NULL AND lot_id IS NULL) OR
  (building_id IS NULL AND lot_id IS NOT NULL)
)
```

**Avantages**:
- Flexibilité: Documents niveau immeuble (règlement copropriété) ou niveau lot (bail)
- Simplicité: Une seule table pour tous les documents property
- Performance: Indexes spécifiques pour chaque type de recherche

#### 2. Visibility Levels

3 niveaux de visibilité:

| Niveau | Qui peut voir | Usage typique |
|--------|--------------|---------------|
| `equipe` | Tous les gestionnaires de l'équipe | Documents administratifs standards |
| `locataire` | Gestionnaires + locataire du lot | Bail, état des lieux, diagnostics |
| `intervention` | Gestionnaires + partagé temporairement via `document_intervention_shares` | Partage temporaire lors intervention avec prestataire |

#### 3. Document Sharing (Intervention Context)

Système de partage temporaire avec audit complet:

```sql
CREATE TABLE document_intervention_shares (
  document_id UUID NOT NULL,
  intervention_id UUID NOT NULL,
  visible_to_provider BOOLEAN DEFAULT FALSE,
  visible_to_tenant BOOLEAN DEFAULT TRUE,
  share_note TEXT,
  shared_by UUID NOT NULL,
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES users(id),
  CONSTRAINT unique_document_intervention UNIQUE (document_id, intervention_id)
)
```

**Workflow**:
1. Gestionnaire crée une intervention
2. Gestionnaire partage un document (ex: photo compteur) avec flags:
   - `visible_to_provider = TRUE` → Prestataire peut voir
   - `visible_to_tenant = TRUE` → Locataire peut voir
3. Document visible uniquement dans le contexte de cette intervention
4. Gestionnaire peut révoquer à tout moment (`revoked_at`)

---

## Schéma de base de données

### Enum: `property_document_type`

```sql
CREATE TYPE property_document_type AS ENUM (
  'bail',                  -- Contrat de location
  'garantie',              -- Garantie d'appareil
  'facture',               -- Facture de travaux/équipement
  'diagnostic',            -- DPE, amiante, plomb, gaz, électricité
  'photo_compteur',        -- Photo compteur eau/gaz/électricité
  'plan',                  -- Plan du lot/immeuble
  'reglement_copropriete', -- Règlement de copropriété
  'etat_des_lieux',        -- État des lieux entrée/sortie
  'certificat',            -- Certificat de conformité, ramonage, etc.
  'manuel_utilisation',    -- Manuel d'utilisation d'un appareil
  'photo_generale',        -- Photo générale du bien
  'autre'                  -- Autres documents
);
```

### Enum: `document_visibility_level`

```sql
CREATE TYPE document_visibility_level AS ENUM (
  'equipe',               -- Visible par tous les gestionnaires de l'équipe
  'locataire',            -- Visible par les gestionnaires + le locataire du lot
  'intervention'          -- Partagé temporairement lors d'une intervention spécifique
);
```

### Table: `property_documents`

**24 colonnes** organisées en 8 sections:

#### Identifiant & Relations
```sql
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
```

#### Type & Catégorie
```sql
document_type property_document_type NOT NULL,
category TEXT, -- Catégorie custom (ex: "Chaudière Viessmann")
```

#### Informations fichier
```sql
filename TEXT NOT NULL,                    -- Nom unique généré
original_filename TEXT NOT NULL,           -- Nom original du fichier
file_size BIGINT NOT NULL,                -- Taille en bytes
mime_type TEXT NOT NULL,                  -- Type MIME
storage_path TEXT NOT NULL,               -- Chemin dans Storage
storage_bucket TEXT DEFAULT 'property-documents' NOT NULL,
```

#### Métadonnées
```sql
title TEXT,                               -- Titre personnalisé
description TEXT,                         -- Description longue
tags TEXT[] DEFAULT '{}',                 -- Tags pour recherche
```

#### Dates importantes
```sql
expiry_date DATE,                         -- Date d'expiration
document_date DATE,                       -- Date du document
```

#### Visibilité & Archive
```sql
visibility_level document_visibility_level DEFAULT 'equipe' NOT NULL,
is_archived BOOLEAN DEFAULT FALSE,
```

#### Audit
```sql
uploaded_by UUID NOT NULL REFERENCES users(id),
uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
```

#### Soft Delete
```sql
deleted_at TIMESTAMP WITH TIME ZONE,
deleted_by UUID REFERENCES users(id),
```

### Table: `document_intervention_shares`

**10 colonnes** pour le partage contextuel:

```sql
CREATE TABLE document_intervention_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES property_documents(id) ON DELETE CASCADE,
  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  visible_to_provider BOOLEAN DEFAULT FALSE,
  visible_to_tenant BOOLEAN DEFAULT TRUE,
  share_note TEXT,
  shared_by UUID NOT NULL REFERENCES users(id),
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES users(id),
  CONSTRAINT unique_document_intervention UNIQUE (document_id, intervention_id)
);
```

### Indexes (13 total)

#### property_documents (10 indexes)

```sql
-- Relations
CREATE INDEX idx_property_documents_building ON property_documents(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_lot ON property_documents(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_team ON property_documents(team_id) WHERE deleted_at IS NULL;

-- Filtres
CREATE INDEX idx_property_documents_type ON property_documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_visibility ON property_documents(visibility_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_property_documents_uploaded_by ON property_documents(uploaded_by) WHERE deleted_at IS NULL;

-- Fonctionnalités
CREATE INDEX idx_property_documents_expiry ON property_documents(expiry_date)
  WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_property_documents_archived ON property_documents(is_archived) WHERE deleted_at IS NULL;

-- Full-text search (GIN index)
CREATE INDEX idx_property_documents_search ON property_documents
  USING gin(to_tsvector('french',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(category, '') || ' ' ||
    array_to_string(tags, ' ')
  ))
  WHERE deleted_at IS NULL;

-- Soft delete
CREATE INDEX idx_property_documents_deleted ON property_documents(deleted_at);
```

#### document_intervention_shares (3 indexes)

```sql
CREATE INDEX idx_doc_shares_document ON document_intervention_shares(document_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_doc_shares_intervention ON document_intervention_shares(intervention_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_doc_shares_shared_by ON document_intervention_shares(shared_by);
```

---

## Sécurité et RLS

### Row Level Security (RLS)

#### property_documents - SELECT

**Règles de visibilité**:

```sql
CREATE POLICY property_documents_select
  ON property_documents FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      -- Admin: voit tout
      is_admin()
      OR
      -- Gestionnaire de l'équipe: voit selon visibility_level
      (
        is_team_manager(team_id)
        AND (
          visibility_level = 'equipe'
          OR visibility_level = 'locataire'
        )
      )
      OR
      -- Locataire: voit documents de son lot si visibility_level = 'locataire'
      (
        visibility_level = 'locataire'
        AND lot_id IS NOT NULL
        AND is_tenant_of_lot(lot_id)
      )
      OR
      -- Partage lors d'une intervention (via document_intervention_shares)
      EXISTS (
        SELECT 1 FROM document_intervention_shares dis
        INNER JOIN interventions i ON dis.intervention_id = i.id
        WHERE dis.document_id = property_documents.id
          AND dis.revoked_at IS NULL
          AND (
            (i.prestataire_id = auth.uid() AND dis.visible_to_provider = TRUE)
            OR
            (i.tenant_id = auth.uid() AND dis.visible_to_tenant = TRUE)
            OR
            is_team_manager((SELECT team_id FROM lots WHERE id = i.lot_id))
          )
      )
    )
  );
```

**★ Insight ─────────────────────────────────────**
Cette policy illustre un pattern avancé de sécurité multi-niveau:
1. **Hiérarchie des permissions**: Admin > Team Manager > Role-specific (3 niveaux de visibilité)
2. **Visibilité contextuelle**: Les prestataires/locataires ne voient que les documents partagés dans le cadre d'interventions actives
3. **Audit trail**: La révocation (`revoked_at IS NULL`) garantit que l'accès peut être retiré instantanément
4. **Simplicité**: Pas de visibilité "privée" - tous les gestionnaires de l'équipe collaborent avec visibilité complète
**─────────────────────────────────────────────────**

#### property_documents - INSERT/UPDATE/DELETE

```sql
-- INSERT: Admin + Gestionnaire de l'équipe
CREATE POLICY property_documents_insert
  ON property_documents FOR INSERT
  WITH CHECK (
    is_admin() OR (is_gestionnaire() AND is_team_manager(team_id))
  );

-- UPDATE: Admin + Team Manager + Uploadeur
CREATE POLICY property_documents_update
  ON property_documents FOR UPDATE
  USING (
    deleted_at IS NULL AND (
      is_admin() OR is_team_manager(team_id) OR
      (uploaded_by = auth.uid() AND is_gestionnaire())
    )
  )
  WITH CHECK (
    is_admin() OR is_team_manager(team_id) OR
    (uploaded_by = auth.uid() AND is_gestionnaire())
  );

-- DELETE: Admin + Team Manager
CREATE POLICY property_documents_delete
  ON property_documents FOR DELETE
  USING (is_admin() OR is_team_manager(team_id));
```

#### document_intervention_shares - Policies

```sql
-- SELECT: Gestionnaires, Prestataires assignés, Locataires concernés
CREATE POLICY doc_shares_select
  ON document_intervention_shares FOR SELECT
  USING (
    revoked_at IS NULL AND (
      is_admin()
      OR EXISTS (
        SELECT 1 FROM interventions i INNER JOIN lots l ON i.lot_id = l.id
        WHERE i.id = document_intervention_shares.intervention_id
          AND is_team_manager(l.team_id)
      )
      OR EXISTS (
        SELECT 1 FROM interventions i
        WHERE i.id = document_intervention_shares.intervention_id
          AND i.prestataire_id = auth.uid()
          AND document_intervention_shares.visible_to_provider = TRUE
      )
      OR EXISTS (
        SELECT 1 FROM interventions i
        WHERE i.id = document_intervention_shares.intervention_id
          AND i.tenant_id = auth.uid()
          AND document_intervention_shares.visible_to_tenant = TRUE
      )
    )
  );

-- INSERT: Admin + Team Manager
CREATE POLICY doc_shares_insert
  ON document_intervention_shares FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM interventions i INNER JOIN lots l ON i.lot_id = l.id
      WHERE i.id = document_intervention_shares.intervention_id
        AND is_team_manager(l.team_id)
    )
  );

-- UPDATE/DELETE: Admin + Team Manager + Partageur original
-- (Similaire à INSERT avec ajout de `shared_by = auth.uid()`)
```

---

## Supabase Storage

### Bucket Configuration

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-documents',
  'property-documents',
  false, -- Bucket privé, accès via signed URLs
  10485760, -- 10 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ]
);
```

### Organisation des fichiers

```
property-documents/
├── buildings/
│   └── {building_id}/
│       ├── 2025-10-10T14-30-45-abc123.pdf
│       ├── 2025-10-10T14-35-12-def456.jpg
│       └── ...
└── lots/
    └── {lot_id}/
        ├── 2025-10-10T15-00-00-ghi789.pdf
        ├── 2025-10-10T15-05-30-jkl012.jpg
        └── ...
```

**Pattern de nommage**: `{timestamp}-{random}.{extension}`
- `timestamp`: ISO 8601 sans caractères spéciaux (`YYYY-MM-DDTHH-mm-ss`)
- `random`: 6 caractères alphanumériques (évite collisions)
- `extension`: Extension originale du fichier

### Storage RLS Policies

4 policies sur `storage.objects`:

```sql
-- SELECT: Lecture selon RLS property_documents
CREATE POLICY "property_documents_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-documents'
    AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1 FROM property_documents pd
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
              AND tm.team_id = pd.team_id
              AND tm.role = 'gestionnaire'
          )
      )
      OR EXISTS (
        SELECT 1 FROM property_documents pd INNER JOIN lots l ON pd.lot_id = l.id
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND pd.visibility_level = 'locataire'
          AND l.tenant_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM property_documents pd
        INNER JOIN document_intervention_shares dis ON dis.document_id = pd.id
        INNER JOIN interventions i ON dis.intervention_id = i.id
        WHERE pd.storage_path = storage.objects.name
          AND pd.deleted_at IS NULL
          AND dis.revoked_at IS NULL
          AND dis.visible_to_provider = TRUE
          AND i.prestataire_id = auth.uid()
      )
    )
  );

-- INSERT: Admin + Gestionnaires
CREATE POLICY "property_documents_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-documents'
    AND (
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
      OR EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.user_id = auth.uid() AND tm.role = 'gestionnaire'
      )
    )
  );

-- UPDATE/DELETE: Admin + Team Managers
-- (Similaire à INSERT avec vérification team_id)
```

**★ Insight ─────────────────────────────────────**
Les Storage RLS policies doivent **refléter exactement** les policies de la table `property_documents`. Sans cela, un utilisateur pourrait avoir accès à l'enregistrement DB mais pas au fichier (ou vice-versa), créant une incohérence dans l'UX.
**─────────────────────────────────────────────────**

---

## API Routes

### GET `/api/property-documents`

**Query Parameters**:
- `building_id`: UUID (optionnel)
- `lot_id`: UUID (optionnel)
- `type`: property_document_type (optionnel)
- `visibility`: document_visibility_level (optionnel)
- `expiring`: boolean (optionnel) - Documents expirant dans les 30 jours
- `archived`: boolean (default: false)
- `search`: string (optionnel) - Full-text search
- `page`: number (default: 1)
- `limit`: number (default: 20, max: 100)

**Response**:
```typescript
{
  documents: PropertyDocument[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### GET `/api/property-documents/[id]`

**Response**:
```typescript
{
  document: PropertyDocument,
  signedUrl: string, // URL valide 1 heure
  expiresAt: string  // ISO timestamp
}
```

### POST `/api/property-documents`

**Body** (FormData):
```typescript
{
  file: File,                           // Fichier (max 10MB)
  building_id?: UUID,                   // Exactement un de building_id ou lot_id
  lot_id?: UUID,
  document_type: property_document_type,
  category?: string,
  title?: string,
  description?: string,
  tags?: string[],
  expiry_date?: string,                 // ISO date
  document_date?: string,               // ISO date
  visibility_level: document_visibility_level
}
```

**Response**:
```typescript
{
  document: PropertyDocument,
  signedUrl: string
}
```

**Validation Zod Schema**:
```typescript
const PropertyDocumentUploadSchema = z.object({
  building_id: z.string().uuid().optional(),
  lot_id: z.string().uuid().optional(),
  document_type: z.enum([
    'bail', 'garantie', 'facture', 'diagnostic', 'photo_compteur',
    'plan', 'reglement_copropriete', 'etat_des_lieux', 'certificat',
    'manuel_utilisation', 'photo_generale', 'autre'
  ]),
  category: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  visibility_level: z.enum(['equipe', 'locataire', 'intervention'])
}).refine(
  (data) => (data.building_id && !data.lot_id) || (!data.building_id && data.lot_id),
  { message: "Exactement un de building_id ou lot_id requis" }
);
```

### PUT `/api/property-documents/[id]`

**Body**:
```typescript
{
  title?: string,
  description?: string,
  tags?: string[],
  category?: string,
  expiry_date?: string,
  document_date?: string,
  visibility_level?: document_visibility_level,
  is_archived?: boolean
}
```

⚠️ **Note**: Le fichier lui-même n'est pas modifiable (immutable). Pour changer le fichier, supprimer et re-créer.

### DELETE `/api/property-documents/[id]`

**Comportement**:
1. Soft delete: `UPDATE property_documents SET deleted_at = NOW(), deleted_by = auth.uid() WHERE id = ?`
2. Cleanup storage (optionnel, configurable): Suppression physique du fichier après 30 jours
3. Cascade: Les partages (`document_intervention_shares`) sont conservés mais deviennent invisibles via RLS

**Response**:
```typescript
{
  success: true,
  message: "Document supprimé (soft delete)"
}
```

### POST `/api/interventions/[id]/share-document`

**Body**:
```typescript
{
  document_id: UUID,
  visible_to_provider: boolean,
  visible_to_tenant: boolean,
  share_note?: string
}
```

**Response**:
```typescript
{
  share: DocumentInterventionShare
}
```

**Validations**:
- Document existe et appartient à l'équipe de l'intervention
- Document lié au building ou lot de l'intervention
- Utilisateur est gestionnaire de l'équipe

### DELETE `/api/interventions/[id]/share-document/[shareId]`

**Comportement**: Révocation (soft delete)
```sql
UPDATE document_intervention_shares
SET revoked_at = NOW(), revoked_by = auth.uid()
WHERE id = ?
```

---

## Services et Repositories

### PropertyDocumentRepository

**Location**: `lib/services/repositories/property-document.repository.ts`

**Interface**:
```typescript
interface PropertyDocumentRepository {
  // CRUD
  create(data: PropertyDocumentInsert): Promise<PropertyDocument>
  findById(id: string): Promise<PropertyDocument | null>
  findMany(filters: PropertyDocumentFilters): Promise<PropertyDocument[]>
  update(id: string, data: PropertyDocumentUpdate): Promise<PropertyDocument>
  delete(id: string): Promise<void>

  // Recherche avancée
  search(query: string, filters?: PropertyDocumentFilters): Promise<PropertyDocument[]>
  findExpiring(daysAhead: number): Promise<PropertyDocument[]>
  findByBuildingId(buildingId: string): Promise<PropertyDocument[]>
  findByLotId(lotId: string): Promise<PropertyDocument[]>

  // Métadonnées
  updateTags(id: string, tags: string[]): Promise<PropertyDocument>
  archive(id: string): Promise<PropertyDocument>
  unarchive(id: string): Promise<PropertyDocument>
}
```

### PropertyDocumentService

**Location**: `lib/services/domain/property-document.service.ts`

**Responsabilités**:
- Upload de fichiers avec validation (10MB, MIME types)
- Génération de noms de fichiers uniques
- Création de signed URLs (1 heure de validité)
- Alertes documents expirant (emails proactifs)
- Gestion des tags et métadonnées
- Archivage et soft delete

**Méthodes clés**:
```typescript
class PropertyDocumentService {
  async uploadDocument(
    file: File,
    metadata: PropertyDocumentMetadata,
    uploadedBy: string
  ): Promise<{ document: PropertyDocument, signedUrl: string }>

  async getSignedUrl(documentId: string, expiresIn: number = 3600): Promise<string>

  async getExpiringDocuments(daysAhead: number = 30): Promise<PropertyDocument[]>

  async sendExpiryAlerts(): Promise<void>
}
```

### DocumentShareRepository

**Location**: `lib/services/repositories/document-share.repository.ts`

**Interface**:
```typescript
interface DocumentShareRepository {
  create(data: DocumentShareInsert): Promise<DocumentInterventionShare>
  findByInterventionId(interventionId: string): Promise<DocumentInterventionShare[]>
  findByDocumentId(documentId: string): Promise<DocumentInterventionShare[]>
  revoke(id: string, revokedBy: string): Promise<DocumentInterventionShare>
  findActive(filters?: DocumentShareFilters): Promise<DocumentInterventionShare[]>
}
```

### DocumentShareService

**Location**: `lib/services/domain/document-share.service.ts`

**Responsabilités**:
- Logique de partage lors d'interventions
- Validation des flags visibility
- Révocation avec audit trail
- Notifications aux parties concernées

**Méthodes clés**:
```typescript
class DocumentShareService {
  async shareDocumentForIntervention(
    documentId: string,
    interventionId: string,
    flags: ShareFlags,
    sharedBy: string
  ): Promise<DocumentInterventionShare>

  async revokeShare(shareId: string, revokedBy: string): Promise<void>

  async getSharedDocumentsForIntervention(interventionId: string): Promise<PropertyDocument[]>
}
```

---

## Composants Frontend

### `<BuildingDocuments>` / `<LotDocuments>`

**Location**: `components/property-documents/`

**Props**:
```typescript
interface PropertyDocumentsProps {
  buildingId?: string
  lotId?: string
  canUpload?: boolean
  canDelete?: boolean
  canShare?: boolean
}
```

**Fonctionnalités**:
- Liste documents avec filtres (type, visibility, tags)
- Upload multi-fichiers (drag-and-drop)
- Prévisualisation (thumbnails pour images/PDF)
- Actions: Download, Delete, Share, Archive
- Badges expiry (rouge si < 30 jours)

### `<DocumentUploadModal>`

**Features**:
- **Drag-and-drop**: Zone de drop avec validation visuelle
- **Multi-upload**: Plusieurs fichiers en une fois (max 10)
- **Validation client**: Taille (10MB), MIME types
- **Progress bars**: Upload en cours avec pourcentage
- **Métadonnées**: Formulaire pour titre, description, tags, expiry_date
- **Prévisualisation**: Aperçu avant upload

**État**:
```typescript
interface UploadState {
  files: File[]
  uploading: boolean
  progress: Record<string, number>
  errors: Record<string, string>
}
```

### `<DocumentCard>`

**Props**:
```typescript
interface DocumentCardProps {
  document: PropertyDocument
  onDownload: () => void
  onDelete?: () => void
  onShare?: () => void
  showActions?: boolean
}
```

**Affichage**:
- Thumbnail (image) ou icône (PDF, etc.)
- Titre + description (truncated)
- Tags (badges)
- Metadata: Type, taille, date upload
- Badge expiry (si `expiry_date` dans < 30 jours)
- Actions: Download, Delete, Share (selon permissions)

### `<DocumentShareModal>`

**Props**:
```typescript
interface DocumentShareModalProps {
  document: PropertyDocument
  intervention: Intervention
  onShare: (flags: ShareFlags) => void
}
```

**Formulaire**:
```typescript
interface ShareFlags {
  visible_to_provider: boolean
  visible_to_tenant: boolean
  share_note?: string
}
```

**UX**:
- Explication contextuelle: "Ce document sera visible uniquement dans le contexte de cette intervention"
- Toggles: Prestataire / Locataire
- Champ note optionnel pour expliquer le partage
- Validation: Au moins un toggle activé

### `<DocumentExpiryAlert>`

**Location**: Dashboard gestionnaire

**Comportement**:
- Query automatique: Documents expirant dans les 30 jours
- Badge notification avec compteur
- Liste détaillée au clic
- Actions rapides: Renouveler (met à jour `expiry_date`), Archiver

---

## Workflows utilisateur

### Workflow 1: Upload document pour un lot

1. **Gestionnaire** accède à la page détails d'un lot
2. Clic sur onglet "Documents"
3. Clic bouton "Ajouter un document"
4. Modal `<DocumentUploadModal>` s'ouvre
5. Gestionnaire drag-and-drop un fichier (ex: bail.pdf)
6. Formulaire: Sélection type "bail", expiry_date, visibility "locataire"
7. Validation et upload via `POST /api/property-documents`
8. Service:
   - Valide fichier (10MB, PDF)
   - Upload vers Storage `property-documents/lots/{lot_id}/...`
   - Crée enregistrement DB avec `visibility_level = 'locataire'`
9. RLS: Locataire du lot peut maintenant voir le document
10. Frontend: Rafraîchit la liste documents, affiche toast succès

### Workflow 2: Partage document lors intervention

1. **Gestionnaire** crée une intervention pour réparation fuite
2. Accède à la page détails intervention
3. Section "Documents partagés": Clic "Partager un document"
4. Modal liste documents disponibles (du lot/building de l'intervention)
5. Gestionnaire sélectionne "Photo compteur eau"
6. Configure flags:
   - `visible_to_provider = TRUE` (prestataire doit voir le compteur)
   - `visible_to_tenant = FALSE` (pas nécessaire)
   - Note: "Compteur au sous-sol, local technique"
7. Validation et partage via `POST /api/interventions/{id}/share-document`
8. Service:
   - Crée enregistrement `document_intervention_shares`
9. RLS: Prestataire assigné peut maintenant voir ce document **uniquement dans le contexte de cette intervention**
10. Notification: Prestataire reçoit notification "1 document partagé pour l'intervention"

### Workflow 3: Révocation partage

1. **Gestionnaire** marque l'intervention comme terminée
2. Décide de révoquer le partage du document
3. Clic "Révoquer" sur la ligne du document partagé
4. Confirmation modal
5. Service: `DELETE /api/interventions/{id}/share-document/{shareId}`
6. Mise à jour: `revoked_at = NOW()`
7. RLS: Prestataire ne peut plus voir le document (query RLS avec `WHERE revoked_at IS NULL`)

### Workflow 4: Alertes expiry

1. **Cron job quotidien** (ou manuel): Appel `PropertyDocumentService.sendExpiryAlerts()`
2. Service query:
   ```sql
   SELECT * FROM property_documents
   WHERE expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
     AND deleted_at IS NULL
   ```
3. Pour chaque document expirant:
   - Récupère le gestionnaire (via `team_id` → `team_members`)
   - Envoie email: "Le bail du lot A101 expire dans 15 jours"
4. Frontend: Badge notification sur dashboard avec lien direct

---

## Migration

### Script de migration

**Fichier**: `supabase/migrations/20251010000002_property_documents.sql`

**Ordre d'exécution**:
1. Créer les 2 enums
2. Créer table `property_documents` avec contraintes
3. Créer table `document_intervention_shares` avec contraintes
4. Créer les 13 indexes
5. Activer RLS sur les 2 tables
6. Créer les 8 policies (4 par table)
7. Créer bucket Storage `property-documents`
8. Créer les 4 Storage RLS policies
9. Créer triggers `updated_at` (2 triggers)

**Rollback**:
```sql
-- Ordre inverse
DROP POLICY IF EXISTS ... ON storage.objects;
DROP POLICY IF EXISTS ... ON document_intervention_shares;
DROP POLICY IF EXISTS ... ON property_documents;
DROP TABLE IF EXISTS document_intervention_shares;
DROP TABLE IF EXISTS property_documents;
DROP TYPE IF EXISTS document_visibility_level;
DROP TYPE IF EXISTS property_document_type;
DELETE FROM storage.buckets WHERE id = 'property-documents';
```

### Migration des données existantes (si applicable)

Si vous avez déjà des documents dans un autre système:

```sql
-- Exemple: Migration depuis ancienne table `documents`
INSERT INTO property_documents (
  id, building_id, lot_id, team_id, document_type, filename,
  original_filename, file_size, mime_type, storage_path, storage_bucket,
  title, description, visibility_level, uploaded_by, uploaded_at
)
SELECT
  id,
  CASE WHEN entity_type = 'building' THEN entity_id ELSE NULL END as building_id,
  CASE WHEN entity_type = 'lot' THEN entity_id ELSE NULL END as lot_id,
  team_id,
  CASE
    WHEN doc_category = 'lease' THEN 'bail'::property_document_type
    WHEN doc_category = 'warranty' THEN 'garantie'::property_document_type
    ELSE 'autre'::property_document_type
  END as document_type,
  file_name,
  original_name,
  size_bytes,
  mime_type,
  storage_path,
  'property-documents',
  title,
  description,
  'equipe'::document_visibility_level,
  created_by,
  created_at
FROM old_documents
WHERE deleted_at IS NULL;
```

---

## Tests

### Tests unitaires (Repositories)

**Fichier**: `lib/services/__tests__/repositories/property-document.repository.test.ts`

```typescript
describe('PropertyDocumentRepository', () => {
  it('should create document with valid data', async () => {
    const document = await repo.create({
      lot_id: testLotId,
      document_type: 'bail',
      filename: 'test.pdf',
      // ...
    })
    expect(document.id).toBeDefined()
  })

  it('should enforce polymorphic constraint (building XOR lot)', async () => {
    await expect(
      repo.create({ building_id: 'id1', lot_id: 'id2', /* ... */ })
    ).rejects.toThrow('valid_property_reference')
  })

  it('should find documents by lot_id', async () => {
    const docs = await repo.findByLotId(testLotId)
    expect(docs.length).toBeGreaterThan(0)
    expect(docs[0].lot_id).toBe(testLotId)
  })

  it('should perform full-text search', async () => {
    const results = await repo.search('chaudière viessmann')
    expect(results.length).toBeGreaterThan(0)
  })
})
```

### Tests unitaires (Services)

**Fichier**: `lib/services/__tests__/services/property-document.service.test.ts`

```typescript
describe('PropertyDocumentService', () => {
  it('should upload file and create DB record', async () => {
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    const result = await service.uploadDocument(file, {
      lot_id: testLotId,
      document_type: 'bail',
      visibility_level: 'locataire'
    }, userId)

    expect(result.document.storage_path).toMatch(/lots\/.*\.pdf/)
    expect(result.signedUrl).toContain('supabase')
  })

  it('should reject file > 10MB', async () => {
    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.pdf')
    await expect(
      service.uploadDocument(bigFile, metadata, userId)
    ).rejects.toThrow('File size exceeds 10MB')
  })

  it('should find expiring documents', async () => {
    const expiring = await service.getExpiringDocuments(30)
    expect(expiring.every(d => d.expiry_date)).toBe(true)
  })
})
```

### Tests E2E (Playwright)

**Fichier**: `docs/refacto/Tests/tests/phase2-documents/property-documents.spec.ts`

```typescript
test.describe('Property Documents', () => {
  test('gestionnaire can upload document to lot', async ({ page }) => {
    await setupTestIsolation(page, 'gestionnaire')

    await page.goto('/gestionnaire/lots/test-lot-id')
    await page.click('text=Documents')
    await page.click('text=Ajouter un document')

    // Upload
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-fixtures/bail.pdf')

    // Métadonnées
    await page.selectOption('select[name="document_type"]', 'bail')
    await page.fill('input[name="title"]', 'Bail 2025')
    await page.selectOption('select[name="visibility_level"]', 'locataire')

    await page.click('text=Uploader')

    // Vérification
    await expect(page.locator('text=Bail 2025')).toBeVisible()
    await teardownTestIsolation(page)
  })

  test('locataire can see shared document', async ({ page }) => {
    await setupTestIsolation(page, 'locataire')

    // Gestionnaire a partagé un document
    await page.goto('/locataire/interventions/test-intervention-id')

    await expect(page.locator('text=Documents partagés')).toBeVisible()
    await expect(page.locator('text=Photo compteur eau')).toBeVisible()

    await teardownTestIsolation(page)
  })

  test('prestataire cannot see revoked document', async ({ page }) => {
    await setupTestIsolation(page, 'prestataire')

    // Document partagé puis révoqué
    await page.goto('/prestataire/interventions/test-intervention-id')

    await expect(page.locator('text=Photo compteur eau')).not.toBeVisible()

    await teardownTestIsolation(page)
  })
})
```

### Tests RLS

**Fichier**: `lib/services/__tests__/rls/property-documents-rls.test.ts`

```typescript
describe('property_documents RLS', () => {
  it('gestionnaire can see equipe documents', async () => {
    const { data, error } = await supabaseAsGestionnaire
      .from('property_documents')
      .select('*')
      .eq('visibility_level', 'equipe')

    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('gestionnaire can see equipe documents from other managers', async () => {
    const { data, error } = await supabaseAsGestionnaire
      .from('property_documents')
      .select('*')
      .eq('visibility_level', 'equipe')

    expect(error).toBeNull()
    expect(data.length).toBeGreaterThan(0)
  })

  it('locataire can only see locataire visibility documents of their lot', async () => {
    const { data, error } = await supabaseAsLocataire
      .from('property_documents')
      .select('*')

    expect(error).toBeNull()
    expect(data.every(d => d.lot_id === locataireLotId && d.visibility_level === 'locataire')).toBe(true)
  })

  it('prestataire can see shared documents via intervention', async () => {
    // Setup: Gestionnaire a partagé un document
    await supabaseAsGestionnaire
      .from('document_intervention_shares')
      .insert({
        document_id: testDocId,
        intervention_id: testInterventionId,
        visible_to_provider: true,
        shared_by: gestionnaireUserId
      })

    // Test: Prestataire peut voir
    const { data, error } = await supabaseAsPrestataire
      .from('property_documents')
      .select('*')
      .eq('id', testDocId)

    expect(error).toBeNull()
    expect(data.length).toBe(1)
  })
})
```

---

## Best Practices

### 1. Upload de fichiers

**✅ DO**:
- Valider côté client ET serveur (10MB, MIME types)
- Générer noms de fichiers uniques (évite collisions)
- Utiliser FormData pour multipart/form-data
- Afficher progress bars pour UX
- Créer thumbnails pour images (optimisation affichage)

**❌ DON'T**:
- Ne pas stocker fichiers dans la DB (trop lourd)
- Ne pas autoriser upload sans authentification
- Ne pas exposer storage paths directement (utiliser signed URLs)

### 2. Gestion visibilité

**✅ DO**:
- Toujours utiliser `visibility_level` comme première ligne de défense (3 niveaux: equipe, locataire, intervention)
- Partage intervention (`document_intervention_shares`) est **additionnel**, pas un remplacement
- Expliquer clairement aux utilisateurs qui peut voir quoi (tooltip, labels)
- Privilégier `equipe` par défaut pour favoriser la collaboration entre gestionnaires

**❌ DON'T**:
- Ne pas bypasser RLS avec service role en frontend
- Ne pas oublier de révoquer partages après intervention terminée

### 3. Performance

**✅ DO**:
- Utiliser indexes appropriés (full-text search, expiry_date)
- Paginer les listes de documents (limit 20-50)
- Lazy load thumbnails (intersection observer)
- Cache signed URLs côté client (1h validité)

**❌ DON'T**:
- Ne pas charger tous les documents d'un coup (risque OOM)
- Ne pas regénérer signed URL à chaque render (quota limits)

### 4. Sécurité

**✅ DO**:
- Toujours valider permissions avant upload/download
- Utiliser signed URLs avec expiration courte (1h)
- Logger accès aux documents sensibles (audit trail)
- Implémenter rate limiting sur uploads (évite abus)

**❌ DON'T**:
- Ne jamais exposer storage paths publics
- Ne pas stocker documents sensibles sans chiffrement
- Ne pas oublier de nettoyer Storage lors de soft delete (après délai)

### 5. UX/UI

**✅ DO**:
- Afficher badges expiry proéminents (couleur rouge si < 30 jours)
- Permettre filtres multiples (type + visibility + tags)
- Drag-and-drop upload avec feedback visuel
- Prévisualisation avant upload (especially images/PDF)

**❌ DON'T**:
- Ne pas cacher les métadonnées importantes (expiry_date, visibility)
- Ne pas forcer téléchargement sans prévisualisation
- Ne pas ignorer erreurs d'upload (afficher message clair)

### 6. Maintenance

**✅ DO**:
- Cron job quotidien: Alertes expiry (emails gestionnaires)
- Cron job hebdomadaire: Cleanup storage (fichiers soft-deleted > 30 jours)
- Monitoring: Taille bucket Storage (alertes si > 80% quota)
- Analytics: Documents les plus consultés, taux de partage

**❌ DON'T**:
- Ne pas accumuler fichiers soft-deleted indéfiniment (coût Storage)
- Ne pas ignorer documents expirés (risque légal pour baux/diagnostics)

---

## Annexes

### A. Types TypeScript

```typescript
// Enums
type PropertyDocumentType =
  | 'bail' | 'garantie' | 'facture' | 'diagnostic' | 'photo_compteur'
  | 'plan' | 'reglement_copropriete' | 'etat_des_lieux' | 'certificat'
  | 'manuel_utilisation' | 'photo_generale' | 'autre'

type DocumentVisibilityLevel = 'equipe' | 'locataire' | 'intervention'

// Tables
interface PropertyDocument {
  id: string
  building_id: string | null
  lot_id: string | null
  team_id: string
  document_type: PropertyDocumentType
  category: string | null
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  storage_bucket: string
  title: string | null
  description: string | null
  tags: string[]
  expiry_date: string | null
  document_date: string | null
  visibility_level: DocumentVisibilityLevel
  is_archived: boolean
  uploaded_by: string
  uploaded_at: string
  updated_at: string | null
  deleted_at: string | null
  deleted_by: string | null
}

interface DocumentInterventionShare {
  id: string
  document_id: string
  intervention_id: string
  visible_to_provider: boolean
  visible_to_tenant: boolean
  share_note: string | null
  shared_by: string
  shared_at: string
  revoked_at: string | null
  revoked_by: string | null
}
```

### B. Exemples de requêtes SQL

#### Trouver documents expirant dans les 30 jours

```sql
SELECT pd.*, b.name as building_name, l.reference as lot_reference
FROM property_documents pd
LEFT JOIN buildings b ON pd.building_id = b.id
LEFT JOIN lots l ON pd.lot_id = l.id
WHERE pd.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  AND pd.deleted_at IS NULL
ORDER BY pd.expiry_date ASC;
```

#### Trouver tous les documents partagés pour une intervention

```sql
SELECT pd.*, dis.visible_to_provider, dis.visible_to_tenant, dis.share_note
FROM property_documents pd
INNER JOIN document_intervention_shares dis ON dis.document_id = pd.id
WHERE dis.intervention_id = '...'
  AND dis.revoked_at IS NULL
  AND pd.deleted_at IS NULL;
```

#### Full-text search avec ranking

```sql
SELECT pd.*, ts_rank(
  to_tsvector('french', COALESCE(pd.title, '') || ' ' || COALESCE(pd.description, '')),
  plainto_tsquery('french', 'chaudière viessmann')
) as rank
FROM property_documents pd
WHERE to_tsvector('french', COALESCE(pd.title, '') || ' ' || COALESCE(pd.description, ''))
      @@ plainto_tsquery('french', 'chaudière viessmann')
  AND pd.deleted_at IS NULL
ORDER BY rank DESC;
```

### C. Diagramme ERD

```
┌─────────────────┐
│    buildings    │
│   (Table 1)     │
└────────┬────────┘
         │ 1
         │
         │ N (building_id)
         │
┌────────▼─────────────────┐              ┌──────────────────────┐
│  property_documents      │◄──────────┐  │  teams               │
│    (Table new)           │   N        1  │  (Existing)          │
│                          │──────────────►│                      │
│ - building_id (nullable) │   team_id     └──────────────────────┘
│ - lot_id (nullable)      │
│ - document_type          │
│ - visibility_level       │
│ - expiry_date            │
└────────┬─────────────────┘
         │ 1
         │
         │ N (document_id)
         │
┌────────▼─────────────────────────┐
│ document_intervention_shares     │
│       (Table new)                │
│                                  │
│ - document_id                    │
│ - intervention_id ───────────┐   │
│ - visible_to_provider        │   │
│ - visible_to_tenant          │   │
│ - revoked_at                 │   │
└──────────────────────────────┘   │
                                   │
                                   │ N
                                   │
                            ┌──────▼───────┐
                            │ interventions│
                            │ (Existing)   │
                            └──────────────┘

┌─────────────────┐
│      lots       │
│   (Table 2)     │
└────────┬────────┘
         │ 1
         │
         │ N (lot_id)
         │
         └──────────► property_documents
```

---

**📚 Références**:
- `migration-phase2-buildings-lots.md` - Plan Phase 2 complet
- `database-schema-optimal.md` - Schéma DB global
- `lib/file-service.ts` - Service upload existant (interventions)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)

---

**Prochaine étape**: Implémentation selon la stratégie de migration Phase 2 (Jours 1-6)
