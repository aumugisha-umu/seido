/**
 * Mutations pour le mode démo
 * Opérations CRUD sur le DemoDataStore
 */

import { getDemoDataStore } from './store/demo-data-store'
import { v4 as uuidv4 } from 'uuid'

/**
 * Générer un ID unique
 */
function generateId(): string {
  return uuidv4()
}

/**
 * BUILDINGS
 */

export const createBuilding = (data: {
  team_id: string
  reference: string
  name?: string
  address: string
  city: string
  postal_code: string
  country: string
  building_type?: string
  construction_year?: number
  total_floors?: number
  total_units?: number
  has_elevator?: boolean
  has_parking?: boolean
}) => {
  const store = getDemoDataStore()

  const building = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('buildings', building)
}

export const updateBuilding = (buildingId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('buildings', buildingId, data)
}

export const deleteBuilding = (buildingId: string) => {
  const store = getDemoDataStore()
  return store.delete('buildings', buildingId)
}

/**
 * LOTS
 */

export const createLot = (data: {
  building_id: string
  team_id: string
  reference: string
  name?: string
  category: string
  floor?: string
  surface?: number
  bedrooms?: number
  bathrooms?: number
  has_balcony?: boolean
  has_terrace?: boolean
  has_parking?: boolean
}) => {
  const store = getDemoDataStore()

  const lot = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('lots', lot)
}

export const updateLot = (lotId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('lots', lotId, data)
}

export const deleteLot = (lotId: string) => {
  const store = getDemoDataStore()
  return store.delete('lots', lotId)
}

/**
 * LOT CONTACTS
 */

export const createLotContact = (data: {
  lot_id: string
  user_id: string
  role: 'proprietaire' | 'locataire' | 'gestionnaire'
}) => {
  const store = getDemoDataStore()

  const lotContact = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString()
  }

  return store.create('lot_contacts', lotContact)
}

export const deleteLotContact = (lotContactId: string) => {
  const store = getDemoDataStore()
  return store.delete('lot_contacts', lotContactId)
}

/**
 * BUILDING CONTACTS
 */

export const createBuildingContact = (data: {
  building_id: string
  user_id: string
  role: 'proprietaire' | 'gestionnaire' | 'syndic'
}) => {
  const store = getDemoDataStore()

  const buildingContact = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString()
  }

  return store.create('building_contacts', buildingContact)
}

export const deleteBuildingContact = (buildingContactId: string) => {
  const store = getDemoDataStore()
  return store.delete('building_contacts', buildingContactId)
}

/**
 * INTERVENTIONS
 */

export const createIntervention = (data: {
  team_id: string
  building_id?: string
  lot_id?: string
  reference: string
  title: string
  description?: string
  type: string
  urgency: 'faible' | 'normale' | 'haute' | 'urgente'
  status: string
  created_by: string
}) => {
  const store = getDemoDataStore()

  const intervention = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('interventions', intervention)
}

export const updateIntervention = (interventionId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('interventions', interventionId, data)
}

export const deleteIntervention = (interventionId: string) => {
  const store = getDemoDataStore()
  return store.delete('interventions', interventionId)
}

/**
 * INTERVENTION ASSIGNMENTS
 */

export const createInterventionAssignment = (data: {
  intervention_id: string
  user_id: string
  role: 'gestionnaire' | 'locataire' | 'prestataire'
}) => {
  const store = getDemoDataStore()

  const assignment = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString()
  }

  return store.create('intervention_assignments', assignment)
}

export const deleteInterventionAssignment = (assignmentId: string) => {
  const store = getDemoDataStore()
  return store.delete('intervention_assignments', assignmentId)
}

/**
 * INTERVENTION QUOTES
 */

export const createInterventionQuote = (data: {
  intervention_id: string
  provider_id: string
  amount: number
  description?: string
  status: 'pending' | 'accepted' | 'rejected'
  valid_until?: string
}) => {
  const store = getDemoDataStore()

  const quote = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('intervention_quotes', quote)
}

export const updateInterventionQuote = (quoteId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('intervention_quotes', quoteId, data)
}

export const deleteInterventionQuote = (quoteId: string) => {
  const store = getDemoDataStore()
  return store.delete('intervention_quotes', quoteId)
}

/**
 * INTERVENTION COMMENTS
 */

export const createInterventionComment = (data: {
  intervention_id: string
  user_id: string
  content: string
  is_internal?: boolean
}) => {
  const store = getDemoDataStore()

  const comment = {
    id: generateId(),
    ...data,
    is_internal: data.is_internal || false,
    created_at: new Date().toISOString()
  }

  return store.create('intervention_comments', comment)
}

export const deleteInterventionComment = (commentId: string) => {
  const store = getDemoDataStore()
  return store.delete('intervention_comments', commentId)
}

/**
 * INTERVENTION TIME SLOTS
 */

export const createInterventionTimeSlot = (data: {
  intervention_id: string
  start_time: string
  end_time: string
  status: 'proposed' | 'accepted' | 'rejected'
  proposed_by: string
}) => {
  const store = getDemoDataStore()

  const timeSlot = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString()
  }

  return store.create('intervention_time_slots', timeSlot)
}

export const updateInterventionTimeSlot = (timeSlotId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('intervention_time_slots', timeSlotId, data)
}

export const deleteInterventionTimeSlot = (timeSlotId: string) => {
  const store = getDemoDataStore()
  return store.delete('intervention_time_slots', timeSlotId)
}

