import type { RoleConfig, CategoryOption } from './types'

/**
 * User roles configuration with display properties
 */
export const USER_ROLES: RoleConfig[] = [
  { value: "locataire", label: "Locataire", color: "bg-blue-100 text-blue-800" },
  { value: "gestionnaire", label: "Gestionnaire", color: "bg-purple-100 text-purple-800" },
  { value: "proprietaire", label: "Propriétaire", color: "bg-amber-100 text-amber-800" },
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" }
]

/**
 * Provider categories for prestataires
 */
export const PROVIDER_CATEGORIES: CategoryOption[] = [
  { value: "prestataire", label: "Prestataire" },
  { value: "autre", label: "Autre" }
]

/**
 * Specialities for prestataires
 */
export const SPECIALITIES: CategoryOption[] = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
  { value: "autre", label: "Autre" }
]

/**
 * Get role configuration by value
 */
export const getRoleConfig = (roleValue: string): RoleConfig => {
  return USER_ROLES.find(r => r.value === roleValue) || USER_ROLES[0]
}

/**
 * Get provider category label by value
 */
export const getProviderCategoryLabel = (categoryValue: string): string => {
  return PROVIDER_CATEGORIES.find(c => c.value === categoryValue)?.label || categoryValue
}

/**
 * Get speciality label by value
 */
export const getSpecialityLabel = (specialityValue: string): string => {
  return SPECIALITIES.find(s => s.value === specialityValue)?.label || specialityValue
}
