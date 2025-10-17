"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateTimePickerProps {
  // Mode du picker
  mode?: "date" | "time" | "datetime" | "timerange"

  // Valeurs
  dateValue?: string // Format YYYY-MM-DD
  timeValue?: string // Format HH:MM
  endTimeValue?: string // Format HH:MM (pour timerange)

  // Callbacks
  onDateChange?: (date: string) => void
  onTimeChange?: (time: string) => void
  onEndTimeChange?: (time: string) => void

  // Labels et placeholder
  dateLabel?: string
  timeLabel?: string
  endTimeLabel?: string
  datePlaceholder?: string
  timePlaceholder?: string

  // Validation
  required?: boolean
  minDate?: string // Format YYYY-MM-DD
  disabled?: boolean

  // Styling
  className?: string
}

export function DateTimePicker({
  mode = "datetime",
  dateValue = "",
  timeValue = "",
  endTimeValue = "",
  onDateChange,
  onTimeChange,
  onEndTimeChange,
  dateLabel = "Date",
  timeLabel = "Heure",
  endTimeLabel = "Fin",
  datePlaceholder = "Sélectionner une date",
  timePlaceholder = "10:30:00",
  required = false,
  minDate,
  disabled = false,
  className
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    dateValue ? new Date(dateValue) : undefined
  )

  // Sync external dateValue changes with internal state
  React.useEffect(() => {
    if (dateValue) {
      setSelectedDate(new Date(dateValue))
    } else {
      setSelectedDate(undefined)
    }
  }, [dateValue])

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date)
    setOpen(false)

    if (date && onDateChange) {
      // Format to YYYY-MM-DD
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onDateChange(`${year}-${month}-${day}`)
    } else if (!date && onDateChange) {
      onDateChange("")
    }
  }

  const handleTimeChange = (time: string) => {
    if (onTimeChange) {
      onTimeChange(time)
    }
  }

  const handleEndTimeChange = (time: string) => {
    if (onEndTimeChange) {
      onEndTimeChange(time)
    }
  }

  const minDateObj = minDate ? new Date(minDate) : undefined

  const showDate = mode === "date" || mode === "datetime" || mode === "timerange"
  const showTime = mode === "time" || mode === "datetime" || mode === "timerange"
  const showEndTime = mode === "timerange"

  return (
    <div className={cn("flex gap-4", className)}>
      {showDate && (
        <div className="flex flex-col gap-3 flex-1">
          <Label htmlFor="date-picker" className="px-1">
            {dateLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date-picker"
                disabled={disabled}
                className={cn(
                  "justify-between font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                {selectedDate ? selectedDate.toLocaleDateString('fr-FR') : datePlaceholder}
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                captionLayout="dropdown"
                onSelect={handleDateSelect}
                disabled={minDateObj ? { before: minDateObj } : undefined}
                fromYear={2024}
                toYear={2030}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {showTime && (
        <div className="flex flex-col gap-3 flex-1">
          <Label htmlFor="time-picker" className="px-1">
            {timeLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <TimePicker
            value={timeValue}
            onChange={handleTimeChange}
            disabled={disabled}
            className="w-full"
          />
        </div>
      )}

      {showEndTime && (
        <div className="flex flex-col gap-3 flex-1">
          <Label htmlFor="end-time-picker" className="px-1">
            {endTimeLabel}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <TimePicker
            value={endTimeValue}
            onChange={handleEndTimeChange}
            disabled={disabled}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}
