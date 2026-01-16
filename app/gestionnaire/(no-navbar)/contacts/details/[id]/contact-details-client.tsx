"use client"

import { useState } from "react"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Eye,
  User,
  Wrench,
  Home,
  Mail,
  RefreshCw,
  X,
  UserX,
  Loader2,
  Archive,
  Edit as EditIcon,
  Trash2
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { InterventionWithRelations, Lot, Building } from '@/lib/services'
import {
  DetailPageHeader,
  type DetailPageHeaderBadge,
  type DetailPageHeaderAction
} from "@/components/ui/detail-page-header"
import { EntityEmailsTab } from "@/components/emails/entity-emails-tab"
import { logger } from '@/lib/logger'

// Import extracted components
import {
  type ContactWithCompany,
  type ContactDetailsClientProps,
  type LinkedContract,
  USER_ROLES,
  SPECIALITIES,
  getRoleConfig,
  getProviderCategoryLabel,
  getSpecialityLabel,
  useContactInvitation,
  ContactInviteModal,
  ContactResendModal,
  ContactCancelModal,
  ContactRevokeModal,
  ContactOverviewStats,
  ContactInfoCard,
  ContactCompanyCard,
  ContactAccessCard,
  ContactContractsCard,
  ContactTabsNavigation,
  ContactInterventionsTab,
  ContactPropertiesTab
} from "@/components/contact-details"

