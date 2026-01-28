import { Users, Mail, Phone, MapPin, Building2, Send, Edit, Eye, Archive, Trash2, RefreshCw, XCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ContactCardCompact } from '@/components/contacts/contact-card-compact'
import { CompanyCardCompact } from '@/components/contacts/company-card-compact'
import type { DataTableConfig } from '@/components/data-navigator/types'

// Contact type
export interface ContactData {
    id: string
    name: string
    email: string
    phone?: string
    companyLegacy?: string
    address?: string
    notes?: string
    role?: string
    provider_category?: string
    speciality?: string
    is_company?: boolean
    company_id?: string | null
    company?: {
        id: string
        name: string
        vat_number?: string | null
        street?: string | null
        street_number?: string | null
        postal_code?: string | null
        city?: string | null
        country?: string | null
    } | null
    // Invitation status (added from joined data)
    invitationStatus?: string | null
}

// Invitation type
export interface InvitationData {
    id: string
    email: string
    name?: string
    company?: string
    speciality?: string
    provider_category?: string
    role?: string
    status?: string
    /** Effective status accounting for expires_at (pending invitation past expiry = 'expired') */
    effectiveStatus?: string
    created_at: string
}

// Company type
export interface CompanyData {
    id: string
    name: string
    legal_name?: string | null
    vat_number?: string | null
    email?: string | null
    phone?: string | null
    street?: string | null
    street_number?: string | null
    postal_code?: string | null
    city?: string | null
    country?: string | null
    notes?: string | null
    website?: string | null
    is_active: boolean
    created_at?: string
    updated_at?: string
}

// Helper functions
export const getContactTypeLabel = (role?: string) => {
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
    return types[role || 'other'] || 'Non défini'
}

export const getContactTypeBadgeStyle = (role?: string) => {
    const styles: Record<string, string> = {
        // English values (expected)
        'tenant': 'bg-blue-100 text-blue-800',
        'owner': 'bg-amber-100 text-amber-800',
        'provider': 'bg-green-100 text-green-800',
        'manager': 'bg-purple-100 text-purple-800',
        'other': 'bg-gray-100 text-gray-600',
        // French values (fallback for legacy data)
        'locataire': 'bg-blue-100 text-blue-800',
        'proprietaire': 'bg-amber-100 text-amber-800',
        'prestataire': 'bg-green-100 text-green-800',
        'gestionnaire': 'bg-purple-100 text-purple-800',
        'autre': 'bg-gray-100 text-gray-600'
    }
    return styles[role || 'other'] || 'bg-gray-100 text-gray-600'
}

