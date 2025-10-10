"use client" // ✅ Client Component (UI Layer - Interactivité)

import React, { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Eye,
  User,
  Wrench,
  Plus,
  AlertCircle,
  Home,
  Mail,
  RefreshCw,
  X,
  UserX,
  Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  type Contact as ContactType,
  type Intervention as InterventionType,
  type Lot as LotType,
  type Building as BuildingType
} from '@/lib/services'
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { PropertiesNavigator } from "@/components/properties/properties-navigator"
import { ContactDetailHeader } from "@/components/contact-detail-header"
import { logger } from '@/lib/logger'
import { useToast } from "@/hooks/use-toast"

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ContactDetailsClientProps {
  contactId: string
  initialContact: ContactType
  initialInterventions: InterventionType[]
  initialProperties: Array<(LotType & { type: 'lot' }) | (BuildingType & { type: 'building' })>
  initialInvitationStatus?: string | null
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}

const userRoles = [
  { value: "locataire", label: "Locataire", color: "bg-blue-100 text-blue-800" },
  { value: "gestionnaire", label: "Gestionnaire", color: "bg-purple-100 text-purple-800" },
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" }
]

const providerCategories = [
  { value: "prestataire", label: "Service général" },
  { value: "syndic", label: "Syndic" },
  { value: "notaire", label: "Notaire" },
  { value: "assurance", label: "Assurance" },
  { value: "proprietaire", label: "Propriétaire" },
  { value: "autre", label: "Autre" }
]

const specialities = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
  { value: "autre", label: "Autre" }
]

// ============================================================================
// CLIENT COMPONENT
// ============================================================================

