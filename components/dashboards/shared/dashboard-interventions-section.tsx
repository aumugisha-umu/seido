"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    Filter,
    LayoutGrid,
    List,
    Calendar as CalendarIcon,
    X,
    ArrowUpDown
} from "lucide-react"
import { ManagerInterventionCard } from "@/components/dashboards/manager/manager-intervention-card"
import { InterventionsCalendarView } from "@/components/interventions/interventions-calendar-view"
import { InterventionsEmptyState } from "@/components/interventions/interventions-empty-state"
import { InterventionsListViewV1 } from "@/components/interventions/interventions-list-view-v1"
import { useAuth } from "@/hooks/use-auth"
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

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

type ViewMode = 'grid' | 'list' | 'calendar'
type SortField = 'date' | 'urgency' | 'status' | 'title'
type SortOrder = 'asc' | 'desc'

const STATUS_OPTIONS = [
    { value: 'demande', label: 'Demande' },
    { value: 'approuvee', label: 'Approuvée' },
    { value: 'demande_de_devis', label: 'Devis demandé' },
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
// HOOKS
// ============================================================================

/**
 * Custom hook for debounced value
 */
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

/**
 * Custom hook for localStorage persistence
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue)

    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key)
            if (item) {
                setStoredValue(JSON.parse(item))
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error)
        }
    }, [key])

    const setValue = useCallback((value: T) => {
        try {
            setStoredValue(value)
            window.localStorage.setItem(key, JSON.stringify(value))
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error)
        }
    }, [key])

    return [storedValue, setValue]
}

// ============================================================================
// COMPONENT
// ============================================================================

interface DashboardInterventionsSectionProps {
    interventions: any[]
    userContext: 'gestionnaire' | 'prestataire' | 'locataire'
    title?: string
    onCreateIntervention?: () => void
}

export function DashboardInterventionsSection({
    interventions,
    userContext,
    title = "Interventions",
    onCreateIntervention
}: DashboardInterventionsSectionProps) {
    // Auth for userId (needed for alert badges in list view)
    const { user } = useAuth()

    // View mode persisted in localStorage
    const [viewMode, setViewMode] = useLocalStorage<ViewMode>('dashboard-view-mode', 'grid')

    // Search with debounce
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
    const [selectedUrgencies, setSelectedUrgencies] = useState<string[]>([])
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Sorting
    const [sortBy, setSortBy] = useState<string>('date-desc')

    // Active filters count
    const activeFiltersCount = selectedStatuses.length + selectedUrgencies.length

    // ==========================================================================
    // FILTERING & SORTING LOGIC
    // ==========================================================================

    const filteredAndSortedInterventions = useMemo(() => {
        let result = [...interventions]

        // 1. Apply search filter
        if (debouncedSearch.trim()) {
            const searchLower = debouncedSearch.toLowerCase()
            result = result.filter(intervention => {
                const title = intervention.title?.toLowerCase() || ''
                const description = intervention.description?.toLowerCase() || ''
                const reference = intervention.reference?.toLowerCase() || ''
                const type = intervention.intervention_type?.toLowerCase() || intervention.type?.toLowerCase() || ''
                const buildingName = intervention.lot?.building?.name?.toLowerCase() || ''
                const lotName = intervention.lot?.name?.toLowerCase() || ''

                return (
                    title.includes(searchLower) ||
                    description.includes(searchLower) ||
                    reference.includes(searchLower) ||
                    type.includes(searchLower) ||
                    buildingName.includes(searchLower) ||
                    lotName.includes(searchLower)
                )
            })
        }

        // 2. Apply status filter
        if (selectedStatuses.length > 0) {
            result = result.filter(intervention =>
                selectedStatuses.includes(intervention.status)
            )
        }

        // 3. Apply urgency filter
        if (selectedUrgencies.length > 0) {
            result = result.filter(intervention => {
                const urgency = intervention.urgency || intervention.priority || 'normale'
                return selectedUrgencies.includes(urgency)
            })
        }

        // 4. Apply sorting
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
                    const urgencyA = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || urgencyOrder[a.priority as keyof typeof urgencyOrder] || 1
                    const urgencyB = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || urgencyOrder[b.priority as keyof typeof urgencyOrder] || 1
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

        return result
    }, [interventions, debouncedSearch, selectedStatuses, selectedUrgencies, sortBy])

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    const handleStatusToggle = (status: string) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        )
    }

    const handleUrgencyToggle = (urgency: string) => {
        setSelectedUrgencies(prev =>
            prev.includes(urgency)
                ? prev.filter(u => u !== urgency)
                : [...prev, urgency]
        )
    }

    const clearAllFilters = () => {
        setSearchQuery('')
        setSelectedStatuses([])
        setSelectedUrgencies([])
        setSortBy('date-desc')
    }

    // ==========================================================================
    // RENDER
    // ==========================================================================

    return (
        <Card className="bg-card rounded-lg border border-border shadow-sm">
            <div className="p-4 space-y-6">
                {/* Controls Row 1: Title + Search */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-8 h-10 bg-card dark:bg-white/5 border-border dark:border-white/10 rounded-xl"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter Dropdown */}
                        <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 rounded-xl border-border relative"
                                >
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    {activeFiltersCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
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

                        {/* Sort Dropdown */}
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-10 w-[140px] rounded-xl border-border bg-card">
                                <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
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

                        {/* View Mode Toggle */}
                        <div className="flex bg-card dark:bg-white/5 rounded-xl border border-border dark:border-white/10 p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setViewMode('grid')}
                                title="Vue grille"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setViewMode('list')}
                                title="Vue liste"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setViewMode('calendar')}
                                title="Vue calendrier"
                            >
                                <CalendarIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Active Filters Pills */}
                {(activeFiltersCount > 0 || debouncedSearch) && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">Filtres actifs:</span>
                        {debouncedSearch && (
                            <Badge variant="secondary" className="gap-1">
                                Recherche: "{debouncedSearch}"
                                <button onClick={() => setSearchQuery('')}>
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {selectedStatuses.map(status => {
                            const label = STATUS_OPTIONS.find(o => o.value === status)?.label || status
                            return (
                                <Badge key={status} variant="secondary" className="gap-1">
                                    {label}
                                    <button onClick={() => handleStatusToggle(status)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )
                        })}
                        {selectedUrgencies.map(urgency => {
                            const label = URGENCY_OPTIONS.find(o => o.value === urgency)?.label || urgency
                            return (
                                <Badge key={urgency} variant="secondary" className="gap-1">
                                    {label}
                                    <button onClick={() => handleUrgencyToggle(urgency)}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )
                        })}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-muted-foreground h-6 px-2"
                        >
                            Tout effacer
                        </Button>
                    </div>
                )}

                {/* Results Count */}
                {interventions.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                        {filteredAndSortedInterventions.length === interventions.length
                            ? `${interventions.length} intervention${interventions.length > 1 ? 's' : ''}`
                            : `${filteredAndSortedInterventions.length} sur ${interventions.length} intervention${interventions.length > 1 ? 's' : ''}`
                        }
                    </div>
                )}

                {/* Content View - Empty State or Interventions */}
                {filteredAndSortedInterventions.length === 0 ? (
                    interventions.length === 0 ? (
                        <InterventionsEmptyState
                            title="Aucune intervention"
                            description="Créez votre première intervention pour commencer"
                            showCreateButton={true}
                            createButtonText="Créer une intervention"
                            createButtonAction={onCreateIntervention}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">Aucun résultat</h3>
                            <p className="text-muted-foreground mb-4">
                                Aucune intervention ne correspond à vos critères de recherche.
                            </p>
                            <Button variant="outline" onClick={clearAllFilters}>
                                Effacer les filtres
                            </Button>
                        </div>
                    )
                ) : (
                    <>
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAndSortedInterventions.map((intervention) => (
                                    <div key={intervention.id} className="h-full">
                                        <ManagerInterventionCard
                                            intervention={intervention}
                                            userContext={userContext}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <InterventionsListViewV1
                                interventions={filteredAndSortedInterventions}
                                userContext={userContext}
                                userId={user?.id}
                            />
                        )}

                        {viewMode === 'calendar' && (
                            <div className="h-[600px] bg-card dark:bg-white/5 rounded-xl border border-border dark:border-white/10 shadow-sm dark:shadow-none dark:backdrop-blur-md p-4">
                                <InterventionsCalendarView
                                    interventions={filteredAndSortedInterventions}
                                    userContext={userContext}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    )
}
