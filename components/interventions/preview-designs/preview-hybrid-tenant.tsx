"use client"

import { useState } from 'react'
import { InterventionSchedulingPreviewProps } from "../intervention-scheduling-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
    Calendar,
    Clock,
    CheckCircle2,
    FileText,
    Users,
    MessageSquare,
    ArrowRight,
    MapPin
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function PreviewHybridTenant({
    managers = [],
    providers = [],
    tenants = [],
    schedulingType = null,
    scheduledDate = null,
    fullTimeSlots = null,
    description,
    instructions,
    comments = [],
    timelineEvents = []
}: InterventionSchedulingPreviewProps) {

    const [activeTab, setActiveTab] = useState("general")

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

    // Mock Chat Data (Tenant View)
    const mockMessages = [
        { id: 'm1', content: 'Bonjour, quand seriez-vous disponible pour l\'intervention ?', author: 'Jean Dupont', role: 'gestionnaire', date: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'm2', content: 'Je suis disponible tous les matins la semaine prochaine.', author: 'Moi', role: 'locataire', date: new Date(Date.now() - 86400000 * 1.5).toISOString() },
        { id: 'm3', content: 'Parfait, je vais proposer des créneaux en conséquence.', author: 'Plomberie Express', role: 'prestataire', date: new Date(Date.now() - 86400000).toISOString() }
    ]

    return (
        <div className="flex flex-col md:flex-row min-h-[600px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">

            {/* SIDEBAR: Participants & Progression */}
            <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col">
                <div className="p-6 flex-1 overflow-y-auto space-y-8">

                    {/* Participants Section */}
                    <div>
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Users className="w-5 h-5 text-primary" />
                            Participants
                        </h3>

                        <div className="space-y-6">
                            {/* Managers */}
                            {managers.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Gestionnaire</p>
                                    <div className="space-y-3">
                                        {managers.map((m: any) => (
                                            <div key={m.id} className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-slate-200">
                                                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">{getInitials(m.name)}</AvatarFallback>
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
                                    <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Intervenant</p>
                                    <div className="space-y-3">
                                        {providers.map((p: any) => (
                                            <div key={p.id} className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-slate-200">
                                                    <AvatarFallback className="text-xs bg-purple-100 text-purple-700">{getInitials(p.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-medium text-slate-700 truncate">{p.name}</p>
                                                    <p className="text-xs text-slate-500 truncate">Prestataire</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Progression Section */}
                    {timelineEvents && timelineEvents.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    Progression
                                </h3>
                                <CheckCircle2 className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="space-y-3">
                                {timelineEvents.map((event: any, index: number) => (
                                    <div key={event.id} className="flex gap-3">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${event.status === 'completed'
                                                ? 'bg-green-100 text-green-600'
                                                : event.status === 'current'
                                                    ? 'bg-blue-100 text-blue-600'
                                                    : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                {event.status === 'completed' ? (
                                                    <CheckCircle2 className="w-3 h-3" />
                                                ) : event.status === 'current' ? (
                                                    <Clock className="w-3 h-3" />
                                                ) : (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                )}
                                            </div>
                                            {index < timelineEvents.length - 1 && (
                                                <div className={`w-0.5 flex-1 my-1 ${event.status === 'completed' ? 'bg-green-200' : 'bg-slate-200'
                                                    }`} style={{ minHeight: '16px' }} />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-2">
                                            <p className={`text-sm font-medium ${event.status === 'pending' ? 'text-slate-400' : 'text-slate-700'
                                                }`}>
                                                {event.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {format(new Date(event.date), 'dd MMM yyyy', { locale: fr })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">

                    {/* Top Bar with Tabs */}
                    <div className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
                        <TabsList className="bg-slate-100 p-1">
                            <TabsTrigger value="general" className="px-4">Général</TabsTrigger>
                            <TabsTrigger value="conversations" className="px-4">Messagerie</TabsTrigger>
                            <TabsTrigger value="planning" className="px-4">Rendez-vous</TabsTrigger>
                        </TabsList>

                        <Badge variant="outline" className="px-3 py-1 border-slate-200 text-slate-600 hidden sm:flex">
                            {schedulingType === 'fixed' ? 'Planifié' : 'En cours'}
                        </Badge>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 overflow-y-auto">

                        {/* TAB: GENERAL */}
                        <TabsContent value="general" className="mt-0 space-y-6">

                            {/* Description & Instructions */}
                            {(description || instructions) && (
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <CardTitle className="text-base font-semibold text-slate-800">Détails de l'intervention</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-6">
                                        {description && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-2">Description</h4>
                                                <p className="text-slate-700 leading-relaxed">{description}</p>
                                            </div>
                                        )}

                                        {description && instructions && <Separator />}

                                        {instructions && (
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    <h4 className="text-sm font-semibold text-blue-900">Instructions pour l'accès</h4>
                                                </div>
                                                <p className="text-blue-800 leading-relaxed text-sm">{instructions}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Location Card (Simplified for Tenant) */}
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-500" />
                                        <CardTitle className="text-base font-semibold text-slate-800">Lieu d'intervention</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <p className="text-slate-700 font-medium">Votre logement</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        L'intervenant a reçu l'adresse complète et les instructions d'accès.
                                    </p>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB: CONVERSATIONS */}
                        <TabsContent value="conversations" className="mt-0 h-full">
                            <Card className="border-slate-200 shadow-sm h-[600px] flex flex-col">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-slate-500" />
                                            <CardTitle className="text-base font-semibold text-slate-800">Discussion</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                                    {mockMessages.map((msg) => (
                                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'locataire' ? 'flex-row-reverse' : ''}`}>
                                            <Avatar className="h-8 w-8 mt-1">
                                                <AvatarFallback className={`${msg.role === 'locataire' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'} text-xs`}>
                                                    {getInitials(msg.author)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className={`flex flex-col max-w-[80%] ${msg.role === 'locataire' ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-3 rounded-lg shadow-sm ${msg.role === 'locataire'
                                                    ? 'bg-emerald-600 text-white rounded-tr-none'
                                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
                                                    }`}>
                                                    <p className="text-sm">{msg.content}</p>
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1 px-1">
                                                    {msg.author} • {format(new Date(msg.date), 'HH:mm', { locale: fr })}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                                <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Écrivez votre message..."
                                            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                        />
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB: PLANNING */}
                        <TabsContent value="planning" className="mt-0 space-y-6">
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <CardTitle className="text-base font-semibold text-slate-800">Rendez-vous</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {schedulingType === 'fixed' && scheduledDate ? (
                                        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-green-900">Intervention confirmée</p>
                                                <p className="text-green-700">
                                                    L'intervenant passera le {format(new Date(scheduledDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <Clock className="w-5 h-5 text-amber-600" />
                                                    <p className="font-medium text-amber-900">Disponibilités demandées</p>
                                                </div>
                                                <p className="text-sm text-amber-800 mb-4">
                                                    Veuillez indiquer vos disponibilités parmi les créneaux proposés ci-dessous :
                                                </p>

                                                {fullTimeSlots && fullTimeSlots.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {fullTimeSlots.map((slot: any) => (
                                                            <Button
                                                                key={slot.id}
                                                                variant="outline"
                                                                className="justify-start h-auto py-3 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50"
                                                            >
                                                                <div className="text-left">
                                                                    <p className="font-medium text-slate-700">
                                                                        {format(new Date(slot.slot_date), 'dd MMMM', { locale: fr })}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                                    </p>
                                                                </div>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500 italic">Aucun créneau proposé pour le moment.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