export function ContactDetailsClient({
  contactId,
  initialContact,
  initialInterventions,
  initialProperties,
  initialInvitationStatus,
  currentUser
}: ContactDetailsClientProps) {
  const router = useRouter()

  // ============================================================================
  // STATE (UI uniquement - pas de data fetching)
  // ============================================================================
  const [activeTab, setActiveTab] = useState("overview")
  const [invitationStatus, setInvitationStatus] = useState<string | null>(initialInvitationStatus ?? null)
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [invitationId, setInvitationId] = useState<string | null>(null)

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showResendModal, setShowResendModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revokeConfirmChecked, setRevokeConfirmChecked] = useState(false)

  // Utiliser les données initiales du Server Component
  const contact = initialContact
  const interventions = initialInterventions
  const properties = initialProperties

  const { toast } = useToast()

  // ============================================================================
  // HANDLERS (Actions utilisateur)
  // ============================================================================

  const handleBack = () => {
    router.push("/gestionnaire/contacts")
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/contacts/modifier/${contactId}`)
  }

  const handleArchive = () => {
    logger.info("Archive contact:", contact?.id)
    // TODO: Implémenter la logique d'archivage
  }

  const handleInvitationAction = async (action: string) => {
    if (!contact?.id) return

    logger.info("Invitation action:", action, "for contact:", contact.id)

    switch (action) {
      case "open-chat":
        logger.info("Opening chat with contact:", contact.id)
        break
      case "send-invitation":
        await handleSendInvitation()
        break
      case "resend-invitation":
        await handleResendInvitation()
        break
      case "revoke-invitation":
        await handleRevokeInvitation()
        break
      default:
        logger.info("Unknown invitation action:", action)
    }
  }

  const handleSendInvitation = async () => {
    if (!contact?.id) return

    try {
      setInvitationLoading(true)
      logger.info("🔄 Sending invitation to existing contact:", contact.id)

      const response = await fetch("/api/send-existing-contact-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id
        }),
      })

      if (response.ok) {
        const { invitationId, isNewAuthUser } = await response.json()
        setInvitationId(invitationId)
        logger.info("✅ Invitation sent successfully", { isNewAuthUser })

        toast({
          title: "✅ Invitation envoyée",
          description: isNewAuthUser
            ? `Une invitation a été envoyée à ${contact.email}`
            : `${contact.name} a été ajouté à votre équipe (compte existant)`,
          variant: "default"
        })

        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("❌ Failed to send invitation:", error)
        toast({
          title: "❌ Erreur",
          description: error.error || "Impossible d'envoyer l'invitation",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("❌ Error sending invitation:", error)
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setShowInviteModal(false)
    }
  }

  const handleResendInvitation = async () => {
    if (!invitationId) {
      toast({
        title: "❌ Erreur",
        description: "ID d'invitation manquant",
        variant: "destructive"
      })
      return
    }

    try {
      setInvitationLoading(true)
      logger.info("🔄 Resending invitation:", invitationId)

      const response = await fetch("/api/resend-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      })

      if (response.ok) {
        logger.info("✅ Invitation resent successfully")
        toast({
          title: "✅ Invitation renvoyée",
          description: `Un nouvel email a été envoyé à ${contact.email}`,
          variant: "default"
        })
        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("❌ Failed to resend invitation:", error)
        toast({
          title: "❌ Erreur",
          description: error.error || "Impossible de renvoyer l'invitation",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("❌ Error resending invitation:", error)
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setShowResendModal(false)
    }
  }

  const handleCancelInvitation = async () => {
    if (!contact?.email || !contact?.id) return

    try {
      setInvitationLoading(true)
      logger.info("🔄 Cancelling invitation for:", contact.email)

      const response = await fetch("/api/revoke-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: contact.email,
          contactId: contact.id
        }),
      })

      if (response.ok) {
        logger.info("✅ Invitation cancelled successfully")
        toast({
          title: "✅ Invitation annulée",
          description: `L'invitation de ${contact.name} a été annulée`,
          variant: "default"
        })
        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("❌ Failed to cancel invitation:", error)
        toast({
          title: "❌ Erreur",
          description: error.error || "Impossible d'annuler l'invitation",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("❌ Error cancelling invitation:", error)
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setShowCancelModal(false)
    }
  }

  const handleRevokeAccess = async () => {
    if (!contact?.email || !contact?.id) return
    if (!revokeConfirmChecked) return

    try {
      setInvitationLoading(true)
      logger.info("🔄 Revoking access for:", contact.email)

      const response = await fetch("/api/revoke-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactEmail: contact.email,
          contactId: contact.id
        }),
      })

      if (response.ok) {
        logger.info("✅ Access revoked successfully")
        toast({
          title: "✅ Accès révoqué",
          description: `${contact.name} ne peut plus se connecter à l'application`,
          variant: "default"
        })
        await loadInvitationStatus()
      } else {
        const error = await response.json()
        logger.error("❌ Failed to revoke access:", error)
        toast({
          title: "❌ Erreur",
          description: error.error || "Impossible de révoquer l'accès",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error("❌ Error revoking access:", error)
      toast({
        title: "❌ Erreur",
        description: "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setInvitationLoading(false)
      setRevokeConfirmChecked(false)
      setShowRevokeModal(false)
    }
  }

  const loadInvitationStatus = useCallback(async () => {
    try {
      setInvitationLoading(true)
      logger.info("🔍 Loading invitation status for contact:", contactId)

      const response = await fetch(`/api/contact-invitation-status?contactId=${contactId}`)

      if (response.ok) {
        const { status, invitationId } = await response.json()
        setInvitationStatus(status)
        setInvitationId(invitationId) // 🆕 Store invitationId for resend action
        logger.info("✅ Invitation status loaded:", status)
      } else {
        logger.info("ℹ️ No invitation found for this contact")
        setInvitationStatus(null)
        setInvitationId(null) // 🆕 Clear invitationId
      }
    } catch (error) {
      logger.error("❌ Error loading invitation status:", error)
      setInvitationStatus(null)
      setInvitationId(null) // 🆕 Clear invitationId
    } finally {
      setInvitationLoading(false)
    }
  }, [contactId])

  // ============================================================================
  // EFFECTS (Side effects on mount/update)
  // ============================================================================

  // Load invitation status when component mounts
  useEffect(() => {
    loadInvitationStatus()
  }, [loadInvitationStatus])

  // ============================================================================
  // COMPUTED VALUES (Dérivés du state)
  // ============================================================================

  const getInvitationStatusBadge = () => {
    if (invitationLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-500">Vérification...</span>
        </div>
      )
    }

    if (!invitationStatus) {
      return (
        <Badge variant="secondary" className="bg-slate-100 text-slate-600">
          Pas de compte
        </Badge>
      )
    }

    const statusConfig = {
      pending: { label: 'Invitation envoyée', class: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Actif', class: 'bg-green-100 text-green-800' },
      expired: { label: 'Invitation expirée', class: 'bg-amber-100 text-amber-800' },
      cancelled: { label: 'Invitation annulée', class: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[invitationStatus as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge variant="secondary" className={`${config.class} font-medium`}>
        {config.label}
      </Badge>
    )
  }

  const getStats = () => {
    const interventionStats = {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'demande').length,
      inProgress: interventions.filter(i => ['en_cours', 'planifiee', 'planification'].includes(i.status)).length,
      completed: interventions.filter(i => i.status.startsWith('cloturee')).length
    }

    return {
      interventionStats,
      totalProperties: properties.length,
      totalLots: properties.filter(p => p.type === 'lot').length,
      totalBuildings: properties.filter(p => p.type === 'building').length
    }
  }

  const stats = getStats()

  const tabs = [
    { id: "overview", label: "Vue d'ensemble", icon: Eye, count: null },
    { id: "interventions", label: "Interventions", icon: Wrench, count: stats.interventionStats.total },
    { id: "properties", label: "Biens", icon: Home, count: stats.totalProperties }
  ]

  const getRoleConfig = (role: string) => {
    return userRoles.find(r => r.value === role) || userRoles[0]
  }

  const getProviderCategoryLabel = (category: string) => {
    return providerCategories.find(c => c.value === category)?.label || category
  }

  const getSpecialityLabel = (speciality: string) => {
    return specialities.find(s => s.value === speciality)?.label || speciality
  }

  const getAccessActions = () => {
    if (invitationLoading) {
      return (
        <Button disabled className="w-full" size="sm" variant="outline">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Chargement...
        </Button>
      )
    }

    // CAS 1: Pas d'invitation (null ou cancelled) → Inviter
    if (!invitationStatus || invitationStatus === 'cancelled') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowInviteModal(true)}
        >
          <Mail className="h-4 w-4 mr-2" />
          Inviter
        </Button>
      )
    }

    // CAS 2: Invitation pending ou expired → Relancer + Annuler
    if (invitationStatus === 'pending' || invitationStatus === 'expired') {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setShowResendModal(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Relancer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setShowCancelModal(true)}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      )
    }

    // CAS 3: Invitation accepted → Retirer l'accès
    if (invitationStatus === 'accepted') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowRevokeModal(true)}
        >
          <UserX className="h-4 w-4 mr-2" />
          Retirer l'accès
        </Button>
      )
    }

    return null
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <ContactDetailHeader
        contact={{
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          role: contact.role,
          provider_category: contact.provider_category,
          speciality: contact.speciality,
          createdAt: contact.created_at || new Date().toISOString(),
          createdBy: contact.created_by,
        }}
        invitationStatus={invitationStatus}
        invitationLoading={invitationLoading}
        onBack={handleBack}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onInvitationAction={handleInvitationAction}
        customActions={[]}
      />

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-100">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2 text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count !== null && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                      {tab.count}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <div className="py-8">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Informations Personnelles */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-slate-800">
                      <User className="h-5 w-5 text-slate-500" />
                      <span>Informations Personnelles</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Nom complet</span>
                      <span className="font-medium text-slate-900">{contact.name}</span>
                    </div>
                    {contact.first_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Prénom</span>
                        <span className="font-medium text-slate-900">{contact.first_name}</span>
                      </div>
                    )}
                    {contact.last_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Nom de famille</span>
                        <span className="font-medium text-slate-900">{contact.last_name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Email</span>
                      <span className="font-medium text-slate-900 text-sm">{contact.email}</span>
                    </div>
                    {contact.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Téléphone</span>
                        <span className="font-medium text-slate-900">{contact.phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Rôle</span>
                      <Badge variant="secondary" className={getRoleConfig(contact.role).color}>
                        {getRoleConfig(contact.role).label}
                      </Badge>
                    </div>
                    {contact.provider_category && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Catégorie</span>
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                          {getProviderCategoryLabel(contact.provider_category)}
                        </Badge>
                      </div>
                    )}
                    {contact.speciality && (
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Spécialité</span>
                        <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                          {getSpecialityLabel(contact.speciality)}
                        </Badge>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-slate-600 text-sm">Notes</span>
                        <p className="text-sm font-medium mt-1 text-slate-900">{contact.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Statut d'Accès */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-slate-800">
                      <AlertCircle className="h-5 w-5 text-slate-500" />
                      <span>Statut d'Accès</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Statut d'invitation</span>
                      {getInvitationStatusBadge()}
                    </div>

                    {invitationStatus === 'accepted' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">
                          ✅ Ce contact a accès à l'application et peut se connecter
                        </p>
                      </div>
                    )}

                    {invitationStatus === 'pending' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          📧 Une invitation a été envoyée à ce contact. Il doit cliquer sur le lien reçu par email pour activer son accès.
                        </p>
                      </div>
                    )}

                    {invitationStatus === 'expired' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                          ⏰ L'invitation de ce contact a expiré. Vous pouvez en envoyer une nouvelle depuis la page de modification.
                        </p>
                      </div>
                    )}

                    {invitationStatus === 'cancelled' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          🚫 L'invitation de ce contact a été annulée. Vous pouvez en envoyer une nouvelle depuis la page de modification.
                        </p>
                      </div>
                    )}

                    {!invitationStatus && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <p className="text-sm text-slate-600">
                          👤 Ce contact existe dans votre base mais n'a pas accès à l'application
                        </p>
                      </div>
                    )}

                    {getAccessActions()}
                  </CardContent>
                </Card>

                {/* Activité */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-slate-800">
                      <Wrench className="h-5 w-5 text-slate-500" />
                      <span>Activité</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Interventions totales</span>
                      <span className="font-medium text-slate-900">{stats.interventionStats.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">En attente</span>
                      <span className="font-medium text-amber-600">{stats.interventionStats.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">En cours</span>
                      <span className="font-medium text-sky-600">{stats.interventionStats.inProgress}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600 text-sm">Terminées</span>
                      <span className="font-medium text-emerald-600">{stats.interventionStats.completed}</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-600 text-sm">Biens liés</span>
                        <span className="font-medium text-slate-900">{stats.totalProperties}</span>
                      </div>
                      {stats.totalLots > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">• Lots</span>
                          <span className="text-slate-700">{stats.totalLots}</span>
                        </div>
                      )}
                      {stats.totalBuildings > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">• Immeubles</span>
                          <span className="text-slate-700">{stats.totalBuildings}</span>
                        </div>
                      )}
                    </div>

                    {(stats.interventionStats.total > 0 || stats.totalProperties > 0) && (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        {stats.interventionStats.total > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setActiveTab('interventions')}
                          >
                            <Wrench className="h-4 w-4 mr-2" />
                            Voir les interventions
                          </Button>
                        )}
                        {stats.totalProperties > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => setActiveTab('properties')}
                          >
                            <Home className="h-4 w-4 mr-2" />
                            Voir les biens
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Interventions Tab */}
            <TabsContent value="interventions" className="mt-0">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600">{stats.interventionStats.total}</div>
                      <div className="text-sm text-gray-600">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-orange-600">{stats.interventionStats.pending}</div>
                      <div className="text-sm text-gray-600">En attente</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-yellow-600">{stats.interventionStats.inProgress}</div>
                      <div className="text-sm text-gray-600">En cours</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.interventionStats.completed}</div>
                      <div className="text-sm text-gray-600">Terminées</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interventions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-slate-800 leading-snug flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-slate-500" />
                    Interventions liées à {contact.name} ({interventions.length})
                  </h2>
                  <Button onClick={() => router.push('/gestionnaire/interventions/nouvelle-intervention')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une intervention
                  </Button>
                </div>

                {/* Interventions Navigator */}
                <InterventionsNavigator
                  interventions={interventions}
                  loading={false}
                  emptyStateConfig={{
                    title: "Aucune intervention",
                    description:
                      contact.role === 'prestataire' ? 'Aucune intervention n\'a été assignée à ce prestataire.' :
                        contact.role === 'locataire' ? 'Aucune intervention n\'a été créée pour les logements de ce locataire.' :
                          'Aucune intervention n\'a été trouvée pour ce contact.',
                    showCreateButton: true,
                    createButtonText: "Créer une intervention",
                    createButtonAction: () => router.push('/gestionnaire/interventions/nouvelle-intervention')
                  }}
                  contactContext={{
                    contactId: contact.id,
                    contactName: contact.name,
                    contactRole: contact.role
                  }}
                  showStatusActions={contact.role === 'gestionnaire'}
                  searchPlaceholder={`Rechercher les interventions de ${contact.name}...`}
                  showFilters={true}
                />
              </div>
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="mt-0">
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalProperties}</div>
                      <div className="text-sm text-gray-600">Biens totaux</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.totalLots}</div>
                      <div className="text-sm text-gray-600">Lots</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-purple-600">{stats.totalBuildings}</div>
                      <div className="text-sm text-gray-600">Immeubles</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Properties Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-slate-800 leading-snug flex items-center">
                    <Home className="h-5 w-5 mr-2 text-slate-500" />
                    Biens liés à {contact.name} ({properties.length})
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/gestionnaire/biens/lots/nouveau')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau lot
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvel immeuble
                    </Button>
                  </div>
                </div>

                {/* Properties Navigator */}
                <PropertiesNavigator
                  properties={properties}
                  loading={false}
                  emptyStateConfig={{
                    title: "Aucun bien lié",
                    description:
                      contact.role === 'locataire' ? 'Ce locataire n\'a pas encore de logement assigné.' :
                        contact.role === 'gestionnaire' ? 'Ce gestionnaire ne gère pas encore de biens.' :
                          'Aucun bien n\'a été trouvé pour ce contact.',
                    showCreateButtons: true,
                    createButtonsConfig: {
                      lot: {
                        text: "Créer un lot",
                        action: () => router.push('/gestionnaire/biens/lots/nouveau')
                      },
                      building: {
                        text: "Créer un immeuble",
                        action: () => router.push('/gestionnaire/biens/immeubles/nouveau')
                      }
                    }
                  }}
                  contactContext={{
                    contactId: contact.id,
                    contactName: contact.name,
                    contactRole: contact.role
                  }}
                  searchPlaceholder={`Rechercher les biens de ${contact.name}...`}
                  showFilters={true}
                />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ========================================================================== */}
      {/* MODALES DE CONFIRMATION */}
      {/* ========================================================================== */}

      {/* Modale 1: Inviter (nouveau contact) */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter {contact.name}</DialogTitle>
            <DialogDescription>
              Un email d'invitation sera envoyé à <strong>{contact.email}</strong> pour créer son compte et accéder à l'application.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleSendInvitation} disabled={invitationLoading}>
              {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale 2: Relancer (invitation pending/expired) */}
      <Dialog open={showResendModal} onOpenChange={setShowResendModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relancer l'invitation</DialogTitle>
            <DialogDescription>
              Un nouvel email d'invitation sera envoyé à <strong>{contact.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResendModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleResendInvitation} disabled={invitationLoading}>
              {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Renvoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale 3: Annuler (invitation pending) */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler l'invitation</DialogTitle>
            <DialogDescription>
              L'invitation de <strong>{contact.name}</strong> sera annulée. Vous pourrez toujours envoyer une nouvelle invitation plus tard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Retour
            </Button>
            <Button variant="destructive" onClick={handleCancelInvitation} disabled={invitationLoading}>
              {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Annuler l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale 4: Retirer l'accès (invitation accepted) */}
      <Dialog open={showRevokeModal} onOpenChange={(open) => {
        setShowRevokeModal(open)
        if (!open) setRevokeConfirmChecked(false) // Reset checkbox when closing
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Retirer l'accès de {contact.name}</DialogTitle>
            <DialogDescription>
              Cette action révoquera définitivement l'accès de <strong>{contact.name}</strong> à l'application. Il ne pourra plus se connecter.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Checkbox
                id="revoke-confirm"
                checked={revokeConfirmChecked}
                onCheckedChange={(checked) => setRevokeConfirmChecked(checked === true)}
              />
              <label
                htmlFor="revoke-confirm"
                className="text-sm font-medium text-amber-800 cursor-pointer"
              >
                Je confirme vouloir révoquer l'accès de ce contact
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRevokeModal(false)
              setRevokeConfirmChecked(false)
            }}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevokeAccess}
              disabled={!revokeConfirmChecked || invitationLoading}
            >
              {invitationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Retirer l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
