/**
 * Import Constants
 * Configuration for Excel/CSV import functionality
 */

import type { TemplateConfig, ColumnMapping } from './types';

// ============================================================================
// Sheet Names (French)
// ============================================================================

export const SHEET_NAMES = {
  BUILDINGS: 'Immeubles',
  LOTS: 'Lots',
  CONTACTS: 'Contacts',
  CONTRACTS: 'Baux',
  COMPANIES: 'Sociétés',
} as const;

// ============================================================================
// Enum Values
// ============================================================================

// IMPORTANT: These categories MUST match the database enum `lot_category`
// See database.types.ts for the source of truth
export const LOT_CATEGORIES = [
  'appartement',
  'collocation',
  'maison',
  'garage',        // Also used for parking spaces (box fermé, place parking)
  'local_commercial',
  'autre',         // Used for caves, storage, ateliers, entrepôts
] as const;

export const LOT_CATEGORY_LABELS: Record<string, string> = {
  'appartement': 'Appartement',
  'collocation': 'Collocation',
  'maison': 'Maison',
  'garage': 'Garage / Parking',
  'local_commercial': 'Local commercial',
  'autre': 'Autre (cave, atelier, entrepôt)',
};

export const CONTACT_ROLES = [
  'locataire',
  'prestataire',
  'proprietaire',
] as const;

export const CONTACT_ROLE_LABELS: Record<string, string> = {
  'locataire': 'Locataire',
  'prestataire': 'Prestataire',
  'proprietaire': 'Propriétaire',
};

export const CONTRACT_TYPES = [
  'bail_habitation',
  'bail_meuble',
] as const;

export const INTERVENTION_TYPES = [
  'plomberie',
  'electricite',
  'chauffage',
  'serrurerie',
  'peinture',
  'menage',
  'jardinage',
  'autre',
] as const;

export const INTERVENTION_TYPE_LABELS: Record<string, string> = {
  'plomberie': 'Plomberie',
  'electricite': 'Électricité',
  'chauffage': 'Chauffage',
  'serrurerie': 'Serrurerie',
  'peinture': 'Peinture',
  'menage': 'Ménage',
  'jardinage': 'Jardinage',
  'autre': 'Autre',
};

export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  'bail_habitation': 'Bail d\'habitation',
  'bail_meuble': 'Bail meublé',
};

export const COUNTRIES = [
  'france',
  'belgique',
  'suisse',
  'luxembourg',
  'allemagne',
  'pays-bas',
  'autre',
] as const;

export const COUNTRY_LABELS: Record<string, string> = {
  'france': 'France',
  'belgique': 'Belgique',
  'suisse': 'Suisse',
  'luxembourg': 'Luxembourg',
  'allemagne': 'Allemagne',
  'pays-bas': 'Pays-Bas',
  'autre': 'Autre',
};

// ============================================================================
// Template Configurations
// ============================================================================

export const BUILDING_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.BUILDINGS,
  headers: [
    'Nom*',
    'Adresse*',
    'Ville*',
    'Code Postal*',
    'Pays',
    'Description',
  ],
  exampleRows: [
    // 15 immeubles à Bruxelles et environs (5-8 lots par immeuble)
    ['Résidence Leopold', '125 Avenue Louise', 'Bruxelles', '1050', 'belgique', 'Immeuble standing, 6 apparts, ascenseur'],
    ['Le Sablon', '8 Place du Petit Sablon', 'Bruxelles', '1000', 'belgique', 'Immeuble historique, 5 lots, charme'],
    ['Bruxelles Centre', '45 Rue Neuve', 'Bruxelles', '1000', 'belgique', 'Immeuble mixte, 7 lots'],
    ['Tour Horizon', '1 Boulevard du Roi Albert II', 'Bruxelles', '1210', 'belgique', 'Tour moderne, 6 lots, piscine'],
    ['Résidence Flagey', '12 Place Flagey', 'Ixelles', '1050', 'belgique', 'Immeuble Art Déco, 6 appartements'],
    ['Le Parvis', '5 Parvis Saint-Gilles', 'Saint-Gilles', '1060', 'belgique', 'Petit immeuble, 5 lots'],
    ['Les Jardins d\'Uccle', '34 Avenue Brugmann', 'Uccle', '1180', 'belgique', 'Résidence calme, 7 lots, jardin'],
    ['Woluwe Parc', '78 Avenue de Tervuren', 'Woluwe', '1200', 'belgique', 'Immeuble familial, 6 apparts'],
    ['Le Montgomery', '15 Place Montgomery', 'Etterbeek', '1040', 'belgique', 'Standing, 5 lots, gardien'],
    ['Résidence Dansaert', '42 Rue Dansaert', 'Bruxelles', '1000', 'belgique', 'Lofts rénovés, 6 lots'],
    ['Forest View', '23 Avenue du Globe', 'Forest', '1190', 'belgique', 'Immeuble récent, 8 lots'],
    ['Anderlecht Square', '56 Place de la Vaillance', 'Anderlecht', '1070', 'belgique', 'Résidence sécurisée, 7 lots'],
    ['Schaerbeek Central', '89 Rue Royale Sainte-Marie', 'Schaerbeek', '1030', 'belgique', 'Immeuble rénové, 6 lots'],
    ['Evere Résidence', '12 Avenue Henri Conscience', 'Evere', '1140', 'belgique', 'Petit immeuble, 5 lots'],
    ['Auderghem Park', '45 Boulevard du Souverain', 'Auderghem', '1160', 'belgique', 'Résidence verte, 6 lots'],
  ],
  columnWidths: [25, 30, 20, 15, 15, 40],
  requiredColumns: ['Nom*', 'Adresse*', 'Ville*', 'Code Postal*'],
};

export const LOT_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.LOTS,
  headers: [
    'Référence*',
    'Nom Immeuble',
    'Catégorie',
    'Étage',
    'Rue',
    'Ville',
    'Code Postal',
    'Pays',
    'Description',
  ],
  exampleRows: [
    // ============================================================================
    // RÉSIDENCE LEOPOLD - 6 lots
    // ============================================================================
    ['LEO-A01', 'Résidence Leopold', 'appartement', 0, '', '', '', 'belgique', 'Studio 30m², idéal investissement'],
    ['LEO-A02', 'Résidence Leopold', 'appartement', 1, '', '', '', 'belgique', 'T2 50m², balcon sud'],
    ['LEO-A03', 'Résidence Leopold', 'appartement', 2, '', '', '', 'belgique', 'T3 70m², 2 chambres'],
    ['LEO-A04', 'Résidence Leopold', 'appartement', 3, '', '', '', 'belgique', 'T4 90m², terrasse'],
    ['LEO-P01', 'Résidence Leopold', 'garage', -1, '', '', '', 'belgique', 'Place parking n°01'],
    ['LEO-C01', 'Résidence Leopold', 'autre', -1, '', '', '', 'belgique', 'Cave 8m²'],
    // ============================================================================
    // LE SABLON - 5 lots
    // ============================================================================
    ['SAB-A01', 'Le Sablon', 'appartement', 0, '', '', '', 'belgique', 'T2 50m², charme ancien'],
    ['SAB-A02', 'Le Sablon', 'appartement', 1, '', '', '', 'belgique', 'T3 70m², parquet, cheminée'],
    ['SAB-A03', 'Le Sablon', 'appartement', 2, '', '', '', 'belgique', 'T4 90m², duplex'],
    ['SAB-A04', 'Le Sablon', 'appartement', 3, '', '', '', 'belgique', 'T3 68m², sous les toits'],
    ['SAB-C01', 'Le Sablon', 'autre', -1, '', '', '', 'belgique', 'Cave voûtée 15m²'],
    // ============================================================================
    // BRUXELLES CENTRE - 7 lots (mixte commerce/habitation)
    // ============================================================================
    ['CTR-L01', 'Bruxelles Centre', 'local_commercial', 0, '', '', '', 'belgique', 'Boutique 80m², vitrine'],
    ['CTR-L02', 'Bruxelles Centre', 'local_commercial', 0, '', '', '', 'belgique', 'Local 60m², restaurant'],
    ['CTR-A01', 'Bruxelles Centre', 'appartement', 1, '', '', '', 'belgique', 'T2 50m², pied-à-terre'],
    ['CTR-A02', 'Bruxelles Centre', 'appartement', 2, '', '', '', 'belgique', 'T3 65m², lumineux'],
    ['CTR-A03', 'Bruxelles Centre', 'appartement', 3, '', '', '', 'belgique', 'T4 80m², rénové'],
    ['CTR-K01', 'Bruxelles Centre', 'collocation', 4, '', '', '', 'belgique', 'Coloc 4 chambres, 120m²'],
    ['CTR-C01', 'Bruxelles Centre', 'autre', -1, '', '', '', 'belgique', 'Cave 20m² stockage'],
    // ============================================================================
    // TOUR HORIZON - 6 lots
    // ============================================================================
    ['HOR-A01', 'Tour Horizon', 'appartement', 5, '', '', '', 'belgique', 'T3 85m², vue panoramique'],
    ['HOR-A02', 'Tour Horizon', 'appartement', 7, '', '', '', 'belgique', 'T4 110m², terrasse'],
    ['HOR-A03', 'Tour Horizon', 'appartement', 9, '', '', '', 'belgique', 'T4 105m², 2 SDB'],
    ['HOR-A04', 'Tour Horizon', 'appartement', 12, '', '', '', 'belgique', 'Penthouse 180m²'],
    ['HOR-P01', 'Tour Horizon', 'garage', -1, '', '', '', 'belgique', 'Box fermé n°01'],
    ['HOR-P02', 'Tour Horizon', 'garage', -2, '', '', '', 'belgique', 'Place -2 n°01'],
    // ============================================================================
    // RÉSIDENCE FLAGEY - 6 lots
    // ============================================================================
    ['FLA-A01', 'Résidence Flagey', 'appartement', 0, '', '', '', 'belgique', 'T1 40m², Art Déco'],
    ['FLA-A02', 'Résidence Flagey', 'appartement', 1, '', '', '', 'belgique', 'T2 55m², moulures'],
    ['FLA-A03', 'Résidence Flagey', 'appartement', 2, '', '', '', 'belgique', 'T3 75m², parquet'],
    ['FLA-A04', 'Résidence Flagey', 'appartement', 3, '', '', '', 'belgique', 'T4 95m², terrasse'],
    ['FLA-P01', 'Résidence Flagey', 'garage', -1, '', '', '', 'belgique', 'Place parking'],
    ['FLA-C01', 'Résidence Flagey', 'autre', -1, '', '', '', 'belgique', 'Cave 10m²'],
    // ============================================================================
    // LE PARVIS - 5 lots
    // ============================================================================
    ['PAR-A01', 'Le Parvis', 'appartement', 0, '', '', '', 'belgique', 'T2 48m², rénové'],
    ['PAR-A02', 'Le Parvis', 'appartement', 1, '', '', '', 'belgique', 'T3 62m², lumineux'],
    ['PAR-A03', 'Le Parvis', 'appartement', 2, '', '', '', 'belgique', 'T2 52m², balcon'],
    ['PAR-A04', 'Le Parvis', 'appartement', 3, '', '', '', 'belgique', 'T3 70m², mansardé'],
    ['PAR-C01', 'Le Parvis', 'autre', -1, '', '', '', 'belgique', 'Cave 8m²'],
    // ============================================================================
    // LES JARDINS D'UCCLE - 7 lots
    // ============================================================================
    ['UCL-A01', 'Les Jardins d\'Uccle', 'appartement', 0, '', '', '', 'belgique', 'T2 58m², jardin privatif'],
    ['UCL-A02', 'Les Jardins d\'Uccle', 'appartement', 1, '', '', '', 'belgique', 'T3 72m², calme'],
    ['UCL-A03', 'Les Jardins d\'Uccle', 'appartement', 2, '', '', '', 'belgique', 'T4 95m², 3 chambres'],
    ['UCL-A04', 'Les Jardins d\'Uccle', 'appartement', 3, '', '', '', 'belgique', 'T3 68m², vue parc'],
    ['UCL-P01', 'Les Jardins d\'Uccle', 'garage', -1, '', '', '', 'belgique', 'Box fermé'],
    ['UCL-P02', 'Les Jardins d\'Uccle', 'garage', -1, '', '', '', 'belgique', 'Place extérieure'],
    ['UCL-C01', 'Les Jardins d\'Uccle', 'autre', -1, '', '', '', 'belgique', 'Cave 12m²'],
    // ============================================================================
    // WOLUWE PARC - 6 lots
    // ============================================================================
    ['WOL-A01', 'Woluwe Parc', 'appartement', 0, '', '', '', 'belgique', 'T2 55m², neuf'],
    ['WOL-A02', 'Woluwe Parc', 'appartement', 1, '', '', '', 'belgique', 'T3 78m², familial'],
    ['WOL-A03', 'Woluwe Parc', 'appartement', 2, '', '', '', 'belgique', 'T4 98m², 3 chambres'],
    ['WOL-A04', 'Woluwe Parc', 'appartement', 3, '', '', '', 'belgique', 'T3 72m², terrasse'],
    ['WOL-P01', 'Woluwe Parc', 'garage', -1, '', '', '', 'belgique', 'Box fermé'],
    ['WOL-C01', 'Woluwe Parc', 'autre', -1, '', '', '', 'belgique', 'Cave 10m²'],
    // ============================================================================
    // LE MONTGOMERY - 5 lots
    // ============================================================================
    ['MON-A01', 'Le Montgomery', 'appartement', 1, '', '', '', 'belgique', 'T3 82m², standing'],
    ['MON-A02', 'Le Montgomery', 'appartement', 2, '', '', '', 'belgique', 'T4 105m², 2 SDB'],
    ['MON-A03', 'Le Montgomery', 'appartement', 3, '', '', '', 'belgique', 'T5 125m², penthouse'],
    ['MON-P01', 'Le Montgomery', 'garage', -1, '', '', '', 'belgique', 'Box fermé double'],
    ['MON-C01', 'Le Montgomery', 'autre', -1, '', '', '', 'belgique', 'Cave 15m²'],
    // ============================================================================
    // RÉSIDENCE DANSAERT - 6 lots
    // ============================================================================
    ['DAN-A01', 'Résidence Dansaert', 'appartement', 0, '', '', '', 'belgique', 'Loft 65m², industriel'],
    ['DAN-A02', 'Résidence Dansaert', 'appartement', 1, '', '', '', 'belgique', 'Loft 72m², verrière'],
    ['DAN-A03', 'Résidence Dansaert', 'appartement', 2, '', '', '', 'belgique', 'Duplex 95m², moderne'],
    ['DAN-A04', 'Résidence Dansaert', 'appartement', 3, '', '', '', 'belgique', 'T3 68m², rooftop'],
    ['DAN-L01', 'Résidence Dansaert', 'local_commercial', 0, '', '', '', 'belgique', 'Commerce 45m²'],
    ['DAN-P01', 'Résidence Dansaert', 'garage', -1, '', '', '', 'belgique', 'Place vélo sécurisée'],
    // ============================================================================
    // FOREST VIEW - 8 lots
    // ============================================================================
    ['FOR-A01', 'Forest View', 'appartement', 0, '', '', '', 'belgique', 'T1 38m², rénové'],
    ['FOR-A02', 'Forest View', 'appartement', 1, '', '', '', 'belgique', 'T2 52m², lumineux'],
    ['FOR-A03', 'Forest View', 'appartement', 1, '', '', '', 'belgique', 'T2 55m², balcon'],
    ['FOR-A04', 'Forest View', 'appartement', 2, '', '', '', 'belgique', 'T3 68m², familial'],
    ['FOR-A05', 'Forest View', 'appartement', 2, '', '', '', 'belgique', 'T3 72m², vue forêt'],
    ['FOR-A06', 'Forest View', 'appartement', 3, '', '', '', 'belgique', 'T4 92m², terrasse'],
    ['FOR-P01', 'Forest View', 'garage', -1, '', '', '', 'belgique', 'Box fermé'],
    ['FOR-C01', 'Forest View', 'autre', -1, '', '', '', 'belgique', 'Cave 8m²'],
    // ============================================================================
    // ANDERLECHT SQUARE - 7 lots
    // ============================================================================
    ['AND-A01', 'Anderlecht Square', 'appartement', 0, '', '', '', 'belgique', 'T2 48m², neuf'],
    ['AND-A02', 'Anderlecht Square', 'appartement', 1, '', '', '', 'belgique', 'T3 65m², lumineux'],
    ['AND-A03', 'Anderlecht Square', 'appartement', 2, '', '', '', 'belgique', 'T3 68m², balcon'],
    ['AND-A04', 'Anderlecht Square', 'appartement', 3, '', '', '', 'belgique', 'T4 85m², familial'],
    ['AND-K01', 'Anderlecht Square', 'collocation', 4, '', '', '', 'belgique', 'Coloc 5 ch, 130m²'],
    ['AND-P01', 'Anderlecht Square', 'garage', -1, '', '', '', 'belgique', 'Place souterraine'],
    ['AND-C01', 'Anderlecht Square', 'autre', -1, '', '', '', 'belgique', 'Cave 10m²'],
    // ============================================================================
    // SCHAERBEEK CENTRAL - 6 lots
    // ============================================================================
    ['SCH-A01', 'Schaerbeek Central', 'appartement', 0, '', '', '', 'belgique', 'T1 35m², studio'],
    ['SCH-A02', 'Schaerbeek Central', 'appartement', 1, '', '', '', 'belgique', 'T2 52m², rénové'],
    ['SCH-A03', 'Schaerbeek Central', 'appartement', 2, '', '', '', 'belgique', 'T3 68m², Art Nouveau'],
    ['SCH-A04', 'Schaerbeek Central', 'appartement', 3, '', '', '', 'belgique', 'T4 88m², moulures'],
    ['SCH-P01', 'Schaerbeek Central', 'garage', -1, '', '', '', 'belgique', 'Place cour intérieure'],
    ['SCH-C01', 'Schaerbeek Central', 'autre', -1, '', '', '', 'belgique', 'Cave 9m²'],
    // ============================================================================
    // EVERE RÉSIDENCE - 5 lots
    // ============================================================================
    ['EVE-A01', 'Evere Résidence', 'appartement', 0, '', '', '', 'belgique', 'T2 50m², jardin'],
    ['EVE-A02', 'Evere Résidence', 'appartement', 1, '', '', '', 'belgique', 'T3 65m², calme'],
    ['EVE-A03', 'Evere Résidence', 'appartement', 2, '', '', '', 'belgique', 'T3 68m², lumineux'],
    ['EVE-P01', 'Evere Résidence', 'garage', -1, '', '', '', 'belgique', 'Box fermé'],
    ['EVE-C01', 'Evere Résidence', 'autre', -1, '', '', '', 'belgique', 'Cave 8m²'],
    // ============================================================================
    // AUDERGHEM PARK - 6 lots
    // ============================================================================
    ['AUD-A01', 'Auderghem Park', 'appartement', 0, '', '', '', 'belgique', 'T2 55m², rez jardin'],
    ['AUD-A02', 'Auderghem Park', 'appartement', 1, '', '', '', 'belgique', 'T3 72m², vue parc'],
    ['AUD-A03', 'Auderghem Park', 'appartement', 2, '', '', '', 'belgique', 'T4 95m², familial'],
    ['AUD-A04', 'Auderghem Park', 'appartement', 3, '', '', '', 'belgique', 'T3 70m², terrasse'],
    ['AUD-P01', 'Auderghem Park', 'garage', -1, '', '', '', 'belgique', 'Box fermé'],
    ['AUD-C01', 'Auderghem Park', 'autre', -1, '', '', '', 'belgique', 'Cave 12m²'],
    // ============================================================================
    // LOTS INDÉPENDANTS - MAISONS (15)
    // ============================================================================
    ['MAIS-001', '', 'maison', '', '12 Rue des Lilas', 'Uccle', '1180', 'belgique', 'Maison 4 ch, jardin 200m²'],
    ['MAIS-002', '', 'maison', '', '45 Avenue des Hêtres', 'Watermael-Boitsfort', '1170', 'belgique', 'Villa 5 ch, piscine'],
    ['MAIS-003', '', 'maison', '', '8 Rue de la Forêt', 'Uccle', '1180', 'belgique', 'Maison 3 ch, garage'],
    ['MAIS-004', '', 'maison', '', '23 Drève du Duc', 'Auderghem', '1160', 'belgique', 'Maison mitoyenne 4 ch'],
    ['MAIS-005', '', 'maison', '', '67 Avenue Churchill', 'Uccle', '1180', 'belgique', 'Maison de maître 6 ch'],
    ['MAIS-006', '', 'maison', '', '15 Rue Jean Vandeuren', 'Woluwe-Saint-Pierre', '1150', 'belgique', 'Villa moderne 4 ch'],
    ['MAIS-007', '', 'maison', '', '89 Avenue de Tervueren', 'Woluwe-Saint-Lambert', '1200', 'belgique', 'Maison 5 ch, jardin'],
    ['MAIS-008', '', 'maison', '', '34 Rue du Bois', 'Watermael-Boitsfort', '1170', 'belgique', 'Maison 3 ch, rénové'],
    ['MAIS-009', '', 'maison', '', '56 Avenue Louise', 'Ixelles', '1050', 'belgique', 'Maison de ville 4 ch'],
    ['MAIS-010', '', 'maison', '', '78 Rue Américaine', 'Ixelles', '1050', 'belgique', 'Maison Art Déco 5 ch'],
    ['MAIS-011', '', 'maison', '', '12 Clos du Soleil', 'Kraainem', '1950', 'belgique', 'Villa 4 ch, calme'],
    ['MAIS-012', '', 'maison', '', '45 Rue de Genève', 'Evere', '1140', 'belgique', 'Maison 3 ch, jardin'],
    ['MAIS-013', '', 'maison', '', '23 Avenue des Cerisiers', 'Schaerbeek', '1030', 'belgique', 'Maison 4 ch, garage'],
    ['MAIS-014', '', 'maison', '', '67 Rue de la Station', 'Forest', '1190', 'belgique', 'Maison 3 ch, terrasse'],
    ['MAIS-015', '', 'maison', '', '89 Avenue Brugmann', 'Forest', '1190', 'belgique', 'Maison bourgeoise 5 ch'],
    // ============================================================================
    // LOTS INDÉPENDANTS - GARAGES (8)
    // ============================================================================
    ['GAR-001', '', 'garage', '', '8 Rue du Commerce', 'Bruxelles', '1000', 'belgique', 'Garage box fermé'],
    ['GAR-002', '', 'garage', '', '45 Avenue Louise', 'Bruxelles', '1050', 'belgique', 'Garage double'],
    ['GAR-003', '', 'garage', '', '12 Rue de la Loi', 'Bruxelles', '1000', 'belgique', 'Garage sécurisé'],
    ['GAR-004', '', 'garage', '', '34 Boulevard de Waterloo', 'Bruxelles', '1000', 'belgique', 'Garage accès 24h'],
    ['GAR-005', '', 'garage', '', '56 Rue Royale', 'Bruxelles', '1000', 'belgique', 'Box fermé 15m²'],
    ['GAR-006', '', 'garage', '', '78 Avenue de la Toison', 'Saint-Gilles', '1060', 'belgique', 'Garage éclairé'],
    ['GAR-007', '', 'garage', '', '23 Place Flagey', 'Ixelles', '1050', 'belgique', 'Garage résidence'],
    ['GAR-008', '', 'garage', '', '45 Chaussée de Wavre', 'Etterbeek', '1040', 'belgique', 'Box fermé'],
    // ============================================================================
    // LOTS INDÉPENDANTS - PARKINGS (6)
    // ============================================================================
    ['PARK-001', '', 'garage', '', '10 Place de Brouckère', 'Bruxelles', '1000', 'belgique', 'Place extérieur'],
    ['PARK-002', '', 'garage', '', '25 Rue Neuve', 'Bruxelles', '1000', 'belgique', 'Place souterraine'],
    ['PARK-003', '', 'garage', '', '40 Avenue Louise', 'Bruxelles', '1050', 'belgique', 'Place sécurisée'],
    ['PARK-004', '', 'garage', '', '55 Boulevard Anspach', 'Bruxelles', '1000', 'belgique', 'Place couverte'],
    ['PARK-005', '', 'garage', '', '70 Rue Antoine Dansaert', 'Bruxelles', '1000', 'belgique', 'Place résidence'],
    ['PARK-006', '', 'garage', '', '85 Place du Jeu de Balle', 'Bruxelles', '1000', 'belgique', 'Place quartier'],
    // ============================================================================
    // LOTS INDÉPENDANTS - LOCAUX COMMERCIAUX (5)
    // ============================================================================
    ['LOC-001', '', 'local_commercial', '', '5 Rue du Marché aux Herbes', 'Bruxelles', '1000', 'belgique', 'Boutique 50m² Grand-Place'],
    ['LOC-002', '', 'local_commercial', '', '20 Galerie de la Reine', 'Bruxelles', '1000', 'belgique', 'Commerce 35m² galerie'],
    ['LOC-003', '', 'local_commercial', '', '35 Rue du Bailli', 'Ixelles', '1050', 'belgique', 'Local 70m² avec cave'],
    ['LOC-004', '', 'local_commercial', '', '50 Chaussée d\'Ixelles', 'Ixelles', '1050', 'belgique', 'Commerce 45m²'],
    ['LOC-005', '', 'local_commercial', '', '65 Place du Châtelain', 'Ixelles', '1050', 'belgique', 'Restaurant 80m²'],
    // ============================================================================
    // LOTS INDÉPENDANTS - AUTRES (3)
    // ============================================================================
    ['AUT-001', '', 'autre', '', '10 Zone Industrielle Nord', 'Anderlecht', '1070', 'belgique', 'Entrepôt 200m²'],
    ['AUT-002', '', 'autre', '', '25 Rue de l\'Industrie', 'Molenbeek', '1080', 'belgique', 'Atelier 150m²'],
    ['AUT-003', '', 'autre', '', '40 Avenue du Port', 'Bruxelles', '1000', 'belgique', 'Bureau 100m²'],
  ],
  columnWidths: [15, 25, 18, 10, 30, 20, 15, 15, 40],
  requiredColumns: ['Référence*'],
};

