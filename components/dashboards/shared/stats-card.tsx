"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { Sparkline } from "@/components/ui/sparkline"

// ============================================================================
// TYPES
// ============================================================================

export interface TrendData {
    /** Array of historical values for sparkline */
    values?: number[]
    /** Previous period value for comparison */
    previousValue?: number
    /** Current value (for trend calculation) */
    currentValue?: number
}

export interface StatsCardProps {
    /** Unique identifier for the card */
    id: string
    /** Label displayed above the value */
    label: string
    /** Main value to display */
    value: string | number
    /** Sublabel displayed next to the value */
    sublabel?: string | React.ReactNode
    /** Secondary line displayed below (e.g., "2 expirent bientot") */
    secondaryValue?: React.ReactNode
    /** Icon component */
    icon: LucideIcon
    /** Icon color class (e.g., "text-indigo-600") */
    iconColor?: string
    /** Visual variant */
    variant?: 'default' | 'warning' | 'success'
    /** Navigation URL on click */
    href?: string
    /** Custom click handler (overrides href) */
    onClick?: () => void
    /** Optional trend data for sparklines */
    trendData?: TrendData
    /** Additional ring styling for alerts */
    alertRing?: boolean
    /** Additional className */
    className?: string
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const variantStyles = {
    default: {
        card: "bg-card dark:bg-white/5 border-none dark:border dark:border-white/10",
        value: "text-foreground",
        sublabel: "text-muted-foreground/70",
        label: "text-muted-foreground"
    },
    warning: {
        card: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-none dark:border dark:border-amber-900/30",
        value: "text-amber-900 dark:text-amber-100",
        sublabel: "text-amber-700/70 dark:text-amber-200/70",
        label: "text-amber-700/80 dark:text-amber-200/80"
    },
    success: {
        card: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-none dark:border dark:border-emerald-900/30",
        value: "text-emerald-900 dark:text-emerald-100",
        sublabel: "text-emerald-700/70 dark:text-emerald-200/70",
        label: "text-emerald-700/80 dark:text-emerald-200/80"
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StatsCard - Unified stats card component for dashboard KPIs
 *
 * @example
 * ```tsx
 * // Basic usage
 * <StatsCard
 *   id="buildings"
 *   label="Immeubles"
 *   value={3}
 *   sublabel="2 appartements"
 *   icon={Building2}
 *   href="/gestionnaire/biens/immeubles"
 * />
 *
 * // With secondary value
 * <StatsCard
 *   id="contracts"
 *   label="Contrats"
 *   value={8}
 *   sublabel="actifs"
 *   secondaryValue={<span className="text-warning">2 expirent bientot</span>}
 *   icon={FileText}
 * />
 * ```
 */
export function StatsCard({
    id,
    label,
    value,
    sublabel,
    secondaryValue,
    icon: Icon,
    iconColor = "text-primary",
    variant = 'default',
    href,
    onClick,
    trendData,
    alertRing = false,
    className
}: StatsCardProps) {
    const router = useRouter()
    const styles = variantStyles[variant]

    const handleClick = () => {
        if (onClick) {
            onClick()
        } else if (href) {
            router.push(href)
        }
    }

    const isClickable = Boolean(onClick || href)

    return (
        <Card
            data-stats-card={id}
            className={cn(
                "stats-card",
                "shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden group",
                "dark:backdrop-blur-sm dark:shadow-none",
                styles.card,
                isClickable && "cursor-pointer hover:transform hover:-translate-y-1",
                alertRing && "ring-2 ring-warning/50",
                className
            )}
            onClick={isClickable ? handleClick : undefined}
        >
            <CardContent className="stats-card__content p-6 relative">
                {/* Background Icon */}
                <div className="stats-card__icon-bg absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Icon className={cn("h-24 w-24", iconColor)} />
                </div>

                {/* Content */}
                <div className="stats-card__info relative z-10">
                    {/* Label */}
                    <p className={cn(
                        "stats-card__label text-sm font-medium uppercase tracking-wider",
                        styles.label
                    )}>
                        {label}
                    </p>

                    {/* Value + Sublabel */}
                    <div className="stats-card__value-container flex items-baseline gap-2 mt-2">
                        <span className={cn("stats-card__value text-4xl font-bold", styles.value)}>
                            {value}
                        </span>
                        {sublabel && (
                            <span className={cn("stats-card__sublabel text-sm font-medium", styles.sublabel)}>
                                {typeof sublabel === 'string' ? sublabel : sublabel}
                            </span>
                        )}
                    </div>

                    {/* Secondary Value (optional) */}
                    {secondaryValue && (
                        <div className="stats-card__secondary mt-1 text-sm">
                            {secondaryValue}
                        </div>
                    )}

                    {/* Sparkline (optional) */}
                    {trendData?.values && trendData.values.length > 1 && (
                        <div className="stats-card__sparkline mt-3">
                            <Sparkline
                                data={trendData.values}
                                width={100}
                                height={24}
                                showFill
                                strokeColor={variant === 'success' ? 'rgb(16, 185, 129)' : 'rgb(99, 102, 241)'}
                                fillColor={variant === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'}
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
