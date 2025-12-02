'use client'

/**
 * DemoRequestForm - Formulaire de demande de démo réutilisable
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface DemoFormData {
  name: string
  email: string
  phone?: string
  company?: string
  lots?: number
  message?: string
}

export interface DemoRequestFormProps {
  /** Style adapté au contexte */
  variant?: 'modal' | 'inline'
  /** Callback avec les données du formulaire */
  onSubmit?: (data: DemoFormData) => void | Promise<void>
  /** Callback appelé après soumission réussie */
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
    'focus:bg-white/20 focus:border-white/30',
    'transition-colors w-full'
  ),
  textarea: cn(
    'bg-white/10 border-white/20 text-white',
    'placeholder:text-white/40',
    'focus:bg-white/20 focus:border-white/30',
    'transition-colors w-full resize-none'
  ),
  submit: cn(
    'w-full mt-2',
    'bg-gradient-to-r from-purple-600 to-blue-600',
    'hover:from-purple-500 hover:to-blue-500',
    'transition-all hover:scale-[1.02]'
  ),

  // Modifiers
  fieldHalf: 'md:flex-1',
  fieldFull: 'w-full',
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      const data: DemoFormData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: (formData.get('phone') as string) || undefined,
        company: (formData.get('company') as string) || undefined,
        lots: formData.get('lots') ? Number(formData.get('lots')) : undefined,
        message: (formData.get('message') as string) || undefined,
      }

      if (onSubmit) {
        await onSubmit(data)
      } else {
        // Comportement par défaut: alert
        console.log('Demo request submitted:', data)
        alert('Merci ! Notre équipe vous contactera sous 24h.')
      }

      onSuccess?.()
    } catch (error) {
      console.error('Error submitting demo request:', error)
      alert('Une erreur est survenue. Veuillez réessayer.')
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
            Nom complet *
          </Label>
          <Input
            id="demo-name"
            name="name"
            placeholder="Jean Dupont"
            required
            className={styles.input}
          />
        </div>
      </div>

      {/* Ligne 2: Société + Nombre de biens gérés (half + half) */}
      <div className={styles.row}>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label htmlFor="demo-company" className={styles.label}>
            Société
          </Label>
          <Input
            id="demo-company"
            name="company"
            placeholder="Nom de votre agence"
            className={styles.input}
          />
        </div>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label htmlFor="demo-lots" className={styles.label}>
            Nombre de biens gérés
          </Label>
          <Input
            id="demo-lots"
            name="lots"
            type="number"
            placeholder="50"
            min={0}
            className={styles.input}
          />
        </div>
      </div>

      {/* Ligne 3: Email + Téléphone (half + half) */}
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
          />
        </div>
        <div className={cn(styles.field, styles.fieldHalf)}>
          <Label htmlFor="demo-phone" className={styles.label}>
            Téléphone (optionnel)
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
            Message (optionnel)
          </Label>
          <Textarea
            id="demo-message"
            name="message"
            placeholder="Parlez-nous de vos besoins..."
            rows={variant === 'inline' ? 4 : 3}
            className={styles.textarea}
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting}
        className={styles.submit}
      >
        {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
      </Button>
    </form>
  )
}
