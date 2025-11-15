/**
 * Demo Data Store - In-memory database avec LokiJS
 * Gère toutes les données du mode démo
 */

import Loki from 'lokijs'

export interface QueryOptions {
  filters?: Record<string, any>
  sort?: { field: string; order: 'asc' | 'desc' }
  pagination?: { page: number; limit: number }
}

/**
 * Demo Data Store - Singleton
 * Base de données en mémoire pour le mode démo
 */
export class DemoDataStore {
  private db: Loki
  private initialized = false

  constructor() {
    this.db = new Loki('seido-demo.db')
  }

  /**
   * Initialiser les collections
   */
  initialize() {
    if (this.initialized) return

    // Créer toutes les collections nécessaires
    this.db.addCollection('teams', { unique: ['id'] })
    this.db.addCollection('users', { unique: ['id'], indices: ['role', 'team_id', 'email'] })
    this.db.addCollection('team_members', { unique: ['id'], indices: ['team_id', 'user_id'] })
    this.db.addCollection('buildings', { unique: ['id'], indices: ['team_id', 'city', 'country'] })
    this.db.addCollection('lots', { unique: ['id'], indices: ['building_id', 'team_id'] })
    this.db.addCollection('lot_contacts', { unique: ['id'], indices: ['lot_id', 'user_id'] })
    this.db.addCollection('building_contacts', { unique: ['id'], indices: ['building_id', 'user_id'] })
    this.db.addCollection('interventions', { unique: ['id'], indices: ['building_id', 'lot_id', 'team_id', 'status', 'created_by'] })
    this.db.addCollection('intervention_assignments', { unique: ['id'], indices: ['intervention_id', 'user_id', 'role'] })
    this.db.addCollection('intervention_quotes', { unique: ['id'], indices: ['intervention_id', 'provider_id'] })
    this.db.addCollection('intervention_comments', { unique: ['id'], indices: ['intervention_id', 'user_id'] })
    this.db.addCollection('intervention_time_slots', { unique: ['id'], indices: ['intervention_id'] })
    this.db.addCollection('notifications', { unique: ['id'], indices: ['user_id', 'team_id'] })
    this.db.addCollection('companies', { unique: ['id'], indices: ['team_id'] })
    this.db.addCollection('company_members', { unique: ['id'], indices: ['company_id', 'user_id'] })
    this.db.addCollection('property_documents', { unique: ['id'], indices: ['building_id', 'lot_id', 'team_id'] })
    this.db.addCollection('conversation_threads', { unique: ['id'], indices: ['intervention_id', 'team_id'] })
    this.db.addCollection('conversation_messages', { unique: ['id'], indices: ['thread_id', 'user_id'] })

    this.initialized = true
  }

  /**
   * Charger les données initiales (seed)
   */
  seed(data: {
    teams: any[]
    users: any[]
    team_members?: any[]
    buildings: any[]
    lots: any[]
    lot_contacts?: any[]
    building_contacts?: any[]
    interventions: any[]
    intervention_assignments?: any[]
    intervention_quotes?: any[]
    intervention_comments?: any[]
    notifications?: any[]
    companies?: any[]
    [key: string]: any
  }) {
    // Insérer les teams
    if (data.teams) {
      const teamsCol = this.db.getCollection('teams')
      teamsCol.insert(data.teams)
    }

    // Insérer les users
    if (data.users) {
      const usersCol = this.db.getCollection('users')
      usersCol.insert(data.users)
    }

    // Insérer les team_members
    if (data.team_members) {
      const teamMembersCol = this.db.getCollection('team_members')
      teamMembersCol.insert(data.team_members)
    }

    // Insérer les buildings
    if (data.buildings) {
      const buildingsCol = this.db.getCollection('buildings')
      buildingsCol.insert(data.buildings)
    }

    // Insérer les lots
    if (data.lots) {
      const lotsCol = this.db.getCollection('lots')
      lotsCol.insert(data.lots)
    }

    // Insérer les lot_contacts
    if (data.lot_contacts) {
      const lotContactsCol = this.db.getCollection('lot_contacts')
      lotContactsCol.insert(data.lot_contacts)
    }

    // Insérer les building_contacts
    if (data.building_contacts) {
      const buildingContactsCol = this.db.getCollection('building_contacts')
      buildingContactsCol.insert(data.building_contacts)
    }

    // Insérer les interventions
    if (data.interventions) {
      const interventionsCol = this.db.getCollection('interventions')
      interventionsCol.insert(data.interventions)
    }

    // Insérer les intervention_assignments
    if (data.intervention_assignments) {
      const assignmentsCol = this.db.getCollection('intervention_assignments')
      assignmentsCol.insert(data.intervention_assignments)
    }

    // Insérer les quotes
    if (data.intervention_quotes) {
      const quotesCol = this.db.getCollection('intervention_quotes')
      quotesCol.insert(data.intervention_quotes)
    }

    // Insérer les comments
    if (data.intervention_comments) {
      const commentsCol = this.db.getCollection('intervention_comments')
      commentsCol.insert(data.intervention_comments)
    }

    // Insérer les notifications
    if (data.notifications) {
      const notificationsCol = this.db.getCollection('notifications')
      notificationsCol.insert(data.notifications)
    }

    // Insérer les companies
    if (data.companies) {
      const companiesCol = this.db.getCollection('companies')
      companiesCol.insert(data.companies)
    }
  }

