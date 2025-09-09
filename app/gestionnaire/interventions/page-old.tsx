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
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { useManagerStats } from "@/hooks/use-manager-stats"
import { useInterventionApproval } from "@/hooks/use-intervention-approval"
import { useInterventionPlanning } from "@/hooks/use-intervention-planning"
import { useInterventionExecution } from "@/hooks/use-intervention-execution"
import { useInterventionFinalization } from "@/hooks/use-intervention-finalization"

import { ApprovalModal } from "@/components/intervention/modals/approval-modal"
import { ConfirmationModal } from "@/components/intervention/modals/confirmation-modal"
import { SuccessModal } from "@/components/intervention/modals/success-modal"
import { ProgrammingModal } from "@/components/intervention/modals/programming-modal"

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
  const [activeTab, setActiveTab] = useState("toutes")

  // Hooks pour les différentes actions
  const approvalHook = useInterventionApproval()
  const planningHook = useInterventionPlanning()
  const executionHook = useInterventionExecution()
  const finalizationHook = useInterventionFinalization()

  // Get interventions from manager data
  const interventions = managerData?.interventions || []

  // Tabs configuration
  const tabs = [
    {
      id: "toutes",
      label: "Toutes",
      shortLabel: "Toutes",
      count: interventions.length,
      color: "default",
    },
    {
      id: "nouvelle_demande_group",
      label: "Nouvelle demande",
      shortLabel: "Nouvelle demande",
      count: interventions.filter((i) => 
        ["nouvelle_demande", "devis", "a_programmer"].includes(i.status)
      ).length,
      color: "red",
    },
    {
      id: "en_cours_group",
      label: "En cours",
      shortLabel: "En cours",
      count: interventions.filter((i) => 
        ["programme", "en_cours", "finalisation_attente"].includes(i.status)
      ).length,
      color: "blue",
    },
    {
      id: "terminee_group",
      label: "Terminée",
      shortLabel: "Terminée",
      count: interventions.filter((i) => 
        ["terminee", "annulee", "rejete"].includes(i.status)
      ).length,
      color: "green",
    },
  ]

  // Filter interventions based on active tab
  const filteredInterventions = (() => {
    if (activeTab === "toutes") {
      return interventions
    } else if (activeTab === "nouvelle_demande_group") {
      return interventions.filter((i) => ["nouvelle_demande", "devis", "a_programmer"].includes(i.status))
    } else if (activeTab === "en_cours_group") {
      return interventions.filter((i) => ["programme", "en_cours", "finalisation_attente"].includes(i.status))
    } else if (activeTab === "terminee_group") {
      return interventions.filter((i) => ["terminee", "annulee", "rejete"].includes(i.status))
    }
    return interventions.filter((i) => i.status === activeTab)
  })()

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
        destructive: true,
      },
    ]

    const statusActions = []

    if (intervention.status === "nouvelle_demande") {
      statusActions.push({
        label: "Approuver / Rejeter",
        icon: Check,
        onClick: () => approvalHook.handleApprovalAction(intervention, "approve"),
      })
    }

    if (intervention.status === "devis") {
      statusActions.push({
        label: "Afficher les devis",
        icon: Eye,
        onClick: () => finalizationHook.handleQuotesModal(intervention),
      })
    }

    if (intervention.status === "a_programmer") {
      statusActions.push({
        label: "Programmer",
        icon: Calendar,
        onClick: () => planningHook.handleProgrammingModal(intervention),
      })
    }

    if (intervention.status === "programme") {
      statusActions.push({
        label: "Exécuter / Annuler",
        icon: Play,
        onClick: () => executionHook.handleExecutionModal(intervention, "start"),
      })
    }

    if (intervention.status === "finalisation_attente") {
      statusActions.push({
        label: "Finaliser et payer",
        icon: CheckCircle,
        onClick: () => finalizationHook.handleFinalizeModal(intervention),
      })
    }

    return [...statusActions, ...commonActions]
  }

  const getTabTextColor = (tab: any, isActive: boolean) => {
    if (isActive) return "text-blue-600"
    
    switch (tab.color) {
      case "red": return "text-red-600"
      case "orange": return "text-orange-600"  
      case "blue": return "text-blue-600"
      case "green": return "text-green-600"
      default: return "text-gray-500 hover:text-gray-700"
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Chargement des interventions...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Réessayer</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interventions</h1>
          <p className="text-gray-600">Gérez toutes vos demandes d'intervention depuis cette page centrale</p>
        </div>
        <Button onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}>
          <Plus className="h-4 w-4 mr-2" />
          Créer une intervention
        </Button>
      </div>

      <div className="space-y-6">
        {/* Tabs navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-3 px-4 border-b-2 font-medium text-sm flex items-center justify-center space-x-2
                  ${activeTab === tab.id ? "border-blue-500" : "border-transparent hover:border-gray-300"}
                  ${getTabTextColor(tab, activeTab === tab.id)}
                `}
              >
                <span className="truncate">{tab.shortLabel}</span>
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {tab.count}
                </Badge>
              </button>
            ))}
          </nav>
        </div>

        {/* Section Header */}
        <div className="flex items-center space-x-2 mb-4">
          <Wrench className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {tabs.find((t) => t.id === activeTab)?.label} ({filteredInterventions.length})
          </h2>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher par titre, description, ou lot..." className="pl-10" />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <Select defaultValue="all">
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="plomberie">Plomberie</SelectItem>
                <SelectItem value="electricite">Électricité</SelectItem>
                <SelectItem value="chauffage">Chauffage</SelectItem>
                <SelectItem value="serrurerie">Serrurerie</SelectItem>
                <SelectItem value="maintenance">Maintenance générale</SelectItem>
                <SelectItem value="peinture">Peinture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Interventions List */}
        <div className="space-y-4">
          {filteredInterventions.map((intervention) => (
            <Card key={intervention.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{intervention.title}</h3>
                      <Badge className={getPriorityColor(intervention.urgency)}>
                        {getPriorityLabel(intervention.urgency)}
                      </Badge>
                      <Badge className={getStatusColor(intervention.status)}>
                        {getStatusLabel(intervention.status)}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-4 line-clamp-2">{intervention.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        {getInterventionLocationIcon(intervention) === "building" ? (
                          <Building2 className="h-4 w-4" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        <span>{getInterventionLocationText(intervention)}</span>
                        {isBuildingWideIntervention(intervention) && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            Bâtiment entier
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Wrench className="h-4 w-4" />
                        <span>{intervention.type || "Non spécifié"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(intervention.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>#{intervention.reference}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-4">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">Assigné à:</span> {intervention.assigned_contact?.name || "Non assigné"}
                      </div>
                      {intervention.description && intervention.description.includes('📎') && (
                        <Badge variant="outline" className="text-xs">
                          📎 Fichiers joints
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/gestionnaire/interventions/${intervention.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Détails
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4 mr-2" />
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {getStatusActions(intervention).map((action, index) => {
                          const isDestructive = action.destructive
                          const isStatusAction = index < getStatusActions(intervention).length - 2

                          return (
                            <div key={action.label}>
                              {isStatusAction && index === getStatusActions(intervention).length - 3 && (
                                <DropdownMenuSeparator />
                              )}
                              <DropdownMenuItem
                                onClick={action.onClick}
                                className={isDestructive ? "text-red-600 focus:text-red-600" : ""}
                              >
                                <action.icon className="h-4 w-4 mr-2" />
                                {action.label}
                              </DropdownMenuItem>
                            </div>
                          )
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {filteredInterventions.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
            <p className="text-gray-500">Aucune intervention ne correspond au statut sélectionné.</p>
          </div>
        )}
      </div>

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
        onActionChange={(action) => approvalHook.handleApprovalAction(approvalHook.approvalModal.intervention!, action)}
        onConfirm={approvalHook.handleConfirmAction}
      />

      <ConfirmationModal
        isOpen={approvalHook.confirmationModal.isOpen}
        onClose={approvalHook.closeConfirmationModal}
        intervention={approvalHook.confirmationModal.intervention}
        action={approvalHook.confirmationModal.action}
        rejectionReason={approvalHook.confirmationModal.rejectionReason}
        internalComment={approvalHook.confirmationModal.internalComment}
        onConfirm={approvalHook.handleFinalConfirmation}
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
        programmingOption={planningHook.programmingOption}
        onProgrammingOptionChange={planningHook.setProgrammingOption}
        directSchedule={planningHook.programmingDirectSchedule}
        onDirectScheduleChange={planningHook.setProgrammingDirectSchedule}
        proposedSlots={planningHook.programmingProposedSlots}
        onAddProposedSlot={planningHook.addProgrammingSlot}
        onUpdateProposedSlot={planningHook.updateProgrammingSlot}
        onRemoveProposedSlot={planningHook.removeProgrammingSlot}
        onConfirm={planningHook.handleProgrammingConfirm}
        isFormValid={planningHook.isProgrammingFormValid()}
      />
    </div>
  )
}
