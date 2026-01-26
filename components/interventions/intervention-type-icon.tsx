"use client"

import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    // Catégorie BIEN
    Droplets,           // plomberie
    Zap,                // electricite
    Flame,              // chauffage
    Wind,               // climatisation
    Key,                // serrurerie
    DoorOpen,           // menuiserie
    Glasses,            // vitrerie
    Paintbrush,         // peinture
    Footprints,         // revetements_sols
    Home,               // toiture
    Building2,          // facade
    Trees,              // espaces_verts
    Users,              // parties_communes
    ArrowUpDown,        // ascenseur
    Bell,               // securite_incendie
    Sparkles,           // nettoyage
    Bug,                // deratisation
    Truck,              // demenagement
    HardHat,            // travaux_gros_oeuvre
    Wrench,             // autre_technique

    // Catégorie BAIL
    ClipboardCheck,     // etat_des_lieux_entree
    ClipboardX,         // etat_des_lieux_sortie
    FileSignature,      // renouvellement_bail
    TrendingUp,         // revision_loyer
    Calculator,         // regularisation_charges
    FileX,              // resiliation_bail
    Wallet,             // caution
    Shield,             // assurance
    FileText,           // autre_administratif

    // Catégorie LOCATAIRE
    AlertTriangle,      // reclamation
    HelpCircle,         // demande_information
    Volume2,            // nuisances
    Hammer,             // demande_travaux
    UserPlus,           // changement_situation
    AlertOctagon,       // urgence_locataire
    MessageSquare,      // autre_locataire

    type LucideIcon
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export type InterventionType = string

interface InterventionTypeIconProps {
    /** The intervention type - supports both 'type' and 'intervention_type' fields */
    type?: string | null
    /** Alternative field name used in some data models */
    interventionType?: string | null
    /** Size variant */
    size?: 'sm' | 'md' | 'lg'
    /** Show background container */
    showBackground?: boolean
    /** Show label next to icon */
    showLabel?: boolean
    /** Show tooltip on hover with type label */
    showTooltip?: boolean
    /** Additional className */
    className?: string
}

// ============================================================================
// CONFIGURATION
// ============================================================================

interface TypeConfig {
    icon: LucideIcon
    bgColor: string
    textColor: string
    label: string
}

/**
 * Complete configuration for all 36 intervention types
 * Organized by category for clarity
 */