export const CONTACT_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.CONTACTS,
  headers: [
    'Nom*',
    'Email',
    'Téléphone',
    'Rôle*',
    'Adresse',
    'Spécialité',
    'Société',
    'Notes',
  ],
  exampleRows: [
    // ============================================================================
    // LOCATAIRES - 100 contacts (particuliers et professionnels)
    // ============================================================================
    // Locataires principaux (avec ou sans société)
    ['Marie Dubois', 'demo+marie.dubois@seido-app.com', '+32 470 12 34 56', 'locataire', '25 Rue de la Loi, 1000 Bruxelles', '', '', 'Locataire LEO-A03'],
    ['Pierre Martin', 'demo+pierre.martin@seido-app.com', '+32 470 78 90 12', 'locataire', '15 Avenue de Tervuren, 1040 Etterbeek', '', '', 'Locataire LEO-A04'],
    ['Sophie Lambert', 'demo+sophie.lambert@seido-app.com', '+32 470 33 44 55', 'locataire', '8 Place Flagey, 1050 Ixelles', '', '', 'Locataire SAB-A03'],
    ['Thomas Janssen', 'demo+thomas.janssen@seido-app.com', '+32 470 66 77 88', 'locataire', '12 Rue du Midi, 1000 Bruxelles', '', '', 'Locataire CTR-A01'],
    ['Emma Claessens', 'demo+emma.claessens@seido-app.com', '+32 470 11 22 33', 'locataire', '30 Rue de Flandre, 1000 Bruxelles', '', '', 'Locataire LEO-A05'],
    ['Lucas Peeters', 'demo+lucas.peeters@seido-app.com', '+32 470 44 55 66', 'locataire', '42 Avenue Louise, 1050 Bruxelles', '', '', 'Locataire LEO-A06'],
    ['Julie Maes', 'demo+julie.maes@seido-app.com', '+32 470 77 88 99', 'locataire', '18 Rue Haute, 1000 Bruxelles', '', '', 'Locataire LEO-A07'],
    ['Maxime Wouters', 'demo+maxime.wouters@seido-app.com', '+32 470 00 11 22', 'locataire', '55 Place Jourdan, 1040 Etterbeek', '', '', 'Locataire LEO-A08'],
    ['Chloé Willems', 'demo+chloe.willems@seido-app.com', '+32 470 33 44 00', 'locataire', '7 Rue du Trône, 1050 Ixelles', '', '', 'Locataire LEO-A09'],
    ['Nathan Jacobs', 'demo+nathan.jacobs@seido-app.com', '+32 470 55 66 77', 'locataire', '92 Chaussée de Waterloo, 1060 Saint-Gilles', '', '', 'Locataire LEO-A10'],
    ['Léa Mertens', 'demo+lea.mertens@seido-app.com', '+32 470 88 99 00', 'locataire', '14 Rue Américaine, 1050 Ixelles', '', '', 'Locataire LEO-A11'],
    ['Hugo Van den Berg', 'demo+hugo.vandenberg@seido-app.com', '+32 470 12 00 34', 'locataire', '63 Avenue de la Couronne, 1050 Ixelles', '', '', 'Locataire LEO-A12'],
    ['Clara Claes', 'demo+clara.claes@seido-app.com', '+32 470 56 00 78', 'locataire', '28 Rue Gray, 1050 Ixelles', '', '', 'Locataire LEO-A13'],
    ['Arthur De Smet', 'demo+arthur.desmet@seido-app.com', '+32 470 90 00 12', 'locataire', '45 Place Fernand Cocq, 1050 Ixelles', '', '', 'Locataire LEO-A14'],
    ['Camille Goossens', 'demo+camille.goossens@seido-app.com', '+32 470 34 00 56', 'locataire', '81 Rue de Livourne, 1050 Ixelles', '', '', 'Locataire LEO-A15'],
    ['Louis Leclercq', 'demo+louis.leclercq@seido-app.com', '+32 470 78 00 90', 'locataire', '16 Avenue de la Toison d\'Or, 1060 Saint-Gilles', '', '', 'Locataire SAB-A01'],
    ['Manon Hermans', 'demo+manon.hermans@seido-app.com', '+32 470 12 34 00', 'locataire', '39 Rue du Bailli, 1050 Ixelles', '', '', 'Locataire SAB-A02'],
    ['Théo Aerts', 'demo+theo.aerts@seido-app.com', '+32 470 56 78 00', 'locataire', '72 Chaussée d\'Ixelles, 1050 Ixelles', '', '', 'Locataire SAB-A04'],
    ['Inès Dubois', 'demo+ines.dubois@seido-app.com', '+32 470 90 12 00', 'locataire', '5 Place du Châtelain, 1050 Ixelles', '', '', 'Locataire SAB-A05'],
    ['Tom Stevens', 'demo+tom.stevens@seido-app.com', '+32 470 34 56 00', 'locataire', '88 Rue Defacqz, 1050 Ixelles', '', '', 'Locataire SAB-A06'],
    ['Eva Michiels', 'demo+eva.michiels@seido-app.com', '+32 470 78 90 00', 'locataire', '21 Avenue du Parc, 1060 Saint-Gilles', '', '', 'Locataire SAB-A07'],
    ['Romain Leroy', 'demo+romain.leroy@seido-app.com', '+32 470 12 00 56', 'locataire', '54 Rue de Parme, 1060 Saint-Gilles', '', '', 'Locataire SAB-A08'],
    ['Sarah De Backer', 'demo+sarah.debacker@seido-app.com', '+32 470 34 00 78', 'locataire', '37 Rue de Suisse, 1060 Saint-Gilles', '', '', 'Locataire SAB-A09'],
    ['Antoine Renard', 'demo+antoine.renard@seido-app.com', '+32 470 56 00 90', 'locataire', '70 Avenue Brugmann, 1190 Forest', '', '', 'Locataire SAB-A10'],
    ['Zoé Fontaine', 'demo+zoe.fontaine@seido-app.com', '+32 470 78 00 12', 'locataire', '3 Rue de l\'Abbaye, 1050 Ixelles', '', '', 'Locataire SAB-A11'],
    // Colocataires
    ['Kevin Vandenbulcke', 'demo+kevin.vandenbulcke@seido-app.com', '+32 470 11 00 22', 'locataire', '15 Rue de la Victoire, 1060 Saint-Gilles', '', '', 'Colocataire SAB-K01'],
    ['Lisa Pieters', 'demo+lisa.pieters@seido-app.com', '+32 470 33 00 44', 'locataire', '15 Rue de la Victoire, 1060 Saint-Gilles', '', '', 'Colocataire SAB-K01'],
    ['Sébastien Brasseur', 'demo+sebastien.brasseur@seido-app.com', '+32 470 55 00 66', 'locataire', '15 Rue de la Victoire, 1060 Saint-Gilles', '', '', 'Colocataire SAB-K01'],
    ['Aurélie Marchal', 'demo+aurelie.marchal@seido-app.com', '+32 470 77 00 88', 'locataire', '15 Rue de la Victoire, 1060 Saint-Gilles', '', '', 'Colocataire SAB-K01'],
    ['Julien Coppens', 'demo+julien.coppens@seido-app.com', '+32 470 99 00 00', 'locataire', '28 Rue Keyenveld, 1050 Ixelles', '', '', 'Colocataire SAB-K02'],
    ['Marine Dumont', 'demo+marine.dumont@seido-app.com', '+32 470 11 11 00', 'locataire', '28 Rue Keyenveld, 1050 Ixelles', '', '', 'Colocataire SAB-K02'],
    ['Quentin Lambert', 'demo+quentin.lambert@seido-app.com', '+32 470 22 22 00', 'locataire', '28 Rue Keyenveld, 1050 Ixelles', '', '', 'Colocataire SAB-K02'],
    ['Émilie Lemaire', 'demo+emilie.lemaire@seido-app.com', '+32 470 33 33 00', 'locataire', '45 Rue Sans Souci, 1050 Ixelles', '', '', 'Colocataire SAB-K03'],
    ['Florian Henrard', 'demo+florian.henrard@seido-app.com', '+32 470 44 44 00', 'locataire', '45 Rue Sans Souci, 1050 Ixelles', '', '', 'Colocataire SAB-K03'],
    ['Charlotte Pirard', 'demo+charlotte.pirard@seido-app.com', '+32 470 55 55 00', 'locataire', '45 Rue Sans Souci, 1050 Ixelles', '', '', 'Colocataire SAB-K03'],
    ['Arnaud Simon', 'demo+arnaud.simon@seido-app.com', '+32 470 66 66 00', 'locataire', '45 Rue Sans Souci, 1050 Ixelles', '', '', 'Colocataire SAB-K03'],
    ['Pauline Dujardin', 'demo+pauline.dujardin@seido-app.com', '+32 470 77 77 00', 'locataire', '45 Rue Sans Souci, 1050 Ixelles', '', '', 'Colocataire SAB-K03'],
    // Locataires commerces et autres
    ['Restaurant Le Sablon SPRL', 'demo+resto.sablon@seido-app.com', '+32 2 511 00 01', 'locataire', '8 Place du Grand Sablon, 1000 Bruxelles', '', 'Restaurant Le Sablon SPRL', 'Locataire CTR-L01'],
    ['Fashion Store SA', 'demo+fashion.store@seido-app.com', '+32 2 511 00 02', 'locataire', '45 Rue Neuve, 1000 Bruxelles', '', 'Fashion Store SA', 'Locataire CTR-L02'],
    ['Boulangerie Artisanale', 'demo+boulangerie.artisanale@seido-app.com', '+32 2 511 00 03', 'locataire', '45 Rue Neuve, 1000 Bruxelles', '', 'Boulangerie du Centre', 'Locataire CTR-L03'],
    ['Tech Startup SPRL', 'demo+tech.startup@seido-app.com', '+32 2 511 00 04', 'locataire', '45 Rue Neuve, 1000 Bruxelles', '', 'Tech Startup SPRL', 'Locataire CTR-L04'],
    ['Cabinet Médical Dr Dupont', 'demo+cabinet.dupont@seido-app.com', '+32 2 511 00 05', 'locataire', '45 Rue Neuve, 1000 Bruxelles', '', 'Cabinet Médical Dr Dupont', 'Locataire CTR-L05'],
    ['Coiffure Élégance', 'demo+coiffure.elegance@seido-app.com', '+32 2 511 00 06', 'locataire', '45 Rue Neuve, 1000 Bruxelles', '', 'Coiffure Élégance SPRL', 'Locataire CTR-L06'],
    ['Pharmacie Centrale', 'demo+pharmacie.centrale@seido-app.com', '+32 2 511 00 07', 'locataire', '45 Rue Neuve, 1000 Bruxelles', '', 'Pharmacie Centrale SA', 'Locataire CTR-L07'],
    // Colocataires Centre
    ['Alexis Bodart', 'demo+alexis.bodart@seido-app.com', '+32 470 88 88 00', 'locataire', '12 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K01'],
    ['Margaux Collignon', 'demo+margaux.collignon@seido-app.com', '+32 470 99 99 00', 'locataire', '12 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K01'],
    ['Benjamin Gilles', 'demo+benjamin.gilles@seido-app.com', '+32 470 10 10 00', 'locataire', '12 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K01'],
    ['Valentine Poncelet', 'demo+valentine.poncelet@seido-app.com', '+32 470 20 20 00', 'locataire', '12 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K01'],
    ['Cyril Adam', 'demo+cyril.adam@seido-app.com', '+32 470 30 30 00', 'locataire', '14 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K02'],
    ['Noémie Hallet', 'demo+noemie.hallet@seido-app.com', '+32 470 40 40 00', 'locataire', '14 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K02'],
    ['Dylan Bertrand', 'demo+dylan.bertrand@seido-app.com', '+32 470 50 50 00', 'locataire', '14 Rue Neuve, 1000 Bruxelles', '', '', 'Colocataire CTR-K02'],
    // Locataires Tour Horizon
    ['Philippe Richter', 'demo+philippe.richter@seido-app.com', '+32 470 60 60 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A01'],
    ['Catherine Dewit', 'demo+catherine.dewit@seido-app.com', '+32 470 70 70 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A02'],
    ['Marc Van Damme', 'demo+marc.vandamme@seido-app.com', '+32 470 80 80 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A03'],
    ['Isabelle François', 'demo+isabelle.francois@seido-app.com', '+32 470 90 90 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A04'],
    ['Christophe Lejeune', 'demo+christophe.lejeune@seido-app.com', '+32 470 01 01 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A05'],
    ['Nathalie Roose', 'demo+nathalie.roose@seido-app.com', '+32 470 02 02 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A06'],
    ['Laurent Degroote', 'demo+laurent.degroote@seido-app.com', '+32 470 03 03 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A07'],
    ['Véronique Bastien', 'demo+veronique.bastien@seido-app.com', '+32 470 04 04 00', 'locataire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', '', 'Locataire HOR-A08 Penthouse'],
    // Locataires maisons
    ['Famille Vandenberghe', 'demo+famille.vandenberghe@seido-app.com', '+32 470 05 05 00', 'locataire', '12 Rue des Lilas, 1180 Uccle', '', '', 'Locataire MAIS-001'],
    ['Olivier & Anne Declercq', 'demo+declercq.famille@seido-app.com', '+32 470 06 06 00', 'locataire', '45 Avenue des Hêtres, 1170 Watermael', '', '', 'Locataire MAIS-002'],
    ['Simon Verhoeven', 'demo+simon.verhoeven@seido-app.com', '+32 470 07 07 00', 'locataire', '8 Rue de la Forêt, 1180 Uccle', '', '', 'Locataire MAIS-003'],
    ['Famille Petit', 'demo+famille.petit@seido-app.com', '+32 470 08 08 00', 'locataire', '23 Drève du Duc, 1160 Auderghem', '', '', 'Locataire MAIS-004'],
    ['Jean-Marc Henrotte', 'demo+jeanmarc.henrotte@seido-app.com', '+32 470 09 09 00', 'locataire', '67 Avenue Churchill, 1180 Uccle', '', '', 'Locataire MAIS-005'],
    ['Famille Servais', 'demo+famille.servais@seido-app.com', '+32 470 10 00 10', 'locataire', '15 Rue Jean Vandeuren, 1150 Woluwe-Saint-Pierre', '', '', 'Locataire MAIS-006'],
    ['Bernard Thiry', 'demo+bernard.thiry@seido-app.com', '+32 470 11 00 11', 'locataire', '89 Avenue de Tervueren, 1200 Woluwe', '', '', 'Locataire MAIS-007'],
    ['Famille Grosjean', 'demo+famille.grosjean@seido-app.com', '+32 470 12 00 12', 'locataire', '34 Rue du Bois, 1170 Watermael', '', '', 'Locataire MAIS-008'],
    ['Vincent & Sophie Lemaire', 'demo+lemaire.couple@seido-app.com', '+32 470 13 00 13', 'locataire', '56 Avenue Louise, 1050 Ixelles', '', '', 'Locataire MAIS-009'],
    ['Famille Boucher', 'demo+famille.boucher@seido-app.com', '+32 470 14 00 14', 'locataire', '78 Rue Américaine, 1050 Ixelles', '', '', 'Locataire MAIS-010'],
    // Locataires garages/parkings/autres
    ['Paul Mercier', 'demo+paul.mercier@seido-app.com', '+32 470 15 00 15', 'locataire', '8 Rue du Commerce, 1000 Bruxelles', '', '', 'Locataire GAR-001'],
    ['Amélie Janssens', 'demo+amelie.janssens@seido-app.com', '+32 470 16 00 16', 'locataire', '45 Avenue Louise, 1050 Bruxelles', '', '', 'Locataire GAR-002'],
    ['Entreprise Logistique SA', 'demo+logistique@seido-app.com', '+32 2 520 00 01', 'locataire', '10 Zone Industrielle, 1070 Anderlecht', '', 'Entreprise Logistique SA', 'Locataire AUT-001'],
    ['Atelier d\'Artiste SPRL', 'demo+atelier.artiste@seido-app.com', '+32 2 520 00 02', 'locataire', '25 Rue de l\'Industrie, 1080 Molenbeek', '', 'Atelier d\'Artiste SPRL', 'Locataire AUT-002'],
    ['Cabinet Conseil Pro', 'demo+conseil.pro@seido-app.com', '+32 2 520 00 03', 'locataire', '40 Avenue du Port, 1000 Bruxelles', '', 'Cabinet Conseil Pro SA', 'Locataire AUT-003'],
    // Garants (rôle locataire dans users, mais garant dans contract_contacts)
    ['Jean-Paul Garant', 'demo+jeanpaul.garant@seido-app.com', '+32 470 99 00 11', 'locataire', '100 Boulevard du Souverain, 1170 Watermael', '', '', 'Garant solidaire'],
    ['Françoise Caution', 'demo+francoise.caution@seido-app.com', '+32 470 22 33 44', 'locataire', '5 Avenue des Nerviens, 1040 Etterbeek', '', '', 'Garante'],
    ['Michel Garantie', 'demo+michel.garantie@seido-app.com', '+32 470 17 00 17', 'locataire', '78 Rue Royale, 1000 Bruxelles', '', '', 'Garant'],
    ['Anne-Marie Sûreté', 'demo+annemarie.surete@seido-app.com', '+32 470 18 00 18', 'locataire', '35 Avenue de Cortenberg, 1000 Bruxelles', '', '', 'Garante'],
    ['Robert Confiance', 'demo+robert.confiance@seido-app.com', '+32 470 19 00 19', 'locataire', '92 Boulevard Brand Whitlock, 1200 Woluwe', '', '', 'Garant'],
    ['Martine Assurance', 'demo+martine.assurance@seido-app.com', '+32 470 20 00 20', 'locataire', '15 Avenue des Celtes, 1040 Etterbeek', '', '', 'Garante'],
    ['Philippe Fidèle', 'demo+philippe.fidele@seido-app.com', '+32 470 21 00 21', 'locataire', '48 Rue de la Loi, 1040 Etterbeek', '', '', 'Garant'],
    ['Christine Solide', 'demo+christine.solide@seido-app.com', '+32 470 22 00 22', 'locataire', '63 Avenue d\'Auderghem, 1040 Etterbeek', '', '', 'Garante'],
    // Locataires supplémentaires pour atteindre 100
    ['Alexandre Petit', 'demo+alexandre.petit@seido-app.com', '+32 470 23 00 23', 'locataire', '10 Rue Lesbroussart, 1050 Ixelles', '', '', 'Locataire CTR-A02'],
    ['Valérie Grand', 'demo+valerie.grand@seido-app.com', '+32 470 24 00 24', 'locataire', '25 Avenue de la Couronne, 1050 Ixelles', '', '', 'Locataire CTR-A03'],
    ['Nicolas Moyen', 'demo+nicolas.moyen@seido-app.com', '+32 470 25 00 25', 'locataire', '40 Rue Gray, 1050 Ixelles', '', '', 'Locataire CTR-A04'],
    ['Caroline Haute', 'demo+caroline.haute@seido-app.com', '+32 470 26 00 26', 'locataire', '55 Rue de la Brasserie, 1050 Ixelles', '', '', 'Locataire CTR-A05'],
    ['David Basse', 'demo+david.basse@seido-app.com', '+32 470 27 00 27', 'locataire', '70 Avenue Général de Gaulle, 1050 Ixelles', '', '', 'Locataire CTR-A06'],
    ['Élodie Nord', 'demo+elodie.nord@seido-app.com', '+32 470 28 00 28', 'locataire', '85 Rue du Page, 1050 Ixelles', '', '', 'Locataire MAIS-011'],
    ['Grégoire Sud', 'demo+gregoire.sud@seido-app.com', '+32 470 29 00 29', 'locataire', '100 Rue Malibran, 1050 Ixelles', '', '', 'Locataire MAIS-012'],
    ['Hélène Est', 'demo+helene.est@seido-app.com', '+32 470 30 00 30', 'locataire', '15 Avenue Molière, 1050 Ixelles', '', '', 'Locataire MAIS-013'],
    ['Igor Ouest', 'demo+igor.ouest@seido-app.com', '+32 470 31 00 31', 'locataire', '30 Rue Darwin, 1050 Ixelles', '', '', 'Locataire MAIS-014'],
    ['Juliette Centre', 'demo+juliette.centre@seido-app.com', '+32 470 32 00 32', 'locataire', '45 Rue de l\'Aqueduc, 1050 Ixelles', '', '', 'Locataire MAIS-015'],
    ['Kilian Rive', 'demo+kilian.rive@seido-app.com', '+32 470 33 00 33', 'locataire', '60 Rue Jean Stas, 1060 Saint-Gilles', '', '', 'Locataire LOC-001'],
    ['Laure Port', 'demo+laure.port@seido-app.com', '+32 470 34 00 34', 'locataire', '75 Rue de Moscou, 1060 Saint-Gilles', '', '', 'Locataire LOC-002'],
    ['Matthieu Plage', 'demo+matthieu.plage@seido-app.com', '+32 470 35 00 35', 'locataire', '90 Rue de la Victoire, 1060 Saint-Gilles', '', '', 'Locataire LOC-003'],
    ['Noëlle Montagne', 'demo+noelle.montagne@seido-app.com', '+32 470 36 00 36', 'locataire', '5 Rue de Mérode, 1060 Saint-Gilles', '', '', 'Locataire LOC-004'],
    // ============================================================================
    // PRESTATAIRES - 60 contacts (entreprises de services)
    // ============================================================================
    // Plomberie (10)
    ['Plomberie Express SPRL', 'demo+plomberie.express@seido-app.com', '+32 2 555 01 01', 'prestataire', '45 Rue de l\'Industrie, 1000 Bruxelles', 'plomberie', 'Plomberie Express SPRL', 'Intervention 24h/24'],
    ['Aqua Services SA', 'demo+aqua.services@seido-app.com', '+32 2 555 01 02', 'prestataire', '12 Rue de la Plomberie, 1080 Molenbeek', 'plomberie', 'Aqua Services SA', 'Spécialiste sanitaires'],
    ['Plomb Tech', 'demo+plomb.tech@seido-app.com', '+32 2 555 01 03', 'prestataire', '78 Avenue du Port, 1000 Bruxelles', 'plomberie', 'Plomb Tech SPRL', 'Dépannage rapide'],
    ['Sanitaire Pro', 'demo+sanitaire.pro@seido-app.com', '+32 2 555 01 04', 'prestataire', '23 Rue de Flandre, 1000 Bruxelles', 'plomberie', 'Sanitaire Pro SA', 'Installation neuve'],
    ['Eau & Confort', 'demo+eau.confort@seido-app.com', '+32 2 555 01 05', 'prestataire', '56 Boulevard Anspach, 1000 Bruxelles', 'plomberie', 'Eau & Confort SPRL', 'Rénovation salle de bain'],
    ['Plombier Bruxellois', 'demo+plombier.bruxellois@seido-app.com', '+32 2 555 01 06', 'prestataire', '89 Rue Neuve, 1000 Bruxelles', 'plomberie', 'Plombier Bruxellois', 'Artisan local'],
    ['Tuyauterie Moderne', 'demo+tuyauterie.moderne@seido-app.com', '+32 2 555 01 07', 'prestataire', '34 Chaussée de Louvain, 1030 Schaerbeek', 'plomberie', 'Tuyauterie Moderne SA', 'Grands travaux'],
    ['SOS Plomberie', 'demo+sos.plomberie@seido-app.com', '+32 2 555 01 08', 'prestataire', '67 Rue Royale, 1000 Bruxelles', 'plomberie', 'SOS Plomberie SPRL', 'Urgences 7j/7'],
    ['Eau Vive Services', 'demo+eau.vive@seido-app.com', '+32 2 555 01 09', 'prestataire', '12 Place Rogier, 1210 Saint-Josse', 'plomberie', 'Eau Vive Services', 'Détection fuites'],
    ['Plomberie Générale', 'demo+plomberie.generale@seido-app.com', '+32 2 555 01 10', 'prestataire', '45 Avenue Louise, 1050 Bruxelles', 'plomberie', 'Plomberie Générale SA', 'Tous travaux'],
    // Électricité (10)
    ['Électricité Pro SA', 'demo+electricite.pro@seido-app.com', '+32 2 555 02 01', 'prestataire', '78 Avenue de la Toison d\'Or, 1060 Saint-Gilles', 'electricite', 'Électricité Pro SA', 'Agréé RGIE'],
    ['Courant Plus', 'demo+courant.plus@seido-app.com', '+32 2 555 02 02', 'prestataire', '23 Rue de la Loi, 1040 Etterbeek', 'electricite', 'Courant Plus SPRL', 'Mise en conformité'],
    ['Élec Services', 'demo+elec.services@seido-app.com', '+32 2 555 02 03', 'prestataire', '56 Avenue de Cortenberg, 1000 Bruxelles', 'electricite', 'Élec Services SA', 'Domotique'],
    ['Volt Express', 'demo+volt.express@seido-app.com', '+32 2 555 02 04', 'prestataire', '89 Rue Belliard, 1040 Etterbeek', 'electricite', 'Volt Express SPRL', 'Dépannage 24h'],
    ['Ampère Solutions', 'demo+ampere.solutions@seido-app.com', '+32 2 555 02 05', 'prestataire', '12 Boulevard Charlemagne, 1000 Bruxelles', 'electricite', 'Ampère Solutions SA', 'Industriel'],
    ['Watt & Co', 'demo+watt.co@seido-app.com', '+32 2 555 02 06', 'prestataire', '34 Rue de Trèves, 1040 Etterbeek', 'electricite', 'Watt & Co SPRL', 'Particuliers'],
    ['Électricien Bruxellois', 'demo+electricien.bruxellois@seido-app.com', '+32 2 555 02 07', 'prestataire', '67 Place Jourdan, 1040 Etterbeek', 'electricite', 'Électricien Bruxellois', 'Artisan'],
    ['Power Tech', 'demo+power.tech@seido-app.com', '+32 2 555 02 08', 'prestataire', '90 Avenue des Nerviens, 1040 Etterbeek', 'electricite', 'Power Tech SA', 'Smart home'],
    ['Circuit Pro', 'demo+circuit.pro@seido-app.com', '+32 2 555 02 09', 'prestataire', '15 Rue de Spa, 1000 Bruxelles', 'electricite', 'Circuit Pro SPRL', 'Rénovation'],
    ['Énergie Services', 'demo+energie.services@seido-app.com', '+32 2 555 02 10', 'prestataire', '48 Place du Luxembourg, 1050 Ixelles', 'electricite', 'Énergie Services SA', 'Panneaux solaires'],
    // Chauffage (8)
    ['Chauffage Central SA', 'demo+chauffage.central@seido-app.com', '+32 2 555 03 01', 'prestataire', '23 Rue de l\'Industrie, 1000 Bruxelles', 'chauffage', 'Chauffage Central SA', 'Installation chaudières'],
    ['Thermo Services', 'demo+thermo.services@seido-app.com', '+32 2 555 03 02', 'prestataire', '56 Avenue du Port, 1000 Bruxelles', 'chauffage', 'Thermo Services SPRL', 'Entretien annuel'],
    ['Calor Plus', 'demo+calor.plus@seido-app.com', '+32 2 555 03 03', 'prestataire', '89 Boulevard du Midi, 1000 Bruxelles', 'chauffage', 'Calor Plus SA', 'Pompes à chaleur'],
    ['Chauffe Bien', 'demo+chauffe.bien@seido-app.com', '+32 2 555 03 04', 'prestataire', '12 Rue Haute, 1000 Bruxelles', 'chauffage', 'Chauffe Bien SPRL', 'Radiateurs'],
    ['Heat Expert', 'demo+heat.expert@seido-app.com', '+32 2 555 03 05', 'prestataire', '34 Place du Jeu de Balle, 1000 Bruxelles', 'chauffage', 'Heat Expert SA', 'Chauffage sol'],
    ['Confort Thermique', 'demo+confort.thermique@seido-app.com', '+32 2 555 03 06', 'prestataire', '67 Rue Blaes, 1000 Bruxelles', 'chauffage', 'Confort Thermique', 'Climatisation'],
    ['Éco Chaleur', 'demo+eco.chaleur@seido-app.com', '+32 2 555 03 07', 'prestataire', '90 Rue des Renards, 1000 Bruxelles', 'chauffage', 'Éco Chaleur SPRL', 'Solutions vertes'],
    ['Chaudière Express', 'demo+chaudiere.express@seido-app.com', '+32 2 555 03 08', 'prestataire', '15 Rue de l\'Épée, 1000 Bruxelles', 'chauffage', 'Chaudière Express SA', 'Dépannage urgent'],
    // Serrurerie (6)
    ['Serrurier 24h', 'demo+serrurier.24h@seido-app.com', '+32 2 555 04 01', 'prestataire', '23 Rue Antoine Dansaert, 1000 Bruxelles', 'serrurerie', 'Serrurier 24h SPRL', 'Urgences'],
    ['Clé Express', 'demo+cle.express@seido-app.com', '+32 2 555 04 02', 'prestataire', '56 Rue de Flandre, 1000 Bruxelles', 'serrurerie', 'Clé Express SA', 'Double clés'],
    ['Sécurité Serrures', 'demo+securite.serrures@seido-app.com', '+32 2 555 04 03', 'prestataire', '89 Place Sainte-Catherine, 1000 Bruxelles', 'serrurerie', 'Sécurité Serrures SPRL', 'Blindage portes'],
    ['Lock Master', 'demo+lock.master@seido-app.com', '+32 2 555 04 04', 'prestataire', '12 Quai aux Briques, 1000 Bruxelles', 'serrurerie', 'Lock Master SA', 'Coffres-forts'],
    ['Serrures Pro', 'demo+serrures.pro@seido-app.com', '+32 2 555 04 05', 'prestataire', '34 Rue du Marché aux Porcs, 1000 Bruxelles', 'serrurerie', 'Serrures Pro', 'Installation'],
    ['SOS Serrures', 'demo+sos.serrures@seido-app.com', '+32 2 555 04 06', 'prestataire', '67 Rue Sainte-Catherine, 1000 Bruxelles', 'serrurerie', 'SOS Serrures SPRL', 'Intervention rapide'],
    // Peinture (8)
    ['Peinture & Déco SA', 'demo+peinture.deco@seido-app.com', '+32 2 555 05 01', 'prestataire', '23 Avenue Louise, 1050 Bruxelles', 'peinture', 'Peinture & Déco SA', 'Décoration intérieure'],
    ['Couleurs Plus', 'demo+couleurs.plus@seido-app.com', '+32 2 555 05 02', 'prestataire', '56 Rue du Bailli, 1050 Ixelles', 'peinture', 'Couleurs Plus SPRL', 'Peinture écologique'],
    ['Artisan Peintre', 'demo+artisan.peintre@seido-app.com', '+32 2 555 05 03', 'prestataire', '89 Place du Châtelain, 1050 Ixelles', 'peinture', 'Artisan Peintre', 'Finitions soignées'],
    ['Pinceau d\'Or', 'demo+pinceau.or@seido-app.com', '+32 2 555 05 04', 'prestataire', '12 Rue Américaine, 1050 Ixelles', 'peinture', 'Pinceau d\'Or SA', 'Rénovation'],
    ['Multi Peinture', 'demo+multi.peinture@seido-app.com', '+32 2 555 05 05', 'prestataire', '34 Avenue de la Toison d\'Or, 1060 Saint-Gilles', 'peinture', 'Multi Peinture SPRL', 'Tous supports'],
    ['Peintre Express', 'demo+peintre.express@seido-app.com', '+32 2 555 05 06', 'prestataire', '67 Rue Defacqz, 1050 Ixelles', 'peinture', 'Peintre Express', 'Rapidité'],
    ['Déco & Style', 'demo+deco.style@seido-app.com', '+32 2 555 05 07', 'prestataire', '90 Rue de Livourne, 1050 Ixelles', 'peinture', 'Déco & Style SA', 'Design'],
    ['Peinture Moderne', 'demo+peinture.moderne@seido-app.com', '+32 2 555 05 08', 'prestataire', '15 Avenue Brugmann, 1190 Forest', 'peinture', 'Peinture Moderne SPRL', 'Techniques spéciales'],
    // Ménage (8)
    ['Clean Pro Services', 'demo+clean.pro@seido-app.com', '+32 2 555 06 01', 'prestataire', '23 Rue Neuve, 1000 Bruxelles', 'menage', 'Clean Pro Services SA', 'Nettoyage bureaux'],
    ['Bruxelles Propreté', 'demo+bruxelles.proprete@seido-app.com', '+32 2 555 06 02', 'prestataire', '56 Boulevard Anspach, 1000 Bruxelles', 'menage', 'Bruxelles Propreté SPRL', 'Parties communes'],
    ['Net & Clair', 'demo+net.clair@seido-app.com', '+32 2 555 06 03', 'prestataire', '89 Rue du Midi, 1000 Bruxelles', 'menage', 'Net & Clair SA', 'Vitres'],
    ['Ménage Express', 'demo+menage.express@seido-app.com', '+32 2 555 06 04', 'prestataire', '12 Place de Brouckère, 1000 Bruxelles', 'menage', 'Ménage Express SPRL', 'État des lieux'],
    ['Propreté Plus', 'demo+proprete.plus@seido-app.com', '+32 2 555 06 05', 'prestataire', '34 Rue Royale, 1000 Bruxelles', 'menage', 'Propreté Plus SA', 'Nettoyage fin chantier'],
    ['Clean Team', 'demo+clean.team@seido-app.com', '+32 2 555 06 06', 'prestataire', '67 Boulevard de Waterloo, 1000 Bruxelles', 'menage', 'Clean Team SPRL', 'Équipe réactive'],
    ['Hygiène Services', 'demo+hygiene.services@seido-app.com', '+32 2 555 06 07', 'prestataire', '90 Avenue de la Toison d\'Or, 1060 Saint-Gilles', 'menage', 'Hygiène Services SA', 'Désinfection'],
    ['Sparkle Clean', 'demo+sparkle.clean@seido-app.com', '+32 2 555 06 08', 'prestataire', '15 Place Louise, 1050 Bruxelles', 'menage', 'Sparkle Clean', 'Particuliers'],
    // Jardinage (5)
    ['Jardins & Espaces Verts', 'demo+jardins.verts@seido-app.com', '+32 2 555 07 01', 'prestataire', '23 Avenue de Tervueren, 1150 Woluwe-Saint-Pierre', 'jardinage', 'Jardins & Espaces Verts SA', 'Entretien annuel'],
    ['Paysagiste Pro', 'demo+paysagiste.pro@seido-app.com', '+32 2 555 07 02', 'prestataire', '56 Boulevard du Souverain, 1170 Watermael', 'jardinage', 'Paysagiste Pro SPRL', 'Aménagement'],
    ['Vert Espace', 'demo+vert.espace@seido-app.com', '+32 2 555 07 03', 'prestataire', '89 Drève du Duc, 1160 Auderghem', 'jardinage', 'Vert Espace SA', 'Taille haies'],
    ['Nature & Jardin', 'demo+nature.jardin@seido-app.com', '+32 2 555 07 04', 'prestataire', '12 Avenue des Hêtres, 1170 Watermael', 'jardinage', 'Nature & Jardin SPRL', 'Potager'],
    ['Éco Jardin', 'demo+eco.jardin@seido-app.com', '+32 2 555 07 05', 'prestataire', '34 Rue de la Forêt, 1180 Uccle', 'jardinage', 'Éco Jardin', 'Permaculture'],
    // Autre (5)
    ['Multi Services Pro', 'demo+multi.services@seido-app.com', '+32 2 555 08 01', 'prestataire', '23 Rue de la Loi, 1040 Etterbeek', 'autre', 'Multi Services Pro SA', 'Travaux divers'],
    ['Bricolage Expert', 'demo+bricolage.expert@seido-app.com', '+32 2 555 08 02', 'prestataire', '56 Avenue de Cortenberg, 1000 Bruxelles', 'autre', 'Bricolage Expert SPRL', 'Petits travaux'],
    ['Rénovation Totale', 'demo+renovation.totale@seido-app.com', '+32 2 555 08 03', 'prestataire', '89 Boulevard Charlemagne, 1000 Bruxelles', 'autre', 'Rénovation Totale SA', 'Gros œuvre'],
    ['Dépannage Rapide', 'demo+depannage.rapide@seido-app.com', '+32 2 555 08 04', 'prestataire', '12 Rue de Trèves, 1040 Etterbeek', 'autre', 'Dépannage Rapide SPRL', 'Tous dépannages'],
    ['Artisan Polyvalent', 'demo+artisan.polyvalent@seido-app.com', '+32 2 555 08 05', 'prestataire', '34 Place du Luxembourg, 1050 Ixelles', 'autre', 'Artisan Polyvalent', 'Homme toutes mains'],
    // ============================================================================
    // PROPRIÉTAIRES - 40 contacts (SCI, particuliers, investisseurs)
    // ============================================================================
    // SCI et sociétés immobilières (20)
    ['SCI Bruxelles Invest', 'demo+sci.bruxelles.invest@seido-app.com', '+32 2 555 10 01', 'proprietaire', '1 Place de Brouckère, 1000 Bruxelles', '', 'SCI Bruxelles Invest', 'Propriétaire Résidence Leopold'],
    ['Immo Plus SA', 'demo+immo.plus@seido-app.com', '+32 2 555 10 02', 'proprietaire', '45 Avenue Louise, 1050 Bruxelles', '', 'Immo Plus SA', 'Propriétaire Le Sablon'],
    ['SCI Centre Ville', 'demo+sci.centreville@seido-app.com', '+32 2 555 10 03', 'proprietaire', '78 Rue Neuve, 1000 Bruxelles', '', 'SCI Centre Ville', 'Propriétaire Bruxelles Centre'],
    ['Tower Investment SA', 'demo+tower.investment@seido-app.com', '+32 2 555 10 04', 'proprietaire', '1 Boulevard du Roi Albert II, 1210 Bruxelles', '', 'Tower Investment SA', 'Propriétaire Tour Horizon'],
    ['SCI Résidentiel Uccle', 'demo+sci.uccle@seido-app.com', '+32 2 555 10 05', 'proprietaire', '12 Avenue Churchill, 1180 Uccle', '', 'SCI Résidentiel Uccle', 'Propriétaire maisons Uccle'],
    ['Patrimoine Immo SPRL', 'demo+patrimoine.immo@seido-app.com', '+32 2 555 10 06', 'proprietaire', '34 Avenue de Tervueren, 1040 Etterbeek', '', 'Patrimoine Immo SPRL', 'Multi-propriétaire'],
    ['SCI Rendement Plus', 'demo+sci.rendement@seido-app.com', '+32 2 555 10 07', 'proprietaire', '67 Boulevard Brand Whitlock, 1200 Woluwe', '', 'SCI Rendement Plus', 'Investisseur institutionnel'],
    ['Capital Stone SA', 'demo+capital.stone@seido-app.com', '+32 2 555 10 08', 'proprietaire', '90 Avenue des Celtes, 1040 Etterbeek', '', 'Capital Stone SA', 'Fonds immobilier'],
    ['SCI Famille Dumont', 'demo+sci.dumont@seido-app.com', '+32 2 555 10 09', 'proprietaire', '15 Rue de la Loi, 1040 Etterbeek', '', 'SCI Famille Dumont', 'Patrimoine familial'],
    ['Urban Properties SA', 'demo+urban.properties@seido-app.com', '+32 2 555 10 10', 'proprietaire', '48 Avenue d\'Auderghem, 1040 Etterbeek', '', 'Urban Properties SA', 'Immeubles de rapport'],
    ['SCI Les Trois Couronnes', 'demo+sci.couronnes@seido-app.com', '+32 2 555 10 11', 'proprietaire', '23 Avenue de la Couronne, 1050 Ixelles', '', 'SCI Les Trois Couronnes', 'Propriétaire lots Ixelles'],
    ['Belgian Real Estate SA', 'demo+belgian.realestate@seido-app.com', '+32 2 555 10 12', 'proprietaire', '56 Rue Gray, 1050 Ixelles', '', 'Belgian Real Estate SA', 'Grand propriétaire'],
    ['SCI Investissement Bruxelles', 'demo+sci.invest.bxl@seido-app.com', '+32 2 555 10 13', 'proprietaire', '89 Rue Malibran, 1050 Ixelles', '', 'SCI Investissement Bruxelles', 'Portefeuille diversifié'],
    ['Home Capital SPRL', 'demo+home.capital@seido-app.com', '+32 2 555 10 14', 'proprietaire', '12 Avenue Molière, 1050 Ixelles', '', 'Home Capital SPRL', 'Investisseur privé'],
    ['SCI Sablon Prestige', 'demo+sci.sablon@seido-app.com', '+32 2 555 10 15', 'proprietaire', '34 Place du Grand Sablon, 1000 Bruxelles', '', 'SCI Sablon Prestige', 'Biens de standing'],
    ['Prime Location SA', 'demo+prime.location@seido-app.com', '+32 2 555 10 16', 'proprietaire', '67 Rue du Bailli, 1050 Ixelles', '', 'Prime Location SA', 'Emplacements premium'],
    ['SCI Woluwe Invest', 'demo+sci.woluwe@seido-app.com', '+32 2 555 10 17', 'proprietaire', '90 Avenue de Tervueren, 1200 Woluwe', '', 'SCI Woluwe Invest', 'Propriétaire Woluwe'],
    ['Forest Properties SPRL', 'demo+forest.properties@seido-app.com', '+32 2 555 10 18', 'proprietaire', '15 Avenue Brugmann, 1190 Forest', '', 'Forest Properties SPRL', 'Propriétaire Forest'],
    ['SCI Quartier Européen', 'demo+sci.europeen@seido-app.com', '+32 2 555 10 19', 'proprietaire', '48 Rue Belliard, 1040 Etterbeek', '', 'SCI Quartier Européen', 'Bureaux et logements'],
    ['Schaerbeek Invest SA', 'demo+schaerbeek.invest@seido-app.com', '+32 2 555 10 20', 'proprietaire', '23 Chaussée de Louvain, 1030 Schaerbeek', '', 'Schaerbeek Invest SA', 'Rénovation quartiers'],
    // Propriétaires particuliers (20)
    ['Jean-Pierre Vandenberghe', 'demo+jp.vandenberghe@seido-app.com', '+32 470 50 00 01', 'proprietaire', '12 Avenue Churchill, 1180 Uccle', '', '', 'Propriétaire MAIS-001'],
    ['Marie-Claire Dupont', 'demo+mc.dupont@seido-app.com', '+32 470 50 00 02', 'proprietaire', '45 Avenue des Hêtres, 1170 Watermael', '', '', 'Propriétaire MAIS-002'],
    ['François Lemaitre', 'demo+f.lemaitre@seido-app.com', '+32 470 50 00 03', 'proprietaire', '8 Rue de la Forêt, 1180 Uccle', '', '', 'Propriétaire MAIS-003'],
    ['Catherine Rousseau', 'demo+c.rousseau@seido-app.com', '+32 470 50 00 04', 'proprietaire', '23 Drève du Duc, 1160 Auderghem', '', '', 'Propriétaire MAIS-004'],
    ['Philippe Moreau', 'demo+p.moreau@seido-app.com', '+32 470 50 00 05', 'proprietaire', '67 Avenue Churchill, 1180 Uccle', '', '', 'Propriétaire MAIS-005'],
    ['Isabelle Bernard', 'demo+i.bernard@seido-app.com', '+32 470 50 00 06', 'proprietaire', '15 Rue Jean Vandeuren, 1150 Woluwe-Saint-Pierre', '', '', 'Propriétaire MAIS-006'],
    ['Michel Fontaine', 'demo+m.fontaine@seido-app.com', '+32 470 50 00 07', 'proprietaire', '89 Avenue de Tervueren, 1200 Woluwe', '', '', 'Propriétaire MAIS-007'],
    ['Anne-Sophie Laurent', 'demo+as.laurent@seido-app.com', '+32 470 50 00 08', 'proprietaire', '34 Rue du Bois, 1170 Watermael', '', '', 'Propriétaire MAIS-008'],
    ['Pierre-Yves Simon', 'demo+py.simon@seido-app.com', '+32 470 50 00 09', 'proprietaire', '56 Avenue Louise, 1050 Ixelles', '', '', 'Propriétaire MAIS-009'],
    ['Martine Delcourt', 'demo+m.delcourt@seido-app.com', '+32 470 50 00 10', 'proprietaire', '78 Rue Américaine, 1050 Ixelles', '', '', 'Propriétaire MAIS-010'],
    ['Jacques Mercier', 'demo+j.mercier@seido-app.com', '+32 470 50 00 11', 'proprietaire', '8 Rue du Commerce, 1000 Bruxelles', '', '', 'Propriétaire garages'],
    ['Sylvie Peeters', 'demo+s.peeters@seido-app.com', '+32 470 50 00 12', 'proprietaire', '45 Avenue Louise, 1050 Bruxelles', '', '', 'Propriétaire parkings'],
    ['Luc Janssen', 'demo+l.janssen@seido-app.com', '+32 470 50 00 13', 'proprietaire', '5 Rue du Marché aux Herbes, 1000 Bruxelles', '', '', 'Propriétaire locaux commerciaux'],
    ['Hélène Claessens', 'demo+h.claessens@seido-app.com', '+32 470 50 00 14', 'proprietaire', '10 Zone Industrielle Nord, 1070 Anderlecht', '', '', 'Propriétaire entrepôt'],
    ['Robert Willems', 'demo+r.willems@seido-app.com', '+32 470 50 00 15', 'proprietaire', '12 Clos du Soleil, 1950 Kraainem', '', '', 'Propriétaire MAIS-011'],
    ['Monique Maes', 'demo+m.maes@seido-app.com', '+32 470 50 00 16', 'proprietaire', '45 Rue de Genève, 1140 Evere', '', '', 'Propriétaire MAIS-012'],
    ['Christophe Wouters', 'demo+c.wouters@seido-app.com', '+32 470 50 00 17', 'proprietaire', '23 Avenue des Cerisiers, 1030 Schaerbeek', '', '', 'Propriétaire MAIS-013'],
    ['Nathalie Jacobs', 'demo+n.jacobs@seido-app.com', '+32 470 50 00 18', 'proprietaire', '67 Rue de la Station, 1190 Forest', '', '', 'Propriétaire MAIS-014'],
    ['Éric Van den Berg', 'demo+e.vandenberg@seido-app.com', '+32 470 50 00 19', 'proprietaire', '89 Avenue Brugmann, 1190 Forest', '', '', 'Propriétaire MAIS-015'],
    ['Brigitte Mertens', 'demo+b.mertens@seido-app.com', '+32 470 50 00 20', 'proprietaire', '100 Boulevard du Souverain, 1170 Watermael', '', '', 'Investisseur particulier'],
  ],
  columnWidths: [30, 35, 18, 15, 35, 15, 30, 30],
  requiredColumns: ['Nom*', 'Rôle*'],
};

