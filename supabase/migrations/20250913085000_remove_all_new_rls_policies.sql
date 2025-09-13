-- Migration pour supprimer toutes les politiques RLS ajoutées récemment
-- et s'assurer que les tables essentielles sont accessibles

-- 1. Intervention Documents - Déjà fait mais on s'assure que c'est propre
ALTER TABLE intervention_documents DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view documents from their team interventions" ON intervention_documents;
DROP POLICY IF EXISTS "Users can upload documents to their team interventions" ON intervention_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON intervention_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON intervention_documents;

-- 2. Vérifier que les tables principales n'ont pas de RLS qui bloque l'accès

-- S'assurer que la table users n'a pas de RLS qui bloque
-- (Elle ne devrait pas en avoir mais on vérifie)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'teams', 'team_members', 'buildings', 'lots', 'interventions', 'contacts') 
AND schemaname = 'public';

-- Si par erreur on avait ajouté des politiques RLS sur les tables principales, les supprimer
-- (Ces politiques ne devraient pas exister mais on nettoie au cas où)

-- Users
DROP POLICY IF EXISTS "Users can access their own data" ON users;
DROP POLICY IF EXISTS "Users can view their team data" ON users; 
DROP POLICY IF EXISTS "Team members can access user data" ON users;

-- Teams  
DROP POLICY IF EXISTS "Users can access their teams" ON teams;
DROP POLICY IF EXISTS "Team members can access team data" ON teams;

-- Team Members
DROP POLICY IF EXISTS "Users can access their team memberships" ON team_members;
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;

-- Buildings
DROP POLICY IF EXISTS "Users can access their team buildings" ON buildings;
DROP POLICY IF EXISTS "Team members can access buildings" ON buildings;

-- Lots
DROP POLICY IF EXISTS "Users can access their team lots" ON lots;  
DROP POLICY IF EXISTS "Team members can access lots" ON lots;

-- Interventions
DROP POLICY IF EXISTS "Users can access their team interventions" ON interventions;
DROP POLICY IF EXISTS "Team members can access interventions" ON interventions;

-- Contacts
DROP POLICY IF EXISTS "Users can access their team contacts" ON contacts;
DROP POLICY IF EXISTS "Team members can access contacts" ON contacts;

-- Building Contacts
DROP POLICY IF EXISTS "Users can access building contacts" ON building_contacts;
DROP POLICY IF EXISTS "Team members can access building contacts" ON building_contacts;

-- Lot Contacts  
DROP POLICY IF EXISTS "Users can access lot contacts" ON lot_contacts;
DROP POLICY IF EXISTS "Team members can access lot contacts" ON lot_contacts;

-- User Invitations
DROP POLICY IF EXISTS "Users can access their invitations" ON user_invitations;
DROP POLICY IF EXISTS "Team members can access invitations" ON user_invitations;

-- Commentaire de nettoyage
COMMENT ON TABLE intervention_documents IS 'Documents et fichiers attachés aux interventions - RLS désactivé pour développement';

-- Afficher l'état final des tables et leurs politiques RLS
SELECT 
    schemaname,
    tablename, 
    rowsecurity,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = pt.tablename) as policy_count
FROM pg_tables pt
WHERE schemaname = 'public' 
AND tablename IN ('users', 'teams', 'team_members', 'buildings', 'lots', 'interventions', 'contacts', 'intervention_documents')
ORDER BY tablename;
