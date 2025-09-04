-- =============================================================================
-- SEIDO APP - RLS Security Migration
-- =============================================================================
-- Cette migration active Row Level Security et définit les politiques de base

-- =============================================================================
-- ACTIVER RLS SUR TOUTES LES TABLES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- POLITIQUES POUR LA TABLE USERS
-- =============================================================================

-- Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Les utilisateurs peuvent modifier leur propre profil  
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Les gestionnaires peuvent voir les locataires de leurs bâtiments
CREATE POLICY "Managers can view their tenants" ON users
    FOR SELECT USING (
        role = 'locataire' AND
        EXISTS (
            SELECT 1 FROM users manager, lots
            WHERE manager.id = auth.uid() 
            AND manager.role = 'gestionnaire'
            AND lots.tenant_id = users.id
            AND EXISTS (
                SELECT 1 FROM buildings 
                WHERE buildings.id = lots.building_id 
                AND buildings.manager_id = manager.id
            )
        )
    );

-- =============================================================================
-- POLITIQUES POUR LA TABLE BUILDINGS
-- =============================================================================

-- Les gestionnaires peuvent voir leurs bâtiments
CREATE POLICY "Managers can view their buildings" ON buildings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire' 
            AND users.id = buildings.manager_id
        )
    );

-- Les gestionnaires peuvent modifier leurs bâtiments
CREATE POLICY "Managers can update their buildings" ON buildings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire' 
            AND users.id = buildings.manager_id
        )
    );

-- Les gestionnaires peuvent créer des bâtiments (ils seront automatiquement assignés comme manager)
CREATE POLICY "Managers can create buildings" ON buildings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        )
        AND manager_id = auth.uid()
    );

-- Les admins peuvent tout voir/modifier
CREATE POLICY "Admins can manage all buildings" ON buildings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =============================================================================
-- POLITIQUES POUR LA TABLE LOTS
-- =============================================================================

-- Les gestionnaires peuvent voir les lots de leurs bâtiments
CREATE POLICY "Managers can view lots in their buildings" ON lots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users, buildings
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
            AND buildings.manager_id = users.id
            AND buildings.id = lots.building_id
        )
    );

-- Les locataires peuvent voir leur propre lot
CREATE POLICY "Tenants can view their own lot" ON lots
    FOR SELECT USING (
        tenant_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        )
    );

-- Les gestionnaires peuvent modifier les lots de leurs bâtiments
CREATE POLICY "Managers can update lots in their buildings" ON lots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users, buildings
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
            AND buildings.manager_id = users.id
            AND buildings.id = lots.building_id
        )
    );

-- Les gestionnaires peuvent créer des lots dans leurs bâtiments
CREATE POLICY "Managers can create lots in their buildings" ON lots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users, buildings
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
            AND buildings.manager_id = users.id
            AND buildings.id = lots.building_id
        )
    );

-- Les admins peuvent tout gérer
CREATE POLICY "Admins can manage all lots" ON lots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =============================================================================
-- POLITIQUES POUR LA TABLE CONTACTS
-- =============================================================================

-- Seuls les gestionnaires et admins peuvent voir les contacts
CREATE POLICY "Managers and admins can view contacts" ON contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('gestionnaire', 'admin')
        )
    );

-- Seuls les gestionnaires et admins peuvent modifier les contacts
CREATE POLICY "Managers and admins can manage contacts" ON contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('gestionnaire', 'admin')
        )
    );

-- =============================================================================
-- POLITIQUES POUR LA TABLE BUILDING_CONTACTS
-- =============================================================================

-- Seuls les gestionnaires et admins peuvent gérer les liaisons bâtiments-contacts
CREATE POLICY "Managers and admins can manage building contacts" ON building_contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('gestionnaire', 'admin')
        )
    );

-- =============================================================================
-- POLITIQUES POUR LA TABLE INTERVENTIONS
-- =============================================================================

-- Les locataires peuvent voir leurs propres interventions
CREATE POLICY "Tenants can view their interventions" ON interventions
    FOR SELECT USING (
        tenant_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        )
    );

