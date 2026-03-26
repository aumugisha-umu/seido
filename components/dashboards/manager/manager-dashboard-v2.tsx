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
import { UnreadMessagesSection } from "@/components/dashboards/shared/unread-messages-section"
import { InterventionsNavigator } from "@/components/interventions/interventions-navigator"
import { TaskTypeSegment, type TaskType } from "@/components/operations/task-type-segment"
import { RemindersNavigator } from "@/components/operations/reminders-navigator"
import { useReminderActions } from "@/hooks/use-reminder-actions"
import { KPIMobileGrid, statsToKPICards } from "@/components/dashboards/shared/kpi-carousel"
import { TrialUpgradeModal } from "@/components/billing/trial-upgrade-modal"
import { useSubscription } from "@/hooks/use-subscription"
import { useStrategicNotification } from "@/hooks/use-strategic-notification"
import { FREE_TIER_LIMIT } from "@/lib/stripe"
import { PageActions } from "@/components/page-actions"

import type { ContractStats } from "@/lib/types/contract.types"
import type { Database } from "@/lib/database.types"
import type { UnreadThread } from "@/lib/services/repositories/conversation-repository"
import type { ReminderStats, ReminderWithRelations } from "@/lib/types/reminder.types"
// Bank module hidden until Tink app is approved in production
// import type { BankWidgetsSectionProps } from "@/components/bank/dashboard-bank-widgets"
// import { BankWidgetsSection } from "@/components/bank/dashboard-bank-widgets"

// Type for intervention row from Supabase (used in realtime callback)
type DbIntervention = Database['public']['Tables']['interventions']['Row']

const closedStatuses = ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire']

interface DashboardStats {
    buildingsCount: number
    lotsCount: number
    occupiedLotsCount: number
    occupancyRate: number
    interventionsCount: number
    buildingLotsCount?: number
    independentLotsCount?: number
}

interface ManagerDashboardProps {
    stats: DashboardStats
    tenantCount: number
    contractStats: ContractStats
    interventions: DbIntervention[]
    pendingCount: number
    unreadThreads?: UnreadThread[]
    unreadThreadsTotalCount?: number
    reminderStats?: ReminderStats
    reminders?: ReminderWithRelations[]
    // bankData?: BankWidgetsSectionProps  // Bank module hidden until Tink approved
}

export function ManagerDashboardV2({ stats, tenantCount, contractStats, interventions: initialInterventions, pendingCount, unreadThreads, unreadThreadsTotalCount, reminderStats, reminders = [] }: ManagerDashboardProps) {
    const router = useRouter()
    const { handleStartReminder, handleCompleteReminder, handleCancelReminder } = useReminderActions()
    // Local state for interventions (enables realtime updates)
    const [interventions, setInterventions] = useState(initialInterventions)

    // Strategic notification hook (upgrade prompts at positive moments)
    const { daysLeftTrial, status: subscriptionStatus } = useSubscription()
    const { onInterventionClosed, checkQuotaWarning } = useStrategicNotification({
        daysLeftTrial,
        lotCount: stats.lotsCount,
        freeTierLimit: FREE_TIER_LIMIT,
    })

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
    const navigateToNewIntervention = useCallback(() => router.push('/gestionnaire/operations/nouvelle-intervention'), [router])
    const navigateToNewContract = useCallback(() => router.push('/gestionnaire/contrats/nouveau'), [router])
    const navigateToNewBuilding = useCallback(() => router.push('/gestionnaire/biens/immeubles/nouveau'), [router])
    const navigateToNewLot = useCallback(() => router.push('/gestionnaire/biens/lots/nouveau'), [router])
    const navigateToNewContact = useCallback(() => router.push('/gestionnaire/contacts/nouveau'), [router])
    const navigateToContracts = useCallback(() => router.push('/gestionnaire/biens/contrats'), [router])

    // Realtime updates for interventions
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

    // Operations tab state (Interventions vs Reminders)
    const [activeOperationType, setActiveOperationType] = useState<TaskType>('intervention')

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
        setTimeout(() => setFocusInterventions(false), 300)

        // 4. Reset initialActiveTab so ContentNavigator returns to uncontrolled mode
        // This allows the user to freely click other tabs afterwards
        setTimeout(() => setInitialActiveTab(undefined), 100)
    }, [])

    return (
        <div className="dashboard">
            <div className="dashboard__container pb-24 lg:pb-6 flex flex-col">
                {/* Header Actions (rendered in topbar via portal) */}
                <PageActions>
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

                {/* Stats Section - Mobile Grid (2x2 + hero "Actions requises") */}
                <div className="dashboard__stats dashboard__stats--mobile">
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
                            reminderStats
                        })}
                    />
                </div>

                {/* Stats Section - Desktop Grid (full, first on desktop) */}
                <div className="dashboard__stats dashboard__stats--desktop">
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
                        onActionsClick={handleActionsClick}
                        reminderStats={reminderStats}
                    />
                </div>

                {/* Unread Messages Section */}
                {unreadThreads && unreadThreads.length > 0 && (
                    <div className="lg:order-2 mb-4">
                        <UnreadMessagesSection
                            threads={unreadThreads}
                            role="gestionnaire"
                            totalCount={unreadThreadsTotalCount ?? unreadThreads.length}
                        />
                    </div>
                )}

                {/* Bank Widgets Section — hidden until Tink approved */}

                {/* Operations Section (Interventions + Reminders) */}
                <div
                    ref={interventionsRef}
                    className={cn(
                        "dashboard__content lg:order-4 lg:max-h-[700px] transition-all duration-300 rounded-lg space-y-4",
                        focusInterventions && "ring-2 ring-amber-400/60 ring-offset-2"
                    )}
                >
                    <TaskTypeSegment
                        activeType={activeOperationType}
                        onTypeChange={setActiveOperationType}
                        interventionCount={interventions.length}
                        reminderCount={reminders.length}
                    />

                    {activeOperationType === 'intervention' ? (
                        <InterventionsNavigator
                            interventions={interventions}
                            userContext="gestionnaire"
                            tabsPreset="dashboard"
                            showHeader={false}
                            showSortOptions={true}
                            showCombinedFilter={true}
                            compact={true}
                            initialActiveTab={initialActiveTab}
                        />
                    ) : (
                        <RemindersNavigator
                            reminders={reminders}
                            onStart={handleStartReminder}
                            onComplete={handleCompleteReminder}
                            onCancel={handleCancelReminder}
                            emptyStateConfig={{
                                title: 'Aucun rappel',
                                description: 'Creez des rappels depuis la section Operations',
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Trial upgrade modal — shown once per session when <=2 days left */}
            <TrialUpgradeModal
                daysLeft={daysLeftTrial}
                paymentMethodAdded={subscriptionStatus?.payment_method_added ?? false}
                trialEndDate={subscriptionStatus?.trial_end ?? null}
                lotCount={stats.lotsCount}
                interventionCount={activeInterventionsCount + completedInterventionsCount}
            />
        </div>
    )
}
