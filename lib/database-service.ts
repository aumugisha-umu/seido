import { supabase } from './supabase'
import type { Database } from './database.types'

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
    console.log('🔍 Getting user by ID:', id)
    
    // Validate input
    if (!id) {
      const error = new Error('User ID is required')
      console.error('❌ Database error in getById: Missing user ID')
      throw error
    }
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('❌ Database error in getById:', {
          message: error.message || 'Unknown error',
          code: error.code || 'NO_CODE',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          userId: id,
          errorName: error.name || 'Unknown error name',
          fullError: JSON.stringify(error, null, 2)
        })
        throw error
      }
      
      if (!data) {
        const notFoundError = new Error(`User not found with ID: ${id}`)
        console.error('❌ User not found:', { userId: id })
        throw notFoundError
      }
      
      console.log('✅ User found:', data?.name || 'Unknown name')
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
        throw error
      }
      
      console.log("✅ Building created in database:", data)
      return data
    } catch (error) {
      console.error("❌ buildingService.create error:", error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['buildings']['Update']) {
    const { data, error } = await supabase
      .from('buildings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
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
        throw error
      }
      
      console.log("✅ Lot created in database:", data)
      return data
    } catch (error) {
      console.error("❌ lotService.create error:", error)
      throw error
    }
  },

  async update(id: string, updates: Database['public']['Tables']['lots']['Update']) {
    const { data, error } = await supabase
      .from('lots')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('lots')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
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
    const { data, error } = await supabase
      .from('interventions')
      .insert(intervention)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, updates: Database['public']['Tables']['interventions']['Update']) {
    const { data, error } = await supabase
      .from('interventions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('interventions')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
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

  async create(contact: any) {
    const { data, error } = await (supabase as any)
      .from('contacts')
      .insert(contact)
      .select(`
        *,
        team:team_id(id, name, description)
      `)
      .single()
    
    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
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

  async getUserTeams(userId: string) {
    console.log("👥 teamService.getUserTeams called with userId:", userId)
    
    try {
      // Première tentative : requête complexe avec jointures
      console.log("📡 Attempting complex teams query...")
      
      let { data, error } = await (supabase as any)
        .from('teams')
        .select(`
          *,
          created_by_user:created_by(name, email),
          team_members!inner(
            id,
            role,
            joined_at
          )
        `)
        .eq('team_members.user_id', userId)
        .order('name')
      
      console.log("📊 Complex query result:", { data, error })
      
      // Si erreur, essayer une requête simplifiée
      if (error) {
        console.log("⚠️ Complex query failed, trying simple query...")
        
        // 1. D'abord récupérer les IDs des équipes de l'utilisateur
        const { data: memberData, error: memberError } = await (supabase as any)
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', userId)
        
        console.log("📊 Team members query:", { memberData, memberError })
        
        if (memberError) {
          console.error("❌ Team members query error:", memberError)
          throw memberError
        }
        
        if (!memberData || memberData.length === 0) {
          console.log("ℹ️ User is not member of any team")
          return []
        }
        
        // 2. Ensuite récupérer les détails des équipes
        const teamIds = memberData.map((m: any) => m.team_id)
        console.log("📝 Found team IDs:", teamIds)
        
        const { data: teamsData, error: teamsError } = await (supabase as any)
          .from('teams')
          .select('*')
          .in('id', teamIds)
          .order('name')
        
        console.log("📊 Teams details query:", { teamsData, teamsError })
        
        if (teamsError) {
          console.error("❌ Teams details query error:", teamsError)
          throw teamsError
        }
        
        // Combiner les données
        data = teamsData?.map((team: any) => ({
          ...team,
          team_members: memberData.filter((m: any) => m.team_id === team.id)
        })) || []
        
        console.log("✅ Simplified query successful, combined data:", data)
      }
      
      console.log("✅ User teams found:", data?.length || 0)
      return data || []
    } catch (error) {
      console.error("❌ teamService.getUserTeams error:", error)
      console.error("📋 Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
        userId
      })
      
      // En dernier recours, retourner un tableau vide
      console.log("⚠️ All team queries failed, returning empty array")
      return []
    }
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
      
      // 3. Si pas d'équipe et role gestionnaire → créer équipe automatiquement
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
      
      // 4. Si pas d'équipe et autre rôle → retourner erreur
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
  async getManagerStats(userId: string) {
    try {
      console.log("📊 Getting manager stats for user:", userId)
      
      // 1. Get user's team
      const userTeams = await teamService.getUserTeams(userId)
      if (!userTeams || userTeams.length === 0) {
        console.log("⚠️ No team found for user")
        return {
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
      
      // 3. Get lots for these buildings
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
        
        lots = lotsData || []
        console.log("🏠 Found lots:", lots.length)
      }
      
      // 4. Get contacts for this team
      const contacts = await contactService.getTeamContacts(team.id)
      console.log("👥 Found contacts:", contacts?.length || 0)
      
      // 5. Get interventions for these lots
      const lotIds = lots.map(l => l.id)
      let interventions: any[] = []
      
      if (lotIds.length > 0) {
        const { data: interventionsData, error: interventionsError } = await supabase
          .from('interventions')
          .select(`
            *,
            lot:lot_id(id, reference, building_id),
            assigned_contact:assigned_contact_id(name, email)
          `)
          .in('lot_id', lotIds)
        
        if (interventionsError) {
          console.error("❌ Error fetching interventions:", interventionsError)
        } else {
          interventions = interventionsData || []
          console.log("🔧 Found interventions:", interventions.length)
        }
      }
      
      // 6. Format buildings with embedded lots for PropertySelector
      const formattedBuildings = buildings?.map(building => {
        const buildingLots = lots.filter(lot => lot.building_id === building.id)
        const buildingInterventions = interventions.filter(intervention => 
          buildingLots.some(lot => lot.id === intervention.lot_id)
        )
        
        return {
          ...building,
          lots: buildingLots.map(lot => ({
            ...lot,
            status: lot.tenant_id ? 'occupied' : 'vacant',
            tenant: lot.tenant?.name || null,
            interventions: interventions.filter(i => i.lot_id === lot.id).length
          })),
          interventions: buildingInterventions.length
        }
      }) || []
      
      // 7. Calculate stats
      const occupiedLotsCount = lots.filter(lot => lot.tenant_id).length
      const occupancyRate = lots.length > 0 ? Math.round((occupiedLotsCount / lots.length) * 100) : 0
      
      const stats = {
        buildingsCount: buildings?.length || 0,
        lotsCount: lots.length,
        occupiedLotsCount,
        occupancyRate,
        contactsCount: contacts?.length || 0,
        interventionsCount: interventions.length
      }
      
      console.log("📊 Final stats:", stats)
      
      return {
        buildings: formattedBuildings,
        lots,
        contacts: contacts || [],
        interventions,
        stats,
        team
      }
      
    } catch (error) {
      console.error("❌ Error in getManagerStats:", error)
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
      rent_amount?: number
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
      rent_amount?: number
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
