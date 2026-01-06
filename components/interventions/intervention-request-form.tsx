'use client'

/**
 * Tenant Intervention Request Form
 * Client component for tenants to request interventions
 * Uses React Hook Form + Zod validation
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'

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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Server Action
import { createInterventionAction } from '@/app/actions/intervention-actions'

// Validation schema
const requestFormSchema = z.object({
  title: z.string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(255, 'Le titre est trop long'),
  description: z.string()
    .min(10, 'La description doit contenir au moins 10 caractères'),
  type: z.enum([
    'plomberie',
    'electricite',
    'chauffage',
    'serrurerie',
    'peinture',
    'menage',
    'jardinage',
    'autre'
  ]),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente']).default('normale'),
  requested_date: z.date().optional(),
  specific_location: z.string().optional()
})

type FormValues = z.infer<typeof requestFormSchema>

interface InterventionRequestFormProps {
  lot_id?: string
  building_id?: string
  team_id: string
  onSuccess?: (interventionId: string) => void
}

export function InterventionRequestForm({
  lot_id,
  building_id,
  team_id,
  onSuccess
}: InterventionRequestFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'autre',
      urgency: 'normale',
      specific_location: ''
    }
  })

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      // Prepare data for server action
      const interventionData = {
        ...values,
        lot_id,
        building_id,
        team_id,
        tenant_comment: values.description
      }

      // Call server action
      const result = await createInterventionAction(interventionData)

      if (result.success && result.data) {
        toast.success('Votre demande d\'intervention a été créée avec succès')

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(result.data.id)
        } else {
          // Redirect to dashboard
          router.push('/locataire/dashboard')
        }
      } else {
        toast.error(result.error || 'Erreur lors de la création de l\'intervention')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Une erreur inattendue s\'est produite')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Title field */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre de l'intervention</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Fuite d'eau dans la salle de bain"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Un titre court et descriptif de votre demande
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description détaillée</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez le problème en détail..."
                  className="min-h-[120px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Plus vous donnez de détails, mieux nous pourrons vous aider
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Type field */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catégorie d'intervention</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="plomberie">Plomberie</SelectItem>
                    <SelectItem value="electricite">Électricité</SelectItem>
                    <SelectItem value="chauffage">Chauffage</SelectItem>
                    <SelectItem value="serrurerie">Serrurerie</SelectItem>
                    <SelectItem value="peinture">Peinture</SelectItem>
                    <SelectItem value="menage">Ménage</SelectItem>
                    <SelectItem value="jardinage">Jardinage</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Urgency field */}
          <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Urgence</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez l'urgence" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="basse">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                        Basse
                      </span>
                    </SelectItem>
                    <SelectItem value="normale">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                        Normale
                      </span>
                    </SelectItem>
                    <SelectItem value="haute">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                        Haute
                      </span>
                    </SelectItem>
                    <SelectItem value="urgente">
                      <span className="flex items-center">
                        <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                        Urgente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Indiquez le niveau d'urgence de votre demande
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requested date field */}
          <FormField
            control={form.control}
            name="requested_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date souhaitée (optionnel)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'dd/MM/yyyy')
                        ) : (
                          <span>Choisir une date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Date à laquelle vous souhaiteriez l'intervention
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Specific location field */}
          <FormField
            control={form.control}
            name="specific_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Localisation précise (optionnel)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Salle de bain, chambre 2..."
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Précisez l'endroit exact si nécessaire
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 md:flex-none"
          >
            {isSubmitting ? 'Envoi en cours...' : 'Créer la demande'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Form>
  )
}