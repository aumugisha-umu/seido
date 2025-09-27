import { supabase, withRetry } from './supabase'
import { connectionManager } from './connection-manager'
import type { Database } from './database.types'
import { activityLogger } from './activity-logger'
import { notificationService } from './notification-service'

// Log Supabase configuration on module load
console.log("🔧 Database service loaded with Supabase:", {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
  hasAuth: !!supabase.auth,
  hasFrom: typeof supabase.from === 'function'
})

// Types
export type User = Database['public']['Tables']['users']['Row']
export type Building = Database['public']['Tables']['buildings']['Row']
export type Lot = Database['public']['Tables']['lots']['Row']
export type Intervention = Database['public']['Tables']['interventions']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']

// Additional types for teams (will be added to database.types.ts later)
export interface Team {
  id: string
  name: string
  description?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

// Helper function to get local user ID from Supabase auth user ID
async function getLocalUserId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('🔍 getLocalUserId - Auth user:', user?.id)
    if (!user?.id) {
      console.log('⚠️ No auth user found')
      return null
    }

    // Find local user by auth_user_id
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    console.log('🔍 getLocalUserId - Query result:', { data, error })

    if (error) {
      console.error('❌ Failed to find local user ID:', error)
      return null
    }

    console.log('✅ getLocalUserId - Found local user ID:', data.id)
    return data.id
  } catch (error) {
    console.error('❌ Error getting local user ID:', error)
    return null
  }
}

// User Services
export const userService = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  async getByRole(role: User['role']) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    // S'assurer que l'ID est une string (pas un objet)
    const userId = typeof id === 'string' ? id : String(id)
    
    console.log('🔍 [DATABASE-SERVICE] Getting user by ID:', {
      requestedId: userId,
      originalType: typeof id,
      timestamp: new Date().toISOString()
    })
    
    // Validate input
    if (!userId) {
      const error = new Error('User ID is required')
      console.error('❌ [DATABASE-SERVICE] Missing user ID')
      throw error
    }
    
    // Auth context check not needed (RLS désactivé)
    
    try {
      // Note: RLS désactivé pour l'instant donc pas de vérification nécessaire
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('❌ [DATABASE-SERVICE] Supabase error in getById:', {
          message: error.message || 'Unknown error',
          code: error.code || 'NO_CODE',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          userId: userId,
          errorName: error.name || 'Unknown error name',
          fullError: JSON.stringify(error, null, 2)
        })
        throw error
      }
      
      if (!data) {
        const notFoundError = new Error(`User not found with ID: ${id}`)
        console.error('❌ User not found:', { userId: userId })
        throw notFoundError
      }
      
      console.log('✅ [DATABASE-SERVICE] User found:', {
        name: data?.name || 'Unknown name',
        id: data?.id,
        email: data?.email,
        role: data?.role,
        team_id: data?.team_id,
        allKeys: Object.keys(data || {}),
        fullData: data
      })
      return data
    } catch (error) {
      // Enhanced error logging for debugging
      console.error('❌ Exception in userService.getById:', {
        userId: id,
        errorType: error?.constructor?.name || 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        errorKeys: error ? Object.keys(error) : [],
        errorStringified: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      })
      throw error
    }
  },

  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error) throw error
    return data
  },

  async create(user: Database['public']['Tables']['users']['Insert']) {
    console.log('🔄 Creating user in database:', user)
    
    // NOUVELLE ARCHITECTURE: ID généré automatiquement, pas de contrainte auth.users
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Database error creating user:')
      console.error('Error message:', error.message)
      console.error('Error code:', error.code)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('User data:', user)
      throw error
    }
    
    console.log('✅ User successfully created in database:', data)
    return data
  },

  async update(id: string, updates: Database['public']['Tables']['users']['Update']) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  async findByEmail(email: string) {
    console.log('🔍 [USER-SERVICE] Finding user by email:', email)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = pas trouvé
      console.error('❌ [USER-SERVICE] Error finding user by email:', error)
      throw error
    }
    
    console.log('✅ [USER-SERVICE] User found:', data ? 'yes' : 'no')
    return data
  },

  async findByAuthUserId(authUserId: string) {
    console.log('🔍 [USER-SERVICE] Finding user by auth_user_id:', authUserId)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = pas trouvé
      console.error('❌ [USER-SERVICE] Error finding user by auth_user_id:', error)
      throw error
    }
    
    console.log('✅ [USER-SERVICE] User found by auth_user_id:', data ? 'yes' : 'no')
    return data
  },

  async getTeamUsers(teamId: string) {
    console.log('🔍 [USER-SERVICE] Getting users for team:', teamId)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('team_id', teamId)
      .order('name')

    if (error) {
      console.error('❌ [USER-SERVICE] Error getting team users:', error)
      throw error
    }

    console.log('✅ [USER-SERVICE] Team users found:', data?.length || 0)
    return data || []
  }
}

// Building Services
export const buildingService = {
  async getAll() {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id, 
          reference, 
          is_occupied, 
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .order('name')
    
    if (error) throw error
    
    // Post-traitement pour extraire les gestionnaires principaux
    return data?.map(building => ({
      ...building,
      manager: building.building_contacts?.find(bc => 
        determineAssignmentType(bc.user) === 'manager' && bc.is_primary
      )?.user || null
    }))
  },

  async getTeamBuildings(teamId: string) {
    console.log('🏢 [BUILDING-SERVICE] Getting buildings for team:', teamId)

    // Diagnostic: Vérifier d'abord s'il y a des buildings dans la base
    const { data: allBuildings, error: allError } = await supabase
      .from('buildings')
      .select('id, name, team_id')
      .limit(10)

    console.log('🔍 [BUILDING-SERVICE] Total buildings in database:', allBuildings?.length || 0)
    if (allBuildings && allBuildings.length > 0) {
      console.log('📋 [BUILDING-SERVICE] Sample buildings:', allBuildings.map(b => ({
        id: b.id,
        name: b.name,
        team_id: b.team_id
      })))
    }

    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id,
          reference,
          is_occupied,
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('team_id', teamId)
      .order('name')

    if (error) {
      console.error('❌ [BUILDING-SERVICE] Error getting team buildings:', error)
      console.error('🔍 [BUILDING-SERVICE] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }

    console.log('✅ [BUILDING-SERVICE] Raw buildings data:', data?.length || 0, 'buildings found')
    console.log('🔍 [BUILDING-SERVICE] Query result for team', teamId, ':', {
      dataLength: data?.length || 0,
      hasData: !!data,
      firstBuilding: data?.[0] ? {
        id: data[0].id,
        name: data[0].name,
        team_id: data[0].team_id
      } : null
    })

    // Post-traitement pour extraire les gestionnaires principaux
    const processedBuildings = data?.map(building => ({
      ...building,
      manager: building.building_contacts?.find(bc =>
        determineAssignmentType(bc.user) === 'manager' && bc.is_primary
      )?.user || null
    })) || []

    console.log('🏗️ [BUILDING-SERVICE] Processed buildings:', processedBuildings.length, 'buildings with managers assigned')
    return processedBuildings
  },

  async getUserBuildings(userId: string) {
    // Nouvelle logique : récupérer via building_contacts ET team_members
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id, 
          reference, 
          is_occupied, 
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .or(`building_contacts.user_id.eq.${userId},team_id.in.(select team_id from team_members where user_id = '${userId}')`)
      .order('name')
    
    if (error) throw error
    
    // Post-traitement pour extraire les gestionnaires principaux
    return data?.map(building => ({
      ...building,
      manager: building.building_contacts?.find(bc => 
        determineAssignmentType(bc.user) === 'manager' && bc.is_primary
      )?.user || null
    }))
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        team:team_id(
          id, 
          name, 
          description,
          team_members(
            id,
            role,
            user:user_id(id, name, email)
          )
        ),
        lots(
          *,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Post-traitement pour extraire les gestionnaires principaux et locataires
    if (data) {
      data.manager = data.building_contacts?.[0]?.user || null
      
      // Pour chaque lot, extraire le locataire principal
      data.lots = data.lots?.map(lot => ({
        ...lot,
        tenant: lot.lot_contacts?.[0]?.user || null
      }))
    }
    
    return data
  },

  async create(building: any) {
    console.log("🏢 buildingService.create called with:", building)
    
    try {
      const { data, error } = await (supabase as any)
        .from('buildings')
        .insert(building)
        .select(`
          *,
          team:team_id(id, name, description)
        `)
        .single()
      
      if (error) {
        console.error("❌ Building creation error:", error)
        
        // Log de l'erreur
        if (building.team_id) {
          await activityLogger.logError(
            'create',
            'building',
            building.name || 'Nouvel immeuble',
            error.message || 'Erreur lors de la création',
            { building: building, error: error }
          ).catch(logError => 
            console.error("Failed to log building creation error:", logError)
          )
        }
        
        throw error
      }
      
      console.log("✅ Building created in database:", data)
      
      // Log de succès et notification
      if (data && building.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: building.team_id,
            userId: localUserId, // ✅ Utiliser l'ID utilisateur local
            actionType: 'create',
            entityType: 'building',
            entityId: data.id,
            entityName: data.name,
            description: `Nouvel immeuble ajouté : ${data.name}`,
            status: 'success',
            metadata: {
              address: data.address,
              city: data.city,
              total_lots: data.total_lots,
              manager_name: data.manager?.name
            }
          }).catch(logError => 
            console.error("Failed to log building creation:", logError)
          )

          // Notification de création
          await notificationService.notifyBuildingCreated(data, localUserId).catch(notificationError =>
            console.error("Failed to send building creation notification:", notificationError)
          )
        }
      }
      
      return data
    } catch (error) {
      console.error("❌ buildingService.create error:", error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['buildings']['Update']) {
    try {
      // Récupérer les données actuelles pour le log
      const { data: currentData } = await supabase
        .from('buildings')
        .select('id, name, team_id')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('buildings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error("❌ Building update error:", error)
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'update',
            'building',
            currentData.name || 'Immeuble',
            error.message || 'Erreur lors de la modification',
            { updates, building_id: id, error: error }
          ).catch(logError => 
            console.error("Failed to log building update error:", logError)
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (data && currentData?.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: localUserId,
            actionType: 'update',
            entityType: 'building',
            entityId: data.id,
            entityName: data.name || currentData.name,
            description: `Immeuble modifié : ${data.name || currentData.name}`,
            status: 'success',
            metadata: {
              changes: updates,
              previous_name: currentData.name
            }
          }).catch(logError => 
            console.error("Failed to log building update:", logError instanceof Error ? logError.message : String(logError))
          )

          // Notification de modification
          await notificationService.notifyBuildingUpdated(data, localUserId, updates).catch(notificationError =>
            console.error("Failed to send building update notification:", notificationError instanceof Error ? notificationError.message : String(notificationError))
          )
        }
      }
      
      return data
    } catch (error) {
      console.error("❌ buildingService.update error:", error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      // Récupérer les données actuelles pour le log avant suppression
      const { data: currentData } = await supabase
        .from('buildings')
        .select('id, name, team_id, address, city')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error("❌ Building deletion error:", error)
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'delete',
            'building',
            currentData.name || 'Immeuble',
            error.message || 'Erreur lors de la suppression',
            { building_id: id, building_data: currentData, error: error }
          ).catch(logError => 
            console.error("Failed to log building deletion error:", logError)
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (currentData?.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: localUserId,
            actionType: 'delete',
            entityType: 'building',
            entityId: id,
            entityName: currentData.name || 'Immeuble supprimé',
            description: `Immeuble supprimé : ${currentData.name || 'Immeuble supprimé'}`,
            status: 'success',
            metadata: {
              address: currentData.address,
              city: currentData.city,
              deleted_at: new Date().toISOString()
            }
          }).catch(logError => 
            console.error("Failed to log building deletion:", logError instanceof Error ? logError.message : String(logError))
          )

          // Notification de suppression
          await notificationService.notifyBuildingDeleted(currentData, localUserId).catch(notificationError =>
            console.error("Failed to send building deletion notification:", notificationError instanceof Error ? notificationError.message : String(notificationError))
          )
        }
      }
      
      return true
    } catch (error) {
      console.error("❌ buildingService.delete error:", error)
      throw error
    }
  }
}

