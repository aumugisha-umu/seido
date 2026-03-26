-- =============================================================================
-- Migration: search_global RPC function
-- Description: Cross-table full-text search for the Cmd+K command palette.
--   Hybrid strategy:
--     - FTS (to_tsquery with :* prefix) for large tables with GIN indexes
--     - ILIKE for small per-team tables (contacts, lots, buildings, contracts)
--   Single RPC = 1 DB round-trip. Each branch LIMIT 5, total LIMIT 25.
--
--   NOTE: RETURNS TABLE creates PL/pgSQL variables (entity_type, title, rank…)
--   that collide with column aliases. All ORDER BY use positional refs (6 = rank)
--   and the outer wrapper qualifies with _r.* to avoid ambiguity.
-- =============================================================================

CREATE OR REPLACE FUNCTION search_global(
  p_query TEXT,
  p_team_id UUID
)
RETURNS TABLE(
  entity_type TEXT,
  entity_id UUID,
  title TEXT,
  subtitle TEXT,
  url TEXT,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ilike_pattern TEXT;
  v_tsquery TSQUERY;
  v_has_tsquery BOOLEAN := FALSE;
BEGIN
  -- Guard: minimum 2 characters
  IF length(trim(p_query)) < 2 THEN
    RETURN;
  END IF;

  -- Guard: caller must belong to the requested team (SECURITY DEFINER bypasses RLS)
  IF NOT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1)
      AND team_id = p_team_id
      AND left_at IS NULL
  ) THEN
    RETURN;
  END IF;

  -- Prepare ILIKE pattern (escape SQL wildcards % and _ from user input, also backslash)
  v_ilike_pattern := '%' || replace(replace(replace(trim(p_query), '\', ''), '%', ''), '_', '') || '%';

  -- Prepare FTS tsquery (only for 3+ chars, avoids noise on short queries)
  IF length(trim(p_query)) >= 3 THEN
    BEGIN
      -- plainto_tsquery splits on spaces, :* adds prefix matching
      -- e.g. "fuite eau" → 'fuit' & 'eau':*
      v_tsquery := to_tsquery('french',
        array_to_string(
          array(
            SELECT unnest(string_to_array(trim(p_query), ' ')) || ':*'
          ),
          ' & '
        )
      );
      v_has_tsquery := TRUE;
    EXCEPTION WHEN OTHERS THEN
      -- Invalid tsquery (special chars) → fall back to ILIKE only
      v_has_tsquery := FALSE;
    END;
  END IF;

  -- Wrap in subquery _r(c1..c6) to avoid RETURNS TABLE variable name collisions.
  -- Renamed columns avoid ambiguity; RETURN QUERY maps to RETURNS TABLE by position.
  RETURN QUERY
  SELECT _r.c1::TEXT, _r.c2, _r.c3::TEXT, _r.c4::TEXT, _r.c5::TEXT, _r.c6::REAL FROM (

  -- ═══════════════════════════════════════════════════════════════════════
  -- 1. INTERVENTIONS — FTS (GIN index: idx_interventions_search) + ILIKE on reference
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'intervention'::TEXT,
      i.id,
      i.title,
      COALESCE(i.reference, ''),
      '/gestionnaire/operations/interventions/' || i.id,
      CASE
        WHEN v_has_tsquery AND to_tsvector('french', i.title || ' ' || i.description) @@ v_tsquery
          THEN ts_rank(to_tsvector('french', i.title || ' ' || i.description), v_tsquery)
        WHEN i.reference ILIKE v_ilike_pattern THEN 0.9::REAL
        ELSE 0.3::REAL
      END
    FROM interventions i
    WHERE i.team_id = p_team_id
      AND i.deleted_at IS NULL
      AND (
        (v_has_tsquery AND to_tsvector('french', i.title || ' ' || i.description) @@ v_tsquery)
        OR i.reference ILIKE v_ilike_pattern
        OR i.title ILIKE v_ilike_pattern
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 2. CONTACTS (users table) — ILIKE on name, email, phone
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'contact'::TEXT,
      u.id,
      COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Contact'),
      COALESCE(u.role::TEXT, '') || CASE WHEN u.email IS NOT NULL THEN ' · ' || u.email ELSE '' END,
      '/gestionnaire/contacts/details/' || u.id,
      CASE
        WHEN (u.first_name || ' ' || u.last_name) ILIKE v_ilike_pattern THEN 0.8::REAL
        WHEN u.email ILIKE v_ilike_pattern THEN 0.7::REAL
        WHEN u.phone ILIKE v_ilike_pattern THEN 0.6::REAL
        ELSE 0.3::REAL
      END
    FROM users u
    INNER JOIN team_members tm ON tm.user_id = u.id AND tm.team_id = p_team_id AND tm.left_at IS NULL
    WHERE u.deleted_at IS NULL
      AND (
        (u.first_name || ' ' || u.last_name) ILIKE v_ilike_pattern
        OR u.email ILIKE v_ilike_pattern
        OR u.phone ILIKE v_ilike_pattern
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 3. LOTS — ILIKE on reference + joined building name + address
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'lot'::TEXT,
      l.id,
      COALESCE(l.reference, 'Lot'),
      COALESCE(b.name, '') || CASE WHEN a_lot.city IS NOT NULL THEN ' · ' || a_lot.city ELSE '' END,
      '/gestionnaire/biens/lots/' || l.id,
      CASE
        WHEN l.reference ILIKE v_ilike_pattern THEN 0.8::REAL
        ELSE 0.4::REAL
      END
    FROM lots l
    LEFT JOIN buildings b ON l.building_id = b.id
    LEFT JOIN addresses a_lot ON l.address_id = a_lot.id
    WHERE l.team_id = p_team_id
      AND l.deleted_at IS NULL
      AND (
        l.reference ILIKE v_ilike_pattern
        OR COALESCE(b.name, '') ILIKE v_ilike_pattern
        OR COALESCE(a_lot.street, '') ILIKE v_ilike_pattern
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 4. BUILDINGS — ILIKE on name, address, city
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'building'::TEXT,
      b.id,
      b.name,
      COALESCE(a_bld.street, '') || CASE WHEN a_bld.city IS NOT NULL THEN ', ' || a_bld.city ELSE '' END,
      '/gestionnaire/biens/immeubles/' || b.id,
      CASE
        WHEN b.name ILIKE v_ilike_pattern THEN 0.8::REAL
        WHEN COALESCE(a_bld.street, '') ILIKE v_ilike_pattern THEN 0.6::REAL
        WHEN COALESCE(a_bld.city, '') ILIKE v_ilike_pattern THEN 0.5::REAL
        ELSE 0.3::REAL
      END
    FROM buildings b
    LEFT JOIN addresses a_bld ON b.address_id = a_bld.id
    WHERE b.team_id = p_team_id
      AND b.deleted_at IS NULL
      AND (
        b.name ILIKE v_ilike_pattern
        OR COALESCE(a_bld.street, '') ILIKE v_ilike_pattern
        OR COALESCE(a_bld.city, '') ILIKE v_ilike_pattern
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 5. CONTRACTS — ILIKE on title + tenant name via contract_contacts
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'contract'::TEXT,
      c.id,
      c.title,
      c.contract_type::TEXT || ' · ' || c.status::TEXT,
      '/gestionnaire/contrats/' || c.id,
      CASE
        WHEN c.title ILIKE v_ilike_pattern THEN 0.8::REAL
        ELSE 0.4::REAL
      END
    FROM contracts c
    WHERE c.team_id = p_team_id
      AND c.deleted_at IS NULL
      AND (
        c.title ILIKE v_ilike_pattern
        OR EXISTS (
          SELECT 1 FROM contract_contacts cc
          INNER JOIN users u ON cc.user_id = u.id
          WHERE cc.contract_id = c.id
            AND (u.first_name || ' ' || u.last_name) ILIKE v_ilike_pattern
        )
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 6. EMAILS — FTS on search_vector (GIN index: idx_emails_search_vector)
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'email'::TEXT,
      e.id,
      COALESCE(e.subject, '(Sans objet)'),
      COALESCE(e.from_address, ''),
      '/gestionnaire/mail?email=' || e.id,
      CASE
        WHEN v_has_tsquery AND e.search_vector @@ v_tsquery
          THEN ts_rank(e.search_vector, v_tsquery)
        ELSE 0.3::REAL
      END
    FROM emails e
    WHERE e.team_id = p_team_id
      AND e.deleted_at IS NULL
      AND (
        (v_has_tsquery AND e.search_vector @@ v_tsquery)
        OR e.subject ILIKE v_ilike_pattern
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 7. CONVERSATIONS — FTS on message content (GIN: idx_messages_search)
  --    Returns the thread (not the message) for navigation
  --    Uses DISTINCT ON to deduplicate by thread, then re-sorts by rank
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT _d.et, _d.eid, _d.t, _d.st, _d.u, _d.r
    FROM (
      SELECT DISTINCT ON (ct.id)
        'conversation'::TEXT AS et,
        ct.id AS eid,
        COALESCE(ct.title, 'Conversation') AS t,
        COALESCE(iv.title, '') || ' · ' || left(cm.content, 60) AS st,
        '/gestionnaire/operations/interventions/' || ct.intervention_id AS u,
        CASE
          WHEN v_has_tsquery AND to_tsvector('french', cm.content) @@ v_tsquery
            THEN ts_rank(to_tsvector('french', cm.content), v_tsquery)
          ELSE 0.3::REAL
        END AS r
      FROM conversation_threads ct
      INNER JOIN conversation_messages cm ON cm.thread_id = ct.id
      INNER JOIN interventions iv ON iv.id = ct.intervention_id
      WHERE ct.team_id = p_team_id
        AND cm.deleted_at IS NULL
        AND ct.intervention_id IS NOT NULL
        AND (
          (v_has_tsquery AND to_tsvector('french', cm.content) @@ v_tsquery)
          OR cm.content ILIKE v_ilike_pattern
        )
      ORDER BY ct.id, 6 DESC
    ) _d
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 8. REMINDERS (rappels) — ILIKE on title, description
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT
      'reminder'::TEXT,
      r.id,
      r.title,
      COALESCE(r.status, '') || CASE WHEN r.priority IS NOT NULL THEN ' · ' || r.priority ELSE '' END,
      '/gestionnaire/operations/rappels/' || r.id,
      CASE
        WHEN r.title ILIKE v_ilike_pattern THEN 0.8::REAL
        WHEN r.description ILIKE v_ilike_pattern THEN 0.5::REAL
        ELSE 0.3::REAL
      END
    FROM reminders r
    WHERE r.team_id = p_team_id
      AND r.deleted_at IS NULL
      AND (
        r.title ILIKE v_ilike_pattern
        OR COALESCE(r.description, '') ILIKE v_ilike_pattern
      )
    ORDER BY 6 DESC
    LIMIT 5
  )

  UNION ALL

  -- ═══════════════════════════════════════════════════════════════════════
  -- 9. DOCUMENTS — ILIKE on filename across 4 document tables
  --    Subtitle shows the linked entity name for context
  -- ═══════════════════════════════════════════════════════════════════════
  (
    SELECT * FROM (
      -- 9a. Property documents (building)
      (SELECT
        'document'::TEXT,
        pd.id,
        COALESCE(pd.title, pd.original_filename, 'Document'),
        'Immeuble · ' || COALESCE(b.name, ''),
        '/gestionnaire/biens/immeubles/' || pd.building_id,
        CASE WHEN COALESCE(pd.title, pd.original_filename, '') ILIKE v_ilike_pattern THEN 0.7::REAL ELSE 0.3::REAL END
      FROM property_documents pd
      INNER JOIN buildings b ON b.id = pd.building_id
      WHERE pd.team_id = p_team_id
        AND pd.deleted_at IS NULL
        AND pd.building_id IS NOT NULL
        AND (
          COALESCE(pd.title, '') ILIKE v_ilike_pattern
          OR pd.original_filename ILIKE v_ilike_pattern
        )
      ORDER BY 6 DESC
      LIMIT 5)

      UNION ALL

      -- 9b. Property documents (lot)
      (SELECT
        'document'::TEXT,
        pd.id,
        COALESCE(pd.title, pd.original_filename, 'Document'),
        'Lot · ' || COALESCE(l.reference, ''),
        '/gestionnaire/biens/lots/' || pd.lot_id,
        CASE WHEN COALESCE(pd.title, pd.original_filename, '') ILIKE v_ilike_pattern THEN 0.7::REAL ELSE 0.3::REAL END
      FROM property_documents pd
      INNER JOIN lots l ON l.id = pd.lot_id
      WHERE pd.team_id = p_team_id
        AND pd.deleted_at IS NULL
        AND pd.lot_id IS NOT NULL
        AND (
          COALESCE(pd.title, '') ILIKE v_ilike_pattern
          OR pd.original_filename ILIKE v_ilike_pattern
        )
      ORDER BY 6 DESC
      LIMIT 5)

      UNION ALL

      -- 9c. Intervention documents
      (SELECT
        'document'::TEXT,
        id2.id,
        COALESCE(id2.original_filename, 'Document'),
        'Intervention · ' || COALESCE(iv.title, ''),
        '/gestionnaire/operations/interventions/' || id2.intervention_id,
        CASE WHEN COALESCE(id2.original_filename, '') ILIKE v_ilike_pattern THEN 0.7::REAL ELSE 0.3::REAL END
      FROM intervention_documents id2
      INNER JOIN interventions iv ON iv.id = id2.intervention_id
      WHERE id2.team_id = p_team_id
        AND id2.deleted_at IS NULL
        AND (
          COALESCE(id2.description, '') ILIKE v_ilike_pattern
          OR id2.original_filename ILIKE v_ilike_pattern
        )
      ORDER BY 6 DESC
      LIMIT 5)

      UNION ALL

      -- 9d. Contract documents
      (SELECT
        'document'::TEXT,
        cd.id,
        COALESCE(cd.title, cd.original_filename, 'Document'),
        'Contrat · ' || COALESCE(c.title, ''),
        '/gestionnaire/contrats/' || cd.contract_id,
        CASE WHEN COALESCE(cd.title, cd.original_filename, '') ILIKE v_ilike_pattern THEN 0.7::REAL ELSE 0.3::REAL END
      FROM contract_documents cd
      INNER JOIN contracts c ON c.id = cd.contract_id
      WHERE cd.team_id = p_team_id
        AND cd.deleted_at IS NULL
        AND (
          COALESCE(cd.title, '') ILIKE v_ilike_pattern
          OR cd.original_filename ILIKE v_ilike_pattern
        )
      ORDER BY 6 DESC
      LIMIT 5)
    ) _docs
    ORDER BY 6 DESC
    LIMIT 5
  )

  ) _r(c1, c2, c3, c4, c5, c6)
  ORDER BY _r.c6 DESC
  LIMIT 25;

END;
$$;

-- Grant access to authenticated users (called via supabase.rpc())
GRANT EXECUTE ON FUNCTION search_global(TEXT, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION search_global IS 'Global cross-entity search for the Cmd+K command palette. Hybrid FTS+ILIKE strategy. Returns max 25 results (5 per entity type).';
