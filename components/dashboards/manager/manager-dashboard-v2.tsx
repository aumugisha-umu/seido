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
    Home
} from "lucide-react"
import { ManagerInterventionCard } from "./manager-intervention-card"
import { DashboardStatsCards } from "@/components/dashboards/shared/dashboard-stats-cards"

interface ManagerDashboardProps {
    stats: any
    contactStats: any
    interventions: any[]
    pendingCount: number
}

const getTypeConfig = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'plomberie': return { icon: Droplets, color: 'bg-blue-100 text-blue-600' }
        case 'chauffage': return { icon: Flame, color: 'bg-orange-100 text-orange-600' }
        case 'electricite': return { icon: Zap, color: 'bg-yellow-100 text-yellow-600' }
        case 'serrurerie': return { icon: Key, color: 'bg-slate-100 text-slate-600' }
        case 'toiture': return { icon: Home, color: 'bg-amber-100 text-amber-600' }
        default: return { icon: Wrench, color: 'bg-indigo-100 text-indigo-600' }
    }
}

export function ManagerDashboardV2({ stats, contactStats, interventions, pendingCount }: ManagerDashboardProps) {
    const router = useRouter()

    return (
        <div className="p-6 bg-slate-50 min-h-full font-sans">
            {/* Modern Header with Gradient Accent */}
            <div className="relative mb-8">
                <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4 relative z-10">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Bonjour, Gestionnaire</h1>
                        <p className="text-slate-500 mt-1">Voici ce qui se passe dans votre parc aujourd'hui.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={() => router.push("/gestionnaire/interventions/nouvelle-intervention")}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 rounded-xl px-4"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Créer une intervention
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/gestionnaire/biens/immeubles/nouveau")}
                            className="bg-white border-slate-200 text-slate-700 rounded-xl"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un immeuble
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/gestionnaire/biens/lots/nouveau")}
                            className="bg-white border-slate-200 text-slate-700 rounded-xl"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un lot
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/gestionnaire/contacts/nouveau")}
                            className="bg-white border-slate-200 text-slate-700 rounded-xl"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Ajouter un contact
                        </Button>
                    </div>
                </div>
            </div>

            {/* Colorful Stats Cards */}
            <DashboardStatsCards
                pendingCount={pendingCount}
                activeCount={stats.interventionsCount}
                buildingsCount={stats.buildingsCount}
                lotsCount={stats.lotsCount}
                occupancyRate={stats.occupancyRate}
            />

            {/* Visual Interventions Grid */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Activités récentes</h2>
                    <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        Voir tout l'historique <ArrowUpRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {interventions.map((intervention) => (
                        <ManagerInterventionCard key={intervention.id} intervention={intervention} />
                    ))}
                </div>
            </div>
        </div>
    )
}
