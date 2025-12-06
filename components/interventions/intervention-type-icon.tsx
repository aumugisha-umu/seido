"use client"

import { cn } from "@/lib/utils"
import {
    Droplets,
    Zap,
    Flame,
    Key,
    Paintbrush,
    Hammer,
    Home,
    Wrench,
    type LucideIcon
} from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export type InterventionType =
    | 'plomberie'
    | 'electricite'
    | 'chauffage'
    | 'serrurerie'
    | 'peinture'
    | 'maintenance'
    | 'toiture'
    | string

interface InterventionTypeIconProps {
    /** The intervention type - supports both 'type' and 'intervention_type' fields */
    type?: string | null
    /** Alternative field name used in some data models */
    interventionType?: string | null
    /** Size variant */
    size?: 'sm' | 'md' | 'lg'
    /** Show background container */
    showBackground?: boolean
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

const TYPE_CONFIG: Record<string, TypeConfig> = {
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
    serrurerie: {
        icon: Key,
        bgColor: 'bg-slate-500',
        textColor: 'text-slate-500',
        label: 'Serrurerie'
    },
    peinture: {
        icon: Paintbrush,
        bgColor: 'bg-purple-500',
        textColor: 'text-purple-500',
        label: 'Peinture'
    },
    menage: {
        icon: Home,
        bgColor: 'bg-teal-500',
        textColor: 'text-teal-500',
        label: 'Ménage'
    },
    jardinage: {
        icon: Home,
        bgColor: 'bg-green-500',
        textColor: 'text-green-500',
        label: 'Jardinage'
    },
    maintenance: {
        icon: Hammer,
        bgColor: 'bg-indigo-500',
        textColor: 'text-indigo-500',
        label: 'Maintenance'
    },
    toiture: {
        icon: Home,
        bgColor: 'bg-amber-500',
        textColor: 'text-amber-500',
        label: 'Toiture'
    },
    autre: {
        icon: Wrench,
        bgColor: 'bg-indigo-500',
        textColor: 'text-indigo-500',
        label: 'Autre'
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
 * @example
 * ```tsx
 * // With background (default)
 * <InterventionTypeIcon type={intervention.type} interventionType={intervention.intervention_type} />
 *
 * // Icon only (no background)
 * <InterventionTypeIcon type="plomberie" showBackground={false} />
 *
 * // Different sizes
 * <InterventionTypeIcon type="electricite" size="sm" />
 * <InterventionTypeIcon type="electricite" size="lg" />
 * ```
 */
export function InterventionTypeIcon({
    type,
    interventionType,
    size = 'md',
    showBackground = true,
    className
}: InterventionTypeIconProps) {
    // Resolve the type, preferring intervention_type over type
    const resolvedType = (interventionType || type || '').toLowerCase()
    const config = getTypeConfig(resolvedType)
    const Icon = config.icon
    const sizeConfig = SIZE_CONFIG[size]

    if (!showBackground) {
        return (
            <Icon
                className={cn(sizeConfig.icon, config.textColor, className)}
                aria-label={config.label}
            />
        )
    }

    return (
        <div
            className={cn(
                "flex items-center justify-center text-white shadow-md flex-shrink-0",
                sizeConfig.container,
                config.bgColor,
                className
            )}
            aria-label={config.label}
        >
            <Icon className={sizeConfig.icon} />
        </div>
    )
}