// Re-export types for backward compatibility
export type { ContactWithCompany, LinkedContract, ContactDetailsClientProps }

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
  // STATE
  // ============================================================================
  const [activeTab, setActiveTab] = useState("overview")

  // Use extracted invitation hook
  const invitation = useContactInvitation({
    contact: initialContact,
    contactId,
    teamId: currentUser.team_id,
    initialInvitationStatus
  })

  // Use initial data from Server Component
  const contact = initialContact
  const interventions = initialInterventions as InterventionWithRelations[]
  const properties = initialProperties

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleBack = () => {
    router.push("/gestionnaire/contacts")
  }

  const handleEdit = () => {
    router.push(`/gestionnaire/contacts/modifier/${contactId}`)
  }

  const handleArchive = () => {
    logger.info("Archive contact:", contact?.id)
  }

  const handleNavigateToCompany = (companyId: string) => {
    router.push(`/gestionnaire/contacts/societes/${companyId}`)
  }

  const handleNavigateToContract = (contractId: string) => {
    router.push(`/gestionnaire/contrats/${contractId}`)
  }

  const handleCreateIntervention = () => {
    router.push('/gestionnaire/interventions/nouvelle-intervention')
  }

  const handleCreateLot = () => {
    router.push('/gestionnaire/biens/lots/nouveau')
  }

  const handleCreateBuilding = () => {
    router.push('/gestionnaire/biens/immeubles/nouveau')
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const getInvitationStatusBadge = () => {
    if (invitation.invitationLoading) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-muted-foreground/70 rounded-full animate-pulse"></div>
          <span className="text-sm text-muted-foreground">Vérification...</span>
        </div>
      )
    }

    if (!invitation.invitationStatus) {
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

    const config = statusConfig[invitation.invitationStatus as keyof typeof statusConfig] || statusConfig.pending

    return (
      <Badge variant="secondary" className={`${config.class} font-medium`}>
        {config.label}
      </Badge>
    )
  }

  const getAccessActions = () => {
    if (invitation.invitationLoading) {
      return (
        <Button disabled className="w-full" size="sm" variant="outline">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Chargement...
        </Button>
      )
    }

    if (!invitation.invitationStatus || invitation.invitationStatus === 'cancelled') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => invitation.setShowInviteModal(true)}
        >
          <Mail className="h-4 w-4 mr-2" />
          Inviter
        </Button>
      )
    }

    if (invitation.invitationStatus === 'pending' || invitation.invitationStatus === 'expired') {
      return (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => invitation.setShowResendModal(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Relancer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => invitation.setShowCancelModal(true)}
          >
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      )
    }

    if (invitation.invitationStatus === 'accepted') {
      return (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => invitation.setShowRevokeModal(true)}
        >
          <UserX className="h-4 w-4 mr-2" />
          Retirer l'accès
        </Button>
      )
    }

    return null
  }

  const getStats = () => {
    const interventionStats = {
      total: interventions.length,
      pending: interventions.filter(i => i.status === 'demande').length,
      inProgress: interventions.filter(i => ['planifiee', 'planification'].includes(i.status)).length,
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

  // ============================================================================
  // HEADER CONFIGURATION
  // ============================================================================

  const getRoleBadge = (): DetailPageHeaderBadge => {
    const roleConfig = USER_ROLES.find(r => r.value === contact.role) || USER_ROLES[0]
    return {
      label: roleConfig.label,
      icon: User,
      color: roleConfig.color.replace('bg-', 'bg-').replace('text-', 'text-') + ' border-' + roleConfig.color.split('-')[1] + '-200',
      dotColor: 'bg-' + roleConfig.color.split('-')[1] + '-500'
    }
  }

  const getInvitationBadge = (): DetailPageHeaderBadge | null => {
    if (!invitation.invitationStatus) return null

    const statusMap: Record<string, { label: string; color: string; dotColor: string }> = {
      pending: { label: 'Invitation envoyée', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dotColor: 'bg-yellow-500' },
      accepted: { label: 'Accès actif', color: 'bg-green-100 text-green-800 border-green-200', dotColor: 'bg-green-500' },
      expired: { label: 'Invitation expirée', color: 'bg-red-100 text-red-800 border-red-200', dotColor: 'bg-red-500' },
      revoked: { label: 'Accès révoqué', color: 'bg-muted text-foreground border-border', dotColor: 'bg-muted-foreground' }
    }

    return statusMap[invitation.invitationStatus] || null
  }

  const getSpecialityBadge = (): DetailPageHeaderBadge | null => {
    if (!contact.speciality || contact.role !== 'prestataire') return null
    const spec = SPECIALITIES.find(s => s.value === contact.speciality)
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

  const primaryActions: DetailPageHeaderAction[] = [
    { label: "Modifier", icon: EditIcon, onClick: handleEdit, variant: "outline" }
  ]

  const dropdownActions: DetailPageHeaderAction[] = [
    { label: "Archiver", icon: Archive, onClick: handleArchive },
    { label: "Supprimer", icon: Trash2, onClick: () => logger.info("Delete"), variant: "destructive" }
  ]

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <DetailPageHeader
        title={contact.name}
        subtitle={contact.company?.name}
        onBack={handleBack}
        badges={headerBadges}
        metadata={[]}
        primaryActions={primaryActions}
        dropdownActions={dropdownActions}
      />

      <div className="layout-padding min-h-screen bg-background">
        <div className="content-max-width px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <ContactTabsNavigation tabs={tabs} />

            <div className="py-8">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="space-y-8">
                  {/* Stats Cards */}
                  <ContactOverviewStats
                    interventionStats={stats.interventionStats}
                    totalProperties={stats.totalProperties}
                    totalLots={stats.totalLots}
                    onTabChange={setActiveTab}
                  />

                  {/* Info Cards Row */}
                  <div className={`grid grid-cols-1 ${contact.company ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-8`}>
                    <ContactInfoCard
                      contact={contact}
                      getRoleConfig={getRoleConfig}
                      getProviderCategoryLabel={getProviderCategoryLabel}
                      getSpecialityLabel={getSpecialityLabel}
                    />

                    {contact.company && (
                      <ContactCompanyCard
                        company={contact.company}
                        onNavigateToCompany={handleNavigateToCompany}
                      />
                    )}

                    <ContactAccessCard
                      invitationStatus={invitation.invitationStatus}
                      statusBadge={getInvitationStatusBadge()}
                      accessActions={getAccessActions()}
                    />
                  </div>

                  {/* Contracts Card */}
                  <ContactContractsCard
                    contracts={initialContracts}
                    onNavigateToContract={handleNavigateToContract}
                  />
                </div>
              </TabsContent>

              {/* Interventions Tab */}
              <TabsContent value="interventions" className="mt-0">
                <ContactInterventionsTab
                  contact={contact}
                  interventions={interventions}
                  stats={stats.interventionStats}
                  onCreateIntervention={handleCreateIntervention}
                />
              </TabsContent>

              {/* Properties Tab */}
              <TabsContent value="properties" className="mt-0">
                <ContactPropertiesTab
                  contact={contact}
                  properties={properties}
                  stats={{
                    totalProperties: stats.totalProperties,
                    totalLots: stats.totalLots,
                    totalBuildings: stats.totalBuildings
                  }}
                  onCreateLot={handleCreateLot}
                  onCreateBuilding={handleCreateBuilding}
                />
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
        {/* MODALS */}
        {/* ========================================================================== */}

        <ContactInviteModal
          open={invitation.showInviteModal}
          onOpenChange={invitation.setShowInviteModal}
          contact={contact}
          emailInput={invitation.emailInput}
          emailError={invitation.emailError}
          invitationLoading={invitation.invitationLoading}
          onEmailChange={invitation.setEmailInput}
          onClearError={() => {}}
          onSendInvitation={invitation.handleSendInvitation}
        />

        <ContactResendModal
          open={invitation.showResendModal}
          onOpenChange={invitation.setShowResendModal}
          contact={contact}
          invitationLoading={invitation.invitationLoading}
          onResendInvitation={invitation.handleResendInvitation}
        />

        <ContactCancelModal
          open={invitation.showCancelModal}
          onOpenChange={invitation.setShowCancelModal}
          contact={contact}
          invitationLoading={invitation.invitationLoading}
          onCancelInvitation={invitation.handleCancelInvitation}
        />

        <ContactRevokeModal
          open={invitation.showRevokeModal}
          onOpenChange={invitation.setShowRevokeModal}
          contact={contact}
          revokeConfirmChecked={invitation.revokeConfirmChecked}
          invitationLoading={invitation.invitationLoading}
          onConfirmChange={invitation.setRevokeConfirmChecked}
          onRevokeAccess={invitation.handleRevokeAccess}
        />
      </div>
    </>
  )
}
