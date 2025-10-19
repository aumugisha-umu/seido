-- Test direct de la nouvelle architecture via SQL

-- Test 1: Vérifier que les tables existent et ont les bonnes colonnes
SELECT 'users table' as test, COUNT(*) as count FROM users;
SELECT 'teams table' as test, COUNT(*) as count FROM teams;
SELECT 'buildings table' as test, COUNT(*) as count FROM buildings;
SELECT 'lots table' as test, COUNT(*) as count FROM lots;
SELECT 'building_contacts table' as test, COUNT(*) as count FROM building_contacts;
SELECT 'lot_contacts table' as test, COUNT(*) as count FROM lot_contacts;
SELECT 'intervention_contacts table' as test, COUNT(*) as count FROMintervention_assignments;

-- Test 2: Vérifier la structure des tables de liaison
\d building_contacts;
\d lot_contacts;

-- Test 3: Test d'une requête avec relation
SELECT 
  b.id,
  b.name,
  bc.contact_type,
  bc.is_primary,
  u.name as contact_name
FROM buildings b
LEFT JOIN building_contacts bc ON b.id = bc.building_id
LEFT JOIN users u ON bc.user_id = u.id
LIMIT 5;
