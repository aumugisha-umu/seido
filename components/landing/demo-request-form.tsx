'use client'

/**
 * DemoRequestForm - Formulaire de demande de demo reutilisable
 *
 * Architecture BEM:
 * - Block: demo-form
 * - Elements: __row, __field, __label, __input, __textarea, __submit
 * - Modifiers: --half, --full
 *
 * @example
 * // Dans une modale
 * <DemoRequestForm variant="modal" onSuccess={() => closeModal()} />
 *
 * // En section inline
 * <DemoRequestForm variant="inline" />
 */

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface DemoFormData {
  name: string
  email: string
  phone?: string
  company?: string
  lotsCount: string
  message: string
}

export interface DemoRequestFormProps {
  /** Style adapte au contexte */
  variant?: 'modal' | 'inline'
  /** Callback avec les donnees du formulaire */
  onSubmit?: (data: DemoFormData) => void | Promise<void>
  /** Callback appele apres soumission reussie */
  onSuccess?: () => void
  /** Classes CSS additionnelles */
  className?: string
}

// ============================================================================
// Styles BEM (Tailwind)
// ============================================================================

const styles = {
  // Block
  form: 'space-y-4',

  // Elements
  row: 'flex flex-col md:flex-row gap-4',
  field: 'flex-1 min-w-0 space-y-1.5',
  label: 'text-white text-sm font-medium',
  input: cn(
    'bg-white/10 border-white/20 text-white',
    'placeholder:text-white/40',
    'focus:bg-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    'transition-colors w-full'
  ),
  textarea: cn(
    'bg-white/10 border-white/20 text-white',
    'placeholder:text-white/40',
    'focus:bg-white/20 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
    'transition-colors w-full resize-none'
  ),
  submit: cn(
    'w-full mt-2',
    'bg-gradient-to-r from-blue-600 to-blue-500',
    'hover:from-blue-500 hover:to-blue-400',
    'transition-all hover:scale-[1.02]'
  ),

  // Modifiers
  fieldHalf: 'md:flex-1',
  fieldFull: 'w-full',
}

// ============================================================================
// Validation
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldValidation {
  fieldId: string
  name: string
  required: boolean
  validate?: (value: string) => string | null
}

const FIELD_VALIDATIONS: FieldValidation[] = [
  { fieldId: 'demo-name', name: 'name', required: true },
  {
    fieldId: 'demo-email',
    name: 'email',
    required: true,
    validate: (value: string) => {
      if (value && !EMAIL_REGEX.test(value)) return 'Adresse email invalide'
      return null
    },
  },
  { fieldId: 'demo-message', name: 'message', required: true },
]

const validateField = (name: string, value: string): string | null => {
  const config = FIELD_VALIDATIONS.find(f => f.name === name)
  if (!config) return null
  if (config.required && !value.trim()) return 'Ce champ est requis'
  if (config.validate) return config.validate(value)
  return null
}

// ============================================================================
// Component
// ============================================================================

