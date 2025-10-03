-- =============================================================================
-- MIGRATION: Fix missing enum types (user_role, provider_category)
-- =============================================================================
-- Date: 2025-10-02
-- Context: Production logs show errors: "type 'user_role' does not exist"
-- Impact: Triggers/functions and table casts relying on these enums may fail
-- Action: Create enums if missing (idempotent) without altering existing ones
-- =============================================================================

DO $plpgsql$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $sql$
      CREATE TYPE public.user_role AS ENUM (
        'admin',
        'gestionnaire',
        'locataire',
        'prestataire'
      )
    $sql$;
    RAISE NOTICE '✅ Created enum type public.user_role';
  ELSE
    RAISE NOTICE 'ℹ️ Enum type public.user_role already exists';
  END IF;
END
$plpgsql$;

DO $plpgsql$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'provider_category'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $sql$
      CREATE TYPE public.provider_category AS ENUM (
        'prestataire',
        'assurance',
        'notaire',
        'syndic',
        'proprietaire',
        'autre'
      )
    $sql$;
    RAISE NOTICE '✅ Created enum type public.provider_category';
  ELSE
    RAISE NOTICE 'ℹ️ Enum type public.provider_category already exists';
  END IF;
END
$plpgsql$;

-- Optional: re-validate dependent function if needed (kept minimal and safe)
-- Note: Functions and tables referencing these enums will work once types exist.