  /**
   * Réinitialiser toutes les données
   */
  reset() {
    // Supprimer toutes les collections
    this.db.listCollections().forEach(collection => {
      this.db.removeCollection(collection.name)
    })

    this.initialized = false
    this.initialize()
  }

  /**
   * Obtenir un élément par ID
   */
  get(collectionName: string, id: string): any | null {
    const collection = this.db.getCollection(collectionName)
    if (!collection) return null

    return collection.findOne({ id })
  }

  /**
   * Query avec filtres, tri et pagination
   */
  query(collectionName: string, options?: QueryOptions): any[] {
    const collection = this.db.getCollection(collectionName)
    if (!collection) return []

    let chain = collection.chain()

    // Appliquer les filtres
    if (options?.filters) {
      chain = chain.find(options.filters)
    }

    // Appliquer le tri
    if (options?.sort) {
      chain = chain.simplesort(options.sort.field, options.sort.order === 'desc')
    }

    // Appliquer la pagination
    if (options?.pagination) {
      const { page, limit } = options.pagination
      chain = chain.offset((page - 1) * limit).limit(limit)
    }

    return chain.data()
  }

  /**
   * Créer un nouvel élément
   */
  create(collectionName: string, data: any): any {
    const collection = this.db.getCollection(collectionName)
    if (!collection) throw new Error(`Collection ${collectionName} not found`)

    return collection.insert(data)
  }

  /**
   * Mettre à jour un élément
   */
  update(collectionName: string, id: string, data: any): any {
    const collection = this.db.getCollection(collectionName)
    if (!collection) throw new Error(`Collection ${collectionName} not found`)

    const doc = collection.findOne({ id })
    if (!doc) throw new Error(`Document with id ${id} not found`)

    Object.assign(doc, data, { updated_at: new Date().toISOString() })
    collection.update(doc)

    return doc
  }

  /**
   * Supprimer un élément
   */
  delete(collectionName: string, id: string): boolean {
    const collection = this.db.getCollection(collectionName)
    if (!collection) throw new Error(`Collection ${collectionName} not found`)

    const doc = collection.findOne({ id })
    if (!doc) return false

    collection.remove(doc)
    return true
  }

  /**
   * Récupérer toutes les données d'un utilisateur spécifique
   * Filtre via intervention_assignments et lot_contacts
   */
  getDataForUser(userId: string) {
    // Récupérer l'utilisateur
    const user = this.get('users', userId)
    if (!user) return null

    // Récupérer les lots de cet utilisateur (si locataire)
    const lotContacts = this.query('lot_contacts', { filters: { user_id: userId } })
    const userLotIds = lotContacts.map((lc: any) => lc.lot_id)
    const userLots = userLotIds.map((lotId: string) => this.get('lots', lotId)).filter(Boolean)

    // Récupérer les interventions assignées à cet utilisateur
    const assignments = this.query('intervention_assignments', { filters: { user_id: userId } })
    const interventionIds = assignments.map((a: any) => a.intervention_id)
    const userInterventions = interventionIds.map((id: string) => this.get('interventions', id)).filter(Boolean)

    // Récupérer les immeubles liés aux lots de l'utilisateur
    const buildingIdsSet = new Set(userLots.map((lot: any) => lot.building_id))
    const buildingIds = Array.from(buildingIdsSet)
    const userBuildings = buildingIds.map((id: string) => this.get('buildings', id)).filter(Boolean)

    return {
      user,
      lots: userLots,
      interventions: userInterventions,
      buildings: userBuildings,
      assignments
    }
  }

  /**
   * Compter les éléments d'une collection avec filtres
   */
  count(collectionName: string, filters?: Record<string, any>): number {
    const collection = this.db.getCollection(collectionName)
    if (!collection) return 0

    if (filters) {
      return collection.count(filters)
    }

    return collection.count()
  }

  /**
   * Obtenir l'instance Loki (pour requêtes avancées)
   */
  getDb(): Loki {
    return this.db
  }
}

// Singleton instance
let storeInstance: DemoDataStore | null = null

/**
 * Obtenir l'instance singleton du Demo Data Store
 */
export function getDemoDataStore(): DemoDataStore {
  if (!storeInstance) {
    storeInstance = new DemoDataStore()
    storeInstance.initialize()
  }
  return storeInstance
}

/**
 * Réinitialiser le singleton (utile pour les tests)
 */
export function resetDemoDataStore() {
  if (storeInstance) {
    storeInstance.reset()
  }
  storeInstance = null
}
