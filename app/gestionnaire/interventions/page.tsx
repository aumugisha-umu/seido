"use client"
import {
  Search,
  Filter,
  Wrench,
  Plus,
  Calendar,
  User,
  MapPin,
  Clock,
  Eye,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  CheckCircle,
  Download,
  Play,
  MessageSquare,
  FileText,
  Loader2,
} from "lucide-react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { useManagerStats } from "@/hooks/use-manager-stats"



const getStatusColor = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
      return "bg-red-100 text-red-800 border-red-200"
    case "approuve":
      return "bg-green-100 text-green-800 border-green-200"
    case "rejete":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "devis":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "a_programmer":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "programme":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "en_cours":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "finalisation_attente":
      return "bg-orange-100 text-orange-800 border-orange-200"
    case "terminee":
      return "bg-green-100 text-green-800 border-green-200"
    case "annulee":
      return "bg-gray-100 text-gray-800 border-gray-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "nouvelle_demande":
      return "Nouvelle demande"
    case "approuve":
      return "Approuvé"
    case "rejete":
      return "Rejeté"
    case "devis":
      return "Devis"
    case "a_programmer":
      return "À programmer"
    case "programme":
      return "Programmé"
    case "en_cours":
      return "En cours"
    case "finalisation_attente":
      return "Finalisation en attente"
    case "terminee":
      return "Terminée"
    case "annulee":
      return "Annulée"
    default:
      return status
  }
}

