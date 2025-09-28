import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Home,
  Wrench,
  User,
  MessageCircle
} from "lucide-react"
import { requireRole } from "@/lib/dal"
// import { createServerUserService } from '@/lib/services' // TODO: implement when ready



import { LocataireDashboardClient } from "./locataire-dashboard-client"

// TODO: Initialize services for new architecture
// Example: const userService = await createServerUserService()
// Remember to make your function async if it isn't already


/**
 * 🔐 DASHBOARD LOCATAIRE - SERVER COMPONENT (Migration Server Components)
 *
 * Multi-layer security implementation:
 * 1. Route level: requireRole() vérification
 * 2. Data layer: DAL avec authentification
 * 3. UI level: Masquage conditionnel
 * 4. Server actions: Validation dans actions
 */

export default async function LocataireDashboard() {
  // ✅ LAYER 1: Route Level Security - Vérification rôle obligatoire
  const user = await requireRole('locataire')

  // ✅ LAYER 2: Data Layer Security - Récupération données locataire
  let tenantData: { id: string; building_id?: string; building?: any; reference: string; category?: string; floor?: number; rooms?: string; surface_area?: number; charges_amount?: number } | null = null
  let tenantInterventions: { id: string; title: string; description: string; status: string; created_at: string; urgency_level?: string }[] = []
  let pendingActions: { id: string; type: string; title: string; description: string; priority: string; href: string }[] = []
  let error: string | null = null

  try {
    console.log('🔍 [LOCATAIRE-DASHBOARD] Loading tenant data for user:', user.id)

    // Récupérer les données du locataire
    const userData = await userService.getById(user.id)
    if (userData && userData.lot_id) {
      // Récupérer le lot du locataire
      tenantData = await lotService.getById(userData.lot_id)

      if (tenantData && tenantData.building_id) {
        // Récupérer les informations du bâtiment
        const building = await buildingService.getById(tenantData.building_id)
        tenantData.building = building
      }

      // Récupérer les interventions du locataire
      tenantInterventions = await interventionService.getTenantInterventions(user.id)

      // Calculer les actions en attente
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
    }

    console.log('✅ [LOCATAIRE-DASHBOARD] Tenant data loaded successfully')
  } catch (err) {
    console.error('❌ [LOCATAIRE-DASHBOARD] Error loading tenant data:', err)
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




  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Page Header - Simple et centré */}
      <div className="text-center lg:text-left mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Bonjour {user.display_name || user.name} 👋</h1>
            <p className="text-slate-600">Signalez vos problèmes ici et faites-en le suivi facilement</p>
          </div>
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

      {/* Section 2: Informations du logement */}
      <section>
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Home className="w-5 h-5" />
              Informations du logement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Nom / Référence */}
              <div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Nom / Référence</p>
                  <p className="font-semibold text-slate-900">
                    {tenantData.building?.name || `Lot ${tenantData.reference}`}
                  </p>
                  <p className="text-sm text-slate-600">
                    {tenantData.building ? tenantData.reference : `${tenantData.category || 'appartement'} • ${tenantData.reference}`}
                  </p>
                </div>
              </div>

              {/* Adresse */}
              <div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Adresse</p>
                  <p className="text-slate-900">
                    {tenantData.building ?
                      `${tenantData.building.address}, ${tenantData.building.postal_code} ${tenantData.building.city}` :
                      'Lot indépendant'
                    }
                  </p>
                </div>
              </div>

              {/* Gestionnaire */}
              <div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-600">Gestionnaire</p>
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-full">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">Jean Martin</span>
                    <MessageCircle className="w-4 h-4 text-blue-600 opacity-70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Informations supplémentaires du lot */}
            {(tenantData.floor !== undefined || tenantData.rooms || tenantData.surface_area || tenantData.charges_amount) && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-base font-medium text-slate-900 mb-4">Détails du logement</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {tenantData.floor !== undefined && (
                    <div>
                      <p className="text-sm text-slate-600">Étage</p>
                      <p className="font-semibold text-slate-900">{tenantData.floor}</p>
                    </div>
                  )}
                  {tenantData.rooms && (
                    <div>
                      <p className="text-sm text-slate-600">Pièces</p>
                      <p className="font-semibold text-slate-900">{tenantData.rooms}</p>
                    </div>
                  )}
                  {tenantData.surface_area && (
                    <div>
                      <p className="text-sm text-slate-600">Surface</p>
                      <p className="font-semibold text-slate-900">{tenantData.surface_area} m²</p>
                    </div>
                  )}
                  {tenantData.charges_amount && (
                    <div>
                      <p className="text-sm text-slate-600">Charges</p>
                      <p className="font-semibold text-slate-900">{tenantData.charges_amount.toFixed(2)} €</p>
                    </div>
                  )}
                </div>
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
