"use client"

import { InterventionSchedulingPreviewProps } from "../intervention-scheduling-preview"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Calendar,
    Clock,
    CheckCircle2,
    FileText,
    Users,
    Mail,
    ArrowDown,
    Circle
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function PreviewTimeline({
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

    // Timeline Step Component
    const TimelineStep = ({
        icon: Icon,
        title,
        status,
        isLast = false,
        children
    }: {
        icon: any,
        title: string,
        status: 'completed' | 'active' | 'pending',
        isLast?: boolean,
        children: React.ReactNode
    }) => {
        const statusColors = {
            completed: "bg-green-100 text-green-600 border-green-200",
            active: "bg-blue-100 text-blue-600 border-blue-200",
            pending: "bg-slate-100 text-slate-400 border-slate-200"
        }

        return (
            <div className="flex gap-4">
                <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 ${statusColors[status]}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {!isLast && (
                        <div className={`w-0.5 flex-1 my-2 ${status === 'completed' ? 'bg-green-200' : 'bg-slate-200'}`} />
                    )}
                </div>
                <div className="flex-1 pb-12">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-semibold ${status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>
                            {title}
                        </h3>
                        <Badge variant={status === 'completed' ? 'default' : status === 'active' ? 'secondary' : 'outline'} className={status === 'completed' ? 'bg-green-600' : ''}>
                            {status === 'completed' ? 'Validé' : status === 'active' ? 'En cours' : 'En attente'}
                        </Badge>
                    </div>
                    <div className={`transition-opacity duration-500 ${status === 'pending' ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                        {children}
                    </div>
                </div>
            </div>
        )
    }

    // Determine steps status
    const participantsStatus = managers.length > 0 && (providers.length > 0 || tenants.length > 0) ? 'completed' : 'active'

    const quoteStatus = !requireQuote
        ? 'completed'
        : quotes.some(q => q.amount && q.amount > 0)
            ? 'completed'
            : quotes.length > 0
                ? 'active'
                : 'pending'

    const planningStatus = scheduledDate
        ? 'completed'
        : fullTimeSlots && fullTimeSlots.length > 0
            ? 'active'
            : quoteStatus === 'completed' ? 'active' : 'pending'

    return (
        <div className="max-w-3xl mx-auto py-8">
            <div className="mb-10 text-center">
                <h2 className="text-2xl font-bold text-slate-900">Suivi de l'intervention</h2>
                <p className="text-slate-500">Progression et étapes clés</p>
            </div>

            <div className="space-y-0">

                {/* STEP 1: PARTICIPANTS */}
                <TimelineStep
                    icon={Users}
                    title="Participants"
                    status={participantsStatus}
                >
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-wrap gap-4">
                                {managers.map((m: any) => (
                                    <div key={m.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">{getInitials(m.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-slate-700">{m.name}</span>
                                    </div>
                                ))}
                                {providers.map((p: any) => (
                                    <div key={p.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px] bg-purple-100 text-purple-700">{getInitials(p.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-slate-700">{p.name}</span>
                                    </div>
                                ))}
                                {tenants.map((t: any) => (
                                    <div key={t.id} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">{getInitials(t.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-slate-700">{t.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TimelineStep>

                {/* STEP 2: ESTIMATION (Optional) */}
                {requireQuote && (
                    <TimelineStep
                        icon={FileText}
                        title="Estimation & Devis"
                        status={quoteStatus}
                    >
                        <Card className="border-slate-200 shadow-sm">
                            <CardContent className="p-4">
                                {quotes.length > 0 ? (
                                    <div className="space-y-3">
                                        {quotes.map((quote: any) => (
                                            <div key={quote.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">{quote.provider?.name}</p>
                                                        <p className="text-xs text-slate-500">Reçu le {format(new Date(quote.created_at), 'dd/MM/yyyy')}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={quote.amount ? 'default' : 'outline'}>
                                                    {quote.amount ? `${quote.amount} €` : 'En attente'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-slate-500 text-sm">
                                        En attente de devis
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TimelineStep>
                )}

                {/* STEP 3: PLANNING */}
                <TimelineStep
                    icon={Calendar}
                    title="Planification"
                    status={planningStatus}
                    isLast={true}
                >
                    <Card className="border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            {schedulingType === "fixed" && scheduledDate ? (
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-full">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900">Intervention validée</p>
                                        <p className="text-slate-600">
                                            {format(new Date(scheduledDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                        </p>
                                    </div>
                                </div>
                            ) : schedulingType === "slots" && fullTimeSlots && fullTimeSlots.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-bold text-slate-900">{fullTimeSlots.length} créneaux</span> proposés
                                        </p>
                                        {onOpenProgrammingModal && (
                                            <Button variant="outline" size="sm" onClick={onOpenProgrammingModal}>
                                                Gérer
                                            </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {fullTimeSlots.map((slot: any) => (
                                            <div key={slot.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-100">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <div className="text-sm">
                                                    <p className="font-medium text-slate-700">
                                                        {format(new Date(slot.slot_date), 'dd/MM', { locale: fr })}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-slate-500 text-sm mb-3">Aucune date définie</p>
                                    {onOpenProgrammingModal && (
                                        <Button onClick={onOpenProgrammingModal}>Planifier maintenant</Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TimelineStep>

            </div>
        </div>
    )
}
