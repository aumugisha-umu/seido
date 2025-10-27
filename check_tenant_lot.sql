-- Script pour vérifier si le locataire est dans lot_contacts
-- Remplacer les UUIDs par ceux des logs

SELECT 
  'Locataires dans lot_contacts' as info,
  lc.user_id,
  u.name,
  u.email,
  u.role,
  lc.lot_id,
  l.reference as lot_reference,
  lc.is_primary
FROM lot_contacts lc
INNER JOIN users u ON lc.user_id = u.id
INNER JOIN lots l ON lc.lot_id = l.id
WHERE u.role = 'locataire'
LIMIT 10;