export const CONTRACT_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.CONTRACTS,
  headers: [
    'Titre*',
    'Réf Lot*',
    'Date Début*',
    'Durée (mois)*',
    'Loyer*',
    'Charges',
    'Type',
    'Garantie',
    'Email Locataires',
    'Email Garants',
    'Commentaires',
  ],
  exampleRows: [
    // ============================================================================
    // RÉSIDENCE LEOPOLD - 4 baux (sur 4 appartements)
    // ============================================================================
    ['Bail LEO-A01', 'LEO-A01', '2024-01-01', 36, 850, 80, 'bail_habitation', 1700, 'demo+marie.dubois@seido-app.com', 'demo+jeanpaul.garant@seido-app.com', 'T2 balcon sud'],
    ['Bail LEO-A02', 'LEO-A02', '2024-02-01', 36, 900, 90, 'bail_habitation', 1800, 'demo+pierre.martin@seido-app.com', '', 'T2 vue avenue'],
    ['Bail LEO-A03', 'LEO-A03', '2023-09-01', 36, 1100, 100, 'bail_habitation', 2200, 'demo+emma.claessens@seido-app.com', 'demo+francoise.caution@seido-app.com', 'T3 2 chambres'],
    ['Bail LEO-A04', 'LEO-A04', '2024-03-01', 24, 1150, 100, 'bail_meuble', 2300, 'demo+lucas.peeters@seido-app.com', '', 'T3 meublé rénové 2023'],
    // ============================================================================
    // LE SABLON - 4 baux (appartements)
    // ============================================================================
    ['Bail SAB-A01', 'SAB-A01', '2024-02-01', 36, 900, 85, 'bail_habitation', 1800, 'demo+louis.leclercq@seido-app.com', '', 'T2 charme ancien'],
    ['Bail SAB-A02', 'SAB-A02', '2023-08-01', 36, 750, 70, 'bail_habitation', 1500, 'demo+manon.hermans@seido-app.com', 'demo+philippe.fidele@seido-app.com', 'T1 poutres apparentes'],
    ['Bail SAB-A03', 'SAB-A03', '2024-03-01', 36, 1100, 100, 'bail_habitation', 2200, 'demo+sophie.lambert@seido-app.com', 'demo+christine.solide@seido-app.com', 'T3 parquet cheminée'],
    ['Bail SAB-A04', 'SAB-A04', '2023-12-01', 24, 850, 80, 'bail_meuble', 1700, 'demo+theo.aerts@seido-app.com', '', 'T2 meublé vue parc'],
    // ============================================================================
    // BRUXELLES CENTRE - 5 baux (commerces + appartements + colocation)
    // ============================================================================
    ['Bail Commercial CTR-L01', 'CTR-L01', '2023-01-01', 108, 3500, 500, 'bail_commercial', 10500, 'demo+resto.sablon@seido-app.com', '', 'Bail 3-6-9 restaurant'],
    ['Bail Commercial CTR-L02', 'CTR-L02', '2023-06-01', 108, 2800, 400, 'bail_commercial', 8400, 'demo+fashion.store@seido-app.com', '', 'Bail 3-6-9 mode'],
    ['Bail CTR-A01', 'CTR-A01', '2024-01-01', 36, 950, 80, 'bail_habitation', 1900, 'demo+thomas.janssen@seido-app.com', '', 'T2 pied-à-terre'],
    ['Bail CTR-A02', 'CTR-A02', '2024-06-01', 12, 750, 70, 'bail_meuble', 1500, 'demo+alexandre.petit@seido-app.com', '', 'T1 meublé'],
    ['Bail Coloc CTR-K01', 'CTR-K01', '2024-01-01', 12, 2000, 220, 'bail_habitation', 4000, 'demo+alexis.bodart@seido-app.com, demo+margaux.collignon@seido-app.com, demo+benjamin.gilles@seido-app.com, demo+valentine.poncelet@seido-app.com', '', 'Colocation 4 chambres'],
    // ============================================================================
    // TOUR HORIZON - 4 baux (appartements standing)
    // ============================================================================
    ['Bail HOR-A01', 'HOR-A01', '2024-01-01', 36, 1500, 150, 'bail_habitation', 3000, 'demo+philippe.richter@seido-app.com', '', 'T3 vue panoramique'],
    ['Bail HOR-A02', 'HOR-A02', '2023-10-01', 36, 1800, 180, 'bail_habitation', 3600, 'demo+catherine.dewit@seido-app.com', '', 'T4 terrasse'],
    ['Bail HOR-A03', 'HOR-A03', '2024-03-01', 24, 1400, 140, 'bail_meuble', 2800, 'demo+marc.vandamme@seido-app.com', '', 'T3 meublé standing'],
    ['Bail HOR-A04', 'HOR-A04', '2023-06-01', 36, 2200, 220, 'bail_habitation', 4400, 'demo+isabelle.francois@seido-app.com', '', 'T5 4 chambres'],
    // ============================================================================
    // RÉSIDENCE FLAGEY - 4 baux
    // ============================================================================
    ['Bail FLA-A01', 'FLA-A01', '2024-01-01', 36, 950, 90, 'bail_habitation', 1900, 'demo+julie.maes@seido-app.com', 'demo+michel.garantie@seido-app.com', 'T2 Art Déco'],
    ['Bail FLA-A02', 'FLA-A02', '2024-04-01', 36, 1500, 130, 'bail_habitation', 3000, 'demo+maxime.wouters@seido-app.com', '', 'T4 terrasse'],
    ['Bail FLA-A03', 'FLA-A03', '2023-01-01', 36, 1800, 150, 'bail_habitation', 3600, 'demo+chloe.willems@seido-app.com', 'demo+annemarie.surete@seido-app.com', 'T5 penthouse'],
    ['Bail FLA-A04', 'FLA-A04', '2024-05-01', 12, 1200, 100, 'bail_meuble', 2400, 'demo+nathan.jacobs@seido-app.com', '', 'T3 meublé'],
    // ============================================================================
    // LE PARVIS - 4 baux
    // ============================================================================
    ['Bail PAR-A01', 'PAR-A01', '2023-10-01', 36, 800, 75, 'bail_habitation', 1600, 'demo+lea.mertens@seido-app.com', 'demo+robert.confiance@seido-app.com', 'T2 lumineux'],
    ['Bail PAR-A02', 'PAR-A02', '2024-06-01', 24, 750, 70, 'bail_meuble', 1500, 'demo+hugo.vandenberg@seido-app.com', '', 'T1 bis meublé'],
    ['Bail PAR-A03', 'PAR-A03', '2024-01-15', 36, 820, 75, 'bail_habitation', 1640, 'demo+clara.claes@seido-app.com', '', 'T2 parquet'],
    ['Bail PAR-A04', 'PAR-A04', '2023-11-01', 36, 1100, 95, 'bail_habitation', 2200, 'demo+arthur.desmet@seido-app.com', 'demo+martine.assurance@seido-app.com', 'T3 2 SDB'],
    // ============================================================================
    // JARDINS D'UCCLE - 4 baux
    // ============================================================================
    ['Bail UCL-A01', 'UCL-A01', '2024-01-01', 36, 1400, 120, 'bail_habitation', 2800, 'demo+ines.dubois@seido-app.com', '', 'T4 jardin'],
    ['Bail UCL-A02', 'UCL-A02', '2023-07-01', 36, 1050, 90, 'bail_habitation', 2100, 'demo+eva.michiels@seido-app.com', '', 'T3 calme'],
    ['Bail UCL-A03', 'UCL-A03', '2024-04-01', 12, 900, 80, 'bail_meuble', 1800, 'demo+sarah.debacker@seido-app.com', '', 'T2 meublé'],
    ['Bail UCL-A04', 'UCL-A04', '2023-09-01', 36, 1200, 100, 'bail_habitation', 2400, 'demo+romain.leroy@seido-app.com', '', 'T3 vue jardin'],
    // ============================================================================
    // WOLUWE PARC - 4 baux
    // ============================================================================
    ['Bail WOL-A01', 'WOL-A01', '2024-02-01', 36, 1100, 95, 'bail_habitation', 2200, 'demo+antoine.renard@seido-app.com', '', 'T3 familial'],
    ['Bail WOL-A02', 'WOL-A02', '2023-08-01', 36, 950, 85, 'bail_habitation', 1900, 'demo+zoe.fontaine@seido-app.com', '', 'T2 rénové'],
    ['Bail WOL-A03', 'WOL-A03', '2024-05-01', 24, 850, 80, 'bail_meuble', 1700, 'demo+kevin.vandenbulcke@seido-app.com', '', 'T2 meublé moderne'],
    ['Bail WOL-A04', 'WOL-A04', '2023-11-01', 36, 1300, 110, 'bail_habitation', 2600, 'demo+lisa.pieters@seido-app.com', '', 'T4 lumineux'],
    // ============================================================================
    // LE MONTGOMERY - 3 baux
    // ============================================================================
    ['Bail MON-A01', 'MON-A01', '2024-03-01', 36, 1400, 130, 'bail_habitation', 2800, 'demo+sebastien.brasseur@seido-app.com', '', 'T4 standing'],
    ['Bail MON-A02', 'MON-A02', '2023-06-01', 36, 1000, 90, 'bail_habitation', 2000, 'demo+aurelie.marchal@seido-app.com', '', 'T2 charme'],
    ['Bail MON-A03', 'MON-A03', '2024-01-01', 12, 1100, 100, 'bail_meuble', 2200, 'demo+julien.coppens@seido-app.com', '', 'T3 meublé gardien'],
    // ============================================================================
    // RÉSIDENCE DANSAERT - 4 baux + 1 commerce
    // ============================================================================
    ['Bail Commercial DAN-L01', 'DAN-L01', '2024-01-01', 108, 1800, 250, 'bail_commercial', 5400, 'demo+boulangerie.artisanale@seido-app.com', '', 'Bail 3-6-9 boulangerie'],
    ['Bail DAN-A01', 'DAN-A01', '2023-12-01', 36, 1050, 95, 'bail_habitation', 2100, 'demo+marine.dumont@seido-app.com', '', 'Loft rénové'],
    ['Bail DAN-A02', 'DAN-A02', '2024-02-01', 36, 980, 90, 'bail_habitation', 1960, 'demo+quentin.lambert@seido-app.com', '', 'T2 design'],
    ['Bail DAN-A03', 'DAN-A03', '2023-09-01', 24, 1150, 100, 'bail_meuble', 2300, 'demo+emilie.lemaire@seido-app.com', '', 'T3 meublé haut de gamme'],
    ['Bail DAN-A04', 'DAN-A04', '2024-04-01', 36, 900, 85, 'bail_habitation', 1800, 'demo+florian.henrard@seido-app.com', '', 'T2 industriel'],
    // ============================================================================
    // FOREST VIEW - 6 baux
    // ============================================================================
    ['Bail FOR-A01', 'FOR-A01', '2024-01-01', 36, 850, 80, 'bail_habitation', 1700, 'demo+charlotte.pirard@seido-app.com', '', 'T2 vue forêt'],
    ['Bail FOR-A02', 'FOR-A02', '2023-07-01', 36, 920, 85, 'bail_habitation', 1840, 'demo+arnaud.simon@seido-app.com', '', 'T2 balcon'],
    ['Bail FOR-A03', 'FOR-A03', '2024-03-01', 36, 1100, 95, 'bail_habitation', 2200, 'demo+pauline.dujardin@seido-app.com', '', 'T3 familial'],
    ['Bail FOR-A04', 'FOR-A04', '2023-10-01', 24, 980, 90, 'bail_meuble', 1960, 'demo+alexis.bodart@seido-app.com', '', 'T2 meublé récent'],
    ['Bail FOR-A05', 'FOR-A05', '2024-05-01', 36, 1250, 110, 'bail_habitation', 2500, 'demo+margaux.collignon@seido-app.com', '', 'T4 terrasse'],
    ['Bail FOR-A06', 'FOR-A06', '2023-11-01', 36, 750, 70, 'bail_habitation', 1500, 'demo+benjamin.gilles@seido-app.com', '', 'T1 bis étudiant'],
    // ============================================================================
    // ANDERLECHT SQUARE - 4 baux + 1 colocation
    // ============================================================================
    ['Bail AND-A01', 'AND-A01', '2024-02-01', 36, 780, 75, 'bail_habitation', 1560, 'demo+valentine.poncelet@seido-app.com', '', 'T2 sécurisé'],
    ['Bail AND-A02', 'AND-A02', '2023-08-01', 36, 850, 80, 'bail_habitation', 1700, 'demo+cyril.adam@seido-app.com', '', 'T2 rénové'],
    ['Bail AND-A03', 'AND-A03', '2024-04-01', 12, 720, 70, 'bail_meuble', 1440, 'demo+noemie.hallet@seido-app.com', '', 'T1 meublé'],
    ['Bail AND-A04', 'AND-A04', '2023-12-01', 36, 950, 90, 'bail_habitation', 1900, 'demo+dylan.bertrand@seido-app.com', '', 'T3 lumineux'],
    ['Bail Coloc AND-K01', 'AND-K01', '2024-01-01', 12, 1800, 200, 'bail_habitation', 3600, 'demo+christophe.lejeune@seido-app.com, demo+nathalie.roose@seido-app.com, demo+laurent.degroote@seido-app.com', '', 'Colocation 3 chambres'],
    // ============================================================================
    // SCHAERBEEK CENTRAL - 4 baux
    // ============================================================================
    ['Bail SCH-A01', 'SCH-A01', '2024-01-01', 36, 820, 75, 'bail_habitation', 1640, 'demo+veronique.bastien@seido-app.com', '', 'T2 rénové 2023'],
    ['Bail SCH-A02', 'SCH-A02', '2023-09-01', 36, 900, 85, 'bail_habitation', 1800, 'demo+camille.goossens@seido-app.com', '', 'T2 parquet chêne'],
    ['Bail SCH-A03', 'SCH-A03', '2024-03-01', 24, 780, 70, 'bail_meuble', 1560, 'demo+valerie.grand@seido-app.com', '', 'T1 bis meublé'],
    ['Bail SCH-A04', 'SCH-A04', '2023-11-01', 36, 1050, 95, 'bail_habitation', 2100, 'demo+nicolas.moyen@seido-app.com', '', 'T3 familial'],
    // ============================================================================
    // EVERE RÉSIDENCE - 3 baux
    // ============================================================================
    ['Bail EVE-A01', 'EVE-A01', '2024-02-01', 36, 750, 70, 'bail_habitation', 1500, 'demo+caroline.haute@seido-app.com', '', 'T2 calme'],
    ['Bail EVE-A02', 'EVE-A02', '2023-10-01', 36, 820, 75, 'bail_habitation', 1640, 'demo+david.basse@seido-app.com', '', 'T2 lumineux'],
    ['Bail EVE-A03', 'EVE-A03', '2024-04-01', 12, 700, 65, 'bail_meuble', 1400, 'demo+elodie.nord@seido-app.com', '', 'T1 meublé'],
    // ============================================================================
    // AUDERGHEM PARK - 4 baux
    // ============================================================================
    ['Bail AUD-A01', 'AUD-A01', '2024-01-01', 36, 950, 90, 'bail_habitation', 1900, 'demo+gregoire.sud@seido-app.com', '', 'T3 vue parc'],
    ['Bail AUD-A02', 'AUD-A02', '2023-07-01', 36, 880, 80, 'bail_habitation', 1760, 'demo+helene.est@seido-app.com', '', 'T2 verdure'],
    ['Bail AUD-A03', 'AUD-A03', '2024-05-01', 24, 820, 75, 'bail_meuble', 1640, 'demo+igor.ouest@seido-app.com', '', 'T2 meublé'],
    ['Bail AUD-A04', 'AUD-A04', '2023-12-01', 36, 1100, 100, 'bail_habitation', 2200, 'demo+juliette.centre@seido-app.com', '', 'T3 standing'],
    // ============================================================================
    // MAISONS - 10 baux
    // ============================================================================
    ['Bail MAIS-001', 'MAIS-001', '2023-09-01', 36, 1800, 200, 'bail_habitation', 3600, 'demo+famille.vandenberghe@seido-app.com', '', 'Maison 4 chambres jardin'],
    ['Bail MAIS-002', 'MAIS-002', '2024-01-01', 36, 2500, 300, 'bail_habitation', 5000, 'demo+declercq.famille@seido-app.com', '', 'Villa 5 chambres piscine'],
    ['Bail MAIS-003', 'MAIS-003', '2023-06-01', 36, 1500, 180, 'bail_habitation', 3000, 'demo+simon.verhoeven@seido-app.com', '', 'Maison 3 chambres garage'],
    ['Bail MAIS-004', 'MAIS-004', '2024-02-01', 36, 1600, 190, 'bail_habitation', 3200, 'demo+famille.petit@seido-app.com', '', 'Maison mitoyenne 4 ch'],
    ['Bail MAIS-005', 'MAIS-005', '2023-01-01', 36, 2800, 350, 'bail_habitation', 5600, 'demo+jeanmarc.henrotte@seido-app.com', '', 'Maison de maître 6 ch'],
    ['Bail MAIS-006', 'MAIS-006', '2024-03-01', 36, 2200, 250, 'bail_habitation', 4400, 'demo+famille.servais@seido-app.com', '', 'Villa moderne 4 ch'],
    ['Bail MAIS-007', 'MAIS-007', '2023-10-01', 36, 2000, 230, 'bail_habitation', 4000, 'demo+bernard.thiry@seido-app.com', '', 'Maison 5 ch jardin'],
    ['Bail MAIS-008', 'MAIS-008', '2024-04-01', 36, 1400, 170, 'bail_habitation', 2800, 'demo+famille.grosjean@seido-app.com', '', 'Maison 3 ch rénové'],
    ['Bail MAIS-009', 'MAIS-009', '2023-07-01', 36, 1900, 220, 'bail_habitation', 3800, 'demo+lemaire.couple@seido-app.com', '', 'Maison de ville 4 ch'],
    ['Bail MAIS-010', 'MAIS-010', '2024-01-15', 36, 2100, 240, 'bail_habitation', 4200, 'demo+famille.boucher@seido-app.com', '', 'Maison Art Déco 5 ch'],
    // ============================================================================
    // GARAGES, PARKINGS, LOCAUX, AUTRES - 8 baux
    // ============================================================================
    ['Bail GAR-001', 'GAR-001', '2024-01-01', 12, 120, 0, 'bail_habitation', 240, 'demo+paul.mercier@seido-app.com', '', 'Garage box fermé'],
    ['Bail GAR-002', 'GAR-002', '2023-06-01', 12, 180, 0, 'bail_habitation', 360, 'demo+amelie.janssens@seido-app.com', '', 'Garage double'],
    ['Bail LOC-001', 'LOC-001', '2022-01-01', 108, 2000, 250, 'bail_commercial', 6000, 'demo+kilian.rive@seido-app.com', '', 'Boutique Grand-Place'],
    ['Bail LOC-003', 'LOC-003', '2023-03-01', 108, 1800, 200, 'bail_commercial', 5400, 'demo+matthieu.plage@seido-app.com', '', 'Local avec cave'],
    ['Bail AUT-001', 'AUT-001', '2023-01-01', 36, 1200, 100, 'bail_habitation', 2400, 'demo+logistique@seido-app.com', '', 'Entrepôt 200m²'],
    ['Bail AUT-002', 'AUT-002', '2024-02-01', 36, 900, 80, 'bail_habitation', 1800, 'demo+atelier.artiste@seido-app.com', '', 'Atelier 150m²'],
    ['Bail AUT-003', 'AUT-003', '2023-09-01', 36, 1500, 150, 'bail_habitation', 3000, 'demo+conseil.pro@seido-app.com', '', 'Bureau 100m²'],
  ],
  columnWidths: [25, 15, 15, 15, 12, 12, 18, 12, 45, 35, 30],
  requiredColumns: ['Titre*', 'Réf Lot*', 'Date Début*', 'Durée (mois)*', 'Loyer*'],
};

