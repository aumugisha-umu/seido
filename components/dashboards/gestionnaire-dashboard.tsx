"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Building2, Home, Users, Wrench, BarChart3, UserPlus, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { TeamCheckModal } from "@/components/team-check-modal"
import { InterventionsList } from "@/components/interventions/interventions-list"
import { useAuth } from "@/hooks/use-auth"
import { useTeamStatus } from "@/hooks/use-team-status"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { useInterventionApproval } from "@/hooks/use-intervention-approval"
import { useInterventionQuoting } from "@/hooks/use-intervention-quoting"
import { useInterventionPlanning } from "@/hooks/use-intervention-planning"
import { useInterventionExecution } from "@/hooks/use-intervention-execution"
import { useInterventionFinalization } from "@/hooks/use-intervention-finalization"
import { PendingActionsCompactHybrid } from "@/components/ui-proposals/pending-actions-compact-hybrid"
import { AlertCircle } from "lucide-react"
import { createContactInvitationService } from '@/lib/services'
import { logger, logError } from '@/lib/logger'
export default function GestionnaireDashboard() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const router = useRouter()
  const { teamStatus, hasTeam } = useTeamStatus()
  const { data: managerData, loading: statsLoading, stats, refetch } = useManagerStats()

  // Hooks pour les actions d'intervention
  const approvalHook = useInterventionApproval()
  const quotingHook = useInterventionQuoting()
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

  // Configuration des hooks d'actions
  const actionHooks = {
    approvalHook,
    quotingHook,
    planningHook,
    executionHook,
    finalizationHook,
  }

  // Convertir les interventions en format PendingAction pour le composant
  const convertToPendingActions = () => {
    if (!managerData?.recentInterventions) return []

    return managerData.recentInterventions
      .filter((intervention: any) => [
        "demande",
        "approuvee",
        "demande_de_devis",
        "planification",
        "planifiee",
        "en_cours"
      ].includes(intervention.status))
      .map((intervention: any) => ({
        id: intervention.id,
        type: 'intervention',
        title: intervention.title,
        description: intervention.description,
        status: intervention.status,
        reference: intervention.reference,
        priority: intervention.priority,
        urgency: intervention.urgency,
        location: {
          building: intervention.building?.name,
          lot: intervention.lot?.reference,
          address: intervention.building?.address,
          city: intervention.building?.city,
          postal_code: intervention.building?.postal_code
        },
        contact: intervention.tenant ? {
          name: intervention.tenant.name,
          role: 'Locataire',
          phone: intervention.tenant.phone,
          email: intervention.tenant.email
        } : intervention.prestataire ? {
          name: intervention.prestataire.name,
          role: 'Prestataire',
          phone: intervention.prestataire.phone,
          email: intervention.prestataire.email
        } : undefined,
        assigned_contact: intervention.assigned_contact,
        dates: {
          created: intervention.created_at,
          planned: intervention.planned_date,
          completed: intervention.completed_date
        },
        actionUrl: `/gestionnaire/interventions/${intervention.id}`
      }))
  }

  const pendingActions = convertToPendingActions()

  // Afficher la vérification d'équipe en cours ou échoué
  if (teamStatus === 'checking' || (teamStatus === 'error' && !hasTeam)) {
    return <TeamCheckModal onTeamResolved={() => {}} />
  }

  const handleContactSubmit = async (contactData: { type: string; firstName: string; lastName: string; email: string; phone: string; speciality?: string; notes: string; inviteToApp: boolean }) => {
    logger.info("[GESTIONNAIRE-DASHBOARD] Creating contact:", {
      ...contactData,
      fullName: `${contactData.firstName} ${contactData.lastName}`,
    })

    try {
      // ✅ FIX: Utiliser le même service que la page contacts pour garantir la cohérence
      const contactInvitationService = createContactInvitationService()

      // ✅ Préparer les données dans le format attendu par le service
      const dataToSend = {
        type: contactData.type,
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        phone: contactData.phone,
        speciality: contactData.speciality,
        notes: contactData.notes,
        inviteToApp: contactData.inviteToApp,
        teamId: teamStatus.team?.id || '' // Récupérer le teamId depuis le teamStatus
      }

      logger.info("📞 [GESTIONNAIRE-DASHBOARD] Calling contactInvitationService with:", dataToSend)

      // ✅ Utiliser le service d'invitation qui gère la création du contact + invitation optionnelle
      const result = await contactInvitationService.createContactWithOptionalInvite(dataToSend)

      logger.info("✅ [GESTIONNAIRE-DASHBOARD] Service completed, result:", result)

      if (!result.success) {
        throw new Error(result.error || 'Failed to create contact')
      }

      if (contactData.inviteToApp) {
        logger.info("📧 Invitation sent to:", contactData.email)
      }

      setIsContactModalOpen(false)

      // Trigger refetch to update the dashboard
      if (typeof refetch === 'function') {
        logger.info("🔄 [GESTIONNAIRE-DASHBOARD] Triggering dashboard refetch...")
        await refetch()
      }
    } catch (error) {
      logger.error('❌ [GESTIONNAIRE-DASHBOARD] Error creating contact:', error)
      logger.error('❌ [GESTIONNAIRE-DASHBOARD] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack',
        contactData: contactData
      })
      // TODO: Show error toast to user
    }
  }

  return (
    <div className="space-y-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground">Gestion de votre patrimoine immobilier</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-background"
            onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
          >
            <Building2 className="h-4 w-4 mr-2" />
            Ajouter un immeuble
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="bg-background"
            onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
          >
            <Home className="h-4 w-4 mr-2" />
            Ajouter un lot
          </Button>
          <Button size="sm" variant="outline" className="bg-background" onClick={() => setIsContactModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Ajouter un contact
          </Button>
          <Button size="sm" variant="outline" className="bg-background">
            <Wrench className="h-4 w-4 mr-2" />
            Ajouter une intervention
          </Button>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Immeubles</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.buildingsCount}
            </div>
            <p className="text-xs text-muted-foreground">Propriétés gérées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lots</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.lotsCount}
            </div>
            <p className="text-xs text-muted-foreground">Logements totaux</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `${stats.occupiedLotsCount}/${stats.lotsCount}`
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Progress value={statsLoading ? 0 : stats.occupancyRate} className="flex-1" />
              <span className="text-sm font-medium text-muted-foreground">
                {statsLoading ? '...' : `${Math.round(stats.occupancyRate)}%`}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interventions</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : stats.interventionsCount}
            </div>
            <p className="text-xs text-muted-foreground">Total interventions</p>
          </CardContent>
        </Card>
      </div>

      {/* Section: Actions en attente */}
      {pendingActions.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-foreground">Actions en attente</span>
                <span className="text-xs text-slate-600 ml-auto">Interventions nécessitant votre attention</span>
              </div>
              <PendingActionsCompactHybrid
                actions={pendingActions}
                userRole="gestionnaire"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Occupation Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Tendances d'occupation</span>
            </CardTitle>
          </CardHeader>
                      <CardContent>
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="w-32 h-32 rounded-full border-8 border-muted mx-auto mb-4 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-muted-foreground">0%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Aucune donnée d'occupation</p>
                  <p className="text-xs text-muted-foreground">Ajoutez des biens pour voir les statistiques</p>
                </div>
              </div>
            </CardContent>
        </Card>

        {/* Interventions Récentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wrench className="h-5 w-5" />
                <span>Interventions récentes</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/gestionnaire/interventions")}
              >
                Voir toutes →
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              <InterventionsList
                interventions={managerData?.recentInterventions || []}
                loading={statsLoading}
                compact={true}
                maxItems={3}
                emptyStateConfig={{
                  title: "Aucune intervention récente",
                  description: "Les interventions récentes apparaîtront ici",
                  showCreateButton: true,
                  createButtonText: "Créer une intervention",
                  createButtonAction: () => router.push("/gestionnaire/interventions/nouvelle-intervention")
                }}
                showStatusActions={true}
                userContext="gestionnaire"
                actionHooks={actionHooks}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        onSuccess={refetch}
        defaultType="tenant"
      />
    </div>
  )
}