// Lot Services
export const lotService = {
  async getAll() {
    const { data, error } = await supabase
      .from('lots')
      .select(`
        *,
        building:building_id(name, address, city),
        lot_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .order('reference')
    
    if (error) throw error
    
    // Post-traitement pour extraire les locataires et calculer is_occupied
    return data?.map(lot => {
      const tenants = lot.lot_contacts?.filter(contact => 
        determineAssignmentType(contact.user) === 'tenant'
      ) || []
      
      return {
        ...lot,
        // Locataire principal (premier tenant trouvé)
        tenant: tenants.find(contact => contact.is_primary)?.user || tenants[0]?.user || null,
        // Calculer automatiquement is_occupied basé sur la présence de tenants
        is_occupied: tenants.length > 0,
        // Garder tous les tenants pour compatibilité
        tenants: tenants.map(contact => contact.user)
      }
    })
  },

  async getByBuildingId(buildingId: string) {
    const { data, error } = await supabase
      .from('lots')
      .select(`
        *,
        lot_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('building_id', buildingId)
      .order('reference')
    
    if (error) throw error
    
    // Post-traitement pour extraire les locataires et calculer is_occupied
    return data?.map(lot => {
      const tenants = lot.lot_contacts?.filter(contact => 
        determineAssignmentType(contact.user) === 'tenant'
      ) || []
      
      return {
        ...lot,
        // Locataire principal (premier tenant trouvé)
        tenant: tenants.find(contact => contact.is_primary)?.user || tenants[0]?.user || null,
        // Calculer automatiquement is_occupied basé sur la présence de tenants
        is_occupied: tenants.length > 0,
        // Garder tous les contacts pour compatibilité
        tenants: tenants.map(contact => contact.user)
      }
    })
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('lots')
      .select(`
        *,
        building:building_id(name, address, city),
        lot_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Post-traitement pour extraire les locataires et calculer is_occupied
    if (data) {
      const tenants = data.lot_contacts?.filter(contact => 
        determineAssignmentType(contact.user) === 'tenant'
      ) || []
      
      data.tenant = tenants.find(contact => contact.is_primary)?.user || tenants[0]?.user || null
      data.is_occupied = tenants.length > 0
      data.tenants = tenants.map(contact => contact.user)
    }
    
    return data
  },

  // Get lot with contact statistics using the new lot_contacts structure
  async getByIdWithContacts(id: string) {
    try {
      // First get the basic lot data
      const lot = await this.getById(id)
      
      // Then get contact statistics using the view or manual calculation
      const { data: contactStats, error: statsError } = await supabase
        .from('lots_with_contacts')
        .select('*')
        .eq('id', id)
        .single()
      
      if (statsError) {
        console.warn("❌ Error getting contact stats, calculating manually:", statsError)
        // Fallback to manual calculation
        const contacts = await contactService.getLotContacts(id)
        const tenants = contacts.filter((c: any) => c.assignment_type === 'tenant')
        const syndics = contacts.filter((c: any) => c.assignment_type === 'syndic')
        const prestataires = contacts.filter((c: any) => c.assignment_type === 'provider')
        
        return {
          ...lot,
          active_tenants_count: tenants.length,
          active_syndics_count: syndics.length,
          active_prestataires_count: prestataires.length,
          active_contacts_total: contacts.length,
          primary_tenant_name: tenants.find((t: any) => t.is_primary_for_lot)?.name || tenants[0]?.name,
          primary_tenant_email: tenants.find((t: any) => t.is_primary_for_lot)?.email || tenants[0]?.email,
          primary_tenant_phone: tenants.find((t: any) => t.is_primary_for_lot)?.phone || tenants[0]?.phone
        }
      }

      return contactStats
      
    } catch (error) {
      console.error("❌ Error getting lot with contacts:", error)
      throw error
    }
  },

  async create(lot: Database['public']['Tables']['lots']['Insert']) {
    console.log("🏠 lotService.create called with:", lot)
    
    try {
      const { data, error } = await supabase
        .from('lots')
        .insert(lot)
        .select()
        .single()
      
      if (error) {
        console.error("❌ Lot creation error:", error)
        
        // Log de l'erreur
        if (lot.team_id) {
          await activityLogger.logError(
            'create',
            'lot',
            lot.reference || 'Nouveau lot',
            error.message || 'Erreur lors de la création',
            { lot: lot, error: error }
          ).catch(logError => 
            console.error("Failed to log lot creation error:", logError)
          )
        }
        
        throw error
      }
      
      console.log("✅ Lot created in database:", data)
      
      // Log de succès
      if (data && lot.team_id) {
        const localUserId = await getLocalUserId()
        console.log('🔍 lotService.create - localUserId for logging:', localUserId)
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: lot.team_id,
            userId: localUserId, // ✅ Utiliser l'ID utilisateur local
            actionType: 'create',
            entityType: 'lot',
            entityId: data.id,
            entityName: data.reference,
            description: `Nouveau lot créé : ${data.reference}`,
            status: 'success',
            metadata: {
              building_id: data.building_id,
              category: data.category,
              floor: data.floor
            }
          }).catch(logError => 
            console.error("Failed to log lot creation:", logError)
          )

          // Notification de création - récupérer les informations du building
          const { data: building } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('id', data.building_id)
            .single()

          await notificationService.notifyLotCreated(data, building, localUserId).catch(notificationError =>
            console.error("Failed to send lot creation notification:", notificationError)
          )
        } else {
          console.log('⚠️ lotService.create - No local user ID found, skipping activity log and notification')
        }
      }
      
      // Vider le cache des stats pour refléter immédiatement les nouveaux lots
      if (data) {
        console.log("🗑️ Clearing stats cache after lot creation")
        statsService.clearStatsCache() // Vider tout le cache
      }
      
      return data
    } catch (error) {
      console.error("❌ lotService.create error:", error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['lots']['Update']) {
    try {
      // Récupérer les données actuelles pour le log
      const { data: currentData } = await supabase
        .from('lots')
        .select('id, reference, team_id, building_id')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('lots')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error("❌ Lot update error:", error)
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'update',
            'lot',
            currentData.reference || 'Lot',
            error.message || 'Erreur lors de la modification',
            { updates, lot_id: id, error: error }
          ).catch(logError => 
            console.error("Failed to log lot update error:", logError)
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (data && currentData?.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: localUserId,
            actionType: 'update',
            entityType: 'lot',
            entityId: data.id,
            entityName: data.reference || currentData.reference,
            description: `Lot modifié : ${data.reference || currentData.reference}`,
            status: 'success',
            metadata: {
              changes: updates,
              previous_reference: currentData.reference,
              building_id: data.building_id
            }
          }).catch(logError => 
            console.error("Failed to log lot update:", logError instanceof Error ? logError.message : String(logError))
          )

          // Notification de modification - récupérer les informations du building
          const { data: building } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('id', data.building_id)
            .single()

          await notificationService.notifyLotUpdated(data, building, localUserId, updates).catch(notificationError =>
            console.error("Failed to send lot update notification:", notificationError instanceof Error ? notificationError.message : String(notificationError))
          )
        }
      }
      
      return data
    } catch (error) {
      console.error("❌ lotService.update error:", error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      // Récupérer les données actuelles pour le log avant suppression
      const { data: currentData } = await supabase
        .from('lots')
        .select('id, reference, team_id, building_id, category, surface_area, rooms')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('lots')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error("❌ Lot deletion error:", error)
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'delete',
            'lot',
            currentData.reference || 'Lot',
            error.message || 'Erreur lors de la suppression',
            { lot_id: id, lot_data: currentData, error: error }
          ).catch(logError => 
            console.error("Failed to log lot deletion error:", logError)
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (currentData?.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: localUserId,
            actionType: 'delete',
            entityType: 'lot',
            entityId: id,
            entityName: currentData.reference || 'Lot supprimé',
            description: `Lot supprimé : ${currentData.reference || 'Lot supprimé'}`,
            status: 'success',
            metadata: {
              building_id: currentData.building_id,
              category: currentData.category,
              surface_area: currentData.surface_area,
              rooms: currentData.rooms,
              deleted_at: new Date().toISOString()
            }
          }).catch(logError => 
            console.error("Failed to log lot deletion:", logError instanceof Error ? logError.message : String(logError))
          )

          // Notification de suppression - récupérer les informations du building
          const { data: building } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('id', currentData.building_id)
            .single()

          await notificationService.notifyLotDeleted(currentData, building, localUserId).catch(notificationError =>
            console.error("Failed to send lot deletion notification:", notificationError instanceof Error ? notificationError.message : String(notificationError))
          )
        }
      }
      
      return true
    } catch (error) {
      console.error("❌ lotService.delete error:", error)
      throw error
    }
  },

  // Compter les lots par catégorie pour une équipe
  async getCountByCategory(teamId: string) {
    try {
      const { data, error } = await supabase
        .from('lots')
        .select(`
          category,
          building:building_id!inner(
            team_id
          )
        `)
        .eq('building.team_id', teamId)
      
      if (error) throw error
      
      // Compter les occurrences de chaque catégorie
      const counts: Record<string, number> = {}
      data.forEach(lot => {
        const category = lot.category || 'appartement' // valeur par défaut
        counts[category] = (counts[category] || 0) + 1
      })
      
      return counts
    } catch (error) {
      console.error("❌ Error getting lot counts by category:", error)
      throw error
    }
  }
}

// Intervention Services
export const interventionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          reference, 
          building:building_id(name, address),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        intervention_contacts(
          role,
          is_primary,
          individual_message,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Post-traitement pour extraire les informations enrichies
    return data?.map(intervention => {
      // Extract tenant from lot contacts
      if (intervention.lot?.lot_contacts) {
        const tenants = intervention.lot.lot_contacts.filter(contact => 
          determineAssignmentType(contact.user) === 'tenant'
        )
        intervention.tenant = tenants.find(c => c.is_primary)?.user || tenants[0]?.user || null
      }
      
      // Extract assigned users by role
      if (intervention.intervention_contacts) {
        intervention.assigned_managers = intervention.intervention_contacts
          .filter(ic => ic.role === 'gestionnaire')
          .map(ic => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))
        
        intervention.assigned_providers = intervention.intervention_contacts
          .filter(ic => ic.role === 'prestataire')
          .map(ic => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))
        
        intervention.assigned_supervisors = intervention.intervention_contacts
          .filter(ic => ic.role === 'superviseur')
          .map(ic => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))
          
        // For backwards compatibility, set primary assigned contact
        intervention.assigned_contact = intervention.intervention_contacts?.find(ic => 
          ic.role === 'prestataire' && ic.is_primary
        )?.user || null
      }
      
      return intervention
    })
  },

  async getByStatus(status: Intervention['status']) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          reference, 
          building:building_id(name, address),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Post-traitement pour extraire le locataire principal
    return data?.map(intervention => {
      if (intervention.lot?.lot_contacts) {
        const tenants = intervention.lot.lot_contacts.filter(contact => 
          determineAssignmentType(contact.user) === 'tenant'
        )
        intervention.tenant = tenants.find(c => c.is_primary)?.user || tenants[0]?.user || null
      }
      return intervention
    })
  },

  async getByTenantId(tenantId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          reference, 
          building:building_id(name, address),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Post-traitement pour ajouter le locataire du lot
    return data?.map(intervention => {
      if (intervention.lot?.lot_contacts) {
        const tenants = intervention.lot.lot_contacts.filter(contact => 
          determineAssignmentType(contact.user) === 'tenant'
        )
        intervention.tenant = tenants.find(c => c.is_primary)?.user || tenants[0]?.user || null
      }
      return intervention
    })
  },

  async getByLotId(lotId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          reference, 
          building:building_id(name, address),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        )
      `)
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Post-traitement pour extraire le locataire principal
    return data?.map(intervention => {
      if (intervention.lot?.lot_contacts) {
        const tenants = intervention.lot.lot_contacts.filter(contact => 
          determineAssignmentType(contact.user) === 'tenant'
        )
        intervention.tenant = tenants.find(c => c.is_primary)?.user || tenants[0]?.user || null
      }
      return intervention
    })
  },

  async getByProviderId(providerId: string) {
    // Approche simplifiée : chercher directement les interventions assignées à ce prestataire
    // via la table intervention_contacts 
    
    try {
      console.log("🔍 Getting interventions for provider:", providerId)
      
      // 1. Trouver les interventions où ce prestataire est directement assigné
      const { data: interventionAssignments, error: assignmentError } = await supabase
        .from('intervention_contacts')
        .select('intervention_id')
        .eq('user_id', providerId)
      
      if (assignmentError) throw assignmentError
      
      const interventionIds = interventionAssignments?.map(a => a.intervention_id) || []
      console.log("📋 Found intervention assignments:", interventionIds.length)
      
      if (interventionIds.length === 0) {
        console.log("📋 No interventions found for provider")
        return []
      }
      
      // 2. Récupérer les détails des interventions
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          lot:lot_id(
            reference, 
            building:building_id(name, address)
          )
        `)
        .in('id', interventionIds)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      console.log("📋 Found interventions:", data?.length || 0)
      
      // 3. Pour chaque intervention, récupérer les contacts du lot pour identifier le locataire
      const enrichedInterventions = await Promise.all(
        (data || []).map(async (intervention) => {
          if (intervention.lot_id) {
            try {
              const { data: lotContacts, error: contactsError } = await supabase
                .from('lot_contacts')
                .select(`
                  is_primary,
                  user:user_id(id, name, email, phone, role)
                `)
                .eq('lot_id', intervention.lot_id)
                
              if (!contactsError && lotContacts) {
                // Trouver le locataire principal
                const tenants = lotContacts.filter(contact => 
                  contact.user?.role === 'locataire'
                )
                intervention.tenant = tenants.find(c => c.is_primary)?.user || tenants[0]?.user || null
              }
            } catch (contactError) {
              console.error("⚠️ Error fetching lot contacts:", contactError)
            }
          }
          return intervention
        })
      )
      
      return enrichedInterventions
      
    } catch (error) {
      console.error("❌ Error in getByProviderId:", error)
      throw error
    }
  },

  // ✅ SÉCURITÉ: Les RLS policies filtrent automatiquement:
  // - intervention_quotes: prestataires voient uniquement leurs devis
  // - user_availabilities: isolation entre prestataires selon leur rôle
  async getById(id: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          *,
          building:building_id(*),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building:building_id(
          *,
          building_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        intervention_contacts(
          role,
          is_primary,
          individual_message,
          user:user_id(id, name, email, phone, role, provider_category, speciality)
        ),
        intervention_quotes!intervention_id(
          id,
          provider_id,
          labor_cost,
          materials_cost,
          total_amount,
          description,
          work_details,
          estimated_duration_hours,
          estimated_start_date,
          terms_and_conditions,
          attachments,
          status,
          submitted_at,
          reviewed_at,
          reviewed_by,
          review_comments,
          rejection_reason,
          provider:provider_id(
            id,
            name,
            email,
            phone,
            provider_category,
            speciality
          ),
          reviewer:reviewed_by(
            id,
            name
          )
        ),
        user_availabilities!intervention_id(
          id,
          user_id,
          date,
          start_time,
          end_time,
          created_at,
          user:user_id(
            id,
            name,
            role
          )
        ),
        intervention_documents!intervention_id(
          id,
          filename,
          original_filename,
          file_size,
          mime_type,
          document_type,
          uploaded_at,
          uploaded_by,
          storage_path,
          uploaded_by
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    // Post-traitement pour extraire le locataire principal
    if (data?.lot?.lot_contacts) {
      const tenants = data.lot.lot_contacts.filter(contact => 
        determineAssignmentType(contact.user) === 'tenant'
      )
      data.tenant = tenants.find(c => c.is_primary)?.user || tenants[0]?.user || null
    }

    // Post-traitement pour extraire les gestionnaires, prestataires et superviseurs assignés
    if (data?.intervention_contacts) {
      data.assigned_managers = data.intervention_contacts
        .filter(ic => ic.role === 'gestionnaire')
        .map(ic => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))
      
      data.assigned_providers = data.intervention_contacts
        .filter(ic => ic.role === 'prestataire')
        .map(ic => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))
      
      data.assigned_supervisors = data.intervention_contacts
        .filter(ic => ic.role === 'superviseur')
        .map(ic => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))
      
      // Pour la compatibilité, définir le gestionnaire principal comme "manager"
      data.manager = data.assigned_managers?.find(m => m.is_primary) || data.assigned_managers?.[0] || null
      
      // Pour la compatibilité, définir le prestataire principal comme "assigned_contact"
      data.assigned_contact = data.assigned_providers?.find(p => p.is_primary) || data.assigned_providers?.[0] || null
    }
    
    return data
  },

  async create(intervention: Database['public']['Tables']['interventions']['Insert']) {
    try {
      const { data, error } = await supabase
        .from('interventions')
        .insert(intervention)
        .select(`
          *,
          lot:lot_id(reference, building:building_id(name, team_id))
        `)
        .single()
      
      if (error) throw error

      // Note: Notifications will be created after auto-assignment in the API
      // This avoids the need for manager_id fields and uses the actual assigned users
      
      return data
    } catch (error) {
      console.error('❌ interventionService.create error:', error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['interventions']['Update']) {
    try {
      // Récupérer les données actuelles pour détecter les changements
      const { data: currentData } = await supabase
        .from('interventions')
        .select(`
          *,
          lot:lot_id(reference, building:building_id(name, team_id))
        `)
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('interventions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          lot:lot_id(reference, building:building_id(name, team_id))
        `)
        .single()
      
      if (error) throw error

      // Créer des notifications pour les changements importants
      if (data && currentData && data.lot?.building?.team_id) {
        try {
          // Changement de statut
          if (updates.status && updates.status !== currentData.status) {
            await notificationService.notifyInterventionStatusChange({
              interventionId: data.id,
              interventionTitle: data.title || `Intervention ${data.type || ''}`,
              oldStatus: currentData.status,
              newStatus: updates.status,
              teamId: data.lot.building.team_id,
              changedBy: data.tenant_id || currentData.tenant_id,
              managerId: data.tenant_id || currentData.tenant_id,
              lotId: data.lot_id || currentData.lot_id,
              lotReference: data.lot?.reference
            })
            console.log('✅ Status change notifications created for intervention:', data.id)
          }

          // Notifications pour les changements d'assignation (nouveaux gestionnaires/prestataires)
          // Note: Pour détecter les changements d'assignation, il faudrait comparer les intervention_contacts
          // avant et après la mise à jour. Pour l'instant, cette fonctionnalité est gérée au niveau API
          // lors des assignations explicites d'utilisateurs à une intervention.
        } catch (notificationError) {
          console.error('❌ Error creating intervention update notifications:', notificationError)
          // Ne pas faire échouer la mise à jour pour les notifications
        }
      }
      
      return data
    } catch (error) {
      console.error('❌ interventionService.update error:', error)
      throw error
    }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('interventions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Get documents for an intervention
  async getDocuments(interventionId: string) {
    const { data, error } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email),
        validated_by_user:validated_by(name, email)
      `)
      .eq('intervention_id', interventionId)
      .order('uploaded_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Create a document record for an intervention
  async createDocument(documentData: Database['public']['Tables']['intervention_documents']['Insert']) {
    console.log("💾 Creating intervention document record:", documentData)

    const { data, error } = await supabase
      .from('intervention_documents')
      .insert(documentData)
      .select()
      .single()

    if (error) {
      console.error("❌ Error creating intervention document:", error)
      throw error
    }

    console.log("✅ Intervention document created:", data.id)
    return data
  },

  // Get interventions with their documents for a building
  async getInterventionsWithDocumentsByBuildingId(buildingId: string) {
    // First get all lots for this building
    const lots = await lotService.getByBuildingId(buildingId)
    const lotIds = lots?.map(lot => lot.id) || []
    
    if (lotIds.length === 0) return []
    
    // Get interventions for these lots
    const { data: interventions, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        intervention_contacts(
          role,
          is_primary,
          user:user_id(id, name, email, phone)
        ),
        documents:intervention_documents(
          id,
          filename,
          original_filename,
          file_size,
          mime_type,
          document_type,
          uploaded_at,
          uploaded_by
        )
      `)
      .in('lot_id', lotIds)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Post-traitement pour extraire le prestataire principal
    return interventions?.map(intervention => ({
      ...intervention,
      assigned_contact: intervention.intervention_contacts?.find(ic => 
        ic.role === 'prestataire' && ic.is_primary
      )?.user || null
    })) || []
  },

  // Get interventions with their documents for a lot
  async getInterventionsWithDocumentsByLotId(lotId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        intervention_contacts(
          role,
          is_primary,
          user:user_id(id, name, email, phone)
        ),
        documents:intervention_documents(
          id,
          filename,
          original_filename,
          file_size,
          mime_type,
          document_type,
          uploaded_at,
          uploaded_by
        )
      `)
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Post-traitement pour extraire le prestataire principal
    return data?.map(intervention => ({
      ...intervention,
      assigned_contact: intervention.intervention_contacts?.find(ic => 
        ic.role === 'prestataire' && ic.is_primary
      )?.user || null
    })) || []
  },

  // Assign users to an intervention automatically based on team and lot/building context
  async autoAssignIntervention(interventionId: string, lotId?: string, buildingId?: string, teamId?: string) {
    console.log("👥 Auto-assigning intervention:", { interventionId, lotId, buildingId, teamId })

    try {
      const assignments: Array<{
        intervention_id: string
        user_id: string
        role: string
        is_primary: boolean
        individual_message?: string
      }> = []

      // ✅ FIX: If teamId is missing but lotId is provided, try to derive team from lot
      let effectiveTeamId = teamId
      if (!effectiveTeamId && lotId) {
        console.log("🔍 TeamId missing, trying to derive from lot:", lotId)
        const { data: lot, error: lotError } = await supabase
          .from('lots')
          .select('team_id')
          .eq('id', lotId)
          .single()

        if (!lotError && lot?.team_id) {
          effectiveTeamId = lot.team_id
          console.log("✅ Derived team ID from lot:", effectiveTeamId)
        } else {
          console.warn("⚠️ Could not derive team from lot:", lotError?.message)
        }
      }

      // 1. Get all team managers (gestionnaires) if teamId is available
      if (effectiveTeamId) {
        const { data: teamManagers, error: teamError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            role,
            user:user_id(id, name, role)
          `)
          .eq('team_id', effectiveTeamId)
          .eq('user.role', 'gestionnaire')

        if (teamError) {
          console.error("❌ Error fetching team managers:", teamError)
        } else if (teamManagers && teamManagers.length > 0) {
          console.log("👨‍💼 Found team managers:", teamManagers.length)
          
          // Add all team managers as gestionnaires
          teamManagers.forEach((manager, index) => {
            assignments.push({
              intervention_id: interventionId,
              user_id: manager.user_id,
              role: 'gestionnaire',
              is_primary: index === 0, // First manager is primary
              individual_message: `Assigné automatiquement comme gestionnaire de l'équipe`
            })
          })
        }
      }

      // 2. Get lot-specific managers if lotId is provided
      if (lotId) {
        const { data: lotManagers, error: lotError } = await supabase
          .from('lot_contacts')
          .select(`
            user_id,
            is_primary,
            user:user_id(id, name, role)
          `)
          .eq('lot_id', lotId)
          .eq('user.role', 'gestionnaire')
          .is('end_date', null) // Only active assignments

        if (lotError) {
          console.error("❌ Error fetching lot managers:", lotError)
        } else if (lotManagers && lotManagers.length > 0) {
          console.log("🏠 Found lot-specific managers:", lotManagers.length)
          
          // Add lot managers as gestionnaires (override team assignment if same user)
          lotManagers.forEach(manager => {
            // Check if already added as team manager
            const existingIndex = assignments.findIndex(a => a.user_id === manager.user_id && a.role === 'gestionnaire')
            
            if (existingIndex >= 0) {
              // Update existing assignment to be lot-specific and potentially primary
              assignments[existingIndex].is_primary = manager.is_primary
              assignments[existingIndex].individual_message = `Assigné comme gestionnaire spécifique du lot`
            } else {
              // Add as new lot manager
              assignments.push({
                intervention_id: interventionId,
                user_id: manager.user_id,
                role: 'gestionnaire',
                is_primary: manager.is_primary,
                individual_message: `Assigné comme gestionnaire spécifique du lot`
              })
            }
          })
        }
      }

      // 3. Get building-specific managers if buildingId is provided (and no lot specified)
      if (buildingId && !lotId) {
        const { data: buildingManagers, error: buildingError } = await supabase
          .from('building_contacts')
          .select(`
            user_id,
            is_primary,
            user:user_id(id, name, role)
          `)
          .eq('building_id', buildingId)
          .eq('user.role', 'gestionnaire')
          .is('end_date', null) // Only active assignments

        if (buildingError) {
          console.error("❌ Error fetching building managers:", buildingError)
        } else if (buildingManagers && buildingManagers.length > 0) {
          console.log("🏢 Found building-specific managers:", buildingManagers.length)
          
          // Add building managers as gestionnaires
          buildingManagers.forEach(manager => {
            // Check if already added
            const existingIndex = assignments.findIndex(a => a.user_id === manager.user_id && a.role === 'gestionnaire')
            
            if (existingIndex >= 0) {
              // Update existing assignment
              assignments[existingIndex].is_primary = manager.is_primary
              assignments[existingIndex].individual_message = `Assigné comme gestionnaire spécifique du bâtiment`
            } else {
              // Add as new building manager
              assignments.push({
                intervention_id: interventionId,
                user_id: manager.user_id,
                role: 'gestionnaire',
                is_primary: manager.is_primary,
                individual_message: `Assigné comme gestionnaire spécifique du bâtiment`
              })
            }
          })
        }
      }

      // 4. Optionally get prestataires assigned to the lot/building (for future assignment)
      if (lotId) {
        const { data: lotProviders, error: providerError } = await supabase
          .from('lot_contacts')
          .select(`
            user_id,
            is_primary,
            user:user_id(id, name, role, provider_category, speciality)
          `)
          .eq('lot_id', lotId)
          .eq('user.role', 'prestataire')
          .is('end_date', null) // Only active assignments

        if (providerError) {
          console.error("❌ Error fetching lot providers:", providerError)
        } else if (lotProviders && lotProviders.length > 0) {
          console.log("🔧 Found lot-specific providers:", lotProviders.length, "(will be available for manual assignment)")
          
          // Note: We don't auto-assign prestataires to new interventions
          // They should be manually assigned based on the intervention type and their speciality
          // But we could store them for potential future auto-assignment logic
        }
      }

      // Insert all assignments
      if (assignments.length > 0) {
        console.log("💾 Creating intervention assignments:", assignments.length)
        
        const { data: createdAssignments, error: assignError } = await supabase
          .from('intervention_contacts')
          .insert(assignments)
          .select(`
            id,
            user_id,
            role,
            is_primary,
            user:user_id(id, name, email)
          `)

        if (assignError) {
          console.error("❌ Error creating intervention assignments:", assignError)
          throw assignError
        }

        console.log("✅ Successfully created intervention assignments:", createdAssignments?.length || 0)
        return createdAssignments
      } else {
        console.log("⚠️ No users found to assign to intervention")
        return []
      }

    } catch (error) {
      console.error("❌ Error in autoAssignIntervention:", error)
      throw error
    }
  },

  async getTeamInterventions(teamId: string) {
    console.log('🔍 [INTERVENTION-SERVICE] Getting interventions for team:', teamId)
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          reference,
          building:building_id(name, address, team_id)
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [INTERVENTION-SERVICE] Error getting team interventions:', error)
      throw error
    }

    console.log('✅ [INTERVENTION-SERVICE] Team interventions found:', data?.length || 0)
    return data || []
  }
}