export const COMPANY_TEMPLATE: TemplateConfig = {
  sheetName: SHEET_NAMES.COMPANIES,
  headers: [
    'Nom*',
    'Nom Légal',
    'N° TVA',
    'Rue',
    'Numéro',
    'Code Postal',
    'Ville',
    'Pays',
    'Email',
    'Téléphone',
    'Site Web',
  ],
  exampleRows: [
    // ============================================================================
    // PRESTATAIRES - Sociétés de services (~30)
    // ============================================================================
    // Plomberie
    ['Plomberie Express SPRL', 'Plomberie Express SPRL', 'BE0123456789', 'Rue de l\'Industrie', '45', '1000', 'Bruxelles', 'belgique', 'demo+plomberie.express@seido-app.com', '+32 2 555 01 01', 'https://plomberie-express.be'],
    ['Aqua Services SA', 'Aqua Services SA', 'BE0234567890', 'Rue de la Plomberie', '12', '1080', 'Molenbeek', 'belgique', 'demo+aqua.services@seido-app.com', '+32 2 555 01 02', 'https://aqua-services.be'],
    ['Plomb Tech SPRL', 'Plomb Tech SPRL', 'BE0345678901', 'Avenue du Port', '78', '1000', 'Bruxelles', 'belgique', 'demo+plomb.tech@seido-app.com', '+32 2 555 01 03', ''],
    ['Sanitaire Pro SA', 'Sanitaire Pro SA', 'BE0456789012', 'Rue de Flandre', '23', '1000', 'Bruxelles', 'belgique', 'demo+sanitaire.pro@seido-app.com', '+32 2 555 01 04', 'https://sanitaire-pro.be'],
    ['Eau & Confort SPRL', 'Eau & Confort SPRL', 'BE0567890123', 'Boulevard Anspach', '56', '1000', 'Bruxelles', 'belgique', 'demo+eau.confort@seido-app.com', '+32 2 555 01 05', ''],
    // Électricité
    ['Électricité Pro SA', 'Électricité Pro SA', 'BE0678901234', 'Avenue de la Toison d\'Or', '78', '1060', 'Saint-Gilles', 'belgique', 'demo+electricite.pro@seido-app.com', '+32 2 555 02 01', 'https://electricite-pro.be'],
    ['Courant Plus SPRL', 'Courant Plus SPRL', 'BE0789012345', 'Rue de la Loi', '23', '1040', 'Etterbeek', 'belgique', 'demo+courant.plus@seido-app.com', '+32 2 555 02 02', ''],
    ['Élec Services SA', 'Élec Services SA', 'BE0890123456', 'Avenue de Cortenberg', '56', '1000', 'Bruxelles', 'belgique', 'demo+elec.services@seido-app.com', '+32 2 555 02 03', 'https://elec-services.be'],
    ['Volt Express SPRL', 'Volt Express SPRL', 'BE0901234567', 'Rue Belliard', '89', '1040', 'Etterbeek', 'belgique', 'demo+volt.express@seido-app.com', '+32 2 555 02 04', ''],
    ['Énergie Services SA', 'Énergie Services SA', 'BE0112345678', 'Place du Luxembourg', '48', '1050', 'Ixelles', 'belgique', 'demo+energie.services@seido-app.com', '+32 2 555 02 10', 'https://energie-services.be'],
    // Chauffage
    ['Chauffage Central SA', 'Chauffage Central SA', 'BE0223456789', 'Rue de l\'Industrie', '23', '1000', 'Bruxelles', 'belgique', 'demo+chauffage.central@seido-app.com', '+32 2 555 03 01', 'https://chauffage-central.be'],
    ['Thermo Services SPRL', 'Thermo Services SPRL', 'BE0334567890', 'Avenue du Port', '56', '1000', 'Bruxelles', 'belgique', 'demo+thermo.services@seido-app.com', '+32 2 555 03 02', ''],
    ['Calor Plus SA', 'Calor Plus SA', 'BE0445678901', 'Boulevard du Midi', '89', '1000', 'Bruxelles', 'belgique', 'demo+calor.plus@seido-app.com', '+32 2 555 03 03', ''],
    ['Chaudière Express SA', 'Chaudière Express SA', 'BE0556789012', 'Rue de l\'Épée', '15', '1000', 'Bruxelles', 'belgique', 'demo+chaudiere.express@seido-app.com', '+32 2 555 03 08', 'https://chaudiere-express.be'],
    // Serrurerie
    ['Serrurier 24h SPRL', 'Serrurier 24h SPRL', 'BE0667890123', 'Rue Antoine Dansaert', '23', '1000', 'Bruxelles', 'belgique', 'demo+serrurier.24h@seido-app.com', '+32 2 555 04 01', ''],
    ['Clé Express SA', 'Clé Express SA', 'BE0778901234', 'Rue de Flandre', '56', '1000', 'Bruxelles', 'belgique', 'demo+cle.express@seido-app.com', '+32 2 555 04 02', 'https://cle-express.be'],
    // Peinture
    ['Peinture & Déco SA', 'Peinture & Déco SA', 'BE0889012345', 'Avenue Louise', '23', '1050', 'Bruxelles', 'belgique', 'demo+peinture.deco@seido-app.com', '+32 2 555 05 01', 'https://peinture-deco.be'],
    ['Couleurs Plus SPRL', 'Couleurs Plus SPRL', 'BE0990123456', 'Rue du Bailli', '56', '1050', 'Ixelles', 'belgique', 'demo+couleurs.plus@seido-app.com', '+32 2 555 05 02', ''],
    // Ménage
    ['Clean Pro Services SA', 'Clean Pro Services SA', 'BE0101234567', 'Rue Neuve', '23', '1000', 'Bruxelles', 'belgique', 'demo+clean.pro@seido-app.com', '+32 2 555 06 01', 'https://cleanpro.be'],
    ['Bruxelles Propreté SPRL', 'Bruxelles Propreté SPRL', 'BE0212345678', 'Boulevard Anspach', '56', '1000', 'Bruxelles', 'belgique', 'demo+bruxelles.proprete@seido-app.com', '+32 2 555 06 02', ''],
    ['Net & Clair SA', 'Net & Clair SA', 'BE0323456789', 'Rue du Midi', '89', '1000', 'Bruxelles', 'belgique', 'demo+net.clair@seido-app.com', '+32 2 555 06 03', ''],
    // Jardinage
    ['Jardins & Espaces Verts SA', 'Jardins & Espaces Verts SA', 'BE0434567890', 'Avenue de Tervueren', '23', '1150', 'Woluwe-Saint-Pierre', 'belgique', 'demo+jardins.verts@seido-app.com', '+32 2 555 07 01', 'https://jardins-verts.be'],
    ['Paysagiste Pro SPRL', 'Paysagiste Pro SPRL', 'BE0545678901', 'Boulevard du Souverain', '56', '1170', 'Watermael', 'belgique', 'demo+paysagiste.pro@seido-app.com', '+32 2 555 07 02', ''],
    // Autre
    ['Multi Services Pro SA', 'Multi Services Pro SA', 'BE0656789012', 'Rue de la Loi', '23', '1040', 'Etterbeek', 'belgique', 'demo+multi.services@seido-app.com', '+32 2 555 08 01', ''],
    ['Rénovation Totale SA', 'Rénovation Totale SA', 'BE0767890123', 'Boulevard Charlemagne', '89', '1000', 'Bruxelles', 'belgique', 'demo+renovation.totale@seido-app.com', '+32 2 555 08 03', 'https://renovation-totale.be'],
    ['Bricolage Expert SPRL', 'Bricolage Expert SPRL', 'BE0400123456', 'Avenue de Cortenberg', '56', '1000', 'Bruxelles', 'belgique', 'demo+bricolage.expert@seido-app.com', '+32 2 555 08 02', ''],
    ['Dépannage Rapide SPRL', 'Dépannage Rapide SPRL', 'BE0401234567', 'Rue de Trèves', '12', '1040', 'Etterbeek', 'belgique', 'demo+depannage.rapide@seido-app.com', '+32 2 555 08 04', ''],
    ['Artisan Polyvalent', 'Artisan Polyvalent', 'BE0402345678', 'Place du Luxembourg', '34', '1050', 'Ixelles', 'belgique', 'demo+artisan.polyvalent@seido-app.com', '+32 2 555 08 05', ''],
    // Plomberie supplémentaires
    ['Plombier Bruxellois', 'Plombier Bruxellois', 'BE0410123456', 'Rue Neuve', '89', '1000', 'Bruxelles', 'belgique', 'demo+plombier.bruxellois@seido-app.com', '+32 2 555 01 06', ''],
    ['Tuyauterie Moderne SA', 'Tuyauterie Moderne SA', 'BE0411234567', 'Chaussée de Louvain', '34', '1030', 'Schaerbeek', 'belgique', 'demo+tuyauterie.moderne@seido-app.com', '+32 2 555 01 07', ''],
    ['SOS Plomberie SPRL', 'SOS Plomberie SPRL', 'BE0412345678', 'Rue Royale', '67', '1000', 'Bruxelles', 'belgique', 'demo+sos.plomberie@seido-app.com', '+32 2 555 01 08', ''],
    ['Eau Vive Services', 'Eau Vive Services', 'BE0413456789', 'Place Rogier', '12', '1210', 'Saint-Josse', 'belgique', 'demo+eau.vive@seido-app.com', '+32 2 555 01 09', ''],
    ['Plomberie Générale SA', 'Plomberie Générale SA', 'BE0414567890', 'Avenue Louise', '45', '1050', 'Bruxelles', 'belgique', 'demo+plomberie.generale@seido-app.com', '+32 2 555 01 10', ''],
    // Électricité supplémentaires
    ['Ampère Solutions SA', 'Ampère Solutions SA', 'BE0420123456', 'Boulevard Charlemagne', '12', '1000', 'Bruxelles', 'belgique', 'demo+ampere.solutions@seido-app.com', '+32 2 555 02 05', ''],
    ['Watt & Co SPRL', 'Watt & Co SPRL', 'BE0421234567', 'Rue de Trèves', '34', '1040', 'Etterbeek', 'belgique', 'demo+watt.co@seido-app.com', '+32 2 555 02 06', ''],
    ['Électricien Bruxellois', 'Électricien Bruxellois', 'BE0422345678', 'Place Jourdan', '67', '1040', 'Etterbeek', 'belgique', 'demo+electricien.bruxellois@seido-app.com', '+32 2 555 02 07', ''],
    ['Power Tech SA', 'Power Tech SA', 'BE0423456789', 'Avenue des Nerviens', '90', '1040', 'Etterbeek', 'belgique', 'demo+power.tech@seido-app.com', '+32 2 555 02 08', ''],
    ['Circuit Pro SPRL', 'Circuit Pro SPRL', 'BE0424567890', 'Rue de Spa', '15', '1000', 'Bruxelles', 'belgique', 'demo+circuit.pro@seido-app.com', '+32 2 555 02 09', ''],
    // Chauffage supplémentaires
    ['Chauffe Bien SPRL', 'Chauffe Bien SPRL', 'BE0430123456', 'Rue Haute', '12', '1000', 'Bruxelles', 'belgique', 'demo+chauffe.bien@seido-app.com', '+32 2 555 03 04', ''],
    ['Heat Expert SA', 'Heat Expert SA', 'BE0431234567', 'Place du Jeu de Balle', '34', '1000', 'Bruxelles', 'belgique', 'demo+heat.expert@seido-app.com', '+32 2 555 03 05', ''],
    ['Confort Thermique', 'Confort Thermique', 'BE0432345678', 'Rue Blaes', '67', '1000', 'Bruxelles', 'belgique', 'demo+confort.thermique@seido-app.com', '+32 2 555 03 06', ''],
    ['Éco Chaleur SPRL', 'Éco Chaleur SPRL', 'BE0433456789', 'Rue des Renards', '90', '1000', 'Bruxelles', 'belgique', 'demo+eco.chaleur@seido-app.com', '+32 2 555 03 07', ''],
    // Serrurerie supplémentaires
    ['Sécurité Serrures SPRL', 'Sécurité Serrures SPRL', 'BE0440123456', 'Place Sainte-Catherine', '89', '1000', 'Bruxelles', 'belgique', 'demo+securite.serrures@seido-app.com', '+32 2 555 04 03', ''],
    ['Lock Master SA', 'Lock Master SA', 'BE0441234567', 'Quai aux Briques', '12', '1000', 'Bruxelles', 'belgique', 'demo+lock.master@seido-app.com', '+32 2 555 04 04', ''],
    ['Serrures Pro', 'Serrures Pro', 'BE0442345678', 'Rue du Marché aux Porcs', '34', '1000', 'Bruxelles', 'belgique', 'demo+serrures.pro@seido-app.com', '+32 2 555 04 05', ''],
    ['SOS Serrures SPRL', 'SOS Serrures SPRL', 'BE0443456789', 'Rue Sainte-Catherine', '67', '1000', 'Bruxelles', 'belgique', 'demo+sos.serrures@seido-app.com', '+32 2 555 04 06', ''],
    // Peinture supplémentaires
    ['Artisan Peintre', 'Artisan Peintre', 'BE0450123456', 'Place du Châtelain', '89', '1050', 'Ixelles', 'belgique', 'demo+artisan.peintre@seido-app.com', '+32 2 555 05 03', ''],
    ['Pinceau d\'Or SA', 'Pinceau d\'Or SA', 'BE0451234567', 'Rue Américaine', '12', '1050', 'Ixelles', 'belgique', 'demo+pinceau.or@seido-app.com', '+32 2 555 05 04', ''],
    ['Multi Peinture SPRL', 'Multi Peinture SPRL', 'BE0452345678', 'Avenue de la Toison d\'Or', '34', '1060', 'Saint-Gilles', 'belgique', 'demo+multi.peinture@seido-app.com', '+32 2 555 05 05', ''],
    ['Peintre Express', 'Peintre Express', 'BE0453456789', 'Rue Defacqz', '67', '1050', 'Ixelles', 'belgique', 'demo+peintre.express@seido-app.com', '+32 2 555 05 06', ''],
    ['Déco & Style SA', 'Déco & Style SA', 'BE0454567890', 'Rue de Livourne', '90', '1050', 'Ixelles', 'belgique', 'demo+deco.style@seido-app.com', '+32 2 555 05 07', ''],
    ['Peinture Moderne SPRL', 'Peinture Moderne SPRL', 'BE0455678901', 'Avenue Brugmann', '15', '1190', 'Forest', 'belgique', 'demo+peinture.moderne@seido-app.com', '+32 2 555 05 08', ''],
    // Ménage supplémentaires
    ['Ménage Express SPRL', 'Ménage Express SPRL', 'BE0460123456', 'Place de Brouckère', '12', '1000', 'Bruxelles', 'belgique', 'demo+menage.express@seido-app.com', '+32 2 555 06 04', ''],
    ['Propreté Plus SA', 'Propreté Plus SA', 'BE0461234567', 'Rue Royale', '34', '1000', 'Bruxelles', 'belgique', 'demo+proprete.plus@seido-app.com', '+32 2 555 06 05', ''],
    ['Clean Team SPRL', 'Clean Team SPRL', 'BE0462345678', 'Boulevard de Waterloo', '67', '1000', 'Bruxelles', 'belgique', 'demo+clean.team@seido-app.com', '+32 2 555 06 06', ''],
    ['Hygiène Services SA', 'Hygiène Services SA', 'BE0463456789', 'Avenue de la Toison d\'Or', '90', '1060', 'Saint-Gilles', 'belgique', 'demo+hygiene.services@seido-app.com', '+32 2 555 06 07', ''],
    ['Sparkle Clean', 'Sparkle Clean', 'BE0464567890', 'Place Louise', '15', '1050', 'Bruxelles', 'belgique', 'demo+sparkle.clean@seido-app.com', '+32 2 555 06 08', ''],
    // Jardinage supplémentaires
    ['Vert Espace SA', 'Vert Espace SA', 'BE0470123456', 'Drève du Duc', '89', '1160', 'Auderghem', 'belgique', 'demo+vert.espace@seido-app.com', '+32 2 555 07 03', ''],
    ['Nature & Jardin SPRL', 'Nature & Jardin SPRL', 'BE0471234567', 'Avenue des Hêtres', '12', '1170', 'Watermael', 'belgique', 'demo+nature.jardin@seido-app.com', '+32 2 555 07 04', ''],
    ['Éco Jardin', 'Éco Jardin', 'BE0472345678', 'Rue de la Forêt', '34', '1180', 'Uccle', 'belgique', 'demo+eco.jardin@seido-app.com', '+32 2 555 07 05', ''],
    // ============================================================================
    // PROPRIÉTAIRES - SCI et Sociétés Immobilières (~22)
    // ============================================================================
    ['SCI Bruxelles Invest', 'SCI Bruxelles Invest', 'BE0878901234', 'Place de Brouckère', '1', '1000', 'Bruxelles', 'belgique', 'demo+sci.bruxelles.invest@seido-app.com', '+32 2 555 10 01', ''],
    ['SCI Famille Dumont', 'SCI Famille Dumont', 'BE0480123456', 'Rue de la Loi', '15', '1040', 'Etterbeek', 'belgique', 'demo+sci.dumont@seido-app.com', '+32 2 555 10 09', ''],
    ['SCI Les Trois Couronnes', 'SCI Les Trois Couronnes', 'BE0481234567', 'Avenue de la Couronne', '23', '1050', 'Ixelles', 'belgique', 'demo+sci.couronnes@seido-app.com', '+32 2 555 10 11', ''],
    ['SCI Investissement Bruxelles', 'SCI Investissement Bruxelles', 'BE0482345678', 'Rue Malibran', '89', '1050', 'Ixelles', 'belgique', 'demo+sci.invest.bxl@seido-app.com', '+32 2 555 10 13', ''],
    ['Home Capital SPRL', 'Home Capital SPRL', 'BE0483456789', 'Avenue Molière', '12', '1050', 'Ixelles', 'belgique', 'demo+home.capital@seido-app.com', '+32 2 555 10 14', ''],
    ['SCI Sablon Prestige', 'SCI Sablon Prestige', 'BE0484567890', 'Place du Grand Sablon', '34', '1000', 'Bruxelles', 'belgique', 'demo+sci.sablon@seido-app.com', '+32 2 555 10 15', ''],
    ['SCI Woluwe Invest', 'SCI Woluwe Invest', 'BE0485678901', 'Avenue de Tervueren', '90', '1200', 'Woluwe', 'belgique', 'demo+sci.woluwe@seido-app.com', '+32 2 555 10 17', ''],
    ['SCI Quartier Européen', 'SCI Quartier Européen', 'BE0486789012', 'Rue Belliard', '48', '1040', 'Etterbeek', 'belgique', 'demo+sci.europeen@seido-app.com', '+32 2 555 10 19', ''],
    ['Immo Plus SA', 'Immo Plus SA', 'BE0989012345', 'Avenue Louise', '45', '1050', 'Bruxelles', 'belgique', 'demo+immo.plus@seido-app.com', '+32 2 555 10 02', 'https://immo-plus.be'],
    ['SCI Centre Ville', 'SCI Centre Ville', 'BE0100123456', 'Rue Neuve', '78', '1000', 'Bruxelles', 'belgique', 'demo+sci.centreville@seido-app.com', '+32 2 555 10 03', ''],
    ['Tower Investment SA', 'Tower Investment SA', 'BE0111234567', 'Boulevard du Roi Albert II', '1', '1210', 'Bruxelles', 'belgique', 'demo+tower.investment@seido-app.com', '+32 2 555 10 04', 'https://tower-investment.be'],
    ['SCI Résidentiel Uccle', 'SCI Résidentiel Uccle', 'BE0122345678', 'Avenue Churchill', '12', '1180', 'Uccle', 'belgique', 'demo+sci.uccle@seido-app.com', '+32 2 555 10 05', ''],
    ['Patrimoine Immo SPRL', 'Patrimoine Immo SPRL', 'BE0133456789', 'Avenue de Tervueren', '34', '1040', 'Etterbeek', 'belgique', 'demo+patrimoine.immo@seido-app.com', '+32 2 555 10 06', ''],
    ['SCI Rendement Plus', 'SCI Rendement Plus', 'BE0144567890', 'Boulevard Brand Whitlock', '67', '1200', 'Woluwe', 'belgique', 'demo+sci.rendement@seido-app.com', '+32 2 555 10 07', ''],
    ['Capital Stone SA', 'Capital Stone SA', 'BE0155678901', 'Avenue des Celtes', '90', '1040', 'Etterbeek', 'belgique', 'demo+capital.stone@seido-app.com', '+32 2 555 10 08', 'https://capital-stone.be'],
    ['Urban Properties SA', 'Urban Properties SA', 'BE0166789012', 'Avenue d\'Auderghem', '48', '1040', 'Etterbeek', 'belgique', 'demo+urban.properties@seido-app.com', '+32 2 555 10 10', 'https://urban-properties.be'],
    ['Belgian Real Estate SA', 'Belgian Real Estate SA', 'BE0177890123', 'Rue Gray', '56', '1050', 'Ixelles', 'belgique', 'demo+belgian.realestate@seido-app.com', '+32 2 555 10 12', 'https://belgian-realestate.be'],
    ['Prime Location SA', 'Prime Location SA', 'BE0188901234', 'Rue du Bailli', '67', '1050', 'Ixelles', 'belgique', 'demo+prime.location@seido-app.com', '+32 2 555 10 16', ''],
    ['Forest Properties SPRL', 'Forest Properties SPRL', 'BE0199012345', 'Avenue Brugmann', '15', '1190', 'Forest', 'belgique', 'demo+forest.properties@seido-app.com', '+32 2 555 10 18', ''],
    ['Schaerbeek Invest SA', 'Schaerbeek Invest SA', 'BE0200123456', 'Chaussée de Louvain', '23', '1030', 'Schaerbeek', 'belgique', 'demo+schaerbeek.invest@seido-app.com', '+32 2 555 10 20', ''],
    // ============================================================================
    // LOCATAIRES ENTREPRISES (~10)
    // ============================================================================
    ['Restaurant Le Sablon SPRL', 'Restaurant Le Sablon SPRL', 'BE0211234567', 'Place du Grand Sablon', '8', '1000', 'Bruxelles', 'belgique', 'demo+resto.sablon@seido-app.com', '+32 2 511 00 01', 'https://restaurant-sablon.be'],
    ['Fashion Store SA', 'Fashion Store SA', 'BE0222345678', 'Rue Neuve', '45', '1000', 'Bruxelles', 'belgique', 'demo+fashion.store@seido-app.com', '+32 2 511 00 02', ''],
    ['Boulangerie du Centre', 'Boulangerie du Centre SPRL', 'BE0233456789', 'Rue Neuve', '45', '1000', 'Bruxelles', 'belgique', 'demo+boulangerie.artisanale@seido-app.com', '+32 2 511 00 03', ''],
    ['Tech Startup SPRL', 'Tech Startup SPRL', 'BE0244567890', 'Rue Neuve', '45', '1000', 'Bruxelles', 'belgique', 'demo+tech.startup@seido-app.com', '+32 2 511 00 04', 'https://techstartup.be'],
    ['Cabinet Médical Dr Dupont', 'Cabinet Médical Dr Dupont SPRL', 'BE0255678901', 'Rue Neuve', '45', '1000', 'Bruxelles', 'belgique', 'demo+cabinet.dupont@seido-app.com', '+32 2 511 00 05', ''],
    ['Coiffure Élégance SPRL', 'Coiffure Élégance SPRL', 'BE0266789012', 'Rue Neuve', '45', '1000', 'Bruxelles', 'belgique', 'demo+coiffure.elegance@seido-app.com', '+32 2 511 00 06', ''],
    ['Pharmacie Centrale SA', 'Pharmacie Centrale SA', 'BE0277890123', 'Rue Neuve', '45', '1000', 'Bruxelles', 'belgique', 'demo+pharmacie.centrale@seido-app.com', '+32 2 511 00 07', ''],
    ['Entreprise Logistique SA', 'Entreprise Logistique SA', 'BE0288901234', 'Zone Industrielle Nord', '10', '1070', 'Anderlecht', 'belgique', 'demo+logistique@seido-app.com', '+32 2 520 00 01', 'https://logistique-bxl.be'],
    ['Atelier d\'Artiste SPRL', 'Atelier d\'Artiste SPRL', 'BE0299012345', 'Rue de l\'Industrie', '25', '1080', 'Molenbeek', 'belgique', 'demo+atelier.artiste@seido-app.com', '+32 2 520 00 02', ''],
    ['Cabinet Conseil Pro SA', 'Cabinet Conseil Pro SA', 'BE0300123456', 'Avenue du Port', '40', '1000', 'Bruxelles', 'belgique', 'demo+conseil.pro@seido-app.com', '+32 2 520 00 03', 'https://conseil-pro.be'],
  ],
  columnWidths: [30, 30, 15, 30, 10, 12, 20, 15, 35, 18, 30],
  requiredColumns: ['Nom*'],
};

