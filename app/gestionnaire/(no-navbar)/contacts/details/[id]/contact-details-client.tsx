"use client" // ✅ Client Component (UI Layer - Interactivité)

import React, { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Loader2,
  Calendar,
  Archive,
  Edit as EditIcon,
  Trash2,
  Send,
  ScrollText,
  Building2,
  Phone,
  MapPin,
  Globe,
  ExternalLink
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
import { DetailPageHeader, type DetailPageHeaderBadge, type DetailPageHeaderMetadata, type DetailPageHeaderAction } from "@/components/ui/detail-page-header"
import { StatsCard } from "@/components/dashboards/shared/stats-card"
import { EntityEmailsTab } from "@/components/emails/entity-emails-tab"
import { logger } from '@/lib/logger'
import { useToast } from "@/hooks/use-toast"
import { Clock, CheckCircle2 } from "lucide-react"

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

// Type for company data from Supabase join
interface CompanyData {
  id: string
  name: string
  vat_number?: string | null
  street?: string | null
  street_number?: string | null
  postal_code?: string | null
  city?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
  is_active?: boolean
}

// Type for contracts passed from server
interface LinkedContract {
  id: string
  title: string | null
  status: string
  start_date: string
  end_date: string | null
  rent_amount: number | null
  charges_amount: number | null
  contactRole: string // 'locataire' | 'colocataire' | 'garant' | 'owner' etc.
  lot?: {
    id: string
    reference: string
    category: string
    street: string | null
    city: string | null
    building?: {
      id: string
      name: string
      address: string | null
      city: string | null
    } | null
  } | null
  contacts?: Array<{
    id: string
    user_id: string
    role: string
    is_primary: boolean
  }>
}

// Extended contact type with company data
type ContactWithCompany = ContactType & {
  company?: CompanyData | null
}

interface ContactDetailsClientProps {
  contactId: string
  initialContact: ContactWithCompany
  initialInterventions: InterventionType[]
  initialProperties: Array<(LotType & { type: 'lot' }) | (BuildingType & { type: 'building' })>
  initialContracts?: LinkedContract[]
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
  { value: "proprietaire", label: "Propriétaire", color: "bg-amber-100 text-amber-800" },
  { value: "prestataire", label: "Prestataire", color: "bg-green-100 text-green-800" }
]

const providerCategories = [
  { value: "prestataire", label: "Prestataire" },
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
  initialContracts = [],
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

  // Email input pour invitation quand email manquant
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)

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

  // Helper de validation email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
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

    // Validation si email manquant
    const emailToUse = contact.email || emailInput.trim()

    if (!emailToUse) {
      setEmailError('L\'email est requis pour envoyer une invitation')
      return
    }

    if (!contact.email && !validateEmail(emailInput)) {
      setEmailError('Format d\'email invalide')
      return
    }

    try {
      setInvitationLoading(true)
      logger.info("🔄 Sending invitation to existing contact:", contact.id)

      const response = await fetch("/api/send-existing-contact-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          // Envoyer l'email seulement si c'est un nouvel email (contact sans email)
          ...((!contact.email && emailInput) && { email: emailInput.trim() })
        }),
      })

      if (response.ok) {
        const { invitationId, isNewAuthUser } = await response.json()
        setInvitationId(invitationId)
        logger.info("✅ Invitation sent successfully", { isNewAuthUser })

        toast({
          title: "✅ Invitation envoyée",
          description: isNewAuthUser
            ? `Une invitation a été envoyée à ${emailToUse}`
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
      // Réinitialiser les champs email
      setEmailInput('')
      setEmailError(null)
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
    // Verify invitationId exists before proceeding
    if (!invitationId) {
      logger.error("❌ No invitation ID available")
      toast({
        title: "❌ Erreur",
        description: "ID d'invitation introuvable",
        variant: "destructive"
      })
      return
    }

    try {
      setInvitationLoading(true)
      logger.info("🔄 Cancelling invitation:", invitationId)

      const response = await fetch("/api/cancel-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
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
    if (!contact?.id) return
    if (!revokeConfirmChecked) return

    try {
      setInvitationLoading(true)
      logger.info("🔄 Revoking access for contact:", contact.id)

      const response = await fetch("/api/revoke-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          teamId: contact.team_id || currentUser.team_id
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
          <div className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Vérification...</span>
        </div>
      )
    }

    if (!invitationStatus) {
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
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
    { id: "properties", label: "Biens", icon: Home, count: stats.totalProperties },
    { id: "emails", label: "Emails", icon: Mail, count: null }
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

  // Prepare header data
  const getRoleBadge = (): DetailPageHeaderBadge => {
    const roleConfig = userRoles.find(r => r.value === contact.role) || userRoles[0]
    return {
      label: roleConfig.label,
      icon: User,
      color: roleConfig.color.replace('bg-', 'bg-').replace('text-', 'text-') + ' border-' + roleConfig.color.split('-')[1] + '-200',
      dotColor: 'bg-' + roleConfig.color.split('-')[1] + '-500'
    }
  }

  const getInvitationBadge = (): DetailPageHeaderBadge | null => {
    if (!invitationStatus) return null

    const statusMap: Record<string, { label: string; color: string; dotColor: string }> = {
      pending: { label: 'Invitation envoyée', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dotColor: 'bg-yellow-500' },
      accepted: { label: 'Accès actif', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      expired: { label: 'Invitation expirée', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
      revoked: { label: 'Accès révoqué', color: 'bg-muted text-foreground border-border', dotColor: 'bg-muted-foreground' }
    }

    return statusMap[invitationStatus] || null
  }

  // Badge spécialité (pour prestataires)
  const getSpecialityBadge = (): DetailPageHeaderBadge | null => {
    if (!contact.speciality || contact.role !== 'prestataire') return null
    const spec = specialities.find(s => s.value === contact.speciality)
    return {
      label: spec?.label || contact.speciality,
      color: 'bg-green-50 text-green-700 border-green-200'
    }
  }

  const headerBadges: DetailPageHeaderBadge[] = [
    getRoleBadge(),
    getSpecialityBadge(),
    getInvitationBadge()
  ].filter(Boolean) as DetailPageHeaderBadge[]

  // Metadata vide (email et date retirés du header)
  const headerMetadata: DetailPageHeaderMetadata[] = []

  // Actions primaires vides (tout dans le dropdown)
  const primaryActions: DetailPageHeaderAction[] = []

  // Actions dropdown (même pattern que la vue liste)
  const dropdownActions: DetailPageHeaderAction[] = [
    // Modifier (toujours visible)
    {
      label: 'Modifier',
      icon: EditIcon,
      onClick: handleEdit
    },
    // Inviter (si pas d'invitation ou annulée)
    ...(!invitationStatus || invitationStatus === 'cancelled' ? [{
      label: 'Inviter',
      icon: Send,
      onClick: () => setShowInviteModal(true)
    }] : []),
    // Relancer/Annuler invitation (si pending ou expired)
    ...(invitationStatus === 'pending' || invitationStatus === 'expired' ? [
      {
        label: 'Relancer invitation',
        icon: RefreshCw,
        onClick: () => handleInvitationAction('resend')
      },
      {
        label: 'Annuler invitation',
        icon: X,
        onClick: () => handleInvitationAction('cancel'),
        variant: 'destructive' as const
      }
    ] : []),
    // Retirer l'accès (si accepted)
    ...(invitationStatus === 'accepted' ? [{
      label: "Retirer l'accès",
      icon: UserX,
      onClick: () => setShowRevokeModal(true),
      variant: 'destructive' as const
    }] : []),
    // Archiver (toujours visible)
    {
      label: 'Archiver',
      icon: Archive,
      onClick: handleArchive,
      variant: 'destructive' as const
    }
  ]

  return (
    <>
      {/* Unified Detail Page Header */}
      <DetailPageHeader
        onBack={handleBack}
        backButtonText="Retour"
        title={contact.name}
        badges={headerBadges}
        metadata={headerMetadata}
        primaryActions={primaryActions}
        dropdownActions={dropdownActions}
      />

      <div className="layout-padding min-h-screen bg-background">
        {/* Tabs Navigation */}
      <div className="content-max-width px-4 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center space-x-2 text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-card"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count !== null && (
                    <Badge variant="secondary" className="ml-1 text-xs bg-muted text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
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
              <div className="space-y-8">
                {/* ROW 1: Stats Cards (juste sous les tabs) - Design Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Total Interventions */}
                  <StatsCard
                    id="total-interventions"
                    label="Total"
                    value={stats.interventionStats.total}
                    sublabel="interventions"
                    icon={Wrench}
                    iconColor="text-blue-600"
                    variant="default"
                    onClick={() => setActiveTab('interventions')}
                  />

                  {/* En Attente */}
                  <StatsCard
                    id="pending-interventions"
                    label="En attente"
                    value={stats.interventionStats.pending}
                    sublabel={stats.interventionStats.pending > 0 ? "à traiter" : ""}
                    icon={Clock}
                    iconColor="text-amber-500"
                    variant={stats.interventionStats.pending > 0 ? "warning" : "default"}
                    onClick={() => setActiveTab('interventions')}
                  />

                  {/* En Cours */}
                  <StatsCard
                    id="active-interventions"
                    label="En cours"
                    value={stats.interventionStats.inProgress}
                    sublabel="actives"
                    icon={Wrench}
                    iconColor="text-indigo-600"
                    variant="default"
                    onClick={() => setActiveTab('interventions')}
                  />

                  {/* Terminées */}
                  <StatsCard
                    id="completed-interventions"
                    label="Terminées"
                    value={stats.interventionStats.completed}
                    sublabel="clôturées"
                    icon={CheckCircle2}
                    iconColor="text-emerald-600"
                    variant={stats.interventionStats.completed > 0 ? "success" : "default"}
                    onClick={() => setActiveTab('interventions')}
                  />

                  {/* Biens Liés */}
                  <StatsCard
                    id="linked-properties"
                    label="Biens liés"
                    value={stats.totalProperties}
                    sublabel={stats.totalLots > 0 ? `${stats.totalLots} lots` : ""}
                    icon={Home}
                    iconColor="text-violet-600"
                    variant="default"
                    onClick={() => setActiveTab('properties')}
                  />
                </div>

                {/* ROW 2: Informations Cards (Informations + Société + Statut) */}
                <div className={`grid grid-cols-1 ${contact.company ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8`}>
                  {/* Informations Personnelles */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span>Informations Personnelles</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Nom complet</span>
                        <span className="font-medium text-foreground">{contact.name}</span>
                      </div>
                      {contact.first_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Prénom</span>
                          <span className="font-medium text-foreground">{contact.first_name}</span>
                        </div>
                      )}
                      {contact.last_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Nom de famille</span>
                          <span className="font-medium text-foreground">{contact.last_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Email</span>
                        <span className="font-medium text-foreground text-sm">{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Téléphone</span>
                          <span className="font-medium text-foreground">{contact.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-sm">Rôle</span>
                        <Badge variant="secondary" className={getRoleConfig(contact.role).color}>
                          {getRoleConfig(contact.role).label}
                        </Badge>
                      </div>
                      {contact.provider_category && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Catégorie</span>
                          <Badge variant="outline" className="text-xs bg-muted text-foreground border-border">
                            {getProviderCategoryLabel(contact.provider_category)}
                          </Badge>
                        </div>
                      )}
                      {contact.speciality && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Spécialité</span>
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {getSpecialityLabel(contact.speciality)}
                        </Badge>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground text-sm">Notes</span>
                        <p className="text-sm font-medium mt-1 text-foreground">{contact.notes}</p>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  {/* Société - Placée APRÈS Informations Personnelles */}
                  {contact.company && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <span>Société</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Company name with link */}
                        <div
                          className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => router.push(`/gestionnaire/contacts/societes/${contact.company!.id}`)}
                        >
                          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{contact.company.name}</p>
                            {contact.company.vat_number && (
                              <p className="text-sm text-muted-foreground">TVA: {contact.company.vat_number}</p>
                            )}
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>

                        {/* Company details */}
                        {contact.company.email && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              Email
                            </span>
                            <a
                              href={`mailto:${contact.company.email}`}
                              className="text-sm font-medium text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contact.company.email}
                            </a>
                          </div>
                        )}

                        {contact.company.phone && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground text-sm flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              Téléphone
                            </span>
                            <a
                              href={`tel:${contact.company.phone}`}
                              className="text-sm font-medium text-foreground hover:text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {contact.company.phone}
                            </a>
                          </div>
                        )}

                        {(contact.company.street || contact.company.city) && (
                          <div className="flex justify-between items-start">
                            <span className="text-muted-foreground text-sm flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Adresse
                            </span>
                            <div className="text-sm font-medium text-foreground text-right max-w-[60%]">
                              {contact.company.street && (
                                <p>
                                  {contact.company.street_number && `${contact.company.street_number} `}
                                  {contact.company.street}
                                </p>
                              )}
                              {(contact.company.postal_code || contact.company.city) && (
                                <p className="text-muted-foreground">
                                  {contact.company.postal_code && `${contact.company.postal_code} `}
                                  {contact.company.city}
                                </p>
                              )}
                              {contact.company.country && (
                                <p className="text-muted-foreground">{contact.company.country}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* View company button */}
                        <div className="pt-2 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => router.push(`/gestionnaire/contacts/societes/${contact.company!.id}`)}
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            Voir la fiche société
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Statut d'Accès */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                      <span>Statut d'Accès</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Statut d'invitation</span>
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
                      <div className="bg-muted border border-border rounded-lg p-3">
                        <p className="text-sm text-muted-foreground">
                          👤 Ce contact existe dans votre base mais n'a pas accès à l'application
                        </p>
                      </div>
                    )}

                    {getAccessActions()}
                    </CardContent>
                  </Card>
                </div>

                {/* ROW 3: Contrats Liés (full width) */}
                {initialContracts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-foreground">
                        <ScrollText className="h-5 w-5 text-muted-foreground" />
                        <span>Contrats Liés ({initialContracts.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {initialContracts.map(contract => (
                          <div
                            key={contract.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => router.push(`/gestionnaire/contrats/${contract.id}`)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <ScrollText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {contract.title || `Contrat ${contract.lot?.reference || ''}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {contract.lot?.reference && `${contract.lot.reference} • `}
                                  {contract.lot?.building?.name || contract.lot?.city || 'Bien non spécifié'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {/* Role badge */}
                              <Badge variant="outline" className={
                                contract.contactRole === 'locataire' || contract.contactRole === 'colocataire'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : contract.contactRole === 'garant'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : contract.contactRole === 'owner'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-gray-50 text-gray-700 border-gray-200'
                              }>
                                {contract.contactRole === 'locataire' ? 'Locataire' :
                                 contract.contactRole === 'colocataire' ? 'Co-locataire' :
                                 contract.contactRole === 'garant' ? 'Garant' :
                                 contract.contactRole === 'owner' ? 'Propriétaire' :
                                 contract.contactRole}
                              </Badge>
                              {/* Status badge */}
                              <Badge variant={contract.status === 'actif' ? 'default' : 'secondary'} className={
                                contract.status === 'actif'
                                  ? 'bg-green-100 text-green-800'
                                  : contract.status === 'a_venir'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-600'
                              }>
                                {contract.status === 'actif' ? 'Actif' :
                                 contract.status === 'a_venir' ? 'À venir' :
                                 contract.status === 'expire' ? 'Expiré' :
                                 contract.status === 'resilie' ? 'Résilié' :
                                 contract.status === 'brouillon' ? 'Brouillon' :
                                 contract.status}
                              </Badge>
                              {/* Dates */}
                              <span className="text-sm text-muted-foreground hidden sm:inline">
                                {new Date(contract.start_date).toLocaleDateString('fr-FR')}
                                {contract.end_date && ` → ${new Date(contract.end_date).toLocaleDateString('fr-FR')}`}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
                      <div className="text-sm text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-orange-600">{stats.interventionStats.pending}</div>
                      <div className="text-sm text-muted-foreground">En attente</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-yellow-600">{stats.interventionStats.inProgress}</div>
                      <div className="text-sm text-muted-foreground">En cours</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.interventionStats.completed}</div>
                      <div className="text-sm text-muted-foreground">Terminées</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Interventions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-foreground leading-snug flex items-center">
                    <Wrench className="h-5 w-5 mr-2 text-muted-foreground" />
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
                      <div className="text-sm text-muted-foreground">Biens totaux</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-green-600">{stats.totalLots}</div>
                      <div className="text-sm text-muted-foreground">Lots</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-2xl font-bold text-purple-600">{stats.totalBuildings}</div>
                      <div className="text-sm text-muted-foreground">Immeubles</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Properties Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold text-foreground leading-snug flex items-center">
                    <Home className="h-5 w-5 mr-2 text-muted-foreground" />
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

            {/* Emails Tab */}
            <TabsContent value="emails" className="mt-0">
              <EntityEmailsTab
                entityType="contact"
                entityId={contactId}
                entityName={contact.name}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ========================================================================== */}
      {/* MODALES DE CONFIRMATION */}
      {/* ========================================================================== */}

      {/* Modale 1: Inviter (nouveau contact) */}
      <Dialog open={showInviteModal} onOpenChange={(open) => {
        setShowInviteModal(open)
        if (!open) {
          setEmailInput('')
          setEmailError(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter {contact.name}</DialogTitle>
            <DialogDescription>
              {contact.email ? (
                <>Un email d'invitation sera envoyé à <strong>{contact.email}</strong> pour créer son compte et accéder à l'application.</>
              ) : (
                <>Ce contact n'a pas d'adresse email. Veuillez en saisir une pour envoyer l'invitation.</>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Champ email conditionnel si manquant */}
          {!contact.email && (
            <div className="space-y-2 py-4">
              <Label htmlFor="invitation-email" className="text-sm font-medium">
                Adresse email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invitation-email"
                type="email"
                placeholder="exemple@email.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setEmailError(null)
                }}
                className={emailError ? 'border-destructive' : ''}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSendInvitation}
              disabled={invitationLoading || (!contact.email && !emailInput.trim())}
            >
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
    </>
  )
}