export const getSpecialityLabel = (speciality?: string) => {
    if (!speciality) return null
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

export const getSpecialityBadgeStyle = (speciality?: string) => {
    const styles: Record<string, string> = {
        'plomberie': 'bg-blue-100 text-blue-800',
        'electricite': 'bg-yellow-100 text-yellow-800',
        'chauffage': 'bg-orange-100 text-orange-800',
        'serrurerie': 'bg-slate-100 text-slate-800',
        'peinture': 'bg-purple-100 text-purple-800',
        'menage': 'bg-cyan-100 text-cyan-800',
        'jardinage': 'bg-green-100 text-green-800',
        'autre': 'bg-gray-100 text-gray-600'
    }
    return styles[speciality || 'autre'] || 'bg-gray-100 text-gray-600'
}

/**
 * Configuration for Contacts table
 */
export const contactsTableConfig: DataTableConfig<ContactData> = {
    id: 'contacts',
    name: 'Contacts',

    columns: [
        {
            id: 'name',
            header: 'Nom',
            accessorKey: 'name',
            sortable: true,
            cell: (contact) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-semibold text-xs">
                            {contact.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{contact.name}</div>
                        <div className="text-xs text-slate-500">{contact.email}</div>
                    </div>
                </div>
            )
        },
        {
            id: 'role',
            header: 'Rôle',
            accessorKey: 'role',
            sortable: true,
            cell: (contact) => (
                <Badge
                    variant="secondary"
                    className={`${getContactTypeBadgeStyle(contact.role)} text-xs font-medium`}
                >
                    {getContactTypeLabel(contact.role)}
                </Badge>
            )
        },
        {
            id: 'speciality',
            header: 'Spécialité',
            accessorKey: 'speciality',
            sortable: true,
            cell: (contact) => {
                const label = getSpecialityLabel(contact.speciality)
                if (!label) return <span className="text-sm text-slate-400">-</span>
                return (
                    <Badge variant="secondary" className={`${getSpecialityBadgeStyle(contact.speciality)} text-xs`}>
                        {label}
                    </Badge>
                )
            }
        },
        {
            id: 'invitationStatus',
            header: 'Statut',
            accessorKey: 'invitationStatus',
            sortable: true,
            cell: (contact) => {
                const status = contact.invitationStatus
                const statusConfig: Record<string, { label: string; className: string }> = {
                    'accepted': { label: 'Actif', className: 'bg-green-100 text-green-800 border-green-200' },
                    'pending': { label: 'En attente', className: 'bg-blue-100 text-blue-800 border-blue-200' },
                    'expired': { label: 'Expiré', className: 'bg-amber-100 text-amber-800 border-amber-200' },
                    'cancelled': { label: 'Annulé', className: 'bg-red-100 text-red-800 border-red-200' }
                }
                if (!status || !statusConfig[status]) {
                    return (
                        <Badge variant="outline" className="text-xs text-slate-500 border-slate-300">
                            Pas de compte
                        </Badge>
                    )
                }
                const config = statusConfig[status]
                return (
                    <Badge variant="secondary" className={`${config.className} text-xs font-medium`}>
                        {config.label}
                    </Badge>
                )
            }
        },
        {
            id: 'company',
            header: 'Société',
            accessorKey: 'company',
            sortable: true,
            cell: (contact) => {
                // Affiche la société liée si elle existe (relation company)
                if (contact.company) {
                    return (
                        <div className="flex items-center gap-1 text-sm text-slate-600">
                            <Building2 className="h-3 w-3" />
                            <span>{contact.company.name}</span>
                        </div>
                    )
                }
                // Fallback pour les données legacy (companyLegacy string)
                if (contact.companyLegacy) {
                    return <span className="text-sm text-slate-600">{contact.companyLegacy}</span>
                }
                return <span className="text-sm text-slate-400">-</span>
            }
        },
        {
            id: 'phone',
            header: 'Téléphone',
            accessorKey: 'phone',
            sortable: true,
            cell: (contact) => {
                if (!contact.phone) return <span className="text-sm text-slate-400">-</span>
                return (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Phone className="h-3 w-3" />
                        <span>{contact.phone}</span>
                    </div>
                )
            }
        }
    ],

    searchConfig: {
        placeholder: 'Rechercher par nom, email, société...',
        searchableFields: ['name', 'email', 'companyLegacy', 'speciality']
    },

    filters: [
        {
            id: 'role',
            label: 'Rôle',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'locataire', label: 'Locataire' },
                { value: 'proprietaire', label: 'Propriétaire' },
                { value: 'prestataire', label: 'Prestataire' },
                { value: 'gestionnaire', label: 'Gestionnaire' }
            ],
            defaultValue: 'all'
        },
        {
            id: 'speciality',
            label: 'Spécialité',
            options: [
                { value: 'all', label: 'Toutes' },
                { value: 'plomberie', label: 'Plomberie' },
                { value: 'electricite', label: 'Électricité' },
                { value: 'chauffage', label: 'Chauffage' },
                { value: 'serrurerie', label: 'Serrurerie' },
                { value: 'peinture', label: 'Peinture' },
                { value: 'menage', label: 'Ménage' },
                { value: 'jardinage', label: 'Jardinage' },
                { value: 'autre', label: 'Autre' }
            ],
            defaultValue: 'all'
        },
        {
            id: 'invitationStatus',
            label: 'Statut invitation',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'none', label: 'Pas de compte' },
                { value: 'pending', label: 'En attente' },
                { value: 'accepted', label: 'Actif' },
                { value: 'expired', label: 'Expiré' },
                { value: 'cancelled', label: 'Annulé' }
            ],
            defaultValue: 'all'
        }
    ],

    views: {
        card: {
            enabled: true,
            component: ({ item, actions }) => (
                <ContactCardCompact
                    contact={item}
                    invitationStatus={item.invitationStatus || undefined}
                    actions={actions}
                />
            ),
            compact: true
        },
        list: {
            enabled: true,
            defaultSort: {
                field: 'name',
                direction: 'asc'
            }
        }
    },

    defaultView: 'cards',

    // Row click navigation
    rowHref: (contact) => `/gestionnaire/contacts/details/${contact.id}`,

    actions: [
        {
            id: 'edit',
            label: 'Modifier',
            icon: Edit,
            onClick: (contact) => {
                window.location.href = `/gestionnaire/contacts/modifier/${contact.id}`
            }
        },
        {
            id: 'view',
            label: 'Voir détails',
            icon: Eye,
            onClick: (contact) => {
                window.location.href = `/gestionnaire/contacts/details/${contact.id}`
            }
        }
    ],

    emptyState: {
        title: 'Aucun contact trouvé',
        description: 'Ajoutez votre premier contact pour commencer',
        icon: Users,
        showCreateButton: true,
        createButtonText: 'Ajouter un contact',
        createButtonAction: () => {
            window.location.href = '/gestionnaire/contacts/nouveau'
        }
    }
}

