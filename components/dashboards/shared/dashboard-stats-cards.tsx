"use client"

import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2, Wrench, Building2, Users, Home, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardStatsCardsProps {
    pendingCount: number
    activeCount: number
    completedCount?: number
    buildingsCount?: number
    lotsCount?: number
    occupancyRate?: number
}

export function DashboardStatsCards({
    pendingCount,
    activeCount,
    completedCount,
    buildingsCount,
    lotsCount,
    occupancyRate
}: DashboardStatsCardsProps) {
    const isManager = buildingsCount !== undefined

    return (
        <div className={cn(
            "dashboard-stats-cards grid grid-cols-1 gap-6",
            isManager ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
        )}>
            {/* Card 1: Actions requises (Always First) */}
            <Card className={cn(
                "dashboard-stats-cards__card",
                "border-none shadow-sm hover:shadow-md transition-all duration-300 hover:transform hover:-translate-y-1 rounded-2xl overflow-hidden group",
                "dark:backdrop-blur-sm dark:shadow-none",
                pendingCount > 0 ? "dashboard-stats-cards__card--warning" : "dashboard-stats-cards__card--success"
            )}>
                <CardContent className="dashboard-stats-cards__content p-6 relative">
                    <div className="dashboard-stats-cards__icon-bg absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertTriangle className="dashboard-stats-cards__icon h-24 w-24" />
                    </div>
                    <div className="dashboard-stats-cards__info relative z-10">
                        <p className="dashboard-stats-cards__label text-sm font-medium uppercase tracking-wider">
                            Actions requises
                        </p>
                        <div className="dashboard-stats-cards__value-container flex items-baseline gap-2 mt-2">
                            <span className="dashboard-stats-cards__value text-4xl font-bold">
                                {pendingCount}
                            </span>
                            <span className="dashboard-stats-cards__sublabel text-sm font-medium">
                                {pendingCount > 0 ? "Urgent" : "Tout est calme"}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card 2: Patrimoine (Manager Only) */}
            {isManager && (
                <Card className="dashboard-stats-cards__card dashboard-stats-cards__card--buildings bg-card dark:bg-white/5 border-none dark:border dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-all duration-300 hover:transform hover:-translate-y-1 rounded-2xl overflow-hidden group dark:backdrop-blur-sm">
                    <CardContent className="dashboard-stats-cards__content p-6 relative">
                        <div className="dashboard-stats-cards__icon-bg absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building2 className="h-24 w-24 text-indigo-600" />
                        </div>
                        <div className="dashboard-stats-cards__info relative z-10">
                            <p className="dashboard-stats-cards__label text-sm font-medium text-muted-foreground uppercase tracking-wider">Patrimoine</p>
                            <div className="dashboard-stats-cards__value-container flex items-baseline gap-2 mt-2">
                                <span className="dashboard-stats-cards__value text-4xl font-bold text-foreground">{buildingsCount}</span>
                                <span className="dashboard-stats-cards__sublabel text-sm text-muted-foreground/70 flex items-center gap-1">
                                    <Home className="h-3 w-3" /> {lotsCount} lots
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Card 3: Occupation (Manager Only) */}
            {isManager && occupancyRate !== undefined && (
                <Card className="dashboard-stats-cards__card dashboard-stats-cards__card--occupancy bg-card dark:bg-white/5 border-none dark:border dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-all duration-300 hover:transform hover:-translate-y-1 rounded-2xl overflow-hidden group dark:backdrop-blur-sm">
                    <CardContent className="dashboard-stats-cards__content p-6 relative">
                        <div className="dashboard-stats-cards__icon-bg absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="h-24 w-24 text-emerald-600" />
                        </div>
                        <div className="dashboard-stats-cards__info relative z-10">
                            <p className="dashboard-stats-cards__label text-sm font-medium text-muted-foreground uppercase tracking-wider">Occupation</p>
                            <div className="dashboard-stats-cards__value-container flex items-baseline gap-2 mt-2">
                                <span className="dashboard-stats-cards__value text-4xl font-bold text-foreground">{occupancyRate}%</span>
                                <span className="dashboard-stats-cards__sublabel text-sm text-success font-medium flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" /> Stable
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Card: En cours (Common) */}
            <Card className="dashboard-stats-cards__card dashboard-stats-cards__card--active bg-card dark:bg-white/5 border-none dark:border dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-all duration-300 hover:transform hover:-translate-y-1 rounded-2xl overflow-hidden group dark:backdrop-blur-sm">
                <CardContent className="dashboard-stats-cards__content p-6 relative">
                    <div className="dashboard-stats-cards__icon-bg absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wrench className="h-24 w-24 text-blue-600" />
                    </div>
                    <div className="dashboard-stats-cards__info relative z-10">
                        <p className="dashboard-stats-cards__label text-sm font-medium text-muted-foreground uppercase tracking-wider">En cours</p>
                        <div className="dashboard-stats-cards__value-container flex items-baseline gap-2 mt-2">
                            <span className="dashboard-stats-cards__value text-4xl font-bold text-primary">{activeCount}</span>
                            <span className="dashboard-stats-cards__sublabel text-sm text-muted-foreground/70">interventions</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Card: Terminées (Optional / Non-Manager) */}
            {!isManager && completedCount !== undefined && (
                <Card className="dashboard-stats-cards__card dashboard-stats-cards__card--completed bg-card dark:bg-white/5 border-none dark:border dark:border-white/10 shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-all duration-300 hover:transform hover:-translate-y-1 rounded-2xl overflow-hidden group dark:backdrop-blur-sm">
                    <CardContent className="dashboard-stats-cards__content p-6 relative">
                        <div className="dashboard-stats-cards__icon-bg absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <CheckCircle2 className="h-24 w-24 text-success" />
                        </div>
                        <div className="dashboard-stats-cards__info relative z-10">
                            <p className="dashboard-stats-cards__label text-sm font-medium text-muted-foreground uppercase tracking-wider">Terminées</p>
                            <div className="dashboard-stats-cards__value-container flex items-baseline gap-2 mt-2">
                                <span className="dashboard-stats-cards__value text-4xl font-bold text-success">{completedCount}</span>
                                <span className="dashboard-stats-cards__sublabel text-sm text-muted-foreground/70">interventions</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