const TYPE_CONFIG: Record<string, TypeConfig> = {
    // ========================================================================
    // CATÉGORIE BIEN (20 types)
    // ========================================================================
    plomberie: {
        icon: Droplets,
        bgColor: 'bg-blue-500',
        textColor: 'text-blue-500',
        label: 'Plomberie'
    },
    electricite: {
        icon: Zap,
        bgColor: 'bg-yellow-500',
        textColor: 'text-yellow-500',
        label: 'Électricité'
    },
    chauffage: {
        icon: Flame,
        bgColor: 'bg-orange-500',
        textColor: 'text-orange-500',
        label: 'Chauffage'
    },
    climatisation: {
        icon: Wind,
        bgColor: 'bg-cyan-500',
        textColor: 'text-cyan-500',
        label: 'Climatisation'
    },
    serrurerie: {
        icon: Key,
        bgColor: 'bg-slate-500',
        textColor: 'text-slate-500',
        label: 'Serrurerie'
    },
    menuiserie: {
        icon: DoorOpen,
        bgColor: 'bg-amber-600',
        textColor: 'text-amber-600',
        label: 'Menuiserie'
    },
    vitrerie: {
        icon: Glasses,
        bgColor: 'bg-sky-400',
        textColor: 'text-sky-400',
        label: 'Vitrerie'
    },
    peinture: {
        icon: Paintbrush,
        bgColor: 'bg-purple-500',
        textColor: 'text-purple-500',
        label: 'Peinture'
    },
    revetements_sols: {
        icon: Footprints,
        bgColor: 'bg-stone-500',
        textColor: 'text-stone-500',
        label: 'Revêtements de sols'
    },
    toiture: {
        icon: Home,
        bgColor: 'bg-amber-500',
        textColor: 'text-amber-500',
        label: 'Toiture'
    },
    facade: {
        icon: Building2,
        bgColor: 'bg-gray-500',
        textColor: 'text-gray-500',
        label: 'Façade'
    },
    espaces_verts: {
        icon: Trees,
        bgColor: 'bg-green-500',
        textColor: 'text-green-500',
        label: 'Espaces verts'
    },
    parties_communes: {
        icon: Users,
        bgColor: 'bg-indigo-400',
        textColor: 'text-indigo-400',
        label: 'Parties communes'
    },
    ascenseur: {
        icon: ArrowUpDown,
        bgColor: 'bg-zinc-500',
        textColor: 'text-zinc-500',
        label: 'Ascenseur'
    },
    securite_incendie: {
        icon: Bell,
        bgColor: 'bg-red-400',
        textColor: 'text-red-400',
        label: 'Sécurité incendie'
    },
    nettoyage: {
        icon: Sparkles,
        bgColor: 'bg-teal-500',
        textColor: 'text-teal-500',
        label: 'Nettoyage'
    },
    deratisation: {
        icon: Bug,
        bgColor: 'bg-lime-600',
        textColor: 'text-lime-600',
        label: 'Dératisation'
    },
    demenagement: {
        icon: Truck,
        bgColor: 'bg-blue-400',
        textColor: 'text-blue-400',
        label: 'Déménagement'
    },
    travaux_gros_oeuvre: {
        icon: HardHat,
        bgColor: 'bg-orange-600',
        textColor: 'text-orange-600',
        label: 'Gros œuvre'
    },
    autre_technique: {
        icon: Wrench,
        bgColor: 'bg-indigo-500',
        textColor: 'text-indigo-500',
        label: 'Autre (technique)'
    },

    // ========================================================================
    // CATÉGORIE BAIL (9 types)
    // ========================================================================
    etat_des_lieux_entree: {
        icon: ClipboardCheck,
        bgColor: 'bg-emerald-500',
        textColor: 'text-emerald-500',
        label: 'État des lieux entrée'
    },
    etat_des_lieux_sortie: {
        icon: ClipboardX,
        bgColor: 'bg-rose-500',
        textColor: 'text-rose-500',
        label: 'État des lieux sortie'
    },
    renouvellement_bail: {
        icon: FileSignature,
        bgColor: 'bg-blue-600',
        textColor: 'text-blue-600',
        label: 'Renouvellement de bail'
    },
    revision_loyer: {
        icon: TrendingUp,
        bgColor: 'bg-green-600',
        textColor: 'text-green-600',
        label: 'Révision de loyer'
    },
    revision_charges: {
        icon: TrendingUp,
        bgColor: 'bg-emerald-600',
        textColor: 'text-emerald-600',
        label: 'Révision des charges'
    },
    regularisation_charges: {
        icon: Calculator,
        bgColor: 'bg-violet-500',
        textColor: 'text-violet-500',
        label: 'Régularisation charges'
    },
    resiliation_bail: {
        icon: FileX,
        bgColor: 'bg-red-500',
        textColor: 'text-red-500',
        label: 'Résiliation de bail'
    },
    caution: {
        icon: Wallet,
        bgColor: 'bg-amber-500',
        textColor: 'text-amber-500',
        label: 'Caution'
    },
    assurance: {
        icon: Shield,
        bgColor: 'bg-blue-500',
        textColor: 'text-blue-500',
        label: 'Assurance'
    },
    autre_administratif: {
        icon: FileText,
        bgColor: 'bg-gray-400',
        textColor: 'text-gray-400',
        label: 'Autre (administratif)'
    },

    // ========================================================================
    // CATÉGORIE LOCATAIRE (7 types)
    // ========================================================================
    reclamation: {
        icon: AlertTriangle,
        bgColor: 'bg-orange-500',
        textColor: 'text-orange-500',
        label: 'Réclamation'
    },
    demande_information: {
        icon: HelpCircle,
        bgColor: 'bg-blue-400',
        textColor: 'text-blue-400',
        label: "Demande d'information"
    },
    nuisances: {
        icon: Volume2,
        bgColor: 'bg-red-400',
        textColor: 'text-red-400',
        label: 'Nuisances'
    },
    demande_travaux: {
        icon: Hammer,
        bgColor: 'bg-indigo-500',
        textColor: 'text-indigo-500',
        label: 'Demande de travaux'
    },
    changement_situation: {
        icon: UserPlus,
        bgColor: 'bg-purple-400',
        textColor: 'text-purple-400',
        label: 'Changement de situation'
    },
    urgence_locataire: {
        icon: AlertOctagon,
        bgColor: 'bg-red-600',
        textColor: 'text-red-600',
        label: 'Urgence locataire'
    },
    autre_locataire: {
        icon: MessageSquare,
        bgColor: 'bg-gray-400',
        textColor: 'text-gray-400',
        label: 'Autre (locataire)'
    },

    // ========================================================================
    // LEGACY MAPPINGS (for backwards compatibility)
    // ========================================================================
    jardinage: {
        icon: Trees,
        bgColor: 'bg-green-500',
        textColor: 'text-green-500',
        label: 'Espaces verts'
    },
    menage: {
        icon: Sparkles,
        bgColor: 'bg-teal-500',
        textColor: 'text-teal-500',
        label: 'Nettoyage'
    },
    autre: {
        icon: Wrench,
        bgColor: 'bg-indigo-500',
        textColor: 'text-indigo-500',
        label: 'Autre'
    },
    maintenance: {
        icon: Hammer,
        bgColor: 'bg-indigo-500',
        textColor: 'text-indigo-500',
        label: 'Maintenance'
    }
}

