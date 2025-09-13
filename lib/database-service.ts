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
      console.error('Full error object:', error)
      console.error('Error keys:', Object.keys(error))
      console.error('Error as string:', String(error))
      
      // Essayer de créer un nouvel objet avec les propriétés de l'erreur
      const errorInfo = {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      }
      console.error('Error info object:', errorInfo)
      
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
  }
}

// Building Services
export const buildingService = {
  async getAll() {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        manager:manager_id(name, email, phone),
        team:team_id(id, name, description),
        lots(id, reference, is_occupied, tenant:tenant_id(name, email))
      `)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getTeamBuildings(teamId: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        manager:manager_id(name, email, phone),
        team:team_id(id, name, description),
        lots(id, reference, is_occupied, tenant:tenant_id(name, email))
      `)
      .eq('team_id', teamId)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getUserBuildings(userId: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        manager:manager_id(name, email, phone),
        team:team_id(
          id, 
          name, 
          description,
          team_members!inner(user_id)
        ),
        lots(id, reference, is_occupied, tenant:tenant_id(name, email))
      `)
      .or(`manager_id.eq.${userId},team.team_members.user_id.eq.${userId}`)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select(`
        *,
        manager:manager_id(name, email, phone),
        team:team_id(
          id, 
          name, 
          description,
          team_members(
            id,
            role,
            user:user_id(id, name, email, role)
          )
        ),
        lots(
          *,
          tenant:tenant_id(name, email, phone)
        )
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
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
          manager:manager_id(name, email, phone),
          team:team_id(id, name, description)
        `)
        .single()
      
      if (error) {
        console.error("❌ Building creation error:", error)
        
        // Log de l'erreur
        if (building.team_id && building.manager_id) {
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: building.team_id,
            userId: user.id,
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
          await notificationService.notifyBuildingCreated(data, user.id).catch(notificationError =>
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: user.id,
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
            console.error("Failed to log building update:", logError)
          )

          // Notification de modification
          await notificationService.notifyBuildingUpdated(data, user.id, updates).catch(notificationError =>
            console.error("Failed to send building update notification:", notificationError)
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: user.id,
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
            console.error("Failed to log building deletion:", logError)
          )

          // Notification de suppression
          await notificationService.notifyBuildingDeleted(currentData, user.id).catch(notificationError =>
            console.error("Failed to send building deletion notification:", notificationError)
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
        tenant:tenant_id(name, email, phone)
      `)
      .order('reference')
    
    if (error) throw error
    return data
  },

  async getByBuildingId(buildingId: string) {
    const { data, error } = await supabase
      .from('lots')
      .select(`
        *,
        tenant:tenant_id(name, email, phone)
      `)
      .eq('building_id', buildingId)
      .order('reference')
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('lots')
      .select(`
        *,
        building:building_id(name, address, city),
        tenant:tenant_id(name, email, phone)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
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
        const tenants = contacts.filter((c: any) => c.contact_type === 'locataire' || c.lot_contact_type === 'locataire')
        const syndics = contacts.filter((c: any) => c.contact_type === 'syndic' || c.lot_contact_type === 'syndic')
        const prestataires = contacts.filter((c: any) => c.contact_type === 'prestataire' || c.lot_contact_type === 'prestataire')
        
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: lot.team_id,
            userId: user.id,
            actionType: 'create',
            entityType: 'lot',
            entityId: data.id,
            entityName: data.reference,
            description: `Nouveau lot créé : ${data.reference}`,
            status: 'success',
            metadata: {
              building_id: data.building_id,
              category: data.category,
              surface_area: data.surface_area,
              rooms: data.rooms,
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

          await notificationService.notifyLotCreated(data, building, user.id).catch(notificationError =>
            console.error("Failed to send lot creation notification:", notificationError)
          )
        }
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: user.id,
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
            console.error("Failed to log lot update:", logError)
          )

          // Notification de modification - récupérer les informations du building
          const { data: building } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('id', data.building_id)
            .single()

          await notificationService.notifyLotUpdated(data, building, user.id, updates).catch(notificationError =>
            console.error("Failed to send lot update notification:", notificationError)
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: user.id,
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
            console.error("Failed to log lot deletion:", logError)
          )

          // Notification de suppression - récupérer les informations du building
          const { data: building } = await supabase
            .from('buildings')
            .select('id, name')
            .eq('id', currentData.building_id)
            .single()

          await notificationService.notifyLotDeleted(currentData, building, user.id).catch(notificationError =>
            console.error("Failed to send lot deletion notification:", notificationError)
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
        lot:lot_id(reference, building:building_id(name, address)),
        tenant:tenant_id(name, email, phone),
        manager:manager_id(name, email),
        assigned_contact:assigned_contact_id(name, email, phone)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getByStatus(status: Intervention['status']) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        tenant:tenant_id(name, email, phone),
        manager:manager_id(name, email),
        assigned_contact:assigned_contact_id(name, email, phone)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getByTenantId(tenantId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        manager:manager_id(name, email),
        assigned_contact:assigned_contact_id(name, email, phone)
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getByLotId(lotId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        tenant:tenant_id(name, email, phone),
        manager:manager_id(name, email),
        assigned_contact:assigned_contact_id(name, email, phone)
      `)
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getByProviderId(providerId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        tenant:tenant_id(name, email, phone),
        manager:manager_id(name, email)
      `)
      .eq('assigned_contact_id', providerId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(
          *,
          building:building_id(*)
        ),
        tenant:tenant_id(name, email, phone),
        manager:manager_id(name, email, phone),
        assigned_contact:assigned_contact_id(name, email, phone)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
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

      // Créer des notifications automatiquement
      if (data && data.lot?.building?.team_id && intervention.manager_id) {
        try {
          await notificationService.notifyInterventionCreated({
            interventionId: data.id,
            interventionTitle: data.title || `Intervention ${data.type || ''}`,
            teamId: data.lot.building.team_id,
            createdBy: intervention.manager_id,
            assignedTo: intervention.assigned_contact_id || undefined,
            managerId: intervention.manager_id,
            lotId: data.lot_id,
            lotReference: data.lot?.reference,
            urgency: intervention.urgency === 'urgente' ? 'urgent' : 
                     intervention.urgency === 'haute' ? 'high' : 'normal'
          })
          console.log('✅ Notifications created for new intervention:', data.id)
        } catch (notificationError) {
          console.error('❌ Error creating intervention notifications:', notificationError)
          // Ne pas faire échouer la création de l'intervention pour les notifications
        }
      }
      
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
              changedBy: data.manager_id || currentData.manager_id,
              assignedTo: data.assigned_contact_id || currentData.assigned_contact_id || undefined,
              managerId: data.manager_id || currentData.manager_id,
              lotId: data.lot_id || currentData.lot_id,
              lotReference: data.lot?.reference
            })
            console.log('✅ Status change notifications created for intervention:', data.id)
          }

          // Changement d'assignation
          if (updates.assigned_contact_id && updates.assigned_contact_id !== currentData.assigned_contact_id) {
            // Notifier le nouvel assigné
            if (updates.assigned_contact_id) {
              await notificationService.createNotification({
                userId: updates.assigned_contact_id,
                teamId: data.lot.building.team_id,
                createdBy: data.manager_id || currentData.manager_id,
                type: 'assignment',
                priority: data.urgency === 'urgente' ? 'urgent' : 
                         data.urgency === 'haute' ? 'high' : 'normal',
                title: 'Intervention assignée',
                message: `L'intervention "${data.title || `${data.type || ''}`}"${data.lot?.reference ? ` pour ${data.lot.reference}` : ''} vous a été assignée`,
                metadata: { 
                  intervention_id: data.id,
                  lot_reference: data.lot?.reference,
                  previous_assignee: currentData.assigned_contact_id 
                },
                relatedEntityType: 'intervention',
                relatedEntityId: data.id
              })
            }

            // Notifier l'ancien assigné du changement
            if (currentData.assigned_contact_id && currentData.assigned_contact_id !== updates.assigned_contact_id) {
              await notificationService.createNotification({
                userId: currentData.assigned_contact_id,
                teamId: data.lot.building.team_id,
                createdBy: data.manager_id || currentData.manager_id,
                type: 'assignment',
                priority: 'normal',
                title: 'Intervention réassignée',
                message: `L'intervention "${data.title || `${data.type || ''}`}"${data.lot?.reference ? ` pour ${data.lot.reference}` : ''} a été réassignée à quelqu'un d'autre`,
                metadata: { 
                  intervention_id: data.id,
                  lot_reference: data.lot?.reference,
                  new_assignee: updates.assigned_contact_id 
                },
                relatedEntityType: 'intervention',
                relatedEntityId: data.id
              })
            }
            console.log('✅ Assignment notifications created for intervention:', data.id)
          }
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
        assigned_contact:assigned_contact_id(name, email, phone),
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
    return interventions || []
  },

  // Get interventions with their documents for a lot
  async getInterventionsWithDocumentsByLotId(lotId: string) {
    const { data, error } = await supabase
      .from('interventions')
      .select(`
        *,
        lot:lot_id(reference, building:building_id(name, address)),
        assigned_contact:assigned_contact_id(name, email, phone),
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
    return data || []
  }
}

// Contact Services
export const contactService = {
  async getAll() {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contacts')
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
      .from('contacts')
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .eq('speciality', speciality)
      .order('name')
    
    if (error) throw error
    return data
  },

  async getTeamContacts(teamId: string) {
    console.log("📞 getTeamContacts called with teamId:", teamId)
    
    // Essayer d'abord avec le filtre team_id
    let { data, error } = await supabase
      .from('contacts')
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
        .from('contacts')
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
    return data || []
  },

  // Nouvelle méthode pour récupérer les contacts d'un bâtiment entier
  async getBuildingContacts(buildingId: string, contactType?: string) {
    console.log("🏢 getBuildingContacts called with buildingId:", buildingId, "contactType:", contactType)
    
    try {
      const { data, error } = await supabase
        .from('building_contacts')
        .select(`
          contact:contact_id (
            id,
            name,
            email,
            phone,
            company,
            contact_type,
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
        .map((item: any) => item.contact)
        .filter((contact: any) => contact && contact.is_active !== false)

      // Filtrer par type de contact si spécifié
      if (contactType) {
        contacts = contacts.filter((contact: any) => contact?.contact_type === contactType)
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
      const managers = data
        ?.filter((member: any) => member.user?.role === 'gestionnaire')
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

  async getLotContacts(lotId: string, contactType?: Database['public']['Enums']['contact_type']) {
    console.log("🏠 getLotContacts called with lotId:", lotId, "contactType:", contactType)
    
    try {
      // Use the new lot_contacts table directly
      let query = supabase
        .from('lot_contacts')
        .select(`
          contact:contact_id (
            id,
            name,
            email,
            phone,
            company,
            speciality,
            contact_type,
            address,
            notes,
            is_active,
            team:team_id(id, name, description)
          ),
          contact_type,
          is_primary,
          start_date,
          end_date,
          notes
        `)
        .eq('lot_id', lotId)
        .is('end_date', null) // Only active contacts

      // Filter by contact type if specified
      if (contactType) {
        query = query.eq('contact_type', contactType)
      }

      const { data, error } = await query.order('is_primary', { ascending: false })
      
      if (error) {
        console.error("❌ Error getting lot contacts:", error)
        // Si la table lot_contacts n'existe pas ou est vide, utiliser l'ancienne méthode
        if (error.code === 'PGRST116' || error.message?.includes('lot_contacts')) {
          console.log("📝 Falling back to building contacts method...")
          return this.getLotContactsLegacy(lotId, contactType)
        }
        throw error
      }

      // Extract contacts from the relationship and add lot_contact metadata
      const contacts = data?.map((item: any) => ({
        ...item.contact,
        lot_contact_type: item.contact_type,
        is_primary_for_lot: item.is_primary,
        lot_start_date: item.start_date,
        lot_notes: item.notes
      })).filter(Boolean) || []
      
      console.log("✅ Found lot contacts via lot_contacts:", contacts.length)
      return contacts

    } catch (error) {
      console.error("🚨 Unexpected error in getLotContacts:", error)
      // En cas d'erreur inattendue, essayer la méthode legacy puis retourner un tableau vide
      try {
        return this.getLotContactsLegacy(lotId, contactType)
      } catch (legacyError) {
        console.error("❌ Legacy method also failed:", legacyError)
        return []
      }
    }
  },

  // Legacy method as fallback
  async getLotContactsLegacy(lotId: string, contactType?: Database['public']['Enums']['contact_type']) {
    console.log("🏠 getLotContactsLegacy called with lotId:", lotId)
    
    try {
      // First get the building ID from the lot
      console.log("📋 Step 1: Getting lot data...")
      const { data: lot, error: lotError } = await supabase
        .from('lots')
        .select('building_id')
        .eq('id', lotId)
        .single()
      
      if (lotError) {
        console.error("❌ Error getting lot:", lotError)
        if (lotError.code === 'PGRST116') {
          console.log("📝 Lot not found, returning empty array")
          return []
        }
        throw lotError
      }

      if (!lot?.building_id) {
        console.log("⚠️ No building found for lot, returning empty array")
        return []
      }

      console.log("🏢 Step 2: Getting contacts for building:", lot.building_id)

      const { data, error } = await supabase
        .from('building_contacts')
        .select(`
          contact:contact_id (
            id,
            name,
            email,
            phone,
            company,
            speciality,
            contact_type,
            address,
            notes,
            is_active,
            team:team_id(id, name, description)
          )
        `)
        .eq('building_id', lot.building_id)

      if (error) {
        console.error("❌ Error getting building contacts:", error)
        if (error.code === 'PGRST116') {
          console.log("📝 No building_contacts found, returning empty array")
          return []
        }
        throw error
      }

      // Extract contacts and filter by type if specified
      let contacts = data?.map(item => item.contact).filter(Boolean) || []
      
      if (contactType) {
        contacts = contacts.filter(contact => contact?.contact_type === contactType)
      }
      
      console.log("✅ Found lot contacts via building_contacts:", contacts.length)
      return contacts

    } catch (error) {
      console.error("🚨 Unexpected error in getLotContactsLegacy:", error)
      return []
    }
  },

  // Get contacts by specific type for a lot
  async getLotContactsByType(lotId: string, contactType: Database['public']['Enums']['contact_type']) {
    return this.getLotContacts(lotId, contactType)
  },

  // Get active tenants for a lot
  async getLotTenants(lotId: string) {
    return this.getLotContactsByType(lotId, 'locataire')
  },

  // Count active tenants for a lot
  async countLotTenants(lotId: string) {
    const tenants = await this.getLotTenants(lotId)
    return tenants.length
  },

  // Add a contact to a lot
  async addContactToLot(lotId: string, contactId: string, contactType: Database['public']['Enums']['contact_type'], isPrimary: boolean = false, notes?: string) {
    console.log("🔗 Adding contact to lot:", { lotId, contactId, contactType, isPrimary })
    
    try {
      const { data, error } = await supabase.rpc('add_contact_to_lot', {
        p_lot_id: lotId,
        p_contact_id: contactId,
        p_contact_type: contactType,
        p_is_primary: isPrimary,
        p_notes: notes
      })
      
      if (error) throw error
      console.log("✅ Contact added to lot successfully")
      return data
      
    } catch (error) {
      console.error("❌ Error adding contact to lot:", error)
      throw error
    }
  },

  // Remove a contact from a lot
  async removeContactFromLot(lotId: string, contactId: string, contactType: Database['public']['Enums']['contact_type']) {
    console.log("🗑️ Removing contact from lot:", { lotId, contactId, contactType })
    
    try {
      const { data, error } = await supabase.rpc('remove_contact_from_lot', {
        p_lot_id: lotId,
        p_contact_id: contactId,
        p_contact_type: contactType
      })
      
      if (error) throw error
      console.log("✅ Contact removed from lot successfully")
      return data
      
    } catch (error) {
      console.error("❌ Error removing contact from lot:", error)
      throw error
    }
  },


  async create(contact: any) {
    console.log('🗃️ [CONTACT-SERVICE] Creating contact:', contact.name, contact.email)
    console.log('📋 [CONTACT-SERVICE] Contact data to insert:', JSON.stringify(contact, null, 2))
    
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
          .from('contacts')
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
      
      // Validation des valeurs enum
      console.log('🔍 [CONTACT-SERVICE] Starting enum validation...')
      const validContactTypes = ['locataire', 'prestataire', 'gestionnaire', 'syndic', 'notaire', 'assurance', 'autre']
      const validInterventionTypes = ['plomberie', 'electricite', 'chauffage', 'serrurerie', 'peinture', 'menage', 'jardinage', 'autre']
      
      if (contact.contact_type && !validContactTypes.includes(contact.contact_type)) {
        console.error('❌ [CONTACT-SERVICE] Invalid contact_type:', contact.contact_type)
        throw new Error(`Invalid contact_type: ${contact.contact_type}. Must be one of: ${validContactTypes.join(', ')}`)
      }
      
      if (contact.speciality && !validInterventionTypes.includes(contact.speciality)) {
        console.error('❌ [CONTACT-SERVICE] Invalid speciality:', contact.speciality)
        throw new Error(`Invalid speciality: ${contact.speciality}. Must be one of: ${validInterventionTypes.join(', ')}`)
      }
      
      console.log('✅ [CONTACT-SERVICE] Enum validation passed')
      console.log('⚡ [CONTACT-SERVICE] Starting insert...')
      console.time('contact-insert')
      
      // Créer un timeout pour détecter les blocages
      const insertPromise = supabase
        .from('contacts')
        .insert(contact)
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: contact.team_id,
            userId: user.id,
            actionType: 'create',
            entityType: 'contact',
            entityId: data.id,
            entityName: data.name,
            description: `Nouveau contact créé : ${data.name}`,
            status: 'success',
            metadata: {
              email: data.email,
              contact_type: data.contact_type,
              company: data.company,
              speciality: data.speciality
            }
          }).catch(logError => 
            console.error("Failed to log contact creation:", logError)
          )

          // Notification de création
          await notificationService.notifyContactCreated(data, user.id).catch(notificationError =>
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
        .from('contacts')
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
        .from('contacts')
        .select('id, name, email, team_id, contact_type')
        .eq('id', id)
        .single()

      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error("❌ Contact update error:", error)
        
        // Log de l'erreur
        if (currentData?.team_id) {
          await activityLogger.logError(
            'update',
            'contact',
            currentData.name || 'Contact',
            error.message || 'Erreur lors de la modification',
            { updates, contact_id: id, error: error }
          ).catch(logError => 
            console.error("Failed to log contact update error:", logError)
          )
        }
        
        throw error
      }
      
      // Log de succès et notification
      if (data && currentData?.team_id) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: user.id,
            actionType: 'update',
            entityType: 'contact',
            entityId: data.id,
            entityName: data.name || currentData.name,
            description: `Contact modifié : ${data.name || currentData.name}`,
            status: 'success',
            metadata: {
              changes: updates,
              previous_name: currentData.name,
              contact_type: data.contact_type || currentData.contact_type
            }
          }).catch(logError => 
            console.error("Failed to log contact update:", logError)
          )

          // Notification de modification
          await notificationService.notifyContactUpdated(data, user.id, updates).catch(notificationError =>
            console.error("Failed to send contact update notification:", notificationError)
          )
        }
      }
      
      return data
    } catch (error) {
      console.error("❌ contactService.update error:", error)
      throw error
    }
  },

  async delete(id: string) {
    try {
      // Récupérer les données actuelles pour le log avant suppression
      const { data: currentData } = await supabase
        .from('contacts')
        .select('id, name, email, team_id, contact_type, company')
        .eq('id', id)
        .single()

      const { error } = await supabase
        .from('contacts')
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
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          // Log d'activité avec contexte explicite
          await activityLogger.log({
            teamId: currentData.team_id,
            userId: user.id,
            actionType: 'delete',
            entityType: 'contact',
            entityId: id,
            entityName: currentData.name || 'Contact supprimé',
            description: `Contact supprimé : ${currentData.name || 'Contact supprimé'}`,
            status: 'success',
            metadata: {
              email: currentData.email,
              contact_type: currentData.contact_type,
              company: currentData.company,
              deleted_at: new Date().toISOString()
            }
          }).catch(logError => 
            console.error("Failed to log contact deletion:", logError)
          )

          // Notification de suppression
          await notificationService.notifyContactDeleted(currentData, user.id).catch(notificationError =>
            console.error("Failed to send contact deletion notification:", notificationError)
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
        // Vérifier l'état de la connexion avant la requête
        if (!connectionManager.isConnected()) {
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
    const { error } = await (supabase as any)
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)
    
    if (error) throw error
    return true
  },

  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member') {
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
    console.log("🔍 Checking team status for user:", userId)
    
    try {
      // 1. Récupérer les informations de l'utilisateur
      const user = await userService.getById(userId)
      console.log("👤 User found:", user.name, user.role)
      
      // 2. Vérifier si l'utilisateur a déjà une équipe
      const existingTeams = await this.getUserTeams(userId)
      
      if (existingTeams.length > 0) {
        console.log("✅ User already has team(s):", existingTeams.length)
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
      
      // 2. Get buildings for this team
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select(`
          *,
          manager:manager_id(id, name, email)
        `)
        .eq('team_id', team.id)
      
      if (buildingsError) {
        console.error("❌ Error fetching buildings:", buildingsError)
        throw buildingsError
      }
      
      console.log("🏗️ Found buildings:", buildings?.length || 0)
      
      // 3. Get lots for these buildings with contact information
      const buildingIds = buildings?.map(b => b.id) || []
      let lots: any[] = []
      
      if (buildingIds.length > 0) {
        const { data: lotsData, error: lotsError } = await supabase
          .from('lots')
          .select(`
            *,
            building:building_id(id, name, address),
            tenant:tenant_id(name, email, phone)
          `)
          .in('building_id', buildingIds)
        
        if (lotsError) {
          console.error("❌ Error fetching lots:", lotsError)
          throw lotsError
        }
        
        // Enrichir les lots avec les informations de contacts depuis lot_contacts
        const enrichedLots = await Promise.all((lotsData || []).map(async (lot) => {
          try {
            // Récupérer les contacts locataires actifs pour ce lot
            const { data: lotContacts, error: contactsError } = await supabase
              .from('lot_contacts')
              .select(`
                contact:contact_id (
                  id,
                  name,
                  email,
                  phone
                ),
                contact_type,
                is_primary
              `)
              .eq('lot_id', lot.id)
              .eq('contact_type', 'locataire')
              .is('end_date', null) // Seulement les contacts actifs
              .order('is_primary', { ascending: false })
            
            if (contactsError) {
              console.warn("⚠️ Error fetching contacts for lot", lot.id, contactsError)
              return lot
            }
            
            // Enrichir le lot avec les informations de contact
            const primaryTenant = lotContacts?.[0]?.contact || null
            return {
              ...lot,
              // Maintenir la compatibilité avec l'ancien système
              tenant_id: primaryTenant?.id || lot.tenant_id,
              tenant: primaryTenant || lot.tenant,
              // Ajouter les nouvelles informations
              lot_tenants: lotContacts || [],
              has_active_tenants: (lotContacts || []).length > 0
            }
          } catch (error) {
            console.warn("⚠️ Error enriching lot", lot.id, error)
            return lot
          }
        }))
        
        lots = enrichedLots
        console.log("🏠 Found lots with contacts:", lots.length)
      }
      
      // 4. Get contacts for this team
      const contacts = await contactService.getTeamContacts(team.id)
      console.log("👥 Found contacts:", contacts?.length || 0)
      
      // 5. Get ALL interventions for this team (much simpler!)
      const { data: interventions, error: interventionsError } = await supabase
        .from('interventions')
        .select(`
          *,
          lot:lot_id(id, reference, building:building_id(name, address)),
          building:building_id(id, name, address),
          assigned_contact:assigned_contact_id(name, email)
        `)
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
      
      if (interventionsError) {
        console.error("❌ Error fetching team interventions:", interventionsError)
        throw interventionsError
      }
      
      console.log("🔧 Found team interventions:", interventions?.length || 0)
      
      // 6. Format buildings with embedded lots for PropertySelector
      const formattedBuildings = buildings?.map(building => {
        const buildingLots = lots.filter(lot => lot.building_id === building.id)
        const buildingInterventions = (interventions || []).filter(intervention => 
          intervention.building_id === building.id || 
          buildingLots.some(lot => lot.id === intervention.lot_id)
        )
        
        return {
          ...building,
          lots: buildingLots.map(lot => ({
            ...lot,
            status: (lot.has_active_tenants || lot.tenant_id) ? 'occupied' : 'vacant',
            tenant: lot.tenant?.name || null,
            interventions: (interventions || []).filter(i => i.lot_id === lot.id).length
          })),
          interventions: buildingInterventions.length
        }
      }) || []
      
      // 7. Calculate stats
      const occupiedLotsCount = lots.filter(lot => lot.has_active_tenants || lot.tenant_id).length
      const occupancyRate = lots.length > 0 ? Math.round((occupiedLotsCount / lots.length) * 100) : 0
      
      const stats = {
        buildingsCount: buildings?.length || 0,
        lotsCount: lots.length,
        occupiedLotsCount,
        occupancyRate,
        contactsCount: contacts?.length || 0,
        interventionsCount: interventions?.length || 0
      }
      
      console.log("📊 Final stats:", stats)
      
      const result = {
        buildings: formattedBuildings,
        lots,
        contacts: contacts || [],
        interventions: interventions || [],
        stats,
        team
      }
      
      // Mettre en cache le résultat final
      this._statsCache.set(cacheKey, { data: result, timestamp: now })
      
      return result
      
    } catch (error) {
      console.error("❌ Error in getManagerStats:", error)
      
      // En cas d'erreur, essayer de retourner des données en cache si disponibles
      const cached = this._statsCache.get(cacheKey)
      if (cached) {
        console.log("⚠️ Error occurred, returning stale cached data")
        return cached.data
      }
      
      throw error
    }
  },
  
  // Méthode pour vider le cache des stats
  clearStatsCache(userId?: string) {
    if (userId) {
      this._statsCache.delete(`stats_${userId}`)
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
      console.log('🚀 [CONTACT-INVITATION-SERVICE] Starting with data:', contactData)
      
       // 1. Créer le contact dans la base de données
       const contactToCreate = {
         name: `${contactData.firstName} ${contactData.lastName}`,
         first_name: contactData.firstName,
         last_name: contactData.lastName,
         email: contactData.email,
         phone: contactData.phone || null,
         address: contactData.address || null,
         notes: contactData.notes || null,
         contact_type: contactData.type as Database['public']['Enums']['contact_type'], // Type de contact (locataire, prestataire, etc.)
         speciality: (contactData.speciality && contactData.speciality.trim()) ? 
           contactData.speciality as Database['public']['Enums']['intervention_type'] : null, // Spécialité technique (plomberie, etc.)
         team_id: contactData.teamId,
         is_active: true // Explicitement définir comme actif
       }

      console.log('📝 [CONTACT-INVITATION-SERVICE] Prepared object for DB:', contactToCreate)
      
      console.log('🔄 [CONTACT-INVITATION-SERVICE] Calling contactService.create...')
      let newContact;
      
      try {
        newContact = await contactService.create(contactToCreate)
        console.log('✅ [CONTACT-INVITATION-SERVICE] Contact creation completed via direct service:', newContact)
      } catch (directError) {
        console.warn('⚠️ [CONTACT-INVITATION-SERVICE] Direct service failed, trying API route fallback:', directError instanceof Error ? directError.message : 'Unknown error')
        
        // FALLBACK: Utiliser l'API route qui bypass les problèmes côté client
        try {
          console.log('🔄 [CONTACT-INVITATION-SERVICE] Trying API route fallback...')
          
          const response = await fetch('/api/create-contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(contactToCreate)
          })
          
          const result = await response.json()
          
          if (!response.ok || !result.success) {
            throw new Error(result.error || `API returned ${response.status}`)
          }
          
          newContact = result.contact
          console.log('✅ [CONTACT-INVITATION-SERVICE] Contact creation completed via API fallback:', newContact)
          
        } catch (apiError) {
          console.error('❌ [CONTACT-INVITATION-SERVICE] Both direct service and API fallback failed:', apiError)
          throw directError // Throw the original error
        }
      }
      
      let invitationResult = null
      
      // 2. Si invitation requise et que le type le permet
      if (contactData.inviteToApp && contactData.email && ['gestionnaire', 'locataire', 'prestataire'].includes(contactData.type)) {
        
        // Importer dynamiquement pour éviter les dépendances circulaires
        const { authService } = await import('./auth-service')
        
        // Déterminer le rôle utilisateur basé sur le type de contact
        let userRole: Database['public']['Enums']['user_role'] = 'locataire'
        if (contactData.type === 'gestionnaire') {
          userRole = 'gestionnaire'
        } else if (contactData.type === 'prestataire') {
          userRole = 'prestataire'
        }
        
        try {
          invitationResult = await authService.inviteUser({
            email: contactData.email,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            phone: contactData.phone,
            role: userRole,
            teamId: contactData.teamId
          })
          
          // Si l'invitation a réussi, créer l'enregistrement d'invitation avec le contact associé
          if (invitationResult.success && invitationResult.userId && newContact.id) {
            try {
              // Générer un token unique pour cette invitation
              const generateUniqueToken = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                let result = ''
                for (let i = 0; i < 20; i++) {
                  result += chars.charAt(Math.floor(Math.random() * chars.length))
                }
                return result
              }

              const invitationToken = generateUniqueToken()
              console.log('🔑 [CONTACT-INVITATION-SERVICE] Generated token for contact invitation:', invitationToken)

              const { error: invitationRecordError } = await supabase
                .from('user_invitations')
                .upsert({
                  user_id: invitationResult.userId,
                  contact_id: newContact.id,
                  team_id: contactData.teamId,
                  email: contactData.email,
                  role: userRole,
                  status: 'pending',
                  magic_link_token: invitationToken
                })
              
              if (invitationRecordError) {
                console.error('⚠️ [CONTACT-INVITATION-SERVICE] Failed to create invitation record:', invitationRecordError)
              } else {
                console.log('✅ [CONTACT-INVITATION-SERVICE] Invitation record created for contact with token:', newContact.id)
              }
            } catch (recordError) {
              console.error('⚠️ [CONTACT-INVITATION-SERVICE] Error creating invitation record:', recordError)
            }
          }
          
          // Les logs sont gérés dans la page qui appelle ce service
        } catch (inviteError) {
          invitationResult = { 
            success: false, 
            error: 'Service d\'invitation temporairement indisponible'
          }
        }
      }
      
      return {
        contact: newContact,
        invitation: invitationResult
      }
      
    } catch (error) {
      console.error('❌ [CONTACT-INVITATION-SERVICE] Error:', error)
      console.error('❌ [CONTACT-INVITATION-SERVICE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        contactData: contactData
      })
      throw error
    }
  },

  // Récupérer les invitations en attente pour une équipe
  async getPendingInvitations(teamId: string) {
    try {
      console.log('📧 [INVITATION-SERVICE] Getting pending invitations for team:', teamId)
      
      // 1. Récupérer toutes les invitations en statut 'pending' pour cette équipe
      const { data: pendingInvitations, error: invitationsError } = await supabase
        .from('user_invitations')
        .select(`
          id,
          user_id,
          contact_id,
          email,
          role,
          status,
          invited_at,
          expires_at,
          users!user_invitations_user_id_fkey (
            id,
            name,
            first_name,
            last_name,
            email,
            created_at
          ),
          contacts!user_invitations_contact_id_fkey (
            id,
            name,
            first_name,
            last_name,
            email,
            contact_type,
            company,
            speciality,
            created_at
          )
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString()) // Pas encore expirées
        .order('invited_at', { ascending: false })
      
      if (invitationsError) {
        console.error('❌ [INVITATION-SERVICE] Error fetching pending invitations:', invitationsError)
        throw invitationsError
      }

      if (!pendingInvitations || pendingInvitations.length === 0) {
        console.log('📧 [INVITATION-SERVICE] No pending invitations found for team')
        return []
      }

      console.log(`📧 [INVITATION-SERVICE] Found ${pendingInvitations.length} pending invitations`)

      // 2. Transformer les données pour correspondre au format attendu
      const formattedInvitations = pendingInvitations.map(invitation => {
        // Si il y a un contact associé, utiliser ses données, sinon utiliser les données de l'invitation
        const contactData = invitation.contacts || {
          id: invitation.user_id, // Utiliser l'user_id comme fallback
          name: invitation.users?.name || 'Utilisateur invité',
          first_name: invitation.users?.first_name || '',
          last_name: invitation.users?.last_name || '',
          email: invitation.email,
          contact_type: invitation.role, // Mapper le rôle vers le type de contact
          company: null,
          speciality: null,
          created_at: invitation.invited_at
        }

        console.log(`📋 [INVITATION-SERVICE] Processing invitation for ${invitation.email}`)

        return {
          ...contactData,
          invitation_id: invitation.id,
          invitation_status: invitation.status,
          invited_at: invitation.invited_at,
          expires_at: invitation.expires_at,
          user_info: invitation.users
        }
      })

      console.log('✅ [INVITATION-SERVICE] Found pending invitations:', formattedInvitations.length)
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
  async resendInvitation(contactId: string) {
    try {
      console.log('🔄 [INVITATION-SERVICE] Resending invitation for contact:', contactId)
      
      // 1. Récupérer les informations du contact
      const contact = await contactService.getById(contactId)
      if (!contact) {
        throw new Error('Contact non trouvé')
      }

      if (!contact.email) {
        throw new Error('Contact invalide - email manquant')
      }

      // 2. Vérifier qu'il y a bien un utilisateur associé
      const user = await userService.getByEmail(contact.email)
      if (!user) {
        throw new Error('Aucun utilisateur trouvé pour renvoyer l\'invitation')
      }

      console.log('👤 [INVITATION-SERVICE] Found existing user:', user.id, 'for email:', contact.email)

      // 3. Appeler l'API invite-user en mode renvoi pour générer un nouveau magic link
      console.log('📧 [INVITATION-SERVICE] Calling API to generate new magic link')
      const response = await fetch('/api/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: contact.email,
          role: user.role,
          isResend: true // Paramètre pour indiquer que c'est un renvoi
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        console.error('❌ [INVITATION-SERVICE] API error:', result.error)
        throw new Error(result.error || `API returned ${response.status}`)
      }

      console.log('✅ [INVITATION-SERVICE] Magic link generated successfully')
      
      return { 
        success: true, 
        userId: user.id,
        message: result.message,
        magicLink: result.magicLink // Le vrai magic link généré par Supabase (avec invitation_id dans l'URL)
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

// Helper function to map frontend contact types to database enum values
export const mapContactTypeToDatabase = (frontendType: string): Database['public']['Enums']['contact_type'] => {
  const typeMapping: Record<string, Database['public']['Enums']['contact_type']> = {
    'tenant': 'locataire',
    'provider': 'prestataire', 
    'syndic': 'syndic',
    'notary': 'notaire',
    'insurance': 'assurance',
    'other': 'autre',
    // Support des types database aussi (au cas où)
    'locataire': 'locataire',
    'prestataire': 'prestataire',
    'gestionnaire': 'gestionnaire',
    'notaire': 'notaire',
    'assurance': 'assurance',
    'autre': 'autre'
  }
  
  const mappedType = typeMapping[frontendType]
  if (!mappedType) {
    console.error('❌ Unknown contact type for mapping:', frontendType)
    console.error('📋 Available mappings:', Object.keys(typeMapping))
    throw new Error(`Unknown contact type: ${frontendType}`)
  }
  
  console.log(`🔄 Mapped contact type: ${frontendType} → ${mappedType}`)
  return mappedType
}

// Tenant Services
export const tenantService = {
  // Helper method to get contact_id from user_id
  async getUserContactId(userId: string): Promise<string | null> {
    console.log("🔗 getUserContactId called for userId:", userId)
    
    try {
      const { data: userInvitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('contact_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (invitationError) {
        console.error("❌ Error getting user invitation:", invitationError)
        throw invitationError
      }

      const contactId = userInvitation?.contact_id || null
      console.log("✅ Found contact_id for user:", contactId)
      return contactId
    } catch (error) {
      console.error("❌ Error in getUserContactId:", error)
      throw error
    }
  },

  async getTenantData(userId: string) {
    console.log("👤 getTenantData called for userId:", userId)
    
    try {
      // First, get the contact_id linked to this user
      const { data: userInvitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('contact_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (invitationError) {
        console.error("❌ Error getting user invitation:", invitationError)
        throw invitationError
      }

      if (!userInvitation?.contact_id) {
        console.log("❌ No contact found for user:", userId)
        return null
      }

      const contactId = userInvitation.contact_id
      console.log("✅ Found contact_id for user:", contactId)

      // Then get lots linked to this contact via lot_contacts where contact_type is 'locataire'
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
          contact_type,
          is_primary,
          start_date,
          end_date
        `)
        .eq('contact_id', contactId)
        .eq('contact_type', 'locataire')
        .is('end_date', null) // Only active relations
        .order('is_primary', { ascending: false }) // Primary contacts first

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      if (!lotContacts || lotContacts.length === 0) {
        console.log("❌ No lot found for contact:", contactId)
        return null
      }

      // Take the first lot (primary if available, or first active one)
      const primaryLotContact = lotContacts[0]
      const lot = primaryLotContact.lot

      console.log("✅ Found tenant lot via lot_contacts:", lot)
      return lot
    } catch (error) {
      console.error("❌ Error in getTenantData:", error)
      throw error
    }
  },

  async getAllTenantLots(userId: string) {
    console.log("🏠 getAllTenantLots called for userId:", userId)
    
    try {
      // First, get the contact_id linked to this user
      const { data: userInvitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('contact_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (invitationError) {
        console.error("❌ Error getting user invitation:", invitationError)
        throw invitationError
      }

      if (!userInvitation?.contact_id) {
        console.log("❌ No contact found for user:", userId)
        return []
      }

      const contactId = userInvitation.contact_id
      console.log("✅ Found contact_id for user:", contactId)

      // Get all lots linked to this contact via lot_contacts where contact_type is 'locataire'
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
          contact_type,
          is_primary,
          start_date,
          end_date
        `)
        .eq('contact_id', contactId)
        .eq('contact_type', 'locataire')
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
      // First, get the contact_id linked to this user
      const { data: userInvitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('contact_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (invitationError) {
        console.error("❌ Error getting user invitation:", invitationError)
        throw invitationError
      }

      if (!userInvitation?.contact_id) {
        console.log("❌ No contact found for user:", userId)
        return []
      }

      const contactId = userInvitation.contact_id
      console.log("✅ Found contact_id for user:", contactId)

      // Then get all lot IDs where this contact is a tenant
      const { data: lotContacts, error: lotContactsError } = await supabase
        .from('lot_contacts')
        .select('lot_id')
        .eq('contact_id', contactId)
        .eq('contact_type', 'locataire')
        .is('end_date', null) // Only active relations

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      const lotIds = lotContacts?.map(lc => lc.lot_id).filter(Boolean) || []
      
      if (lotIds.length === 0) {
        console.log("❌ No lots found for contact:", contactId)
        return []
      }

      // Finally get interventions for those lots
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          lot:lot_id(
            reference,
            building:building_id(name)
          ),
          assigned_contact:assigned_contact_id(name, phone, email)
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
      // First, get the contact_id linked to this user
      const { data: userInvitation, error: invitationError } = await supabase
        .from('user_invitations')
        .select('contact_id')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .single()

      if (invitationError) {
        console.error("❌ Error getting user invitation:", invitationError)
        throw invitationError
      }

      if (!userInvitation?.contact_id) {
        console.log("❌ No contact found for user:", userId)
        return {
          openRequests: 0,
          inProgress: 0,
          thisMonthInterventions: 0,
          documentsCount: 0,
          nextPaymentDate: 15
        }
      }

      const contactId = userInvitation.contact_id
      console.log("✅ Found contact_id for user:", contactId)

      // Then get all lot IDs where this contact is a tenant
      const { data: lotContacts, error: lotContactsError } = await supabase
        .from('lot_contacts')
        .select('lot_id')
        .eq('contact_id', contactId)
        .eq('contact_type', 'locataire')
        .is('end_date', null) // Only active relations

      if (lotContactsError) {
        console.error("❌ Error getting tenant lot contacts:", lotContactsError)
        throw lotContactsError
      }

      const lotIds = lotContacts?.map(lc => lc.lot_id).filter(Boolean) || []
      
      if (lotIds.length === 0) {
        console.log("❌ No lots found for contact:", contactId)
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
        ['nouvelle_demande', 'en_attente_validation', 'validee', 'en_cours'].includes(i.status)
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
      manager_id: string
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
      manager_id: string
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
          const lotManagerUpdates = data.lotContactAssignments.flatMap(lotAssignment => {
            const principalManagerAssignments = lotAssignment.assignments.filter(
              assignment => assignment.contactType === 'gestionnaire' && (assignment as any).isLotPrincipal === true
            )
            
            if (principalManagerAssignments.length > 0) {
              const targetLot = lots[lotAssignment.lotIndex]
              if (targetLot) {
                const principalManager = principalManagerAssignments[0]
                console.log(`📝 Setting principal manager ${principalManager.contactId} for lot ${targetLot.reference}`)
                
                return [async () => {
                  try {
                    await lotService.update(targetLot.id, {
                      manager_id: principalManager.contactId
                    })
                    console.log(`✅ Principal manager set for lot ${targetLot.reference}`)
                    return { lotId: targetLot.id, managerId: principalManager.contactId }
                  } catch (error) {
                    console.error(`❌ Error setting principal manager for lot ${targetLot.reference}:`, error)
                    return null
                  }
                }]
              }
            }
            return []
          })

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

              console.log(`📝 Assigning contact ${assignment.contactId} (${assignment.contactType}) to lot ${targetLot.reference}:`, {
                lotId: targetLot.id,
                contactId: assignment.contactId,
                contactType: assignment.contactType,
                isPrimary: assignment.isPrimary,
                isLotPrincipal: (assignment as any).isLotPrincipal
              })

              // ✅ CORRECTION: Mapper le type frontend vers le type database
              const databaseContactType = mapContactTypeToDatabase(assignment.contactType)
              
              return contactService.addContactToLot(
                targetLot.id,
                assignment.contactId,
                databaseContactType,
                assignment.isPrimary,
                `Assigné lors de la création du bâtiment${(assignment as any).isLotPrincipal ? ' (gestionnaire principal)' : ''}`
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
