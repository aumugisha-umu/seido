"use client"

import React, { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { ProgressMini } from "./progress-mini"

// ============================================================================
// TYPES
// ============================================================================

export interface KPICardData {
    id: string
    label: string
    value: string | number
    sublabel?: React.ReactNode
    icon: LucideIcon
    iconColor?: string
    variant?: 'default' | 'warning' | 'success' | 'danger'
    onClick?: () => void
    badge?: {
        text: string
        variant: 'warning' | 'danger' | 'success'
    }
    /** Progress bar data for intervention card */
    progressBar?: {
        completed: number
        total: number
        percentage: number
        periodLabel: string
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
                                                    <div className={cn("text-sm font-medium flex flex-col", styles.sublabel)}>
                                                        {card.sublabel}
                                                    </div>
                                                )}
                                            </div>
                                            {/* Progress bar for intervention card */}
                                            {card.progressBar && (
                                                <div className="mt-3">
                                                    <ProgressMini
                                                        completed={card.progressBar.completed}
                                                        total={card.progressBar.total}
                                                        percentage={card.progressBar.percentage}
                                                        periodLabel={card.progressBar.periodLabel}
                                                    />
                                                </div>
                                            )}
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
// MOBILE STAT STRIP COMPONENT (single-line compact layout)
// ============================================================================

interface KPIMobileGridProps {
    cards: KPICardData[]
    className?: string
    /** Hide the first hero card (useful when "À traiter" section already shows pending count) */
    hideHeroCard?: boolean
}

/** Short labels for the stat strip — maps card.id to a compact label */
const stripLabels: Record<string, string> = {
    patrimoine: 'Lots',
    occupation: 'Occupation',
    contrats: 'Contrats',
    interventions: 'Interv.',
}

/**
 * KPIMobileGrid - Stat strip compact pour mobile
 *
 * - Compact action banner (44px) for "Actions requises" (hidden when 0)
 * - Single-line stat strip (56px): 4 cells with value + label, divided
 * - Total: 108px with banner, 56px without (vs ~430px old layout = -75%)
 *
 * Design ref: docs/plans/2026-03-03-gestionnaire-dashboard-mobile-redesign.md
 */
export function KPIMobileGrid({ cards, className, hideHeroCard = false }: KPIMobileGridProps) {
    if (cards.length === 0) return null

    const [heroCard, ...restCards] = cards
    const stripCards = hideHeroCard ? restCards : cards.slice(1)
    const showBanner = !hideHeroCard && heroCard && Number(heroCard.value) > 0

    return (
        <div className={cn("space-y-2", className)}>
            {/* Action banner — compact 44px (replaces hero card) */}
            {showBanner && (() => {
                const Icon = heroCard.icon
                return (
                    <button
                        type="button"
                        className="w-full flex items-center justify-between px-4 py-2.5
                            bg-amber-50 border border-amber-200 rounded-xl
                            min-h-[44px] text-left active:bg-amber-100 transition-colors
                            dark:bg-amber-950/30 dark:border-amber-900/30"
                        onClick={heroCard.onClick}
                        aria-label={`${heroCard.value} actions requises, voir les interventions`}
                    >
                        <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                                {heroCard.value} action{Number(heroCard.value) > 1 ? 's' : ''} requise{Number(heroCard.value) > 1 ? 's' : ''}
                            </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
                    </button>
                )
            })()}

            {/* Stat strip — single horizontal row, 56px height */}
            <div
                className="flex items-stretch overflow-x-auto
                    bg-card dark:bg-white/5
                    rounded-xl border border-border/50
                    divide-x divide-border/30
                    h-14"
            >
                {stripCards.map((card) => (
                    <div
                        key={card.id}
                        role={card.onClick ? "button" : undefined}
                        tabIndex={card.onClick ? 0 : undefined}
                        className={cn(
                            "flex-1 min-w-[68px]",
                            "flex flex-col items-center justify-center",
                            "px-1.5 py-1 text-center",
                            card.onClick && "active:bg-muted/50 cursor-pointer"
                        )}
                        onClick={card.onClick}
                        onKeyDown={card.onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') card.onClick?.() } : undefined}
                    >
                        <span className="text-base font-bold text-foreground leading-none">
                            {card.value}
                        </span>
                        <span className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate max-w-full">
                            {stripLabels[card.id] || card.label}
                        </span>
                        {card.badge && (
                            <span className={cn(
                                "text-[10px] font-medium px-1 rounded-full leading-tight mt-0.5",
                                badgeStyles[card.badge.variant]
                            )}>
                                {card.badge.text}
                            </span>
                        )}
                    </div>
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
    Wrench,
    ChevronRight
} from "lucide-react"
import type { ContractStats } from "@/lib/types/contract.types"

interface StatsToCardsOptions {
    pendingCount: number
    activeCount: number
    completedCount?: number
    buildingsCount?: number
    lotsCount?: number
    buildingLotsCount?: number
    independentLotsCount?: number
    occupancyRate?: number
    tenantCount?: number
    contractStats?: ContractStats
    onContractClick?: () => void
    /** Click handler for "Actions requises" card (scroll to interventions) */
    onActionsClick?: () => void
    /** Progress data for period completion tracking */
    progressData?: {
        completed: number
        total: number
        percentage: number
        periodLabel: string
    }
}

export function statsToKPICards({
    pendingCount,
    activeCount,
    completedCount = 0,
    buildingsCount,
    lotsCount,
    buildingLotsCount,
    independentLotsCount,
    occupancyRate,
    tenantCount = 0,
    contractStats,
    onContractClick,
    onActionsClick,
    progressData
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
        variant: pendingCount > 0 ? 'warning' : 'success',
        onClick: onActionsClick
    })

    // Patrimoine (manager only) - Shows lots/units count
    if (buildingsCount !== undefined) {
        const totalLots = lotsCount || 0

        cards.push({
            id: 'patrimoine',
            label: 'Patrimoine',
            value: totalLots,
            sublabel: (
                <>
                    <span>{totalLots > 1 ? 'lots' : 'lot'}</span>
                    <span>{buildingsCount} {buildingsCount > 1 ? 'immeubles' : 'immeuble'}</span>
                </>
            ),
            icon: Building2,
            iconColor: 'text-indigo-600',
            variant: 'default'
        })
    }

    // Occupation (manager only)
    if (occupancyRate !== undefined) {
        cards.push({
            id: 'occupation',
            label: 'Occupation',
            value: `${occupancyRate}%`,
            sublabel: 'des lots',
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

    // Interventions - Shows active + completed counts + progress bar
    cards.push({
        id: 'interventions',
        label: 'En cours',
        value: activeCount,
        sublabel: 'interventions',
        icon: Wrench,
        iconColor: 'text-blue-600',
        variant: 'default',
        progressBar: progressData
    })

    return cards
}
