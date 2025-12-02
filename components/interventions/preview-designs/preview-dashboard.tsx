"use client"

import { useState } from 'react'
import { InterventionSchedulingPreviewProps } from "../intervention-scheduling-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Calendar,
    Clock,
    CheckCircle2,
    FileText,
    Users,
    Mail,
    Phone,
    LayoutDashboard,
    MessageSquare
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function PreviewDashboard({
    managers = [],
    providers = [],
    tenants = [],
    requireQuote = false,
    quotes = [],
    schedulingType = null,
    scheduledDate = null,
    fullTimeSlots = null,
    onOpenProgrammingModal
}: InterventionSchedulingPreviewProps) {

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

    return (
        <div className="flex flex-col md:flex-row min-h-[600px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">

            {/* SIDEBAR: Participants & Quick Info */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex-1 overflow-y-auto">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <Users className="w-5 h-5 text-primary" />
                        Participants
                    </h3>

                    <div className="space-y-6">
                        {/* Managers */}
                        {managers.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Gestionnaires</p>
                                <div className="space-y-3">
                                    {managers.map((m: any) => (
                                        <div key={m.id} className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-slate-200">
                                                <AvatarFallback className="text-xs bg-slate-100 text-slate-600">{getInitials(m.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-slate-700 truncate">{m.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{m.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Providers */}
                        {providers.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Prestataires</p>
                                <div className="space-y-3">
                                    {providers.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-slate-200">
                                                <AvatarFallback className="text-xs bg-indigo-50 text-indigo-600">{getInitials(p.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{p.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tenants */}
                        {tenants.length > 0 && (
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Locataires</p>
                                <div className="space-y-3">
                                    {tenants.map((t: any) => (
                                        <div key={t.id} className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8 border border-slate-200">
                                                <AvatarFallback className="text-xs bg-emerald-50 text-emerald-600">{getInitials(t.name)}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-slate-700 truncate">{t.name}</p>
                                                <p className="text-xs text-slate-500 truncate">{t.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <Button variant="outline" className="w-full justify-start gap-2 bg-white" size="sm">
                        <MessageSquare className="w-4 h-4" />
                        Envoyer un message
                    </Button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
                {/* Top Bar */}
                <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-5 h-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Tableau de bord intervention</span>
                    </div>
                    <Badge variant={schedulingType === 'fixed' ? 'default' : 'secondary'} className="px-3 py-1">
                        {schedulingType === 'fixed' ? 'Confirmé' : 'En cours'}
                    </Badge>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <Tabs defaultValue="planning" className="w-full">
                        <TabsList className="mb-6 bg-white border border-slate-200 p-1 w-full sm:w-auto grid grid-cols-2 sm:flex">
                            <TabsTrigger value="planning" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Planning</TabsTrigger>
                            <TabsTrigger value="quotes" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Devis & Estimation</TabsTrigger>
                        </TabsList>

                        <TabsContent value="planning" className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-500" />
                                            Statut Planification
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {schedulingType === "fixed" && scheduledDate ? (
                                            <div className="text-center p-4">
                                                <div className="inline-flex p-4 bg-green-50 text-green-600 rounded-full mb-4 ring-4 ring-green-50/50">
                                                    <CheckCircle2 className="w-8 h-8" />
                                                </div>
                                                <p className="font-bold text-xl text-slate-800 mb-1">
                                                    {format(new Date(scheduledDate), 'dd MMMM yyyy', { locale: fr })}
                                                </p>
                                                <p className="text-slate-500 font-medium">Intervention validée</p>
                                            </div>
                                        ) : (
                                            <div className="text-center p-4">
                                                <div className="inline-flex p-4 bg-amber-50 text-amber-600 rounded-full mb-4 ring-4 ring-amber-50/50">
                                                    <Clock className="w-8 h-8" />
                                                </div>
                                                <p className="font-bold text-xl text-slate-800 mb-1">En attente</p>
                                                <p className="text-slate-500 mb-6">{fullTimeSlots?.length || 0} créneaux proposés</p>
                                                {onOpenProgrammingModal && (
                                                    <Button onClick={onOpenProgrammingModal} className="w-full sm:w-auto">
                                                        Gérer les créneaux
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-slate-500" />
                                            Prochaines étapes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <ul className="space-y-4">
                                            <li className="flex items-center gap-3 text-slate-600">
                                                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium">Création de la demande</span>
                                            </li>
                                            <li className="flex items-center gap-3 text-slate-600">
                                                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium">Assignation prestataire</span>
                                            </li>
                                            <li className={`flex items-center gap-3 ${schedulingType === 'fixed' ? 'text-slate-600' : 'text-slate-900'}`}>
                                                {schedulingType === 'fixed' ? (
                                                    <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                    </div>
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
                                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                                    </div>
                                                )}
                                                <span className={`text-sm font-medium ${schedulingType !== 'fixed' ? 'font-bold' : ''}`}>Validation date</span>
                                            </li>
                                            <li className="flex items-center gap-3 text-slate-400">
                                                <div className="h-6 w-6 rounded-full border-2 border-slate-200 flex-shrink-0" />
                                                <span className="text-sm">Réalisation intervention</span>
                                            </li>
                                        </ul>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Slots List */}
                            {fullTimeSlots && fullTimeSlots.length > 0 && (
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <CardTitle className="text-base font-semibold text-slate-800">Détail des créneaux</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {fullTimeSlots.map((slot: any) => (
                                                <div key={slot.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-50 rounded text-slate-500">
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-700 text-sm">
                                                                {format(new Date(slot.slot_date), 'dd/MM', { locale: fr })}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={slot.status === 'selected' ? 'default' : 'outline'} className="text-[10px]">
                                                        {slot.status}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="quotes">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <CardTitle className="text-base font-semibold text-slate-800">Devis reçus</CardTitle>
                                    <CardDescription>Liste des estimations pour cette intervention</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {quotes.length > 0 ? (
                                        <div className="space-y-4">
                                            {quotes.map((quote: any) => (
                                                <div key={quote.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{quote.provider?.name}</p>
                                                            <p className="text-sm text-slate-500">Reçu le {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: fr })}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                                        <p className="font-bold text-lg text-slate-900">{quote.amount ? `${quote.amount} €` : 'En attente'}</p>
                                                        <Button variant="outline" size="sm">Voir le PDF</Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                                            <div className="inline-flex p-4 bg-slate-50 rounded-full mb-3 text-slate-400">
                                                <FileText className="w-8 h-8" />
                                            </div>
                                            <p className="text-slate-900 font-medium">Aucun devis disponible</p>
                                            <p className="text-slate-500 text-sm">Les devis apparaîtront ici une fois reçus.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    )
}