/**
 * Configuration for Invitations table
 */
export const invitationsTableConfig: DataTableConfig<InvitationData> = {
    id: 'invitations',
    name: 'Invitations',

    columns: [
        {
            id: 'email',
            header: 'Email',
            accessorKey: 'email',
            sortable: true,
            cell: (invitation) => (
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="font-medium text-slate-900">{invitation.email}</span>
                </div>
            )
        },
        {
            id: 'name',
            header: 'Nom',
            accessorKey: 'name',
            cell: (invitation) => invitation.name || <span className="text-slate-400">-</span>
        },
        {
            id: 'role',
            header: 'Rôle',
            accessorKey: 'role',
            cell: (invitation) => (
                <Badge
                    variant="secondary"
                    className={`${getContactTypeBadgeStyle(invitation.role)} text-xs font-medium`}
                >
                    {getContactTypeLabel(invitation.role)}
                </Badge>
            )
        },
        {
            id: 'status',
            header: 'Statut',
            accessorKey: 'effectiveStatus', // Use effectiveStatus for filtering (accounts for expires_at)
            cell: (invitation) => {
                // Display effectiveStatus which accounts for expires_at
                const status = (invitation as any).effectiveStatus || invitation.status || 'pending'
                const configs: Record<string, { label: string; class: string }> = {
                    pending: { label: 'En attente', class: 'bg-orange-100 text-orange-800' },
                    accepted: { label: 'Acceptée', class: 'bg-green-100 text-green-800' },
                    expired: { label: 'Expirée', class: 'bg-gray-100 text-gray-800' },
                    cancelled: { label: 'Annulée', class: 'bg-red-100 text-red-800' }
                }
                const config = configs[status] || configs.pending
                return (
                    <Badge variant="secondary" className={`${config.class} text-xs`}>
                        {config.label}
                    </Badge>
                )
            }
        },
        {
            id: 'created_at',
            header: 'Envoyée le',
            accessorKey: 'created_at',
            sortable: true,
            cell: (invitation) => new Date(invitation.created_at).toLocaleDateString('fr-FR')
        }
    ],

    searchConfig: {
        placeholder: 'Rechercher une invitation...',
        searchableFields: ['email', 'name', 'company']
    },

    filters: [
        {
            id: 'effectiveStatus', // Filter on effectiveStatus (accounts for expires_at)
            label: 'Statut',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'pending', label: 'En attente' },
                { value: 'accepted', label: 'Acceptée' },
                { value: 'expired', label: 'Expirée' },
                { value: 'cancelled', label: 'Annulée' }
            ],
            defaultValue: 'all'
        }
    ],

    views: {
        card: {
            enabled: true,
            component: ({ item }) => {
                const status = item.effectiveStatus || item.status || 'pending'
                const statusLabels: Record<string, string> = {
                    pending: 'En attente',
                    accepted: 'Acceptée',
                    expired: 'Expirée',
                    cancelled: 'Annulée'
                }
                const statusClasses: Record<string, string> = {
                    pending: 'bg-orange-100 text-orange-800',
                    accepted: 'bg-green-100 text-green-800',
                    expired: 'bg-gray-100 text-gray-800',
                    cancelled: 'bg-red-100 text-red-800'
                }
                return (
                    <div className="p-4 border rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">{item.email}</div>
                            <Badge variant="secondary" className={`text-xs ${statusClasses[status] || ''}`}>
                                {statusLabels[status] || status}
                            </Badge>
                        </div>
                        <div className="text-sm text-slate-500 mb-2">
                            {item.name || 'Sans nom'} • {getContactTypeLabel(item.role)}
                        </div>
                        <div className="text-xs text-slate-400">
                            Envoyée le {new Date(item.created_at).toLocaleDateString('fr-FR')}
                        </div>
                    </div>
                )
            },
            compact: true
        },
        list: {
            enabled: true,
            defaultSort: {
                field: 'created_at',
                direction: 'desc'
            }
        }
    },

    defaultView: 'list',

    actions: [
        {
            id: 'resend',
            label: 'Renvoyer',
            icon: RefreshCw,
            onClick: (invitation) => {
                console.log('Resend invitation:', invitation.id)
            }
        },
        {
            id: 'cancel',
            label: 'Annuler',
            icon: XCircle,
            variant: 'destructive',
            onClick: (invitation) => {
                console.log('Cancel invitation:', invitation.id)
            }
        }
    ],

    emptyState: {
        title: 'Aucune invitation',
        description: 'Les invitations envoyées apparaîtront ici',
        icon: Send,
        showCreateButton: false
    }
}

