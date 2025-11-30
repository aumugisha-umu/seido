"use client"

import { InterventionSchedulingPreviewProps } from "../intervention-scheduling-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Calendar,
    Clock,
    CheckCircle2,
    FileText,
    Users,
    Mail,
    Phone,
    ChevronRight
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function PreviewModern({
    managers = [],
    providers = [],
    tenants = [],
    requireQuote = false,
    quotes = [],
    schedulingType = null,
    scheduledDate = null,
    fullTimeSlots = null,
    onOpenProgrammingModal,
    description,
    instructions,
    comments = [],
    timelineEvents = []
}: InterventionSchedulingPreviewProps) {

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

    const RoleBadge = ({ role }: { role: string }) => {
        const styles = {
            gestionnaire: "bg-blue-100 text-blue-700",
            prestataire: "bg-purple-100 text-purple-700",
            locataire: "bg-emerald-100 text-emerald-700"
        }
        return (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[role as keyof typeof styles]}`}>
                {role}
            </span>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Aperçu de l'intervention</h2>
                    <p className="text-slate-500">Détails, participants et planification</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-3 py-1 border-slate-200 text-slate-600">
                        {schedulingType === 'fixed' ? 'Planifié' : 'En cours de planification'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Main Info (2/3) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* 0. DESCRIPTION SECTION */}
                    {description && (
                        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <CardTitle className="text-lg font-semibold text-slate-800">Description</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-slate-700 leading-relaxed">{description}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* 0.5 INSTRUCTIONS SECTION */}
                    {instructions && (
                        <Card className="border-blue-100 bg-blue-50/30 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                            <CardHeader className="bg-blue-50/50 border-b border-blue-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white rounded-lg border border-blue-100 shadow-sm">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <CardTitle className="text-lg font-semibold text-blue-900">Instructions générales</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <p className="text-blue-800 leading-relaxed">{instructions}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* 1. PLANNING SECTION */}
                    <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    <Calendar className="w-5 h-5 text-primary" />
                                </div>
                                <CardTitle className="text-lg font-semibold text-slate-800">Planification</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {schedulingType === "fixed" && scheduledDate ? (
                                <div className="flex items-center gap-4 p-4 bg-green-50/50 border border-green-100 rounded-xl">
                                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-green-800">Intervention confirmée</p>
                                        <p className="text-lg font-bold text-green-900">
                                            {format(new Date(scheduledDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                        </p>
                                    </div>
                                </div>
                            ) : schedulingType === "slots" && fullTimeSlots && fullTimeSlots.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-medium text-slate-900">{fullTimeSlots.length} créneaux</span> proposés aux participants
                                        </p>
                                        {onOpenProgrammingModal && (
                                            <Button variant="ghost" size="sm" onClick={onOpenProgrammingModal} className="text-primary hover:text-primary/80">
                                                Gérer
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid gap-3">
                                        {fullTimeSlots.map((slot: any) => (
                                            <div key={slot.id} className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white hover:border-primary/20 hover:shadow-sm transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-1.5 h-10 rounded-full ${slot.status === 'selected' ? 'bg-green-500' : 'bg-slate-200 group-hover:bg-primary/50'}`} />
                                                    <div>
                                                        <p className="font-medium text-slate-900 capitalize">
                                                            {format(new Date(slot.slot_date), 'EEEE dd MMMM', { locale: fr })}
                                                        </p>
                                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {/* Avatars of responses would go here */}
                                                    <Badge variant={slot.status === 'selected' ? 'default' : 'secondary'} className="font-normal">
                                                        {slot.status === 'selected' ? 'Validé' : 'En attente'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
                                        <Calendar className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500">Aucune planification définie pour le moment.</p>
                                    {onOpenProgrammingModal && (
                                        <Button variant="outline" className="mt-4" onClick={onOpenProgrammingModal}>
                                            Proposer des dates
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. ESTIMATION SECTION */}
                    {requireQuote && (
                        <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <FileText className="w-5 h-5 text-primary" />
                                    </div>
                                    <CardTitle className="text-lg font-semibold text-slate-800">Estimation & Devis</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                {quotes.length > 0 ? (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {quotes.map((quote: any) => (
                                            <div key={quote.id} className="flex flex-col p-4 rounded-xl border border-slate-200 bg-white hover:border-primary/30 transition-colors">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                                                {getInitials(quote.provider?.name || 'P')}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-900">{quote.provider?.name}</p>
                                                            <p className="text-xs text-slate-500">Prestataire</p>
                                                        </div>
                                                    </div>
                                                    <Badge variant={quote.amount ? 'default' : 'outline'} className={quote.amount ? 'bg-green-600 hover:bg-green-700' : ''}>
                                                        {quote.amount ? `${quote.amount} €` : 'En attente'}
                                                    </Badge>
                                                </div>
                                                <div className="mt-auto pt-3 border-t border-slate-50 flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">
                                                        {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: fr })}
                                                    </span>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs hover:bg-slate-50">
                                                        Voir détails <ChevronRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                        <p className="text-slate-500 text-sm">En attente de devis du prestataire</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* RIGHT COLUMN: Sidebar (1/3) */}
                <div className="space-y-6">
                    {/* PARTICIPANTS CARD */}
                    <Card className="border-slate-100 shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-slate-800">Participants</CardTitle>
                                <Users className="w-4 h-4 text-slate-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100">
                                {/* Managers */}
                                {managers.map((manager: any) => (
                                    <div key={manager.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                                    {getInitials(manager.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{manager.name}</p>
                                                    <RoleBadge role="gestionnaire" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Mail className="w-3 h-3" />
                                                        <span className="truncate">{manager.email}</span>
                                                    </div>
                                                    {manager.phone && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <Phone className="w-3 h-3" />
                                                            <span>{manager.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Providers */}
                                {providers.map((provider: any) => (
                                    <div key={provider.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-purple-100 text-purple-700">
                                                    {getInitials(provider.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{provider.name}</p>
                                                    <RoleBadge role="prestataire" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Mail className="w-3 h-3" />
                                                        <span className="truncate">{provider.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Tenants */}
                                {tenants.map((tenant: any) => (
                                    <div key={tenant.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3">
                                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                                <AvatarFallback className="bg-emerald-100 text-emerald-700">
                                                    {getInitials(tenant.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{tenant.name}</p>
                                                    <RoleBadge role="locataire" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Mail className="w-3 h-3" />
                                                        <span className="truncate">{tenant.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* COMMENTS CARD */}
                    {comments && comments.length > 0 && (
                        <Card className="border-slate-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold text-slate-800">Commentaires ({comments.length})</CardTitle>
                                    <Mail className="w-4 h-4 text-slate-400" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                {comments.map((comment: any) => (
                                    <div key={comment.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-slate-700">{comment.author}</span>
                                            <RoleBadge role={comment.role} />
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{comment.content}</p>
                                        <p className="text-xs text-slate-400 mt-2">
                                            {format(new Date(comment.date), 'dd MMM yyyy à HH:mm', { locale: fr })}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* PROGRESSION CARD */}
                    {timelineEvents && timelineEvents.length > 0 && (
                        <Card className="border-slate-100 shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold text-slate-800">Progression</CardTitle>
                                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="space-y-3">
                                    {timelineEvents.map((event: any, index: number) => (
                                        <div key={event.id} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${event.status === 'completed'
                                                        ? 'bg-green-100 text-green-600'
                                                        : event.status === 'current'
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                    {event.status === 'completed' ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : event.status === 'current' ? (
                                                        <Clock className="w-4 h-4" />
                                                    ) : (
                                                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                    )}
                                                </div>
                                                {index < timelineEvents.length - 1 && (
                                                    <div className={`w-0.5 flex-1 my-1 ${event.status === 'completed' ? 'bg-green-200' : 'bg-slate-200'
                                                        }`} style={{ minHeight: '20px' }} />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-3">
                                                <p className={`text-sm font-medium ${event.status === 'pending' ? 'text-slate-400' : 'text-slate-700'
                                                    }`}>
                                                    {event.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {format(new Date(event.date), 'dd MMM yyyy', { locale: fr })}
                                                </p>
                                                {event.description && (
                                                    <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
