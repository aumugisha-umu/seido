"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string // Format HH:MM
  onChange?: (time: string) => void
  disabled?: boolean
  className?: string
}

export function TimePicker({
  value = "09:00",
  onChange,
  disabled = false,
  className
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse current value
  const [hours, minutes] = value.split(':').map(v => parseInt(v) || 0)

  const handleHourChange = (hour: number) => {
    const newTime = `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    onChange?.(newTime)
  }

  const handleMinuteChange = (minute: number) => {
    const newTime = `${String(hours).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    onChange?.(newTime)
    setOpen(false)
  }

  // Generate hours (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i)

  // Generate minutes (0-59 par intervalles de 1)
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start font-normal",
            className
          )}
        >
          <span className="mr-2">{value}</span>
          <Clock className="h-4 w-4 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Hours column */}
          <div className="border-r">
            <div className="p-2 border-b bg-slate-50 text-center text-xs font-semibold text-slate-700">
              Heures
            </div>
            <div className="h-[200px] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col">
                {hourOptions.map((hour) => (
                  <button
                    key={hour}
                    onClick={() => handleHourChange(hour)}
                    className={cn(
                      "w-14 px-3 py-2 text-sm hover:bg-slate-100 transition-colors text-center block",
                      hour === hours && "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Minutes column */}
          <div>
            <div className="p-2 border-b bg-slate-50 text-center text-xs font-semibold text-slate-700">
              Minutes
            </div>
            <div className="h-[200px] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col">
                {minuteOptions.map((minute) => (
                  <button
                    key={minute}
                    onClick={() => handleMinuteChange(minute)}
                    className={cn(
                      "w-14 px-3 py-2 text-sm hover:bg-slate-100 transition-colors text-center block",
                      minute === minutes && "bg-blue-500 text-white hover:bg-blue-600"
                    )}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