// Contact Services (NEW: using users table)
export const contactService = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async getBySpeciality(speciality: any) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .eq('speciality', speciality)
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getTeamContacts(teamId: string) {
    console.log("📞 getTeamContacts called with teamId:", teamId)
    
    // Essayer d'abord avec le filtre team_id
    let { data, error } = await supabase
      .from('users')
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .eq('team_id', teamId)
      .order('name')
    
    console.log("📊 Team contacts query result:", { data, error, count: data?.length })
    
    // Si pas de résultats ou erreur, essayer sans filtre (fallback pour debug sans RLS)
    if ((!data || data.length === 0) && !error) {
      console.log("⚠️ No team contacts found, trying fallback query (all contacts)")
      
      const fallbackResult = await supabase
        .from('users')
        .select(`
          *,
          team:team_id(id, name, description)
        `)
        .order('name')
      
      console.log("📊 Fallback contacts query:", { 
        data: fallbackResult.data, 
        error: fallbackResult.error, 
        count: fallbackResult.data?.length 
      })
      
      // Utiliser les résultats du fallback si disponibles
      if (fallbackResult.data && fallbackResult.data.length > 0) {
        data = fallbackResult.data
        error = fallbackResult.error
      }
    }
    
    if (error) {
      console.error("❌ Error in getTeamContacts:", error)
      throw error
    }
    
    console.log("✅ Returning contacts:", data?.length || 0)
    if (data && data.length > 0) {
      console.log("📋 Sample contact structure:", JSON.stringify(data[0], null, 2))
    }
    return data || []
  },

  // Nouvelle méthode pour récupérer les contacts d'un bâtiment entier (nouvelle architecture)
  async getBuildingContacts(buildingId: string, assignmentType?: string) {
    console.log("🏢 getBuildingContacts called with buildingId:", buildingId, "assignmentType:", assignmentType)
    
    try {
      const { data, error } = await supabase
        .from('building_contacts')
        .select(`
          is_primary,
          user:user_id(
            id,
            name,
            email,
            phone,
            company,
            role,
            provider_category,
            speciality,
            is_active
          )
        `)
        .eq('building_id', buildingId)

      if (error) {
        console.error("❌ Error getting building contacts:", error)
        return []
      }

      let contacts = (data || [])
        .map((item: any) => item.user)
        .filter((contact: any) => contact && contact.is_active !== false)

      // Filtrer par type d'assignation si spécifié
      if (assignmentType) {
        contacts = contacts.filter((contact: any) => determineAssignmentType(contact) === assignmentType)
      }
      
      console.log("✅ Found building contacts:", contacts.length)
      return contacts

    } catch (error) {
      console.error("🚨 Unexpected error in getBuildingContacts:", error)
      return []
    }
  },

  // Nouvelle fonction pour récupérer les gestionnaires réels d'une équipe
  async getTeamManagers(teamId: string) {
    console.log("👥 getTeamManagers called with teamId:", teamId)
    
    try {
      // Approche simplifiée : récupérer tous les membres d'équipe avec leurs users
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          role,
          joined_at,
          user:user_id(
            id,
            email,
            name,
            first_name,
            last_name,
            role,
            phone
          )
        `)
        .eq('team_id', teamId)
      
      if (error) {
        console.error("❌ Error in getTeamManagers:", error)
        throw error
      }
      
      console.log("📊 Raw team members data:", { count: data?.length, data })
      
      // Filtrer côté client pour les gestionnaires uniquement
      console.log("🔍 Filtrage des gestionnaires...")
      const managers = data
        ?.filter((member: any) => {
          const isManager = member.user?.role === 'gestionnaire'
          console.log(`   👤 ${member.user?.name || member.user?.email}: role=${member.user?.role} → isManager=${isManager}`)
          return isManager
        })
        ?.map((member: any) => ({
          id: member.user.id,
          name: member.user.name || `${member.user.first_name || ''} ${member.user.last_name || ''}`.trim() || member.user.email,
          role: "Gestionnaire",
          email: member.user.email,
          phone: member.user.phone,
          isCurrentUser: false, // sera défini dans loadRealData()
          type: "gestionnaire",
          member_role: member.role,
          joined_at: member.joined_at
        }))
        ?.sort((a: any, b: any) => a.name.localeCompare(b.name)) || []
      
      console.log("✅ Found team managers:", managers.length, managers)
      return managers
      
    } catch (error) {
      console.error("❌ Error getting team managers:", error)
      return []
    }
  },

  async getUserContacts(userId: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        team:team_id(
          id, 
          name, 
          description,
          team_members!inner(user_id)
        )
      `)
      .eq('team.team_members.user_id', userId)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getLotContacts(lotId: string, assignmentType?: string) {
    console.log("🏠 getLotContacts called with lotId:", lotId, "assignmentType:", assignmentType)
    
    try {
      // Use the new lot_contacts table with user role/provider_category logic
      const { data, error } = await supabase
        .from('lot_contacts')
        .select(`
          user:user_id (
            id,
            name,
            first_name,
            last_name,
            email,
            phone,
            company,
            speciality,
            role,
            provider_category,
            address,
            notes,
            is_active,
            team:team_id(id, name, description)
          ),
          is_primary,
          start_date,
          end_date
        `)
        .eq('lot_id', lotId)
        .or('end_date.is.null,end_date.gt.now()') // Active contacts
        .eq('user.is_active', true)
        .order('is_primary', { ascending: false })
      
      if (error) {
        console.error("❌ Error getting lot contacts:", error)
        throw error
      }

      // Extract contacts and determine their assignment type
      let contacts = data?.map((item: any) => ({
        ...item.user,
        assignment_type: determineAssignmentType(item.user),
        is_primary_for_lot: item.is_primary,
        lot_start_date: item.start_date,
        lot_end_date: item.end_date
      })).filter(Boolean) || []
      
      // Filter by assignment type if specified
      if (assignmentType) {
        contacts = contacts.filter(contact => contact.assignment_type === assignmentType)
      }
      
      console.log(`✅ Found lot contacts: ${contacts.length} total${assignmentType ? ` (filtered by ${assignmentType})` : ''}`)
      return contacts

    } catch (error) {
      console.error("🚨 Error in getLotContacts:", error)
      return []
    }
  },

  // Legacy method removed - use getLotContacts instead

  // Get contacts by specific assignment type for a lot (nouvelle architecture)
  async getLotContactsByType(lotId: string, assignmentType: string) {
    const { data, error } = await supabase
      .from('lot_contacts')
      .select(`
        is_primary,
        user:user_id(
          id,
          name, 
          email,
          phone,
          company,
          speciality,
          address,
          notes,
          is_active,
          role,
          provider_category,
          team:team_id(id, name, description)
        )
      `)
      .eq('lot_id', lotId)
      .eq('user.is_active', true)
      .order('is_primary', { ascending: false })
    
    if (error) throw error
    
    // Filtrer par type d'assignation basé sur role/provider_category
    const contacts = (data?.map(item => item.user).filter(Boolean) || [])
      .filter(user => determineAssignmentType(user) === assignmentType)
    
    return contacts
  },

  // Get active tenants for a lot
  async getLotTenants(lotId: string) {
    return this.getLotContactsByType(lotId, 'tenant')
  },

  // Count active tenants for a lot
  async countLotTenants(lotId: string) {
    const tenants = await this.getLotTenants(lotId)
    return tenants.length
  },

  // Add a contact to a lot (nouvelle architecture basée sur role/provider_category)
  async addContactToLot(lotId: string, userId: string, isPrimary: boolean = false, startDate?: string, endDate?: string) {
    console.log("🔗 Adding contact to lot:", { lotId, userId, isPrimary })
    
    try {
      // Récupérer les infos de l'utilisateur pour validation
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role, provider_category')
        .eq('id', userId)
        .single()
      
      if (userError) throw userError
      
      // Valider l'assignation
      if (!validateAssignment(user as AssignmentUser, 'lot')) {
        throw new Error(`L'utilisateur avec le rôle ${user.role} ne peut pas être assigné à un lot`)
      }
      
      const { data, error } = await supabase
        .from('lot_contacts')
        .insert({
          lot_id: lotId,
          user_id: userId,
          is_primary: isPrimary,
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate || null
        })
        .select()
        .single()
      
      if (error) throw error
      console.log("✅ Contact added to lot successfully")
      return data
      
    } catch (error) {
      console.error("❌ Error adding contact to lot:", error)
      throw error
    }
  },

  // Add a contact to a building (nouvelle architecture basée sur role/provider_category)
  async addContactToBuilding(buildingId: string, userId: string, isPrimary: boolean = false, startDate?: string, endDate?: string) {
    console.log("🔗 Adding contact to building:", { buildingId, userId, isPrimary })
    
    try {
      // Récupérer les infos de l'utilisateur pour validation
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('role, provider_category')
        .eq('id', userId)
        .single()
      
      if (userError) throw userError
      
      // Valider l'assignation (les locataires ne peuvent être assignés aux buildings)
      if (!validateAssignment(user as AssignmentUser, 'building')) {
        throw new Error(`L'utilisateur avec le rôle ${user.role} ne peut pas être assigné à un immeuble. Les locataires doivent être assignés à des lots.`)
      }
      
      const { data, error } = await supabase
        .from('building_contacts')
        .insert({
          building_id: buildingId,
          user_id: userId,
          is_primary: isPrimary,
          start_date: startDate || new Date().toISOString().split('T')[0],
          end_date: endDate || null
        })
        .select()
        .single()
      
      if (error) throw error
      console.log("✅ Contact added to building successfully")
      return data
      
    } catch (error) {
      console.error("❌ Error adding contact to building:", error)
      throw error
    }
  },

  // Remove a contact from a lot (nouvelle architecture)
  async removeContactFromLot(lotId: string, userId: string) {
    console.log("🗑️ Removing contact from lot:", { lotId, userId })
    
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [CONTACT-SERVICE] Cannot remove JWT-only user from lot")
      throw new Error("Operation not available for JWT-only users")
    }
    
    try {
      const { data, error } = await supabase
        .from('lot_contacts')
        .delete()
        .eq('lot_id', lotId)
        .eq('user_id', userId)
        .select()
      
      if (error) throw error
      console.log("✅ Contact removed from lot successfully")
      return data
      
    } catch (error) {
      console.error("❌ Error removing contact from lot:", error)
      throw error
    }
  },

  // Remove a contact from a building (nouvelle architecture)
  async removeContactFromBuilding(buildingId: string, userId: string) {
    console.log("🗑️ Removing contact from building:", { buildingId, userId })
    
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [CONTACT-SERVICE] Cannot remove JWT-only user from building")
      throw new Error("Operation not available for JWT-only users")
    }
    
    try {
      const { data, error } = await supabase
        .from('building_contacts')
        .delete()
        .eq('building_id', buildingId)
        .eq('user_id', userId)
        .select()
      
      if (error) throw error
      console.log("✅ Contact removed from building successfully")
      return data
      
    } catch (error) {
      console.error("❌ Error removing contact from building:", error)
      throw error
    }
  },


  async create(contact: any) {
    console.log('🗃️ [CONTACT-SERVICE] Creating user (new architecture):', contact.name, contact.email)
    console.log('📋 [CONTACT-SERVICE] Contact data:', JSON.stringify(contact, null, 2))
    
    // NOUVELLE ARCHITECTURE: Utiliser directement les données user avec role/provider_category
    const userDataOnly = { ...contact }
    
    try {
      // Validation des données requises avant insertion
      if (!contact.email || contact.email.trim() === '') {
        console.error('❌ [CONTACT-SERVICE] Email is required and cannot be empty')
        throw new Error('Email is required and cannot be empty')
      }
      
      if (!contact.name || contact.name.trim() === '') {
        console.error('❌ [CONTACT-SERVICE] Name is required and cannot be empty') 
        throw new Error('Name is required and cannot be empty')
      }

      console.log('✅ [CONTACT-SERVICE] Data validation passed')
      
      // Test des permissions RLS avant insertion - AVEC TIMEOUT ET FALLBACK
      console.log('🔐 [CONTACT-SERVICE] Testing RLS permissions (with timeout)...')
      let permissionTestPassed = false
      try {
        console.log('🔄 [CONTACT-SERVICE] Starting permission test query...')
        
        // Créer un timeout spécifique pour le test RLS
        const permissionPromise = supabase
          .from('users')
          .select('id')
          .limit(1)
        
        const permissionTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Permission test timeout after 3 seconds')), 3000)
        )
        
        console.log('⏳ [CONTACT-SERVICE] Waiting for permission test response...')
        const { data: permissionTest, error: permissionError } = await Promise.race([
          permissionPromise, 
          permissionTimeout
        ]) as any
        
        console.log('📋 [CONTACT-SERVICE] Permission test completed:', { 
          hasData: !!permissionTest, 
          dataLength: permissionTest?.length || 0,
          hasError: !!permissionError 
        })
        
        if (permissionError) {
          console.warn('⚠️ [CONTACT-SERVICE] Permission test returned error, but continuing anyway:', permissionError)
          permissionTestPassed = false
        } else {
          console.log('✅ [CONTACT-SERVICE] RLS permissions OK, found', permissionTest?.length || 0, 'existing contacts')
          permissionTestPassed = true
        }
      } catch (permError) {
        console.warn('⚠️ [CONTACT-SERVICE] Permission test failed/timeout, but continuing anyway:', {
          message: permError instanceof Error ? permError.message : 'Unknown error',
          type: permError instanceof Error ? permError.constructor.name : typeof permError
        })
        permissionTestPassed = false
      }
      
      console.log('🎯 [CONTACT-SERVICE] Permission test result:', permissionTestPassed ? 'PASSED' : 'SKIPPED - CONTINUING ANYWAY')
      
      // Validation des valeurs enum (nouvelle architecture)
      console.log('🔍 [CONTACT-SERVICE] Starting enum validation...')
      const validInterventionTypes = ['plomberie', 'electricite', 'chauffage', 'serrurerie', 'peinture', 'menage', 'jardinage', 'autre']
      
      if (contact.speciality && !validInterventionTypes.includes(contact.speciality)) {
        console.error('❌ [CONTACT-SERVICE] Invalid speciality:', contact.speciality)
        throw new Error(`Invalid speciality: ${contact.speciality}. Must be one of: ${validInterventionTypes.join(', ')}`)
      }
      
      console.log('✅ [CONTACT-SERVICE] Enum validation passed')
      console.log('⚡ [CONTACT-SERVICE] Starting insert...')
      console.time('contact-insert')
      
      // Créer un timeout pour détecter les blocages
      const insertPromise = supabase
        .from('users')
        .insert(userDataOnly) // NOUVELLE ARCHITECTURE: insérer avec role/provider_category
        .select()
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Supabase insert timeout after 10 seconds')), 10000)
      )
      
      console.log('🔄 [CONTACT-SERVICE] Awaiting Supabase response...')
      const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any
      
      console.timeEnd('contact-insert')
      console.log('📊 [CONTACT-SERVICE] Insert response:', { data, error })
      
      if (error) {
        console.error('❌ [CONTACT-SERVICE] Insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Log de l'erreur
        if (contact.team_id) {
          await activityLogger.logError(
            'create',
            'contact',
            contact.name || 'Nouveau contact',
            error.message || 'Erreur lors de la création',
            { contact: contact, error: error }
          ).catch(logError => 
            console.error("Failed to log contact creation error:", logError)
          )
        }
        
        throw error
      }
      
      if (!data) {
        console.error('❌ [CONTACT-SERVICE] No data returned from insert')
        throw new Error('No data returned from contact creation')
      }
      
      console.log('✅ [CONTACT-SERVICE] Contact created successfully:', data.id)
      
      // Log de succès et notification
      if (data && contact.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: contact.team_id,
            userId: localUserId, // ✅ Utiliser l'ID utilisateur local
            actionType: 'create',
            entityType: 'contact',
            entityId: data.id,
            entityName: data.name,
            description: `Nouveau contact créé : ${data.name}`,
            status: 'success',
            metadata: {
              email: data.email,
              role: data.role,
              provider_category: data.provider_category,
              company: data.company,
              speciality: data.speciality
            }
          }).catch(logError => 
            console.error("Failed to log contact creation:", logError)
          )

          // Notification de création
          await notificationService.notifyContactCreated(data, localUserId).catch(notificationError =>
            console.error("Failed to send contact creation notification:", notificationError)
          )
        }
      }
      
      return data
    } catch (error) {
      console.error('❌ [CONTACT-SERVICE] Exception caught:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        fullError: error
      })
      throw error
    }
  },

  async findOrCreate(contact: any) {
    try {
      // First, try to find existing contact by email
      console.log(`🔍 Looking for existing contact with email: ${contact.email}`)
      
      const { data: existingContact, error: findError } = await supabase
        .from('users')
        .select(`
          *,
          team:team_id(id, name, description)
        `)
        .eq('email', contact.email)
        .maybeSingle()
      
      if (findError) {
        console.error(`❌ Error finding contact:`, findError)
        throw findError
      }
      
      if (existingContact) {
        console.log(`✅ Found existing contact:`, { id: existingContact.id, name: existingContact.name })
        return existingContact
      }
      
      // If not found, create new contact
      console.log(`📝 Creating new contact:`, contact)
      return await this.create(contact)
      
    } catch (error) {
      console.error(`❌ Error in findOrCreate:`, error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['contacts']['Update']) {
    try {
      // Récupérer les données actuelles pour le log
      const { data: currentData } = await supabase
        .from('users')
        .select('id, name, email, team_id, role, provider_category')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error("❌ Contact update error:", {
          message: error.message,
          code: error.code,
          details: error.details
        })
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'update',
            'contact',
            currentData.name || 'Contact',
            error.message || 'Erreur lors de la modification',
            { 
              updates, 
              contact_id: id, 
              error: {
                message: error.message,
                code: error.code,
                details: error.details
              }
            }
          ).catch(logError => 
            console.error("Failed to log contact update error:", logError instanceof Error ? logError.message : String(logError))
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (data && currentData?.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: localUserId,
            actionType: 'update',
            entityType: 'contact',
            entityId: data.id,
            entityName: data.name || currentData.name,
            description: `Contact modifié : ${data.name || currentData.name}`,
            status: 'success',
            metadata: {
              changes: updates,
              previous_name: currentData.name,
              role: data.role || currentData.role,
              provider_category: data.provider_category || currentData.provider_category
            }
          }).catch(logError => 
            console.error("Failed to log contact update:", logError instanceof Error ? logError.message : String(logError))
          )

          // Notification de modification
          await notificationService.notifyContactUpdated(data, localUserId, updates).catch(notificationError =>
            console.error("Failed to send contact update notification:", notificationError instanceof Error ? notificationError.message : String(notificationError))
          )
        }
      }
      
      return data
    } catch (error) {
      console.error("❌ contactService.update error:", error instanceof Error ? error.message : String(error))
      throw error
    }
  },

  async delete(id: string) {
    try {
      // Récupérer les données actuelles pour le log avant suppression
      const { data: currentData } = await supabase
        .from('users')
        .select('id, name, email, team_id, role, provider_category, company')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error("❌ Contact deletion error:", error)
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'delete',
            'contact',
            currentData.name || 'Contact',
            error.message || 'Erreur lors de la suppression',
            { contact_id: id, contact_data: currentData, error: error }
          ).catch(logError => 
            console.error("Failed to log contact deletion error:", logError)
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (currentData?.team_id) {
        const localUserId = await getLocalUserId()
        if (localUserId) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: localUserId,
            actionType: 'delete',
            entityType: 'contact',
            entityId: id,
            entityName: currentData.name || 'Contact supprimé',
            description: `Contact supprimé : ${currentData.name || 'Contact supprimé'}`,
            status: 'success',
            metadata: {
              email: currentData.email,
              role: currentData.role,
              provider_category: currentData.provider_category,
              company: currentData.company,
              deleted_at: new Date().toISOString()
            }
          }).catch(logError => 
            console.error("Failed to log contact deletion:", logError instanceof Error ? logError.message : String(logError))
          )

          // Notification de suppression
          await notificationService.notifyContactDeleted(currentData, localUserId).catch(notificationError =>
            console.error("Failed to send contact deletion notification:", notificationError instanceof Error ? notificationError.message : String(notificationError))
          )
        }
      }
      
      return true
    } catch (error) {
      console.error("❌ contactService.delete error:", error)
      throw error
    }
  }
}

