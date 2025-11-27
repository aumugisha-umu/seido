import { Building2, Home, MapPin, Users, AlertCircle, Eye, Edit, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BuildingCardCompact } from '@/components/patrimoine/building-card-compact'
import { LotCardCompact } from '@/components/patrimoine/lot-card-compact'
import { getLotCategoryConfig } from '@/lib/lot-types'
import type { DataTableConfig } from '@/components/data-navigator/types'

// Building type
export interface BuildingData {
    id: string
    name: string
    address: string
    city?: string
    postal_code?: string
    lots?: Array<{ id: string; status?: string }>
    building_contacts?: Array<{ user?: { id: string; name: string; role: string } }>
    interventions_count?: number
}

// Lot type
export interface LotData {
    id: string
    reference: string
    category?: string
    floor?: number
    apartment_number?: string
    surface_area?: number
    rooms?: number
    status?: string
    is_occupied?: boolean
    lot_contacts?: Array<{ user?: { id: string; name: string; role: string } }>
    building?: {
        id: string
        name: string
        address?: string
        city?: string
    }
    building_name?: string
    interventions_count?: number
}

/**
 * Configuration for Buildings table
 */
export const buildingsTableConfig: DataTableConfig<BuildingData> = {
    id: 'buildings',
    name: 'Immeubles',

    // Columns for list view
    columns: [
        {
            id: 'name',
            header: 'Nom',
            accessorKey: 'name',
            sortable: true,
            className: 'font-medium',
            cell: (building) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-sky-600" />
                    </div>
                    <span className="font-medium text-slate-900">{building.name}</span>
                </div>
            )
        },
        {
            id: 'address',
            header: 'Adresse',
            accessorKey: 'address',
            sortable: true,
            cell: (building) => (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{building.address}, {building.city || ''}</span>
                </div>
            )
        },
        {
            id: 'lots_count',
            header: 'Lots',
            width: '100px',
            cell: (building) => {
                const totalLots = building.lots?.length || 0
                const occupiedLots = building.lots?.filter(lot => lot.status === 'occupied').length || 0
                return (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Home className="h-3 w-3 text-amber-600" />
                            <span className="text-sm font-medium">{totalLots}</span>
                        </div>
                        <span className="text-xs text-slate-500">({occupiedLots} occupés)</span>
                    </div>
                )
            }
        },
        {
            id: 'contacts',
            header: 'Contacts',
            width: '100px',
            cell: (building) => {
                const contactsCount = building.building_contacts?.length || 0
                if (contactsCount === 0) return <span className="text-sm text-slate-400">-</span>
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs w-fit">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700 font-medium">{contactsCount}</span>
                    </div>
                )
            }
        },
        {
            id: 'interventions',
            header: 'Interventions',
            width: '120px',
            cell: (building) => {
                const count = building.interventions_count || 0
                if (count === 0) return <span className="text-sm text-slate-400">Aucune</span>
                return (
                    <div className="flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-700">{count}</span>
                    </div>
                )
            }
        }
    ],

    // Search configuration
    searchConfig: {
        placeholder: 'Rechercher par nom, adresse, ville...',
        searchableFields: ['name', 'address', 'city', 'postal_code']
    },

    // Filters
    filters: [
        {
            id: 'occupation',
            label: 'Occupation',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'with_occupied', label: 'Avec lots occupés' },
                { value: 'all_vacant', label: 'Tous lots vacants' }
            ],
            defaultValue: 'all'
        },
        {
            id: 'city',
            label: 'Ville',
            options: [
                { value: 'all', label: 'Toutes les villes' },
                // Dynamic cities should be added based on data
            ],
            defaultValue: 'all'
        },
        {
            id: 'interventions',
            label: 'Interventions',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'with', label: 'Avec interventions' },
                { value: 'without', label: 'Sans intervention' }
            ],
            defaultValue: 'all'
        }
    ],

    // Tabs
    tabs: [
        {
            id: 'all',
            label: 'Tous',
            icon: Building2,
            filter: () => true
        }
    ],
    defaultTab: 'all',

    // Views
    views: {
        card: {
            enabled: true,
            component: BuildingCardCompact,
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

    // Actions
    actions: [
        {
            id: 'view',
            label: 'Voir les détails',
            icon: Eye,
            onClick: (building) => {
                window.location.href = `/gestionnaire/biens/immeubles/${building.id}`
            }
        },
        {
            id: 'edit',
            label: 'Modifier',
            icon: Edit,
            onClick: (building) => {
                window.location.href = `/gestionnaire/biens/immeubles/modifier/${building.id}`
            }
        },
        {
            id: 'archive',
            label: 'Archiver',
            icon: Archive,
            onClick: (building) => {
                console.log('Archive building:', building.id)
            },
            variant: 'destructive',
            className: 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
        }
    ],

    // Empty state
    emptyState: {
        title: 'Aucun immeuble trouvé',
        description: 'Ajoutez votre premier immeuble pour gérer votre portefeuille immobilier',
        icon: Building2,
        showCreateButton: true,
        createButtonText: 'Ajouter un immeuble',
        createButtonAction: () => {
            window.location.href = '/gestionnaire/biens/immeubles/nouveau'
        }
    }
}

/**
 * Configuration for Lots table
 */
export const lotsTableConfig: DataTableConfig<LotData> = {
    id: 'lots',
    name: 'Lots',

    // Columns for list view
    columns: [
        {
            id: 'reference',
            header: 'Référence',
            accessorKey: 'reference',
            sortable: true,
            cell: (lot) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Home className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="font-medium text-slate-900">{lot.reference}</span>
                </div>
            )
        },
        {
            id: 'building',
            header: 'Immeuble',
            accessorKey: 'building.name',
            sortable: true,
            cell: (lot) => {
                if (!lot.building) return <span className="text-sm text-slate-400">-</span>
                return (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{lot.building.name}</span>
                    </div>
                )
            }
        },
        {
            cell: (lot) => (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                    {lot.floor !== undefined && <span>Étage {lot.floor}</span>}
                    {lot.surface_area && <span>• {lot.surface_area}m²</span>}
                    {lot.rooms && <span>• {lot.rooms}p</span>}
                </div>
            )
        },
        {
            id: 'status',
            header: 'Statut',
            width: '100px',
            cell: (lot) => {
                const tenants = lot.lot_contacts?.filter(lc => lc.user?.role === 'locataire') || []
                const isOccupied = tenants.length > 0 || lot.is_occupied || lot.status === 'occupied'
                return (
                    <Badge
                        variant={isOccupied ? "default" : "secondary"}
                        className={`text-xs ${isOccupied ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                    >
                        {isOccupied ? "Occupé" : "Libre"}
                    </Badge>
                )
            }
        },
        {
            id: 'contacts',
            header: 'Contacts',
            width: '100px',
            cell: (lot) => {
                const tenants = lot.lot_contacts?.filter(lc => lc.user?.role === 'locataire') || []
                if (tenants.length === 0) return <span className="text-sm text-slate-400">-</span>
                return (
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs w-fit">
                        <Users className="w-3 h-3 text-blue-600" />
                        <span className="text-blue-700 font-medium">{tenants.length}</span>
                    </div>
                )
            }
        }
    ],

    // Search configuration
    searchConfig: {
        placeholder: 'Rechercher par référence, immeuble...',
        searchableFields: ['reference', 'building.name', 'building_name', 'apartment_number']
    },

    // Filters
    filters: [
        {
            id: 'status',
            label: 'Statut',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'occupied', label: 'Occupés' },
                { value: 'vacant', label: 'Vacants' }
            ],
            defaultValue: 'all'
        },
        {
            id: 'category',
            label: 'Catégorie',
            options: [
                { value: 'all', label: 'Toutes' },
                { value: 'appartement', label: 'Appartement' },
                { value: 'maison', label: 'Maison' },
                { value: 'garage', label: 'Garage' },
                { value: 'parking', label: 'Parking' },
                { value: 'local_commercial', label: 'Local commercial' }
            ],
            defaultValue: 'all'
        },
        {
            id: 'interventions',
            label: 'Interventions',
            options: [
                { value: 'all', label: 'Tous' },
                { value: 'with', label: 'Avec interventions' },
                { value: 'without', label: 'Sans intervention' }
            ],
            defaultValue: 'all'
        }
    ],

    // Tabs
    tabs: [
        {
            id: 'all',
            label: 'Tous',
            icon: Home,
            filter: () => true
        }
    ],
    defaultTab: 'all',

    // Views
    views: {
        card: {
            enabled: true,
            component: LotCardCompact,
            compact: true
        },
        list: {
            enabled: true,
            defaultSort: {
                field: 'reference',
                direction: 'asc'
            }
        }
    },

    defaultView: 'cards',

    // Actions
    actions: [
        {
            id: 'view',
            label: 'Voir les détails',
            icon: Eye,
            onClick: (lot) => {
                window.location.href = `/gestionnaire/biens/lots/${lot.id}`
            }
        },
        {
            id: 'edit',
            label: 'Modifier',
            icon: Edit,
            onClick: (lot) => {
                window.location.href = `/gestionnaire/biens/lots/modifier/${lot.id}`
            }
        },
        {
            id: 'manage_tenants',
            label: 'Gérer les locataires',
            icon: Users,
            onClick: (lot) => {
                window.location.href = `/gestionnaire/contacts?lot=${lot.id}`
            }
        },
        {
            id: 'archive',
            label: 'Archiver',
            icon: Archive,
            onClick: (lot) => {
                console.log('Archive lot:', lot.id)
            },
            variant: 'destructive',
            className: 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
        }
    ],

    // Empty state
    emptyState: {
        title: 'Aucun lot trouvé',
        description: 'Ajoutez votre premier lot pour gérer vos propriétés',
        icon: Home,
        showCreateButton: true,
        createButtonText: 'Ajouter un lot',
        createButtonAction: () => {
            window.location.href = '/gestionnaire/biens/lots/nouveau'
        }
    }
}
