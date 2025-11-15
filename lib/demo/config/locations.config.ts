/**
 * Configuration des localisations pour le mode démo
 * 80% Belgique + 20% pays frontaliers
 */

export interface DemoAddress {
  street: string
  city: string
  postalCode: string
  country: string
  region?: string
}

/**
 * Adresses belges (80% des données)
 */
export const BELGIAN_ADDRESSES: DemoAddress[] = [
  // Bruxelles-Capitale (30% du total - 15 adresses)
  { street: 'Avenue Louise 234', city: 'Bruxelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Rue de la Loi 45', city: 'Bruxelles', postalCode: '1040', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Chaussée d\'Ixelles 123', city: 'Ixelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Place Flagey 18', city: 'Ixelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Boulevard du Souverain 67', city: 'Watermael-Boitsfort', postalCode: '1170', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Rue Haute 89', city: 'Bruxelles', postalCode: '1000', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Avenue de Tervueren 156', city: 'Etterbeek', postalCode: '1040', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Chaussée de Waterloo 234', city: 'Uccle', postalCode: '1180', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Rue Malibran 12', city: 'Ixelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Boulevard Général Jacques 45', city: 'Schaerbeek', postalCode: '1030', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Avenue des Celtes 78', city: 'Etterbeek', postalCode: '1040', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Rue du Bailli 56', city: 'Ixelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Place Stéphanie 23', city: 'Bruxelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Boulevard de Waterloo 118', city: 'Bruxelles', postalCode: '1000', country: 'Belgique', region: 'Bruxelles-Capitale' },
  { street: 'Rue de la Concorde 67', city: 'Bruxelles', postalCode: '1050', country: 'Belgique', region: 'Bruxelles-Capitale' },

  // Flandre (30% du total - 15 adresses)
  { street: 'Groenplaats 21', city: 'Anvers', postalCode: '2000', country: 'Belgique', region: 'Flandre' },
  { street: 'Meir 78', city: 'Anvers', postalCode: '2000', country: 'Belgique', region: 'Flandre' },
  { street: 'Korenmarkt 5', city: 'Gand', postalCode: '9000', country: 'Belgique', region: 'Flandre' },
  { street: 'Vrijdagmarkt 34', city: 'Gand', postalCode: '9000', country: 'Belgique', region: 'Flandre' },
  { street: 'Markt 34', city: 'Bruges', postalCode: '8000', country: 'Belgique', region: 'Flandre' },
  { street: 'Steenstraat 67', city: 'Bruges', postalCode: '8000', country: 'Belgique', region: 'Flandre' },
  { street: 'Grote Markt 12', city: 'Louvain', postalCode: '3000', country: 'Belgique', region: 'Flandre' },
  { street: 'Bondgenotenlaan 89', city: 'Louvain', postalCode: '3000', country: 'Belgique', region: 'Flandre' },
  { street: 'Veemarkt 23', city: 'Malines', postalCode: '2800', country: 'Belgique', region: 'Flandre' },
  { street: 'Bruul 45', city: 'Malines', postalCode: '2800', country: 'Belgique', region: 'Flandre' },
  { street: 'Vismarkt 18', city: 'Gand', postalCode: '9000', country: 'Belgique', region: 'Flandre' },
  { street: 'Lange Kievitstraat 56', city: 'Anvers', postalCode: '2018', country: 'Belgique', region: 'Flandre' },
  { street: 'Katelijnestraat 34', city: 'Bruges', postalCode: '8000', country: 'Belgique', region: 'Flandre' },
  { street: 'Tiensestraat 112', city: 'Louvain', postalCode: '3000', country: 'Belgique', region: 'Flandre' },
  { street: 'Sint-Jansstraat 78', city: 'Malines', postalCode: '2800', country: 'Belgique', region: 'Flandre' },

  // Wallonie (20% du total - 10 adresses)
  { street: 'Rue Léopold 67', city: 'Liège', postalCode: '4000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Place Saint-Lambert 12', city: 'Liège', postalCode: '4000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Boulevard Tirou 12', city: 'Charleroi', postalCode: '6000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Rue de Marchienne 45', city: 'Charleroi', postalCode: '6000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Rue de Fer 23', city: 'Namur', postalCode: '5000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Rue de Bruxelles 89', city: 'Namur', postalCode: '5000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Grand-Place 34', city: 'Mons', postalCode: '7000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Rue de Nimy 56', city: 'Mons', postalCode: '7000', country: 'Belgique', region: 'Wallonie' },
  { street: 'Grand-Place 18', city: 'Tournai', postalCode: '7500', country: 'Belgique', region: 'Wallonie' },
  { street: 'Rue Royale 78', city: 'Tournai', postalCode: '7500', country: 'Belgique', region: 'Wallonie' },
]

/**
 * Adresses pays frontaliers (20% des données)
 */
