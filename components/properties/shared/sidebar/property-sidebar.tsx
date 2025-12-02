'use client'

import { cn } from '@/lib/utils'
import { Building, MapPin, Ruler, Euro, User, Home } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface PropertySidebarProps {
    title: string
    subtitle: string
    type: 'lot' | 'building'
    image?: string
    stats: {
        label: string
        value: string
        icon: React.ElementType
    }[]
    contacts: {
        role: string
        name: string
        email?: string
        phone?: string
        avatar?: string
    }[]
    className?: string
}

export const PropertySidebar = ({
    title,
    subtitle,
    type,
    image,
    stats,
    contacts,
    className
}: PropertySidebarProps) => {
    return (
        <aside
            className={cn(
                'w-80 border-r border-slate-200 bg-white flex flex-col h-full',
                className
            )}
        >
            {/* Header Image/Icon */}
            <div className="h-40 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {image ? (
                    <img src={image} alt={title} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-slate-300">
                        {type === 'building' ? (
                            <Building className="h-16 w-16" />
                        ) : (
                            <Home className="h-16 w-16" />
                        )}
                    </div>
                )}
                <div className="absolute bottom-3 left-4">
                    <Badge variant="secondary" className="bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm">
                        {type === 'building' ? 'Immeuble' : 'Lot'}
                    </Badge>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Title & Address */}
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                            {title}
                        </h2>
                        <div className="flex items-start gap-1.5 text-sm text-slate-500">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="leading-snug">{subtitle}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Key Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {stats.map((stat, index) => (
                            <div key={index} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                    <stat.icon className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium uppercase tracking-wide">
                                        {stat.label}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-900">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <Separator />

                    {/* Contacts */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            <User className="h-4 w-4 text-slate-500" />
                            Contacts principaux
                        </h3>
                        <div className="space-y-3">
                            {contacts.map((contact, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={contact.avatar} />
                                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                                            {contact.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {contact.name}
                                        </p>
                                        <p className="text-xs text-slate-500 mb-0.5">
                                            {contact.role}
                                        </p>
                                        {(contact.email || contact.phone) && (
                                            <div className="text-xs text-slate-400 space-y-0.5">
                                                {contact.email && <p className="truncate">{contact.email}</p>}
                                                {contact.phone && <p>{contact.phone}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