// Team Services - Using flexible typing until DB types are regenerated
export const teamService = {
  async getAll() {
    const { data, error } = await (supabase as any)
      .from('teams')
      .select(`
        *,
        created_by_user:created_by(name, email),
        team_members(
          id,
          role,
          joined_at,
          user:user_id(id, name, email, role)
        )
      `)
      .order('name')
    
    if (error) throw error
    return data
  },

  // Cache pour éviter les appels redondants
  _teamsCache: new Map<string, { data: any[], timestamp: number }>(),
  _CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  _STALE_WHILE_REVALIDATE_TTL: 30 * 60 * 1000, // 30 minutes pour données périmées

  async getUserTeams(userId: string) {
    console.log("👥 teamService.getUserTeams called with userId:", userId)
    
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [TEAM-SERVICE] JWT-only user detected, returning empty teams list")
      return []
    }
    
    // Vérifier le cache d'abord
    const cacheKey = `teams_${userId}`
    const cached = this._teamsCache.get(cacheKey)
    const now = Date.now()
    
    // Retourner le cache frais
    if (cached && (now - cached.timestamp) < this._CACHE_TTL) {
      console.log("✅ Returning fresh cached teams data")
      return cached.data
    }
    
    // Si on a des données périmées mais pas trop anciennes, les retourner tout en déclenchant une mise à jour en arrière-plan
    if (cached && (now - cached.timestamp) < this._STALE_WHILE_REVALIDATE_TTL) {
      console.log("🔄 Returning stale data while revalidating in background")
      
      // Mise à jour en arrière-plan sans attendre
      this._fetchTeamsWithRetry(userId, cacheKey).catch(error => {
        console.error("❌ Background team fetch failed:", error)
      })
      
      return cached.data
    }

    // Pas de cache valide, faire la requête avec retry
    return this._fetchTeamsWithRetry(userId, cacheKey)
  },

  async _fetchTeamsWithRetry(userId: string, cacheKey: string) {
    const now = Date.now()

    try {
      console.log("📡 Loading user teams with retry mechanism...")
      
      const result = await withRetry(async () => {
        // ✅ FIX: Skip connection check on server-side (API routes)
        if (typeof window !== 'undefined' && !connectionManager.isConnected()) {
          console.log("🔄 Connection lost, forcing reconnection...")
          connectionManager.forceReconnection()
          throw new Error("Connection not available")
        }

        // 1. Récupérer les IDs des équipes de l'utilisateur
        const { data: memberData, error: memberError } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', userId)

        if (memberError) {
          console.error("❌ Team members query error:", memberError)
          
          // Si c'est une erreur de connexion, marquer comme déconnecté
          if (this._isConnectionError(memberError)) {
            console.log("🔌 Connection error detected in team members query")
            connectionManager.forceReconnection()
          }
          throw memberError
        }
        
        if (!memberData || memberData.length === 0) {
          console.log("ℹ️ User is not member of any team")
          return []
        }
        
        // 2. Récupérer les détails des équipes
        const teamIds = memberData.map((m: any) => m.team_id)
        console.log("📝 Found team IDs:", teamIds)
        
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds)
          .order('name')

        if (teamsError) {
          console.error("❌ Teams details query error:", teamsError)
          
          // Si c'est une erreur de connexion, marquer comme déconnecté
          if (this._isConnectionError(teamsError)) {
            console.log("🔌 Connection error detected in teams query")
            connectionManager.forceReconnection()
          }
          throw teamsError
        }
        
        // Combiner les données
        return teamsData?.map((team: any) => ({
          ...team,
          team_members: memberData.filter((m: any) => m.team_id === team.id)
        })) || []
      }, 3, 1500) // 3 tentatives avec backoff exponentiel plus long
      
      console.log("✅ User teams loaded successfully with retry:", result.length)
      
      // Mettre en cache le résultat
      this._teamsCache.set(cacheKey, { data: result, timestamp: now })
      
      return result
    } catch (error) {
      console.error("❌ teamService.getUserTeams error after retries:", error)
      
      // Si on a encore des données en cache (même périmées), les utiliser
      const cached = this._teamsCache.get(cacheKey)
      if (cached) {
        console.log("⚠️ All retries failed, returning stale cached data")
        return cached.data
      }
      
      // En dernier recours, retourner un tableau vide et le mettre en cache
      console.log("⚠️ No cached data available, returning empty array")
      const result: any[] = []
      this._teamsCache.set(cacheKey, { data: result, timestamp: now })
      return result
    }
  },

  // Méthode utilitaire pour détecter les erreurs de connexion
  _isConnectionError(error: any): boolean {
    if (!error) return false
    
    const message = error.message?.toLowerCase() || ''
    const code = error.code || ''
    
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline') ||
      code === 'NETWORK_ERROR' ||
      code === 'TIMEOUT_ERROR' ||
      code === '08003' || // Connection does not exist (PostgreSQL)
      code === '08006'    // Connection failure (PostgreSQL)
    )
  },
  
  // Méthode pour vider le cache si nécessaire
  clearTeamsCache(userId?: string) {
    if (userId) {
      this._teamsCache.delete(`teams_${userId}`)
    } else {
      this._teamsCache.clear()
    }
    console.log("🗑️ Teams cache cleared", userId ? `for user ${userId}` : "completely")
  },

  async getById(id: string) {
    const { data, error } = await (supabase as any)
      .from('teams')
      .select(`
        *,
        created_by_user:created_by(name, email),
        team_members(
          id,
          role,
          joined_at,
          user:user_id(id, name, email, role)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },

  async create(team: { name: string; description?: string; created_by: string }) {
    console.log('🏗️ teamService.create called with:', team)
    
    try {
      // Create the team
      console.log('📝 Step 1: Creating team in teams table...')
      const { data: teamData, error: teamError } = await (supabase as any)
        .from('teams')
        .insert(team)
        .select()
        .single()
      
      if (teamError) {
        console.error('❌ Team creation error:', teamError)
        throw teamError
      }
      
      console.log('✅ Team created successfully:', teamData.id)

      // Add the creator as admin
      console.log('📝 Step 2: Adding creator as admin in team_members...')
      const memberData = {
        team_id: teamData.id,
        user_id: team.created_by,
        role: 'admin'
      }
      console.log('👤 Member data to insert:', memberData)
      
      const { error: memberError } = await (supabase as any)
        .from('team_members')
        .insert(memberData)
      
      if (memberError) {
        console.error('❌ Team member creation error:', memberError)
        // Si on ne peut pas ajouter le membre, supprimer l'équipe créée
        try {
          await (supabase as any).from('teams').delete().eq('id', teamData.id)
          console.log('🧹 Team deleted due to member creation failure')
        } catch (deleteError) {
          console.error('❌ Failed to cleanup team after member error:', deleteError)
        }
        throw memberError
      }
      
      console.log('✅ Team member added successfully')
      
      // 5. Mettre à jour le team_id dans la table users
      console.log('🔄 Updating user team_id...')
      const { error: updateError } = await (supabase as any)
        .from('users')
        .update({ team_id: teamData.id })
        .eq('id', team.created_by)
      
      if (updateError) {
        console.error('❌ Failed to update user team_id:', updateError)
        // Continue quand même, l'utilisateur est dans team_members
      } else {
        console.log('✅ User team_id updated successfully')
      }
      
      console.log('🎉 Team creation complete:', teamData.id)
      
      return teamData
    } catch (error) {
      console.error('❌ teamService.create failed:', error)
      throw error
    }
  },

  async update(id: string, updates: { name?: string; description?: string }) {
    const { data, error } = await (supabase as any)
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await (supabase as any)
      .from('teams')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Team member management
  async addMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member') {
    const { data, error } = await (supabase as any)
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role
      })
      .select(`
        *,
        user:user_id(id, name, email, role)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async removeMember(teamId: string, userId: string) {
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [TEAM-SERVICE] Cannot remove JWT-only user from team")
      throw new Error("Operation not available for JWT-only users")
    }

    const { error } = await (supabase as any)
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    
    if (error) throw error
    return true
  },

  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [TEAM-SERVICE] Cannot update role for JWT-only user")
      throw new Error("Operation not available for JWT-only users")
    }

    const { data, error } = await (supabase as any)
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select(`
        *,
        user:user_id(id, name, email, role)
      `)
      .single()
    
    if (error) throw error
    return data
  },

  async getMembers(teamId: string) {
    const { data, error } = await (supabase as any)
      .from('team_members')
      .select(`
        *,
        user:user_id(id, name, email, role)
      `)
      .eq('team_id', teamId)
      .order('joined_at')
    
    if (error) throw error
    return data
  },

  // Vérifier et créer une équipe personnelle si nécessaire (pour dashboard)
  async ensureUserHasTeam(userId: string): Promise<{ hasTeam: boolean; team?: any; error?: string }> {
    console.log("🔍 [TEAM-STATUS-NEW] Checking team status for user:", userId)
    
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [TEAM-STATUS-NEW] JWT-only user detected, returning hasTeam: false")
      return { hasTeam: false, error: "Mode JWT-only: équipe temporairement non disponible" }
    }
    
    try {
      // 1. Récupérer les informations de l'utilisateur (NOUVELLE ARCHITECTURE)
      let user
      try {
        user = await userService.getById(userId)
        console.log("👤 [TEAM-STATUS-NEW] User found by ID:", user.name, user.role)
      } catch (userError) {
        console.log("⚠️ [TEAM-STATUS-NEW] User not found by ID, checking teams directly")
        
        // L'utilisateur n'est pas trouvé - vérifier directement s'il a des équipes
        // via team_members (plus robuste que de créer une équipe)
        try {
          const existingTeams = await this.getUserTeams(userId)
          if (existingTeams.length > 0) {
            console.log("✅ [TEAM-STATUS-NEW] User has teams despite profile issue:", existingTeams.length)
            return { hasTeam: true, team: existingTeams[0] }
          }
        } catch (teamError) {
          console.log("⚠️ [TEAM-STATUS-NEW] Could not fetch teams either:", teamError)
        }
        
        // Aucune équipe trouvée et profil inaccessible - retourner une erreur douce
        console.log("🔄 [TEAM-STATUS-NEW] No profile and no teams found - allowing access with warning")
        return { hasTeam: true, team: null, error: "Profil utilisateur temporairement inaccessible" }
      }
      
      // 2. Vérifier si l'utilisateur a déjà une équipe
      const existingTeams = await this.getUserTeams(userId)
      
      if (existingTeams.length > 0) {
        console.log("✅ [TEAM-STATUS-NEW] User already has team(s):", existingTeams.length)
        return { hasTeam: true, team: existingTeams[0] }
      }
      
      // 3. VÉRIFICATION SUPPLÉMENTAIRE: L'utilisateur a-t-il été récemment invité ?
      // Si c'est le cas, il se peut qu'il soit dans team_members mais pas encore visible via getUserTeams
      console.log("🔍 Double-checking team membership in team_members table...")
      try {
        const { data: teamMembers, error: memberError } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', userId)
          .limit(1)
        
        if (memberError) {
          console.warn('⚠️ Could not check team_members:', memberError)
        } else if (teamMembers && teamMembers.length > 0) {
          console.log("✅ User found in team_members table:", teamMembers[0].team_id)
          // Récupérer les infos de l'équipe
          const team = await this.getById(teamMembers[0].team_id)
          return { hasTeam: true, team }
        }
      } catch (memberCheckError) {
        console.warn('⚠️ Error checking team_members:', memberCheckError)
      }
      
      // 4. Si pas d'équipe et role gestionnaire → créer équipe automatiquement
      if (user.role === 'gestionnaire') {
        console.log("🛠️ Creating personal team for manager...")
        
        const teamName = `Équipe de ${user.name}`
        const team = await this.create({
          name: teamName,
          description: `Équipe personnelle de ${user.name}`,
          created_by: userId
        })
        
        console.log("✅ Personal team created:", team.id)
        return { hasTeam: true, team }
      }
      
      // 5. Si pas d'équipe et autre rôle → retourner erreur
      console.log("⚠️ User has no team and is not manager")
      return { 
        hasTeam: false, 
        error: `Les utilisateurs avec le rôle "${user.role}" doivent être ajoutés à une équipe par un gestionnaire.` 
      }
      
    } catch (error) {
      console.error("❌ Error checking/creating team:", error)
      return { 
        hasTeam: false, 
        error: "Erreur lors de la vérification de l'équipe. Veuillez contacter le support." 
      }
    }
  },

  // Créer une équipe personnelle pour un gestionnaire existant (legacy - à supprimer)
  async createPersonalTeam(userId: string) {
    console.log("🛠️ Creating personal team for existing manager:", userId)
    
    try {
      // 1. Récupérer les informations de l'utilisateur
      const user = await userService.getById(userId)
      console.log("👤 User found:", user.name, user.role)
      
      if (user.role !== 'gestionnaire') {
        throw new Error('Only managers can have personal teams')
      }
      
      // 2. Vérifier si l'utilisateur n'a pas déjà une équipe
      const existingTeams = await this.getUserTeams(userId)
      if (existingTeams.length > 0) {
        console.log("⚠️ User already has teams:", existingTeams.length)
        return existingTeams[0] // Retourner la première équipe existante
      }
      
      // 3. Créer l'équipe personnelle
      const teamName = `Équipe de ${user.name}`
      const team = await this.create({
        name: teamName,
        description: `Équipe personnelle de ${user.name}`,
        created_by: userId
      })
      
      console.log("✅ Personal team created for existing user:", team.id)
      return team
    } catch (error) {
      console.error("❌ Failed to create personal team:", error)
      throw error
    }
  }
}

