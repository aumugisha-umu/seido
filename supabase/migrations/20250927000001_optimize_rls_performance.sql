-- ================================================================
-- OPTIMISATION RLS PERFORMANCE - SEIDO (Bonnes Pratiques 2025)
-- ================================================================
--
-- Ce script implémente les bonnes pratiques Supabase 2025 pour RLS :
-- 1. Indexes obligatoires pour les colonnes RLS
-- 2. Security definer functions pour cache auth.uid()
-- 3. Filtrage explicite + RLS policies
-- 4. Éviter user_metadata, utiliser raw_app_meta_data
--

-- ✅ INDEXES OBLIGATOIRES pour RLS Performance (100x amélioration)
-- Chaque table avec RLS DOIT avoir un index sur la colonne user_id/auth_user_id

-- Index pour table users (auth_user_id)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
ON public.users USING btree (auth_user_id);

-- Index pour table teams (created_by)
CREATE INDEX IF NOT EXISTS idx_teams_created_by
ON public.teams USING btree (created_by);

-- Index pour table interventions (selon structure actuelle)
CREATE INDEX IF NOT EXISTS idx_interventions_team_id
ON public.interventions USING btree (team_id);

CREATE INDEX IF NOT EXISTS idx_interventions_lot_id
ON public.interventions USING btree (lot_id);

-- Index pour table intervention_contacts (table de liaison)
CREATE INDEX IF NOT EXISTS idx_intervention_contacts_intervention_id
ON public.intervention_contacts USING btree (intervention_id);

CREATE INDEX IF NOT EXISTS idx_intervention_contacts_user_id
ON public.intervention_contacts USING btree (user_id);

-- Index pour table properties (à vérifier si elle existe)
-- CREATE INDEX IF NOT EXISTS idx_properties_team_id
-- ON public.properties USING btree (team_id);

-- Index pour table quotes
CREATE INDEX IF NOT EXISTS idx_quotes_intervention_id
ON public.quotes USING btree (intervention_id);

-- Index pour table building_contacts et lot_contacts
CREATE INDEX IF NOT EXISTS idx_building_contacts_building_id
ON public.building_contacts USING btree (building_id);

CREATE INDEX IF NOT EXISTS idx_building_contacts_user_id
ON public.building_contacts USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_lot_contacts_lot_id
ON public.lot_contacts USING btree (lot_id);

CREATE INDEX IF NOT EXISTS idx_lot_contacts_user_id
ON public.lot_contacts USING btree (user_id);

-- Index pour table activities
CREATE INDEX IF NOT EXISTS idx_activities_team_id
ON public.activities USING btree (team_id);

CREATE INDEX IF NOT EXISTS idx_activities_user_id
ON public.activities USING btree (user_id);

-- Index pour table notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
ON public.notifications USING btree (user_id);

-- Index pour table availability_slots
CREATE INDEX IF NOT EXISTS idx_availability_slots_user_id
ON public.availability_slots USING btree (user_id);

-- ✅ SECURITY DEFINER FUNCTIONS (Cache auth.uid() pour éviter appels répétés)
-- Wrapping auth.uid() permet d'utiliser initPlan vs appel sur chaque ligne

-- Fonction pour récupérer l'ID utilisateur actuel avec cache
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Fonction pour récupérer l'équipe de l'utilisateur actuel avec cache
CREATE OR REPLACE FUNCTION auth.current_user_team_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT team_id
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Fonction pour récupérer le rôle de l'utilisateur actuel avec cache
CREATE OR REPLACE FUNCTION auth.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text
  FROM public.users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- ✅ POLICIES RLS OPTIMISÉES avec Security Definer Functions

-- Policy users : utilisateur peut voir son propre profil et ceux de son équipe
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT USING (
  auth_user_id = auth.current_user_id()
  OR team_id = auth.current_user_team_id()
  OR auth.is_admin()
);

-- Policy teams : utilisateur peut voir son équipe
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
CREATE POLICY "teams_select_policy" ON public.teams
FOR SELECT USING (
  id = auth.current_user_team_id()
  OR auth.is_admin()
);

