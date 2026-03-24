"use client"

import React from "react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"
import { ProgressMini } from "./progress-mini"
import {
    AlertTriangle,
    Building2,
    Users,
    FileText,
    Wrench,
    Bell,
    ChevronRight
} from "lucide-react"
import type { ContractStats } from "@/lib/types/contract.types"
import type { ReminderStats } from "@/lib/types/reminder.types"

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

// ============================================================================
// STYLES
// ============================================================================

const badgeStyles = {
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
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
    reminders: 'Rappels',
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
                        aria-label={card.onClick ? `${card.label}: ${card.value}` : undefined}
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
                        <span className="text-xs text-muted-foreground leading-tight mt-0.5 truncate max-w-full">
                            {stripLabels[card.id] || card.label}
                        </span>
                        {card.badge && (
                            <span className={cn(
                                "text-xs font-medium px-1 rounded-full leading-tight mt-0.5",
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
    /** Reminder stats for mobile strip */
    reminderStats?: ReminderStats
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
    progressData,
    reminderStats
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

    // Rappels - Shows due today count with badge for overdue
    if (reminderStats && (reminderStats.due_today > 0 || reminderStats.overdue > 0 || reminderStats.en_cours > 0 || reminderStats.en_attente > 0)) {
        cards.push({
            id: 'reminders',
            label: 'Rappels',
            value: reminderStats.due_today,
            sublabel: "aujourd'hui",
            icon: Bell,
            iconColor: reminderStats.overdue > 0 ? 'text-red-500' : 'text-amber-500',
            variant: reminderStats.overdue > 0 ? 'warning' : 'default',
            badge: reminderStats.en_attente > 0 ? {
                text: `${reminderStats.en_attente} en attente`,
                variant: 'warning' as const
            } : undefined
        })
    }

    return cards
}
