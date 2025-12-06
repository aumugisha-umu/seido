"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface KPICardData {
    id: string
    label: string
    value: string | number
    sublabel?: string
    icon: LucideIcon
    iconColor?: string
    variant?: 'default' | 'warning' | 'success' | 'danger'
    onClick?: () => void
    badge?: {
        text: string
        variant: 'warning' | 'danger' | 'success'
    }
}

interface KPICarouselProps {
    cards: KPICardData[]
    className?: string
}

// ============================================================================
// STYLES
// ============================================================================

const variantStyles = {
    default: {
        card: "bg-card dark:bg-white/5 border-none dark:border dark:border-white/10",
        value: "text-foreground",
        sublabel: "text-muted-foreground/70"
    },
    warning: {
        card: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-none dark:border dark:border-amber-900/30",
        value: "text-amber-900 dark:text-amber-100",
        sublabel: "text-amber-700/70 dark:text-amber-200/70"
    },
    success: {
        card: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-none dark:border dark:border-emerald-900/30",
        value: "text-emerald-900 dark:text-emerald-100",
        sublabel: "text-emerald-700/70 dark:text-emerald-200/70"
    },
    danger: {
        card: "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-none dark:border dark:border-red-900/30",
        value: "text-red-900 dark:text-red-100",
        sublabel: "text-red-700/70 dark:text-red-200/70"
    }
}

const badgeStyles = {
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
}

// ============================================================================
// COMPONENT
// ============================================================================

export function KPICarousel({ cards, className }: KPICarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({
        align: 'start',
        skipSnaps: false,
        dragFree: true,
        containScroll: 'trimSnaps',
    })

    const [selectedIndex, setSelectedIndex] = useState(0)
    const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

    const onSelect = useCallback(() => {
        if (!emblaApi) return
        setSelectedIndex(emblaApi.selectedScrollSnap())
    }, [emblaApi])

    useEffect(() => {
        if (!emblaApi) return
        setScrollSnaps(emblaApi.scrollSnapList())
        emblaApi.on('select', onSelect)
        return () => {
            emblaApi.off('select', onSelect)
        }
    }, [emblaApi, onSelect])

    const scrollTo = useCallback((index: number) => {
        if (emblaApi) emblaApi.scrollTo(index)
    }, [emblaApi])

    return (
        <div className={cn("relative", className)}>
            {/* Carousel Container */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4">
                    {cards.map((card) => {
                        const styles = variantStyles[card.variant || 'default']
                        const Icon = card.icon

                        return (
                            <div
                                key={card.id}
                                className="flex-[0_0_85%] min-w-0 sm:flex-[0_0_45%] lg:flex-[0_0_calc(20%-12px)]"
                            >
                                <Card
                                    className={cn(
                                        "h-full shadow-sm hover:shadow-md transition-all duration-300",
                                        "rounded-2xl overflow-hidden group",
                                        "dark:backdrop-blur-sm dark:shadow-none",
                                        styles.card,
                                        card.onClick && "cursor-pointer hover:transform hover:-translate-y-1"
                                    )}
                                    onClick={card.onClick}
                                >
                                    <CardContent className="p-5 relative">
                                        {/* Badge */}
                                        {card.badge && (
                                            <span className={cn(
                                                "absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full",
                                                badgeStyles[card.badge.variant]
                                            )}>
                                                {card.badge.text}
                                            </span>
                                        )}

                                        {/* Icon Background */}
                                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Icon className={cn("h-20 w-20", card.iconColor || "text-primary")} />
                                        </div>

                                        {/* Content */}
                                        <div className="relative z-10">
                                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <div className="flex items-baseline gap-2 mt-2">
                                                <span className={cn("text-3xl font-bold", styles.value)}>
                                                    {card.value}
                                                </span>
                                                {card.sublabel && (
                                                    <span className={cn("text-sm font-medium", styles.sublabel)}>
                                                        {card.sublabel}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Pagination Dots - Mobile Only */}
            <div className="flex justify-center gap-2 mt-4 lg:hidden">
                {scrollSnaps.map((_, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => scrollTo(index)}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all duration-200",
                            index === selectedIndex
                                ? "bg-primary w-6"
                                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    )
}

// ============================================================================
// HELPER FUNCTION TO CONVERT STATS TO CARDS
// ============================================================================

import {
    AlertTriangle,
    Building2,
    Users,
    FileText,
    Wrench
} from "lucide-react"
import type { ContractStats } from "@/lib/types/contract.types"

interface StatsToCardsOptions {
    pendingCount: number
    activeCount: number
    completedCount?: number
    buildingsCount?: number
    lotsCount?: number
    occupancyRate?: number
    tenantCount?: number
    contractStats?: ContractStats
    onContractClick?: () => void
}

export function statsToKPICards({
    pendingCount,
    activeCount,
    completedCount = 0,
    buildingsCount,
    lotsCount,
    occupancyRate,
    tenantCount = 0,
    contractStats,
    onContractClick
}: StatsToCardsOptions): KPICardData[] {
    const cards: KPICardData[] = []

    // Actions requises
    cards.push({
        id: 'actions',
        label: 'Actions requises',
        value: pendingCount,
        sublabel: pendingCount > 0 ? 'Urgent' : 'Tout est calme',
        icon: AlertTriangle,
        iconColor: pendingCount > 0 ? 'text-amber-500' : 'text-emerald-500',
        variant: pendingCount > 0 ? 'warning' : 'success'
    })

    // Patrimoine (manager only)
    if (buildingsCount !== undefined) {
        cards.push({
            id: 'patrimoine',
            label: 'Patrimoine',
            value: buildingsCount,
            sublabel: `${lotsCount || 0} lots`,
            icon: Building2,
            iconColor: 'text-indigo-600',
            variant: 'default'
        })
    }

    // Occupation (manager only) - Shows tenant count instead of "Stable"
    if (occupancyRate !== undefined) {
        cards.push({
            id: 'occupation',
            label: 'Occupation',
            value: `${occupancyRate}%`,
            sublabel: `${tenantCount} locataire${tenantCount > 1 ? 's' : ''}`,
            icon: Users,
            iconColor: 'text-emerald-600',
            variant: 'default'
        })
    }

    // Contrats (manager only) - Shows expiring count
    if (contractStats) {
        cards.push({
            id: 'contrats',
            label: 'Contrats',
            value: contractStats.totalActive,
            sublabel: 'actifs',
            icon: FileText,
            iconColor: 'text-violet-600',
            variant: 'default',
            onClick: onContractClick,
            badge: contractStats.expiringNext30Days > 0 ? {
                text: `${contractStats.expiringNext30Days} expire${contractStats.expiringNext30Days > 1 ? 'nt' : ''}`,
                variant: 'warning'
            } : undefined
        })
    }

    // Interventions - Shows active + completed counts
    cards.push({
        id: 'interventions',
        label: 'En cours',
        value: activeCount,
        sublabel: completedCount > 0 ? `en cours · ${completedCount} terminee${completedCount > 1 ? 's' : ''}` : 'interventions',
        icon: Wrench,
        iconColor: 'text-blue-600',
        variant: 'default'
    })

    return cards
}
