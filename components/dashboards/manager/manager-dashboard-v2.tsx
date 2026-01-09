"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
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
import { DashboardInterventionsSection } from "@/components/dashboards/shared/dashboard-interventions-section"
import { UrgentInterventionsSection } from "@/components/dashboards/manager/urgent-interventions-section"
import { KPICarousel, statsToKPICards } from "@/components/dashboards/shared/kpi-carousel"
import { GestionnaireFAB } from "@/components/ui/fab"
import { PeriodSelector, getDefaultPeriod, type Period } from "@/components/ui/period-selector"
import { OnboardingButton, OnboardingModal } from "@/components/onboarding"

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

    // Local state for interventions (enables realtime updates)
    const [interventions, setInterventions] = useState(initialInterventions)

    // Period filter state - defaults to 30 days
    const [period, setPeriod] = useState<Period>(getDefaultPeriod('30d'))

    // Calculate tenant count from contactStats
    const tenantCount = contactStats?.contactsByType?.locataire?.total || 0

    // Calculate active and completed intervention counts
    const activeInterventionsCount = useMemo(() => {
        return interventions.filter(i =>
            ['demande', 'approuvee', 'demande_de_devis', 'planification', 'planifiee', 'en_cours'].includes(i.status)
        ).length
    }, [interventions])

    const completedInterventionsCount = useMemo(() => {
        return interventions.filter(i =>
            ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)
        ).length
    }, [interventions])

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

    // Realtime updates for interventions 
    useRealtimeInterventions({
        interventionCallbacks: {
            onUpdate: useCallback((updatedIntervention: DbIntervention) => {
                setInterventions(prev =>
                    prev.map(intervention =>
                        intervention.id === updatedIntervention.id
                            ? { ...intervention, ...updatedIntervention }
                            : intervention
                    )
                )
            }, [])
        }
    })

    return (
        <div className="dashboard">
            <div className="dashboard__container">
                {/* Header Section */}
                <div className="dashboard__header">
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                        {/* Title + Period Selector + Guide together */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-foreground">Tableau de bord</h1>
                            {/* Period Selector - Dropdown only */}
                            <PeriodSelector
                                value={period.value}
                                onChange={setPeriod}
                            />
                            {/* Onboarding Guide Button */}
                            <OnboardingButton />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            {/* Bouton Importer */}
                            <Button
                                variant="outline"
                                onClick={() => router.push("/gestionnaire/biens/import")}
                                className="bg-card border-border text-foreground rounded-xl"
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                <span>Importer</span>
                            </Button>

                            {/* Bouton Ajouter avec dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button className="rounded-xl px-4">
                                        <Plus className="h-4 w-4 mr-2" />
                                        <span>Ajouter</span>
                                        <ChevronDown className="h-4 w-4 ml-2" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem
                                        onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <Wrench className="h-4 w-4" />
                                        <span>Une intervention</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => router.push("/gestionnaire/contrats/nouveau")}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <FileText className="h-4 w-4" />
                                        <span>Un contrat</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <Building2 className="h-4 w-4" />
                                        <span>Un immeuble</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <Home className="h-4 w-4" />
                                        <span>Un lot</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => router.push("/gestionnaire/contacts/nouveau")}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                        <span>Un contact</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Stats Section - Mobile Carousel */}
                <div className="dashboard__stats lg:hidden">
                    <KPICarousel
                        cards={statsToKPICards({
                            pendingCount,
                            activeCount: activeInterventionsCount,
                            completedCount: completedInterventionsCount,
                            buildingsCount: stats.buildingsCount,
                            lotsCount: stats.lotsCount,
                            occupancyRate: stats.occupancyRate,
                            tenantCount,
                            contractStats,
                            onContractClick: () => router.push('/gestionnaire/biens/contrats')
                        })}
                    />
                </div>

                {/* Stats Section - Desktop Grid */}
                <div className="dashboard__stats hidden lg:block">
                    <DashboardStatsCards
                        pendingCount={pendingCount}
                        activeCount={activeInterventionsCount}
                        completedCount={completedInterventionsCount}
                        buildingsCount={stats.buildingsCount}
                        lotsCount={stats.lotsCount}
                        occupancyRate={stats.occupancyRate}
                        tenantCount={tenantCount}
                        contractStats={contractStats}
                    />
                </div>

                {/* Urgent Interventions Section */}
                <div className="dashboard__urgent mb-6">
                    <UrgentInterventionsSection
                        interventions={filteredInterventions}
                        userContext="gestionnaire"
                        maxItems={10}
                    />
                </div>

                {/* Content Section */}
                <div className="dashboard__content">
                    <DashboardInterventionsSection
                        interventions={filteredInterventions}
                        userContext="gestionnaire"
                        title={period.value !== 'all' ? `Interventions (${period.label})` : "Interventions"}
                        onCreateIntervention={() => router.push('/gestionnaire/interventions/nouvelle-intervention')}
                    />
                </div>
            </div>

            {/* Mobile FAB - Quick Actions */}
            <GestionnaireFAB
                onCreateIntervention={() => router.push('/gestionnaire/interventions/nouvelle-intervention')}
                onCreateContract={() => router.push('/gestionnaire/contrats/nouveau')}
                onCreateBuilding={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
                onCreateLot={() => router.push('/gestionnaire/biens/lots/nouveau')}
                onCreateContact={() => router.push('/gestionnaire/contacts/nouveau')}
            />

            {/* Onboarding Modal - Auto-opens on first visit */}
            <OnboardingModal />
        </div>
    )
}
