/* eslint-disable react/no-unescaped-entities */
'use client'

/**
 * Intervention Confirmation Summary
 *
 * Refactored to use reusable confirmation components from @/components/confirmation.
 * Preserves the same props interface and data flow.
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Building2,
  Users,
  Calendar,
  MessageSquareText,
  FileText,
  Paperclip,
  ArrowLeft,
  Wrench,
  UserCheck,
  Settings2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// New reusable confirmation components
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSummaryBanner,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationContactGrid,
} from '@/components/confirmation'

// Existing sub-components
import { SuccessHeader } from './confirmation/success-header'
import { FilePreviewGallery, type PreviewFile } from './confirmation/file-preview-gallery'
import { NextStepsTimeline } from './confirmation/next-steps-timeline'

// ============================================================================
// Types (unchanged public interface)
// ============================================================================

export interface InterventionConfirmationData {
  logement: {
    type: string
    name: string
    building?: string
    address?: string
    floor?: string
    tenant?: string
  }
  intervention: {
    title: string
    description: string
    category: string
    urgency: string
    room?: string
  }
  contacts: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    role: string
    speciality?: string
    isCurrentUser?: boolean
    avatarUrl?: string
    has_account?: boolean
  }>
  scheduling?: {
    type: 'immediate' | 'slots' | 'flexible'
    slots?: Array<{
      date: string
      startTime: string
      endTime: string
    }>
    message?: string
  }
  instructions?: {
    type: 'global' | 'per_provider'
    globalMessage?: string
  }
  files?: Array<{
    id: string
    name: string
    size: string
    type?: string
    previewUrl?: string
    category?: string
  }>
  expectsQuote?: boolean
  variant?: 'tenant' | 'manager'
  assignmentMode?: 'single' | 'group' | 'separate'
  providerInstructions?: Record<string, string>
  requiresParticipantConfirmation?: boolean
  confirmationRequiredUserIds?: string[]
}

interface InterventionConfirmationSummaryProps {
  data: InterventionConfirmationData
  onBack: () => void
  onConfirm: () => void
  currentStep?: number
  totalSteps?: number
  isLoading?: boolean
  showFooter?: boolean
  showPlanning?: boolean
  showSuccessHeader?: boolean
  onGoToDashboard?: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function formatSlotDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    return format(date, 'EEE d MMM', { locale: fr })
  } catch {
    return dateStr
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function getUrgencyBadgeProps(urgency: string): { label: string; className: string } {
  const label = capitalizeFirst(urgency)
  const lower = urgency.toLowerCase()
  if (['urgente', 'haute', 'critique', 'tres_urgent'].includes(lower)) {
    return { label, className: 'bg-red-50 text-red-700 border-red-200' }
  }
  if (['urgent'].includes(lower)) {
    return { label, className: 'bg-amber-50 text-amber-700 border-amber-200' }
  }
  // normale / basse / default
  return { label, className: '' }
}

function getPlanningTypeLabel(type?: string): string {
  switch (type) {
    case 'immediate': return 'Date fixe'
    case 'slots': return 'Creneaux'
    case 'flexible': return 'Flexible'
    default: return 'Non defini'
  }
}

// ============================================================================
// Component
// ============================================================================

export function InterventionConfirmationSummary({
  data,
  onBack,
  onConfirm,
  isLoading = false,
  showFooter = true,
  showPlanning = true,
  showSuccessHeader = false,
}: InterventionConfirmationSummaryProps) {
  const variant = data.variant || 'manager'

  // Convert files to PreviewFile format
  const previewFiles: PreviewFile[] = (data.files || []).map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
    previewUrl: f.previewUrl,
    category: f.category,
  }))

  // Contact groups
  const gestionnaires = data.contacts.filter(c => c.role.toLowerCase().includes('gestionnaire'))
  const prestataires = data.contacts.filter(c => c.role.toLowerCase().includes('prestataire'))
  let locataires = data.contacts.filter(c => c.role.toLowerCase().includes('locataire'))

  // Fallback locataire from logement
  if (locataires.length === 0 && data.logement.tenant) {
    locataires = [{
      id: 'tenant-from-logement',
      name: data.logement.tenant,
      role: 'Locataire',
    }]
  }

  // Urgency badge
  const urgencyBadge = getUrgencyBadgeProps(data.intervention.urgency)
  // Build entity header badges
  const headerBadges: Array<{ label: string; variant?: 'default' | 'secondary' | 'outline'; className?: string }> = [
    { label: urgencyBadge.label, variant: 'outline', className: urgencyBadge.className },
    { label: data.intervention.category, variant: 'outline' },
  ]
  if (data.expectsQuote) {
    headerBadges.push({ label: 'Estimation demandee', variant: 'outline', className: 'bg-amber-50 text-amber-700 border-amber-200' })
  }

  // Build subtitle
  const subtitleParts = [data.logement.name]
  if (data.logement.building) subtitleParts.push(data.logement.building)
  if (data.logement.address) subtitleParts.push(data.logement.address)
  const subtitle = subtitleParts.join(' - ')

  // Summary banner metrics
  const bannerMetrics = [
    { label: 'Prestataires', value: prestataires.length, icon: <Users className="h-3.5 w-3.5" /> },
    { label: 'Planning', value: getPlanningTypeLabel(data.scheduling?.type), icon: <Calendar className="h-3.5 w-3.5" /> },
    { label: 'Devis', value: data.expectsQuote ? 'Demande' : 'Non', icon: <FileText className="h-3.5 w-3.5" /> },
    {
      label: 'Confirmation',
      value: data.requiresParticipantConfirmation ? 'Requise' : 'Non',
      icon: <UserCheck className="h-3.5 w-3.5" />,
      highlight: data.requiresParticipantConfirmation,
    },
  ]

  // Planning section value pairs
  const buildPlanningPairs = () => {
    const pairs: Array<{ label: string; value: React.ReactNode; empty?: boolean; fullWidth?: boolean }> = []

    pairs.push({ label: 'Type de planning', value: getPlanningTypeLabel(data.scheduling?.type) })

    if (data.scheduling?.type === 'immediate' && data.scheduling.slots?.[0]) {
      const slot = data.scheduling.slots[0]
      pairs.push({
        label: 'Date & heure',
        value: `${formatSlotDate(slot.date)} a ${slot.startTime}`,
      })
    } else if (data.scheduling?.type === 'slots' && data.scheduling.slots && data.scheduling.slots.length > 0) {
      pairs.push({
        label: 'Creneaux proposes',
        fullWidth: true,
        value: (
          <div className="flex flex-col gap-1">
            {data.scheduling.slots.map((slot, idx) => (
              <span key={idx} className="text-sm">
                {formatSlotDate(slot.date)} {slot.startTime === slot.endTime ? slot.startTime : `${slot.startTime} - ${slot.endTime}`}
              </span>
            ))}
          </div>
        ),
      })
    } else {
      pairs.push({
        label: 'Date',
        value: data.scheduling?.message || 'Flexible — aucune date imposee',
        empty: !data.scheduling?.message && data.scheduling?.type === 'flexible',
      })
    }

    // Confirmation info
    if (data.requiresParticipantConfirmation) {
      const confirmNames = data.contacts
        .filter(c => data.confirmationRequiredUserIds?.includes(c.id))
        .map(c => c.name)
        .join(', ')
      pairs.push({
        label: 'Confirmation requise',
        value: `Oui — ${confirmNames || 'participants selectionnes'}`,
      })
    } else {
      pairs.push({ label: 'Confirmation requise', value: 'Non' })
    }

    pairs.push({ label: 'Devis demande', value: data.expectsQuote ? 'Oui' : 'Non' })

    return pairs
  }

  // Instructions section pairs
  const buildInstructionsPairs = () => {
    const pairs: Array<{ label: string; value: React.ReactNode; empty?: boolean; fullWidth?: boolean }> = []

    pairs.push({
      label: 'Message global',
      value: data.instructions?.globalMessage || undefined,
      empty: !data.instructions?.globalMessage,
      fullWidth: true,
    })

    if (data.assignmentMode === 'separate' && data.providerInstructions) {
      prestataires.forEach(provider => {
        const msg = data.providerInstructions?.[provider.id]
        pairs.push({
          label: `Instructions — ${provider.name}`,
          value: msg || undefined,
          empty: !msg,
          fullWidth: true,
        })
      })
    }

    return pairs
  }

  // --- Success header variant (unchanged) ---
  if (showSuccessHeader) {
    return (
      <ConfirmationPageShell maxWidth="5xl">
        <SuccessHeader
          variant={variant}
          interventionTitle={data.intervention.title}
        />
        {/* Render the same content below success header */}
        {renderContent()}
        {variant === 'tenant' && <NextStepsTimeline variant="tenant" />}
      </ConfirmationPageShell>
    )
  }

  // --- Standard confirmation view ---
  return (
    <ConfirmationPageShell maxWidth="5xl">
      <ConfirmationEntityHeader
        icon={Wrench}
        iconColor="primary"
        title={data.intervention.title}
        subtitle={subtitle}
        badges={headerBadges}
      />

      <ConfirmationSummaryBanner metrics={bannerMetrics} />

      {renderContent()}

      {/* Footer */}
      {showFooter && (
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled={isLoading}
            className="w-full sm:w-auto text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-2" />
            Retour
          </Button>
          <Button
            size="sm"
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 shadow-sm"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Creation...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                Confirmer l'intervention
              </>
            )}
          </Button>
        </div>
      )}
    </ConfirmationPageShell>
  )

  // ============================================================================
  // Shared content renderer (used by both success and standard views)
  // ============================================================================
  function renderContent() {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COLUMN */}
        <div className={cn("space-y-5", variant === 'tenant' && "lg:col-span-2")}>
          {/* Bien & occupant */}
          <ConfirmationSection title="Bien & occupant" icon={<Building2 className="h-3.5 w-3.5" />}>
            <ConfirmationKeyValueGrid pairs={[
              { label: 'Type', value: data.logement.type === 'lot' ? 'Lot' : 'Immeuble' },
              { label: 'Nom', value: data.logement.name },
              { label: 'Adresse', value: data.logement.address || undefined, empty: !data.logement.address },
              {
                label: 'Locataire',
                value: data.logement.tenant || undefined,
                empty: !data.logement.tenant,
              },
            ]} />
            {!data.logement.tenant && (
              <p className="text-sm text-muted-foreground/60 italic">Vacant</p>
            )}
          </ConfirmationSection>

          {/* Details */}
          <ConfirmationSection title="Details" icon={<FileText className="h-3.5 w-3.5" />}>
            <ConfirmationKeyValueGrid pairs={[
              { label: 'Titre', value: data.intervention.title },
              {
                label: 'Description',
                value: data.intervention.description || undefined,
                empty: !data.intervention.description,
                fullWidth: true,
              },
              { label: 'Categorie / Type', value: data.intervention.category },
              {
                label: 'Urgence',
                value: (
                  <Badge variant="outline" className={cn('text-xs', urgencyBadge.className)}>
                    {urgencyBadge.label}
                  </Badge>
                ),
              },
            ]} />
          </ConfirmationSection>

          {/* Planning */}
          {showPlanning && (
            <ConfirmationSection title="Planning" icon={<Calendar className="h-3.5 w-3.5" />}>
              <ConfirmationKeyValueGrid pairs={buildPlanningPairs()} />
            </ConfirmationSection>
          )}

          {/* Instructions */}
          <ConfirmationSection title="Instructions" icon={<MessageSquareText className="h-3.5 w-3.5" />}>
            <ConfirmationKeyValueGrid columns={1} pairs={buildInstructionsPairs()} />
          </ConfirmationSection>

          {/* Fichiers joints */}
          <ConfirmationSection title="Fichiers joints" icon={<Paperclip className="h-3.5 w-3.5" />}>
            {previewFiles.length > 0 ? (
              <FilePreviewGallery files={previewFiles} />
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">Aucun fichier joint</p>
            )}
          </ConfirmationSection>
        </div>

        {/* RIGHT COLUMN (manager only) */}
        {variant !== 'tenant' && (
          <div className="space-y-5">
            {/* Contacts assignes */}
            <ConfirmationSection title="Contacts assignes" icon={<Users className="h-3.5 w-3.5" />}>
              <ConfirmationContactGrid
                columns={2}
                groups={[
                  {
                    type: 'Gestionnaires',
                    contacts: gestionnaires.map(c => ({
                      id: c.id,
                      name: c.name,
                      email: c.email,
                      sublabel: c.speciality || c.role,
                    })),
                    emptyLabel: 'Aucun',
                  },
                  {
                    type: 'Prestataires',
                    contacts: prestataires.map(c => ({
                      id: c.id,
                      name: c.name,
                      email: c.email,
                      sublabel: c.speciality || c.role,
                    })),
                    emptyLabel: 'Aucun',
                  },
                  {
                    type: 'Locataires',
                    contacts: locataires.map(c => ({
                      id: c.id,
                      name: c.name,
                      email: c.email,
                      sublabel: c.speciality || c.role,
                    })),
                    emptyLabel: 'Aucun (vacant)',
                  },
                ]}
              />
            </ConfirmationSection>

            {/* Options */}
            <ConfirmationSection title="Options" icon={<Settings2 className="h-3.5 w-3.5" />}>
              <ConfirmationKeyValueGrid
                columns={1}
                pairs={[
                  ...(prestataires.length > 1 && data.assignmentMode
                    ? [{
                        label: 'Mode assignation',
                        value: data.assignmentMode === 'separate' ? 'Separe' : data.assignmentMode === 'group' ? 'Groupe' : 'Unique',
                      }]
                    : []),
                  { label: 'Devis requis', value: data.expectsQuote ? 'Oui' : 'Non' },
                ]}
              />
            </ConfirmationSection>
          </div>
        )}
      </div>
    )
  }
}
