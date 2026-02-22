"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRealtimeInterventions } from "@/hooks/use-realtime-interventions"
import {
    Plus,
    FileText,
    Upload,
    Building2,
    Home,
    UserPlus,
    Wrench,
    ChevronDown
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DashboardStatsCards } from "@/components/dashboards/shared/dashboard-stats-cards"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { KPIMobileGrid, statsToKPICards } from "@/components/dashboards/shared/kpi-carousel"
import { useToast } from "@/hooks/use-toast"
import { GestionnaireFAB } from "@/components/ui/fab"
import { PeriodSelector, getDefaultPeriod, type Period } from "@/components/ui/period-selector"
import { OnboardingButton, OnboardingModal } from "@/components/onboarding"
import { OnboardingChecklist } from "@/components/billing/onboarding-checklist"
import { useSubscription } from "@/hooks/use-subscription"
import { useStrategicNotification } from "@/hooks/use-strategic-notification"
import { FREE_TIER_LIMIT } from "@/lib/stripe"
import { PageActions } from "@/components/page-actions"

import type { ContractStats } from "@/lib/types/contract.types"
import type { Database } from "@/lib/database.types"

// Type for intervention row from Supabase (used in realtime callback)
type DbIntervention = Database['public']['Tables']['interventions']['Row']

interface ManagerDashboardProps {
    stats: any
    contactStats: any
    contractStats: ContractStats
    interventions: any[]
    pendingCount: number
}