const getPriorityColor = (urgency: string) => {
  switch (urgency) {
    case "urgente":
      return "bg-red-100 text-red-800"
    case "haute":
      return "bg-orange-100 text-orange-800"
    case "normale":
      return "bg-blue-100 text-blue-800"
    case "basse":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getPriorityLabel = (urgency: string) => {
  switch (urgency) {
    case "urgente":
      return "Urgente"
    case "haute":
      return "Haute"
    case "normale":
      return "Normale"
    case "basse":
      return "Basse"
    default:
      return urgency
  }
}

export default function InterventionsPage() {
  const router = useRouter()
  const { data: managerData, loading, error } = useManagerStats()
  const [activeTab, setActiveTab] = useState("toutes")
  const [approvalModal, setApprovalModal] = useState<{
    isOpen: boolean
    intervention: any
    action: "approve" | "reject" | null
  }>({
    isOpen: false,
    intervention: null,
    action: null,
  })
  const [rejectionReason, setRejectionReason] = useState("")
  const [internalComment, setInternalComment] = useState("")
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    intervention: any
    action: "approve" | "reject" | null
    rejectionReason: string
    internalComment: string
  }>({
    isOpen: false,
    intervention: null,
    action: null,
    rejectionReason: "",
    internalComment: "",
  })
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean
    action: "approve" | "reject" | null
    interventionTitle: string
  }>({
    isOpen: false,
    action: null,
    interventionTitle: "",
  })

  const [quotesModal, setQuotesModal] = useState<{
    isOpen: boolean
    intervention: any
  }>({
    isOpen: false,
    intervention: null,
  })

  const [planningModal, setPlanningModal] = useState<{
    isOpen: boolean
    intervention: any
    acceptedQuote: any
  }>({
    isOpen: false,
    intervention: null,
    acceptedQuote: null,
  })

  const [planningOption, setPlanningOption] = useState<"direct" | "propose" | "organize" | null>(null)
  const [directSchedule, setDirectSchedule] = useState({
    date: "",
    startTime: "",
    endTime: "",
  })
  const [proposedSlots, setProposedSlots] = useState<
    Array<{
      date: string
      startTime: string
      endTime: string
    }>
  >([])
  const [planningSuccessModal, setPlanningSuccessModal] = useState<{
    isOpen: boolean
    interventionTitle: string
  }>({
    isOpen: false,
    interventionTitle: "",
  })

  const [programmingModal, setProgrammingModal] = useState<{
    isOpen: boolean
    intervention: any
  }>({
    isOpen: false,
    intervention: null,
  })

  const [programmingOption, setProgrammingOption] = useState<"direct" | "propose" | "organize" | null>(null)
  const [programmingDirectSchedule, setProgrammingDirectSchedule] = useState({
    date: "",
    startTime: "",
    endTime: "",
  })
  const [programmingProposedSlots, setProgrammingProposedSlots] = useState<
    Array<{
      date: string
      startTime: string
      endTime: string
    }>
  >([{ date: "", startTime: "", endTime: "" }])

  const [executionModal, setExecutionModal] = useState<{
    isOpen: boolean
    intervention: any
    action: "start" | "cancel" | null
  }>({
    isOpen: false,
    intervention: null,
    action: null,
  })
  const [executionComment, setExecutionComment] = useState("")
  const [executionInternalComment, setExecutionInternalComment] = useState("")
  const [executionFiles, setExecutionFiles] = useState<File[]>([])
  const [executionConfirmModal, setExecutionConfirmModal] = useState<{
    isOpen: boolean
    intervention: any
    action: "start" | "cancel" | null
    comment: string
    internalComment: string
    files: File[]
  }>({
    isOpen: false,
    intervention: null,
    action: null,
    comment: "",
    internalComment: "",
    files: [],
  })
  const [executionSuccessModal, setExecutionSuccessModal] = useState<{
    isOpen: boolean
    action: "start" | "cancel" | null
    interventionTitle: string
  }>({
    isOpen: false,
    action: null,
    interventionTitle: "",
  })

  const [finalizeModal, setFinalizeModal] = useState<{
    isOpen: boolean
    intervention: any | null
  }>({
    isOpen: false,
    intervention: null,
  })
  const [finalAmount, setFinalAmount] = useState("")
  const [finalizeConfirmModal, setFinalizeConfirmModal] = useState(false)
  const [finalizeSuccessModal, setFinalizeSuccessModal] = useState(false)

  // Get interventions from manager data
  const interventions = managerData?.interventions || []

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

  const getTabTextColor = (tab: any, isActive: boolean) => {
    if (isActive) {
      return "text-blue-600"
    }

    switch (tab.color) {
      case "red":
        return "text-red-600"
      case "orange":
        return "text-orange-600"
      case "blue":
        return "text-blue-600"
      case "green":
        return "text-green-600"
      default:
        return "text-gray-500 hover:text-gray-700"
    }
  }

  const getAlertIconColor = (tab: any) => {
    switch (tab.color) {
      case "red":
        return "text-red-500"
      case "orange":
        return "text-orange-500"
      case "blue":
        return "text-blue-500"
      case "green":
        return "text-green-500"
      default:
        return "text-red-500"
    }
  }

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

  const handleApprovalAction = (intervention: any, action: "approve" | "reject") => {
    setApprovalModal({
      isOpen: true,
      intervention,
      action,
    })
    setRejectionReason("")
    setInternalComment("")
  }

  const handleConfirmAction = () => {
    if (approvalModal.action === "approve") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "approve",
        rejectionReason: "",
        internalComment: internalComment,
      })
    } else if (approvalModal.action === "reject") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "reject",
        rejectionReason: rejectionReason,
        internalComment: internalComment,
      })
    }

    setApprovalModal({ isOpen: false, intervention: null, action: null })
  }

  const handleFinalConfirmation = () => {
    if (confirmationModal.action === "approve") {
      console.log(`[v0] Approving intervention ${confirmationModal.intervention?.id}`)
      console.log(`[v0] Internal comment: ${confirmationModal.internalComment}`)

      const intervention = confirmationModal.intervention
      const queryParams = new URLSearchParams({
        fromApproval: "true",
        tenantId: intervention.tenant,
        location: intervention.location,
        title: intervention.title,
        type: intervention.type,
        priority: intervention.priority,
        description: intervention.description,
        estimatedDuration: intervention.estimatedDuration,
        hasFiles: intervention.hasFiles.toString(),
        createdAt: intervention.createdAt,
      })

      setSuccessModal({
        isOpen: true,
        action: confirmationModal.action,
        interventionTitle: confirmationModal.intervention?.title || "",
      })

      // Redirect after showing success modal briefly
      setTimeout(() => {
        router.push(`/gestionnaire/interventions/nouvelle-intervention?${queryParams.toString()}`)
      }, 2000)
    } else if (confirmationModal.action === "reject") {
      console.log(`[v0] Rejecting intervention ${confirmationModal.intervention?.id}`)
      console.log(`[v0] Rejection reason: ${confirmationModal.rejectionReason}`)
      console.log(`[v0] Internal comment: ${confirmationModal.internalComment}`)

      setSuccessModal({
        isOpen: true,
        action: confirmationModal.action,
        interventionTitle: confirmationModal.intervention?.title || "",
      })
    }

    setConfirmationModal({
      isOpen: false,
      intervention: null,
      action: null,
      rejectionReason: "",
      internalComment: "",
    })
    setRejectionReason("")
    setInternalComment("")
  }

  const handleProgrammingAction = (intervention: any) => {
    setProgrammingModal({
      isOpen: true,
      intervention,
    })
  }

  const handleProgrammingConfirm = () => {
    console.log("[v0] Programming confirmed with option:", programmingOption)
    if (programmingOption === "direct") {
      console.log("[v0] Direct schedule:", programmingDirectSchedule)
    } else if (programmingOption === "propose") {
      console.log("[v0] Proposed slots:", programmingProposedSlots)
    }

    // Update intervention status to "programmee"
    const updatedInterventions = interventions.map((intervention) =>
      intervention.id === programmingModal.intervention?.id ? { ...intervention, status: "programmee" } : intervention,
    )
    setInterventions(updatedInterventions)

    setProgrammingModal({ isOpen: false, intervention: null })
    setProgrammingOption(null)
    setProgrammingDirectSchedule({ date: "", startTime: "", endTime: "" })
    setProgrammingProposedSlots([{ date: "", startTime: "", endTime: "" }])

    setSuccessModal({
      isOpen: true,
      title: "Intervention programmée",
      message: "L'intervention a été programmée avec succès.",
    })
  }

  const handleExecutionModal = (intervention: any, action: "start" | "cancel") => {
    setExecutionModal({
      isOpen: true,
      intervention,
      action,
    })
  }

  const handleExecutionAction = (action: "start" | "cancel") => {
    setExecutionConfirmModal({
      isOpen: true,
      intervention: executionModal.intervention,
      action,
      comment: executionComment,
      internalComment: executionInternalComment,
      files: executionFiles,
    })
    setExecutionModal({
      isOpen: false,
      intervention: null,
      action: null,
    })
  }

  const handleFinalExecutionConfirmation = () => {
    const { intervention, action } = executionConfirmModal

    // Update intervention status
    const interventionIndex = interventions.findIndex((i) => i.id === intervention?.id)
    if (interventionIndex !== -1) {
      interventions[interventionIndex].status = action === "start" ? "en-cours" : "annulee"
    }

    setExecutionConfirmModal({
      isOpen: false,
      intervention: null,
      action: null,
      comment: "",
      internalComment: "",
      files: [],
    })

    setExecutionSuccessModal({
      isOpen: true,
      interventionTitle: intervention?.title || "",
      action,
    })
  }

  const handleExecutionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setExecutionFiles((prev) => [...prev, ...files])
  }

  const removeExecutionFile = (index: number) => {
    setExecutionFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleFinalizePayment = () => {
    setFinalizeModal({ isOpen: false, intervention: null })
    setFinalizeConfirmModal(true)
  }

  const handleFinalizeConfirmation = () => {
    setFinalizeConfirmModal(false)
    setFinalizeSuccessModal(true)

    // Update intervention status to terminee
    const updatedInterventions = interventions.map((intervention) =>
      intervention.id === finalizeModal.intervention?.id ? { ...intervention, status: "terminee" } : intervention,
    )
    setInterventions(updatedInterventions)

    setTimeout(() => {
      setFinalizeSuccessModal(false)
      setFinalAmount("")
    }, 3000)
  }

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
        onClick: () => handleApprovalAction(intervention, "approve"),
      })
    }

    if (intervention.status === "devis") {
      statusActions.push({
        label: "Afficher les devis",
        icon: Eye,
        onClick: () => setQuotesModal({ isOpen: true, intervention }),
      })
    }

    if (intervention.status === "a_programmer") {
      statusActions.push({
        label: "Programmer",
        icon: Calendar,
        onClick: () => handleProgrammingAction(intervention),
      })
    }

    if (intervention.status === "programme") {
      statusActions.push({
        label: "Exécuter / Annuler",
        icon: Play,
        onClick: () => handleExecutionModal(intervention, "start"),
      })
    }

    if (intervention.status === "finalisation_attente") {
      statusActions.push({
        label: "Finaliser et payer",
        icon: CheckCircle,
        onClick: () => setFinalizeModal({ isOpen: true, intervention }),
      })
    }

    return [...statusActions, ...commonActions]
  }

  const handleQuoteAction = (quoteId: string, action: "accept" | "reject") => {
    console.log(`[v0] ${action} quote ${quoteId}`)

    if (action === "accept") {
      const acceptedQuote = mockQuotes.find((q) => q.id === quoteId)
      setPlanningModal({
        isOpen: true,
        intervention: quotesModal.intervention,
        acceptedQuote: acceptedQuote,
      })
      setQuotesModal({ isOpen: false, intervention: null })
    } else {
      // For reject, just close the modal for now
      setQuotesModal({ isOpen: false, intervention: null })
    }
  }

  const handlePlanningConfirmation = () => {
    console.log(`[v0] Planning option selected: ${planningOption}`)

    if (planningOption === "direct") {
      console.log(`[v0] Direct schedule:`, directSchedule)
    } else if (planningOption === "propose") {
      console.log(`[v0] Proposed slots:`, proposedSlots)
    }

    setPlanningModal({
      isOpen: false,
      intervention: null,
      acceptedQuote: null,
    })

    setPlanningSuccessModal({
      isOpen: true,
      interventionTitle: planningModal.intervention?.title || "",
    })

    setPlanningOption(null)
    setDirectSchedule({ date: "", startTime: "", endTime: "" })
    setProposedSlots([])
  }

  const addProposedSlot = () => {
    setProposedSlots([...proposedSlots, { date: "", startTime: "", endTime: "" }])
  }

  const updateProposedSlot = (index: number, field: string, value: string) => {
    const updated = proposedSlots.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    setProposedSlots(updated)
  }

  const removeProposedSlot = (index: number) => {
    setProposedSlots(proposedSlots.filter((_, i) => i !== index))
  }

  const mockQuotes = [
    {
      id: "quote1",
      prestataire: "Thomas Blanc",
      specialite: "Plomberie",
      montant: "285,00 €",
      delai: "24-48h",
      description: "Réparation fuite robinet + remplacement joint défectueux. Matériel inclus.",
      status: "accepte",
      timestamp: "Il y a 2h",
    },
    {
      id: "quote2",
      prestataire: "Plomberie Express",
      specialite: "Plomberie",
      montant: "320,00 €",
      delai: "48-72h",
      description: "Diagnostic complet + réparation fuite + garantie 2 ans. Déplacement inclus.",
      status: "en-attente",
      timestamp: "Il y a 4h",
    },
  ]

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
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
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
                        <MapPin className="h-4 w-4" />
                        <span>{intervention.lot?.reference || "Non spécifié"}</span>
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

        {/* Empty state when no interventions match filter */}
        {filteredInterventions.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune intervention</h3>
            <p className="text-gray-500">Aucune intervention ne correspond au statut sélectionné.</p>
          </div>
        )}
      </div>

      {/* Approval/Rejection Modal */}
      <Dialog
        open={approvalModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalModal({ isOpen: false, intervention: null, action: null })
            setRejectionReason("")
            setInternalComment("")
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Examiner la demande d'intervention</DialogTitle>
          </DialogHeader>

          {approvalModal.intervention && (
            <div className="space-y-6">
              {/* Logement concerné */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Logement concerné</h3>
                </div>
                <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Lot:</span> {approvalModal.intervention.lot?.reference || "Non spécifié"}
                    </p>
                    <p>
                      <span className="font-medium">Référence:</span> #{approvalModal.intervention.reference}
                    </p>
                </div>
              </div>

              {/* Détails du problème */}
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Wrench className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-gray-900">Détails du problème</h3>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{approvalModal.intervention.title}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <p className="text-gray-600">{approvalModal.intervention.type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Urgence:</span>
                      <Badge className={getPriorityColor(approvalModal.intervention.urgency)}>
                        {getPriorityLabel(approvalModal.intervention.urgency)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600 mt-1">{approvalModal.intervention.description}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Localisation précise:</span>
                    <p className="text-gray-600">Salle de bain principale</p>
                  </div>
                </div>
              </div>

              {/* Fichiers joints */}
              {approvalModal.intervention.hasFiles && (
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="h-5 w-5 text-gray-600">📎</div>
                    <h3 className="font-semibold text-gray-900">Fichiers joints</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 text-xs">JPG</span>
                      </div>
                      <span>fuite-robinet.jpg (2.1 MB)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <span className="text-blue-600 text-xs">JPG</span>
                      </div>
                      <span>degats-plafond.jpg (1.8 MB)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Disponibilités proposées */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Disponibilités proposées par le locataire</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm bg-green-100 p-2 rounded">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span>Vendredi 10 janvier de 08:00 à 18:00</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm bg-green-100 p-2 rounded">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span>Samedi 11 janvier de 09:00 à 17:00</span>
                  </div>
                </div>
              </div>

              {/* Informations complémentaires */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Informations complémentaires</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Date de création:</span>
                    <p className="text-gray-600">
                      {new Date(approvalModal.intervention.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Référence:</span>
                    <p className="text-gray-600">#{approvalModal.intervention.reference}</p>
                  </div>
                </div>
              </div>

              {/* Rejection reason input */}
              {approvalModal.action === "reject" && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Raison du rejet (visible par le locataire) *
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Expliquez pourquoi cette intervention est rejetée..."
                    className="min-h-[100px]"
                  />
                </div>
              )}

              {/* Internal comment field for both approve and reject */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire interne (visible uniquement en interne)
                </label>
                <Textarea
                  value={internalComment}
                  onChange={(e) => setInternalComment(e.target.value)}
                  placeholder="Ajoutez des notes internes sur cette intervention..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setApprovalModal({ isOpen: false, intervention: null, action: null })
                setRejectionReason("")
                setInternalComment("")
              }}
            >
              Fermer
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setApprovalModal((prev) => ({ ...prev, action: "reject" }))}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
              <Button
                onClick={() => {
                  if (approvalModal.action === "reject") {
                    handleConfirmAction()
                  } else {
                    setApprovalModal((prev) => ({ ...prev, action: "approve" }))
                    handleConfirmAction()
                  }
                }}
                disabled={approvalModal.action === "reject" && !rejectionReason.trim()}
                className={
                  approvalModal.action === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }
              >
                {approvalModal.action === "reject" ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Rejeter
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approuver
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog
        open={confirmationModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationModal({
              isOpen: false,
              intervention: null,
              action: null,
              rejectionReason: "",
              internalComment: "",
            })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>Confirmer l'action</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-gray-600">
              {confirmationModal.action === "approve"
                ? "Êtes-vous sûr de vouloir approuver cette intervention ?"
                : "Êtes-vous sûr de vouloir rejeter cette intervention ?"}
            </p>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-sm text-gray-900">{confirmationModal.intervention?.title}</p>
              <p className="text-sm text-gray-600">{confirmationModal.intervention?.location}</p>
            </div>

            {confirmationModal.action === "reject" && confirmationModal.rejectionReason && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-red-800">Raison du rejet :</p>
                <p className="text-sm text-red-700">{confirmationModal.rejectionReason}</p>
              </div>
            )}

            {confirmationModal.internalComment && (
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">Commentaire interne :</p>
                <p className="text-sm text-yellow-700">{confirmationModal.internalComment}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmationModal({
                  isOpen: false,
                  intervention: null,
                  action: null,
                  rejectionReason: "",
                  internalComment: "",
                })
              }
            >
              Annuler
            </Button>
            <Button
              onClick={handleFinalConfirmation}
              className={
                confirmationModal.action === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {confirmationModal.action === "reject" ? "Confirmer le rejet" : "Confirmer l'approbation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog
        open={successModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSuccessModal({
              isOpen: false,
              action: null,
              interventionTitle: "",
            })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>{successModal.action === "approve" ? "Intervention approuvée" : "Intervention rejetée"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                {successModal.action === "approve"
                  ? "L'intervention a été approuvée avec succès."
                  : "La demande d'intervention a été rejetée."}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Une notification vient d'être envoyée au locataire
                {successModal.action === "reject" ? " avec la raison du rejet" : ""}.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() =>
                setSuccessModal({
                  isOpen: false,
                  action: null,
                  interventionTitle: "",
                })
              }
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quotes Modal */}
      <Dialog
        open={quotesModal.isOpen}
        onOpenChange={(open) => !open && setQuotesModal({ isOpen: false, intervention: null })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-5 h-5 bg-green-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">€</span>
                </div>
              </div>
              Devis ({mockQuotes.length})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {mockQuotes.map((quote) => (
              <Card
                key={quote.id}
                className={`${quote.status === "accepte" ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{quote.prestataire}</h3>
                        <p className="text-sm text-gray-600">Prestataire • {quote.specialite}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={quote.status === "accepte" ? "default" : "secondary"}
                        className={
                          quote.status === "accepte"
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                        }
                      >
                        {quote.status === "accepte" ? "Accepté" : "En attente"}
                      </Badge>
                      <span className="text-sm text-gray-500">{quote.timestamp}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Montant</p>
                      <p className="text-2xl font-bold text-gray-900">{quote.montant}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Délai d'intervention</p>
                      <p className="text-lg font-semibold text-gray-900">{quote.delai}</p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{quote.description}</p>

                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Voir détails
                    </Button>

                    {quote.status === "accepte" ? (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => handleQuoteAction(quote.id, "accept")}>
                          <Check className="h-4 w-4 mr-2" />
                          Accepter
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleQuoteAction(quote.id, "reject")}>
                          <X className="h-4 w-4 mr-2" />
                          Refuser
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={planningModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPlanningModal({
              isOpen: false,
              intervention: null,
              acceptedQuote: null,
            })
            setPlanningOption(null)
            setDirectSchedule({ date: "", startTime: "", endTime: "" })
            setProposedSlots([])
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Planification de l'intervention</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800 font-medium">Devis accepté</p>
              <p className="text-sm text-green-700">
                {planningModal.acceptedQuote?.prestataire} - {planningModal.acceptedQuote?.montant}
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700 font-medium">Comment souhaitez-vous organiser la planification ?</p>

              <div className="space-y-3">
                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="planning"
                    value="direct"
                    checked={planningOption === "direct"}
                    onChange={(e) => setPlanningOption(e.target.value as "direct")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Fixer directement la date et heure</p>
                    <p className="text-sm text-gray-600">Vous définissez un créneau précis pour l'intervention</p>

                    {planningOption === "direct" && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                              type="date"
                              value={directSchedule.date}
                              onChange={(e) => setDirectSchedule({ ...directSchedule, date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure début</label>
                            <input
                              type="time"
                              value={directSchedule.startTime}
                              onChange={(e) => setDirectSchedule({ ...directSchedule, startTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin</label>
                            <input
                              type="time"
                              value={directSchedule.endTime}
                              onChange={(e) => setDirectSchedule({ ...directSchedule, endTime: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="planning"
                    value="propose"
                    checked={planningOption === "propose"}
                    onChange={(e) => setPlanningOption(e.target.value as "propose")}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Proposer des disponibilités</p>
                    <p className="text-sm text-gray-600">
                      Vous proposez plusieurs créneaux au prestataire et locataire
                    </p>

                    {planningOption === "propose" && (
                      <div className="mt-4 p-4 bg-orange-50 rounded-lg space-y-3">
                        {proposedSlots.length === 0 && <p className="text-sm text-gray-600">Aucun créneau proposé</p>}

                        {proposedSlots.map((slot, index) => (
                          <div key={index} className="flex items-end space-x-2">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                <input
                                  type="date"
                                  value={slot.date}
                                  onChange={(e) => updateProposedSlot(index, "date", e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Début</label>
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) => updateProposedSlot(index, "startTime", e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Fin</label>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) => updateProposedSlot(index, "endTime", e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProposedSlot(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addProposedSlot}
                          className="w-full bg-transparent"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un créneau
                        </Button>
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="planning"
                    value="organize"
                    checked={planningOption === "organize"}
                    onChange={(e) => setPlanningOption(e.target.value as "organize")}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Laisser les parties s'organiser</p>
                    <p className="text-sm text-gray-600">Le prestataire et le locataire coordonnent directement</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPlanningModal({
                  isOpen: false,
                  intervention: null,
                  acceptedQuote: null,
                })
                setPlanningOption(null)
                setDirectSchedule({ date: "", startTime: "", endTime: "" })
                setProposedSlots([])
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePlanningConfirmation}
              disabled={
                !planningOption ||
                (planningOption === "direct" &&
                  (!directSchedule.date || !directSchedule.startTime || !directSchedule.endTime)) ||
                (planningOption === "propose" && proposedSlots.length === 0)
              }
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={programmingModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setProgrammingModal({ isOpen: false, intervention: null })
            setProgrammingOption(null)
            setProgrammingDirectSchedule({ date: "", startTime: "", endTime: "" })
            setProgrammingProposedSlots([{ date: "", startTime: "", endTime: "" }])
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span>Programmer l'intervention</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Intervention Details */}
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Détails de l'intervention</h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Titre:</span> {programmingModal.intervention?.title}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span> {programmingModal.intervention?.type}
                  </p>
                  <p>
                    <span className="font-medium">Priorité:</span> {programmingModal.intervention?.priority}
                  </p>
                  <p>
                    <span className="font-medium">Logement:</span> {programmingModal.intervention?.property}
                  </p>
                  <p>
                    <span className="font-medium">Assigné à:</span> {programmingModal.intervention?.assignedTo}
                  </p>
                </div>
              </div>

              {/* Existing Availabilities */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900 mb-3">Disponibilités existantes</h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-green-800 mb-2">Locataire (Jean Martin)</p>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Clock className="h-4 w-4" />
                        <span>Vendredi 10 janvier de 08:00 à 18:00</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-green-700">
                        <Clock className="h-4 w-4" />
                        <span>Samedi 11 janvier de 09:00 à 17:00</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-blue-800 mb-2">Prestataire (Thomas Blanc)</p>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-blue-700">
                        <Clock className="h-4 w-4" />
                        <span>Vendredi 10 janvier de 14:00 à 18:00</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-blue-700">
                        <Clock className="h-4 w-4" />
                        <span>Samedi 11 janvier de 08:00 à 12:00</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-100 p-3 rounded border-l-4 border-yellow-400">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Créneaux en commun</p>
                    <div className="flex items-center space-x-2 text-sm text-yellow-700">
                      <Clock className="h-4 w-4" />
                      <span>Vendredi 10 janvier de 14:00 à 18:00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Planning Options */}
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 font-medium mb-4">Comment souhaitez-vous organiser la planification ?</p>

                <div className="space-y-3">
                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="programming"
                      value="direct"
                      checked={programmingOption === "direct"}
                      onChange={(e) => setProgrammingOption(e.target.value as "direct")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Fixer directement la date et heure</p>
                      <p className="text-sm text-gray-600">Vous définissez un créneau précis pour l'intervention</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="programming"
                      value="propose"
                      checked={programmingOption === "propose"}
                      onChange={(e) => setProgrammingOption(e.target.value as "propose")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Proposer des disponibilités</p>
                      <p className="text-sm text-gray-600">Les autres parties choisissent parmi vos créneaux</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="programming"
                      value="organize"
                      checked={programmingOption === "organize"}
                      onChange={(e) => setProgrammingOption(e.target.value as "organize")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Laisser les autres s'organiser</p>
                      <p className="text-sm text-gray-600">Le locataire et le prestataire se coordonnent directement</p>
                    </div>
                  </label>
                </div>

                {/* Direct Schedule Form */}
                {programmingOption === "direct" && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3">Définir la date et heure</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={programmingDirectSchedule.date}
                          onChange={(e) => setProgrammingDirectSchedule((prev) => ({ ...prev, date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Heure de début</label>
                          <input
                            type="time"
                            value={programmingDirectSchedule.startTime}
                            onChange={(e) =>
                              setProgrammingDirectSchedule((prev) => ({ ...prev, startTime: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Heure de fin</label>
                          <input
                            type="time"
                            value={programmingDirectSchedule.endTime}
                            onChange={(e) =>
                              setProgrammingDirectSchedule((prev) => ({ ...prev, endTime: e.target.value }))
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Proposed Slots Form */}
                {programmingOption === "propose" && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-3">Proposer des créneaux</h4>
                    <div className="space-y-3">
                      {programmingProposedSlots.map((slot, index) => (
                        <div key={index} className="grid grid-cols-1 gap-3 p-3 bg-white rounded border">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                              type="date"
                              value={slot.date}
                              onChange={(e) => {
                                const newSlots = [...programmingProposedSlots]
                                newSlots[index].date = e.target.value
                                setProgrammingProposedSlots(newSlots)
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Début</label>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => {
                                  const newSlots = [...programmingProposedSlots]
                                  newSlots[index].startTime = e.target.value
                                  setProgrammingProposedSlots(newSlots)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fin</label>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => {
                                  const newSlots = [...programmingProposedSlots]
                                  newSlots[index].endTime = e.target.value
                                  setProgrammingProposedSlots(newSlots)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>
                          {programmingProposedSlots.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newSlots = programmingProposedSlots.filter((_, i) => i !== index)
                                setProgrammingProposedSlots(newSlots)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Supprimer
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        onClick={() =>
                          setProgrammingProposedSlots([
                            ...programmingProposedSlots,
                            { date: "", startTime: "", endTime: "" },
                          ])
                        }
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un créneau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setProgrammingModal({ isOpen: false, intervention: null })
                setProgrammingOption(null)
                setProgrammingDirectSchedule({ date: "", startTime: "", endTime: "" })
                setProgrammingProposedSlots([{ date: "", startTime: "", endTime: "" }])
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleProgrammingConfirm}
              disabled={
                !programmingOption ||
                (programmingOption === "direct" &&
                  (!programmingDirectSchedule.date ||
                    !programmingDirectSchedule.startTime ||
                    !programmingDirectSchedule.endTime)) ||
                (programmingOption === "propose" &&
                  programmingProposedSlots.some((slot) => !slot.date || !slot.startTime || !slot.endTime))
              }
            >
              Confirmer la programmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={planningSuccessModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPlanningSuccessModal({
              isOpen: false,
              interventionTitle: "",
            })
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Devis accepté</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                Le devis a été accepté avec succès et l'intervention passe au statut "À programmer".
              </p>
              <p className="text-sm text-green-700 mt-2">
                Les notifications ont été envoyées au prestataire et au locataire.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() =>
                setPlanningSuccessModal({
                  isOpen: false,
                  interventionTitle: "",
                })
              }
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={executionModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExecutionModal({
              isOpen: false,
              intervention: null,
              action: null,
            })
            setExecutionComment("")
            setExecutionInternalComment("")
            setExecutionFiles([])
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {executionModal.action === "start" ? (
                <Play className="h-5 w-5 text-green-600" />
              ) : (
                <X className="h-5 w-5 text-red-600" />
              )}
              {executionModal.action === "start" ? "Exécuter l'intervention" : "Annuler l'intervention"}
            </DialogTitle>
          </DialogHeader>

          {executionModal.intervention && (
            <div className="space-y-6">
              {/* Intervention Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      Détails de l'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{executionModal.intervention.title}</h3>
                      <p className="text-gray-600 mt-1">{executionModal.intervention.description}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Type:</span>
                        <p className="text-gray-600">{executionModal.intervention.type}</p>
                      </div>
                      <div>
                        <span className="font-medium">Priorité:</span>
                        <Badge
                          variant={executionModal.intervention.priority === "urgent" ? "destructive" : "secondary"}
                        >
                          {executionModal.intervention.priority}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Durée estimée:</span>
                        <p className="text-gray-600">{executionModal.intervention.estimatedDuration}</p>
                      </div>
                      <div>
                        <span className="font-medium">Localisation:</span>
                        <p className="text-gray-600">{executionModal.intervention.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                      Planification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <span className="font-medium text-sm">Intervention programmée:</span>
                        <p className="text-blue-600 font-medium">Vendredi 10 janvier de 14:00-17:00</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Locataire:</span>
                        <p className="text-gray-600">{executionModal.intervention.tenant}</p>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Prestataire:</span>
                        <p className="text-gray-600">{executionModal.intervention.assignedTo}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {executionModal.action === "start" ? (
                      <MessageSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-red-600" />
                    )}
                    {executionModal.action === "start" ? "Commentaires d'exécution" : "Raison de l'annulation"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="execution-comment">
                      {executionModal.action === "start"
                        ? "Commentaires sur le début de l'intervention (visible par tous)"
                        : "Expliquez la raison de l'annulation (visible par tous)"}
                    </Label>
                    <Textarea
                      id="execution-comment"
                      placeholder={
                        executionModal.action === "start"
                          ? "Décrivez les conditions de début d'intervention, matériel utilisé, etc."
                          : "Expliquez pourquoi l'intervention doit être annulée..."
                      }
                      value={executionComment}
                      onChange={(e) => setExecutionComment(e.target.value)}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="execution-internal-comment">
                      Commentaire interne (visible uniquement par les gestionnaires)
                    </Label>
                    <Textarea
                      id="execution-internal-comment"
                      placeholder="Ajoutez des notes internes sur cette action..."
                      value={executionInternalComment}
                      onChange={(e) => setExecutionInternalComment(e.target.value)}
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="execution-files">Fichiers joints (optionnel)</Label>
                    <div className="mt-1">
                      <input
                        id="execution-files"
                        type="file"
                        multiple
                        onChange={handleExecutionFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    {executionFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {executionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-600">{file.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeExecutionFile(index)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setExecutionModal({
                  isOpen: false,
                  intervention: null,
                  action: null,
                })
                setExecutionComment("")
                setExecutionInternalComment("")
                setExecutionFiles([])
              }}
            >
              Fermer
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setExecutionModal((prev) => ({ ...prev, action: "cancel" }))}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button
                onClick={() => handleExecutionAction(executionModal.action!)}
                className={
                  executionModal.action === "start" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                }
              >
                {executionModal.action === "start" ? "Exécuter l'intervention" : "Confirmer l'annulation"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={executionConfirmModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExecutionConfirmModal({
              isOpen: false,
              intervention: null,
              action: null,
              comment: "",
              internalComment: "",
              files: [],
            })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Confirmer l'action
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-600">
              {executionConfirmModal.action === "start"
                ? `Êtes-vous sûr de vouloir exécuter l'intervention "${executionConfirmModal.intervention?.title}" ?`
                : `Êtes-vous sûr de vouloir annuler l'intervention "${executionConfirmModal.intervention?.title}" ?`}
            </p>
            {executionConfirmModal.comment && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium">Commentaire:</p>
                <p className="text-sm text-gray-600 mt-1">{executionConfirmModal.comment}</p>
              </div>
            )}
            {executionConfirmModal.internalComment && (
              <div className="mt-4 p-3 bg-yellow-50 rounded">
                <p className="text-sm font-medium">Commentaire interne:</p>
                <p className="text-sm text-gray-600 mt-1">{executionConfirmModal.internalComment}</p>
              </div>
            )}
            {executionConfirmModal.files.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium">Fichiers joints: {executionConfirmModal.files.length}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExecutionConfirmModal({
                  isOpen: false,
                  intervention: null,
                  action: null,
                  comment: "",
                  internalComment: "",
                  files: [],
                })
              }}
            >
              Retour
            </Button>
            <Button
              onClick={handleFinalExecutionConfirmation}
              className={
                executionConfirmModal.action === "start"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {executionConfirmModal.action === "start" ? "Exécuter" : "Annuler définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={executionSuccessModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExecutionSuccessModal({
              isOpen: false,
              action: null,
              interventionTitle: "",
            })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Action confirmée
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-600">
              {executionSuccessModal.action === "start"
                ? "L'intervention a été marquée comme en cours d'exécution."
                : "L'intervention a été annulée avec succès."}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {executionSuccessModal.action === "start"
                ? "Le prestataire et le locataire ont été notifiés du début de l'intervention."
                : "Toutes les parties concernées ont été notifiées de l'annulation."}
            </p>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setExecutionSuccessModal({
                  isOpen: false,
                  action: null,
                  interventionTitle: "",
                })
              }}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={finalizeModal.isOpen}
        onOpenChange={(open) => !open && setFinalizeModal({ isOpen: false, intervention: null })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Finaliser et payer l'intervention
            </DialogTitle>
          </DialogHeader>

          {finalizeModal.intervention && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Intervention Details */}
              <div className="space-y-4">
                {/* Intervention Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Détails de l'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Titre:</span>
                      <p className="text-sm text-muted-foreground">{finalizeModal.intervention.title}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium">Type:</span>
                        <p className="text-sm text-muted-foreground">{finalizeModal.intervention.type}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Priorité:</span>
                        <Badge variant={finalizeModal.intervention.priority === "urgent" ? "destructive" : "secondary"}>
                          {finalizeModal.intervention.priority}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Description:</span>
                      <p className="text-sm text-muted-foreground">{finalizeModal.intervention.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Quote Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Devis accepté
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Prestataire:</span>
                      <span className="text-sm">Thomas Blanc</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Montant devis:</span>
                      <span className="text-sm font-semibold">285,00 € TVAC</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Description:</span>
                      <p className="text-sm text-muted-foreground">
                        Réparation fuite robinet + remplacement joint défectueux. Matériel inclus.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Execution Comments & Payment */}
              <div className="space-y-4">
                {/* Execution Comments */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Commentaires d'exécution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Commentaires prestataire:</span>
                      <p className="text-sm text-muted-foreground bg-gray-50 p-2 rounded">
                        Intervention réalisée avec succès. Joint défectueux remplacé et robinet réparé. Test effectué,
                        plus de fuite détectée.
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Fichiers joints:</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>intervention-terminee.jpg</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Finalisation du paiement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                      <span className="text-sm font-medium">Montant devis:</span>
                      <span className="text-sm font-semibold">285,00 € TVAC</span>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="final-amount" className="text-sm font-medium">
                        Montant final payé (optionnel)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="final-amount"
                          type="number"
                          step="0.01"
                          placeholder="285.00"
                          value={finalAmount}
                          onChange={(e) => setFinalAmount(e.target.value)}
                          className="text-right"
                        />
                        <span className="text-sm text-muted-foreground">€ TVAC</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Laissez vide si le montant payé correspond au devis
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-comment" className="text-sm font-medium">
                        Commentaire de paiement (optionnel)
                      </Label>
                      <Textarea
                        id="payment-comment"
                        placeholder="Commentaires sur le paiement..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setFinalizeModal({ isOpen: false, intervention: null })}>
              Annuler
            </Button>
            <Button onClick={handleFinalizePayment} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Finaliser le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalizeConfirmModal} onOpenChange={setFinalizeConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmer la finalisation
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir finaliser cette intervention et marquer le paiement comme effectué ?
            </p>
            {finalAmount && (
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <p className="text-sm">
                  <span className="font-medium">Montant final:</span> {finalAmount} € TVAC
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeConfirmModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleFinalizeConfirmation} className="bg-green-600 hover:bg-green-700">
              Confirmer la finalisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={finalizeSuccessModal} onOpenChange={setFinalizeSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Intervention finalisée
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              L'intervention a été finalisée avec succès et le paiement a été marqué comme effectué.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setFinalizeSuccessModal(false)} className="w-full">
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
