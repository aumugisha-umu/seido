"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { ListTodo, AlertTriangle, Settings, Archive, Clock, LucideIcon, Filter, ArrowUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsViewContainer } from "@/components/interventions/interventions-view-container"
import { ViewModeSwitcherV1 } from "@/components/interventions/view-mode-switcher-v1"
import { useViewMode } from "@/hooks/use-view-mode"
import { filterPendingActions } from "@/lib/intervention-alert-utils"
import type { InterventionWithRelations } from "@/lib/services"

// ============================================================================
// CONSTANTS - Sort & Filter Options
// ============================================================================

type SortField = 'date' | 'urgency' | 'status' | 'title'
type SortOrder = 'asc' | 'desc'

const STATUS_OPTIONS = [
  { value: 'demande', label: 'Demande' },
  { value: 'approuvee', label: 'Approuvée' },
  { value: 'planification', label: 'Planification' },
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'cloturee_par_prestataire', label: 'Clôturée (presta)' },
  { value: 'cloturee_par_locataire', label: 'Clôturée (locataire)' },
  { value: 'cloturee_par_gestionnaire', label: 'Clôturée' },
]

const URGENCY_OPTIONS = [
  { value: 'normale', label: 'Normale' },
  { value: 'haute', label: 'Haute' },
  { value: 'urgente', label: 'Urgente' },
]

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Plus récent' },
  { value: 'date-asc', label: 'Plus ancien' },
  { value: 'urgency-desc', label: 'Urgence (haute → basse)' },
  { value: 'urgency-asc', label: 'Urgence (basse → haute)' },
  { value: 'status-asc', label: 'Statut (A-Z)' },
  { value: 'title-asc', label: 'Titre (A-Z)' },
]

// ============================================================================
// INTERVENTIONS NAVIGATOR - Composant BEM Unifié
// ============================================================================
// Block:    interventions-section
// Elements: interventions-section__header, __title, __actions, __content
// Modifiers: interventions-section--compact, interventions-section--embedded
// ============================================================================

interface EmptyStateConfig {
  title: string
  description: string
  showCreateButton?: boolean
  createButtonText?: string
  createButtonAction?: () => void
}

interface HeaderConfig {
  title: string
  icon?: LucideIcon
  actions?: React.ReactNode
}

interface InterventionsNavigatorProps {
  interventions: InterventionWithRelations[]
  loading?: boolean
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  className?: string

  // Header configuration (dashboard mode)
  showHeader?: boolean
  headerConfig?: HeaderConfig

  // Tabs preset: 'full' for page, 'dashboard' for dashboard widget, 'prestataire' for provider dashboard
  tabsPreset?: 'full' | 'dashboard' | 'prestataire'

  // Compact mode (smaller padding, for dashboard)
  compact?: boolean

  // Empty state
  emptyStateConfig?: EmptyStateConfig

  // Callbacks
  onActiveTabChange?: (tabId: string) => void
  initialActiveTab?: string

  // Action hooks (for status actions)
  actionHooks?: {
    approvalHook?: any
    quotingHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }

  // NEW: Advanced filters and sort (for dashboard parity)
  /** Show sort dropdown (Plus récent, Plus ancien, Urgence, etc.) */
  showSortOptions?: boolean
  /** Show status filter dropdown (multi-select) */
  showStatusFilter?: boolean
  /** Show urgency filter dropdown (multi-select) */
  showUrgencyFilter?: boolean
  /** Combined filter button (status + urgency in one dropdown) */
  showCombinedFilter?: boolean
  /** Show active filters as removable badges */
  showActiveFiltersBadges?: boolean
}

/**
 * InterventionsNavigator - Composant unifié pour afficher les interventions
 *
 * Utilisable sur :
 * - Dashboard : avec showHeader=true, tabsPreset="dashboard", compact=true
 * - Page Interventions : avec showHeader=false, tabsPreset="full"
 *
 * @example Dashboard
 * ```tsx
 * <InterventionsNavigator
 *   interventions={interventions}
 *   showHeader={true}
 *   headerConfig={{ title: "Interventions", icon: Wrench, actions: <Button>...</Button> }}
 *   tabsPreset="dashboard"
 *   compact={true}
 * />
 * ```
 *
 * @example Page Interventions
 * ```tsx
 * <InterventionsNavigator
 *   interventions={interventions}
 *   tabsPreset="full"
 *   className="bg-transparent border-0 shadow-none"
 * />
 * ```
 */