export function ManagerDashboardV2({ stats, contactStats, contractStats, interventions: initialInterventions, pendingCount }: ManagerDashboardProps) {
    const router = useRouter()
    const { toast } = useToast()

    // Local state for interventions (enables realtime updates)
    const [interventions, setInterventions] = useState(initialInterventions)

    // Period filter state - defaults to 30 days
    const [period, setPeriod] = useState<Period>(getDefaultPeriod('30d'))

    // Celebration flag for 100% completion (show toast once per session)
    const [hasShownCelebration, setHasShownCelebration] = useState(false)

    // Strategic notification hook (upgrade prompts at positive moments)
    const { daysLeftTrial } = useSubscription()
    const { onInterventionClosed, checkQuotaWarning } = useStrategicNotification({
        daysLeftTrial,
        lotCount: stats.lotsCount ?? 0,
        freeTierLimit: FREE_TIER_LIMIT,
    })

    // Calculate tenant count from contactStats
    const tenantCount = contactStats?.contactsByType?.locataire?.total || 0

    // Calculate active and completed intervention counts
    // ✅ FIX 2026-01-26: Removed demande_de_devis - quotes now managed via requires_quote
    const activeInterventionsCount = useMemo(() => {
        return interventions.filter(i =>
            ['demande', 'approuvee', 'planification', 'planifiee'].includes(i.status)
        ).length
    }, [interventions])

    const completedInterventionsCount = useMemo(() => {
        return interventions.filter(i =>
            ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)
        ).length
    }, [interventions])

    // ⚡ Memoized navigation callbacks to prevent re-renders
    const navigateToImport = useCallback(() => router.push('/gestionnaire/import'), [router])
    const navigateToNewIntervention = useCallback(() => router.push('/gestionnaire/interventions/nouvelle-intervention'), [router])
    const navigateToNewContract = useCallback(() => router.push('/gestionnaire/contrats/nouveau'), [router])
    const navigateToNewBuilding = useCallback(() => router.push('/gestionnaire/biens/immeubles/nouveau'), [router])
    const navigateToNewLot = useCallback(() => router.push('/gestionnaire/biens/lots/nouveau'), [router])
    const navigateToNewContact = useCallback(() => router.push('/gestionnaire/contacts/nouveau'), [router])
    const navigateToContracts = useCallback(() => router.push('/gestionnaire/biens/contrats'), [router])

    // Filter interventions by selected period
    const filteredInterventions = useMemo(() => {
        if (period.value === 'all' || !period.startDate) {
            return interventions
        }

        return interventions.filter(intervention => {
            const interventionDate = new Date(intervention.created_at)

            if (period.startDate && interventionDate < period.startDate) {
                return false
            }

            if (period.endDate && interventionDate > period.endDate) {
                return false
            }

            return true
        })
    }, [interventions, period])

    // Calculate progress data for the period (integrated into "En cours" KPI card)
    const progressData = useMemo(() => {
        // Exclude rejected and cancelled from valid interventions
        const validInterventions = filteredInterventions.filter(i =>
            !['rejetee', 'annulee'].includes(i.status)
        )

        // Count completed interventions
        const completed = validInterventions.filter(i =>
            ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)
        ).length

        const total = validInterventions.length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

        // Generate period label
        const periodLabel = period.value === '7d' ? 'cette semaine'
            : period.value === '30d' ? 'ce mois'
            : period.value === '90d' ? 'ce trimestre'
            : 'au total'

        return { completed, total, percentage, periodLabel }
    }, [filteredInterventions, period])

    // Celebration toast when reaching 100% completion
    useEffect(() => {
        if (progressData.percentage === 100 && progressData.total > 0 && !hasShownCelebration) {
            toast({
                title: "Toutes les interventions sont complètes !",
                description: `Vous avez finalisé ${progressData.total} intervention${progressData.total > 1 ? 's' : ''} ${progressData.periodLabel}.`,
                variant: "default",
                duration: 5000
            })
            setHasShownCelebration(true)
        }
    }, [progressData, hasShownCelebration, toast])

    // Reset celebration flag when period changes
    useEffect(() => {
        setHasShownCelebration(false)
    }, [period.value])

    // Realtime updates for interventions
    const closedStatuses = ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire']
    useRealtimeInterventions({
        interventionCallbacks: {
            onUpdate: useCallback((updatedIntervention: DbIntervention) => {
                setInterventions(prev => {
                    const updated = prev.map(intervention =>
                        intervention.id === updatedIntervention.id
                            ? { ...intervention, ...updatedIntervention }
                            : intervention
                    )

                    // Strategic notification: detect intervention closure in realtime
                    if (closedStatuses.includes(updatedIntervention.status)) {
                        const oldIntervention = prev.find(i => i.id === updatedIntervention.id)
                        if (oldIntervention && !closedStatuses.includes(oldIntervention.status)) {
                            const totalClosed = updated.filter(i => closedStatuses.includes(i.status)).length
                            onInterventionClosed(totalClosed)
                        }
                    }

                    return updated
                })
            // eslint-disable-next-line react-hooks/exhaustive-deps
            }, [onInterventionClosed])
        }
    })

    // Check quota warning on mount (90% of free tier)
    useEffect(() => {
        checkQuotaWarning()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Scroll-to-interventions + focus animation state
    const interventionsRef = useRef<HTMLDivElement>(null)
    const [initialActiveTab, setInitialActiveTab] = useState<string | undefined>(undefined)
    const [focusInterventions, setFocusInterventions] = useState(false)

    const handleActionsClick = useCallback(() => {
        // 1. Switch to "À traiter" tab
        setInitialActiveTab("actions_en_attente")

        // 2. Scroll smooth to the interventions section
        setTimeout(() => {
            interventionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)

        // 3. Trigger focus animation
        setFocusInterventions(true)
        setTimeout(() => setFocusInterventions(false), 1500)

        // 4. Reset initialActiveTab so ContentNavigator returns to uncontrolled mode
        // This allows the user to freely click other tabs afterwards
        setTimeout(() => setInitialActiveTab(undefined), 100)
    }, [])

    return (
        <div className="dashboard">
            <div className="dashboard__container pb-24 lg:pb-6 flex flex-col lg:h-full">
                {/* Header Actions (rendered in topbar via portal) */}
                <PageActions>
                    <OnboardingButton />
                    <div className="hidden sm:block">
                        <PeriodSelector
                            value={period.value}
                            onChange={setPeriod}
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={navigateToImport}
                        className="hidden sm:flex bg-card border-border text-foreground rounded-xl"
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        <span>Importer</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="hidden sm:flex rounded-xl px-4">
                                <Plus className="h-4 w-4 mr-2" />
                                <span>Ajouter</span>
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                                onClick={navigateToNewIntervention}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Wrench className="h-4 w-4" />
                                <span>Une intervention</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={navigateToNewContract}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <FileText className="h-4 w-4" />
                                <span>Un contrat</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={navigateToNewBuilding}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Building2 className="h-4 w-4" />
                                <span>Un immeuble</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={navigateToNewLot}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <Home className="h-4 w-4" />
                                <span>Un lot</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={navigateToNewContact}
                                className="flex items-center gap-2 cursor-pointer"
                            >
                                <UserPlus className="h-4 w-4" />
                                <span>Un contact</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </PageActions>

                {/* Mobile period selector (stays in content area) */}
                <div className="sm:hidden mb-4">
                    <PeriodSelector
                        value={period.value}
                        onChange={setPeriod}
                        compact
                    />
                </div>

                {/* Stats Section - Mobile Grid (2x2 + hero "Actions requises") */}
                <div className="dashboard__stats lg:hidden">
                    <KPIMobileGrid
                        cards={statsToKPICards({
                            pendingCount,
                            activeCount: activeInterventionsCount,
                            completedCount: completedInterventionsCount,
                            buildingsCount: stats.buildingsCount,
                            lotsCount: stats.lotsCount,
                            buildingLotsCount: stats.buildingLotsCount,
                            independentLotsCount: stats.independentLotsCount,
                            occupancyRate: stats.occupancyRate,
                            tenantCount,
                            contractStats,
                            onContractClick: navigateToContracts,
                            onActionsClick: handleActionsClick,
                            progressData
                        })}
                    />
                </div>

                {/* Stats Section - Desktop Grid (full, first on desktop) */}
                <div className="dashboard__stats hidden lg:block lg:order-1">
                    <DashboardStatsCards
                        pendingCount={pendingCount}
                        activeCount={activeInterventionsCount}
                        completedCount={completedInterventionsCount}
                        buildingsCount={stats.buildingsCount}
                        lotsCount={stats.lotsCount}
                        buildingLotsCount={stats.buildingLotsCount}
                        independentLotsCount={stats.independentLotsCount}
                        occupancyRate={stats.occupancyRate}
                        tenantCount={tenantCount}
                        contractStats={contractStats}
                        progressData={progressData}
                        onActionsClick={handleActionsClick}
                    />
                </div>

                {/* Onboarding Checklist — trialing users only (self-contained) */}
                <div className="lg:order-2">
                    <OnboardingChecklist className="mb-4" />
                </div>

                {/* Content Section - Unified InterventionsNavigator */}
                <div
                    ref={interventionsRef}
                    className={cn(
                        "dashboard__content lg:order-3 transition-all duration-300 rounded-lg",
                        focusInterventions && "ring-2 ring-amber-400/60 ring-offset-2"
                    )}
                >
                    <InterventionsNavigator
                        interventions={filteredInterventions}
                        userContext="gestionnaire"
                        tabsPreset="dashboard"
                        showHeader={true}
                        headerConfig={{
                            title: period.value !== 'all' ? `Interventions (${period.label})` : "Interventions",
                            icon: Wrench
                        }}
                        showSortOptions={true}
                        showCombinedFilter={true}
                        compact={true}
                        initialActiveTab={initialActiveTab}
                    />
                </div>
            </div>

            {/* Mobile FAB - Quick Actions */}
            <GestionnaireFAB
                onCreateIntervention={navigateToNewIntervention}
                onCreateContract={navigateToNewContract}
                onCreateBuilding={navigateToNewBuilding}
                onCreateLot={navigateToNewLot}
                onCreateContact={navigateToNewContact}
            />

            {/* Onboarding Modal - Auto-opens on first visit */}
            <OnboardingModal />
        </div>
    )
}