/**
 * NOTIFICATIONS
 */

export const createNotification = (data: {
  user_id?: string
  team_id?: string
  type: 'intervention' | 'system' | 'team' | 'message' | 'document'
  title: string
  content?: string
  link_url?: string
  is_read?: boolean
}) => {
  const store = getDemoDataStore()

  const notification = {
    id: generateId(),
    ...data,
    is_read: data.is_read || false,
    created_at: new Date().toISOString()
  }

  return store.create('notifications', notification)
}

export const markNotificationAsRead = (notificationId: string) => {
  const store = getDemoDataStore()
  return store.update('notifications', notificationId, { is_read: true })
}

export const markAllNotificationsAsRead = (userId: string) => {
  const store = getDemoDataStore()

  const notifications = store.query('notifications', {
    filters: { user_id: userId, is_read: false }
  })

  notifications.forEach((notif: any) => {
    store.update('notifications', notif.id, { is_read: true })
  })

  return notifications.length
}

export const deleteNotification = (notificationId: string) => {
  const store = getDemoDataStore()
  return store.delete('notifications', notificationId)
}

/**
 * ACTIVITY LOGS
 */

export const createActivityLog = (data: {
  team_id: string
  user_id?: string
  entity_type: 'intervention' | 'building' | 'lot' | 'user' | 'team'
  entity_id: string
  action: string
  details?: Record<string, any>
}) => {
  const store = getDemoDataStore()

  const activityLog = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString()
  }

  return store.create('activity_logs', activityLog)
}

/**
 * CONVERSATIONS
 */

export const createConversationThread = (data: {
  intervention_id: string
  team_id: string
  title?: string
}) => {
  const store = getDemoDataStore()

  const thread = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('conversation_threads', thread)
}

export const createConversationMessage = (data: {
  thread_id: string
  user_id: string
  content: string
  is_internal?: boolean
}) => {
  const store = getDemoDataStore()

  const message = {
    id: generateId(),
    ...data,
    is_internal: data.is_internal || false,
    created_at: new Date().toISOString()
  }

  const createdMessage = store.create('conversation_messages', message)

  // Mettre à jour le updated_at du thread
  store.update('conversation_threads', data.thread_id, {
    updated_at: new Date().toISOString()
  })

  return createdMessage
}

/**
 * USERS
 */

export const createUser = (data: {
  team_id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  phone?: string
  avatar_url?: string
}) => {
  const store = getDemoDataStore()

  const user = {
    id: generateId(),
    ...data,
    name: `${data.first_name} ${data.last_name}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('users', user)
}

export const updateUser = (userId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('users', userId, data)
}

export const deleteUser = (userId: string) => {
  const store = getDemoDataStore()
  return store.delete('users', userId)
}

/**
 * USER INVITATIONS
 */

export const createUserInvitation = (data: {
  team_id: string
  email: string
  role: 'gestionnaire' | 'locataire' | 'prestataire'
  invited_by: string
  status?: 'pending' | 'accepted' | 'rejected'
  expires_at?: string
}) => {
  const store = getDemoDataStore()

  const invitation = {
    id: generateId(),
    ...data,
    status: data.status || 'pending',
    expires_at: data.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
    created_at: new Date().toISOString()
  }

  return store.create('user_invitations', invitation)
}

export const updateUserInvitation = (invitationId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('user_invitations', invitationId, data)
}

export const deleteUserInvitation = (invitationId: string) => {
  const store = getDemoDataStore()
  return store.delete('user_invitations', invitationId)
}

/**
 * COMPANIES
 */

export const createCompany = (data: {
  team_id: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  vat_number?: string
  specialties?: string[]
}) => {
  const store = getDemoDataStore()

  const company = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  return store.create('companies', company)
}

export const updateCompany = (companyId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('companies', companyId, data)
}

export const deleteCompany = (companyId: string) => {
  const store = getDemoDataStore()
  return store.delete('companies', companyId)
}

/**
 * COMPANY MEMBERS
 */

export const createCompanyMember = (data: {
  company_id: string
  user_id: string
  role: 'owner' | 'member'
}) => {
  const store = getDemoDataStore()

  const member = {
    id: generateId(),
    ...data,
    created_at: new Date().toISOString()
  }

  return store.create('company_members', member)
}

export const deleteCompanyMember = (memberId: string) => {
  const store = getDemoDataStore()
  return store.delete('company_members', memberId)
}

/**
 * PROPERTY DOCUMENTS
 */

export const createPropertyDocument = (data: {
  team_id: string
  building_id?: string
  lot_id?: string
  name: string
  description?: string
  file_url: string
  file_type: string
  file_size?: number
  category?: string
  visibility_level?: 'equipe' | 'locataire' | 'intervention'
  uploaded_by: string
}) => {
  const store = getDemoDataStore()

  const document = {
    id: generateId(),
    ...data,
    visibility_level: data.visibility_level || 'equipe',
    created_at: new Date().toISOString()
  }

  return store.create('property_documents', document)
}

export const updatePropertyDocument = (documentId: string, data: Partial<any>) => {
  const store = getDemoDataStore()
  return store.update('property_documents', documentId, data)
}

export const deletePropertyDocument = (documentId: string) => {
  const store = getDemoDataStore()
  return store.delete('property_documents', documentId)
}
