// Types et constantes pour la gestion des catégories de lots

export const LOT_CATEGORIES = [
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'autre'
] as const

export type LotCategory = typeof LOT_CATEGORIES[number]

// Configuration des catégories avec métadonnées pour l'interface
export const LOT_CATEGORY_CONFIG = {
  appartement: {
    label: 'Appartement',
    description: 'Logement dans un immeuble collectif',
    icon: 'Building',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  collocation: {
    label: 'Colocation', 
    description: 'Logement partagé entre plusieurs locataires',
    icon: 'Users',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  maison: {
    label: 'Maison',
    description: 'Habitation individuelle',
    icon: 'Home',
    color: 'text-green-600', 
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  garage: {
    label: 'Garage',
    description: 'Espace de stationnement fermé',
    icon: 'Car',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200'
  },
  local_commercial: {
    label: 'Local commercial',
    description: 'Espace destiné à l\'activité commerciale',
    icon: 'Store',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  autre: {
    label: 'Autre',
    description: 'Autre type de bien',
    icon: 'MoreHorizontal',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  }
} as const

// Helper function pour obtenir la configuration d'une catégorie
export function getLotCategoryConfig(category: LotCategory) {
  return LOT_CATEGORY_CONFIG[category]
}

// Helper function pour obtenir toutes les catégories avec leur configuration
export function getAllLotCategories() {
  return LOT_CATEGORIES.map(category => ({
    key: category,
    ...LOT_CATEGORY_CONFIG[category]
  }))
}

// Type étendu pour les lots avec catégorie
export interface LotWithCategory {
  id: string
  reference: string
  floor?: number | null
  apartment_number?: string | null
  surface_area?: number | null
  rooms?: number | null
  is_occupied?: boolean | null
  category: LotCategory
  building_id: string
  charges_amount?: number | null
  created_at?: string | null
  updated_at?: string | null
}
