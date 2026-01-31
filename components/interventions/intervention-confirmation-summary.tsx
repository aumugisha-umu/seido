/* eslint-disable react/no-unescaped-entities */
'use client'

/**
 * Intervention Confirmation Summary
 *
 * Features:
 * - Refined Header with clear information hierarchy
 * - Participant list using Avatars for quick recognition
 * - distinct grouping of information fields
 * - Accessible contrast and spacing
 */

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  CheckCircle2,
  Building2,
  Users,
  Calendar,
  MessageSquareText,
  FileText,
  Paperclip,
  ArrowLeft,
  AlertTriangle,
  MapPin,
  UserCog,
  UserCheck,
  Clock,
  Briefcase
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getTypeIcon } from '@/components/interventions/intervention-type-icon'
import { cn } from '@/lib/utils'

// New confirmation sub-components
import { SuccessHeader } from './confirmation/success-header'
import { FilePreviewGallery, type PreviewFile } from './confirmation/file-preview-gallery'
import { NextStepsTimeline } from './confirmation/next-steps-timeline'

// ============================================================================
// Helper Functions & Constants
// ============================================================================

function nameToInitials(name: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Badge style: light background + darker text/icon
const CATEGORY_BADGE_STYLES: Record<string, string> = {
  bien: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  bail: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  locataire: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
}

// Map type codes to their category
const TYPE_TO_CATEGORY: Record<string, string> = {
  // Bien (20 types)
  plomberie: 'bien',
  electricite: 'bien',
  chauffage: 'bien',
  climatisation: 'bien',
  serrurerie: 'bien',
  menuiserie: 'bien',
  vitrerie: 'bien',
  peinture: 'bien',
  revetements_sols: 'bien',
  toiture: 'bien',
  facade: 'bien',
  espaces_verts: 'bien',
  parties_communes: 'bien',
  ascenseur: 'bien',
  securite_incendie: 'bien',
  nettoyage: 'bien',
  deratisation: 'bien',
  demenagement: 'bien',
  travaux_gros_oeuvre: 'bien',
  autre_technique: 'bien',
  // Legacy mappings
  jardinage: 'bien',
  menage: 'bien',
  autre: 'bien',
  // Bail (9 types)
  etat_des_lieux_entree: 'bail',
  etat_des_lieux_sortie: 'bail',
  renouvellement_bail: 'bail',
  revision_loyer: 'bail',
  regularisation_charges: 'bail',
  resiliation_bail: 'bail',
  caution: 'bail',
  assurance: 'bail',
  autre_administratif: 'bail',
  // Locataire (7 types)
  reclamation: 'locataire',
  demande_information: 'locataire',
  nuisances: 'locataire',
  demande_travaux: 'locataire',
  changement_situation: 'locataire',
  urgence_locataire: 'locataire',
  autre_locataire: 'locataire',
}

// Helper to get category code from type code
function getCategoryFromType(typeCode: string): string {
  return TYPE_TO_CATEGORY[typeCode] || 'bien'
}

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
    avatarUrl?: string // Optional avatar URL
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
    previewUrl?: string // Base64 or blob URL for image preview
    category?: string // Document category (e.g., "Photo avant travaux")
  }>
  expectsQuote?: boolean
  /** Variant for conditional display - tenant has simplified view with timeline */
  variant?: 'tenant' | 'manager'
  // Multi-provider mode
  assignmentMode?: 'single' | 'group' | 'separate'
  providerInstructions?: Record<string, string>
  // Participant confirmation
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
  /** Hide the Planning section - useful for tenant creation flow where scheduling is not relevant */
  showPlanning?: boolean
  /** Show animated success header instead of static header */
  showSuccessHeader?: boolean
  /** Callback for quick action: go to dashboard */
  onGoToDashboard?: () => void
}

// Helper to format slot date
// ✅ FIX: Utiliser parseISO pour éviter les décalages de timezone
// new Date("YYYY-MM-DD") traite comme UTC minuit → peut décaler d'un jour en heure locale
// parseISO traite la date comme locale, ce qui est le comportement attendu
function formatSlotDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    return format(date, 'EEE d MMM', { locale: fr })
  } catch {
    return dateStr
  }
}

// Helper to capitalize first letter
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Helper to get urgency badge class
function getUrgencyBadgeClass(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'urgente':
    case 'haute':
    case 'critique':
      return 'border-destructive/30 text-destructive bg-destructive/5 hover:bg-destructive/10'
    case 'normale':
    case 'moyenne':
      return 'border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100'
    case 'basse':
      return 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
    default:
      return 'border-primary/20 text-primary bg-primary/5'
  }
}

