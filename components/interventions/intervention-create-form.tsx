'use client'

/**
 * Manager Intervention Create Form
 * Enhanced form for managers with additional fields and capabilities
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CalendarIcon, Plus, X, Users } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

// Server Actions
import {
  createInterventionAction,
  assignUserAction
} from '@/app/actions/intervention-actions'

// Types
import type { Database } from '@/lib/database.types'

type UserRole = Database['public']['Enums']['user_role']
type InterventionStatus = Database['public']['Enums']['intervention_status']

// Validation schema
const managerFormSchema = z.object({
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
  status: z.enum([
    'demande',
    'approuvee',
    'demande_de_devis',
    'planification'
  ] as const).default('demande'),
  requested_date: z.date().optional(),
  scheduled_date: z.date().optional(),
  specific_location: z.string().optional(),
  estimated_cost: z.number().positive().optional(),
  // manager_comment removed - use intervention_comments table instead
  assigned_managers: z.array(z.string()).optional(),
  assigned_providers: z.array(z.string()).optional()
})

type FormValues = z.infer<typeof managerFormSchema>

interface UserOption {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url?: string
}

interface InterventionCreateFormProps {
  lot_id?: string
  building_id?: string
  team_id: string
  tenant_id?: string
  availableUsers?: UserOption[]
  onSuccess?: (interventionId: string) => void
}

export function InterventionCreateForm({
  lot_id,
  building_id,
  team_id,
  tenant_id,
  availableUsers = [],
  onSuccess
}: InterventionCreateFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedManagers, setSelectedManagers] = useState<string[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])

  // Filter users by role
  const managers = availableUsers.filter(u => u.role === 'gestionnaire')
  const providers = availableUsers.filter(u => u.role === 'prestataire')

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(managerFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'autre',
      urgency: 'normale',
      status: 'demande',
      specific_location: '',
      // manager_comment: '', // Removed - use intervention_comments table
      assigned_managers: [],
      assigned_providers: []
    }
  })

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      // Prepare data for server action
      const interventionData = {
        title: values.title,
        description: values.description,
        type: values.type,
        urgency: values.urgency,
        lot_id,
        building_id,
        team_id,
        tenant_id,
        specific_location: values.specific_location,
        // manager_comment: values.manager_comment, // Removed - use intervention_comments table
        estimated_cost: values.estimated_cost,
        requested_date: values.requested_date?.toISOString(),
        scheduled_date: values.scheduled_date?.toISOString()
      }

      // Create intervention
      const result = await createInterventionAction(interventionData)

      if (result.success && result.data) {
        const interventionId = result.data.id

        // Assign managers and providers if selected
        const assignmentPromises = []

        if (selectedManagers.length > 0) {
          for (const managerId of selectedManagers) {
            assignmentPromises.push(
              assignUserAction(interventionId, managerId, 'gestionnaire')
            )
          }
        }

        if (selectedProviders.length > 0) {
          for (const providerId of selectedProviders) {
            assignmentPromises.push(
              assignUserAction(interventionId, providerId, 'prestataire')
            )
          }
        }

        // Wait for all assignments
        if (assignmentPromises.length > 0) {
          await Promise.all(assignmentPromises)
        }

        toast.success('Intervention créée avec succès')

        // Call success callback or redirect
        if (onSuccess) {
          onSuccess(interventionId)
        } else {
          router.push(`/gestionnaire/interventions/${interventionId}`)
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

  // Helper to toggle user selection
  const toggleUserSelection = (
    userId: string,
    list: string[],
    setter: (users: string[]) => void
  ) => {
    if (list.includes(userId)) {
      setter(list.filter(id => id !== userId))
    } else {
      setter([...list, userId])
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de l'intervention</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Réparation urgente de plomberie"
                      {...field}
                    />
                  </FormControl>
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
                      placeholder="Décrivez l'intervention en détail..."
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type field */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Type d'intervention" />
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
                          <SelectValue placeholder="Niveau d'urgence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="basse">Basse</SelectItem>
                        <SelectItem value="normale">Normale</SelectItem>
                        <SelectItem value="haute">Haute</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Initial status field */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut initial</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="demande">Demande</SelectItem>
                        <SelectItem value="approuvee">Approuvée</SelectItem>
                        <SelectItem value="demande_de_devis">
                          Demande de devis
                        </SelectItem>
                        <SelectItem value="planification">
                          Planification
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails supplémentaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Requested date */}
              <FormField
                control={form.control}
                name="requested_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date souhaitée</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scheduled date */}
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date planifiée</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Specific location */}
              <FormField
                control={form.control}
                name="specific_location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation précise</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Salle de bain, 2ème étage..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated cost */}
              <FormField
                control={form.control}
                name="estimated_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coût estimé (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value)
                          field.onChange(isNaN(value) ? undefined : value)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Manager comment - REMOVED: Now using intervention_comments table
            <FormField
              control={form.control}
              name="manager_comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire gestionnaire</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes internes pour l'équipe de gestion..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Ce commentaire ne sera visible que par les gestionnaires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}
          </CardContent>
        </Card>

        {/* User assignments */}
        {(managers.length > 0 || providers.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>
                <Users className="inline w-4 h-4 mr-2" />
                Affectations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assign managers */}
              {managers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Gestionnaires
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {managers.map((manager) => (
                      <Badge
                        key={manager.id}
                        variant={
                          selectedManagers.includes(manager.id)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          toggleUserSelection(
                            manager.id,
                            selectedManagers,
                            setSelectedManagers
                          )
                        }
                      >
                        {selectedManagers.includes(manager.id) && (
                          <X className="w-3 h-3 mr-1" />
                        )}
                        {manager.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Assign providers */}
              {providers.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Prestataires
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {providers.map((provider) => (
                      <Badge
                        key={provider.id}
                        variant={
                          selectedProviders.includes(provider.id)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() =>
                          toggleUserSelection(
                            provider.id,
                            selectedProviders,
                            setSelectedProviders
                          )
                        }
                      >
                        {selectedProviders.includes(provider.id) && (
                          <X className="w-3 h-3 mr-1" />
                        )}
                        {provider.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Création en cours...' : 'Créer l\'intervention'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
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