-- Policy interventions : selon le rôle et la structure actuelle
DROP POLICY IF EXISTS "interventions_select_policy" ON public.interventions;
CREATE POLICY "interventions_select_policy" ON public.interventions
FOR SELECT USING (
  -- Admin voit tout
  auth.is_admin()
  OR
  -- Gestionnaire voit son équipe
  (auth.current_user_role() = 'gestionnaire' AND team_id = auth.current_user_team_id())
  OR
  -- Locataire voit les interventions de ses lots
  (auth.current_user_role() = 'locataire' AND lot_id IN (
    SELECT lot_id FROM public.lot_contacts
    WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.current_user_id())
  ))
  OR
  -- Prestataire voit les interventions qui lui sont assignées via intervention_contacts
  (auth.current_user_role() = 'prestataire' AND id IN (
    SELECT intervention_id FROM public.intervention_contacts
    WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.current_user_id())
    AND role = 'prestataire'
  ))
);

-- Policy properties : gestionnaire et locataires de l'équipe
DROP POLICY IF EXISTS "properties_select_policy" ON public.properties;
CREATE POLICY "properties_select_policy" ON public.properties
FOR SELECT USING (
  auth.is_admin()
  OR team_id = auth.current_user_team_id()
);

-- Policy quotes : prestataire voit ses devis, gestionnaire voit ceux de son équipe
DROP POLICY IF EXISTS "quotes_select_policy" ON public.quotes;
CREATE POLICY "quotes_select_policy" ON public.quotes
FOR SELECT USING (
  auth.is_admin()
  OR
  -- Gestionnaire voit les devis des interventions de son équipe
  (auth.current_user_role() = 'gestionnaire' AND intervention_id IN (
    SELECT id FROM public.interventions WHERE team_id = auth.current_user_team_id()
  ))
  OR
  -- Prestataire voit ses devis (à adapter selon votre structure quotes)
  (auth.current_user_role() = 'prestataire' AND intervention_id IN (
    SELECT intervention_id FROM public.intervention_contacts
    WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.current_user_id())
    AND role = 'prestataire'
  ))
);

-- Policy activities : utilisateur voit les activités de son équipe
DROP POLICY IF EXISTS "activities_select_policy" ON public.activities;
CREATE POLICY "activities_select_policy" ON public.activities
FOR SELECT USING (
  auth.is_admin()
  OR team_id = auth.current_user_team_id()
);

-- Policy notifications : utilisateur voit ses propres notifications
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
CREATE POLICY "notifications_select_policy" ON public.notifications
FOR SELECT USING (
  auth.is_admin()
  OR user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.current_user_id()
  )
);

-- Policy availability_slots : prestataire voit ses créneaux, gestionnaire ceux de son équipe
DROP POLICY IF EXISTS "availability_slots_select_policy" ON public.availability_slots;
CREATE POLICY "availability_slots_select_policy" ON public.availability_slots
FOR SELECT USING (
  auth.is_admin()
  OR
  -- Prestataire voit ses créneaux
  (auth.current_user_role() = 'prestataire' AND user_id IN (
    SELECT id FROM public.users WHERE auth_user_id = auth.current_user_id()
  ))
  OR
  -- Gestionnaire voit les créneaux des prestataires
  auth.current_user_role() = 'gestionnaire'
);

-- ✅ COMMENTAIRES EXPLICATIFS
COMMENT ON FUNCTION auth.current_user_id() IS 'Cache auth.uid() pour éviter appels répétés (performance RLS)';
COMMENT ON FUNCTION auth.current_user_team_id() IS 'Cache team_id utilisateur actuel (performance RLS)';
COMMENT ON FUNCTION auth.current_user_role() IS 'Cache rôle utilisateur actuel (performance RLS)';
COMMENT ON FUNCTION auth.is_admin() IS 'Vérifie si utilisateur actuel est admin (performance RLS)';

-- ✅ ACTIVER RLS sur toutes les tables si pas déjà fait
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY; -- Table à vérifier
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_contacts ENABLE ROW LEVEL SECURITY;

-- ✅ ANALYSER LES TABLES pour mettre à jour les statistiques après création d'index
ANALYZE public.users;
ANALYZE public.teams;
ANALYZE public.interventions;
ANALYZE public.quotes;
ANALYZE public.activities;
ANALYZE public.notifications;
ANALYZE public.availability_slots;
ANALYZE public.buildings;
ANALYZE public.lots;
ANALYZE public.intervention_contacts;
ANALYZE public.building_contacts;
ANALYZE public.lot_contacts;