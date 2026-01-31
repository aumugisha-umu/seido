"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Bell, ChevronDown, Building2, LayoutGrid, Home, Calendar, CreditCard } from "lucide-react"
import { useRouter } from "next/navigation"
import { TenantData, TenantIntervention } from "@/hooks/use-tenant-data"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"
import { useNotificationPopover } from "@/hooks/use-notification-popover"
import UserMenu from "@/components/user-menu"
import NotificationPopover from "@/components/notification-popover"
import { PendingActionsSection } from "@/components/dashboards/shared/pending-actions-section"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"

// Helper functions for formatting
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const formatCurrency = (amount?: number) => {
  if (!amount) return '—'
  return new Intl.NumberFormat('fr-FR').format(amount)
}

interface LocataireDashboardHybridProps {
  tenantData: TenantData | null
  tenantProperties: TenantData[]
  tenantInterventions: TenantIntervention[]
  loading: boolean
  error: string | null
  userName?: string
  userInitial?: string
  teamId?: string
  canCreateIntervention?: boolean  // If false, hide intervention creation button
}

export default function LocataireDashboardHybrid({
  tenantData,
  tenantProperties,
  tenantInterventions,
  loading,
  error,
  userName: serverUserName,
  userInitial: serverUserInitial,
  teamId: serverTeamId,
  canCreateIntervention = true
}: LocataireDashboardHybridProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | 'all'>(tenantData?.id || 'all')
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false)

  // Use server props with fallback to client-side values
  const displayName = serverUserName || user?.name || user?.email?.split('@')[0] || "Utilisateur"
  const displayInitial = serverUserInitial || displayName.charAt(0).toUpperCase()
  const teamId = serverTeamId

  // Notification hooks
  const { unreadCount: globalUnreadCount, refetch: refetchGlobalNotifications } = useGlobalNotifications({
    teamId: teamId
  })

  const {
    notifications: popoverNotifications,
    loading: loadingPopoverNotifications,
    error: popoverNotificationsError,
    markAsRead,
    markAsUnread,
    archive,
    refetch: refetchPopoverNotifications
  } = useNotificationPopover({
    teamId: teamId,
    limit: 10,
    autoRefresh: isNotificationPopoverOpen,
    refreshInterval: 30000
  })

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = popoverNotifications.filter(n => !n.read)
    await Promise.all(unreadNotifications.map(n => markAsRead(n.id)))
    refetchGlobalNotifications()
  }

  if (loading) return <div className="p-4 animate-pulse">Loading...</div>
  if (error) return <div className="p-4 text-red-500">{error}</div>
  if (!tenantData) return null

  // Filter interventions based on selected property
  // Includes building-level interventions when the selected lot is in the same building
  const filteredInterventions = selectedPropertyId === 'all'
    ? tenantInterventions
    : tenantInterventions.filter(i => {
      const interventionLotId = i.lot?.id || (i as any).lot_id

      // Cas 1: Intervention au niveau lot - lot_id doit matcher
      if (interventionLotId) {
        return interventionLotId === selectedPropertyId
      }

      // Cas 2: Intervention au niveau immeuble - vérifier si le lot sélectionné est dans le même immeuble
      const selectedProperty = tenantProperties.find(p => p.id === selectedPropertyId)
      const interventionBuildingId = i.building?.id || (i as any).building_id
      return interventionBuildingId && selectedProperty?.building?.id === interventionBuildingId
    })

  // Sort by date desc
  const sortedInterventions = [...filteredInterventions].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Get current property display info
  // When 'all' is selected, use a minimal object; otherwise use the actual property data
  const currentProperty: TenantData = selectedPropertyId === 'all'
    ? {
        id: 'all',
        reference: 'all',
        building: null
      }
    : tenantProperties.find(p => p.id === selectedPropertyId) || tenantData

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* --- HEADER --- */}
      <header className="header">
        <div className="header__container">
          <nav className="header__nav">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Logo */}
              <div className="header__logo">
                <Link href="/locataire/dashboard" className="block">
                  <Image
                    src="/images/Logo/Logo_Seido_Color.png"
                    alt="SEIDO"
                    width={140}
                    height={38}
                    className="header__logo-image"
                  />
                </Link>
              </div>

            </div>

            {/* Right: Report Button + Notifications + User Menu */}
            <div className="header__actions">
              {/* Report Problem Button (desktop only) */}
              {canCreateIntervention && (
                <Button
                  onClick={() => router.push('/locataire/interventions/nouvelle-demande')}
                  className="hidden sm:flex bg-primary hover:bg-primary/90 text-white font-medium h-9 px-4 rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Signaler un problème
                </Button>
              )}
              {/* Notifications Popover */}
              <Popover open={isNotificationPopoverOpen} onOpenChange={setIsNotificationPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`header__button ${isNotificationPopoverOpen
                      ? 'header__button--active'
                      : 'header__button--inactive'
                      }`}
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {globalUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                        {globalUnreadCount > 99 ? '99+' : globalUnreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="end" sideOffset={8}>
                  <NotificationPopover
                    notifications={popoverNotifications}
                    loading={loadingPopoverNotifications}
                    error={popoverNotificationsError}
                    onMarkAsRead={markAsRead}
                    onMarkAsUnread={markAsUnread}
                    onArchive={archive}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    role="locataire"
                    onClose={() => setIsNotificationPopoverOpen(false)}
                  />
                </PopoverContent>
              </Popover>

              {/* User Menu */}
              <div className="hidden lg:block">
                <UserMenu
                  userName={displayName}
                  userInitial={displayInitial}
                  role="locataire"
                />
              </div>
            </div>
          </nav>
        </div>
      </header>

      <div className="dashboard__container space-y-8">

        {/* --- PROPERTY INFO CARD (Replaces old Action Zone) --- */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            {/* Left: Property Selector + Details */}
            <div className="flex-1 min-w-0">
              {/* Property Selector (moved from header) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-left hover:opacity-90 transition-opacity group">
                    <Home className="h-5 w-5 opacity-70 flex-shrink-0" />
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="truncate">
                          {selectedPropertyId === 'all'
                            ? 'Vue d\'ensemble'
                            : (currentProperty.building?.name || 'Mon Logement')}
                          {selectedPropertyId !== 'all' && currentProperty.apartment_number && ` - ${currentProperty.apartment_number}`}
                        </span>
                        <ChevronDown className="h-5 w-5 opacity-70 flex-shrink-0 group-hover:opacity-100 transition-opacity" />
                      </h2>
                      <p className="text-white/80 text-sm mt-0.5 truncate">
                        {selectedPropertyId === 'all'
                          ? `${tenantProperties.length} logement${tenantProperties.length > 1 ? 's' : ''}`
                          : currentProperty.building?.address_record?.formatted_address
                            || `${currentProperty.building?.address_record?.street || ''}, ${currentProperty.building?.address_record?.postal_code || ''} ${currentProperty.building?.address_record?.city || ''}`}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  <DropdownMenuItem
                    onClick={() => setSelectedPropertyId('all')}
                    className={cn(
                      "cursor-pointer",
                      selectedPropertyId === 'all' && "bg-slate-100"
                    )}
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    <div className="flex-1">
                      <div className="font-medium">Vue d'ensemble</div>
                      <div className="text-xs text-gray-500">Tous les logements</div>
                    </div>
                  </DropdownMenuItem>
                  {tenantProperties.map((property) => (
                    <DropdownMenuItem
                      key={property.id}
                      onClick={() => setSelectedPropertyId(property.id)}
                      className={cn(
                        "cursor-pointer",
                        selectedPropertyId === property.id && "bg-slate-100"
                      )}
                    >
                      <Building2 className="h-4 w-4 mr-2" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {property.building?.name || property.reference}
                          {property.apartment_number && ` - ${property.apartment_number}`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {property.building?.address_record?.street || property.building?.address_record?.formatted_address || ''}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Property Details: étage, porte, description */}
              {/* pl-7 = icon width (20px) + gap-2 (8px) to align with address text above */}
              {selectedPropertyId !== 'all' && (
                <div className="flex items-center gap-2 mt-1 pl-7 text-sm text-white/80 flex-wrap">
                  {[
                    currentProperty.floor !== undefined && currentProperty.floor !== null && (currentProperty.floor === 0 ? 'RDC' : `${currentProperty.floor}ème étage`),
                    currentProperty.apartment_number && `Porte ${currentProperty.apartment_number}`,
                    currentProperty.description,
                  ].filter(Boolean).map((detail, index) => (
                    <span key={index} className="flex items-center gap-2">
                      {index > 0 && <span className="opacity-50">•</span>}
                      <span>{detail}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Contract/Lease Info - Toujours afficher quand un logement spécifique est sélectionné */}
            {selectedPropertyId !== 'all' && (
              <div className="flex-shrink-0 lg:text-right lg:border-l lg:border-white/20 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/20">
                {/* Badge toujours visible */}
                <Badge className="bg-white/20 text-white border-0 mb-2 hover:bg-white/30">
                  <Calendar className="h-3 w-3 mr-1" />
                  {currentProperty.contract?.status === 'actif' ? 'Bail en cours' : 'Bail à venir'}
                </Badge>

                {/* Dates - uniquement si disponibles */}
                {(currentProperty.contract?.start_date || currentProperty.contract?.end_date) && (
                  <p className="text-sm font-medium">
                    {formatDate(currentProperty.contract?.start_date)} — {formatDate(currentProperty.contract?.end_date)}
                  </p>
                )}

                {/* Loyer - uniquement si disponible */}
                {(currentProperty.contract?.rent_amount || currentProperty.contract?.charges_amount) && (
                  <p className="text-sm text-white/80 mt-1 flex items-center lg:justify-end gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Loyer: </span>
                    <span className="font-semibold text-white">
                      {formatCurrency(currentProperty.contract?.rent_amount)}€
                    </span>
                    {currentProperty.contract?.charges_amount && (
                      <span className="text-white/60"> (+{formatCurrency(currentProperty.contract?.charges_amount)}€ charges)</span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Overview stats when "all" is selected */}
            {selectedPropertyId === 'all' && (
              <div className="flex-shrink-0 lg:text-right lg:border-l lg:border-white/20 lg:pl-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/20">
                <p className="text-lg font-semibold">{tenantProperties.length} logement{tenantProperties.length > 1 ? 's' : ''}</p>
                <p className="text-sm text-white/80">
                  {sortedInterventions.length} intervention{sortedInterventions.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile: Floating Action Button for Report Problem */}
        {canCreateIntervention && (
          <Button
            onClick={() => router.push('/locataire/interventions/nouvelle-demande')}
            className="sm:hidden fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg p-0"
            aria-label="Signaler un problème"
          >
            <Plus className="h-6 w-6" />
          </Button>
        )}

        {/* --- PENDING ACTIONS SECTION: Orange wrapper with horizontal scroll --- */}
        <PendingActionsSection
          interventions={filteredInterventions}
          userRole="locataire"
        />

        {/* --- INTERVENTIONS SECTION (Unified InterventionsNavigator) --- */}
        <InterventionsNavigator
          interventions={sortedInterventions}
          userContext="locataire"
          tabsPreset="dashboard"
          showHeader={true}
          headerConfig={{ title: "Vos Interventions" }}
          showSortOptions={true}
          compact={true}
        />
      </div>
    </div>
  )
}
