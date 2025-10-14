'use client'

/**
 * Quote Form Component
 * Allows providers to create quotes with line items
 */

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Calculator, Save, Send } from 'lucide-react'

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// Types
const lineItemSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(1, 'Quantité minimum: 1'),
  unit_price: z.number().min(0, 'Prix unitaire minimum: 0'),
  total: z.number()
})

const quoteFormSchema = z.object({
  quote_type: z.enum(['estimation', 'final']),
  description: z.string().optional(),
  valid_until: z.string().optional(),
  line_items: z.array(lineItemSchema).min(1, 'Au moins un article requis'),
  subtotal: z.number(),
  tax_rate: z.number().min(0).max(100),
  tax_amount: z.number(),
  total: z.number()
})

type FormValues = z.infer<typeof quoteFormSchema>

interface QuoteFormProps {
  interventionId: string
  providerId: string
  onSubmit?: (data: FormValues) => Promise<void>
  onCancel?: () => void
}

export function QuoteForm({
  interventionId,
  providerId,
  onSubmit,
  onCancel
}: QuoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDraft, setIsDraft] = useState(true)

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      quote_type: 'estimation',
      description: '',
      line_items: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0
        }
      ],
      subtotal: 0,
      tax_rate: 20,
      tax_amount: 0,
      total: 0
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'line_items'
  })

  // Calculate totals
  const calculateTotals = () => {
    const lineItems = form.getValues('line_items')
    const subtotal = lineItems.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price
      return sum + itemTotal
    }, 0)

    const taxRate = form.getValues('tax_rate')
    const taxAmount = (subtotal * taxRate) / 100
    const total = subtotal + taxAmount

    // Update form values
    form.setValue('subtotal', subtotal)
    form.setValue('tax_amount', taxAmount)
    form.setValue('total', total)

    // Update line item totals
    lineItems.forEach((item, index) => {
      const itemTotal = item.quantity * item.unit_price
      form.setValue(`line_items.${index}.total`, itemTotal)
    })
  }

  // Watch for changes in line items
  const watchLineItems = form.watch('line_items')
  const watchTaxRate = form.watch('tax_rate')

  // Recalculate on changes
  useState(() => {
    calculateTotals()
  })

  // Handle form submission
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true)

    try {
      if (onSubmit) {
        await onSubmit({
          ...values,
          // Add metadata for draft/sent status
          metadata: { isDraft }
        } as any)
      }

      toast.success(
        isDraft
          ? 'Devis enregistré en brouillon'
          : 'Devis envoyé au gestionnaire'
      )
    } catch (error) {
      console.error('Error submitting quote:', error)
      toast.error('Erreur lors de l\'enregistrement du devis')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nouveau devis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quote type */}
            <FormField
              control={form.control}
              name="quote_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de devis</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="estimation">Estimation</SelectItem>
                      <SelectItem value="final">Devis final</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optionnel)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes ou conditions particulières..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Valid until */}
            <FormField
              control={form.control}
              name="valid_until"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valide jusqu'au (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Date limite de validité du devis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader>
            <CardTitle>Articles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="space-y-4">
                {index > 0 && <Separator />}
                <div className="grid grid-cols-12 gap-4">
                  {/* Description */}
                  <div className="col-span-12 md:col-span-5">
                    <FormField
                      control={form.control}
                      name={`line_items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: Main d'œuvre plomberie"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`line_items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantité</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0)
                                calculateTotals()
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Unit price */}
                  <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name={`line_items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix unitaire (€)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0)
                                calculateTotals()
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-3 md:col-span-2">
                    <FormLabel>Total (€)</FormLabel>
                    <div className="flex items-center h-10 px-3 py-2 text-sm bg-muted rounded-md">
                      {form.watch(`line_items.${index}.total`).toFixed(2)}
                    </div>
                  </div>

                  {/* Delete button */}
                  <div className="col-span-1 flex items-end">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          remove(index)
                          calculateTotals()
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                append({
                  description: '',
                  quantity: 1,
                  unit_price: 0,
                  total: 0
                })
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un article
            </Button>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Totaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Sous-total HT</span>
                <span className="font-medium">
                  {form.watch('subtotal').toFixed(2)} €
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>TVA</span>
                  <FormField
                    control={form.control}
                    name="tax_rate"
                    render={({ field }) => (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-20 h-8"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0)
                          calculateTotals()
                        }}
                      />
                    )}
                  />
                  <span>%</span>
                </div>
                <span className="font-medium">
                  {form.watch('tax_amount').toFixed(2)} €
                </span>
              </div>

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total TTC</span>
                <span>{form.watch('total').toFixed(2)} €</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => setIsDraft(true)}
              variant="outline"
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer en brouillon
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={() => setIsDraft(false)}
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer au gestionnaire
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