-- Les locataires peuvent créer des interventions pour leurs lots
CREATE POLICY "Tenants can create interventions for their lots" ON interventions
    FOR INSERT WITH CHECK (
        tenant_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users, lots
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
            AND lots.id = interventions.lot_id
            AND lots.tenant_id = auth.uid()
        )
    );

-- Les locataires peuvent modifier leurs interventions (seulement certains champs)
CREATE POLICY "Tenants can update their interventions" ON interventions
    FOR UPDATE USING (
        tenant_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        )
    );

-- Les gestionnaires peuvent voir les interventions de leurs bâtiments
CREATE POLICY "Managers can view interventions in their buildings" ON interventions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users, buildings, lots
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
            AND buildings.manager_id = users.id
            AND lots.building_id = buildings.id
            AND interventions.lot_id = lots.id
        )
    );

-- Les gestionnaires peuvent modifier les interventions de leurs bâtiments
CREATE POLICY "Managers can update interventions in their buildings" ON interventions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users, buildings, lots
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
            AND buildings.manager_id = users.id
            AND lots.building_id = buildings.id
            AND interventions.lot_id = lots.id
        )
    );

-- Les prestataires peuvent voir les interventions qui leur sont assignées
CREATE POLICY "Providers can view assigned interventions" ON interventions
    FOR SELECT USING (
        assigned_contact_id IN (
            SELECT contacts.id FROM contacts
            WHERE contacts.email = (
                SELECT email FROM users WHERE id = auth.uid()
            )
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'prestataire'
        )
    );

-- Les prestataires peuvent modifier leurs interventions assignées
CREATE POLICY "Providers can update assigned interventions" ON interventions
    FOR UPDATE USING (
        assigned_contact_id IN (
            SELECT contacts.id FROM contacts
            WHERE contacts.email = (
                SELECT email FROM users WHERE id = auth.uid()
            )
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'prestataire'
        )
    );

-- Les admins peuvent tout gérer
CREATE POLICY "Admins can manage all interventions" ON interventions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- =============================================================================
-- FONCTION UTILITAIRE POUR DEBUG
-- =============================================================================

-- Fonction pour vérifier les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION check_user_permissions()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    user_role TEXT,
    can_access_buildings BOOLEAN,
    can_access_lots BOOLEAN,
    can_access_interventions BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.role::TEXT,
        -- Test permissions sur buildings
        CASE 
            WHEN u.role = 'admin' THEN true
            WHEN u.role = 'gestionnaire' THEN EXISTS (
                SELECT 1 FROM buildings b WHERE b.manager_id = u.id
            )
            ELSE false
        END as can_access_buildings,
        -- Test permissions sur lots
        CASE 
            WHEN u.role = 'admin' THEN true
            WHEN u.role = 'gestionnaire' THEN EXISTS (
                SELECT 1 FROM buildings b WHERE b.manager_id = u.id
            )
            WHEN u.role = 'locataire' THEN EXISTS (
                SELECT 1 FROM lots l WHERE l.tenant_id = u.id
            )
            ELSE false
        END as can_access_lots,
        -- Test permissions sur interventions
        CASE 
            WHEN u.role = 'admin' THEN true
            WHEN u.role = 'gestionnaire' THEN EXISTS (
                SELECT 1 FROM buildings b WHERE b.manager_id = u.id
            )
            WHEN u.role = 'locataire' THEN EXISTS (
                SELECT 1 FROM lots l WHERE l.tenant_id = u.id
            )
            WHEN u.role = 'prestataire' THEN EXISTS (
                SELECT 1 FROM contacts c WHERE c.email = u.email
            )
            ELSE false
        END as can_access_interventions
    FROM users u
    WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VALIDATION
-- =============================================================================

-- Commentaire de validation
DO $$
BEGIN
    RAISE NOTICE 'RLS activé avec succès sur toutes les tables !';
    RAISE NOTICE 'Politiques créées pour : users, buildings, lots, contacts, building_contacts, interventions';
    RAISE NOTICE 'Fonction de debug disponible : SELECT * FROM check_user_permissions()';
END $$;
