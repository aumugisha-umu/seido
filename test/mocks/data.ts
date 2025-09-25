import { UserRole } from '@/lib/auth'

// Mock users for each role
export const mockUsers = {
  admin: {
    id: 'admin-1',
    email: 'marie.dubois@seido.fr',
    name: 'Marie Dubois',
    first_name: 'Marie',
    last_name: 'Dubois',
    role: 'admin' as UserRole,
    team_id: 'team-admin',
    phone: '+33123456789',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  gestionnaire: {
    id: 'manager-1',
    email: 'pierre.martin@seido.fr',
    name: 'Pierre Martin',
    first_name: 'Pierre',
    last_name: 'Martin',
    role: 'gestionnaire' as UserRole,
    team_id: 'team-gestionnaire',
    phone: '+33123456780',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  prestataire: {
    id: 'provider-1',
    email: 'jean.plombier@services.fr',
    name: 'Jean Plombier',
    first_name: 'Jean',
    last_name: 'Plombier',
    role: 'prestataire' as UserRole,
    team_id: 'team-prestataire',
    phone: '+33123456781',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  locataire: {
    id: 'tenant-1',
    email: 'sophie.tenant@email.fr',
    name: 'Sophie Tenant',
    first_name: 'Sophie',
    last_name: 'Tenant',
    role: 'locataire' as UserRole,
    team_id: 'team-locataire',
    phone: '+33123456782',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
}

// Mock buildings
export const mockBuildings = [
  {
    id: 'building-1',
    name: 'Résidence Champs-Élysées',
    address: '123 Avenue des Champs-Élysées',
    city: 'Paris',
    postal_code: '75008',
    country: 'France',
    manager_id: 'manager-1',
    total_lots: 24,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'building-2',
    name: 'Immeuble Saint-Germain',
    address: '45 Boulevard Saint-Germain',
    city: 'Paris',
    postal_code: '75005',
    country: 'France',
    manager_id: 'manager-1',
    total_lots: 18,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

// Mock lots
export const mockLots = [
  {
    id: 'lot-1',
    building_id: 'building-1',
    lot_number: 'A101',
    floor: 1,
    surface_area: 45.5,
    rooms: 2,
    rent_amount: 1200,
    charges_amount: 150,
    tenant_id: 'tenant-1',
    is_occupied: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'lot-2',
    building_id: 'building-1',
    lot_number: 'A102',
    floor: 1,
    surface_area: 50.0,
    rooms: 3,
    rent_amount: 1400,
    charges_amount: 160,
    tenant_id: null,
    is_occupied: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

// Mock interventions covering different statuses and roles
export const mockInterventions = [
  {
    id: 'intervention-1',
    reference: 'INT-2024-001',
    title: 'Fuite salle de bain',
    description: 'Fuite importante au niveau du lavabo',
    type: 'plomberie',
    urgency: 'haute',
    status: 'nouvelle-demande',
    location_details: 'Salle de bain principale',
    tenant_id: 'tenant-1',
    manager_id: 'manager-1',
    assigned_provider_id: null,
    lot_id: 'lot-1',
    building_id: 'building-1',
    expects_quote: false,
    estimated_duration: '2 heures',
    final_amount: null,
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    completed_at: null,
    tenant_comment: 'Fuite urgente, beaucoup d\'eau',
    manager_internal_comment: null,
    provider_execution_comment: null,
    provider_billing_comment: null,
    created_at: '2024-09-24T10:00:00Z',
    updated_at: '2024-09-24T10:00:00Z'
  },
  {
    id: 'intervention-2',
    reference: 'INT-2024-002',
    title: 'Problème électrique',
    description: 'Disjoncteur qui saute régulièrement',
    type: 'electricite',
    urgency: 'normale',
    status: 'approuvee',
    location_details: 'Tableau électrique',
    tenant_id: 'tenant-1',
    manager_id: 'manager-1',
    assigned_provider_id: 'provider-1',
    lot_id: 'lot-1',
    building_id: 'building-1',
    expects_quote: true,
    estimated_duration: '3 heures',
    final_amount: null,
    scheduled_date: null,
    scheduled_start_time: null,
    scheduled_end_time: null,
    completed_at: null,
    tenant_comment: 'Le disjoncteur saute plusieurs fois par jour',
    manager_internal_comment: 'Intervention approuvée, devis requis',
    provider_execution_comment: null,
    provider_billing_comment: null,
    created_at: '2024-09-23T14:30:00Z',
    updated_at: '2024-09-24T09:15:00Z'
  },
  {
    id: 'intervention-3',
    reference: 'INT-2024-003',
    title: 'Chauffage défaillant',
    description: 'Radiateurs froids dans le salon',
    type: 'chauffage',
    urgency: 'haute',
    status: 'programmee',
    location_details: 'Salon et chambre',
    tenant_id: 'tenant-1',
    manager_id: 'manager-1',
    assigned_provider_id: 'provider-1',
    lot_id: 'lot-1',
    building_id: 'building-1',
    expects_quote: false,
    estimated_duration: '4 heures',
    final_amount: 280.00,
    scheduled_date: '2024-09-26T00:00:00Z',
    scheduled_start_time: '09:00:00',
    scheduled_end_time: '13:00:00',
    completed_at: null,
    tenant_comment: 'Pas de chauffage depuis 2 jours',
    manager_internal_comment: 'Priorité haute, programmé pour demain',
    provider_execution_comment: null,
    provider_billing_comment: null,
    created_at: '2024-09-22T16:20:00Z',
    updated_at: '2024-09-24T11:45:00Z'
  },
  {
    id: 'intervention-4',
    reference: 'INT-2024-004',
    title: 'Serrure bloquée',
    description: 'Impossible d\'ouvrir la porte d\'entrée',
    type: 'serrurerie',
    urgency: 'urgente',
    status: 'en-cours',
    location_details: 'Porte d\'entrée',
    tenant_id: 'tenant-1',
    manager_id: 'manager-1',
    assigned_provider_id: 'provider-1',
    lot_id: 'lot-1',
    building_id: 'building-1',
    expects_quote: false,
    estimated_duration: '1 heure',
    final_amount: 120.00,
    scheduled_date: '2024-09-25T00:00:00Z',
    scheduled_start_time: '14:00:00',
    scheduled_end_time: '15:00:00',
    completed_at: null,
    tenant_comment: 'Bloqué dehors, très urgent',
    manager_internal_comment: 'Urgence confirmée',
    provider_execution_comment: 'Intervention en cours, remplacement de la serrure',
    provider_billing_comment: null,
    created_at: '2024-09-25T13:45:00Z',
    updated_at: '2024-09-25T14:05:00Z'
  },
  {
    id: 'intervention-5',
    reference: 'INT-2024-005',
    title: 'Peinture cuisine',
    description: 'Retouches peinture après dégât des eaux',
    type: 'peinture',
    urgency: 'basse',
    status: 'terminee',
    location_details: 'Cuisine',
    tenant_id: 'tenant-1',
    manager_id: 'manager-1',
    assigned_provider_id: 'provider-1',
    lot_id: 'lot-1',
    building_id: 'building-1',
    expects_quote: true,
    estimated_duration: '6 heures',
    final_amount: 350.00,
    scheduled_date: '2024-09-20T00:00:00Z',
    scheduled_start_time: '08:00:00',
    scheduled_end_time: '16:00:00',
    completed_at: '2024-09-20T16:30:00Z',
    tenant_comment: 'Merci pour la rapidité d\'intervention',
    manager_internal_comment: 'Travail satisfaisant',
    provider_execution_comment: 'Intervention terminée, résultat conforme',
    provider_billing_comment: 'Facturation envoyée',
    created_at: '2024-09-18T10:00:00Z',
    updated_at: '2024-09-20T16:30:00Z'
  }
]

// Mock notifications
export const mockNotifications = [
  {
    id: 'notif-1',
    user_id: 'manager-1',
    type: 'intervention_created',
    title: 'Nouvelle intervention',
    message: 'Une nouvelle intervention a été créée par Sophie Tenant',
    intervention_id: 'intervention-1',
    read: false,
    created_at: '2024-09-24T10:01:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'provider-1',
    type: 'intervention_assigned',
    title: 'Intervention assignée',
    message: 'Une intervention vous a été assignée: Problème électrique',
    intervention_id: 'intervention-2',
    read: false,
    created_at: '2024-09-24T09:16:00Z'
  }
]

// Mock quotes
export const mockQuotes = [
  {
    id: 'quote-1',
    intervention_id: 'intervention-2',
    provider_id: 'provider-1',
    amount: 180.00,
    description: 'Diagnostic électrique et remplacement disjoncteur',
    labor_cost: 120.00,
    material_cost: 60.00,
    status: 'en_attente',
    valid_until: '2024-10-01T00:00:00Z',
    notes: 'Intervention possible dans la semaine',
    created_at: '2024-09-24T15:30:00Z',
    updated_at: '2024-09-24T15:30:00Z'
  }
]

// Mock availabilities
export const mockAvailabilities = [
  {
    id: 'availability-1',
    provider_id: 'provider-1',
    date: '2024-09-26',
    start_time: '08:00:00',
    end_time: '12:00:00',
    is_available: true,
    notes: 'Disponible toute la matinée',
    created_at: '2024-09-24T16:00:00Z',
    updated_at: '2024-09-24T16:00:00Z'
  },
  {
    id: 'availability-2',
    provider_id: 'provider-1',
    date: '2024-09-27',
    start_time: '14:00:00',
    end_time: '18:00:00',
    is_available: true,
    notes: 'Après-midi libre',
    created_at: '2024-09-24T16:00:00Z',
    updated_at: '2024-09-24T16:00:00Z'
  }
]