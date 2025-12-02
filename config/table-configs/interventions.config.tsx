import {
    AlertTriangle,
    ListTodo,
    Settings,
    Archive,
    Eye,
    MoreVertical,
    Building2,
    MapPin,
    Clock,
    Calendar
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ManagerInterventionCard } from '@/components/dashboards/manager/manager-intervention-card'
import type { DataTableConfig } from '@/components/data-navigator/types'
import type { InterventionWithRelations } from '@/lib/services'
import {
    getStatusColor,
    getStatusLabel,
    getPriorityColor,
    getPriorityLabel,
    getInterventionLocationText,
    getInterventionLocationIcon,
    getTypeLabel,
    getTypeBadgeColor
} from '@/lib/intervention-utils'
import { shouldShowAlertBadge } from '@/lib/intervention-alert-utils'

/**
 * Configuration for Interventions table
 */
export const interventionsTableConfig: DataTableConfig<InterventionWithRelations> = {
    id: 'interventions',
    name: 'Interventions',

    columns: [
        {
            id: 'title',
            header: 'Titre',
            accessorKey: 'title',
            sortable: true,
            cell: (intervention) => {
                // Note: We need userContext and userId here, but they are not available in the static config.
                // We'll handle alert badge logic in the cell renderer if possible, or accept that it might be limited here.
                // For now, we'll just show the title. The alert badge logic depends on dynamic context.
                // A workaround is to pass context via a wrapper or context provider, but DataTable is generic.
                // We'll stick to simple title for now.
                return (
                    <div className="font-medium truncate max-w-[250px]" title={intervention.title}>
                        {intervention.title}
                    </div>
                )
            }
        },
        {
            id: 'type',
            header: 'Type',
            accessorKey: 'type',
            sortable: true,
            cell: (intervention) => (
                <Badge className={`${getTypeBadgeColor(intervention.type || 'autre')} text-xs border whitespace-nowrap`}>
                    {getTypeLabel(intervention.type || 'autre')}
                </Badge>
            )
        },
        {
            id: 'urgency',
            header: 'Urgence',
            accessorKey: 'urgency',
            sortable: true,
            cell: (intervention) => (
                <Badge className={`${getPriorityColor(intervention.urgency || 'normale')} text-xs whitespace-nowrap`}>
                    {getPriorityLabel(intervention.urgency || 'normale')}
                </Badge>
            )
        },
        {
            id: 'status',
            header: 'Statut',
            accessorKey: 'status',
            sortable: true,
            cell: (intervention) => (
                <Badge className={`${getStatusColor(intervention.status)} text-xs whitespace-nowrap`}>
                    {getStatusLabel(intervention.status)}
                </Badge>
            )
        },
        {
            id: 'location',
            header: 'Localisation',
            accessorKey: 'location', // Virtual accessor, sorting handled by custom logic if needed
            cell: (intervention) => {
                const locationText = getInterventionLocationText(intervention)
                const locationIcon = getInterventionLocationIcon(intervention)
                return (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        {locationIcon === 'building' ? (
                            <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        ) : (
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        )}
                        <span className="truncate max-w-[180px]" title={locationText}>{locationText}</span>
                    </div>
                )
            }
        },
        {
            id: 'scheduled_date',
            header: 'Programmée',
            accessorKey: 'scheduled_date',
            sortable: true,
            cell: (intervention) => (
                <div className="text-sm text-slate-600 whitespace-nowrap">
                    {intervention.scheduled_date
                        ? new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                        })
                        : '-'}
                </div>
            )
        }
    ],

    searchConfig: {
        placeholder: 'Rechercher par titre, description, ou lot...',
        searchableFields: ['title', 'description', 'reference'],
        // Custom search function to handle nested fields like lot.reference or building.name
        searchFn: (item, searchTerm) => {
            const term = searchTerm.toLowerCase()
            return (
                item.title?.toLowerCase().includes(term) ||
                item.description?.toLowerCase().includes(term) ||
                item.reference?.toLowerCase().includes(term) ||
                item.lot?.reference?.toLowerCase().includes(term) ||
                item.lot?.building?.name?.toLowerCase().includes(term) ||
                false
            )
        }
    },

    filters: [
        {
            id: 'type',
            label: "Type d'intervention",
            options: [
                { value: "all", label: "Tous les types" },
                { value: "plomberie", label: "Plomberie" },
                { value: "electricite", label: "Électricité" },
                { value: "chauffage", label: "Chauffage" },
                { value: "serrurerie", label: "Serrurerie" },
                { value: "maintenance", label: "Maintenance générale" },
                { value: "peinture", label: "Peinture" }
            ],
            defaultValue: "all"
        },
        {
            id: 'urgency',
            label: "Niveau d'urgence",
            options: [
                { value: "all-urgency", label: "Tous les niveaux" },
                { value: "basse", label: "Basse" },
                { value: "normale", label: "Normale" },
                { value: "haute", label: "Haute" },
                { value: "urgente", label: "Urgente" }
            ],
            defaultValue: "all-urgency"
        }
    ],

    tabs: [
        {
            id: "toutes",
            label: "Toutes",
            icon: ListTodo,
            filter: () => true
        },
        {
            id: "demandes_group",
            label: "Demandes",
            icon: AlertTriangle,
            filter: (i) => ["demande", "approuvee"].includes(i.status)
        },
        {
            id: "en_cours_group",
            label: "En cours",
            icon: Settings,
            filter: (i) => ["demande_de_devis", "planification", "planifiee", "en_cours", "cloturee_par_prestataire"].includes(i.status)
        },
        {
            id: "cloturees_group",
            label: "Clôturées",
            icon: Archive,
            filter: (i) => ["cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"].includes(i.status)
        }
    ],

    views: {
        card: {
            enabled: true,
            component: ({ item }) => <ManagerInterventionCard intervention={item} />,
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

    defaultView: 'cards',

    actions: [
        {
            id: 'view',
            label: 'Voir les détails',
            icon: Eye,
            onClick: (intervention) => {
                window.location.href = `/gestionnaire/interventions/${intervention.id}`
            }
        }
    ],

    emptyState: {
        title: 'Aucune intervention',
        description: 'Les interventions créées apparaîtront ici',
        showCreateButton: true,
        createButtonText: 'Créer une intervention',
        createButtonAction: () => {
            window.location.href = '/gestionnaire/interventions/nouvelle-intervention'
        }
    }
}
