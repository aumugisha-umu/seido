-- Migration: 20260105000000_intervention_types_categories.sql
-- Description: Remplace l'enum intervention_type par une table de reference avec categories
-- Ajoute ~35 types d'intervention organises en 3 categories: Bien, Bail, Locataire

-- ============================================================================
-- STEP 1: Creer les tables de reference
-- ============================================================================

CREATE TABLE IF NOT EXISTS intervention_type_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  label_fr VARCHAR(100) NOT NULL,
  description_fr TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE intervention_type_categories IS 'Categories de types d''intervention: Bien, Bail, Locataire';

CREATE TABLE IF NOT EXISTS intervention_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  category_id UUID NOT NULL REFERENCES intervention_type_categories(id),
  label_fr VARCHAR(100) NOT NULL,
  description_fr TEXT,
  icon_name VARCHAR(50),
  color_class VARCHAR(50),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE intervention_types IS 'Types d''intervention avec metadata (icone, couleur, categorie)';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_intervention_types_category ON intervention_types(category_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_intervention_types_code ON intervention_types(code);
CREATE INDEX IF NOT EXISTS idx_intervention_type_categories_code ON intervention_type_categories(code);

-- ============================================================================
-- STEP 2: Inserer les categories
-- ============================================================================

INSERT INTO intervention_type_categories (code, label_fr, description_fr, sort_order) VALUES
  ('bien', 'Bien', 'Interventions techniques sur le patrimoine immobilier', 1),
  ('bail', 'Bail', 'Gestion locative et demarches administratives', 2),
  ('locataire', 'Locataire', 'Relations et communication avec les locataires', 3)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 3: Inserer les types - Categorie BIEN (20 types)
-- ============================================================================

INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('plomberie', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Plomberie', 'Fuites, canalisations, robinetterie', 'Droplets', 'bg-blue-500', 1),
  ('electricite', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Electricite', 'Pannes, prises, eclairage', 'Zap', 'bg-yellow-500', 2),
  ('chauffage', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Chauffage', 'Chaudiere, radiateurs, pompe a chaleur', 'Flame', 'bg-orange-500', 3),
  ('climatisation', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Climatisation', 'Clim, VMC, ventilation', 'Wind', 'bg-cyan-500', 4),
  ('serrurerie', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Serrurerie', 'Serrures, portes, cles', 'Key', 'bg-slate-500', 5),
  ('menuiserie', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Menuiserie', 'Portes, fenetres, volets', 'DoorOpen', 'bg-amber-600', 6),
  ('vitrerie', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Vitrerie', 'Vitres, double vitrage', 'Glasses', 'bg-sky-400', 7),
  ('peinture', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Peinture', 'Murs, plafonds, facades', 'Paintbrush', 'bg-purple-500', 8),
  ('revetements_sols', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Revetements de sols', 'Carrelage, parquet, moquette', 'Footprints', 'bg-stone-500', 9),
  ('toiture', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Toiture', 'Tuiles, gouttieres, isolation', 'Home', 'bg-amber-500', 10),
  ('facade', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Facade', 'Ravalement, nettoyage facade', 'Building2', 'bg-gray-500', 11),
  ('espaces_verts', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Espaces verts', 'Jardinage, taille, entretien', 'Trees', 'bg-green-500', 12),
  ('parties_communes', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Parties communes', 'Hall, escalier, cave', 'Users', 'bg-indigo-400', 13),
  ('ascenseur', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Ascenseur', 'Maintenance, panne ascenseur', 'ArrowUpDown', 'bg-zinc-500', 14),
  ('securite_incendie', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Securite incendie', 'Alarmes, extincteurs, detecteurs', 'Bell', 'bg-red-400', 15),
  ('nettoyage', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Nettoyage', 'Menage, desinfection', 'Sparkles', 'bg-teal-500', 16),
  ('deratisation', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Deratisation', 'Nuisibles, desinsectisation', 'Bug', 'bg-lime-600', 17),
  ('demenagement', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Demenagement', 'Encombrants, vide-grenier', 'Truck', 'bg-blue-400', 18),
  ('travaux_gros_oeuvre', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Gros oeuvre', 'Murs porteurs, fondations', 'HardHat', 'bg-orange-600', 19),
  ('autre_technique', (SELECT id FROM intervention_type_categories WHERE code = 'bien'), 'Autre (technique)', 'Intervention technique autre', 'Wrench', 'bg-indigo-500', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 4: Inserer les types - Categorie BAIL (9 types)
-- ============================================================================

INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('etat_des_lieux_entree', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Etat des lieux entree', 'EDL avant emmenagement', 'ClipboardCheck', 'bg-emerald-500', 1),
  ('etat_des_lieux_sortie', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Etat des lieux sortie', 'EDL fin de bail', 'ClipboardX', 'bg-rose-500', 2),
  ('renouvellement_bail', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Renouvellement de bail', 'Prolongation contrat', 'FileSignature', 'bg-blue-600', 3),
  ('revision_loyer', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Revision de loyer', 'Ajustement annuel', 'TrendingUp', 'bg-green-600', 4),
  ('regularisation_charges', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Regularisation charges', 'Decompte annuel charges', 'Calculator', 'bg-violet-500', 5),
  ('resiliation_bail', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Resiliation de bail', 'Fin de contrat anticipee', 'FileX', 'bg-red-500', 6),
  ('caution', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Caution', 'Depot de garantie, restitution', 'Wallet', 'bg-amber-500', 7),
  ('assurance', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Assurance', 'Attestation, sinistre', 'Shield', 'bg-blue-500', 8),
  ('autre_administratif', (SELECT id FROM intervention_type_categories WHERE code = 'bail'), 'Autre (administratif)', 'Demarche administrative autre', 'FileText', 'bg-gray-400', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 5: Inserer les types - Categorie LOCATAIRE (7 types)
-- ============================================================================

INSERT INTO intervention_types (code, category_id, label_fr, description_fr, icon_name, color_class, sort_order) VALUES
  ('reclamation', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Reclamation', 'Plainte, insatisfaction', 'AlertTriangle', 'bg-orange-500', 1),
  ('demande_information', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Demande d''information', 'Question, renseignement', 'HelpCircle', 'bg-blue-400', 2),
  ('nuisances', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Nuisances', 'Bruit, odeurs, voisinage', 'Volume2', 'bg-red-400', 3),
  ('demande_travaux', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Demande de travaux', 'Amelioration souhaitee', 'Hammer', 'bg-indigo-500', 4),
  ('changement_situation', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Changement de situation', 'Colocation, sous-location', 'UserPlus', 'bg-purple-400', 5),
  ('urgence_locataire', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Urgence locataire', 'Situation critique', 'AlertOctagon', 'bg-red-600', 6),
  ('autre_locataire', (SELECT id FROM intervention_type_categories WHERE code = 'locataire'), 'Autre (locataire)', 'Demande autre', 'MessageSquare', 'bg-gray-400', 99)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 6: Creer la table de mapping legacy
-- ============================================================================

CREATE TABLE IF NOT EXISTS intervention_type_legacy_mapping (
  old_code VARCHAR(50) PRIMARY KEY,
  new_code VARCHAR(50) NOT NULL
);

INSERT INTO intervention_type_legacy_mapping (old_code, new_code) VALUES
  ('jardinage', 'espaces_verts'),
  ('menage', 'nettoyage'),
  ('autre', 'autre_technique')
ON CONFLICT (old_code) DO NOTHING;

-- ============================================================================
-- STEP 7: Modifier la colonne type dans interventions (enum -> varchar)
-- ============================================================================

-- La vue interventions_active depend de la colonne type, on doit la supprimer d'abord
DROP VIEW IF EXISTS interventions_active;

-- Convertir de enum vers VARCHAR
ALTER TABLE interventions
  ALTER COLUMN type TYPE VARCHAR(50) USING type::VARCHAR(50);

-- Recreer la vue interventions_active
CREATE VIEW interventions_active AS
SELECT * FROM interventions WHERE deleted_at IS NULL;

COMMENT ON VIEW interventions_active IS
'Vue sur interventions actives (non soft-deleted). Herite automatiquement des politiques RLS de la table interventions.';

GRANT SELECT ON interventions_active TO authenticated;

-- Migrer les anciennes valeurs vers les nouvelles
UPDATE interventions
SET type = m.new_code
FROM intervention_type_legacy_mapping m
WHERE interventions.type = m.old_code;

-- ============================================================================
-- STEP 8: Modifier la colonne speciality dans users (enum -> varchar)
-- ============================================================================

ALTER TABLE users
  ALTER COLUMN speciality TYPE VARCHAR(50) USING speciality::VARCHAR(50);

-- Migrer les anciennes valeurs
UPDATE users
SET speciality = m.new_code
FROM intervention_type_legacy_mapping m
WHERE users.speciality = m.old_code;

-- ============================================================================
-- STEP 9: RLS Policies pour les nouvelles tables
-- ============================================================================

ALTER TABLE intervention_type_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_type_legacy_mapping ENABLE ROW LEVEL SECURITY;

-- Lecture publique (tous les utilisateurs authentifies)
CREATE POLICY "intervention_type_categories_select" ON intervention_type_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "intervention_types_select" ON intervention_types
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "intervention_type_legacy_mapping_select" ON intervention_type_legacy_mapping
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Modification admin uniquement
CREATE POLICY "intervention_type_categories_admin_all" ON intervention_type_categories
  FOR ALL USING (is_admin());

CREATE POLICY "intervention_types_admin_all" ON intervention_types
  FOR ALL USING (is_admin());

CREATE POLICY "intervention_type_legacy_mapping_admin_all" ON intervention_type_legacy_mapping
  FOR ALL USING (is_admin());

-- ============================================================================
-- STEP 10: (Optionnel) Supprimer l'ancien enum apres validation
-- Note: Execute manuellement apres avoir verifie que tout fonctionne
-- ============================================================================

-- DROP TYPE IF EXISTS intervention_type CASCADE;
