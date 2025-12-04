"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, LayoutGrid, List, Calendar as CalendarIcon, Calendar, MoreHorizontal } from "lucide-react"
import { ManagerInterventionCard } from "@/components/dashboards/manager/manager-intervention-card"
import { InterventionsCalendarView } from "@/components/interventions/interventions-calendar-view"
import { InterventionsEmptyState } from "@/components/interventions/interventions-empty-state"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

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
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid')

    return (
        <Card className="bg-card rounded-lg border border-border shadow-sm">
            <div className="p-4 space-y-6">
                {/* Controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-xl font-bold text-foreground">{title}</h2>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                className="pl-10 h-10 bg-card dark:bg-white/5 border-border dark:border-white/10 rounded-xl"
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <div className="flex bg-card dark:bg-white/5 rounded-xl border border-border dark:border-white/10 p-1">
                            <Button
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0 rounded-lg"
                                onClick={() => setViewMode('calendar')}
                            >
                                <CalendarIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content View - Empty State or Interventions */}
                {interventions.length === 0 ? (
                    <InterventionsEmptyState
                        title="Aucune intervention"
                        description="Créez votre première intervention pour commencer"
                        showCreateButton={true}
                        createButtonText="Créer une intervention"
                        createButtonAction={onCreateIntervention}
                    />
                ) : (
                    <>
                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {interventions.map((intervention) => (
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
                            <Card className="border-border shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableHead className="w-[300px]">Intervention</TableHead>
                                                <TableHead>Lieu</TableHead>
                                                <TableHead>Statut</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {interventions.map((intervention) => (
                                                <TableRow key={intervention.id} className="group hover:bg-muted/50">
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-foreground">{intervention.title}</span>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span className="capitalize">{intervention.type}</span>
                                                                {intervention.priority === 'urgente' && (
                                                                    <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 h-5 px-1.5">
                                                                        Urgent
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-sm">
                                                            <span className="text-foreground">{intervention.lot?.building?.name}</span>
                                                            <span className="text-muted-foreground text-xs">{intervention.lot?.building?.address}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-medium">
                                                            {intervention.status.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Calendar className="h-4 w-4 text-muted-foreground/70" />
                                                            {new Date(intervention.created_at).toLocaleDateString('fr-FR')}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground/70 group-hover:text-muted-foreground" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>
                        )}

                        {viewMode === 'calendar' && (
                            <div className="h-[600px] bg-card dark:bg-white/5 rounded-xl border border-border dark:border-white/10 shadow-sm dark:shadow-none dark:backdrop-blur-md p-4">
                                <InterventionsCalendarView
                                    interventions={interventions}
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
