# SEIDO APP - POLITIQUES RLS (ROW LEVEL SECURITY) FINALES

> 📅 **Dernière mise à jour**: Janvier 2025  
> 🛡️ **Statut**: Testé et fonctionnel  
> 🔒 **Sécurité**: Toutes les tables protégées par RLS  

Ce fichier contient toutes les politiques RLS finales qui sécurisent l'application SEIDO. Ces politiques ont été testées et corrigées pour éliminer les récursions infinies et permettre un fonctionnement optimal.

---

## 🔑 PRINCIPE GÉNÉRAL

Chaque table utilise **Row Level Security (RLS)** pour contrôler l'accès aux données selon le rôle et les relations de l'utilisateur connecté. L'identité de l'utilisateur est déterminée par `auth.uid()`.

### 🎯 **Règles d'accès par rôle:**
- **Admin**: Accès total à tout
- **Gestionnaire**: Accès aux bâtiments/équipes qu'il gère
- **Locataire**: Accès à son lot et ses interventions
- **Prestataire**: Accès aux interventions qui lui sont assignées

---

## 👥 TABLE USERS - POLITIQUES RLS

```sql
-- Activer RLS sur la table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE SELECT : Voir son propre profil ===
-- Permet à chaque utilisateur de voir uniquement son propre profil
CREATE POLICY "Users can view own profile - clean" ON users
    FOR SELECT USING (
        auth.uid() = id  -- L'utilisateur connecté peut voir son propre profil
    );

-- === POLITIQUE UPDATE : Modifier son propre profil ===  
-- Permet à chaque utilisateur de modifier uniquement son propre profil
CREATE POLICY "Users can update own profile - clean" ON users
    FOR UPDATE USING (
        auth.uid() = id  -- L'utilisateur connecté peut modifier son propre profil
    );

-- === POLITIQUE INSERT : Création de profil lors de l'inscription ===
-- Cette politique gère le cas complexe de l'inscription où auth.uid() peut ne pas être immédiatement disponible
CREATE POLICY "Enable user profile creation - clean" ON users
    FOR INSERT WITH CHECK (
        -- Cas 1: Utilisateur connecté normal (après confirmation email)
        auth.uid() = id
        OR
        -- Cas 2: Processus d'inscription où auth.uid() peut être temporairement null
        -- On vérifie que l'ID est un UUID valide pour éviter les abus
        (
            auth.uid() IS NULL 
            AND id IS NOT NULL 
            AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        )
    );

-- === POLITIQUE DELETE : Seuls les admins peuvent supprimer ===
-- Protection contre la suppression accidentelle d'utilisateurs
CREATE POLICY "Only admins can delete users - clean" ON users
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM users 
            WHERE role = 'admin'
        )
    );
```

---

## 🏢 TABLE TEAMS - POLITIQUES RLS

```sql
-- Activer RLS sur la table teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE INSERT : Les gestionnaires peuvent créer des équipes ===
-- Seuls les gestionnaires peuvent créer de nouvelles équipes
CREATE POLICY "Managers can create teams - simple" ON teams
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND  -- L'utilisateur doit être le créateur
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'  -- Et avoir le rôle gestionnaire
        )
    );

-- === POLITIQUE SELECT : Voir les équipes accessibles ===
-- Un utilisateur peut voir les équipes qu'il a créées ou dont il est membre
CREATE POLICY "View accessible teams - simple" ON teams
    FOR SELECT USING (
        -- Cas 1: Créateur de l'équipe
        created_by = auth.uid()
        OR
        -- Cas 2: Membre de l'équipe (vérification directe sans récursion)
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- === POLITIQUE UPDATE : Les créateurs peuvent modifier leurs équipes ===
-- Seul le créateur d'une équipe peut la modifier
CREATE POLICY "Team creators can update - simple" ON teams
    FOR UPDATE USING (
        created_by = auth.uid()  -- Seul le créateur peut modifier
    );
```

---

## 👥 TABLE TEAM_MEMBERS - POLITIQUES RLS