export function DemoRequestForm({
  variant = 'modal',
  onSubmit,
  onSuccess,
  className
}: DemoRequestFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const error = validateField(name, value)
    setFieldErrors(prev => {
      if (error) return { ...prev, [name]: error }
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data: DemoFormData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || undefined,
        company: (formData.get('company') as string) || undefined,
        lotsCount: formData.get('lotsCount') as string,
        message: formData.get('message') as string,
      }

      // Validate all required fields
      const errors: Record<string, string> = {}
      for (const field of FIELD_VALIDATIONS) {
        const value = (formData.get(field.name) as string) || ''
        const error = validateField(field.name, value)
        if (error) errors[field.name] = error
      }

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        // Focus first invalid field
        const firstErrorField = FIELD_VALIDATIONS.find(f => errors[f.name])
        if (firstErrorField) {
          document.getElementById(firstErrorField.fieldId)?.focus()
        }
        setIsSubmitting(false)
        return
      }

      if (onSubmit) {
        await onSubmit(data)
      } else {
        const res = await fetch('/api/demo-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!res.ok) {
          throw new Error('API error')
        }
      }

      toast.success('Merci ! Notre equipe vous contactera sous 24h.')
      form.reset()
      setFieldErrors({})
      onSuccess?.()
    } catch (_error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      className={cn(styles.form, className)}
      onSubmit={handleSubmit}
    >
      {/* Ligne 1: Nom complet (full) */}
      <div className={styles.row}>
        <div className={cn(styles.field, styles.fieldFull)}>
          <Label htmlFor="demo-name" className={styles.label}>
            Nom *
          </Label>
          <Input
            id="demo-name"
            name="name"
            placeholder="Jean Dupont"
            required
            className={styles.input}
            onBlur={handleBlur}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'demo-name-error' : undefined}
          />
          {fieldErrors.name && (
            <p id="demo-name-error" className="text-sm text-destructive mt-1">{fieldErrors.name}</p>
          )}
        </div>
      </div>

      {/* Ligne 2: Societe + Nombre de biens geres (half + half) */}
      <div className={styles.row}>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label htmlFor="demo-company" className={styles.label}>
            Societe (optionnel)
          </Label>
          <Input
            id="demo-company"
            name="company"
            placeholder="Nom de votre agence"
            className={styles.input}
          />
        </div>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label id="label-lotsCount" className={styles.label}>
            Patrimoine en gestion *
          </Label>
          <Select name="lotsCount" required aria-labelledby="label-lotsCount">
            <SelectTrigger className={styles.input} aria-labelledby="label-lotsCount">
              <SelectValue placeholder="Selectionner" />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-white/20 text-white">
              <SelectItem value="1-10" className="text-white focus:bg-white/10 focus:text-white">1 - 10 lots</SelectItem>
              <SelectItem value="11-50" className="text-white focus:bg-white/10 focus:text-white">11 - 50 lots</SelectItem>
              <SelectItem value="51-200" className="text-white focus:bg-white/10 focus:text-white">51 - 200 lots</SelectItem>
              <SelectItem value="201-500" className="text-white focus:bg-white/10 focus:text-white">201 - 500 lots</SelectItem>
              <SelectItem value="501-1000" className="text-white focus:bg-white/10 focus:text-white">501 - 1 000 lots</SelectItem>
              <SelectItem value="1001-5000" className="text-white focus:bg-white/10 focus:text-white">1 001 - 5 000 lots</SelectItem>
              <SelectItem value="5001-10000" className="text-white focus:bg-white/10 focus:text-white">5 001 - 10 000 lots</SelectItem>
              <SelectItem value="10000+" className="text-white focus:bg-white/10 focus:text-white">10 000+ lots</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ligne 3: Email + Telephone (half + half) */}
      <div className={styles.row}>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label htmlFor="demo-email" className={styles.label}>
            Email professionnel *
          </Label>
          <Input
            id="demo-email"
            name="email"
            type="email"
            placeholder="jean@exemple.com"
            required
            className={styles.input}
            onBlur={handleBlur}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'demo-email-error' : undefined}
          />
          {fieldErrors.email && (
            <p id="demo-email-error" className="text-sm text-destructive mt-1">{fieldErrors.email}</p>
          )}
        </div>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label htmlFor="demo-phone" className={styles.label}>
            Telephone (optionnel)
          </Label>
          <Input
            id="demo-phone"
            name="phone"
            type="tel"
            placeholder="+32 123 45 67 89"
            className={styles.input}
          />
        </div>
      </div>

      {/* Ligne 4: Message (full) */}
      <div className={styles.row}>
        <div className={cn(styles.field, styles.fieldFull)}>
          <Label htmlFor="demo-message" className={styles.label}>
            Message *
          </Label>
          <Textarea
            id="demo-message"
            name="message"
            placeholder="Parlez-nous de vos besoins..."
            rows={variant === 'inline' ? 4 : 3}
            required
            className={styles.textarea}
            onBlur={handleBlur}
            aria-invalid={!!fieldErrors.message}
            aria-describedby={fieldErrors.message ? 'demo-message-error' : undefined}
          />
          {fieldErrors.message && (
            <p id="demo-message-error" className="text-sm text-destructive mt-1">{fieldErrors.message}</p>
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className={styles.submit}
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
      </Button>
    </form>
  )
}