export const BORDER_ADDRESSES: DemoAddress[] = [
  // France (10% du total - 5 adresses)
  { street: 'Rue Faidherbe 45', city: 'Lille', postalCode: '59000', country: 'France', region: 'Nord' },
  { street: 'Grand Place 12', city: 'Lille', postalCode: '59000', country: 'France', region: 'Nord' },
  { street: 'Place de la République 12', city: 'Valenciennes', postalCode: '59300', country: 'France', region: 'Nord' },
  { street: 'Avenue de Liège 34', city: 'Charleville-Mézières', postalCode: '08000', country: 'France', region: 'Ardennes' },
  { street: 'Rue de la Halle 23', city: 'Tourcoing', postalCode: '59200', country: 'France', region: 'Nord' },

  // Pays-Bas (5% du total - 3 adresses)
  { street: 'Vrijthof 23', city: 'Maastricht', postalCode: '6211', country: 'Pays-Bas', region: 'Limbourg' },
  { street: 'Grote Straat 45', city: 'Maastricht', postalCode: '6211', country: 'Pays-Bas', region: 'Limbourg' },
  { street: 'Markt 18', city: 'Eindhoven', postalCode: '5611', country: 'Pays-Bas', region: 'Brabant' },

  // Allemagne (3% du total - 1 adresse)
  { street: 'Markt 45', city: 'Aachen', postalCode: '52062', country: 'Allemagne', region: 'Rhénanie' },

  // Luxembourg (2% du total - 1 adresse)
  { street: 'Avenue de la Liberté 34', city: 'Luxembourg', postalCode: '1930', country: 'Luxembourg', region: 'Luxembourg' },
]

/**
 * Tous les types d'immeubles
 */
export const BUILDING_TYPES = [
  'résidentiel',
  'commercial',
  'mixte'
] as const

/**
 * Noms belges réalistes
 */
export const BELGIAN_FIRST_NAMES = {
  male: ['Jean', 'Pierre', 'Marc', 'Luc', 'Paul', 'Tom', 'Koen', 'Jan', 'Dirk', 'Wim', 'Mathieu', 'François', 'Philippe', 'Thomas', 'Nicolas'],
  female: ['Marie', 'Sophie', 'Isabelle', 'Nathalie', 'Anne', 'Emma', 'Lisa', 'Sara', 'Julie', 'Charlotte', 'Céline', 'Véronique', 'Caroline', 'Laura']
} as const

export const BELGIAN_LAST_NAMES = [
  'Dupont', 'Dubois', 'Lambert', 'Martin', 'Simon', 'Bernard', 'Petit', 'Robert', 'Richard',
  'Van der Linden', 'Janssens', 'Peeters', 'Mertens', 'De Smet', 'Maes', 'Claes',
  'Willems', 'Goossens', 'Wouters', 'De Vries', 'Jacobs', 'Vermeulen', 'De Cock',
  'Van den Berg', 'Smit', 'Bakker', 'Visser', 'De Wit'
] as const

/**
 * Entreprises prestataires belges
 */
export const BELGIAN_COMPANIES = {
  plomberie: [
    'Plomberie Bruxelloise SPRL',
    'Sanitech Liège SA',
    'Aqua Service Anvers',
    'Plomberie Van der Linden',
    'SOS Plombier Namur'
  ],
  electricite: [
    'Électricité Dupont SA',
    'Bruxelles Électrique SPRL',
    'Eurolight Anvers',
    'Elec Expert Liège',
    'Watts & Co Gand'
  ],
  chauffage: [
    'Chauffage Expert Anvers',
    'Thermique Wallonne SA',
    'Climasoft Bruxelles',
    'Heating Solutions Liège',
    'Warmte Service Gand'
  ],
  menuiserie: [
    'Menuiserie Wallonne SPRL',
    'Bois & Design Bruxelles',
    'Woodcraft Anvers',
    'Ateliers Lambert',
    'Menuiserie Moderne Liège'
  ],
  peinture: [
    'Peinture & Décoration Gand',
    'Couleurs Bruxelles SA',
    'Painting Pro Anvers',
    'Déco Service Liège',
    'Revêtements Dupont'
  ]
} as const

/**
 * Helper pour obtenir une adresse aléatoire avec distribution correcte
 * 80% Belgique, 20% Frontaliers
 */
export function getRandomAddress(): DemoAddress {
  const random = Math.random()

  if (random < 0.8) {
    // 80% chance d'obtenir une adresse belge
    return BELGIAN_ADDRESSES[Math.floor(Math.random() * BELGIAN_ADDRESSES.length)]
  } else {
    // 20% chance d'obtenir une adresse frontalière
    return BORDER_ADDRESSES[Math.floor(Math.random() * BORDER_ADDRESSES.length)]
  }
}

/**
 * Helper pour obtenir un nom belge complet
 */
export function getRandomBelgianName(gender?: 'male' | 'female'): { firstName: string; lastName: string; fullName: string } {
  const selectedGender = gender || (Math.random() > 0.5 ? 'male' : 'female')
  const firstName = BELGIAN_FIRST_NAMES[selectedGender][Math.floor(Math.random() * BELGIAN_FIRST_NAMES[selectedGender].length)]
  const lastName = BELGIAN_LAST_NAMES[Math.floor(Math.random() * BELGIAN_LAST_NAMES.length)]

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  }
}

/**
 * Helper pour obtenir un numéro de téléphone belge
 */
export function getRandomBelgianPhone(): string {
  const prefixes = ['2', '4', '9', '3', '11', '15', '16', '19']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]

  const num1 = Math.floor(Math.random() * 900 + 100)
  const num2 = Math.floor(Math.random() * 90 + 10)
  const num3 = Math.floor(Math.random() * 90 + 10)

  return `+32 ${prefix} ${num1} ${num2} ${num3}`
}

/**
 * Helper pour obtenir un nom d'entreprise prestataire
 */
export function getRandomCompanyName(category: keyof typeof BELGIAN_COMPANIES): string {
  const companies = BELGIAN_COMPANIES[category]
  return companies[Math.floor(Math.random() * companies.length)]
}
