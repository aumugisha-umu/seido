-- Migration: Rendre la colonne email nullable dans la table users
-- Permet la création de contacts sans email (uniquement avec téléphone)
-- lorsque la case "Inviter ce contact" est décochée

-- Rendre la colonne email nullable
ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;

-- Note: PostgreSQL permet plusieurs NULL dans une contrainte UNIQUE
-- L'index existant sur email fonctionne avec NULL
-- Pas besoin de modifier la contrainte UNIQUE

