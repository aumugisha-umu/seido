"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, CheckCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Period } from "@/components/ui/period-selector"

interface ProgressTrackerProps {
    interventions: Array<{
        id: string
        status: string
        created_at: string
    }>
    period: Period
    className?: string
}

interface ProgressData {
    completed: number
    total: number
    percentage: number
    label: string
    allFiltered: number  // Total interventions before excluding rejected/cancelled
}

/**
 * Calcule la progression des interventions sur une période donnée
 * - Exclut les interventions rejetées et annulées du total "valide"
 * - Compte comme "complétées" les interventions cloturées par n'importe qui
 * - Retourne `allFiltered` pour distinguer "aucune intervention" de "toutes traitées"
 */
const calculateProgress = (
    interventions: Array<{ status: string; created_at: string }>,
    period: Period
): ProgressData => {
    // 1. Filtrer par période
    const filtered = interventions.filter(i => {
        if (period.value === 'all' || !period.startDate) {
            return true
        }
        const createdAt = new Date(i.created_at)
        if (period.startDate && createdAt < period.startDate) {
            return false
        }
        if (period.endDate && createdAt > period.endDate) {
            return false
        }
        return true
    })

    // 2. Garder le compte total avant exclusion (pour distinguer "vide" de "toutes traitées")
    const allFiltered = filtered.length

    // 3. Exclure rejetées et annulées du total "valide"
    const validInterventions = filtered.filter(i =>
        !['rejetee', 'annulee'].includes(i.status)
    )

    // 4. Compter les complétées
    const completed = validInterventions.filter(i =>
        ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)
    )

    const total = validInterventions.length
    const completedCount = completed.length
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0

    return {
        completed: completedCount,
        total,
        percentage,
        label: getPeriodLabel(period),
        allFiltered
    }
}

/**
 * Convertit une période en libellé lisible
 */
const getPeriodLabel = (period: Period): string => {
    switch (period.value) {
        case '7d': return 'cette semaine'
        case '30d': return 'ce mois'
        case '90d': return 'ce trimestre'
        case 'all': return 'au total'
        default: return period.label?.toLowerCase() || ''
    }
}

/**
 * ProgressTracker - Compteur de progression des interventions
 *
 * Affiche une barre de progression avec 4 états visuels :
 * - Aucune intervention créée sur la période : Message neutre
 * - Toutes traitées (rejetées/annulées/clôturées) : Célébration
 * - 100% complétées (parmi les valides) : Célébration avec sparkles
 * - En cours (0-99%) : Barre gradient bleu→violet
 *
 * @example
 * <ProgressTracker
 *   interventions={interventions}
 *   period={{ value: '30d', label: '30 derniers jours' }}
 * />
 */
export function ProgressTracker({ interventions, period, className }: ProgressTrackerProps) {
    const { toast } = useToast()

    const { completed, total, percentage, label, allFiltered } = useMemo(
        () => calculateProgress(interventions, period),
        [interventions, period]
    )

    // Célébration au 100% (une seule fois par session)
    const [hasShownCelebration, setHasShownCelebration] = useState(false)

    useEffect(() => {
        if (percentage === 100 && total > 0 && !hasShownCelebration) {
            toast({
                title: "Toutes les interventions sont completes !",
                description: `Vous avez finalisé ${total} interventions ${label}.`,
                variant: "default",
                duration: 5000
            })
            setHasShownCelebration(true)
        }
    }, [percentage, hasShownCelebration, total, label, toast])

    // Reset celebration flag when period changes
    useEffect(() => {
        setHasShownCelebration(false)
    }, [period.value])

    // Cas 1: Aucune intervention créée sur la période
    if (allFiltered === 0) {
        return (
            <Card className={cn(
                "bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200",
                "dark:from-gray-950/20 dark:to-slate-950/20 dark:border-gray-700",
                className
            )}>
                <CardContent className="text-center py-6">
                    <Target className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Aucune intervention creee {label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Les nouvelles interventions apparaitront ici
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Cas 2: Toutes traitées (rejetées/annulées = total valide devient 0)
    if (total === 0 && allFiltered > 0) {
        return (
            <Card className={cn(
                "bg-gradient-to-br from-green-50 to-emerald-50 border-green-200",
                "dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-800",
                className
            )}>
                <CardContent className="text-center py-6">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Toutes les interventions ont ete traitees !
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {allFiltered} intervention{allFiltered > 1 ? 's' : ''} geree{allFiltered > 1 ? 's' : ''} {label}
                    </p>
                </CardContent>
            </Card>
        )
    }

    // Cas 3: 100% completees (parmi les valides en cours)
    if (percentage === 100) {
        return (
            <Card className={cn(
                "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 relative overflow-hidden",
                "dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-700",
                className
            )}>
                {/* Particules dorées en arrière-plan */}
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-2 left-4 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute top-4 right-8 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '150ms' }} />
                    <div className="absolute bottom-3 left-12 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '300ms' }} />
                    <div className="absolute top-6 right-16 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '450ms' }} />
                </div>

                <CardContent className="py-5">
                    <div className="text-center relative z-10">
                        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center justify-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                            Excellent travail !
                            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                            <span className="font-bold text-xl">{total}</span> interventions completees {label}
                        </p>
                        <div className="bg-green-500 h-2.5 rounded-full animate-pulse mx-auto max-w-md" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Cas 4: En cours (0-99%) - Layout horizontal compact
    return (
        <Card className={cn(
            "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200",
            "dark:from-blue-950/20 dark:to-purple-950/20 dark:border-blue-800",
            className
        )}>
            <CardContent className="py-3 px-4">
                <div className="flex items-center gap-4">
                    {/* Titre */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Progression {label}
                        </span>
                    </div>

                    {/* Barre de progression - flexible */}
                    <div className="flex-1 min-w-[100px]">
                        <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${percentage}%` }}
                                role="progressbar"
                                aria-valuenow={percentage}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${completed} interventions sur ${total} completees`}
                            />
                        </div>
                    </div>

                    {/* Compteur + Pourcentage */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                            {completed}/{total}
                        </span>
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {percentage}%
                        </span>
                        {percentage >= 75 && percentage < 100 && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 text-xs dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700">
                                Presque fini !
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
