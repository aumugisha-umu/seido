'use client'

/**
 * Time Slot Proposer Component
 * Allows providers to propose multiple time slots
 */

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Clock, Calendar, Send } from 'lucide-react'
import { format, addHours, setHours, setMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// Types
const timeSlotSchema = z.object({
  date: z.date({
    required_error: 'Date requise'
  }),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM requis'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format HH:MM requis'),
  notes: z.string().optional()
})

const formSchema = z.object({
  slots: z.array(timeSlotSchema).min(1, 'Au moins un créneau requis')
})

type FormValues = z.infer<typeof formSchema>

interface TimeSlotProposerProps {
  interventionId: string
  onSubmit?: (slots: Array<{
    date: string
    start_time: string
    end_time: string
    notes?: string
  }>) => Promise<void>
  onCancel?: () => void
}

// Generate time options (30-minute intervals)
const generateTimeOptions = () => {
  const options = []
  for (let hour = 7; hour <= 19; hour++) {
    for (let minute of [0, 30]) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      options.push(time)
    }
  }
  return options
}

const timeOptions = generateTimeOptions()

// Quick slot templates
const QUICK_SLOTS = [
  { label: 'Matin (9h-12h)', start: '09:00', end: '12:00' },
  { label: 'Après-midi (14h-17h)', start: '14:00', end: '17:00' },
  { label: 'Journée (9h-17h)', start: '09:00', end: '17:00' },
  { label: '2 heures', duration: 2 }
]

export function TimeSlotProposer({
  interventionId,
  onSubmit,
  onCancel
}: TimeSlotProposerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDates, setSelectedDates] = useState<Date[]>([])

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slots: [
        {
          date: new Date(),
          start_time: '09:00',
          end_time: '11:00',
          notes: ''
        }
      ]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'slots'
  })

  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      // Format slots for submission
      const formattedSlots = values.slots.map(slot => ({
        date: format(slot.date, 'yyyy-MM-dd'),
        start_time: slot.start_time,
        end_time: slot.end_time,
        notes: slot.notes
      }))

      if (onSubmit) {
        await onSubmit(formattedSlots)
      }

      toast.success(`${formattedSlots.length} créneau(x) proposé(s) avec succès`)
    } catch (error) {
      console.error('Error submitting slots:', error)
      toast.error('Erreur lors de la proposition des créneaux')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Apply quick slot template
  const applyQuickSlot = (index: number, template: typeof QUICK_SLOTS[0]) => {
    if ('duration' in template) {
      const startTime = form.getValues(`slots.${index}.start_time`)
      if (startTime) {
        const [hours, minutes] = startTime.split(':').map(Number)
        const endHours = hours + template.duration
        const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
        form.setValue(`slots.${index}.end_time`, endTime)
      }
    } else {
      form.setValue(`slots.${index}.start_time`, template.start)
      form.setValue(`slots.${index}.end_time`, template.end)
    }
  }

  // Bulk add slots for multiple dates
  const bulkAddSlots = () => {
    if (selectedDates.length === 0) {
      toast.error('Sélectionnez au moins une date')
      return
    }

    const currentSlots = form.getValues('slots')
    const templateSlot = currentSlots[0] || {
      start_time: '09:00',
      end_time: '11:00',
      notes: ''
    }

    selectedDates.forEach(date => {
      append({
        date,
        start_time: templateSlot.start_time,
        end_time: templateSlot.end_time,
        notes: ''
      })
    })

    setSelectedDates([])
    toast.success(`${selectedDates.length} créneaux ajoutés`)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Ajout rapide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <FormLabel>Sélectionner plusieurs dates</FormLabel>
              <CalendarComponent
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border mt-2"
              />
              {selectedDates.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {selectedDates.map((date, i) => (
                      <Badge key={i} variant="secondary">
                        {format(date, 'dd/MM', { locale: fr })}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={bulkAddSlots}
                  >
                    Ajouter {selectedDates.length} créneaux
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time slots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Créneaux proposés
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4">
                {index > 0 && <Separator />}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Date */}
                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`slots.${index}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                              onChange={(e) => {
                                if (e.target.value) {
                                  field.onChange(new Date(e.target.value))
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Start time */}
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`slots.${index}.start_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Début</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* End time */}
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`slots.${index}.end_time`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fin</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-3">
                    <FormField
                      control={form.control}
                      name={`slots.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Optionnel"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Quick templates */}
                  <div className="md:col-span-1 flex items-end">
                    <Select
                      onValueChange={(value) => {
                        const template = QUICK_SLOTS.find(t => t.label === value)
                        if (template) {
                          applyQuickSlot(index, template)
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <Clock className="w-4 h-4" />
                      </SelectTrigger>
                      <SelectContent>
                        {QUICK_SLOTS.map(template => (
                          <SelectItem key={template.label} value={template.label}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Delete button */}
                  <div className="md:col-span-1 flex items-end">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Duration display */}
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const start = form.watch(`slots.${index}.start_time`)
                    const end = form.watch(`slots.${index}.end_time`)
                    if (start && end) {
                      const [startH, startM] = start.split(':').map(Number)
                      const [endH, endM] = end.split(':').map(Number)
                      const duration = (endH * 60 + endM) - (startH * 60 + startM)
                      if (duration > 0) {
                        const hours = Math.floor(duration / 60)
                        const minutes = duration % 60
                        return `Durée: ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
                      }
                    }
                    return null
                  })()}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const lastSlot = form.getValues('slots').slice(-1)[0]
                append({
                  date: lastSlot ? lastSlot.date : new Date(),
                  start_time: lastSlot ? lastSlot.start_time : '09:00',
                  end_time: lastSlot ? lastSlot.end_time : '11:00',
                  notes: ''
                })
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un créneau
            </Button>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4 mr-2" />
              Proposer les créneaux
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  )
}