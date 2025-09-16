"use client"

import {
  Search,
  Filter,
  Wrench,
  Plus,
  Calendar,
  MapPin,
  Building2,
  Clock,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Play,
  CheckCircle,
  ListTodo,
  Settings,
  Archive,
  Droplets,
  Zap,
  Flame,
  Key,
  Paintbrush,
  Hammer,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import ContentNavigator from "@/components/content-navigator"
import { useManagerStats } from "@/hooks/use-manager-stats"
import { useInterventionApproval } from "@/hooks/use-intervention-approval"
import { useInterventionPlanning } from "@/hooks/use-intervention-planning"
import { useInterventionExecution } from "@/hooks/use-intervention-execution"
import { useInterventionFinalization } from "@/hooks/use-intervention-finalization"

import { ApprovalModal } from "@/components/intervention/modals/approval-modal"
import { ApproveConfirmationModal } from "@/components/intervention/modals/approve-confirmation-modal"
import { RejectConfirmationModal } from "@/components/intervention/modals/reject-confirmation-modal"
import { SuccessModal } from "@/components/intervention/modals/success-modal"
import { ProgrammingModal } from "@/components/intervention/modals/programming-modal"
import { InterventionCancelButton } from "@/components/intervention/intervention-cancel-button"
import { InterventionCancellationManager } from "@/components/intervention/intervention-cancellation-manager"
import { InterventionCancellationProvider } from "@/contexts/intervention-cancellation-context"
import NavigationDebugPanel from "@/components/debug/navigation-debug"

import { 
  getInterventionLocationText, 
  getInterventionLocationIcon, 
  isBuildingWideIntervention,
  getStatusColor,
  getStatusLabel,
  getPriorityColor,
  getPriorityLabel 
} from "@/lib/intervention-utils"

export default function InterventionsPage() {
  const router = useRouter()
  const { data: managerData, loading, error } = useManagerStats()

  // Hooks pour les différentes actions
  const approvalHook = useInterventionApproval()
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

  // Get interventions from manager data
  const interventions = managerData?.interventions || []

  // Get intervention type icon and color
  const getInterventionTypeIcon = (type: string) => {
    const typeConfig = {
      plomberie: { icon: Droplets, color: "bg-blue-100", iconColor: "text-blue-600" },
      electricite: { icon: Zap, color: "bg-yellow-100", iconColor: "text-yellow-600" },
      chauffage: { icon: Flame, color: "bg-red-100", iconColor: "text-red-600" },
      serrurerie: { icon: Key, color: "bg-gray-100", iconColor: "text-gray-600" },
      peinture: { icon: Paintbrush, color: "bg-purple-100", iconColor: "text-purple-600" },
      maintenance: { icon: Hammer, color: "bg-orange-100", iconColor: "text-orange-600" },
    }
    
    return typeConfig[type?.toLowerCase() as keyof typeof typeConfig] || {
      icon: Wrench,
      color: "bg-amber-100",
      iconColor: "text-amber-600"
    }
  }

  // Filter function for interventions based on tab (NOUVEAU WORKFLOW)
  const getFilteredInterventions = (tabId: string) => {
    if (tabId === "toutes") {
      return interventions
    } else if (tabId === "demandes_group") {
      // Demandes : Demande, Approuvée
      return interventions.filter((i) => ["demande", "approuvee"].includes(i.status))
    } else if (tabId === "en_cours_group") {
      // En cours : Demande de devis, Planification, Planifiée, En cours, Clôturée par prestataire
      return interventions.filter((i) => ["demande_de_devis", "planification", "planifiee", "en_cours", "cloturee_par_prestataire"].includes(i.status))
    } else if (tabId === "cloturees_group") {
      // Clôturées : Clôturée par locataire, Clôturée par gestionnaire, Annulée, Rejetée
      return interventions.filter((i) => ["cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"].includes(i.status))
    }
    return interventions.filter((i) => i.status === tabId)
  }

  // Get actions for intervention based on status
  const getStatusActions = (intervention: any) => {
    const commonActions = [
      {
        label: "Modifier",
        icon: Edit,
        onClick: () => console.log(`[v0] Edit intervention ${intervention.id}`),
      },
      {
        label: "Supprimer",
        icon: Trash2,
        onClick: () => console.log(`[v0] Delete intervention ${intervention.id}`),
        className: "text-red-600 hover:text-red-800",
      },
    ]

    const statusActions = []

    // Phase 1 : Demande
    if (intervention.status === "demande") {
      statusActions.push({
        label: "Approuver / Rejeter",
        icon: Check,
        onClick: () => approvalHook.handleApprovalAction(intervention, "approve"),
      })
    }

    // Phase 2 : Planification & Exécution
    if (intervention.status === "demande_de_devis") {
      statusActions.push({
        label: "Afficher les devis",
        icon: Eye,
        onClick: () => finalizationHook.handleQuotesModal(intervention),
      })
    }

    if (intervention.status === "approuvee") {
      statusActions.push({
        label: "Planifier",
        icon: Calendar,
        onClick: () => planningHook.handleProgrammingModal(intervention),
      })
    }

    if (intervention.status === "planifiee") {
      statusActions.push({
        label: "Démarrer / Annuler",
        icon: Play,
        onClick: () => executionHook.handleExecutionModal(intervention, "start"),
      })
    }

    // Phase 3 : Clôture
    if (intervention.status === "cloturee_par_locataire") {
      statusActions.push({
        label: "Finaliser et clôturer",
        icon: CheckCircle,
        onClick: () => finalizationHook.handleFinalizeModal(intervention),
      })
    }

    // Pour les statuts "demande" et "approuvee", ne pas inclure les actions communes
    if (intervention.status === "demande" || intervention.status === "approuvee") {
      return statusActions
    }

    // Pour tous les autres statuts, inclure les actions communes
    return [...statusActions, ...commonActions]
  }

  // Function to render interventions list
  const renderInterventionsList = (tabId: string) => {
    const filteredInterventions = getFilteredInterventions(tabId)
    
    if (filteredInterventions.length === 0) {
      return (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {tabId === "toutes" ? "Aucune intervention" : "Aucune intervention dans cette catégorie"}
          </h3>
          <p className="text-slate-500 mb-6">
            {tabId === "toutes" 
              ? "Créez votre première intervention pour commencer"
              : "Les interventions de ce statut apparaîtront ici"}
          </p>
          {tabId === "toutes" && (
            <Button onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une intervention
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {filteredInterventions.map((intervention) => (
          <Card key={intervention.id} className="group hover:shadow-sm transition-all duration-200 flex flex-col h-full hover:bg-slate-50/50">
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="p-3 sm:p-4 lg:p-5 flex flex-col flex-1">
                <div className="space-y-2.5 sm:space-y-3 flex-1">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      {/* Type Icon */}
                      {(() => {
                        const typeConfig = getInterventionTypeIcon(intervention.type || "")
                        const IconComponent = typeConfig.icon
                        return (
                          <div className={`w-8 h-8 sm:w-10 sm:h-10 ${typeConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${typeConfig.iconColor}`} />
                          </div>
                        )
                      })()}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate leading-tight">{intervention.title}</h3>
                        <div className="flex items-center text-xs text-slate-600 mt-0.5 sm:mt-1 min-w-0">
                          {getInterventionLocationIcon(intervention) === "building" ? (
                            <Building2 className="h-3 w-3 mr-1 flex-shrink-0" />
                          ) : (
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          )}
                          <span className="truncate">{getInterventionLocationText(intervention)}</span>
                          {isBuildingWideIntervention(intervention) && (
                            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0.5 hidden sm:inline-flex">
                              Bâtiment entier
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex-shrink-0 flex items-center space-x-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2 text-xs flex-shrink-0"
                        onClick={() => router.push(`/gestionnaire/interventions/${intervention.id}`)}
                      >
                        <Eye className="h-3 w-3" />
                        <span className="hidden sm:inline ml-1">Détails</span>
                      </Button>
                      {getStatusActions(intervention).length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {getStatusActions(intervention).map((action, idx) => (
                              <DropdownMenuItem
                                key={idx}
                                onClick={action.onClick}
                                className={("className" in action) ? action.className : ""}
                              >
                                <action.icon className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            ))}
                            
                            {/* Bouton d'annulation pour les statuts éligibles */}
                            <InterventionCancelButton
                              intervention={intervention}
                              variant="dropdown-item"
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {/* Status & Priority Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <Badge className={`${getStatusColor(intervention.status)} text-xs px-1.5 sm:px-2 py-0.5 sm:py-1`}>
                      {getStatusLabel(intervention.status)}
                    </Badge>
                    <Badge className={`${getPriorityColor(intervention.urgency)} text-xs px-1.5 sm:px-2 py-0.5 sm:py-1`}>
                      {getPriorityLabel(intervention.urgency)}
                    </Badge>
                  </div>

                  {/* Description */}
                  {intervention.description && (
                    <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {intervention.description}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center space-x-3 lg:space-x-4 overflow-hidden">
                      {/* Type */}
                      {(() => {
                        const typeConfig = getInterventionTypeIcon(intervention.type || "")
                        const IconComponent = typeConfig.icon
                        return (
                          <div className="flex items-center space-x-1.5">
                            <div className={`w-5 h-5 ${typeConfig.color} rounded-md flex items-center justify-center`}>
                              <IconComponent className={`h-3 w-3 ${typeConfig.iconColor}`} />
                            </div>
                            <span className="text-xs text-slate-600 truncate">
                              {intervention.type || "Non spécifié"}
                            </span>
                          </div>
                        )
                      })()}
                      
                      {/* Schedule */}
                      <div className="flex items-center space-x-1.5">
                        <div className="w-5 h-5 bg-emerald-100 rounded-md flex items-center justify-center">
                          <Calendar className="h-3 w-3 text-emerald-600" />
                        </div>
                        <span className="text-xs text-slate-600 hidden sm:inline">
                          {intervention.scheduled_date
                            ? new Date(intervention.scheduled_date).toLocaleDateString("fr-FR")
                            : "Non prog."}
                        </span>
                      </div>

                      {/* Created date */}
                      <div className="flex items-center space-x-1.5">
                        <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center">
                          <Clock className="h-3 w-3 text-slate-600" />
                        </div>
                        <span className="text-xs text-slate-500 hidden md:inline">
                          {intervention.created_at
                            ? new Date(intervention.created_at).toLocaleDateString("fr-FR")
                            : "Inconnue"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Tabs configuration for ContentNavigator (NOUVEAU WORKFLOW)
  const interventionsTabsConfig = [
    {
      id: "toutes",
      label: "Toutes",
      icon: ListTodo,
      count: loading ? "..." : interventions.length,
      content: renderInterventionsList("toutes")
    },
    {
      id: "demandes_group", 
      label: "Demandes",
      icon: AlertTriangle,
      count: loading ? "..." : interventions.filter((i) => 
        ["demande", "approuvee"].includes(i.status)
      ).length,
      content: renderInterventionsList("demandes_group")
    },
    {
      id: "en_cours_group",
      label: "En cours", 
      icon: Settings,
      count: loading ? "..." : interventions.filter((i) => 
        ["demande_de_devis", "planification", "planifiee", "en_cours", "cloturee_par_prestataire"].includes(i.status)
      ).length,
      content: renderInterventionsList("en_cours_group")
    },
    {
      id: "cloturees_group",
      label: "Clôturées",
      icon: Archive, 
      count: loading ? "..." : interventions.filter((i) => 
        ["cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"].includes(i.status)
      ).length,
      content: renderInterventionsList("cloturees_group")
    }
  ]

  // Configuration des filtres pour les interventions
  const interventionsFiltersConfig = [
    {
      id: "type",
      label: "Type d'intervention",
      options: [
        { value: "all", label: "Tous les types" },
        { value: "plomberie", label: "Plomberie" },
        { value: "electricite", label: "Électricité" },
        { value: "chauffage", label: "Chauffage" },
        { value: "serrurerie", label: "Serrurerie" },
        { value: "maintenance", label: "Maintenance générale" },
        { value: "peinture", label: "Peinture" }
      ],
      defaultValue: "all"
    },
    {
      id: "urgency",
      label: "Niveau d'urgence",
      options: [
        { value: "all-urgency", label: "Tous les niveaux" },
        { value: "basse", label: "Basse" },
        { value: "normale", label: "Normale" },
        { value: "haute", label: "Haute" },
        { value: "urgente", label: "Urgente" }
      ],
      defaultValue: "all-urgency"
    }
  ]

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-slate-600">Chargement des interventions...</span>
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Erreur de chargement</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <InterventionCancellationProvider>
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Header - Harmonized */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl mb-2">
                Interventions
              </h1>
              <p className="text-slate-600">
                Gérez et suivez toutes les interventions sur votre patrimoine
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="flex items-center space-x-2"
                onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter une intervention</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content Navigator */}
        <ContentNavigator
          tabs={interventionsTabsConfig}
          defaultTab="toutes"
          searchPlaceholder="Rechercher par titre, description, ou lot..."
          filters={interventionsFiltersConfig}
          onSearch={(value) => console.log("Recherche:", value)}
          onFilterChange={(filterId, value) => console.log("Filtre:", filterId, value)}
        />
      </main>

      {/* Modals */}
      <ApprovalModal
        isOpen={approvalHook.approvalModal.isOpen}
        onClose={approvalHook.closeApprovalModal}
        intervention={approvalHook.approvalModal.intervention}
        action={approvalHook.approvalModal.action}
        rejectionReason={approvalHook.rejectionReason}
        internalComment={approvalHook.internalComment}
        onRejectionReasonChange={approvalHook.setRejectionReason}
        onInternalCommentChange={approvalHook.setInternalComment}
        onActionChange={approvalHook.handleActionChange}
        onConfirm={approvalHook.handleConfirmAction}
      />

      {/* Modal de confirmation d'approbation */}
      <ApproveConfirmationModal
        isOpen={approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "approve"}
        onClose={approvalHook.closeConfirmationModal}
        onConfirm={approvalHook.handleFinalConfirmation}
        intervention={approvalHook.confirmationModal.intervention}
        internalComment={approvalHook.internalComment}
        onInternalCommentChange={approvalHook.setInternalComment}
        isLoading={approvalHook.isLoading}
      />

      {/* Modal de confirmation de rejet */}
      <RejectConfirmationModal
        isOpen={approvalHook.confirmationModal.isOpen && approvalHook.confirmationModal.action === "reject"}
        onClose={approvalHook.closeConfirmationModal}
        onConfirm={approvalHook.handleFinalConfirmation}
        intervention={approvalHook.confirmationModal.intervention}
        rejectionReason={approvalHook.rejectionReason}
        onRejectionReasonChange={approvalHook.setRejectionReason}
        internalComment={approvalHook.internalComment}
        onInternalCommentChange={approvalHook.setInternalComment}
        isLoading={approvalHook.isLoading}
      />

      <SuccessModal
        isOpen={approvalHook.successModal.isOpen}
        onClose={approvalHook.closeSuccessModal}
        action={approvalHook.successModal.action}
        interventionTitle={approvalHook.successModal.interventionTitle}
      />

      <ProgrammingModal
        isOpen={planningHook.programmingModal.isOpen}
        onClose={planningHook.closeProgrammingModal}
        intervention={planningHook.programmingModal.intervention}
        onSchedule={planningHook.handleSchedule}
        isLoading={planningHook.isLoading}
      />

      {/* Manager global des modales d'annulation */}
      <InterventionCancellationManager />

      {/* Debug Panel */}
      <NavigationDebugPanel />
    </div>
  </InterventionCancellationProvider>
  )
}