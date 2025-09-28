/**
 * Assignment Utilities - Phase 5.1
 * Helper functions for determining user assignment types and roles
 */


/**
 * User with assignment context
 */
export interface AssignmentUser {
  id: string
  role: string
  provider_category?: 'service' | 'insurance' | 'legal' | 'syndic' | 'owner' | 'other' | 'prestataire' | 'assurance' | 'notaire' | 'proprietaire' | 'autre' | null
  speciality?: string
}

/**
 * Determine the assignment type of a user based on their role and provider category
 */
export const determineAssignmentType = (user: AssignmentUser): string => {
  // Support both French (DB) and English (interface) roles
  if (user.role === 'tenant' || user.role === 'locataire') return 'tenant'
  if (user.role === 'manager' || user.role === 'gestionnaire' || user.role === 'admin') return 'manager'

  if (user.role === 'provider' || user.role === 'prestataire') {
    // Support both French (DB) and English (interface) categories
    const category = user.provider_category
    if (category === 'syndic') return 'syndic'
    if (category === 'legal' || category === 'notaire') return 'notary'
    if (category === 'insurance' || category === 'assurance') return 'insurance'
    if (category === 'owner' || category === 'proprietaire') return 'owner'
    return 'provider' // Default for providers
  }

  return 'other'
}

/**
 * Filter users by assignment type
 */
export const filterUsersByRole = (users: AssignmentUser[], requestedType: string): AssignmentUser[] => {
  return users.filter(user => determineAssignmentType(user) === requestedType)
}

/**
 * Validate assignment according to context
 */
export const validateAssignment = (user: AssignmentUser, context: 'building' | 'lot'): boolean => {
  // Tenants can only be assigned to lots, never to buildings
  if ((user.role === 'tenant' || user.role === 'locataire') && context === 'building') {
    return false
  }
  return true
}

/**
 * Get assignment type display name
 */
export const getAssignmentTypeDisplayName = (assignmentType: string): string => {
  const displayNames: Record<string, string> = {
    'tenant': 'Locataire',
    'manager': 'Gestionnaire',
    'provider': 'Prestataire',
    'syndic': 'Syndic',
    'notary': 'Notaire',
    'insurance': 'Assureur',
    'owner': 'Propriétaire',
    'other': 'Autre'
  }

  return displayNames[assignmentType] || assignmentType
}

/**
 * Check if user can be assigned to a specific context
 */
export const canAssignToContext = (user: AssignmentUser, context: 'building' | 'lot', role?: string): boolean => {
  if (!validateAssignment(user, context)) {
    return false
  }

  if (role) {
    return determineAssignmentType(user) === role
  }

  return true
}

/**
 * Get available assignment types for a context
 */
export const getAvailableAssignmentTypes = (context: 'building' | 'lot'): string[] => {
  const baseTypes = ['manager', 'provider', 'syndic', 'notary', 'insurance', 'owner']

  if (context === 'lot') {
    return [...baseTypes, 'tenant']
  }

  return baseTypes
}

/**
 * Map frontend role to database role and provider category
 */
export const mapFrontendToDbRole = (frontendRole: string): { role: string; provider_category?: string } => {
  const mapping: Record<string, { role: string; provider_category?: string }> = {
    'tenant': { role: 'locataire' },
    'locataire': { role: 'locataire' },
    'manager': { role: 'gestionnaire' },
    'gestionnaire': { role: 'gestionnaire' },
    'admin': { role: 'admin' },
    'provider': { role: 'prestataire', provider_category: 'service' },
    'prestataire': { role: 'prestataire', provider_category: 'service' },
    'syndic': { role: 'prestataire', provider_category: 'syndic' },
    'insurance': { role: 'prestataire', provider_category: 'insurance' },
    'assurance': { role: 'prestataire', provider_category: 'assurance' },
    'notary': { role: 'prestataire', provider_category: 'legal' },
    'notaire': { role: 'prestataire', provider_category: 'notaire' },
    'owner': { role: 'gestionnaire' },
    'proprietaire': { role: 'gestionnaire' }
  }

  return mapping[frontendRole.toLowerCase()] || { role: 'locataire' }
}

/**
 * Get provider categories for a role
 */
export const getProviderCategories = (): Array<{ value: string; label: string }> => {
  return [
    { value: 'service', label: 'Service' },
    { value: 'prestataire', label: 'Prestataire' },
    { value: 'syndic', label: 'Syndic' },
    { value: 'insurance', label: 'Assurance' },
    { value: 'assurance', label: 'Assureur' },
    { value: 'legal', label: 'Juridique' },
    { value: 'notaire', label: 'Notaire' },
    { value: 'proprietaire', label: 'Propriétaire' },
    { value: 'autre', label: 'Autre' }
  ]
}