export function InterventionsNavigator({
  interventions = [],
  loading = false,
  userContext = 'gestionnaire',
  className = "",
  showHeader = false,
  headerConfig,
  tabsPreset = 'full',
  compact = false,
  emptyStateConfig,
  onActiveTabChange,
  initialActiveTab,
  actionHooks,
  // NEW: Sort & Filter props
  showSortOptions = false,
  showStatusFilter = false,
  showUrgencyFilter = false,
  showCombinedFilter = false,
  showActiveFiltersBadges = false
}: InterventionsNavigatorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<string | undefined>(initialActiveTab)

  // NEW: Sort & Filter state
  const [sortBy, setSortBy] = useState<string>('date-desc')
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Active filters count (for badge on filter button)
  const activeFiltersCount = selectedStatuses.length + selectedUrgencies.length

  // View mode state (cards, list, calendar)
  const { viewMode, setViewMode, mounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  // Filter handlers
  const handleStatusToggle = useCallback((status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    )
  }, [])

  const handleUrgencyToggle = useCallback((urgency: string) => {
    setSelectedUrgencies(prev =>
      prev.includes(urgency)
        ? prev.filter(u => u !== urgency)
        : [...prev, urgency]
    )
  }, [])

  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setSelectedStatuses([])
    setSelectedUrgencies([])
    setSortBy('date-desc')
  }, [])

  // Sync with initialActiveTab changes
  useEffect(() => {
    if (initialActiveTab !== undefined) {
      setActiveTab(initialActiveTab)
    }
  }, [initialActiveTab])

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onActiveTabChange?.(tabId)
  }

  // Expose handleTabChange for external calls (e.g., from badge in header)
  useEffect(() => {
    if (typeof window !== 'undefined' && tabsPreset === 'dashboard') {
      (window as any).__handleInterventionsTabChange = handleTabChange
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__handleInterventionsTabChange
      }
    }
  }, [handleTabChange, tabsPreset])

  // Transform interventions
  const transformedInterventions = useMemo(() => {
    return interventions.map((intervention) => ({
      ...intervention,
      reference: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
      urgency: intervention.urgency || (intervention as any).priority || 'normale',
      type: intervention.type || (intervention as any).intervention_type || 'autre'
    }))
  }, [interventions])

  // Filter by search term, status, and urgency, then sort
  const filteredInterventions = useMemo(() => {
    let result = [...transformedInterventions]

    // 1. Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.title?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term) ||
        i.reference?.toLowerCase().includes(term) ||
        i.lot?.reference?.toLowerCase().includes(term) ||
        i.lot?.building?.name?.toLowerCase().includes(term)
      )
    }

    // 2. Apply status filter (if enabled and has selections)
    if ((showStatusFilter || showCombinedFilter) && selectedStatuses.length > 0) {
      result = result.filter(i => selectedStatuses.includes(i.status))
    }

    // 3. Apply urgency filter (if enabled and has selections)
    if ((showUrgencyFilter || showCombinedFilter) && selectedUrgencies.length > 0) {
      result = result.filter(i => {
        const urgency = i.urgency || (i as any).priority || 'normale'
        return selectedUrgencies.includes(urgency)
      })
    }

    // 4. Apply sorting (if enabled)
    if (showSortOptions) {
      const [field, order] = sortBy.split('-') as [SortField, SortOrder]
      const urgencyOrder = { 'urgente': 3, 'haute': 2, 'normale': 1 }

      result.sort((a, b) => {
        let comparison = 0

        switch (field) {
          case 'date':
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            comparison = dateA - dateB
            break
          case 'urgency':
            const urgencyA = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || urgencyOrder[(a as any).priority as keyof typeof urgencyOrder] || 1
            const urgencyB = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || urgencyOrder[(b as any).priority as keyof typeof urgencyOrder] || 1
            comparison = urgencyA - urgencyB
            break
          case 'status':
            comparison = (a.status || '').localeCompare(b.status || '')
            break
          case 'title':
            comparison = (a.title || '').localeCompare(b.title || '')
            break
        }

        return order === 'desc' ? -comparison : comparison
      })
    }

    return result
  }, [transformedInterventions, searchTerm, selectedStatuses, selectedUrgencies, sortBy, showSortOptions, showStatusFilter, showUrgencyFilter, showCombinedFilter])

  // Filter functions
  const filterFunctions = {
    // Full preset filters
    toutes: () => filteredInterventions,
    demandes_group: () => filteredInterventions.filter(i => ["demande", "approuvee"].includes(i.status)),
    en_cours_group: () => filteredInterventions.filter(i => [
      "demande_de_devis", "planification", "planifiee", "cloturee_par_prestataire"
    ].includes(i.status)),
    cloturees_group: () => filteredInterventions.filter(i => [
      "cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"
    ].includes(i.status)),

    // Dashboard preset filters
    actions_en_attente: () => filterPendingActions(filteredInterventions, userContext),
    en_cours: () => filteredInterventions.filter(i => [
      "demande", "approuvee", "demande_de_devis", "planification", "planifiee"
    ].includes(i.status)),
    terminees: () => filteredInterventions.filter(i => [
      "cloturee_par_prestataire", "cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee"
    ].includes(i.status)),

    // Prestataire preset filters (specific order: en_cours, terminees, toutes)
    prestataire_en_cours: () => filteredInterventions.filter(i => [
      "demande_de_devis", "planification", "planifiee", "approuvee"
    ].includes(i.status)),
    prestataire_terminees: () => filteredInterventions.filter(i => [
      "cloturee_par_prestataire", "cloturee_par_locataire", "cloturee_par_gestionnaire"
    ].includes(i.status)),
    prestataire_toutes: () => filteredInterventions
  }

  // Get filtered data for a tab
  const getFilteredByTab = (tabId: string) => {
    const filterFn = filterFunctions[tabId as keyof typeof filterFunctions]
    return filterFn ? filterFn() : filteredInterventions
  }

  // Get empty state config for a tab
  const getEmptyStateForTab = (tabId: string) => {
    if (emptyStateConfig) return emptyStateConfig

    const configs: Record<string, EmptyStateConfig> = {
      toutes: { title: "Aucune intervention", description: "Les interventions apparaîtront ici" },
      demandes_group: { title: "Aucune demande", description: "Les demandes en attente apparaîtront ici" },
      en_cours_group: { title: "Aucune intervention en cours", description: "Les interventions actives apparaîtront ici" },
      cloturees_group: { title: "Aucune intervention clôturée", description: "Les interventions terminées apparaîtront ici" },
      actions_en_attente: { title: "Aucune action en attente", description: "Toutes vos interventions sont à jour" },
      en_cours: { title: "Aucune intervention en cours", description: "Les interventions actives apparaîtront ici" },
      terminees: { title: "Aucune intervention terminée", description: "Les interventions terminées apparaîtront ici" },
      // Prestataire presets
      prestataire_en_cours: { title: "Aucune intervention en cours", description: "Les interventions actives apparaîtront ici" },
      prestataire_terminees: { title: "Aucune intervention terminée", description: "Les interventions terminées apparaîtront ici" },
      prestataire_toutes: { title: "Aucune intervention", description: "Les interventions apparaîtront ici" }
    }
    return configs[tabId] || { title: "Aucune donnée", description: "" }
  }

  // Render content for each tab
  const renderTabContent = (tabId: string) => {
    const tabData = getFilteredByTab(tabId)

    if (!mounted) {
      return (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      )
    }

    return (
      <InterventionsViewContainer
        interventions={tabData}
        userContext={userContext}
        loading={loading}
        emptyStateConfig={getEmptyStateForTab(tabId)}
        showStatusActions={true}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hideViewSwitcher={true}
      />
    )
  }

  // Pending actions count (for dashboard conditional tab)
  const pendingActionsCount = filterFunctions.actions_en_attente().length

  // Build tabs based on preset
  const tabs = useMemo(() => {
    if (tabsPreset === 'dashboard') {
      // Dashboard tabs: conditionally show "Actions en attente" first
      return [
        ...(pendingActionsCount > 0 ? [{
          id: "actions_en_attente",
          label: "En attente",
          icon: AlertTriangle,
          count: pendingActionsCount,
          content: renderTabContent("actions_en_attente")
        }] : []),
        {
          id: "en_cours",
          label: "En cours",
          icon: Clock,
          count: getFilteredByTab("en_cours").length,
          content: renderTabContent("en_cours")
        },
        {
          id: "terminees",
          label: "Terminées",
          icon: Archive,
          count: getFilteredByTab("terminees").length,
          content: renderTabContent("terminees")
        }
      ]
    }

    if (tabsPreset === 'prestataire') {
      // Prestataire tabs: En cours (default), Terminées, Toutes
      return [
        {
          id: "prestataire_en_cours",
          label: "En cours",
          icon: Clock,
          count: getFilteredByTab("prestataire_en_cours").length,
          content: renderTabContent("prestataire_en_cours")
        },
        {
          id: "prestataire_terminees",
          label: "Terminées",
          icon: Archive,
          count: getFilteredByTab("prestataire_terminees").length,
          content: renderTabContent("prestataire_terminees")
        },
        {
          id: "prestataire_toutes",
          label: "Toutes",
          icon: ListTodo,
          count: filteredInterventions.length,
          content: renderTabContent("prestataire_toutes")
        }
      ]
    }

    // Full tabs (page interventions)
    return [
      {
        id: "toutes",
        label: "Toutes",
        icon: ListTodo,
        count: filteredInterventions.length,
        content: renderTabContent("toutes")
      },
      {
        id: "demandes_group",
        label: "Demandes",
        icon: AlertTriangle,
        count: getFilteredByTab("demandes_group").length,
        content: renderTabContent("demandes_group")
      },
      {
        id: "en_cours_group",
        label: "En cours",
        icon: Settings,
        count: getFilteredByTab("en_cours_group").length,
        content: renderTabContent("en_cours_group")
      },
      {
        id: "cloturees_group",
        label: "Clôturées",
        icon: Archive,
        count: getFilteredByTab("cloturees_group").length,
        content: renderTabContent("cloturees_group")
      }
    ]
  }, [tabsPreset, filteredInterventions, pendingActionsCount, mounted, viewMode])

  // Default tab
  const defaultTab = tabsPreset === 'dashboard'
    ? (pendingActionsCount > 0 ? "actions_en_attente" : "en_cours")
    : tabsPreset === 'prestataire'
    ? "prestataire_en_cours"
    : "toutes"

  // View switcher
  const viewSwitcher = mounted ? (
    <ViewModeSwitcherV1
      value={viewMode}
      onChange={setViewMode}
    />
  ) : null

  // ========================================
  // Filter & Sort Controls
  // ========================================

  // Combined filter dropdown (status + urgency)
  const filterDropdown = (showCombinedFilter || showStatusFilter || showUrgencyFilter) ? (
    <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg border-border relative"
        >
          <Filter className="h-4 w-4 text-muted-foreground" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {(showStatusFilter || showCombinedFilter) && (
          <>
            <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
            {STATUS_OPTIONS.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedStatuses.includes(option.value)}
                onCheckedChange={() => handleStatusToggle(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
        {(showUrgencyFilter || showCombinedFilter) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filtrer par urgence</DropdownMenuLabel>
            {URGENCY_OPTIONS.map(option => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedUrgencies.includes(option.value)}
                onCheckedChange={() => handleUrgencyToggle(option.value)}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </>
        )}
        {activeFiltersCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearAllFilters} className="text-destructive">
              <X className="h-4 w-4 mr-2" />
              Effacer les filtres
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null

  // Sort dropdown
  const sortDropdown = showSortOptions ? (
    <Select value={sortBy} onValueChange={setSortBy}>
      <SelectTrigger className="h-9 w-[130px] rounded-lg border-border bg-card text-sm">
        <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
        <SelectValue placeholder="Trier" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ) : null

  // Combined right controls (filter + sort + view switcher)
  const rightControls = (filterDropdown || sortDropdown || viewSwitcher) ? (
    <div className="flex items-center gap-2">
      {filterDropdown}
      {sortDropdown}
      {viewSwitcher}
    </div>
  ) : null

  // Active filters badges (optional display)
  const activeFiltersBadges = showActiveFiltersBadges && (activeFiltersCount > 0 || searchTerm) ? (
    <div className="flex flex-wrap items-center gap-2 px-2 pb-2">
      <span className="text-xs text-muted-foreground">Filtres:</span>
      {searchTerm && (
        <Badge variant="secondary" className="gap-1 text-xs">
          "{searchTerm}"
          <button onClick={() => setSearchTerm('')} className="ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {selectedStatuses.map(status => {
        const label = STATUS_OPTIONS.find(o => o.value === status)?.label || status
        return (
          <Badge key={status} variant="secondary" className="gap-1 text-xs">
            {label}
            <button onClick={() => handleStatusToggle(status)} className="ml-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}
      {selectedUrgencies.map(urgency => {
        const label = URGENCY_OPTIONS.find(o => o.value === urgency)?.label || urgency
        return (
          <Badge key={urgency} variant="secondary" className="gap-1 text-xs">
            {label}
            <button onClick={() => handleUrgencyToggle(urgency)} className="ml-0.5">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearAllFilters}
        className="text-muted-foreground h-5 px-1.5 text-xs"
      >
        Tout effacer
      </Button>
    </div>
  ) : null

  // ========================================
  // BEM Classes
  // ========================================
  const blockClass = cn(
    "interventions-section",
    "flex-1 flex flex-col min-h-0",
    compact && "interventions-section--compact"
  )

  const headerClass = cn(
    "interventions-section__header",
    "flex items-center justify-between gap-2 flex-shrink-0",
    compact ? "px-2 py-1.5 sm:px-3 sm:py-2" : "px-4 py-3"
  )

  const titleClass = cn(
    "interventions-section__title",
    "flex items-center gap-1.5"
  )

  const actionsClass = cn(
    "interventions-section__actions",
    "flex items-center gap-1 flex-shrink-0"
  )

  const contentClass = cn(
    "interventions-section__content",
    "flex-1 flex flex-col min-h-0",
    compact ? "px-2 pb-1.5 sm:px-3 sm:pb-2" : ""
  )

  // ========================================
  // Render
  // ========================================

  // Without header (page mode) - no extra wrapper, ContentNavigator handles everything
  if (!showHeader) {
    return (
      <ContentNavigator
        tabs={tabs}
        defaultTab={defaultTab}
        activeTab={activeTab}
        searchPlaceholder="Rechercher par titre, description, ou lot..."
        onSearch={setSearchTerm}
        rightControls={rightControls}
        className={cn("flex-1 min-h-0", className)}
      />
    )
  }

  // With header (dashboard mode)
  const HeaderIcon = headerConfig?.icon
  return (
    <div className={blockClass}>
      {/* Card wrapper for dashboard mode */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className={headerClass}>
          <div className={titleClass}>
            {HeaderIcon && (
              <HeaderIcon className={cn(
                "text-gray-600",
                compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-5 w-5"
              )} />
            )}
            <h2 className={cn(
              "font-semibold text-gray-900 leading-tight",
              compact ? "text-xs sm:text-sm" : "text-base"
            )}>
              {headerConfig?.title}
            </h2>
          </div>
          {headerConfig?.actions && (
            <div className={actionsClass}>
              {headerConfig.actions}
            </div>
          )}
        </div>

        {/* Active filters badges */}
        {activeFiltersBadges}

        {/* Content */}
        <div className={contentClass}>
          <ContentNavigator
            tabs={tabs}
            defaultTab={defaultTab}
            activeTab={activeTab}
            searchPlaceholder="Rechercher par titre, description, ou référence..."
            onSearch={setSearchTerm}
            rightControls={rightControls}
            className="shadow-none border-0 bg-transparent flex-1 flex flex-col min-h-0"
          />
        </div>
      </div>
    </div>
  )
}
