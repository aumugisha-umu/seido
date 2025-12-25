"use client"

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, MapPin, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface ContactCardCompactProps {
    contact: {
        id: string
        name: string
        email: string
        phone?: string
        address?: string
        role?: string
        provider_category?: string
        speciality?: string
        is_company?: boolean
        company_id?: string | null
        companyLegacy?: string
        company?: {
            id: string
            name: string
        } | null
    }
    invitationStatus?: string
    isCurrentUser?: boolean
    onClick?: () => void
    /**
     * Display variant:
     * - 'default': Full card with all details (email, phone, address)
     * - 'inline': Compact inline style without address, smaller padding (for embedded lists)
     */
    variant?: 'default' | 'inline'
}

export function ContactCardCompact({ contact, invitationStatus, isCurrentUser, onClick, variant = 'default' }: ContactCardCompactProps) {
    const router = useRouter()
    const isInline = variant === 'inline'

    const handleCardClick = () => {
        if (onClick) {
            onClick()
        } else {
            router.push(`/gestionnaire/contacts/details/${contact.id}`)
        }
    }

    const getContactTypeLabel = () => {
        if (!contact.role) return 'Non défini'

        const types: Record<string, string> = {
            // English values (expected)
            'tenant': 'Locataire',
            'owner': 'Propriétaire',
            'provider': 'Prestataire',
            'manager': 'Gestionnaire',
            'other': 'Autre',
            // French values (fallback for legacy data)
            'locataire': 'Locataire',
            'proprietaire': 'Propriétaire',
            'prestataire': 'Prestataire',
            'gestionnaire': 'Gestionnaire',
            'autre': 'Autre'
        }
        return types[contact.role] || 'Non défini'
    }

    const getContactTypeBadgeStyle = () => {
        const styles: Record<string, string> = {
            // English values (expected)
            'tenant': 'bg-blue-100 text-blue-800',
            'owner': 'bg-emerald-100 text-emerald-800',
            'provider': 'bg-green-100 text-green-800',
            'manager': 'bg-purple-100 text-purple-800',
            'other': 'bg-gray-100 text-gray-600',
            // French values (fallback for legacy data)
            'locataire': 'bg-blue-100 text-blue-800',
            'proprietaire': 'bg-emerald-100 text-emerald-800',
            'prestataire': 'bg-green-100 text-green-800',
            'gestionnaire': 'bg-purple-100 text-purple-800',
            'autre': 'bg-gray-100 text-gray-600'
        }
        return styles[contact.role || 'other'] || 'bg-gray-100 text-gray-600'
    }

    const getSpecialityLabel = (speciality: string) => {
        const specialities: Record<string, string> = {
            'plomberie': 'Plomberie',
            'electricite': 'Électricité',
            'chauffage': 'Chauffage',
            'serrurerie': 'Serrurerie',
            'peinture': 'Peinture',
            'menage': 'Ménage',
            'jardinage': 'Jardinage',
            'autre': 'Autre'
        }
        return specialities[speciality] || speciality
    }

    const getInvitationBadge = () => {
        if (!invitationStatus) return null

        const configs: Record<string, { label: string; class: string }> = {
            pending: { label: 'En attente', class: 'bg-orange-100 text-orange-800' },
            accepted: { label: 'Actif', class: 'bg-green-100 text-green-800' },
            expired: { label: 'Invitation expirée', class: 'bg-gray-100 text-gray-800' },
            cancelled: { label: 'Invitation annulée', class: 'bg-red-100 text-red-800' }
        }

        const config = configs[invitationStatus] || configs.pending

        return (
            <Badge variant="secondary" className={cn(`${config.class} text-xs font-medium`)}>
                {config.label}
            </Badge>
        )
    }

    // BEM Classes
    const blockClass = "contact-card"

    return (
        <Card
            className={cn(
                blockClass,
                "flex flex-col cursor-pointer",
                // Variant-specific padding and sizing
                isInline ? "p-2.5" : "p-4 h-full",
                // Hover
                isInline ? "hover:bg-muted" : "hover:shadow-md hover:border-primary/30",
                // Transition
                "transition-all duration-200",
                // Focus visible (WCAG 2.1 AA)
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                // Dark mode
                "bg-white dark:bg-card dark:hover:bg-accent/50"
            )}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            aria-label={`Contact: ${contact.name}, ${getContactTypeLabel()}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCardClick()
                }
            }}
        >
            {/* Header avec avatar, nom et badges */}
            <div className={cn(`${blockClass}__header`, "flex items-start gap-2", !isInline && "mb-2")}>
                <div className={cn(
                    `${blockClass}__avatar`,
                    "bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0",
                    isInline ? "w-8 h-8" : "w-9 h-9"
                )}>
                    <span className={cn("text-blue-600 font-semibold", isInline ? "text-xs" : "text-sm")}>
                        {contact.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                </div>
                <div className={cn(`${blockClass}__info`, "flex-1 min-w-0")}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className={cn(`${blockClass}__name`, "font-medium text-slate-900 truncate", isInline ? "text-sm" : "text-base")}>
                            {contact.name}
                        </h3>
                        {contact.role && (
                            <Badge
                                variant="secondary"
                                className={cn(
                                    `${blockClass}__role`,
                                    getContactTypeBadgeStyle(),
                                    "text-xs font-medium"
                                )}
                            >
                                {getContactTypeLabel()}
                            </Badge>
                        )}
                        {!isInline && contact.company && (
                            <Badge variant="secondary" className={cn(
                                `${blockClass}__company`,
                                "bg-purple-100 text-purple-800 text-xs flex items-center gap-1"
                            )}>
                                <Building2 className="h-3 w-3" />
                                {contact.company.name}
                            </Badge>
                        )}
                        {isCurrentUser && (
                            <Badge variant="secondary" className={cn(
                                `${blockClass}__current-user`,
                                "bg-blue-100 text-blue-800 text-xs font-medium"
                            )}>
                                Vous
                            </Badge>
                        )}
                        {!isInline && getInvitationBadge()}
                        {!isInline && !contact.is_company && contact.companyLegacy && (
                            <Badge variant="secondary" className={cn(
                                `${blockClass}__company-legacy`,
                                "bg-gray-100 text-gray-800 text-xs"
                            )}>
                                {contact.companyLegacy}
                            </Badge>
                        )}
                        {!isInline && contact.speciality && (
                            <Badge variant="secondary" className={cn(
                                `${blockClass}__speciality`,
                                "bg-green-100 text-green-800 text-xs"
                            )}>
                                {getSpecialityLabel(contact.speciality)}
                            </Badge>
                        )}
                    </div>
                    {/* Inline variant: show email directly under name */}
                    {isInline && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {contact.email}
                        </p>
                    )}
                </div>
            </div>

            {/* Détails - only show in default variant */}
            {!isInline && (
                <div className={cn(`${blockClass}__details`, "space-y-1.5 text-sm text-slate-600 flex-1")}>
                    <div className={cn(`${blockClass}__detail`, "flex items-center gap-2")}>
                        <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                    </div>
                    {contact.phone && (
                        <div className={cn(`${blockClass}__detail`, "flex items-center gap-2")}>
                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                            <span>{contact.phone}</span>
                        </div>
                    )}
                    {!contact.is_company && contact.address && (
                        <div className={cn(`${blockClass}__detail`, "flex items-start gap-2")}>
                            <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            <span className="text-slate-500 line-clamp-2">{contact.address}</span>
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}
