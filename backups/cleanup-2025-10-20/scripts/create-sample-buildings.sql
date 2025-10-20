-- Script pour créer des données de test buildings/lots
-- Équipe ID utilisée dans les logs: 8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c

-- Vérifier d'abord si des buildings existent déjà
SELECT count(*) as total_buildings FROM buildings;
SELECT count(*) as buildings_for_team FROM buildings WHERE team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c';

-- Créer des buildings de test pour l'équipe si aucun n'existe
INSERT INTO buildings (name, address, city, postal_code, team_id, created_at, updated_at)
SELECT
  'Résidence Les Jardins',
  '123 rue de la Paix',
  'Paris',
  '75001',
  '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM buildings WHERE team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'
);

INSERT INTO buildings (name, address, city, postal_code, team_id, created_at, updated_at)
SELECT
  'Immeuble Saint-Antoine',
  '456 avenue des Champs',
  'Lyon',
  '69001',
  '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c',
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM buildings WHERE team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c' AND name = 'Immeuble Saint-Antoine'
);

-- Créer des lots pour les buildings créés
INSERT INTO lots (reference, building_id, category, surface, price, is_occupied, created_at, updated_at)
SELECT
  'A101',
  b.id,
  'apartment',
  75.5,
  1200.00,
  false,
  now(),
  now()
FROM buildings b
WHERE b.team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'
  AND b.name = 'Résidence Les Jardins'
  AND NOT EXISTS (
    SELECT 1 FROM lots WHERE building_id = b.id AND reference = 'A101'
  );

INSERT INTO lots (reference, building_id, category, surface, price, is_occupied, created_at, updated_at)
SELECT
  'A102',
  b.id,
  'apartment',
  85.0,
  1350.00,
  true,
  now(),
  now()
FROM buildings b
WHERE b.team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'
  AND b.name = 'Résidence Les Jardins'
  AND NOT EXISTS (
    SELECT 1 FROM lots WHERE building_id = b.id AND reference = 'A102'
  );

INSERT INTO lots (reference, building_id, category, surface, price, is_occupied, created_at, updated_at)
SELECT
  'B201',
  b.id,
  'apartment',
  95.0,
  1500.00,
  true,
  now(),
  now()
FROM buildings b
WHERE b.team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'
  AND b.name = 'Immeuble Saint-Antoine'
  AND NOT EXISTS (
    SELECT 1 FROM lots WHERE building_id = b.id AND reference = 'B201'
  );

-- Vérifier les résultats
SELECT 'Buildings created:' as info, count(*) as count FROM buildings WHERE team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c';
SELECT 'Lots created:' as info, count(*) as count FROM lots l
JOIN buildings b ON l.building_id = b.id
WHERE b.team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c';

-- Afficher un résumé complet
SELECT
  b.name as building_name,
  count(l.id) as lots_count,
  sum(case when l.is_occupied then 1 else 0 end) as occupied_lots
FROM buildings b
LEFT JOIN lots l ON b.id = l.building_id
WHERE b.team_id = '8b1acc7b-cdef-4ec6-a87f-9a1b4cce8e0c'
GROUP BY b.id, b.name;