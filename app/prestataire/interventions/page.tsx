"use client"
import {
  Search,
  Filter,
  Wrench,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Play,
  Square,
  AlertCircle,
  Check,
  X,
  User,
  Plus,
  MessageSquare,
  Euro,
} from "lucide-react"
import type React from "react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { usePrestataireData } from "@/hooks/use-prestataire-data"


const getStatusIcon = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return <AlertCircle className="h-4 w-4" />
    case "devis-a-fournir":
      return <FileText className="h-4 w-4" />
    case "a-programmer":
      return <Calendar className="h-4 w-4" />
    case "programmee":
      return <Clock className="h-4 w-4" />
    case "a-finaliser":
      return <AlertTriangle className="h-4 w-4" />
    case "terminee":
      return <CheckCircle className="h-4 w-4" />
    case "annulee":
      return <Square className="h-4 w-4" />
    case "rejetee":
      return <Square className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return "bg-red-100 text-red-800"
    case "devis-a-fournir":
      return "bg-orange-100 text-orange-800"
    case "a-programmer":
      return "bg-blue-100 text-blue-800"
    case "programmee":
      return "bg-purple-100 text-purple-800"
    case "a-finaliser":
      return "bg-orange-100 text-orange-800"
    case "terminee":
      return "bg-green-100 text-green-800"
    case "annulee":
      return "bg-gray-100 text-gray-800"
    case "rejetee":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return "Nouvelle demande"
    case "devis-a-fournir":
      return "Devis à fournir"
    case "a-programmer":
      return "À programmer"
    case "programmee":
      return "Programmée"
    case "a-finaliser":
      return "À finaliser"
    case "terminee":
      return "Terminée"
    case "annulee":
      return "Annulée"
    case "rejetee":
      return "Rejetée"
    default:
      return "Inconnu"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critique":
      return "bg-red-100 text-red-800"
    case "urgent":
      return "bg-orange-100 text-orange-800"
    case "normale":
      return "bg-gray-100 text-gray-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getStatusActions = (status: string) => {
  switch (status) {
    case "nouvelle-demande":
      return [{ label: "Approuver / Rejeter", icon: CheckCircle, action: "approve-reject" }]
    case "devis-a-fournir":
      return [
        { label: "Rejeter", icon: X, action: "reject" },
        { label: "Fournir un devis", icon: FileText, action: "create-quote" },
      ]
    case "a-programmer":
      return [
        { label: "Donner ses disponibilités", icon: Calendar, action: "schedule" },
        { label: "Confirmer l'horaire", icon: CheckCircle, action: "confirm-schedule" },
      ]
    case "programmee":
      return [
        { label: "Commencer", icon: Play, action: "start" },
        { label: "Annuler", icon: X, action: "cancel" },
      ]
    case "paiement-a-recevoir":
      return [{ label: "Marquer comme payée", icon: CheckCircle, action: "mark-paid" }]
    default:
      return []
  }
}

