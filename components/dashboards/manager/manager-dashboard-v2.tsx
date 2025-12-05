"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    ArrowUpRight,
    Droplets,
    Flame,
    Zap,
    Key,
    Hammer,
    Plus,
    Wrench,
    Home,
    FileText
} from "lucide-react"
import { DashboardStatsCards } from "@/components/dashboards/shared/dashboard-stats-cards"
import { DashboardInterventionsSection } from "@/components/dashboards/shared/dashboard-interventions-section"

interface ManagerDashboardProps {
    stats: any
    contactStats: any
    interventions: any[]
    pendingCount: number
}

const getTypeConfig = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'plomberie': return { icon: Droplets, color: 'bg-type-plomberie-light text-type-plomberie' }
        case 'chauffage': return { icon: Flame, color: 'bg-type-chauffage-light text-type-chauffage' }
        case 'electricite': return { icon: Zap, color: 'bg-type-electricite-light text-type-electricite' }
        case 'serrurerie': return { icon: Key, color: 'bg-type-serrurerie-light text-type-serrurerie' }
        case 'toiture': return { icon: Home, color: 'bg-type-toiture-light text-type-toiture' }
        default: return { icon: Wrench, color: 'bg-type-autre-light text-type-autre' }
    }
}

export function ManagerDashboardV2({ stats, contactStats, interventions, pendingCount }: ManagerDashboardProps) {
    const router = useRouter()

    return (
        <div className="dashboard">
            <div className="dashboard__container">
                {/* Header Section */}
                <div className="dashboard__header">
                    <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Bonjour, Gestionnaire</h1>
                            <p className="text-muted-foreground mt-1">Voici ce qui se passe dans votre parc aujourd'hui.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {/* Primary actions */}
                            <Button
                                onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl px-4"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">Créer une intervention</span>
                                <span className="sm:hidden">Intervention</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/gestionnaire/contrats/nouveau")}
                                className="bg-card border-border text-foreground rounded-xl"
                            >
                                <FileText className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Créer un contrat</span>
                            </Button>
                            {/* Secondary actions */}
                            <Button
                                variant="outline"
                                onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
                                className="bg-card border-border text-foreground rounded-xl"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ajouter un immeuble</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
                                className="bg-card border-border text-foreground rounded-xl"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ajouter un lot</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push("/gestionnaire/contacts/nouveau")}
                                className="bg-card border-border text-foreground rounded-xl"
                            >
                                <Plus className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ajouter un contact</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="dashboard__stats">
                    <DashboardStatsCards
                        pendingCount={pendingCount}
                        activeCount={stats.interventionsCount}
                        buildingsCount={stats.buildingsCount}
                        lotsCount={stats.lotsCount}
                        occupancyRate={stats.occupancyRate}
                    />
                </div>

                {/* Content Section */}
                <div className="dashboard__content">
                    <DashboardInterventionsSection
                        interventions={interventions}
                        userContext="gestionnaire"
                        title="Interventions"
                        onCreateIntervention={() => router.push('/gestionnaire/interventions/nouvelle-intervention')}
                    />
                </div>
            </div>
        </div>
    )
}
