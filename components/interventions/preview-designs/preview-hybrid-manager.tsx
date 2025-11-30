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
    Download,
    Eye,
    ArrowRight,
    ChevronRight
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function PreviewHybridManager({
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

    const [activeTab, setActiveTab] = useState("general")
    const [activeConversation, setActiveConversation] = useState<'group' | string>('group')

    const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)

    const handleConversationClick = (id: string) => {
        setActiveConversation(id)
        setActiveTab("conversations")
    }

    // Mock messages for the group chat
    const groupMessages = [
        { id: 1, sender: 'Jean Dupont', role: 'Gestionnaire', content: 'Bonjour à tous, je viens de créer cette intervention.', time: '10:00', isMe: true },
        { id: 2, sender: 'Marie Martin', role: 'Locataire', content: 'Bonjour, merci. Quand est-ce que le prestataire pourra passer ?', time: '10:05', isMe: false },
        { id: 3, sender: 'Paul Durand', role: 'Prestataire', content: 'Bonjour, je suis disponible mardi prochain dans la matinée.', time: '10:15', isMe: false },
    ]

    return (
        <div className="flex h-[800px] bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* SIDEBAR */}
            <aside className="w-80 bg-white border-r border-slate-200 flex flex-col">
                {/* Header Removed as per request */}

                <div className="flex-1 overflow-y-auto p-4 space-y-6 pt-6">
                    {/* Participants Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3 px-2">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Participants</h4>
                            <Badge variant="secondary" className="text-[10px]">{managers.length + providers.length + tenants.length}</Badge>
                        </div>

                        <div className="space-y-1">
                            {/* Managers */}
                            {managers.map((manager: any) => (
                                <div key={manager.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8 border border-slate-100">
                                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{getInitials(manager.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-slate-700 leading-none">{manager.name}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Gestionnaire</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                        onClick={() => handleConversationClick(manager.id)}
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}

                            {/* Providers */}
                            {providers.map((provider: any) => (
                                <div key={provider.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8 border border-slate-100">
                                            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">{getInitials(provider.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-slate-700 leading-none">{provider.name}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Prestataire</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                        onClick={() => handleConversationClick(provider.id)}
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}

                            {/* Tenants */}
                            {tenants.map((tenant: any) => (
                                <div key={tenant.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-8 h-8 border border-slate-100">
                                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">{getInitials(tenant.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="text-sm font-medium text-slate-700 leading-none">{tenant.name}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">Locataire</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                        onClick={() => handleConversationClick(tenant.id)}
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            ))}

                            <Separator className="my-2" />

                            {/* Group Chat Button - Moved to bottom */}
                            <button
                                onClick={() => {
                                    setActiveConversation('group')
                                    setActiveTab("conversations")
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${activeConversation === 'group' && activeTab === 'conversations' ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${activeConversation === 'group' && activeTab === 'conversations' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium">Discussion générale</span>
                                </div>
                                <div className={`p-1.5 rounded-full ${activeConversation === 'group' && activeTab === 'conversations' ? 'text-blue-600' : 'text-slate-400'}`}>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </button>
                        </div>
                    </div>

                    <Separator />

                    {/* Progression */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Progression</h4>
                        <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 ml-2">
                            {timelineEvents.map((event: any, index: number) => (
                                <div key={index} className="relative">
                                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ${index === 0 ? 'bg-blue-500 ring-2 ring-blue-100' : 'bg-slate-300'}`} />
                                    <p className="text-xs font-medium text-slate-800">{event.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{event.date}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-6 pt-4 bg-white border-b border-slate-200">
                        <TabsList className="grid w-full max-w-md grid-cols-3">
                            <TabsTrigger value="general">Général</TabsTrigger>
                            <TabsTrigger value="conversations">Conversations</TabsTrigger>
                            <TabsTrigger value="planning">Planning</TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* TAB: GENERAL */}
                        <TabsContent value="general" className="mt-0 space-y-6">
                            {/* Description & Instructions - Full Width */}
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        <CardTitle className="text-base font-semibold text-slate-800">Détails de l'intervention</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-4">
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-700 mb-1">Description</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
                                    </div>
                                    {instructions && (
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                            <h4 className="text-sm font-medium text-amber-800 mb-1">Instructions d'accès</h4>
                                            <p className="text-sm text-amber-700">{instructions}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Grid 3 Cols: Synthèse, Commentaires, Rapports */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Synthèse */}
                                <Card className="border-slate-200 shadow-sm h-full">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <CardTitle className="text-base font-semibold text-slate-800">Synthèse</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-6">
                                        {/* Planning Status */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700">Planning</span>
                                                <Button variant="link" className="h-auto p-0 text-xs" onClick={() => setActiveTab("planning")}>Voir</Button>
                                            </div>
                                            {scheduledDate ? (
                                                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded border border-green-100">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="font-medium">Validé</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="font-medium">En attente</span>
                                                </div>
                                            )}
                                            <p className="text-xs text-slate-500 mt-1">
                                                {scheduledDate
                                                    ? format(new Date(scheduledDate), 'dd MMM yyyy', { locale: fr })
                                                    : `${fullTimeSlots?.length || 0} créneaux proposés`
                                                }
                                            </p>
                                        </div>

                                        <Separator />

                                        {/* Quotes Status */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700">Devis</span>
                                                <Button variant="link" className="h-auto p-0 text-xs">Gérer</Button>
                                            </div>
                                            {quotes.length > 0 ? (
                                                <div className="space-y-2">
                                                    {quotes.map((quote: any) => (
                                                        <div key={quote.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100">
                                                            <span className="text-xs font-medium text-slate-700">{quote.amount}€</span>
                                                            <Badge variant="secondary" className="text-[10px] h-5">{quote.status}</Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">Aucun devis pour le moment</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Comments */}
                                <Card className="border-slate-200 shadow-sm h-full flex flex-col">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-slate-500" />
                                                <CardTitle className="text-base font-semibold text-slate-800">Commentaires</CardTitle>
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600">{comments.length}</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 pt-4">
                                        {comments.length > 0 ? (
                                            <div className="space-y-4">
                                                {comments.map((comment: any) => (
                                                    <div key={comment.id} className="flex gap-3">
                                                        <Avatar className="w-8 h-8">
                                                            <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">{getInitials(comment.author)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <p className="text-sm font-medium text-slate-800">{comment.author}</p>
                                                                <span className="text-[10px] text-slate-400">{comment.date}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 mt-1">{comment.text}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                                <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                                                <p className="text-sm">Aucun commentaire</p>
                                            </div>
                                        )}
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <Button variant="outline" size="sm" className="w-full text-slate-600">
                                                Ajouter une note
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Reports & Documents */}
                                <Card className="border-slate-200 shadow-sm h-full flex flex-col">
                                    <CardHeader className="pb-3 border-b border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-500" />
                                                <CardTitle className="text-base font-semibold text-slate-800">Documents</CardTitle>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                + Ajouter
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-1 pt-4">
                                        <div className="space-y-3">
                                            {/* Mock Documents */}
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded border border-slate-200 text-red-500">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">Rapport.pdf</p>
                                                        <p className="text-[10px] text-slate-500">25 Nov • 2.4 MB</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-blue-200 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded border border-slate-200 text-blue-500">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">Photos.jpg</p>
                                                        <p className="text-[10px] text-slate-500">25 Nov • 4.1 MB</p>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* TAB: CONVERSATIONS */}
                        <TabsContent value="conversations" className="mt-0 h-full">
                            <Card className="border-slate-200 shadow-sm h-[600px] flex flex-col">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-slate-500" />
                                            <CardTitle className="text-base font-semibold text-slate-800">
                                                {activeConversation === 'group'
                                                    ? 'Discussion générale'
                                                    : `Discussion avec ${[...managers, ...providers, ...tenants].find((p: any) => p.id === activeConversation)?.name || 'le contact'}`
                                                }
                                            </CardTitle>
                                        </div>
                                        <Badge variant="secondary" className="bg-green-100 text-green-700">En ligne</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                                    {activeConversation === 'group' ? (
                                        groupMessages.map((msg) => (
                                            <div key={msg.id} className={`flex gap-3 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                                                <Avatar className="w-8 h-8 mt-1">
                                                    <AvatarFallback className={`${msg.isMe ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'} text-xs`}>
                                                        {getInitials(msg.sender)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-medium text-slate-700">{msg.sender}</span>
                                                        <span className="text-[10px] text-slate-400">{msg.time}</span>
                                                    </div>
                                                    <div className={`p-3 rounded-lg text-sm ${msg.isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}`}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                            <MessageSquare className="w-12 h-12 mb-4 text-slate-300" />
                                            <p>Démarrez une conversation privée avec ce contact.</p>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="p-4 bg-white border-t border-slate-100">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Écrivez votre message..."
                                            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                            <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB: PLANNING */}
                        <TabsContent value="planning" className="mt-0 space-y-6">
                            {/* Planning Card */}
                            <Card className="border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <CardTitle className="text-base font-semibold text-slate-800">Planification</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {schedulingType === 'fixed' && scheduledDate ? (
                                        <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                                            <div className="p-3 bg-green-100 rounded-full">
                                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-green-900">Intervention validée</p>
                                                <p className="text-green-700">
                                                    Prévue le {format(new Date(scheduledDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-100 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-5 h-5 text-amber-600" />
                                                    <div>
                                                        <p className="font-medium text-amber-900">En attente de planification</p>
                                                        <p className="text-sm text-amber-700">
                                                            {fullTimeSlots?.length || 0} créneaux proposés
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" className="bg-white border-amber-200 text-amber-800 hover:bg-amber-100">
                                                    Gérer
                                                </Button>
                                            </div>

                                            {fullTimeSlots && fullTimeSlots.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {fullTimeSlots.map((slot: any) => (
                                                        <div key={slot.id} className="p-3 border border-slate-200 rounded-lg bg-white">
                                                            <p className="font-medium text-slate-700">
                                                                {format(new Date(slot.slot_date), 'dd MMMM', { locale: fr })}
                                                            </p>
                                                            <p className="text-sm text-slate-500">
                                                                {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                                            </p>
                                                            <Badge variant="secondary" className="mt-2 text-[10px]">
                                                                {slot.status}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </main>
        </div>
    )
}
