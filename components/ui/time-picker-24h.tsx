"use client"

import * as React from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimePicker24hProps {
    value: string
    onChange: (value: string) => void
    className?: string
    disabled?: boolean
}

export function TimePicker24h({ value, onChange, className, disabled }: TimePicker24hProps) {
    // Parse value "HH:mm"
    // If value is empty or invalid, default to empty strings
    const [hours, minutes] = React.useMemo(() => {
        if (!value || !value.includes(':')) return ['', '']
        return value.split(':')
    }, [value])

    const handleHourChange = (newHour: string) => {
        // If minutes is not set, default to '00'
        const newMinutes = minutes || '00'
        onChange(`${newHour}:${newMinutes}`)
    }

    const handleMinuteChange = (newMinute: string) => {
        // If hours is not set, default to '00' (midnight) or maybe current hour? 
        // '00' is safer as a default start.
        const newHours = hours || '00'
        onChange(`${newHours}:${newMinute}`)
    }

    // Generate options
    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
    // Using 5-minute intervals for better UX (00, 05, 10...) as typically exact minute precision isn't needed for interventions
    // If exact precision is needed, we can change length to 60 and remove the step
    const minuteOptions = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

    return (
        <div className={cn("flex items-center gap-1", className)}>
            <Select value={hours} onValueChange={handleHourChange} disabled={disabled}>
                <SelectTrigger className="w-[70px] focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="h-[200px]">
                    {hourOptions.map((h) => (
                        <SelectItem key={h} value={h}>
                            {h}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <span className="text-slate-500 font-medium">:</span>
            <Select value={minutes} onValueChange={handleMinuteChange} disabled={disabled}>
                <SelectTrigger className="w-[70px] focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="h-[200px]">
                    {minuteOptions.map((m) => (
                        <SelectItem key={m} value={m}>
                            {m}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