export default function PrestatairInterventionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { interventions, loading, error } = usePrestataireData(user?.id || '')
  const [activeTab, setActiveTab] = useState("nouvelle-demande")

  // Calculate tab counts from real data
  const getStatusTabsWithCounts = () => {
    const statusCounts: Record<string, number> = {}
    interventions.forEach((intervention) => {
      const status = intervention.status
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })

    return [
      { key: "nouvelle-demande", label: "Nouvelles demandes", count: statusCounts["nouvelle-demande"] || 0, color: "text-red-600", alertColor: "text-red-500" },
      {
        key: "devis-a-fournir",
        label: "Devis à fournir",
        count: statusCounts["devis-a-fournir"] || 0,
        color: "text-orange-600",
        alertColor: "text-orange-500",
      },
      { key: "a-programmer", label: "À programmer", count: statusCounts["a-programmer"] || 0, color: "text-blue-600", alertColor: "" },
      { key: "programmee", label: "Programmée", count: statusCounts["programmee"] || 0, color: "text-purple-600", alertColor: "" },
      {
        key: "paiement-a-recevoir",
        label: "Paiement à recevoir",
        count: statusCounts["paiement-a-recevoir"] || 0,
        color: "text-orange-600",
        alertColor: "text-orange-500",
      },
      { key: "terminee", label: "Terminée", count: statusCounts["terminee"] || 0, color: "text-green-600", alertColor: "" },
      { key: "annulee", label: "Annulée", count: statusCounts["annulee"] || 0, color: "text-gray-600", alertColor: "" },
      { key: "rejetee", label: "Rejetée", count: statusCounts["rejetee"] || 0, color: "text-red-600", alertColor: "" },
    ]
  }

  const statusTabs = getStatusTabsWithCounts()
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
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    intervention: any
    action: "approve" | "reject" | null
    rejectionReason: string
  }>({
    isOpen: false,
    intervention: null,
    action: null,
    rejectionReason: "",
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
  const [quoteModal, setQuoteModal] = useState<{
    isOpen: boolean
    intervention: any
  }>({
    isOpen: false,
    intervention: null,
  })
  const [quoteLines, setQuoteLines] = useState([{ description: "", amount: "" }])
  const [quoteComment, setQuoteComment] = useState("")
  const [estimatedDuration, setEstimatedDuration] = useState("")
  const [selectedAvailabilities, setSelectedAvailabilities] = useState<string[]>([])

  const [availabilityModal, setAvailabilityModal] = useState<{
    isOpen: boolean
    intervention: any
  }>({
    isOpen: false,
    intervention: null,
  })
  const [prestataireAvailabilities, setPrestataireAvailabilities] = useState([{ date: "", startTime: "", endTime: "" }])

  const [scheduleConfirmModal, setScheduleConfirmModal] = useState<{
    isOpen: boolean
    intervention: any
  }>({
    isOpen: false,
    intervention: null,
  })

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
  const [executionFiles, setExecutionFiles] = useState<File[]>([])
  const [executionConfirmModal, setExecutionConfirmModal] = useState<{
    isOpen: boolean
    intervention: any
    action: "start" | "cancel" | null
    comment: string
    files: File[]
  }>({
    isOpen: false,
    intervention: null,
    action: null,
    comment: "",
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

  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    intervention: any
  }>({
    isOpen: false,
    intervention: null,
  })

  const [paymentComment, setPaymentComment] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")

  const handleViewDetails = (interventionId: string) => {
    router.push(`/prestataire/interventions/${interventionId}`)
  }

  const handleAction = (interventionId: string, action: string) => {
    console.log(`Action ${action} for intervention ${interventionId}`)

    if (action === "create-quote") {
      const intervention = interventions.find((i) => i.id === interventionId)
      if (intervention) {
        setQuoteModal({
          isOpen: true,
          intervention,
        })
      }
    } else if (action === "schedule") {
      const intervention = interventions.find((i) => i.id === interventionId)
      if (intervention) {
        setAvailabilityModal({
          isOpen: true,
          intervention,
        })
        setPrestataireAvailabilities([{ date: "", startTime: "", endTime: "" }])
      }
    } else if (action === "confirm-schedule") {
      const intervention = interventions.find((i) => i.id === interventionId)
      if (intervention) {
        handleConfirmSchedule(intervention)
      }
    } else if (action === "start" || action === "cancel") {
      const intervention = interventions.find((i) => i.id === interventionId)
      if (intervention) {
        setExecutionModal({
          isOpen: true,
          intervention,
          action: action as "start" | "cancel",
        })
        setExecutionComment("")
        setExecutionFiles([])
      }
    } else if (action === "mark-paid") {
      const intervention = interventions.find((i) => i.id === interventionId)
      if (intervention) {
        setPaymentModal({
          isOpen: true,
          intervention,
        })
        setPaymentComment("")
        setPaymentAmount("")
      }
    }
    // TODO: Implement other specific actions
  }

  const handleApprovalAction = (intervention: any, action: "approve" | "reject") => {
    setApprovalModal({
      isOpen: true,
      intervention,
      action,
    })
    setRejectionReason("")
  }

  const handleConfirmAction = () => {
    if (approvalModal.action === "approve") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "approve",
        rejectionReason: "",
      })
    } else if (approvalModal.action === "reject") {
      setConfirmationModal({
        isOpen: true,
        intervention: approvalModal.intervention,
        action: "reject",
        rejectionReason: rejectionReason,
      })
    }

    setApprovalModal({ isOpen: false, intervention: null, action: null })
  }

  const handleFinalConfirmation = () => {
    console.log(
      `[v0] ${confirmationModal.action === "approve" ? "Approving" : "Rejecting"} intervention ${confirmationModal.intervention?.id}`,
    )
    if (confirmationModal.action === "reject") {
      console.log(`[v0] Rejection reason: ${confirmationModal.rejectionReason}`)
    }

    if (confirmationModal.action === "approve") {
      // TODO: Update the intervention status in database
      console.log("Approving intervention:", confirmationModal.intervention?.id)
    }

    setSuccessModal({
      isOpen: true,
      action: confirmationModal.action,
      interventionTitle: confirmationModal.intervention?.title || "",
    })

    setConfirmationModal({
      isOpen: false,
      intervention: null,
      action: null,
      rejectionReason: "",
    })
    setRejectionReason("")
  }

  const addQuoteLine = () => {
    const newId = Math.max(...quoteLines.map((line) => (line.id ? line.id : 0))) + 1
    setQuoteLines([...quoteLines, { id: newId, description: "", amount: "" }])
  }

  const removeQuoteLine = (id: number) => {
    if (quoteLines.length > 1) {
      setQuoteLines(quoteLines.filter((line) => line.id !== id))
    }
  }

  const updateQuoteLine = (id: number, field: string, value: any) => {
    setQuoteLines(quoteLines.map((line) => (line.id === id ? { ...line, [field]: value } : line)))
  }

  const calculateTotal = () => {
    return quoteLines.reduce((total, line) => {
      const amount = Number.parseFloat(line.amount) || 0
      return total + amount
    }, 0)
  }

  const handleSubmitQuote = () => {
    console.log("[v0] Submitting quote:", {
      intervention: quoteModal.intervention?.id,
      lines: quoteLines,
      total: calculateTotal(),
      comment: quoteComment,
      duration: estimatedDuration,
      selectedAvailabilities: selectedAvailabilities,
    })

    // Close modal and show success
    setQuoteModal({ isOpen: false, intervention: null })
    setQuoteLines([{ description: "", amount: "" }])
    setQuoteComment("")
    setEstimatedDuration("")
    setSelectedAvailabilities([])

    // TODO: Show success message
  }

  const addPrestataireAvailability = () => {
    setPrestataireAvailabilities([...prestataireAvailabilities, { date: "", startTime: "", endTime: "" }])
  }

  const removePrestataireAvailability = (index: number) => {
    if (prestataireAvailabilities.length > 1) {
      setPrestataireAvailabilities(prestataireAvailabilities.filter((_, i) => i !== index))
    }
  }

  const updatePrestataireAvailability = (index: number, field: string, value: string) => {
    const updated = [...prestataireAvailabilities]
    updated[index] = { ...updated[index], [field]: value }
    setPrestataireAvailabilities(updated)
  }

  const getCommonAvailabilities = () => {
    // Mock logic to find common availabilities
    const clientAvailabilities = [
      { date: "2025-01-10", startTime: "08:00", endTime: "18:00" },
      { date: "2025-01-11", startTime: "09:00", endTime: "17:00" },
    ]

    const common = []
    prestataireAvailabilities.forEach((prestAvail) => {
      if (prestAvail.date && prestAvail.startTime && prestAvail.endTime) {
        clientAvailabilities.forEach((clientAvail) => {
          if (prestAvail.date === clientAvail.date) {
            const startTime =
              prestAvail.startTime > clientAvail.startTime ? prestAvail.startTime : clientAvail.startTime
            const endTime = prestAvail.endTime < clientAvail.endTime ? prestAvail.endTime : clientAvail.endTime
            if (startTime < endTime) {
              common.push({
                date: prestAvail.date,
                startTime,
                endTime,
              })
            }
          }
        })
      }
    })
    return common
  }

  const handleSubmitAvailabilities = () => {
    console.log("[v0] Submitting prestataire availabilities:", prestataireAvailabilities)
    setAvailabilityModal({ isOpen: false, intervention: null })
  }

  const handleConfirmSchedule = (intervention: any) => {
    setScheduleConfirmModal({
      isOpen: true,
      intervention: intervention,
    })
  }

  const handleFinalScheduleConfirmation = () => {
    console.log(`[v0] Confirming schedule for intervention ${scheduleConfirmModal.intervention?.id}`)

    // TODO: Update the intervention status to "programmee" in database
    console.log("Confirming schedule for intervention:", scheduleConfirmModal.intervention?.id)

    setScheduleConfirmModal({
      isOpen: false,
      intervention: null,
    })

    // Show success message or redirect as needed
    console.log(`[v0] Intervention ${scheduleConfirmModal.intervention?.id} status updated to programmee`)
  }

  const handleExecutionAction = (action: "start" | "cancel") => {
    setExecutionConfirmModal({
      isOpen: true,
      intervention: executionModal.intervention,
      action,
      comment: executionComment,
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

    // TODO: Update intervention status in database
    console.log(`${action === "start" ? "Starting" : "Cancelling"} intervention:`, intervention?.id)

    setExecutionConfirmModal({
      isOpen: false,
      intervention: null,
      action: null,
      comment: "",
      files: [],
    })

    setExecutionSuccessModal({
      isOpen: true,
      interventionTitle: "",
      action,
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setExecutionFiles((prev) => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setExecutionFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const filteredInterventions = interventions.filter((intervention) => intervention.status === activeTab)

  const handlePaymentSubmit = () => {
    setPaymentModal({ isOpen: false, intervention: null })

    // TODO: Update intervention status to completed in database
    console.log("Marking intervention as completed:", paymentModal.intervention?.id)

    setExecutionSuccessModal({
      isOpen: true,
      interventionTitle: "",
      action: null,
    })
  }

  if (loading) {
    return (
      <div className="py-2">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex-1 h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-2">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-2">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mes Interventions</h1>
        <p className="text-gray-600">Gérez les interventions qui vous sont assignées</p>
      </div>
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-blue-600 shadow-sm"
                  : `text-gray-600 hover:text-gray-900 ${tab.color}`
              }`}
            >
              {tab.alertColor && <AlertCircle className={`h-4 w-4 mr-1 ${tab.alertColor}`} />}
              <span className="truncate">{tab.label}</span>
              <Badge variant="secondary" className="ml-2 text-xs">
                {tab.count}
              </Badge>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center space-x-2 mb-4">
          <Wrench className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            {statusTabs.find((tab) => tab.key === activeTab)?.label} ({filteredInterventions.length})
          </h2>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Rechercher par titre, description, ou adresse..." className="pl-10" />
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
                      <Badge className={getStatusColor(intervention.status)}>
                        {getStatusIcon(intervention.status)}
                        <span className="ml-1">{getStatusLabel(intervention.status)}</span>
                      </Badge>
                      <Badge className={getPriorityColor(intervention.priority)}>
                        {intervention.priority.charAt(0).toUpperCase() + intervention.priority.slice(1)}
                      </Badge>
                      {intervention.needsQuote && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <FileText className="h-3 w-3 mr-1" />
                          Devis requis
                        </Badge>
                      )}
                    </div>

                    <p className="text-gray-600 mb-3">{intervention.description}</p>

                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{intervention.location}</span>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span>
                        <strong>Type:</strong> {intervention.type}
                      </span>
                      <span>
                        <strong>Locataire:</strong> {intervention.tenant}
                      </span>
                      <span>
                        <strong>Créée le:</strong> {new Date(intervention.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                      <span>
                        <strong>Durée estimée:</strong> {intervention.estimatedDuration}
                      </span>
                    </div>

                    <div className="mt-2 text-sm text-gray-500">
                      <span>
                        <strong>Demandée par:</strong> {intervention.requestedBy}
                      </span>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDetails(intervention.id)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Détails
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {intervention.status === "nouvelle-demande" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprovalAction(intervention, "approve")}>
                              <Check className="h-4 w-4 mr-2" />
                              Approuver / Rejeter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {intervention.status === "devis-a-fournir" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprovalAction(intervention, "reject")}>
                              <X className="h-4 w-4 mr-2" />
                              Rejeter
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}

                        {getStatusActions(intervention.status)
                          .filter((action) => action.action !== "accept" && action.action !== "refuse")
                          .map((action) => (
                            <DropdownMenuItem
                              key={action.action}
                              onClick={() => handleAction(intervention.id, action.action)}
                            >
                              <action.icon className="h-4 w-4 mr-2" />
                              {action.label}
                            </DropdownMenuItem>
                          ))}

                        {(intervention.status !== "nouvelle-demande" ||
                          getStatusActions(intervention.status).filter(
                            (action) => action.action !== "accept" && action.action !== "refuse",
                          ).length > 0) && <DropdownMenuSeparator />}
                        <DropdownMenuItem onClick={() => handleAction(intervention.id, "edit")}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAction(intervention.id, "delete")}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* Execution Modal */}
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
              {executionModal.action === "start" ? "Commencer l'intervention" : "Annuler l'intervention"}
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
                        ? "Commentaires sur le début de l'intervention"
                        : "Expliquez la raison de l'annulation"}
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
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="execution-files">Fichiers joints (optionnel)</Label>
                    <div className="mt-1">
                      <input
                        id="execution-files"
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                    {executionFiles.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {executionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm text-gray-600">{file.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExecutionModal({
                  isOpen: false,
                  intervention: null,
                  action: null,
                })
                setExecutionComment("")
                setExecutionFiles([])
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={() => handleExecutionAction(executionModal.action!)}
              className={
                executionModal.action === "start" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }
            >
              {executionModal.action === "start" ? "Commencer l'intervention" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Execution Confirmation Modal */}
      <Dialog
        open={executionConfirmModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setExecutionConfirmModal({
              isOpen: false,
              intervention: null,
              action: null,
              comment: "",
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
                ? `Êtes-vous sûr de vouloir commencer l'intervention "${executionConfirmModal.intervention?.title}" ?`
                : `Êtes-vous sûr de vouloir annuler l'intervention "${executionConfirmModal.intervention?.title}" ?`}
            </p>
            {executionConfirmModal.comment && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium">Commentaire:</p>
                <p className="text-sm text-gray-600 mt-1">{executionConfirmModal.comment}</p>
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
              {executionConfirmModal.action === "start" ? "Commencer" : "Annuler définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Execution Success Modal */}
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
              {executionSuccessModal.action === "start" ? "Intervention commencée" : "Intervention annulée"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-600">
              {executionSuccessModal.action === "start"
                ? `L'intervention "${executionSuccessModal.interventionTitle}" a été marquée comme commencée. Le statut est maintenant "À finaliser".`
                : `L'intervention "${executionSuccessModal.interventionTitle}" a été annulée. Une notification a été envoyée aux parties concernées.`}
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
        open={approvalModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setApprovalModal({ isOpen: false, intervention: null, action: null })
            setRejectionReason("")
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Examiner la demande d'intervention</DialogTitle>
          </DialogHeader>

          {approvalModal.intervention && (
            <div className="grid grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Logement concerné</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Localisation:</span> {approvalModal.intervention.location}
                    </p>
                    <p>
                      <span className="font-medium">Locataire:</span> {approvalModal.intervention.tenant}
                    </p>
                    <p>
                      <span className="font-medium">Surface:</span> 65 m²
                    </p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Wrench className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">Détails du problème</h3>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">{approvalModal.intervention.title}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Type:</span>
                        <p className="text-gray-600">{approvalModal.intervention.type}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Priorité:</span>
                        <Badge className={getPriorityColor(approvalModal.intervention.priority)}>
                          {approvalModal.intervention.priority.charAt(0).toUpperCase() +
                            approvalModal.intervention.priority.slice(1)}
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
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">Fichiers joints</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>fuite-robinet.jpg (2.1 MB)</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span>degats-plafond.jpg (1.8 MB)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Disponibilités proposées</h3>
                  </div>
                  <div className="space-y-2">
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

                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <User className="h-5 w-5 text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Informations complémentaires</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Date de création:</span>
                      <p className="text-gray-600">
                        {new Date(approvalModal.intervention.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Durée estimée:</span>
                      <p className="text-gray-600">{approvalModal.intervention.estimatedDuration}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Demandée par:</span>
                      <p className="text-gray-600">{approvalModal.intervention.requestedBy}</p>
                    </div>
                    {approvalModal.intervention.needsQuote && (
                      <div>
                        <span className="font-medium text-gray-700">Devis requis:</span>
                        <Badge variant="outline" className="text-blue-600 border-blue-200 ml-2">
                          <FileText className="h-3 w-3 mr-1" />
                          Oui
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setApprovalModal({ isOpen: false, intervention: null, action: null })
                setRejectionReason("")
              }}
            >
              Fermer
            </Button>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  setApprovalModal((prev) => ({ ...prev, action: "approve" }))
                  handleConfirmAction()
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Approuver
              </Button>
              <Button
                variant="outline"
                onClick={() => setApprovalModal((prev) => ({ ...prev, action: "reject" }))}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={confirmationModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmationModal({
              isOpen: false,
              intervention: null,
              action: null,
              rejectionReason: "",
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
                ? "Êtes-vous sûr de vouloir accepter cette intervention ?"
                : "Êtes-vous sûr de vouloir refuser cette intervention ?"}
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
              {confirmationModal.action === "reject" ? "Confirmer le refus" : "Confirmer l'acceptation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              <span>{successModal.action === "approve" ? "Intervention acceptée" : "Intervention refusée"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                {successModal.action === "approve"
                  ? "Vous avez accepté cette intervention avec succès."
                  : "Vous avez refusé cette intervention."}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Une notification vient d'être envoyée au gestionnaire
                {successModal.action === "reject" ? " avec la raison du refus" : ""}.
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
      <Dialog
        open={quoteModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setQuoteModal({ isOpen: false, intervention: null })
            setQuoteLines([{ description: "", amount: "" }])
            setQuoteComment("")
            setEstimatedDuration("")
            setSelectedAvailabilities([])
          }
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer un devis</DialogTitle>
          </DialogHeader>

          {quoteModal.intervention && (
            <div className="space-y-6">
              {/* Intervention Details Summary */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">{quoteModal.intervention.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Localisation:</span> {quoteModal.intervention.location}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {quoteModal.intervention.type}
                  </div>
                  <div>
                    <span className="font-medium">Priorité:</span>
                    <Badge className={`ml-2 ${getPriorityColor(quoteModal.intervention.priority)}`}>
                      {quoteModal.intervention.priority.charAt(0).toUpperCase() +
                        quoteModal.intervention.priority.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Durée estimée:</span> {quoteModal.intervention.estimatedDuration}
                  </div>
                </div>
              </div>

              {/* Duration Input Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Durée estimée de l'intervention (optionnel)</label>
                <Input
                  placeholder="Ex: 2-3 heures, 1 journée, etc."
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                />
              </div>

              {/* Availability Selection Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Disponibilités proposées</h3>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Sélectionnez les créneaux qui vous conviennent parmi ceux proposés :
                  </p>
                  <div className="space-y-2">
                    {/* Mock availabilities - in real app, these would come from the intervention data */}
                    {[
                      { id: "1", label: "Vendredi 10 janvier de 08:00 à 18:00", value: "2025-01-10-08:00-18:00" },
                      { id: "2", label: "Samedi 11 janvier de 09:00 à 17:00", value: "2025-01-11-09:00-17:00" },
                    ].map((availability) => (
                      <div key={availability.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={availability.id}
                          checked={selectedAvailabilities.includes(availability.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAvailabilities([...selectedAvailabilities, availability.value])
                            } else {
                              setSelectedAvailabilities(
                                selectedAvailabilities.filter((av) => av !== availability.value),
                              )
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={availability.id} className="text-sm text-gray-700 cursor-pointer">
                          {availability.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quote Lines */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Lignes du devis</h3>
                  <Button onClick={addQuoteLine} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une ligne
                  </Button>
                </div>

                <div className="space-y-3">
                  {quoteLines.map((line, index) => (
                    <div key={line.id || index} className="grid grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                      <div className="col-span-7">
                        <Input
                          placeholder="Description du poste de coût"
                          value={line.description}
                          onChange={(e) => updateQuoteLine(line.id, "description", e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={line.amount}
                          onChange={(e) => updateQuoteLine(line.id, "amount", e.target.value)}
                          className="text-right"
                        />
                        <span className="text-sm font-medium text-gray-600 whitespace-nowrap">€ TVAC</span>
                      </div>
                      <div className="col-span-1">
                        {quoteLines.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuoteLine(line.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comment Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Commentaire (optionnel)</label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Ajoutez des détails, explications ou conditions particulières concernant ce devis..."
                  value={quoteComment}
                  onChange={(e) => setQuoteComment(e.target.value)}
                />
              </div>

              {/* Total */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total du devis:</span>
                  <span className="text-xl font-bold text-blue-600">{calculateTotal().toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setQuoteModal({ isOpen: false, intervention: null })
                setQuoteLines([{ description: "", amount: "" }])
                setQuoteComment("")
                setEstimatedDuration("")
                setSelectedAvailabilities([])
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmitQuote} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              Envoyer le devis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={availabilityModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAvailabilityModal({ isOpen: false, intervention: null })
            setPrestataireAvailabilities([{ date: "", startTime: "", endTime: "" }])
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Planification & Disponibilités</span>
            </DialogTitle>
          </DialogHeader>

          {availabilityModal.intervention && (
            <div className="space-y-6">
              {/* Intervention programmée section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Intervention programmée</h3>
                <div className="text-blue-600 font-medium">vendredi 10 janvier de 14:00-17:00</div>
              </div>

              {/* Vos disponibilités section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Vos disponibilités</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addPrestataireAvailability}>
                    Modifier
                  </Button>
                </div>

                <div className="space-y-2">
                  {prestataireAvailabilities.map((availability, index) => (
                    <div key={index} className="space-y-2">
                      {availability.date && availability.startTime && availability.endTime ? (
                        <div className="flex items-center space-x-2 text-sm text-blue-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(availability.date).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}{" "}
                            de {availability.startTime} à {availability.endTime}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
                          <Input
                            type="date"
                            value={availability.date}
                            onChange={(e) => updatePrestataireAvailability(index, "date", e.target.value)}
                            className="flex-1"
                            placeholder="Date"
                          />
                          <Input
                            type="time"
                            value={availability.startTime}
                            onChange={(e) => updatePrestataireAvailability(index, "startTime", e.target.value)}
                            className="w-24"
                          />
                          <span className="text-sm text-gray-500">à</span>
                          <Input
                            type="time"
                            value={availability.endTime}
                            onChange={(e) => updatePrestataireAvailability(index, "endTime", e.target.value)}
                            className="w-24"
                          />
                          {prestataireAvailabilities.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePrestataireAvailability(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Show formatted availabilities */}
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>vendredi 10 janvier de 14:00 à 18:00</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Clock className="h-4 w-4" />
                    <span>samedi 11 janvier de 08:00 à 12:00</span>
                  </div>
                </div>
              </div>

              {/* Disponibilités du locataire section */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Disponibilités du locataire</h3>
                <div className="text-sm text-gray-600 mb-2">Jean Martin (Locataire)</div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <Clock className="h-4 w-4" />
                    <span>vendredi 10 janvier de 08:00 à 18:00</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <Clock className="h-4 w-4" />
                    <span>samedi 11 janvier de 09:00 à 17:00</span>
                  </div>
                </div>
              </div>

              {/* Common availabilities */}
              {getCommonAvailabilities().length > 0 && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">Créneaux en commun</h3>
                  </div>
                  <div className="space-y-2">
                    {getCommonAvailabilities().map((common, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-sm text-green-700 bg-green-100 p-2 rounded"
                      >
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(common.date).toLocaleDateString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}{" "}
                          de {common.startTime} à {common.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAvailabilityModal({ isOpen: false, intervention: null })
                setPrestataireAvailabilities([{ date: "", startTime: "", endTime: "" }])
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleSubmitAvailabilities}>Envoyer les disponibilités</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={scheduleConfirmModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setScheduleConfirmModal({ isOpen: false, intervention: null })
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>Confirmer l'horaire d'intervention</span>
            </DialogTitle>
          </DialogHeader>

          {scheduleConfirmModal.intervention && (
            <div className="space-y-6">
              {/* Intervention details */}
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Wrench className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Détails de l'intervention</h3>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">{scheduleConfirmModal.intervention.title}</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <p className="text-gray-600">{scheduleConfirmModal.intervention.type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Priorité:</span>
                      <Badge className={getPriorityColor(scheduleConfirmModal.intervention.priority)}>
                        {scheduleConfirmModal.intervention.priority.charAt(0).toUpperCase() +
                          scheduleConfirmModal.intervention.priority.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Localisation:</span>
                    <p className="text-gray-600">{scheduleConfirmModal.intervention.location}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="text-gray-600">{scheduleConfirmModal.intervention.description}</p>
                  </div>
                </div>
              </div>

              {/* Scheduled time */}
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Clock className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-gray-900">Horaire proposé</h3>
                </div>
                <div className="text-lg font-medium text-green-700">Vendredi 10 janvier de 14:00 à 17:00</div>
                <p className="text-sm text-gray-600 mt-1">Créneau en commun avec les disponibilités du locataire</p>
              </div>

              {/* Additional info */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Durée estimée:</span>
                    <p className="text-gray-600">{scheduleConfirmModal.intervention.estimatedDuration}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Locataire:</span>
                    <p className="text-gray-600">{scheduleConfirmModal.intervention.tenant}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleConfirmModal({ isOpen: false, intervention: null })}>
              Annuler
            </Button>
            <Button onClick={handleFinalScheduleConfirmation} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Confirmer l'horaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={paymentModal.isOpen}
        onOpenChange={(open) => !open && setPaymentModal({ isOpen: false, intervention: null })}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              Marquer comme payée
            </DialogTitle>
          </DialogHeader>

          {paymentModal.intervention && (
            <div className="space-y-6">
              {/* Intervention Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Détails de l'intervention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Titre:</span>
                      <p className="text-sm text-gray-600">{paymentModal.intervention.title}</p>
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>
                      <span className="ml-2 text-sm">{paymentModal.intervention.type}</span>
                    </div>
                    <div>
                      <span className="font-medium">Localisation:</span>
                      <p className="text-sm text-gray-600">{paymentModal.intervention.location}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Devis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Montant du devis:</span>
                      <span className="ml-2 text-lg font-semibold text-green-600">280€ TVAC</span>
                    </div>
                    <div>
                      <span className="font-medium">Statut:</span>
                      <Badge variant="secondary" className="ml-2">
                        Accepté
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mission Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Commentaires de mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Intervention terminée avec succès. Remplacement du robinet défaillant et réparation de la
                    tuyauterie.
                  </p>
                </CardContent>
              </Card>

              {/* Payment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Détails du paiement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="payment-comment">Commentaire de facturation</Label>
                    <Textarea
                      id="payment-comment"
                      placeholder="Ajoutez un commentaire sur la facturation..."
                      value={paymentComment}
                      onChange={(e) => setPaymentComment(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-amount">Montant payé (si différent du devis)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="payment-amount"
                        type="number"
                        placeholder="280"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="text-right"
                      />
                      <span className="text-sm text-gray-500">€ TVAC</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Laissez vide si le montant payé correspond au devis</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModal({ isOpen: false, intervention: null })}>
              Annuler
            </Button>
            <Button onClick={handlePaymentSubmit} className="bg-green-600 hover:bg-green-700">
              Confirmer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