// Stats Services for dashboards
export const statsService = {
  // Cache pour les stats pour éviter les recalculs
  _statsCache: new Map<string, { data: any, timestamp: number }>(),
  _STATS_CACHE_TTL: 2 * 60 * 1000, // 2 minutes pour les stats (plus court)

  async getManagerStats(userId: string) {
    try {
      console.log("📊 Getting manager stats for user:", userId)
      
      // Vérifier le cache des stats
      const cacheKey = `stats_${userId}`
      const cached = this._statsCache.get(cacheKey)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < this._STATS_CACHE_TTL) {
        console.log("✅ Returning cached manager stats")
        return cached.data
      }
      
      // 1. Get user's team (utilise maintenant le cache des teams)
      const userTeams = await teamService.getUserTeams(userId)
      if (!userTeams || userTeams.length === 0) {
        console.log("⚠️ No team found for user")
        const emptyResult = {
          buildings: [],
          lots: [],
          contacts: [],
          interventions: [],
          stats: {
            buildingsCount: 0,
            lotsCount: 0,
            occupiedLotsCount: 0,
            occupancyRate: 0,
            contactsCount: 0,
            interventionsCount: 0
          }
        }
        // Mettre en cache même le résultat vide
        this._statsCache.set(cacheKey, { data: emptyResult, timestamp: now })
        return emptyResult
      }
      
      const team = userTeams[0]
      console.log("🏢 Found team:", team.id, team.name)
      
      // 2. Get buildings for this team (NOUVELLE ARCHITECTURE)
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select(`
          *,
          building_contacts(
            is_primary,
            user:user_id(id, name, email, role, provider_category)
          )
        `)
        .eq('team_id', team.id)
      
      if (buildingsError) {
        console.error("❌ Error fetching buildings:", buildingsError)
        throw buildingsError
      }
      
      console.log("🏗️ Found buildings:", buildings?.length || 0)
      
      // 3. Get lots for these buildings AND independent lots for the team
      const buildingIds = buildings?.map(b => b.id) || []
      let lots: any[] = []
      
      // Récupérer TOUS les lots : ceux liés aux bâtiments ET les lots indépendants de l'équipe
      const { data: lotsData, error: lotsError } = await supabase
        .from('lots')
        .select(`
          *,
          building:building_id(id, name, address),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        `)
        .or(buildingIds.length > 0 
          ? `building_id.in.(${buildingIds.join(',')}),and(building_id.is.null,team_id.eq.${team.id})`
          : `building_id.is.null,team_id.eq.${team.id}`
        )
      
      if (lotsError) {
        console.error("❌ Error fetching lots:", lotsError)
        throw lotsError
      }
      
      // Post-traitement pour extraire les locataires principaux
      const enrichedLots = (lotsData || []).map(lot => ({
        ...lot,
        tenant: lot.lot_contacts?.find(lc => 
          determineAssignmentType(lc.user) === 'tenant' && lc.is_primary
        )?.user || null
      }))
      
      lots = enrichedLots
      console.log("🏠 Found lots with contacts (including independent):", lots.length)
      
      // 4. Get contacts for this team
      const contacts = await contactService.getTeamContacts(team.id)
      console.log("👥 Found contacts:", contacts?.length || 0)
      
      // 5. Get ALL interventions for this team (NOUVELLE ARCHITECTURE)
      const { data: interventions, error: interventionsError } = await supabase
        .from('interventions')
        .select(`
          *,
          lot:lot_id(id, reference, building:building_id(name, address)),
          building:building_id(id, name, address),
          intervention_contacts(
            role,
            is_primary,
            user:user_id(id, name, email)
          )
        `)
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
      
      if (interventionsError) {
        console.error("❌ Error fetching team interventions:", interventionsError)
        throw interventionsError
      }
      
      console.log("🔧 Found team interventions:", interventions?.length || 0)
      
      // Post-traitement pour extraire les prestataires assignés
      const processedInterventions = interventions?.map(intervention => ({
        ...intervention,
        assigned_contact: intervention.intervention_contacts?.find(ic => 
          ic.role === 'prestataire' && ic.is_primary
        )?.user || null
      })) || []
      
      // 6. Format buildings with embedded lots (SEULEMENT les vrais immeubles)
      const formattedBuildings = buildings?.map(building => {
        const buildingLots = lots.filter(lot => lot.building_id === building.id)
        const buildingInterventions = (processedInterventions || []).filter(intervention => 
          intervention.building_id === building.id || 
          buildingLots.some(lot => lot.id === intervention.lot_id)
        )
        
        return {
          ...building,
          lots: buildingLots.map(lot => ({
            ...lot,
            status: lot.is_occupied ? 'occupied' : 'vacant', // ✅ Utiliser le nouveau champ calculé automatiquement
            tenant: lot.tenant?.name || null,
            interventions: (interventions || []).filter(i => i.lot_id === lot.id).length
          })),
          interventions: buildingInterventions.length
        }
      }) || []
      
      // 7. Calculate stats - séparation onglets Immeubles/Lots
      const independentLots = lots.filter(lot => lot.building_id === null)
      const occupiedLotsCount = lots.filter(lot => lot.is_occupied).length // ✅ Utiliser le nouveau champ calculé automatiquement
      const occupancyRate = lots.length > 0 ? Math.round((occupiedLotsCount / lots.length) * 100) : 0
      
      const stats = {
        buildingsCount: buildings?.length || 0, // ✅ SEULEMENT les vrais immeubles
        lotsCount: lots.length, // ✅ TOUS les lots (immeubles + indépendants)
        occupiedLotsCount,
        occupancyRate,
        contactsCount: contacts?.length || 0,
        interventionsCount: interventions?.length || 0
      }
      
      console.log("📊 Final stats:", stats)
      console.log("🏢 Real buildings:", buildings?.length || 0)
      console.log("🏠 Total lots (building + independent):", lots.length)
      console.log("🆓 Independent lots:", independentLots.length)
      
      const result = {
        buildings: formattedBuildings, // ✅ Onglet "Immeubles" : seulement les vrais immeubles
        lots, // ✅ Onglet "Lots" : TOUS les lots (avec building_id et building_id=null)
          contacts: contacts || [],
          interventions: processedInterventions || [],
        stats,
        team
      }
      
      // Mettre en cache le résultat final
      this._statsCache.set(cacheKey, { data: result, timestamp: now })
      
      return result
      
    } catch (error) {
      console.error("❌ Error in getManagerStats:", error)
      
      // En cas d'erreur, essayer de retourner des données en cache si disponibles
      const errorCacheKey = `stats_${userId}`
      const cached = this._statsCache.get(errorCacheKey)
      if (cached) {
        console.log("⚠️ Error occurred, returning stale cached data")
        return cached.data
      }
      
      throw error
    }
  },

  async getContactStats(userId: string) {
    try {
      console.log("👥 Getting contact stats for user:", userId)
      
      // Vérifier le cache des stats contacts
      const cacheKey = `contact_stats_${userId}`
      const cached = this._statsCache.get(cacheKey)
      const now = Date.now()
      
      if (cached && (now - cached.timestamp) < this._STATS_CACHE_TTL) {
        console.log("✅ Returning cached contact stats")
        return cached.data
      }
      
      // 1. Get user's team
      const userTeams = await teamService.getUserTeams(userId)
      if (!userTeams || userTeams.length === 0) {
        console.log("⚠️ No team found for user")
        const emptyResult = {
          totalContacts: 0,
          contactsByType: {
            gestionnaire: { total: 0, active: 0 },
            locataire: { total: 0, active: 0 },
            prestataire: { total: 0, active: 0 },
            syndic: { total: 0, active: 0 },
            notaire: { total: 0, active: 0 },
            assurance: { total: 0, active: 0 },
            proprietaire: { total: 0, active: 0 },
            autre: { total: 0, active: 0 }
          },
          totalActiveAccounts: 0,
          invitationsPending: 0
        }
        this._statsCache.set(cacheKey, { data: emptyResult, timestamp: now })
        return emptyResult
      }
      
      const team = userTeams[0]
      console.log("🏢 Found team for contact stats:", team.id)
      
      // 2. Get all users in the team (contacts with active accounts)
      const { data: activeUsers, error: usersError } = await supabase
        .from('team_members')
        .select(`
          user:user_id(
            id,
            name,
            first_name,
            last_name,
            email,
            role,
            provider_category,
            created_at
          )
        `)
        .eq('team_id', team.id)
      
      if (usersError) {
        console.error("❌ Error fetching team members:", usersError)
        throw usersError
      }
      
      // 3. Get pending invitations
      const { data: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select('id, role, provider_category, email, status')
        .eq('team_id', team.id)
        .eq('status', 'pending')
      
      if (invitationsError) {
        console.error("❌ Error fetching pending invitations:", invitationsError)
        throw invitationsError
      }
      
      // 4. Process statistics
      const contactsByType = {
        gestionnaire: { total: 0, active: 0 },
        locataire: { total: 0, active: 0 },
        prestataire: { total: 0, active: 0 },
        syndic: { total: 0, active: 0 },
        notaire: { total: 0, active: 0 },
        assurance: { total: 0, active: 0 },
        proprietaire: { total: 0, active: 0 },
        autre: { total: 0, active: 0 }
      }
      
      // Helper function to map user role to contact type
      const mapUserRoleToContactType = (role: string, providerCategory?: string | null) => {
        switch (role) {
          case 'gestionnaire':
            return 'gestionnaire'
          case 'locataire':
            return 'locataire'
          case 'prestataire':
            // For prestataires, use provider_category if available
            return providerCategory && providerCategory !== 'prestataire' ? providerCategory : 'prestataire'
          case 'admin':
            return 'gestionnaire' // Admins are counted as gestionnaires for stats
          default:
            return 'autre'
        }
      }

      // Count active users by type
      let totalActiveAccounts = 0
      if (activeUsers) {
        for (const member of activeUsers) {
          if (member.user?.role) {
            const contactType = mapUserRoleToContactType(member.user.role, member.user.provider_category) as keyof typeof contactsByType
            if (contactsByType[contactType]) {
              contactsByType[contactType].active += 1
              contactsByType[contactType].total += 1
              totalActiveAccounts += 1
            }
          }
        }
      }
      
      // Count pending invitations by type
      const invitationsPending = pendingInvitations?.length || 0
      if (pendingInvitations) {
        for (const invitation of pendingInvitations) {
          if (invitation.role) {
            const contactType = mapUserRoleToContactType(invitation.role, invitation.provider_category) as keyof typeof contactsByType
            if (contactsByType[contactType]) {
              contactsByType[contactType].total += 1
            }
          }
        }
      }
      
      const totalContacts = Object.values(contactsByType).reduce((sum, type) => sum + type.total, 0)
      
      const result = {
        totalContacts,
        contactsByType,
        totalActiveAccounts,
        invitationsPending
      }
      
      console.log("📊 Final contact stats:", result)
      
      // Mettre en cache le résultat
      this._statsCache.set(cacheKey, { data: result, timestamp: now })
      
      return result
      
    } catch (error) {
      console.error("❌ Error in getContactStats:", error)
      
      // En cas d'erreur, essayer de retourner des données en cache si disponibles
      const errorCacheKey = `contact_stats_${userId}`
      const cached = this._statsCache.get(errorCacheKey)
      if (cached) {
        console.log("⚠️ Error occurred, returning stale cached contact data")
        return cached.data
      }
      
      throw error
    }
  },
  
  // Méthode pour vider le cache des stats
  clearStatsCache(userId?: string) {
    if (userId) {
      this._statsCache.delete(`stats_${userId}`)
      this._statsCache.delete(`contact_stats_${userId}`)
    } else {
      this._statsCache.clear()
    }
  }
}

