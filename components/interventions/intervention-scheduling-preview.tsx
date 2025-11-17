"use client"

/**
 * Intervention Scheduling Preview Component
 * Displays planning information in read-only mode: participants, estimation, and scheduling method
 */

import { ContactSection } from "@/components/ui/contact-section"
import { Badge } from "@/components/ui/badge"
import { QuoteRequestCard } from "@/components/quotes/quote-request-card"
import {
  Users,
  Clock,
  CalendarDays,
  FileText,
  Calendar
} from "lucide-react"
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Database } from '@/lib/database.types'

type User = Database['public']['Tables']['users']['Row']
type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: User
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface InterventionSchedulingPreviewProps {
  // Participants
  managers?: Contact[]
  providers?: Contact[]
  tenants?: Contact[]

  // Estimation
  requireQuote?: boolean
  quotes?: Quote[]

  // Scheduling method
  schedulingType?: "fixed" | "slots" | "flexible" | null
  scheduledDate?: string | null
  schedulingSlots?: TimeSlot[] | null

  // Quote actions
  onCancelQuoteRequest?: (quoteId: string) => void
}

export function InterventionSchedulingPreview({
  managers = [],
  providers = [],
  tenants = [],
  requireQuote = false,
  quotes = [],
  schedulingType = null,
  scheduledDate = null,
  schedulingSlots = null,
  onCancelQuoteRequest
}: InterventionSchedulingPreviewProps) {

  // Format date and time
  const formatDateTime = (date: string) => {
    try {
      return format(new Date(date), 'dd MMMM yyyy à HH:mm', { locale: fr })
    } catch {
      return date
    }
  }

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'dd MMMM yyyy', { locale: fr })
    } catch {
      return date
    }
  }

  const formatTime = (time: string) => {
    return time
  }

  return (
    <div className="space-y-6">
      {/* 1. Participants Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Participants</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gestionnaires */}
          <ContactSection
            sectionType="managers"
            contacts={managers}
            readOnly={true}
            customLabel="Gestionnaire(s) assigné(s)"
          />

          {/* Prestataires */}
          <ContactSection
            sectionType="providers"
            contacts={providers}
            readOnly={true}
            customLabel="Prestataire(s) à contacter"
          />

          {/* Locataires */}
          <ContactSection
            sectionType="tenants"
            contacts={tenants}
            readOnly={true}
            customLabel="Locataire(s) concerné(s)"
          />
        </div>
      </div>

      {/* 2. Estimation Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Estimation préalable</h4>
        </div>

        {/* Estimations received */}
        {requireQuote && quotes.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory items-stretch">
            {quotes.map(quote => (
              <div key={quote.id} className="min-w-[320px] max-w-[400px] flex-shrink-0 snap-start flex">
                <QuoteRequestCard
                  request={quote}
                  onCancelRequest={onCancelQuoteRequest}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
        ) : requireQuote ? (
          <div className="p-4 bg-amber-50/30 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              En attente d&apos;estimation du prestataire
            </p>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Pas d&apos;estimation demandée pour cette intervention
            </p>
          </div>
        )}
      </div>

      {/* 3. Scheduling Method Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">Méthode de planification</h4>
        </div>

        {schedulingType === "fixed" && scheduledDate && (
          <div className="p-4 bg-blue-50/30 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-blue-900 mb-1">
                  Rendez-vous fixé
                </h5>
                <p className="text-sm text-blue-700">
                  {formatDateTime(scheduledDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {schedulingType === "slots" && schedulingSlots && schedulingSlots.length > 0 && (
          <div className="p-4 bg-purple-50/30 border border-purple-200 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-purple-900 mb-1">
                  Créneaux proposés
                </h5>
                <p className="text-xs text-purple-700 mb-3">
                  Les participants peuvent choisir parmi {schedulingSlots.length} créneau{schedulingSlots.length > 1 ? 'x' : ''}
                </p>

                <div className="space-y-2">
                  {schedulingSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="p-2 bg-white border border-purple-200 rounded text-sm"
                    >
                      <span className="font-medium text-slate-700">Créneau {index + 1}:</span>{' '}
                      <span className="text-slate-600">
                        {formatDate(slot.date)} de {formatTime(slot.startTime)} à {formatTime(slot.endTime)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {schedulingType === "flexible" && (
          <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h5 className="font-semibold text-sm text-emerald-900 mb-1">
                  Coordination autonome
                </h5>
                <p className="text-sm text-emerald-700 leading-relaxed">
                  Les participants se coordonnent directement entre eux pour fixer le rendez-vous.
                </p>
              </div>
            </div>
          </div>
        )}

        {!schedulingType && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              Aucune méthode de planification définie
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
