"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Wrench, Plus, Bell, Calendar, MapPin, ArrowUpRight, Droplets, Zap, Flame, Key, Hammer, Paintbrush, AlertTriangle, CheckCircle2, ChevronDown, Building2, LayoutGrid } from "lucide-react"
import { useRouter } from "next/navigation"
import { TenantData, TenantIntervention } from "@/hooks/use-tenant-data"
import { cn } from "@/lib/utils"
import { getStatusLabel } from "@/lib/intervention-utils"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalNotifications } from "@/hooks/use-global-notifications"
import { useNotificationPopover } from "@/hooks/use-notification-popover"
import { useTeamStatus } from "@/hooks/use-team-status"
import UserMenu from "@/components/user-menu"
import NotificationPopover from "@/components/notification-popover"
import { PendingActionsSection } from "@/components/dashboards/shared/pending-actions-section"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"

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
  const currentProperty = selectedPropertyId === 'all'
    ? { name: 'Vue d\'ensemble', address: 'Tous les logements', building: null }
    : tenantProperties.find(p => p.id === selectedPropertyId) || tenantData

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* --- HEADER --- */}
      <header className="header">
        <div className="header__container">
          <nav className="header__nav">
            {/* Left: Logo + Download Button + Property Selector */}
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

              {/* Property Selector */}
              <div className="min-w-0 flex-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-auto p-0 hover:bg-transparent flex items-center gap-2 max-w-full">
                      <div className="text-left min-w-0">
                        <h1 className="header__title flex items-center gap-1 truncate">
                          <span className="truncate">{selectedPropertyId === 'all' ? 'Vue d\'ensemble' : 'Mon Logement'}</span>
                          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        </h1>
                        <p className="header__subtitle truncate">
                          {selectedPropertyId === 'all'
                            ? `${tenantProperties.length} logement${tenantProperties.length > 1 ? 's' : ''}`
                            : currentProperty.building?.address}
                        </p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
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
                          <div className="font-medium">{property.reference}</div>
                          <div className="text-xs text-gray-500">{property.building?.address}</div>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Right: Notifications + User Menu */}
            <div className="header__actions">
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

        {/* --- ACTION ZONE (V3 Style) - Only shown if can create interventions --- */}
        {canCreateIntervention && (
          <div className="bg-gray-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-xl font-bold mb-2">Un problème technique ?</h2>
              <p className="text-gray-300 mb-6 text-sm max-w-[80%]">Signalez-le rapidement pour une intervention.</p>
              <Button
                onClick={() => router.push('/locataire/interventions/nouvelle-demande')}
                className="w-full bg-white text-black hover:bg-gray-100 font-bold h-12 rounded-xl px-8 justify-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Créer une demande
              </Button>
            </div>
            <div className="absolute -right-4 -bottom-8 opacity-10">
              <Wrench className="h-40 w-40" />
            </div>
          </div>
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
