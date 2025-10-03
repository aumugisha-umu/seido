-- ============================================
-- 🔍 MIGRATION: Ajouter des logs détaillés au trigger
-- ============================================
-- Date: 2025-10-02
-- Objectif: Diagnostiquer pourquoi le profil n'est pas créé
-- ============================================

-- ============================================
-- 1️⃣ CRÉER UNE TABLE DE LOGS POUR LE TRIGGER
-- ============================================
CREATE TABLE IF NOT EXISTS public.trigger_debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  trigger_name text NOT NULL,
  auth_user_id uuid,
  email text,
  step text NOT NULL,
  status text NOT NULL, -- 'success' | 'error' | 'warning'
  message text,
  metadata jsonb
);

-- Index pour les requêtes rapides
CREATE INDEX IF NOT EXISTS idx_trigger_debug_logs_created_at
  ON public.trigger_debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trigger_debug_logs_auth_user_id
  ON public.trigger_debug_logs(auth_user_id);

-- RLS: Permettre à tout le monde de lire (pour debug), seul le trigger peut écrire
ALTER TABLE public.trigger_debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users"
  ON public.trigger_debug_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 2️⃣ FONCTION HELPER: Loguer les étapes du trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.log_trigger_step(
  p_trigger_name text,
  p_auth_user_id uuid,
  p_email text,
  p_step text,
  p_status text,
  p_message text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.trigger_debug_logs (
    trigger_name,
    auth_user_id,
    email,
    step,
    status,
    message,
    metadata
  ) VALUES (
    p_trigger_name,
    p_auth_user_id,
    p_email,
    p_step,
    p_status,
    p_message,
    p_metadata
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ne pas bloquer le trigger si les logs échouent
    RAISE WARNING 'Failed to log trigger step: %', SQLERRM;
END;
$$;

-- ============================================
-- 3️⃣ REMPLACER LA FONCTION handle_new_user_confirmed AVEC LOGS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_last_name text;
  v_role text;
  v_team_id uuid;
  v_team_name text;
  v_user_name text;
  v_existing_profile_id uuid;
BEGIN
  -- 📊 LOG: Début du trigger
  PERFORM log_trigger_step(
    'on_auth_user_confirmed',
    NEW.id,
    NEW.email,
    'START',
    'success',
    'Trigger started for user confirmation',
    jsonb_build_object(
      'email_confirmed_at', NEW.email_confirmed_at,
      'raw_user_meta_data', NEW.raw_user_meta_data
    )
  );

  -- ✅ ÉTAPE 1: Vérifier si le profil existe déjà
  SELECT id INTO v_existing_profile_id
  FROM public.users
  WHERE auth_user_id = NEW.id;

  IF v_existing_profile_id IS NOT NULL THEN
    PERFORM log_trigger_step(
      'on_auth_user_confirmed',
      NEW.id,
      NEW.email,
      'CHECK_EXISTING',
      'warning',
      'Profile already exists, skipping creation',
      jsonb_build_object('existing_profile_id', v_existing_profile_id)
    );
    RETURN NEW;
  END IF;

  -- 📊 LOG: Profil n'existe pas, continuer
  PERFORM log_trigger_step(
    'on_auth_user_confirmed',
    NEW.id,
    NEW.email,
    'CHECK_EXISTING',
    'success',
    'No existing profile found, proceeding with creation',
    NULL
  );

  -- ✅ ÉTAPE 2: Extraire les métadonnées
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'gestionnaire');

  -- 📊 LOG: Métadonnées extraites
  PERFORM log_trigger_step(
    'on_auth_user_confirmed',
    NEW.id,
    NEW.email,
    'EXTRACT_METADATA',
    'success',
    'Metadata extracted from raw_user_meta_data',
    jsonb_build_object(
      'first_name', v_first_name,
      'last_name', v_last_name,
      'role', v_role
    )
  );

  -- ✅ Validation des données requises
  IF v_first_name = '' OR v_last_name = '' THEN
    PERFORM log_trigger_step(
      'on_auth_user_confirmed',
      NEW.id,
      NEW.email,
      'VALIDATE_METADATA',
      'error',
      'Missing required metadata: first_name or last_name is empty',
      jsonb_build_object(
        'first_name', v_first_name,
        'last_name', v_last_name
      )
    );
    RAISE EXCEPTION 'Missing required user metadata: first_name or last_name';
  END IF;

  -- 📊 LOG: Validation OK
  PERFORM log_trigger_step(
    'on_auth_user_confirmed',
    NEW.id,
    NEW.email,
    'VALIDATE_METADATA',
    'success',
    'Metadata validation passed',
    NULL
  );

  -- ✅ ÉTAPE 3: Vérifier si team_id existe dans metadata
  IF NEW.raw_user_meta_data ? 'team_id' AND
     (NEW.raw_user_meta_data->>'team_id') IS NOT NULL AND
     (NEW.raw_user_meta_data->>'team_id') != '' THEN
    -- Team ID fourni (invitation)
    v_team_id := (NEW.raw_user_meta_data->>'team_id')::uuid;

    PERFORM log_trigger_step(
      'on_auth_user_confirmed',
      NEW.id,
      NEW.email,
      'TEAM_ASSIGNMENT',
      'success',
      'Team ID provided in metadata (invitation flow)',
      jsonb_build_object('team_id', v_team_id)
    );
  ELSE
    -- Pas de team_id → créer une nouvelle équipe (signup)
    v_team_name := v_first_name || ' ' || v_last_name || '''s Team';

    BEGIN
      INSERT INTO public.teams (name)
      VALUES (v_team_name)
      RETURNING id INTO v_team_id;

      PERFORM log_trigger_step(
        'on_auth_user_confirmed',
        NEW.id,
        NEW.email,
        'CREATE_TEAM',
        'success',
        'New team created successfully',
        jsonb_build_object(
          'team_id', v_team_id,
          'team_name', v_team_name
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        PERFORM log_trigger_step(
          'on_auth_user_confirmed',
          NEW.id,
          NEW.email,
          'CREATE_TEAM',
          'error',
          'Failed to create team: ' || SQLERRM,
          jsonb_build_object(
            'team_name', v_team_name,
            'sqlstate', SQLSTATE
          )
        );
        RAISE;
    END;
  END IF;

  -- ✅ ÉTAPE 4: Créer le profil utilisateur
  v_user_name := v_first_name || ' ' || v_last_name;

  BEGIN
    INSERT INTO public.users (
      auth_user_id,
      email,
      name,
      role,
      team_id,
      avatar_url,
      phone
    ) VALUES (
      NEW.id,
      NEW.email,
      v_user_name,
      v_role,
      v_team_id,
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'phone'
    );

    PERFORM log_trigger_step(
      'on_auth_user_confirmed',
      NEW.id,
      NEW.email,
      'CREATE_PROFILE',
      'success',
      'User profile created successfully',
      jsonb_build_object(
        'user_name', v_user_name,
        'role', v_role,
        'team_id', v_team_id
      )
    );
  EXCEPTION
    WHEN unique_violation THEN
      PERFORM log_trigger_step(
        'on_auth_user_confirmed',
        NEW.id,
        NEW.email,
        'CREATE_PROFILE',
        'error',
        'Unique constraint violation (duplicate profile): ' || SQLERRM,
        jsonb_build_object(
          'constraint_name', CONSTRAINT_NAME,
          'sqlstate', SQLSTATE
        )
      );
      RAISE;
    WHEN foreign_key_violation THEN
      PERFORM log_trigger_step(
        'on_auth_user_confirmed',
        NEW.id,
        NEW.email,
        'CREATE_PROFILE',
        'error',
        'Foreign key violation (invalid team_id?): ' || SQLERRM,
        jsonb_build_object(
          'team_id', v_team_id,
          'sqlstate', SQLSTATE
        )
      );
      RAISE;
    WHEN not_null_violation THEN
      PERFORM log_trigger_step(
        'on_auth_user_confirmed',
        NEW.id,
        NEW.email,
        'CREATE_PROFILE',
        'error',
        'NOT NULL constraint violation: ' || SQLERRM,
        jsonb_build_object(
          'column_name', COLUMN_NAME,
          'sqlstate', SQLSTATE
        )
      );
      RAISE;
    WHEN OTHERS THEN
      PERFORM log_trigger_step(
        'on_auth_user_confirmed',
        NEW.id,
        NEW.email,
        'CREATE_PROFILE',
        'error',
        'Unexpected error creating profile: ' || SQLERRM,
        jsonb_build_object(
          'sqlstate', SQLSTATE,
          'sqlerrm', SQLERRM
        )
      );
      RAISE;
  END;

  -- 📊 LOG: Succès complet
  PERFORM log_trigger_step(
    'on_auth_user_confirmed',
    NEW.id,
    NEW.email,
    'COMPLETE',
    'success',
    'Trigger completed successfully',
    jsonb_build_object(
      'profile_created', true,
      'team_id', v_team_id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- ❌ LOG: Erreur fatale
    PERFORM log_trigger_step(
      'on_auth_user_confirmed',
      NEW.id,
      NEW.email,
      'FATAL_ERROR',
      'error',
      'Trigger failed with fatal error: ' || SQLERRM,
      jsonb_build_object(
        'sqlstate', SQLSTATE,
        'sqlerrm', SQLERRM
      )
    );

    -- ⚠️ IMPORTANT: Ne pas bloquer l'authentification
    -- L'utilisateur peut se connecter même si le profil échoue
    -- L'admin peut créer le profil manuellement après
    RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

-- ============================================
-- 4️⃣ RECRÉER LE TRIGGER (au cas où)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (
    OLD.email_confirmed_at IS NULL
    AND NEW.email_confirmed_at IS NOT NULL
  )
  EXECUTE FUNCTION public.handle_new_user_confirmed();

-- ============================================
-- 5️⃣ FONCTION HELPER: Voir les logs récents
-- ============================================
COMMENT ON TABLE public.trigger_debug_logs IS
  'Logs de debug pour diagnostiquer les problèmes de triggers. Voir les logs récents avec: SELECT * FROM public.view_recent_trigger_logs();';

CREATE OR REPLACE FUNCTION public.view_recent_trigger_logs(
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  created_at timestamptz,
  email text,
  step text,
  status text,
  message text,
  metadata jsonb
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    created_at,
    email,
    step,
    status,
    message,
    metadata
  FROM public.trigger_debug_logs
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- ============================================
-- 📊 COMMENT L'UTILISER
-- ============================================
-- Après avoir déployé cette migration:
-- 1. Créez un nouveau compte test via signup
-- 2. Confirmez l'email
-- 3. Exécutez cette requête pour voir les logs:
--    SELECT * FROM public.view_recent_trigger_logs();
-- 4. Les logs montreront exactement où le trigger échoue
