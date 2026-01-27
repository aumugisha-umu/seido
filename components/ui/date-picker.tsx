"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
    value?: string // ISO date string (YYYY-MM-DD)
    onChange: (value: string) => void
    className?: string
    disabled?: boolean
    placeholder?: string
    minDate?: string // ISO date string (YYYY-MM-DD)
    maxDate?: string // ISO date string (YYYY-MM-DD)
}

/**
 * Parse une chaîne de date ISO (YYYY-MM-DD) en Date locale.
 *
 * ⚠️ IMPORTANT: new Date("2026-01-01") interprète la date comme UTC minuit,
 * ce qui en France (UTC+1) devient le 31 décembre à 23h = décalage d'1 jour.
 *
 * Cette fonction parse explicitement les composants pour créer une date locale.
 */
const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day) // month est 0-indexé en JS
}

/**
 * Formate une Date en chaîne ISO (YYYY-MM-DD) sans conversion timezone.
 */
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function DatePicker({
    value,
    onChange,
    className,
    disabled,
    placeholder = "Sélectionner une date",
    minDate,
    maxDate,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    // Convert string to Date object (local, sans décalage timezone)
    const selectedDate = value ? parseLocalDate(value) : undefined

    const handleSelect = (date: Date | undefined) => {
        if (date) {
            // Convert Date to ISO string (YYYY-MM-DD) sans passer par UTC
            const isoString = formatLocalDate(date)
            onChange(isoString)
            setOpen(false)
        }
    }

    // Convert min/max dates to Date objects (local)
    const minDateObj = minDate ? parseLocalDate(minDate) : undefined
    const maxDateObj = maxDate ? parseLocalDate(maxDate) : undefined

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "justify-start text-left font-normal h-10",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {value ? (
                        format(selectedDate!, "dd/MM/yyyy", { locale: fr })
                    ) : (
                        <span>{placeholder}</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleSelect}
                    disabled={(date) => {
                        if (minDateObj && date < minDateObj) return true
                        if (maxDateObj && date > maxDateObj) return true
                        return false
                    }}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}