export function InterventionConfirmationSummary({
  data,
  onBack,
  onConfirm,
  isLoading = false,
  showFooter = true,
  showPlanning = true,
  showSuccessHeader = false,
  onGoToDashboard,
}: InterventionConfirmationSummaryProps) {
  const variant = data.variant || 'manager'
  const isUrgent = ['urgente', 'haute', 'critique'].includes(data.intervention.urgency.toLowerCase())
  const urgencyBadgeClass = getUrgencyBadgeClass(data.intervention.urgency)

  // Convert files to PreviewFile format for FilePreviewGallery
  const previewFiles: PreviewFile[] = (data.files || []).map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
    previewUrl: f.previewUrl,
    category: f.category,
  }))

  // Contacts Filtering
  const gestionnaires = data.contacts.filter(c => c.role.toLowerCase().includes('gestionnaire'))
  const prestataires = data.contacts.filter(c => c.role.toLowerCase().includes('prestataire'))
  let locataires = data.contacts.filter(c => c.role.toLowerCase().includes('locataire'))

  // Fallback Locataire
  if (locataires.length === 0 && data.logement.tenant) {
    locataires = [{
      id: 'tenant-from-logement',
      name: data.logement.tenant,
      role: 'Locataire',
    }]
  }

  // Compact Contact List Renderer
  const renderContactList = (contacts: typeof data.contacts) => (
    <div className="flex flex-col gap-2">
      {contacts.map((contact) => (
        <div key={contact.id} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-slate-50 transition-colors -ml-1.5">
          <Avatar className="h-7 w-7 border border-slate-100">
            <AvatarImage src={contact.avatarUrl} alt={contact.name} />
            <AvatarFallback className="text-[10px] font-medium text-slate-600 bg-slate-100">
              {nameToInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate flex items-center gap-1.5 leading-none mb-0.5">
              {contact.name}
              {contact.isCurrentUser && (
                <Badge variant="secondary" className="text-[9px] h-3.5 px-0.5 pointer-events-none">
                  Vous
                </Badge>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground truncate leading-none">
              {contact.speciality || contact.role}
            </span>
          </div>
        </div>
      ))}
    </div>
  )

  const categoryCode = getCategoryFromType(data.intervention.category)
  const TypeIcon = getTypeIcon(data.intervention.category)

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in-50 duration-500">

      {/* Main Card - Compact View */}
      <Card className="overflow-hidden border-slate-200 shadow-sm flex flex-col h-full max-h-[85vh]">

        {/* SUCCESS HEADER (animated) or COMPACT HEADER (static) */}
        {showSuccessHeader ? (
          <SuccessHeader
            variant={variant}
            interventionTitle={data.intervention.title}
          />
        ) : (
          <CardHeader className="border-b bg-slate-50/50 py-3 px-5 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Title & Meta */}
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-lg font-bold leading-none tracking-tight text-slate-900 truncate">
                      {data.intervention.title}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={cn("uppercase text-[9px] h-4 px-1.5 tracking-wider font-semibold", urgencyBadgeClass)}
                    >
                      {data.intervention.urgency}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn("flex items-center gap-1 font-normal bg-white h-4 px-1.5 text-[10px]", CATEGORY_BADGE_STYLES[categoryCode])}
                    >
                      <TypeIcon className="h-2.5 w-2.5" />
                      {data.intervention.category}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1.5 text-xs truncate">
                    <MapPin className="h-3 w-3" />
                    <span className="font-medium">{data.logement.name}</span>
                    {data.logement.building && <span className="text-muted-foreground">• {data.logement.building}</span>}
                    {data.logement.address && <span className="text-muted-foreground">• {data.logement.address}</span>}
                  </CardDescription>
                </div>
              </div>

              {/* Right: Status Indicator - Compact */}
              <div className="flex-shrink-0">
                {data.expectsQuote ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
                    <FileText className="h-3 w-3 text-amber-600" />
                    <span className="text-[10px] font-semibold text-amber-700">Estimation demandée</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span className="text-[10px] font-semibold text-green-700">Direct</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        )}

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className={cn(
            "grid grid-cols-1 divide-y lg:divide-y-0 min-h-full",
            variant !== 'tenant' && "lg:grid-cols-12 lg:divide-x divide-slate-100"
          )}>

            {/* COLUMN 1: Details - Full width for tenant, 8/12 for manager */}
            <div className={cn(
              "p-4 lg:p-5 space-y-5",
              variant === 'tenant' ? "lg:col-span-12" : "lg:col-span-8"
            )}>

              {/* Description Block */}
              <section className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Détails
                </h4>
                <div className="bg-slate-50 rounded-md p-3 text-sm text-slate-700 leading-snug border border-slate-100">
                  {data.intervention.description || <span className="text-muted-foreground italic">Aucune description.</span>}
                </div>
                {data.intervention.room && (
                  <div className="text-xs text-slate-600 pl-1">
                    Lieu : <span className="font-medium text-slate-900">{data.intervention.room}</span>
                  </div>
                )}
              </section>

              {/* Planning Block - Hidden for tenant flow */}
              {showPlanning && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Planning
                    </h4>
                    {data.scheduling?.type && (
                      <Badge variant="outline" className={cn(
                        "text-[9px] h-4 px-1.5 border",
                        data.scheduling.type === 'immediate' && "bg-sky-100 text-sky-700 border-sky-200",
                        data.scheduling.type === 'slots' && "bg-purple-100 text-purple-700 border-purple-200",
                        data.scheduling.type === 'flexible' && "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {data.scheduling.type === 'flexible' && 'Laissé libre'}
                        {data.scheduling.type === 'slots' && 'Créneau proposé'}
                        {data.scheduling.type === 'immediate' && 'Date fixe'}
                      </Badge>
                    )}
                  </div>
                  {data.scheduling?.type === 'immediate' && data.scheduling.slots?.[0] ? (
                    // DATE FIXE - Box bleue, heure unique
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-sky-50 text-sky-700 rounded-md border border-sky-100 text-xs">
                      <span className="font-semibold">{formatSlotDate(data.scheduling.slots[0].date)}</span>
                      <span className="opacity-75">{data.scheduling.slots[0].startTime}</span>
                    </div>
                  ) : data.scheduling?.slots && data.scheduling.slots.length > 0 ? (
                    // CRÉNEAUX PROPOSÉS - Boxes violettes, time range
                    <div className="flex flex-col gap-1.5">
                      {data.scheduling.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-md border border-purple-100 text-xs">
                          <span className="font-semibold">{formatSlotDate(slot.date)}</span>
                          <span className="opacity-75">
                            {slot.startTime === slot.endTime ? slot.startTime : `${slot.startTime}-${slot.endTime}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // FLEXIBLE ou vide
                    <div className="text-xs text-slate-500 italic bg-slate-50 px-2 py-1.5 rounded border border-slate-100">
                      {data.scheduling?.message || "À définir"}
                    </div>
                  )}
                </section>
              )}

              {/* Files Block - FULL WIDTH Visual Preview Gallery */}
              {previewFiles.length > 0 && (
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Fichiers joints ({previewFiles.length})
                  </h4>
                  <FilePreviewGallery files={previewFiles} />
                </section>
              )}

              {/* Instructions - Full Width if present */}
              {(data.instructions?.globalMessage || (data.providerInstructions && Object.keys(data.providerInstructions).length > 0)) && (
                <>
                  <Separator className="bg-slate-100" />
                  <section className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquareText className="h-3.5 w-3.5" /> Instructions
                    </h4>

                    {data.instructions?.globalMessage && (
                      <div className="bg-blue-50/50 p-2.5 rounded-md border border-blue-100 text-xs text-slate-700">
                        <span className="font-semibold text-blue-800 mr-1">Global:</span>
                        {data.instructions.globalMessage}
                      </div>
                    )}

                    {data.assignmentMode === 'separate' && data.providerInstructions && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                        {prestataires.map(provider => {
                          const msg = data.providerInstructions?.[provider.id]
                          if (!msg) return null;
                          return (
                            <div key={provider.id} className="flex flex-col gap-1 text-xs bg-slate-50 p-2 rounded-md border border-slate-100">
                              <div className="flex items-center gap-1.5 font-medium text-slate-900">
                                <Avatar className="h-4 w-4"><AvatarFallback className="text-[8px]">{nameToInitials(provider.name)}</AvatarFallback></Avatar>
                                {provider.name}
                              </div>
                              <p className="text-slate-600 pl-5.5">{msg}</p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* TIMELINE: Prochaines étapes (tenant variant only) */}
              {variant === 'tenant' && (
                <>
                  <Separator className="bg-slate-100" />
                  <NextStepsTimeline variant="tenant" />
                </>
              )}

            </div>

            {/* COLUMN 2: Participants & Confirmation (Smaller) - 4/12 - Only for manager variant */}
            {variant !== 'tenant' && (
            <div className="bg-slate-50/40 p-4 lg:p-5 lg:col-span-4 flex flex-col gap-5 overflow-y-auto max-h-full">

              {/* Participants Group - Tighter */}
              <div className="space-y-4 flex-1">

                {/* Gestionnaires */}
                {gestionnaires.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestion</span>
                    {renderContactList(gestionnaires)}
                  </div>
                )}

                {/* Locataires */}
                {locataires.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locataires</span>
                    {renderContactList(locataires)}
                  </div>
                )}

                {/* Prestataires */}
                {prestataires.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prestataires</span>
                      {prestataires.length > 1 && data.assignmentMode && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 bg-white">
                          {data.assignmentMode === 'separate' ? 'Séparé' : 'Groupe'}
                        </Badge>
                      )}
                    </div>
                    {renderContactList(prestataires)}
                  </div>
                )}
              </div>

              {/* Confirmation Block - Compact */}
              {data.requiresParticipantConfirmation && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-amber-900">
                    <UserCheck className="h-4 w-4" />
                    <span className="text-xs font-bold">Confirmation requise</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {data.contacts
                      .filter(c => data.confirmationRequiredUserIds?.includes(c.id))
                      .map(contact => (
                        <Badge key={contact.id} variant="secondary" className="bg-white border-amber-100 text-amber-900 hover:bg-amber-50 text-[10px] h-5 px-1.5">
                          {contact.name}
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              )}

            </div>
            )}
          </div>
        </div>

        {/* FOOTER - Compact */}
        {showFooter && (
          <CardFooter className="flex-shrink-0 flex flex-col-reverse sm:flex-row gap-3 sm:justify-between border-t bg-white p-3 lg:px-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              disabled={isLoading}
              className="w-full sm:w-auto text-slate-500 hover:text-slate-900"
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
                  Création...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                  Confirmer l'intervention
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