// ============================================================================
// Column Mappings (Excel Header → DB Field)
// ============================================================================

export const BUILDING_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Nom*', dbField: 'name', required: true, type: 'string' },
  { excelHeader: 'Adresse*', dbField: 'address', required: true, type: 'string' },
  { excelHeader: 'Ville*', dbField: 'city', required: true, type: 'string' },
  { excelHeader: 'Code Postal*', dbField: 'postal_code', required: true, type: 'string' },
  {
    excelHeader: 'Pays',
    dbField: 'country',
    required: false,
    type: 'enum',
    enumValues: [...COUNTRIES],
    transform: (v) => String(v || 'france').toLowerCase(),
  },
  { excelHeader: 'Description', dbField: 'description', required: false, type: 'string' },
];

export const LOT_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Référence*', dbField: 'reference', required: true, type: 'string' },
  { excelHeader: 'Nom Immeuble', dbField: 'building_name', required: false, type: 'string' },
  {
    excelHeader: 'Catégorie',
    dbField: 'category',
    required: false,
    type: 'enum',
    enumValues: [...LOT_CATEGORIES],
    transform: (v) => String(v || 'appartement').toLowerCase(),
  },
  {
    excelHeader: 'Étage',
    dbField: 'floor',
    required: false,
    type: 'number',
    transform: (v) => v ? parseInt(String(v), 10) : undefined,
  },
  { excelHeader: 'Rue', dbField: 'street', required: false, type: 'string' },
  { excelHeader: 'Ville', dbField: 'city', required: false, type: 'string' },
  { excelHeader: 'Code Postal', dbField: 'postal_code', required: false, type: 'string' },
  {
    excelHeader: 'Pays',
    dbField: 'country',
    required: false,
    type: 'enum',
    enumValues: [...COUNTRIES],
    transform: (v) => String(v || 'france').toLowerCase(),
  },
  { excelHeader: 'Description', dbField: 'description', required: false, type: 'string' },
];

