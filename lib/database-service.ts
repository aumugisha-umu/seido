import { supabase } from './supabase'
import type { Database } from './database.types'

// Types
export type User = Database['public']['Tables']['users']['Row']
export type Building = Database['public']['Tables']['buildings']['Row']
export type Lot = Database['public']['Tables']['lots']['Row']
export type Intervention = Database['public']['Tables']['interventions']['Row']
export type Contact = Database['public']['Tables']['contacts']['Row']

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
    console.log('Attempting to get user by ID:', id)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Database error in getById:', {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        userId: id,
        fullError: JSON.stringify(error, null, 2)
      })
      throw error
    }
    console.log('User found by ID:', data)
    return data
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
      console.error('❌ Database error creating user:', {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        userData: user,
        fullError: JSON.stringify(error, null, 2)
      })
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
        lots(id, reference, is_occupied, tenant:tenant_id(name, email))
      `)
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

  async create(building: Database['public']['Tables']['buildings']['Insert']) {
    const { data, error } = await supabase
      .from('buildings')
      .insert(building)
      .select()
      .single()
    
    if (error) throw error
    return data
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
    const { data, error } = await supabase
      .from('lots')
      .insert(lot)
      .select()
      .single()
    
    if (error) throw error
    return data
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
        assigned_provider:assigned_provider_id(name, email, phone)
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
        assigned_provider:assigned_provider_id(name, email, phone)
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
        assigned_provider:assigned_provider_id(name, email, phone)
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
      .eq('assigned_provider_id', providerId)
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
        assigned_provider:assigned_provider_id(name, email, phone)
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
      .select('*')
      .order('name')
    
    if (error) throw error
    return data
  },

  async getByRole(role: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('role', role)
      .order('name')
    
    if (error) throw error
    return data
  },

  async create(contact: Database['public']['Tables']['contacts']['Insert']) {
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single()
    
    if (error) throw error
    return data
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