// Contact invitation service
export const contactInvitationService = {
  // Créer un contact et optionnellement inviter l'utilisateur
  async createContactWithOptionalInvite(contactData: {
    type: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    address?: string
    speciality?: string
    notes?: string
    inviteToApp: boolean
    teamId: string
  }) {
    try {
      console.log('🚀 [CONTACT-INVITATION-SERVICE-SIMPLE] Starting with data:', contactData)
      
      // ✅ NOUVEAU FLUX SIMPLE: Utiliser la nouvelle API invite-user
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contactData.email,
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          role: mapFrontendTypeToUserRole(contactData.type).role,
          providerCategory: mapFrontendTypeToUserRole(contactData.type).provider_category,
          teamId: contactData.teamId,
          phone: contactData.phone,
          speciality: contactData.speciality, // ✅ AJOUT: Spécialité pour les prestataires
          shouldInviteToApp: contactData.inviteToApp // ✅ NOUVEAU PARAMÈTRE
        })
      })
      
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || `API returned ${response.status}`)
      }
      
      console.log('✅ [CONTACT-INVITATION-SERVICE-SIMPLE] Process completed:', result)
      return result
      
    } catch (error) {
      console.error('❌ [CONTACT-INVITATION-SERVICE-SIMPLE] Error:', error)
      throw error
    }
  },

  // ✅ NOUVEAU: Récupérer seulement les invitations PENDING pour une équipe
  async getPendingInvitations(teamId: string) {
    try {
      console.log('📧 [INVITATION-SERVICE] Getting PENDING invitations for team:', teamId)
      
      // 1. Récupérer seulement les invitations PENDING pour cette équipe  
      const { data: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select(`
          id,
          email,
          role,
          first_name,
          last_name,
          invitation_code,
          status,
          invited_at,
          expires_at,
          accepted_at,
          created_at,
          updated_at,
          invited_by,
          inviter:invited_by(
            id,
            name,
            first_name,
            last_name,
            email
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending') // ✅ CORRECTION: Filtrer seulement les invitations pending
        .order('created_at', { ascending: false })
      
      if (invitationsError) {
        console.error('❌ [INVITATION-SERVICE] Error fetching pending invitations:', invitationsError)
        throw invitationsError
      }

      if (!pendingInvitations || pendingInvitations.length === 0) {
        console.log('📧 [INVITATION-SERVICE] No pending invitations found for team')
        return []
      }

      console.log(`📧 [INVITATION-SERVICE] Found ${pendingInvitations.length} invitations`)

      // 2. Transformer les données pour correspondre au format attendu
      const formattedInvitations = pendingInvitations.map(invitation => {
        // Créer un objet contact à partir des données d'invitation
        const fullName = `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
        const displayName = fullName || invitation.email.split('@')[0]
        
        const contactData = {
          id: invitation.id,
          name: displayName,
          first_name: invitation.first_name || '',
          last_name: invitation.last_name || '',
          email: invitation.email,
          role: invitation.role, // Utiliser role directement
          provider_category: invitation.provider_category || null,
          company: null,
          speciality: null,
          created_at: invitation.created_at
        }

        console.log(`📋 [INVITATION-SERVICE] Processing invitation for ${invitation.email} with status: ${invitation.status || 'pending'}`)

        return {
          ...contactData,
          invitation_id: invitation.id,
          status: invitation.status || 'pending', // ✅ NOUVEAU: Utiliser le vrai statut
          invitation_status: invitation.status || 'pending', // Garder l'ancien nom pour compatibilité
          invited_at: invitation.invited_at || invitation.created_at,
          expires_at: invitation.expires_at,
          accepted_at: invitation.accepted_at,
          invitation_code: invitation.invitation_code,
          inviter_info: invitation.inviter
        }
      })

      console.log('✅ [INVITATION-SERVICE] Found invitations:', formattedInvitations.length)
      return formattedInvitations

    } catch (error) {
      console.error('❌ [INVITATION-SERVICE] Error in getPendingInvitations:', error)
      throw error
    }
  },

  // Marquer une invitation comme acceptée en utilisant son ID unique
  async markInvitationAsAcceptedById(invitationId: string) {
    try {
      console.log('✅ [INVITATION-SERVICE] Marking invitation as accepted by ID:', invitationId)
      
      // D'abord, vérifier que l'invitation existe
      const { data: existingInvitation, error: checkError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single()
      
      if (checkError) {
        console.error('❌ [INVITATION-SERVICE] Error checking invitation by ID:', checkError)
        return { success: false, error: checkError.message }
      }

      if (!existingInvitation) {
        console.log('⚠️ [INVITATION-SERVICE] No invitation found for ID:', invitationId)
        return { success: false, error: 'No invitation found for this ID' }
      }

      console.log(`🔍 [INVITATION-SERVICE] Found invitation:`)
      console.log(`  - ID: ${existingInvitation.id}`)
      console.log(`  - Email: ${existingInvitation.email}`)
      console.log(`  - Current Status: ${existingInvitation.status}`)
      console.log(`  - Team: ${existingInvitation.team_id}`)
      console.log(`  - Invited at: ${existingInvitation.invited_at}`)
      
      const { data, error } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId)
        .select()
      
      if (error) {
        console.error('❌ [INVITATION-SERVICE] Error marking invitation as accepted by ID:', error)
        throw error
      }
      
      console.log(`✅ [INVITATION-SERVICE] Invitation marked as accepted successfully`)
      if (data.length > 0) {
        console.log(`📊 [INVITATION-SERVICE] Updated invitation:`, data[0])
      }
      
      return { 
        success: true, 
        count: data.length,
        invitation: data[0] || null
      }
      
    } catch (error) {
      console.error('❌ [INVITATION-SERVICE] Error in markInvitationAsAcceptedById:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Marquer une invitation comme acceptée en utilisant le token magic link
  async markInvitationAsAcceptedByToken(magicLinkToken: string) {
    try {
      console.log('✅ [INVITATION-SERVICE] Marking invitation as accepted using token:', magicLinkToken)
      
      // D'abord, vérifier quelle invitation correspond à ce token
      const { data: existingInvitation, error: checkError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('magic_link_token', magicLinkToken)
        .single()
      
      if (checkError) {
        console.error('❌ [INVITATION-SERVICE] Error checking invitation by token:', checkError)
        return { success: false, error: checkError.message }
      }

      if (!existingInvitation) {
        console.log('⚠️ [INVITATION-SERVICE] No invitation found for token:', magicLinkToken)
        return { success: false, error: 'No invitation found for this token' }
      }

      console.log(`🔍 [INVITATION-SERVICE] Found invitation for token:`)
      console.log(`  - ID: ${existingInvitation.id}`)
      console.log(`  - Email: ${existingInvitation.email}`)
      console.log(`  - Current Status: ${existingInvitation.status}`)
      console.log(`  - Team: ${existingInvitation.team_id}`)
      
      const { data, error } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('magic_link_token', magicLinkToken)
        .eq('status', 'pending')
        .select()
      
      if (error) {
        console.error('❌ [INVITATION-SERVICE] Error marking invitation as accepted by token:', error)
        throw error
      }
      
      console.log(`✅ [INVITATION-SERVICE] ${data.length} invitation(s) marked as accepted using token`)
      if (data.length === 0) {
        console.log('⚠️ [INVITATION-SERVICE] No pending invitations found for this token!')
      } else {
        data.forEach((inv, index) => {
          console.log(`  ✅ Marked invitation ${index + 1}: ${inv.id} (${inv.email} - Team: ${inv.team_id})`)
        })
      }
      
      return { success: true, count: data.length }
      
    } catch (error) {
      console.error('❌ [INVITATION-SERVICE] Error in markInvitationAsAcceptedByToken:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Marquer une invitation comme acceptée (méthode par email - fallback)
  async markInvitationAsAccepted(email: string) {
    try {
      console.log('✅ [INVITATION-SERVICE] Starting markInvitationAsAccepted for:', email)
      console.log('🔧 [INVITATION-SERVICE] Supabase client URL:', supabase.supabaseUrl)
      console.log('🔧 [INVITATION-SERVICE] Supabase client key prefix:', supabase.supabaseKey?.substring(0, 20) + '...')
      
      // D'abord, vérifier quelles invitations existent pour cet email
      console.log('🔍 [INVITATION-SERVICE] Querying user_invitations table...')
      const { data: existingInvitations, error: checkError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('email', email)
      
      console.log('📊 [INVITATION-SERVICE] Query completed. Error:', checkError, 'Data length:', existingInvitations?.length)
      
      if (checkError) {
        console.error('❌ [INVITATION-SERVICE] Error checking existing invitations:', checkError)
        console.error('❌ [INVITATION-SERVICE] Full error details:', JSON.stringify(checkError, null, 2))
        return { success: false, error: checkError.message }
      } else {
        console.log(`🔍 [INVITATION-SERVICE] Found ${existingInvitations?.length || 0} total invitation(s) for ${email}:`)
        existingInvitations?.forEach((inv, index) => {
          console.log(`  ${index + 1}. ID: ${inv.id}, Status: ${inv.status}, Team: ${inv.team_id}, Token: ${inv.magic_link_token}, Invited: ${inv.invited_at}`)
        })
      }
      
      console.log('🔄 [INVITATION-SERVICE] Attempting to update pending invitations...')
      const { data, error } = await supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .eq('status', 'pending')
        .select()
      
      console.log('📊 [INVITATION-SERVICE] Update completed. Error:', error, 'Updated rows:', data?.length)
      
      if (error) {
        console.error('❌ [INVITATION-SERVICE] Error marking invitation as accepted:', error)
        console.error('❌ [INVITATION-SERVICE] Full update error details:', JSON.stringify(error, null, 2))
        return { success: false, error: error.message }
      }
      
      console.log(`✅ [INVITATION-SERVICE] ${data.length} invitation(s) marked as accepted for ${email}`)
      if (data.length === 0) {
        console.log('⚠️ [INVITATION-SERVICE] No pending invitations found to mark as accepted!')
        console.log('🔍 [INVITATION-SERVICE] This means either:')
        console.log('  - No invitations exist for this email')
        console.log('  - All invitations are already accepted/expired')
        console.log('  - RLS policies are blocking the update')
      } else {
        data.forEach((inv, index) => {
          console.log(`  ✅ Marked invitation ${index + 1}: ${inv.id} (Team: ${inv.team_id}) Status: ${inv.status}`)
        })
      }
      
      return { success: true, count: data.length }
      
    } catch (error) {
      console.error('❌ [INVITATION-SERVICE] Critical error in markInvitationAsAccepted:', error)
      console.error('❌ [INVITATION-SERVICE] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },

  // Renvoyer une invitation
  async resendInvitation(invitationId: string) {
    try {
      console.log('🔄 [INVITATION-SERVICE] Resending invitation for ID:', invitationId)
      
      // Utiliser la nouvelle API dédiée au renvoi d'invitation
      console.log('📧 [INVITATION-SERVICE] Calling dedicated resend API')
      const response = await fetch('/api/resend-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: invitationId
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('❌ [INVITATION-SERVICE] Resend API error:', result.error)
        throw new Error(result.error || `API returned ${response.status}`)
      }

      console.log('✅ [INVITATION-SERVICE] Invitation resent successfully')
      console.log('🔗 [INVITATION-SERVICE] Magic link available:', !!result.magicLink)
      
      return { 
        success: true, 
        message: result.message || 'Invitation renvoyée avec succès',
        userId: result.userId,
        magicLink: result.magicLink,
        emailSent: result.emailSent
      }

    } catch (error) {
      console.error('❌ [INVITATION-SERVICE] Error resending invitation:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }
  }
}

// =============================================================================
// NOUVELLE LOGIQUE D'ASSIGNATION BASÉE SUR ROLE/PROVIDER_CATEGORY
// =============================================================================

export interface AssignmentUser {
  id: string
  name?: string
  // ✅ Support rôles français (DB) ET anglais (interface)
  role: 'admin' | 'manager' | 'tenant' | 'provider' | 'gestionnaire' | 'locataire' | 'prestataire'
  // ✅ Support catégories françaises (DB) ET anglaises (interface)  
  provider_category?: 'service' | 'insurance' | 'legal' | 'syndic' | 'owner' | 'other' | 'prestataire' | 'assurance' | 'notaire' | 'proprietaire' | 'autre' | null
  speciality?: string
}

// Fonction pour déterminer le type d'assignation d'un utilisateur
export const determineAssignmentType = (user: AssignmentUser): string => {
  // ✅ Support des rôles français (DB) ET anglais (interface)
  if (user.role === 'tenant' || user.role === 'locataire') return 'tenant'
  if (user.role === 'manager' || user.role === 'gestionnaire' || user.role === 'admin') return 'manager'
  
  if (user.role === 'provider' || user.role === 'prestataire') {
    // ✅ Support des catégories françaises (DB) ET anglaises (interface)
    const category = user.provider_category
    if (category === 'syndic') return 'syndic'
    if (category === 'legal' || category === 'notaire') return 'notary' 
    if (category === 'insurance' || category === 'assurance') return 'insurance'
    if (category === 'owner' || category === 'proprietaire') return 'owner'
    if (category === 'other' || category === 'autre') return 'other'
    if (category === 'service' || category === 'prestataire') return 'provider'
    return 'provider' // Prestataire générique par défaut
  }
  
  return 'other'
}

// Fonction pour filtrer les utilisateurs par type d'assignation demandé
export const filterUsersByRole = (users: AssignmentUser[], requestedType: string): AssignmentUser[] => {
  return users.filter(user => determineAssignmentType(user) === requestedType)
}

// Fonction pour valider l'assignation selon le contexte
export const validateAssignment = (user: AssignmentUser, context: 'building' | 'lot'): boolean => {
  // Les locataires ne peuvent être assignés qu'aux lots, jamais aux buildings
  if ((user.role === 'tenant' || user.role === 'locataire') && context === 'building') {
    return false
  }
  return true
}

// Fonction pour obtenir les utilisateurs actifs par type d'assignation
export const getActiveUsersByAssignmentType = async (teamId: string, assignmentType: string): Promise<AssignmentUser[]> => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, role, provider_category, speciality, name, email, phone')
    .eq('team_id', teamId)
    .eq('is_active', true)
  
  if (error) throw error
  
  return filterUsersByRole(users as AssignmentUser[], assignmentType)
}

// Fonction pour mapper les types frontend vers les rôles utilisateur réels
export const mapFrontendTypeToUserRole = (frontendType: string): { role: string; provider_category?: string } => {
  const typeMapping: Record<string, { role: string; provider_category?: string }> = {
    // Types frontend vers rôles français (base de données)
    'tenant': { role: 'locataire' },
    'manager': { role: 'gestionnaire' },
    'provider': { role: 'prestataire', provider_category: 'prestataire' },
    'syndic': { role: 'prestataire', provider_category: 'syndic' },
    'notary': { role: 'prestataire', provider_category: 'notaire' },
    'insurance': { role: 'prestataire', provider_category: 'assurance' },
    'owner': { role: 'prestataire', provider_category: 'proprietaire' },
    'other': { role: 'prestataire', provider_category: 'autre' },
    // Support direct des types database (compatibilité ascendante)
    'locataire': { role: 'locataire' },
    'gestionnaire': { role: 'gestionnaire' },
    'prestataire': { role: 'prestataire', provider_category: 'prestataire' }
  }
  
  const mappedType = typeMapping[frontendType]
  if (!mappedType) {
    console.error('❌ Unknown frontend type for mapping:', frontendType)
    console.error('📋 Available mappings:', Object.keys(typeMapping))
    throw new Error(`Unknown frontend type: ${frontendType}`)
  }
  
  console.log(`🔄 Mapped frontend type: ${frontendType} → role: ${mappedType.role}, provider_category: ${mappedType.provider_category || 'none'}`)
  return mappedType
}

// Tenant Services
export const tenantService = {

  async getTenantData(userId: string) {
    console.log("👤 getTenantData called for userId:", userId)
    
    try {
      // ✅ CORRECTION: Gérer les IDs JWT-only
      let actualUserId = userId
      if (userId.startsWith('jwt_')) {
        // Récupérer l'ID réel de l'utilisateur depuis la base de données
        const authUserId = userId.replace('jwt_', '')
        const userProfile = await userService.findByAuthUserId(authUserId)
        if (userProfile) {
          actualUserId = userProfile.id
          console.log("🔄 [TENANT-SERVICE] Resolved JWT user ID:", {
            original: userId,
            authUserId,
            actualUserId: actualUserId
          })
        } else {
          console.error("❌ [TENANT-SERVICE] Could not resolve JWT user ID:", userId)
          return null
        }
      }
      
      // Get lots linked directly to this user via lot_contacts (pour les locataires)
      const { data: lotContacts, error: lotContactsError } = await supabase
        .from('lot_contacts')
        .select(`
          lot:lot_id(
            id,
            reference,
            floor,
            apartment_number,
            category,
            building_id,
            building:building_id(
              id,
              name,
              address,
              city,
              postal_code,
              description
            )
          ),
          is_primary,
          start_date,
          end_date
        `)
        .eq('user_id', actualUserId)
        .is('end_date', null) // Only active relations
        .order('is_primary', { ascending: false }) // Primary contacts first

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      if (!lotContacts || lotContacts.length === 0) {
        console.log("❌ No lot found for user:", userId)
        return null
      }

      // Take the first lot (primary if available, or first active one)
      const primaryLotContact = lotContacts[0]
      const lot = primaryLotContact.lot

      console.log("✅ Found tenant lot via lot_contacts:", lot)

      // ✅ VALIDATION: Gestion des lots avec/sans bâtiment
      if (!lot.building && lot.building_id) {
        console.log("⚠️ [TENANT-DATA] Building relation not loaded, attempting separate fetch:", {
          lotId: lot.id,
          buildingId: lot.building_id,
          userId: actualUserId
        })

        // Essayer de récupérer les données building séparément
        const { data: buildingData, error: buildingError } = await supabase
          .from('buildings')
          .select('id, name, address, city, postal_code, description')
          .eq('id', lot.building_id)
          .single()

        if (buildingError) {
          console.error("❌ [TENANT-DATA] Building fetch failed:", buildingError)
        } else if (buildingData) {
          console.log("✅ [TENANT-DATA] Found building separately:", buildingData)
          lot.building = buildingData
        } else {
          console.error("❌ [TENANT-DATA] Building not found in database:", lot.building_id)
        }
      } else if (!lot.building_id) {
        console.log("ℹ️ [TENANT-DATA] Independent lot (no building_id):", {
          lotId: lot.id,
          reference: lot.reference,
          category: lot.category
        })
      }

      return lot
    } catch (error) {
      console.error("❌ Error in getTenantData:", error)
      throw error
    }
  },

  async getAllTenantLots(userId: string) {
    console.log("🏠 getAllTenantLots called for userId:", userId)
    
    // ✅ Protection contre les IDs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [TENANT-LOTS] JWT-only user detected, returning empty lots list")
      return []
    }
    
    try {
      // Get all lots linked directly to this user via lot_contacts (pour les locataires)
      const { data: lotContacts, error: lotContactsError } = await supabase
        .from('lot_contacts')
        .select(`
          lot:lot_id(
            *,
            building:building_id(
              id,
              name,
              address,
              city,
              postal_code,
              description
            )
          ),
          is_primary,
          start_date,
          end_date
        `)
        .eq('user_id', userId)
        .is('end_date', null) // Only active relations
        .order('is_primary', { ascending: false }) // Primary contacts first

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      const lots = lotContacts?.map(lc => lc.lot).filter(Boolean) || []
      console.log("✅ Found tenant lots:", lots.length)
      return lots
    } catch (error) {
      console.error("❌ Error in getAllTenantLots:", error)
      throw error
    }
  },

  async getTenantInterventions(userId: string) {
    console.log("🔧 getTenantInterventions called for userId:", userId)
    
    try {
      // ✅ CORRECTION: Gérer les IDs JWT-only
      let actualUserId = userId
      if (userId.startsWith('jwt_')) {
        // Récupérer l'ID réel de l'utilisateur depuis la base de données
        const authUserId = userId.replace('jwt_', '')
        const userProfile = await userService.findByAuthUserId(authUserId)
        if (userProfile) {
          actualUserId = userProfile.id
          console.log("🔄 [TENANT-INTERVENTIONS] Resolved JWT user ID:", {
            original: userId,
            authUserId,
            actualUserId: actualUserId
          })
        } else {
          console.error("❌ [TENANT-INTERVENTIONS] Could not resolve JWT user ID:", userId)
          return []
        }
      }
      
      // Get all lot IDs where this user is assigned (pour les locataires)
      const { data: lotContacts, error: lotContactsError } = await supabase
        .from('lot_contacts')
        .select('lot_id')
        .eq('user_id', actualUserId)
        .is('end_date', null) // Only active relations

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      const lotIds = lotContacts?.map(lc => lc.lot_id).filter(Boolean) || []
      
      if (lotIds.length === 0) {
        console.log("❌ No lots found for user:", userId)
        return []
      }

      // Get interventions for those lots
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          lot:lot_id(
            reference,
            building:building_id(name)
          )
        `)
        .in('lot_id', lotIds)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error("❌ Error getting tenant interventions:", error)
        throw error
      }

      console.log("✅ Found tenant interventions:", data?.length || 0)
      return data || []
    } catch (error) {
      console.error("❌ Error in getTenantInterventions:", error)
      throw error
    }
  },

  async getTenantStats(userId: string) {
    console.log("📊 getTenantStats called for userId:", userId)
    
    try {
      // ✅ CORRECTION: Gérer les IDs JWT-only
      let actualUserId = userId
      if (userId.startsWith('jwt_')) {
        // Récupérer l'ID réel de l'utilisateur depuis la base de données
        const authUserId = userId.replace('jwt_', '')
        const userProfile = await userService.findByAuthUserId(authUserId)
        if (userProfile) {
          actualUserId = userProfile.id
          console.log("🔄 [TENANT-STATS] Resolved JWT user ID:", {
            original: userId,
            authUserId,
            actualUserId: actualUserId
          })
        } else {
          console.error("❌ [TENANT-STATS] Could not resolve JWT user ID:", userId)
          return {
            openRequests: 0,
            inProgress: 0,
            thisMonthInterventions: 0,
            documentsCount: 0,
            nextPaymentDate: 15
          }
        }
      }
      
      // Get all lot IDs where this user is assigned (pour les locataires)
      const { data: lotContacts, error: lotContactsError } = await supabase
        .from('lot_contacts')
        .select('lot_id')
        .eq('user_id', actualUserId)
        .is('end_date', null) // Only active relations

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      const lotIds = lotContacts?.map(lc => lc.lot_id).filter(Boolean) || []
      
      if (lotIds.length === 0) {
        console.log("❌ No lots found for user:", userId)
        return {
          openRequests: 0,
          inProgress: 0,
          thisMonthInterventions: 0,
          documentsCount: 0,
          nextPaymentDate: 15
        }
      }

      // Get intervention stats for all contact's lots
      const { data: interventions, error: interventionError } = await supabase
        .from('interventions')
        .select('status, created_at')
        .in('lot_id', lotIds)

      if (interventionError) {
        console.error("❌ Error getting intervention stats:", interventionError)
        throw interventionError
      }

      // Calculate stats
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const openRequests = interventions?.filter(i => 
        ['demande', 'approuvee', 'demande_de_devis', 'planification', 'planifiee', 'en_cours', 'cloturee_par_prestataire'].includes(i.status)
      ).length || 0

      const inProgress = interventions?.filter(i => i.status === 'en_cours').length || 0
      
      const thisMonthInterventions = interventions?.filter(i => 
        i.created_at && new Date(i.created_at) >= thisMonth
      ).length || 0

      console.log("✅ Tenant stats calculated:", {
        openRequests,
        inProgress,
        thisMonthInterventions
      })

      return {
        openRequests,
        inProgress,
        thisMonthInterventions,
        // Mock data for now - can be extended with real document/payment data
        documentsCount: 0,
        nextPaymentDate: 15 // Next month 15th as default
      }
    } catch (error) {
      console.error("❌ Error in getTenantStats:", error)
      throw error
    }
  }
}

// Composite Services for complex operations
export const compositeService = {
  // Create a complete building with lots and assign to team
  async createBuildingWithLots(data: {
    building: {
      name: string
      address: string
      city: string
      country: string
      postal_code: string
      description?: string
      construction_year?: number
      team_id?: string
    }
    lots: Array<{
      reference: string
      floor?: number
      apartment_number?: string
      surface_area?: number
      rooms?: number
      charges_amount?: number
    }>
  }) {
    console.log("🏗️ createBuildingWithLots called with:", {
      building: data.building,
      lotsCount: data.lots.length
    })

    try {
      console.log("📝 Creating building...")
      
      // Create the building
      const building = await buildingService.create({
        ...data.building,
        total_lots: data.lots.length
      })

      console.log("✅ Building created successfully:", {
        id: building.id,
        name: building.name
      })

      console.log("📝 Creating lots...")

      // Create lots for this building
      const lotsPromises = data.lots.map((lot, index) => {
        console.log(`📝 Creating lot ${index + 1}:`, lot)
        return lotService.create({
          ...lot,
          building_id: building.id,
          ...(data.building.team_id && { team_id: data.building.team_id }) // Hériter l'équipe du bâtiment
        } as any)
      })

      const lots = await Promise.all(lotsPromises)

      console.log("✅ Lots created successfully:", {
        count: lots.length,
        lotIds: lots.map(l => l.id)
      })
      console.log("🔗 All lots linked to team:", data.building.team_id)

      return {
        building,
        lots
      }
    } catch (error) {
      console.error('❌ Error in createBuildingWithLots:', error)
      console.error('📋 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        buildingData: data.building,
        lotsData: data.lots
      })
      throw error
    }
  },

  // Create building, lots, and contacts all in one transaction
  async createCompleteProperty(data: {
    building: {
      name: string
      address: string
      city: string
      country: string
      postal_code: string
      description?: string
      construction_year?: number
      team_id?: string
    }
    lots: Array<{
      reference: string
      floor?: number
      apartment_number?: string
      surface_area?: number
      rooms?: number
      charges_amount?: number
    }>
    contacts: Array<{
      name: string
      email: string
      phone?: string
      company?: string
      speciality?: string
      address?: string
      notes?: string
      team_id?: string
    }>
    lotContactAssignments?: Array<{
      lotId: string
      lotIndex: number
      assignments: Array<{
        contactId: string
        contactType: string
        isPrimary: boolean
      }>
    }>
  }) {
    console.log("🏭 compositeService.createCompleteProperty called with:", {
      building: data.building,
      lotsCount: data.lots.length,
      contactsCount: data.contacts.length
    })

    try {
      console.log("📝 Step 1: Creating building with lots...")
      
      // Create building with lots
      const { building, lots } = await this.createBuildingWithLots({
        building: data.building,
        lots: data.lots
      })

      console.log("✅ Step 1 completed - Building and lots created:", {
        buildingId: building.id,
        lotsCount: lots.length
      })

      if (data.contacts.length > 0) {
        console.log("📝 Step 2: Finding or creating contacts...")
        
        // Find or create contacts (avoid duplicates)
        const contactsPromises = data.contacts.map((contact, index) => {
          console.log(`📝 Finding or creating contact ${index + 1}:`, contact)
          return contactService.findOrCreate({
            ...contact,
            speciality: contact.speciality as any,
            team_id: data.building.team_id
          })
        })

        const contacts = await Promise.all(contactsPromises)

        console.log("✅ Step 2 completed - Contacts found/created:", {
          contactsCount: contacts.length,
          contactIds: contacts.map(c => c.id)
        })
        console.log("🔗 All contacts linked to team:", data.building.team_id)

        console.log("📝 Step 3: Linking contacts to building...")

        // Link contacts to building
        const buildingContactsPromises = contacts.map((contact, index) => {
          console.log(`📝 Linking contact ${index + 1} to building:`, {
            buildingId: building.id,
            contactId: contact.id
          })
          return supabase
            .from('building_contacts')
            .insert({
              building_id: building.id,
              contact_id: contact.id
            })
        })

        const linkResults = await Promise.all(buildingContactsPromises)

        console.log("✅ Step 3 completed - Contacts linked to building:", {
          linkCount: linkResults.length
        })

        console.log("🎉 All steps completed successfully!")

        // Étape 4: Créer les assignations lot-contact si fournies
        if (data.lotContactAssignments && data.lotContactAssignments.length > 0) {
          console.log("📝 Step 4: Creating lot-contact assignments and setting lot managers...")
          
          // Première passe : assigner les gestionnaires principaux aux lots (manager_id)
          // TEMPORAIRE : Système de gestionnaires principaux désactivé (utilise maintenant lot_contacts)
          const lotManagerUpdates = []
          console.log("📝 Note: Principal manager assignment via manager_id is disabled (now using lot_contacts)")

          const managerUpdateResults = await Promise.all(lotManagerUpdates.map(fn => fn()))
          const successfulManagerUpdates = managerUpdateResults.filter(result => result !== null)
          
          console.log("✅ Principal lot managers set:", {
            count: successfulManagerUpdates.length
          })
          
          // Deuxième passe : créer toutes les assignations lot-contact (y compris gestionnaires)
          const assignmentPromises = data.lotContactAssignments.flatMap(lotAssignment => 
            lotAssignment.assignments.map(async (assignment, index) => {
              const targetLot = lots[lotAssignment.lotIndex]
              if (!targetLot) {
                console.warn(`⚠️ Lot index ${lotAssignment.lotIndex} not found, skipping assignment`)
                return null
              }

              console.log(`📝 Assigning contact ${assignment.contactId} to lot ${targetLot.reference}:`, {
                lotId: targetLot.id,
                contactId: assignment.contactId,
                isPrimary: assignment.isPrimary,
                isLotPrincipal: (assignment as any).isLotPrincipal
              })
              
              return contactService.addContactToLot(
                targetLot.id,
                assignment.contactId,
                assignment.isPrimary
              )
            })
          )

          const assignmentResults = await Promise.all(assignmentPromises)
          const successfulAssignments = assignmentResults.filter(result => result !== null)

          console.log("✅ Step 4 completed - Lot-contact assignments created:", {
            assignmentCount: successfulAssignments.length,
            principalManagers: successfulManagerUpdates.length
          })
        }

        return {
          building,
          lots,
          contacts
        }
      } else {
        console.log("⚠️ No contacts to create, skipping contact steps")
        console.log("🎉 Building and lots created successfully!")

        return {
          building,
          lots,
          contacts: []
        }
      }
    } catch (error) {
      console.error('❌ Error in createCompleteProperty:', error)
      console.error('📋 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        data: data
      })
      throw error
    }
  },

  // Get all data for a user's team(s)
  async getUserTeamData(userId: string) {
    try {
      const [teams, buildings, contacts] = await Promise.all([
        teamService.getUserTeams(userId),
        buildingService.getUserBuildings(userId),
        contactService.getUserContacts(userId)
      ])

      return {
        teams,
        buildings,
        contacts
      }
    } catch (error) {
      console.error('Error getting user team data:', error)
      throw error
    }
  }
}