export const CONTACT_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Nom*', dbField: 'name', required: true, type: 'string' },
  { excelHeader: 'Email', dbField: 'email', required: false, type: 'string' },
  { excelHeader: 'Téléphone', dbField: 'phone', required: false, type: 'string' },
  {
    excelHeader: 'Rôle*',
    dbField: 'role',
    required: true,
    type: 'enum',
    enumValues: [...CONTACT_ROLES],
    transform: (v) => String(v || '').toLowerCase(),
  },
  { excelHeader: 'Adresse', dbField: 'address', required: false, type: 'string' },
  {
    excelHeader: 'Spécialité',
    dbField: 'speciality',
    required: false,
    type: 'enum',
    enumValues: [...INTERVENTION_TYPES],
    transform: (v) => {
      if (!v) return undefined;
      // Normalize: remove accents, lowercase, handle common variations
      const normalized = String(v)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim();
      // Direct match or return as-is (will be validated)
      return normalized;
    },
  },
  { excelHeader: 'Société', dbField: 'company_name', required: false, type: 'string' },
  { excelHeader: 'Notes', dbField: 'notes', required: false, type: 'string' },
];

export const CONTRACT_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Titre*', dbField: 'title', required: true, type: 'string' },
  { excelHeader: 'Réf Lot*', dbField: 'lot_reference', required: true, type: 'string' },
  {
    excelHeader: 'Date Début*',
    dbField: 'start_date',
    required: true,
    type: 'date',
    transform: (v) => {
      if (!v) return undefined;
      if (v instanceof Date) return v.toISOString().split('T')[0];
      const str = String(v);
      // Try to parse various date formats
      const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return str.slice(0, 10);
      const frMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      if (frMatch) return `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}`;
      return str;
    },
  },
  {
    excelHeader: 'Durée (mois)*',
    dbField: 'duration_months',
    required: true,
    type: 'number',
    transform: (v) => parseInt(String(v), 10),
  },
  {
    excelHeader: 'Loyer*',
    dbField: 'rent_amount',
    required: true,
    type: 'number',
    transform: (v) => parseFloat(String(v).replace(',', '.')),
  },
  {
    excelHeader: 'Charges',
    dbField: 'charges_amount',
    required: false,
    type: 'number',
    transform: (v) => v ? parseFloat(String(v).replace(',', '.')) : undefined,
  },
  {
    excelHeader: 'Type',
    dbField: 'contract_type',
    required: false,
    type: 'enum',
    enumValues: [...CONTRACT_TYPES],
    transform: (v) => String(v || 'bail_habitation').toLowerCase().replace(/['\s]/g, '_'),
  },
  {
    excelHeader: 'Garantie',
    dbField: 'guarantee_amount',
    required: false,
    type: 'number',
    transform: (v) => v ? parseFloat(String(v).replace(',', '.')) : undefined,
  },
  { excelHeader: 'Email Locataires', dbField: 'tenant_emails', required: false, type: 'string' },
  { excelHeader: 'Email Garants', dbField: 'guarantor_emails', required: false, type: 'string' },
  { excelHeader: 'Commentaires', dbField: 'comments', required: false, type: 'string' },
];

export const COMPANY_COLUMN_MAPPING: ColumnMapping[] = [
  { excelHeader: 'Nom*', dbField: 'name', required: true, type: 'string' },
  { excelHeader: 'Nom Légal', dbField: 'legal_name', required: false, type: 'string' },
  { excelHeader: 'N° TVA', dbField: 'vat_number', required: false, type: 'string' },
  { excelHeader: 'Rue', dbField: 'street', required: false, type: 'string' },
  { excelHeader: 'Numéro', dbField: 'street_number', required: false, type: 'string' },
  { excelHeader: 'Code Postal', dbField: 'postal_code', required: false, type: 'string' },
  { excelHeader: 'Ville', dbField: 'city', required: false, type: 'string' },
  {
    excelHeader: 'Pays',
    dbField: 'country',
    required: false,
    type: 'enum',
    enumValues: [...COUNTRIES],
    transform: (v) => String(v || 'belgique').toLowerCase(),
  },
  { excelHeader: 'Email', dbField: 'email', required: false, type: 'string' },
  { excelHeader: 'Téléphone', dbField: 'phone', required: false, type: 'string' },
  { excelHeader: 'Site Web', dbField: 'website', required: false, type: 'string' },
];

// ============================================================================
// Error Messages (French)
// ============================================================================

export const ERROR_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `Le champ "${field}" est obligatoire`,
  INVALID_FORMAT: (field: string, expected: string) =>
    `Format invalide pour "${field}". Attendu: ${expected}`,
  INVALID_ENUM: (field: string, allowed: string[]) =>
    `Valeur invalide pour "${field}". Valeurs autorisées: ${allowed.join(', ')}`,
  INVALID_NUMBER: (field: string) =>
    `"${field}" doit être un nombre valide`,
  INVALID_DATE: (field: string) =>
    `"${field}" doit être une date valide (format: AAAA-MM-JJ ou JJ/MM/AAAA)`,
  DUPLICATE_IN_FILE: (field: string, value: string) =>
    `Doublon détecté: "${value}" apparaît plusieurs fois dans "${field}"`,
  DUPLICATE_IN_DATABASE: (entity: string, identifier: string) =>
    `${entity} "${identifier}" existe déjà dans la base de données`,
  REFERENCE_NOT_FOUND: (entity: string, reference: string) =>
    `${entity} "${reference}" introuvable`,
  REFERENCE_AMBIGUOUS: (entity: string, reference: string, count: number) =>
    `${entity} "${reference}" correspond à ${count} entrées. Précisez la référence.`,
  CONFLICT: (message: string) => message,
  PERMISSION_DENIED: () =>
    `Vous n'avez pas les permissions nécessaires pour cette opération`,
  UNKNOWN: (details?: string) =>
    `Erreur inconnue${details ? `: ${details}` : ''}`,
} as const;

