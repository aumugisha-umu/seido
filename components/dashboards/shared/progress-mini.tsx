"use client"

import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ProgressMiniProps {
    completed: number
    total: number
    percentage: number
    periodLabel?: string
    className?: string
}

/**
 * ProgressMini - Composant compact de progression pour intégration dans les KPI cards
 *
 * Affiche une barre de progression minimaliste avec 3 états visuels :
 * - Vide (total=0) : Message "Aucune intervention {période}"
 * - 100% : Célébration avec sparkles + barre verte pulsante
 * - 0-99% : Barre gradient bleu→violet avec compteur
 *
 * @example
 * <ProgressMini
 *   completed={6}
 *   total={68}
 *   percentage={9}
 *   periodLabel="ce mois"
 * />
 */
export function ProgressMini({
    completed,
    total,
    percentage,
    periodLabel = "ce mois",
    className
}: ProgressMiniProps) {
    // Cas vide - aucune intervention sur la période
    if (total === 0) {
        return (
            <span className={cn("text-xs text-muted-foreground", className)}>
                Aucune intervention {periodLabel}
            </span>
        )
    }

    // Cas 100% - célébration subtile
    if (percentage === 100) {
        return (
            <div className={cn("flex flex-col gap-1 w-full", className)}>
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 animate-pulse text-yellow-500" />
                    {total} terminée{total > 1 ? 's' : ''} {periodLabel}
                </span>
                <div className="h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
        )
    }

    // Cas normal (0-99%) - barre de progression
    return (
        <div className={cn("flex flex-col gap-1 w-full", className)}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{completed}/{total} {periodLabel}</span>
                <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {percentage}%
                </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${completed} interventions sur ${total} complétées`}
                />
            </div>
        </div>
    )
}