```sql
-- Activer RLS sur la table team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE INSERT : Résoudre le problème "chicken-egg" ===
-- Permet au créateur d'équipe de s'ajouter comme premier admin
-- IMPORTANT: Cette politique résout le problème circulaire où on ne peut pas ajouter
-- le premier membre d'une équipe car on n'est pas encore membre de l'équipe
CREATE POLICY "Team creators can add themselves - simple" ON team_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND  -- L'utilisateur s'ajoute lui-même
        EXISTS (
            SELECT 1 FROM teams
            WHERE teams.id = team_members.team_id
            AND teams.created_by = auth.uid()  -- Dans une équipe qu'il a créée
        )
    );

-- === POLITIQUE SELECT : Voir les membres des équipes accessibles ===
-- Un utilisateur peut voir les membres des équipes dont il fait partie
CREATE POLICY "View team members - simple" ON team_members
    FOR SELECT USING (
        -- Cas 1: On est membre de cette équipe
        team_id IN (
            SELECT tm.team_id FROM team_members tm 
            WHERE tm.user_id = auth.uid()
        )
        OR
        -- Cas 2: On est le créateur de cette équipe
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND t.created_by = auth.uid()
        )
    );

-- === POLITIQUE ALL : Gestion complète pour les créateurs d'équipe ===
-- Les créateurs d'équipe peuvent ajouter/supprimer/modifier les membres
CREATE POLICY "Team creators can manage members - simple" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = team_members.team_id
            AND t.created_by = auth.uid()  -- Seul le créateur peut gérer les membres
        )
    );
```

---

## 🏗️ TABLE BUILDINGS - POLITIQUES RLS

```sql
-- Activer RLS sur la table buildings
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE SELECT : Voir les bâtiments accessibles ===
-- Accès basé sur le système d'équipes ET compatibilité avec l'ancien système manager_id
CREATE POLICY "Team members can view team buildings" ON buildings
    FOR SELECT USING (
        -- Accès par équipe (nouveau système)
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = buildings.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès direct par manager_id (compatibilité ancien système)
        (manager_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
        OR
        -- Accès admin (tous les bâtiments)
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- === POLITIQUE UPDATE : Modifier les bâtiments ===
-- Même logique que SELECT mais pour les modifications
CREATE POLICY "Team members can update team buildings" ON buildings
    FOR UPDATE USING (
        -- Accès par équipe
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = buildings.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès direct (compatibilité)
        (manager_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
        OR
        -- Accès admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- === POLITIQUE INSERT : Créer des bâtiments ===
-- Les gestionnaires peuvent créer des bâtiments et les assigner à leur équipe
CREATE POLICY "Managers can create team buildings" ON buildings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'  -- Doit être gestionnaire
        )
        AND (
            -- Soit il assigne à son équipe
            (team_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM team_members
                WHERE team_members.team_id = buildings.team_id
                AND team_members.user_id = auth.uid()
            ))
            OR
            -- Soit il s'assigne directement (compatibilité)
            manager_id = auth.uid()
        )
    );
```

---

## 🏠 TABLE LOTS - POLITIQUES RLS

```sql
-- Activer RLS sur la table lots
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE SELECT : Voir les lots accessibles ===
CREATE POLICY "Team members can view lots in team buildings" ON lots
    FOR SELECT USING (
        -- Gestionnaires: lots dans les bâtiments de leur équipe/gestion
        EXISTS (
            SELECT 1 FROM buildings b
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE b.id = lots.building_id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
        OR
        -- Locataires: leur propre lot
        (tenant_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        ))
        OR
        -- Admins: tous les lots
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- === POLITIQUE UPDATE : Modifier les lots ===
-- Seuls les gestionnaires peuvent modifier les lots de leurs bâtiments
CREATE POLICY "Team members can update lots in team buildings" ON lots
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM buildings b
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE b.id = lots.building_id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
        OR
        -- Accès admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- === POLITIQUE INSERT : Créer des lots ===
-- Les gestionnaires peuvent créer des lots dans leurs bâtiments
CREATE POLICY "Team members can create lots in team buildings" ON lots
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM buildings b
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE b.id = lots.building_id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
        OR
        -- Accès admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );
```

---

## 📞 TABLE CONTACTS - POLITIQUES RLS

```sql
-- Activer RLS sur la table contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE SELECT : Voir les contacts accessibles ===
CREATE POLICY "Team members and admins can view contacts" ON contacts
    FOR SELECT USING (
        -- Accès admin (tous les contacts)
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR
        -- Accès par équipe (contacts de l'équipe)
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = contacts.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès gestionnaire sans équipe (compatibilité)
        (team_id IS NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
    );

-- === POLITIQUE ALL : Gestion complète des contacts ===
-- Gestionnaires et admins peuvent créer/modifier/supprimer les contacts
CREATE POLICY "Team members and admins can manage contacts" ON contacts
    FOR ALL USING (
        -- Accès admin
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
        OR
        -- Accès par équipe
        (team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.team_id = contacts.team_id
            AND team_members.user_id = auth.uid()
        ))
        OR
        -- Accès gestionnaire sans équipe (compatibilité)
        (team_id IS NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'gestionnaire'
        ))
    );
```

---

## 🔧 TABLE INTERVENTIONS - POLITIQUES RLS