// ============================================================================
// Validation Constraints
// ============================================================================

export const VALIDATION_CONSTRAINTS = {
  building: {
    name: { minLength: 1, maxLength: 200 },
    address: { minLength: 1, maxLength: 500 },
    city: { minLength: 1, maxLength: 100 },
    postal_code: { pattern: /^\d{4,10}$/ },  // 4-10 digits (supports various countries)
    description: { maxLength: 5000 },
  },
  lot: {
    reference: { minLength: 1, maxLength: 100 },
    floor: { min: -10, max: 200 },
    street: { maxLength: 500 },
    city: { maxLength: 100 },
    postal_code: { pattern: /^\d{4,10}$/ },
    description: { maxLength: 5000 },
  },
  contact: {
    name: { minLength: 1, maxLength: 200 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { maxLength: 50 },
    address: { maxLength: 500 },
    speciality: { maxLength: 100 },
    notes: { maxLength: 2000 },
  },
  contract: {
    title: { minLength: 1, maxLength: 200 },
    lot_reference: { minLength: 1, maxLength: 100 },
    start_date: { pattern: /^\d{4}-\d{2}-\d{2}$/ },
    duration_months: { min: 1, max: 120 },
    rent_amount: { min: 0, max: 1000000 },
    charges_amount: { min: 0, max: 100000 },
    guarantee_amount: { min: 0, max: 1000000 },
    comments: { maxLength: 5000 },
  },
  company: {
    name: { minLength: 1, maxLength: 200 },
    legal_name: { maxLength: 200 },
    vat_number: { maxLength: 50, pattern: /^[A-Z]{2}[0-9A-Z]+$/ },  // Format EU VAT
    street: { maxLength: 500 },
    street_number: { maxLength: 20 },
    postal_code: { pattern: /^\d{4,10}$/ },
    city: { maxLength: 100 },
    email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { maxLength: 50 },
    website: { maxLength: 500, pattern: /^https?:\/\/.+/ },
  },
} as const;

// ============================================================================
// File Constraints
// ============================================================================

export const FILE_CONSTRAINTS = {
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  maxRows: 5000,  // Per sheet
  allowedMimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
  ],
  allowedExtensions: ['.xlsx', '.xls', '.csv'],
} as const;
