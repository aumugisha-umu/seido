/**
 * Known entities from the staging database for E2E/integration testing
 *
 * These IDs reference REAL data in the staging Supabase database.
 * They are used by tests that need to navigate to or interact with
 * existing entities (buildings, lots, interventions, etc.)
 *
 * To populate: query the staging DB or inspect the app manually.
 * Update these values if the staging DB is reset.
 *
 * NOTE: Tests that create new entities should NOT add IDs here —
 * this is only for pre-existing reference data.
 */

export const KNOWN_ENTITIES = {
  /**
   * Routes that should always be accessible for the gestionnaire role.
   * Used by smoke tests to verify page loading.
   */
  routes: {
    dashboard: '/gestionnaire/dashboard',
    buildings: '/gestionnaire/biens/immeubles',
    lots: '/gestionnaire/biens/lots',
    interventions: '/gestionnaire/interventions',
    newBuilding: '/gestionnaire/biens/immeubles/nouveau',
    newLot: '/gestionnaire/biens/lots/nouveau',
  },

  /**
   * Content markers that indicate a page has fully loaded
   * (past the skeleton/loading state). Used with waitForFunction.
   */
  contentMarkers: {
    buildingWizard: ['ajouter un immeuble', 'référence de l', 'description'],
    lotWizard: ['ajouter un nouveau lot', 'lier à un immeuble'],
    dashboard: ['dashboard', 'interventions', 'biens'],
  },
} as const
