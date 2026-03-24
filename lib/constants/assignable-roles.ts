/**
 * Assignable role configurations for the InterventionPlannerStep
 *
 * Defines which roles appear in the assignment popover for each context.
 * Lease wizards show all 3 roles; supplier wizards exclude locataires.
 */

import { Users, User, Briefcase } from 'lucide-react'
import type { AssignableRole } from '@/lib/types/intervention-planner.types'

export const ALL_ASSIGNABLE_ROLES: AssignableRole[] = [
  { type: 'manager', label: 'Gestionnaires', Icon: Users, color: 'text-purple-600', role: 'gestionnaire' },
  { type: 'tenant', label: 'Locataires', Icon: User, color: 'text-blue-600', role: 'locataire' },
  { type: 'provider', label: 'Prestataires', Icon: Briefcase, color: 'text-green-600', role: 'prestataire' },
]

/** All 3 roles for lease wizards */
export const LEASE_ASSIGNABLE_ROLES = ALL_ASSIGNABLE_ROLES

/** Only gestionnaires + prestataires for supplier contract wizards */
export const SUPPLIER_ASSIGNABLE_ROLES = ALL_ASSIGNABLE_ROLES.filter(r => r.type !== 'tenant')

/** Mapping from FR role name to ContactSelector EN type */
export const ROLE_TO_CONTACT_TYPE: Record<string, string> = {
  gestionnaire: 'manager',
  locataire: 'tenant',
  prestataire: 'provider',
}

/** Mapping from ContactSelector EN type to FR role name */
export const CONTACT_TYPE_TO_ROLE: Record<string, 'gestionnaire' | 'prestataire' | 'locataire'> = {
  manager: 'gestionnaire',
  tenant: 'locataire',
  provider: 'prestataire',
}

/** Role-based color classes for avatar chips */
export const ROLE_COLORS: Record<string, string> = {
  gestionnaire: 'bg-purple-100 text-purple-700 border-purple-200',
  prestataire: 'bg-green-100 text-green-700 border-green-200',
  locataire: 'bg-blue-100 text-blue-700 border-blue-200',
}

/** Only gestionnaires for reminder assignment */
export const GESTIONNAIRE_ONLY_ROLES = ALL_ASSIGNABLE_ROLES.filter(r => r.type === 'manager')
