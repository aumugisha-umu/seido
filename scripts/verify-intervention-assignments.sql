-- Verify intervention assignments for the created intervention
SELECT
    ia.*,
    u.name as user_name,
    u.email as user_email,
    u.role as user_role
FROM intervention_assignments ia
JOIN users u ON u.id = ia.user_id
WHERE ia.intervention_id = '2245179e-ef11-44e2-91b7-e613ff23ee2'
ORDER BY ia.assigned_at;

-- Check if the gestionnaire can see interventions through team_id
SELECT
    i.id,
    i.reference,
    i.title,
    i.team_id,
    i.status,
    i.created_at
FROM interventions i
WHERE i.id = '2245179e-ef11-44e2-91b7-e613ff23ee2';

-- Check what team the gestionnaire belongs to
SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.team_id
FROM users u
WHERE u.email = 'robert.dupont@gmail.com'; -- The gestionnaire email from previous context