const DEFAULT_CONFIG: TypeConfig = {
    icon: Wrench,
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-500',
    label: 'Autre'
}

// ============================================================================
// HELPER FUNCTIONS (exported for reuse)
// ============================================================================

/**
 * Get the normalized type from intervention data
 * Handles both 'type' and 'intervention_type' fields
 */
export function getInterventionType(intervention: {
    type?: string | null
    intervention_type?: string | null
}): string {
    return (intervention.intervention_type || intervention.type || 'autre').toLowerCase()
}

/**
 * Get configuration for an intervention type
 */
export function getTypeConfig(type?: string | null): TypeConfig {
    if (!type) return DEFAULT_CONFIG
    return TYPE_CONFIG[type.toLowerCase()] || DEFAULT_CONFIG
}

/**
 * Get just the icon component for a type
 */
export function getTypeIcon(type?: string | null): LucideIcon {
    return getTypeConfig(type).icon
}

/**
 * Get the background color class for a type
 */
export function getTypeBgColor(type?: string | null): string {
    return getTypeConfig(type).bgColor
}

/**
 * Get the text color class for a type
 */
export function getTypeTextColor(type?: string | null): string {
    return getTypeConfig(type).textColor
}

/**
 * Get the label for a type
 */
export function getTypeLabel(type?: string | null): string {
    return getTypeConfig(type).label
}

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const SIZE_CONFIG = {
    sm: {
        container: 'w-8 h-8 rounded-lg',
        icon: 'h-4 w-4'
    },
    md: {
        container: 'w-10 h-10 rounded-xl',
        icon: 'h-5 w-5'
    },
    lg: {
        container: 'w-12 h-12 rounded-xl',
        icon: 'h-6 w-6'
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Reusable component for displaying intervention type icon
 *
 * Supports 36+ intervention types organized in 3 categories:
 * - Bien (20 types): maintenance technique du patrimoine
 * - Bail (9 types): gestion locative et administrative
 * - Locataire (7 types): relations et communication
 *
 * @example
 * ```tsx
 * // With background (default)
 * <InterventionTypeIcon type={intervention.type} />
 *
 * // Icon only (no background)
 * <InterventionTypeIcon type="plomberie" showBackground={false} />
 *
 * // With label
 * <InterventionTypeIcon type="electricite" showLabel />
 *
 * // Different sizes
 * <InterventionTypeIcon type="chauffage" size="sm" />
 * <InterventionTypeIcon type="chauffage" size="lg" />
 * ```
 */
export function InterventionTypeIcon({
    type,
    interventionType,
    size = 'md',
    showBackground = true,
    showLabel = false,
    showTooltip = true,
    className
}: InterventionTypeIconProps) {
    // Resolve the type, preferring intervention_type over type
    const resolvedType = (interventionType || type || '').toLowerCase()
    const config = getTypeConfig(resolvedType)
    const Icon = config.icon
    const sizeConfig = SIZE_CONFIG[size]

    // Icon without background
    if (!showBackground) {
        const iconElement = (
            <span className={cn("inline-flex items-center gap-2", className)}>
                <Icon
                    className={cn(sizeConfig.icon, config.textColor)}
                    aria-label={config.label}
                />
                {showLabel && (
                    <span className="text-sm">{config.label}</span>
                )}
            </span>
        )

        if (showTooltip && !showLabel) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {iconElement}
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="text-sm font-medium">{config.label}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )
        }

        return iconElement
    }

    // Icon with background
    const iconWithBackground = (
        <span className={cn("inline-flex items-center gap-2", className)}>
            <div
                className={cn(
                    "flex items-center justify-center text-white shadow-md flex-shrink-0",
                    sizeConfig.container,
                    config.bgColor
                )}
                aria-label={config.label}
            >
                <Icon className={sizeConfig.icon} />
            </div>
            {showLabel && (
                <span className="text-sm font-medium">{config.label}</span>
            )}
        </span>
    )

    // Wrap with tooltip if enabled and label not already shown
    if (showTooltip && !showLabel) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {iconWithBackground}
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p className="text-sm font-medium">{config.label}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return iconWithBackground
}
