"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Building2,
    Users,
    Wrench,
    ArrowUpRight,
    MapPin,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Clock,
    TrendingUp,
    Home,
    Droplets,
    Flame,
    Zap,
    Key,
    Hammer,
    Plus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ManagerInterventionCard } from "./manager-intervention-card"

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden group">
                    <CardContent className="p-6 relative">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building2 className="h-24 w-24 text-indigo-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Patrimoine</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.buildingsCount}</h3>
                            <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium mt-2 bg-indigo-50 w-fit px-2 py-1 rounded-full">
                                <Home className="h-3 w-3" /> {stats.lotsCount} lots
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden group">
                    <CardContent className="p-6 relative">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="h-24 w-24 text-emerald-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                <Users className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Occupation</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.occupancyRate}%</h3>
                            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-2 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                                <TrendingUp className="h-3 w-3" /> Stable
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden group">
                    <CardContent className="p-6 relative">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Wrench className="h-24 w-24 text-blue-600" />
                        </div>
                        <div className="relative z-10">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <Wrench className="h-5 w-5" />
                            </div>
                            <p className="text-sm font-medium text-slate-500">Interventions</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.interventionsCount}</h3>
                            <div className="flex items-center gap-1 text-xs text-blue-600 font-medium mt-2 bg-blue-50 w-fit px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3" /> En cours
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-none shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden group",
                    pendingCount > 0 ? "bg-orange-500 text-white" : "bg-white"
                )}>
                    <CardContent className="p-6 relative">
                        <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle className={cn("h-24 w-24", pendingCount > 0 ? "text-white" : "text-orange-500")} />
                        </div>
                        <div className="relative z-10">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center mb-4",
                                pendingCount > 0 ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600"
                            )}>
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <p className={cn("text-sm font-medium", pendingCount > 0 ? "text-orange-100" : "text-slate-500")}>
                                Actions requises
                            </p>
                            <h3 className={cn("text-2xl font-bold mt-1", pendingCount > 0 ? "text-white" : "text-slate-900")}>
                                {pendingCount}
                            </h3>
                            <div className={cn(
                                "flex items-center gap-1 text-xs font-medium mt-2 w-fit px-2 py-1 rounded-full",
                                pendingCount > 0 ? "bg-white/20 text-white" : "bg-orange-50 text-orange-600"
                            )}>
                                {pendingCount > 0 ? "Urgent" : "Tout est calme"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