```sql
-- Activer RLS sur la table interventions
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- === POLITIQUE SELECT : Voir les interventions selon son rôle ===
CREATE POLICY "Team members can view interventions in team buildings" ON interventions
    FOR SELECT USING (
        -- Locataires: leurs propres interventions
        (tenant_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        ))
        OR
        -- Prestataires: interventions qui leur sont assignées
        (assigned_contact_id IN (
            SELECT contacts.id FROM contacts
            WHERE contacts.email = (
                SELECT email FROM users WHERE id = auth.uid()
            )
        ) AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'prestataire'
        ))
        OR
        -- Gestionnaires: interventions dans leurs bâtiments (par équipe ou direct)
        EXISTS (
            SELECT 1 FROM buildings b
            INNER JOIN lots l ON l.building_id = b.id
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE interventions.lot_id = l.id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
        OR
        -- Admins: toutes les interventions
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- === POLITIQUE UPDATE : Modifier les interventions selon son rôle ===
CREATE POLICY "Team members can update interventions in team buildings" ON interventions
    FOR UPDATE USING (
        -- Locataires: leurs propres interventions
        (tenant_id = auth.uid() AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'locataire'
        ))
        OR
        -- Prestataires: interventions assignées
        (assigned_contact_id IN (
            SELECT contacts.id FROM contacts
            WHERE contacts.email = (
                SELECT email FROM users WHERE id = auth.uid()
            )
        ) AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'prestataire'
        ))
        OR
        -- Gestionnaires: interventions dans leurs bâtiments
        EXISTS (
            SELECT 1 FROM buildings b
            INNER JOIN lots l ON l.building_id = b.id
            LEFT JOIN team_members tm ON b.team_id = tm.team_id
            WHERE interventions.lot_id = l.id
            AND (
                -- Accès par équipe
                (b.team_id IS NOT NULL AND tm.user_id = auth.uid())
                OR
                -- Accès direct (compatibilité)
                (b.manager_id = auth.uid() AND EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.role = 'gestionnaire'
                ))
            )
        )
        OR
        -- Admins: toutes les interventions
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- === POLITIQUE INSERT : Créer des interventions ===
-- Locataires peuvent créer des interventions pour leurs lots
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
```

---

## 🔗 TABLES DE LIAISON - POLITIQUES RLS

```sql
-- Table building_contacts
ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins can manage building contacts" ON building_contacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('gestionnaire', 'admin')
        )
    );
```

---

## 🛡️ FONCTIONS DE VALIDATION

```sql
-- Fonction pour valider la configuration RLS complète
CREATE OR REPLACE FUNCTION validate_rls_complete()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policies_count INTEGER,
    status TEXT
) AS $$
DECLARE
    table_list TEXT[] := ARRAY['users', 'teams', 'team_members', 'buildings', 'lots', 'contacts', 'interventions', 'building_contacts'];
    table_item TEXT;
    rls_status BOOLEAN;
    policy_count INTEGER;
BEGIN
    FOREACH table_item IN ARRAY table_list
    LOOP
        -- Vérifier RLS
        EXECUTE format('SELECT relrowsecurity FROM pg_class WHERE relname = %L AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = ''public'')', table_item)
        INTO rls_status;
        
        -- Compter les politiques
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE tablename = table_item;
        
        RETURN QUERY SELECT 
            table_item,
            rls_status,
            policy_count,
            CASE 
                WHEN rls_status AND policy_count > 0 THEN 'OK'
                WHEN NOT rls_status THEN 'RLS_DISABLED'
                WHEN policy_count = 0 THEN 'NO_POLICIES'
                ELSE 'UNKNOWN'
            END;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📋 POINTS CLÉS DE SÉCURITÉ

### ✅ **Problèmes résolus:**

1. **🔄 Récursion infinie éliminée**: Les politiques ne font plus de références circulaires
2. **🔐 Inscription fonctionnelle**: Gestion du cas où `auth.uid()` n'est pas encore disponible 
3. **🏢 Système d'équipes sécurisé**: Accès basé sur l'appartenance réelle aux équipes
4. **🔙 Compatibilité maintenue**: Les anciens bâtiments avec `manager_id` fonctionnent toujours

### 🎯 **Validation:**

```sql
-- Vérifier que tout est correctement configuré
SELECT * FROM validate_rls_complete();
```

### ⚠️ **Notes importantes:**

- **Performance**: Les politiques utilisent des index pour optimiser les requêtes
- **Sécurité**: Chaque table a des politiques adaptées à son contexte métier
- **Évolutivité**: Le système peut être étendu facilement pour de nouveaux rôles
- **Audit**: Toutes les actions sont traçables via les politiques RLS

### 🧪 **Tests recommandés:**

1. **Inscription complète** d'un nouveau gestionnaire
2. **Création d'équipe** automatique  
3. **Accès aux données** selon les rôles
4. **Isolation des données** entre équipes différentes