/**
 * Configuration for Companies table
 */
export const companiesTableConfig: DataTableConfig<CompanyData> = {
    id: 'companies',
    name: 'Sociétés',

    columns: [
        {
            id: 'name',
            header: 'Nom',
            accessorKey: 'name',
            sortable: true,
            cell: (company) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                        <div className="font-medium text-slate-900">{company.name}</div>
                        {company.legal_name && <div className="text-xs text-slate-500">{company.legal_name}</div>}
                    </div>
                </div>
            )
        },
        {
            id: 'vat',
            header: 'TVA',
            accessorKey: 'vat_number',
            cell: (company) => company.vat_number || <span className="text-slate-400">-</span>
        },
        {
            id: 'email',
            header: 'Email',
            accessorKey: 'email',
            cell: (company) => (
                company.email ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-3 w-3" />
                        <span>{company.email}</span>
                    </div>
                ) : <span className="text-slate-400">-</span>
            )
        },
        {
            id: 'city',
            header: 'Ville',
            accessorKey: 'address_record.city',
            cell: (company) => (
                company.address_record?.city ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-3 w-3" />
                        <span>{company.address_record.city}</span>
                    </div>
                ) : <span className="text-slate-400">-</span>
            )
        }
    ],

    searchConfig: {
        placeholder: 'Rechercher une société...',
        searchableFields: ['name', 'legal_name', 'vat_number', 'email', 'address_record.city']
    },

    filters: [],

    views: {
        card: {
            enabled: true,
            component: ({ item }) => (
                <CompanyCardCompact company={item} />
            ),
            compact: true
        },
        list: {
            enabled: true,
            defaultSort: {
                field: 'name',
                direction: 'asc'
            }
        }
    },

    defaultView: 'cards',

    // Row click navigation
    rowHref: (company) => `/gestionnaire/contacts/societes/${company.id}`,

    actions: [
        {
            id: 'edit',
            label: 'Modifier',
            icon: Edit,
            onClick: (company) => {
                console.log('Edit company:', company.id)
            }
        }
    ],

    emptyState: {
        title: 'Aucune société',
        description: 'Les sociétés enregistrées apparaîtront ici',
        icon: Building2,
        showCreateButton: false
    }
}
