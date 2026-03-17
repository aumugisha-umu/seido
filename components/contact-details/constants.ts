import {
  Wrench,
  Sparkles,
  Zap,
  Shield,
  Building,
  Scale,
  Stamp,
  Users,
  Home,
  UserCog,
  CircleDot,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RoleConfig, CategoryOption } from './types'

/**
 * User roles configuration with display properties
 */
export const USER_ROLES: RoleConfig[] = [
  { value: "locataire", label: "Locataire", color: "bg-blue-100 text-blue-800" },
  { value: "gestionnaire", label: "Gestionnaire", color: "bg-purple-100 text-purple-800" },
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" },
  { value: "proprietaire", label: "Propriétaire", color: "bg-purple-100 text-purple-800" },
  { value: "garant", label: "Garant", color: "bg-amber-100 text-amber-800" }
]

/**
 * Provider categories for prestataires — matches provider_category enum in DB
 */
export const PROVIDER_CATEGORIES: CategoryOption[] = [
  { value: "artisan", label: "Artisan" },
  { value: "services", label: "Services" },
  { value: "energie", label: "Énergie & Fluides" },
  { value: "assurance", label: "Assurance" },
  { value: "administration", label: "Administration" },
  { value: "juridique", label: "Juridique" },
  { value: "notaire", label: "Notaire" },
  { value: "syndic", label: "Syndic" },
  { value: "proprietaire", label: "Propriétaire" },
  { value: "prestataire", label: "Prestataire (général)" },
  { value: "autre", label: "Autre" },
]

/**
 * Icon mapping for provider categories
 */
export const PROVIDER_CATEGORY_ICONS: Record<string, LucideIcon> = {
  artisan: Wrench,
  services: Sparkles,
  energie: Zap,
  assurance: Shield,
  administration: Building,
  juridique: Scale,
  notaire: Stamp,
  syndic: Users,
  proprietaire: Home,
  prestataire: UserCog,
  autre: CircleDot,
}

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
 * Get provider category icon by value
 */
export const getProviderCategoryIcon = (categoryValue: string): LucideIcon => {
  return PROVIDER_CATEGORY_ICONS[categoryValue] || CircleDot
}

/**
 * Get speciality label by value
 */
export const getSpecialityLabel = (specialityValue: string): string => {
  return SPECIALITIES.find(s => s.value === specialityValue)?.label || specialityValue
}
