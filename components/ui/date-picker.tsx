"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
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
export const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day) // month est 0-indexé en JS
}

/**
 * Formate une Date en chaîne ISO (YYYY-MM-DD) sans conversion timezone.
 */
export const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Parse une chaîne dd/MM/yyyy en Date locale, ou null si invalide.
 */
const parseFrenchDate = (input: string): Date | null => {
    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!match) return null
    const day = parseInt(match[1], 10)
    const month = parseInt(match[2], 10)
    const year = parseInt(match[3], 10)
    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null
    const date = new Date(year, month - 1, day)
    // Verify the date is valid (e.g., 31/02/2026 would roll over)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) return null
    return date
}

/**
 * Apply input mask for dd/MM/yyyy: auto-insert slashes after day and month.
 */
const applyDateMask = (raw: string): string => {
    // Keep only digits
    const digits = raw.replace(/\D/g, '')
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

export function DatePicker({
    value,
    onChange,
    className,
    disabled,
    placeholder = "jj/mm/aaaa",
    minDate,
    maxDate,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState('')
    const [hasError, setHasError] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    // Convert string to Date object (local, sans décalage timezone)
    const selectedDate = value ? parseLocalDate(value) : undefined

    // Sync inputValue when value prop changes (from calendar selection or parent)
    React.useEffect(() => {
        if (selectedDate) {
            setInputValue(format(selectedDate, "dd/MM/yyyy", { locale: fr }))
            setHasError(false)
        } else {
            setInputValue('')
            setHasError(false)
        }
    }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

    // Convert min/max dates to Date objects (local)
    const minDateObj = minDate ? parseLocalDate(minDate) : undefined
    const maxDateObj = maxDate ? parseLocalDate(maxDate) : undefined

    const isDateInRange = (date: Date): boolean => {
        if (minDateObj && date < minDateObj) return false
        if (maxDateObj && date > maxDateObj) return false
        return true
    }

    const handleCalendarSelect = (date: Date | undefined) => {
        if (date) {
            const isoString = formatLocalDate(date)
            onChange(isoString)
            setOpen(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const masked = applyDateMask(e.target.value)
        setInputValue(masked)

        // Try to parse when we have a full date string
        if (masked.length === 10) {
            const parsed = parseFrenchDate(masked)
            if (parsed && isDateInRange(parsed)) {
                setHasError(false)
                onChange(formatLocalDate(parsed))
            } else {
                setHasError(true)
            }
        } else {
            setHasError(false)
        }
    }

    const handleInputBlur = () => {
        // On blur, if input is incomplete or invalid, revert to current value
        if (inputValue.length > 0 && inputValue.length < 10) {
            if (selectedDate) {
                setInputValue(format(selectedDate, "dd/MM/yyyy", { locale: fr }))
            } else {
                setInputValue('')
            }
            setHasError(false)
        } else if (inputValue.length === 10) {
            const parsed = parseFrenchDate(inputValue)
            if (!parsed || !isDateInRange(parsed)) {
                if (selectedDate) {
                    setInputValue(format(selectedDate, "dd/MM/yyyy", { locale: fr }))
                } else {
                    setInputValue('')
                }
                setHasError(false)
            }
        }
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            inputRef.current?.blur()
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className={cn("relative flex items-center", className)}>
                <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyDown={handleInputKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    maxLength={10}
                    className={cn(
                        "flex h-10 w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm",
                        "ring-offset-background placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        hasError
                            ? "border-destructive focus-visible:ring-destructive"
                            : "border-input"
                    )}
                />
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        disabled={disabled}
                        className={cn(
                            "absolute right-0 h-10 px-3 flex items-center justify-center",
                            "text-muted-foreground hover:text-foreground transition-colors",
                            "disabled:cursor-not-allowed disabled:opacity-50"
                        )}
                        aria-label="Ouvrir le calendrier"
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </button>
                </PopoverTrigger>
            </div>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleCalendarSelect}
                    defaultMonth={selectedDate}
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
