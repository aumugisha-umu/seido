import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Home,
  Wrench
} from "lucide-react"
import { getServerAuthContext } from '@/lib/server-context'
import {
  createServerTenantService,
  createServerBuildingService
} from '@/lib/services'

import { LocataireDashboardClient } from "./locataire-dashboard-client"
import { logger, logError } from '@/lib/logger'
/**
 * 🔐 DASHBOARD LOCATAIRE - SERVER COMPONENT (Migration Server Components)
 *
 * Multi-layer security implementation:
 * 1. Route level: getServerAuthContext() centralized auth
 * 2. Data layer: DAL avec authentification
 * 3. UI level: Masquage conditionnel
 * 4. Server actions: Validation dans actions
 */

export default async function LocataireDashboard() {
  // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
  const { user, profile } = await getServerAuthContext('locataire')

  // ✅ CORRECTIF (2025-10-07): Use TenantService to properly query lot_contacts junction table
  const tenantService = await createServerTenantService()
  const buildingService = await createServerBuildingService()

  // ✅ LAYER 2: Data Layer Security - Récupération données locataire via TenantService
  let tenantData: { id: string; building_id?: string; building?: unknown; reference: string; category?: string; floor?: number; rooms?: string; surface_area?: number; charges_amount?: number } | null = null
  let tenantInterventions: { id: string; title: string; description: string; status: string; created_at: string; urgency_level?: string }[] = []
  let pendingActions: { id: string; type: string; title: string; description: string; priority: string; href: string }[] = []
  let error: string | null = null

  try {
    logger.info('🔍 [LOCATAIRE-DASHBOARD] Loading tenant data via TenantService for user:', profile.id)

    // ✅ NEW APPROACH: Use TenantService.getTenantData() which queries lot_contacts properly
    const fullTenantData = await tenantService.getTenantData(profile.id)

    if (fullTenantData && fullTenantData.lots.length > 0) {
      // Get primary lot or first lot
      const primaryLotData = fullTenantData.lots.find(l => l.is_primary) || fullTenantData.lots[0]
      tenantData = primaryLotData.lot

      // Get building information if lot has building_id
      if (tenantData.building_id) {
        const buildingResult = await buildingService.getById(tenantData.building_id)
        if (buildingResult.success && buildingResult.data) {
          tenantData.building = buildingResult.data
        }
      }

      // Get interventions (already fetched by TenantService)
      tenantInterventions = fullTenantData.interventions.map(i => ({
        id: i.id,
        title: i.title,
        description: i.description || '',
        status: i.status,
        created_at: i.created_at,
        urgency_level: i.urgency || 'normale'
      }))

      // Calculate pending actions
      pendingActions = tenantInterventions.filter(i =>
        i.status === 'cloturee_par_prestataire' ||
        i.status === 'demande'
      ).map(i => ({
        id: i.id,
        type: i.status === 'cloturee_par_prestataire' ? 'validation_required' : 'new_request',
        title: i.title,
        description: i.description,
        priority: i.urgency_level || 'medium',
        href: `/locataire/interventions/${i.id}`
      }))

      logger.info('✅ [LOCATAIRE-DASHBOARD] Tenant data loaded successfully:', {
        lotId: tenantData.id,
        interventionsCount: tenantInterventions.length,
        pendingActionsCount: pendingActions.length
      })
    } else {
      logger.warn('⚠️ [LOCATAIRE-DASHBOARD] No lots found for tenant:', profile.id)
    }
  } catch (err) {
    logger.error('❌ [LOCATAIRE-DASHBOARD] Error loading tenant data:', err)
    error = 'Erreur lors du chargement des données'
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              {error}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tenantData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Aucune propriété trouvée pour ce locataire.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }




  // Construire l'adresse complète avec toutes les informations
  const buildingName = tenantData.building?.name || ''
  const lotReference = tenantData.reference || ''
  const apartmentNumber = tenantData.apartment_number || ''
  const street = tenantData.building?.address || ''
  const postalCode = tenantData.building?.postal_code || ''
  const city = tenantData.building?.city || ''
  const floor = tenantData.floor !== undefined ? `Étage ${tenantData.floor}` : ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header avec informations du logement */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            {/* Référence du lot + Nom de l'immeuble */}
            <div className="flex items-center gap-3 mb-3">
              <Home className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {lotReference}
                  {buildingName && <span className="text-slate-600 font-normal"> • {buildingName}</span>}
                </h1>
              </div>
            </div>

            {/* Adresse complète */}
            <div className="space-y-1 text-slate-600">
              {street && (
                <p className="text-base">
                  {street}
                  {(floor || apartmentNumber) && (
                    <span className="text-slate-500">
                      {floor && `, ${floor}`}
                      {apartmentNumber && `, Porte ${apartmentNumber}`}
                    </span>
                  )}
                </p>
              )}
              {(postalCode || city) && (
                <p className="text-base">
                  {postalCode} {city}
                </p>
              )}
            </div>
          </div>

          {/* Bouton créer demande */}
          <LocataireDashboardClient />
        </div>
      </div>

      {/* Section 1: Actions en attente */}
      <section>
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Actions en attente</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingActions.length > 0 ? (
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="p-4 border rounded-lg">
                    <h3 className="font-medium">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">Aucune action en attente</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Interventions */}
      <section>
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-slate-900" />
              <h2 className="text-xl font-semibold text-slate-900">Mes interventions</h2>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {tenantInterventions.length > 0 ? (
              <div className="space-y-4">
                {tenantInterventions.slice(0, 5).map((intervention) => (
                  <div key={intervention.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{intervention.title}</h3>
                        <p className="text-sm text-gray-600">{intervention.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(intervention.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        intervention.status === 'completed' ? 'bg-green-100 text-green-800' :
                        intervention.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {intervention.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Aucune intervention</p>
                <p className="text-sm text-gray-400">Vos demandes apparaîtront ici</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  )
}

// LoadingSkeleton component removed as it was unused

// Les fonctions de style sont maintenant gérées par les utilitaires dans /lib/intervention-utils
