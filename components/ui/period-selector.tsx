"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// ============================================================================
// TYPES
// ============================================================================

export type PeriodValue = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom'

export interface Period {
    value: PeriodValue
    label: string
    startDate: Date | null
    endDate: Date | null
}

interface PeriodSelectorProps {
    value: PeriodValue
    onChange: (period: Period) => void
    className?: string
    /** Show compact version */
    compact?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PERIOD_OPTIONS: { value: PeriodValue; label: string; shortLabel: string }[] = [
    { value: 'today', label: "Aujourd'hui", shortLabel: "Auj." },
    { value: '7d', label: '7 derniers jours', shortLabel: '7j' },
    { value: '30d', label: '30 derniers jours', shortLabel: '30j' },
    { value: '90d', label: '90 derniers jours', shortLabel: '90j' },
    { value: 'all', label: 'Tout', shortLabel: 'Tout' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPeriodDates(value: PeriodValue): { startDate: Date | null; endDate: Date | null } {
    const now = new Date()
    const endDate = new Date(now)
    endDate.setHours(23, 59, 59, 999)

    let startDate: Date | null = null

    switch (value) {
        case 'today':
            startDate = new Date(now)
            startDate.setHours(0, 0, 0, 0)
            break
        case '7d':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 7)
            startDate.setHours(0, 0, 0, 0)
            break
        case '30d':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 30)
            startDate.setHours(0, 0, 0, 0)
            break
        case '90d':
            startDate = new Date(now)
            startDate.setDate(startDate.getDate() - 90)
            startDate.setHours(0, 0, 0, 0)
            break
        case 'all':
            startDate = null
            break
        case 'custom':
            // Custom dates handled separately
            startDate = null
            break
    }

    return {
        startDate,
        endDate: value === 'all' ? null : endDate
    }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PeriodSelector({
    value,
    onChange,
    className,
    compact = false
}: PeriodSelectorProps) {
    const handleChange = (newValue: PeriodValue) => {
        const dates = getPeriodDates(newValue)
        onChange({
            value: newValue,
            label: PERIOD_OPTIONS.find(o => o.value === newValue)?.label || newValue,
            ...dates
        })
    }

    const selectedOption = PERIOD_OPTIONS.find(o => o.value === value)

    if (compact) {
        // Compact button group for mobile with label
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Période :</span>
                <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
                    {PERIOD_OPTIONS.slice(0, 4).map(option => (
                        <Button
                            key={option.value}
                            variant={value === option.value ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => handleChange(option.value)}
                            className={cn(
                                "h-7 px-2 text-xs rounded-md",
                                value === option.value && "shadow-sm"
                            )}
                        >
                            {option.shortLabel}
                        </Button>
                    ))}
                </div>
            </div>
        )
    }

    // Full select for desktop
    return (
        <Select value={value} onValueChange={(v) => handleChange(v as PeriodValue)}>
            <SelectTrigger className={cn("w-[180px] rounded-xl bg-white border-input", className)}>
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Période">
                    {selectedOption?.label}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {PERIOD_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// ============================================================================
// HOOK FOR FILTERING DATA BY PERIOD
// ============================================================================

interface UsePeriodFilterOptions<T> {
    data: T[]
    dateField: keyof T
    period: Period | null
}

/**
 * Hook to filter data by period.
 *
 * @example
 * ```tsx
 * const [period, setPeriod] = useState<Period>({
 *   value: '30d',
 *   label: '30 derniers jours',
 *   ...getPeriodDates('30d')
 * })
 *
 * const filteredInterventions = usePeriodFilter({
 *   data: interventions,
 *   dateField: 'created_at',
 *   period
 * })
 * ```
 */
export function usePeriodFilter<T>({
    data,
    dateField,
    period
}: UsePeriodFilterOptions<T>): T[] {
    return useMemo(() => {
        if (!period || period.value === 'all') {
            return data
        }

        return data.filter(item => {
            const itemDate = new Date(item[dateField] as unknown as string)

            if (period.startDate && itemDate < period.startDate) {
                return false
            }

            if (period.endDate && itemDate > period.endDate) {
                return false
            }

            return true
        })
    }, [data, dateField, period])
}

// ============================================================================
// UTILITY TO GET DEFAULT PERIOD
// ============================================================================

export function getDefaultPeriod(value: PeriodValue = '30d'): Period {
    const option = PERIOD_OPTIONS.find(o => o.value === value)
    return {
        value,
        label: option?.label || value,
        ...getPeriodDates(value)
    }
}
