"use client"

/**
 * Page d'audit des modales - Planification & Devis
 *
 * Cette page centralise toutes les modales existantes pour:
 * 1. Identifier les redondances
 * 2. Vérifier la cohérence du design system
 * 3. Améliorer l'UX
 *
 * MODALES SUPPRIMÉES (consolidées dans MultiSlotResponseModal):
 * - RejectSlotModal: SUPPRIMÉ
 * - TimeSlotResponseModal: SUPPRIMÉ
 * - TenantSlotConfirmationModal: SUPPRIMÉ
 *
 * REDONDANCES RESTANTES:
 * - CancelQuoteRequestModal vs CancelQuoteConfirmModal (quasi-identiques)
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye
} from "lucide-react"

// ============================================================================
// PLANNING MODALS
// ============================================================================
import { ProgrammingModal } from "@/components/intervention/modals/programming-modal"
import { ChooseTimeSlotModal } from "@/components/intervention/modals/choose-time-slot-modal"
import { CancelSlotModal } from "@/components/intervention/modals/cancel-slot-modal"
import { MultiSlotResponseModal } from "@/components/intervention/modals/multi-slot-response-modal"

// ============================================================================
// QUOTE MODALS
// ============================================================================
import { QuoteRequestModal } from "@/components/intervention/modals/quote-request-modal"
import { QuoteSubmissionModal } from "@/components/intervention/modals/quote-submission-modal"
import { QuoteApprovalModal } from "@/components/quotes/quote-approval-modal"
import { QuoteRejectionModal } from "@/components/quotes/quote-rejection-modal"
import { QuoteCancellationModal } from "@/components/quotes/quote-cancellation-modal"
import { QuoteRequestSuccessModal } from "@/components/intervention/modals/quote-request-success-modal"
import { CancelQuoteRequestModal } from "@/components/intervention/modals/cancel-quote-request-modal"
import { CancelQuoteConfirmModal } from "@/components/intervention/modals/cancel-quote-confirm-modal"

// ============================================================================
// MOCK DATA
// ============================================================================

const mockIntervention = {
  id: "int-123",
  title: "Fuite d'eau cuisine",
  description: "Une fuite importante sous l'évier de la cuisine nécessite une intervention rapide.",
  type: "plomberie",
  urgency: "haute",
  status: "approuvee",
  reference: "INT-2026-001",
  created_at: new Date().toISOString(),
  lot: { name: "Lot 4G", building: { name: "Résidence Bleue", address: "12 rue des Lilas" } },
  building: { name: "Résidence Bleue", address: "12 rue des Lilas" }
}

const mockSlot = {
  id: "slot-123",
  slot_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  start_time: "09:00",
  end_time: "12:00",
  notes: "Prévoir accès au local technique",
  status: "proposed"
}

const mockSlots = [
  { ...mockSlot, id: "slot-1" },
  {
    id: "slot-2",
    slot_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    start_time: "14:00",
    end_time: "17:00",
    notes: null,
    status: "proposed"
  }
]

// Mock responses pour tester les indicateurs de réponses
const mockSlotResponses = {
  "slot-1": [
    { user_id: "u1", response: "accepted" as const, user: { name: "Arthur Umugisha", role: "gestionnaire" } },
    { user_id: "u2", response: "pending" as const, user: { name: "Dépannage Rapide", role: "prestataire" } },
  ],
  "slot-2": [
    { user_id: "u1", response: "pending" as const, user: { name: "Arthur Umugisha", role: "gestionnaire" } },
    { user_id: "u2", response: "rejected" as const, user: { name: "Dépannage Rapide", role: "prestataire" } },
    { user_id: "u3", response: "pending" as const, user: { name: "Marie Dupont", role: "locataire" } },
  ]
}

const mockProviders = [
  { id: "prov-1", name: "Jean Dupont Plomberie", email: "jean@plomberie.fr", phone: "06 12 34 56 78", provider_category: "prestataire" },
  { id: "prov-2", name: "Martin Électricité", email: "martin@elec.fr", phone: "06 98 76 54 32", provider_category: "prestataire" },
]

const mockQuote = {
  id: "quote-123",
  provider_name: "Jean Dupont Plomberie",
  total_amount: 450.00,
  status: "submitted",
  created_at: new Date().toISOString()
}

const mockQuoteRequest = {
  id: "qr-123",
  provider_id: "prov-1",
  provider_name: "Jean Dupont Plomberie",
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  notes: "Merci de détailler le coût des pièces",
  status: "pending"
}

// ============================================================================
// MODAL CARD COMPONENT
// ============================================================================

interface ModalCardProps {
  title: string
  description: string
  role: "gestionnaire" | "prestataire" | "locataire" | "all"
  status: "keep" | "redundant" | "review"
  redundantWith?: string
  onOpen: () => void
}

function ModalCard({ title, description, role, status, redundantWith, onOpen }: ModalCardProps) {
  const roleColors = {
    gestionnaire: "bg-blue-100 text-blue-800",
    prestataire: "bg-purple-100 text-purple-800",
    locataire: "bg-green-100 text-green-800",
    all: "bg-gray-100 text-gray-800"
  }

  const statusConfig = {
    keep: { color: "bg-green-500", label: "Conserver", icon: CheckCircle2 },
    redundant: { color: "bg-red-500", label: "Redondant", icon: XCircle },
    review: { color: "bg-amber-500", label: "À revoir", icon: AlertTriangle }
  }

  const StatusIcon = statusConfig[status].icon

  return (
    <Card className={status === "redundant" ? "border-red-300 bg-red-50/50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex gap-1">
            <Badge className={roleColors[role]} variant="secondary">
              {role === "all" ? "Tous" : role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${status === 'keep' ? 'text-green-600' : status === 'redundant' ? 'text-red-600' : 'text-amber-600'}`} />
          <span className={`text-sm font-medium ${status === 'keep' ? 'text-green-700' : status === 'redundant' ? 'text-red-700' : 'text-amber-700'}`}>
            {statusConfig[status].label}
          </span>
        </div>
        {redundantWith && (
          <p className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
            Redondant avec: {redundantWith}
          </p>
        )}
        <Button onClick={onOpen} size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-2" />
          Ouvrir la modale
        </Button>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ModalsAuditPage() {
  // Planning modals state
  const [showProgramming, setShowProgramming] = useState(false)
  const [showChooseSlot, setShowChooseSlot] = useState(false)
  const [showCancelSlot, setShowCancelSlot] = useState(false)
  const [showMultiSlotResponse, setShowMultiSlotResponse] = useState(false)

  // ProgrammingModal state
  const [programmingOption, setProgrammingOption] = useState<"direct" | "propose" | "organize" | null>(null)
  const [directSchedule, setDirectSchedule] = useState({ date: "", startTime: "09:00", endTime: "12:00" })
  const [proposedSlots, setProposedSlots] = useState([{ date: "", startTime: "09:00", endTime: "12:00" }])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])

  // Quote modals state
  const [showQuoteRequest, setShowQuoteRequest] = useState(false)
  const [showQuoteSubmission, setShowQuoteSubmission] = useState(false)
  const [showQuoteApproval, setShowQuoteApproval] = useState(false)
  const [showQuoteRejection, setShowQuoteRejection] = useState(false)
  const [showQuoteCancellation, setShowQuoteCancellation] = useState(false)
  const [showQuoteRequestSuccess, setShowQuoteRequestSuccess] = useState(false)
  const [showCancelQuoteRequest, setShowCancelQuoteRequest] = useState(false)
  const [showCancelQuoteConfirm, setShowCancelQuoteConfirm] = useState(false)

  // Form state for QuoteRequestModal
  const [quoteDeadline, setQuoteDeadline] = useState("")
  const [quoteNotes, setQuoteNotes] = useState("")
  const [selectedProviderId, setSelectedProviderId] = useState("")

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Audit des Modales</h1>
        <p className="text-muted-foreground">
          Planification & Devis - Centralisation pour nettoyage et amélioration
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-6 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm">Conserver</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm">Redondant (à supprimer)</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm">À revoir/améliorer</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* PLANNING SECTION */}
      {/* ================================================================== */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">Planification (4 modales)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModalCard
            title="ProgrammingModal"
            description="Modale principale pour programmer une intervention (3 modes: direct, propose, organize)"
            role="gestionnaire"
            status="keep"
            onOpen={() => setShowProgramming(true)}
          />

          <ModalCard
            title="ChooseTimeSlotModal"
            description="Confirmer la sélection d'un créneau spécifique"
            role="gestionnaire"
            status="keep"
            onOpen={() => setShowChooseSlot(true)}
          />

          <ModalCard
            title="CancelSlotModal"
            description="Annuler un créneau proposé"
            role="all"
            status="keep"
            onOpen={() => setShowCancelSlot(true)}
          />

          <ModalCard
            title="MultiSlotResponseModal"
            description="Répondre à un ou plusieurs créneaux (accept auto-reject, commentaire global, indicateurs de réponses)"
            role="all"
            status="keep"
            onOpen={() => setShowMultiSlotResponse(true)}
          />
        </div>
      </section>

      <Separator className="my-8" />

      {/* ================================================================== */}
      {/* QUOTES SECTION */}
      {/* ================================================================== */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-semibold">Devis / Estimations (8 modales)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModalCard
            title="QuoteRequestModal"
            description="Gestionnaire demande une estimation à un prestataire"
            role="gestionnaire"
            status="keep"
            onOpen={() => setShowQuoteRequest(true)}
          />

          <ModalCard
            title="QuoteSubmissionModal"
            description="Prestataire soumet ou modifie son estimation"
            role="prestataire"
            status="keep"
            onOpen={() => setShowQuoteSubmission(true)}
          />

          <ModalCard
            title="QuoteApprovalModal"
            description="Gestionnaire approuve un devis soumis"
            role="gestionnaire"
            status="keep"
            onOpen={() => setShowQuoteApproval(true)}
          />

          <ModalCard
            title="QuoteRejectionModal"
            description="Gestionnaire rejette un devis avec raison"
            role="gestionnaire"
            status="keep"
            onOpen={() => setShowQuoteRejection(true)}
          />

          <ModalCard
            title="QuoteCancellationModal"
            description="Prestataire annule son devis soumis"
            role="prestataire"
            status="keep"
            onOpen={() => setShowQuoteCancellation(true)}
          />

          <ModalCard
            title="QuoteRequestSuccessModal"
            description="Message de confirmation après envoi demande"
            role="gestionnaire"
            status="review"
            onOpen={() => setShowQuoteRequestSuccess(true)}
          />

          <ModalCard
            title="CancelQuoteRequestModal"
            description="Annuler une demande d'estimation active"
            role="gestionnaire"
            status="redundant"
            redundantWith="CancelQuoteConfirmModal (quasi-identique)"
            onOpen={() => setShowCancelQuoteRequest(true)}
          />

          <ModalCard
            title="CancelQuoteConfirmModal"
            description="Confirmer l'annulation d'une demande"
            role="gestionnaire"
            status="redundant"
            redundantWith="CancelQuoteRequestModal (quasi-identique)"
            onOpen={() => setShowCancelQuoteConfirm(true)}
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* SUMMARY */}
      {/* ================================================================== */}
      <section className="mt-10 p-6 bg-slate-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Résumé de l'audit</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">10</div>
            <div className="text-sm text-muted-foreground">Modales à conserver</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">2</div>
            <div className="text-sm text-muted-foreground">Modales redondantes</div>
          </div>
          <div className="bg-white p-4 rounded-lg">
            <div className="text-2xl font-bold text-amber-600">1</div>
            <div className="text-sm text-muted-foreground">Modales à revoir</div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <p><strong>Modales supprimées:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li><s><code>RejectSlotModal</code></s> ✅ SUPPRIMÉ</li>
            <li><s><code>TimeSlotResponseModal</code></s> ✅ SUPPRIMÉ (remplacé par MultiSlotResponseModal)</li>
            <li><s><code>TenantSlotConfirmationModal</code></s> ✅ SUPPRIMÉ (remplacé par MultiSlotResponseModal)</li>
          </ul>
          <p className="mt-3"><strong>Redondances restantes:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-amber-600">
            <li><code>CancelQuoteRequestModal</code> + <code>CancelQuoteConfirmModal</code> → unifier en une seule modale</li>
          </ul>
          <p className="mt-3"><strong>Modale unifiée:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-green-600">
            <li><code>MultiSlotResponseModal</code> - Répond à un ou plusieurs créneaux, auto-reject, commentaire global, indicateurs de réponses</li>
          </ul>
        </div>
      </section>

      {/* ================================================================== */}
      {/* MODALS INSTANCES */}
      {/* ================================================================== */}

      {/* Planning Modals */}
      <ProgrammingModal
        isOpen={showProgramming}
        onClose={() => setShowProgramming(false)}
        intervention={{
          id: mockIntervention.id,
          title: mockIntervention.title,
          description: mockIntervention.description,
          urgency: mockIntervention.urgency,
          status: mockIntervention.status,
          reference: mockIntervention.reference,
          type: mockIntervention.type,
          lot: mockIntervention.lot,
          building: mockIntervention.building
        } as any}
        programmingOption={programmingOption}
        onProgrammingOptionChange={setProgrammingOption}
        directSchedule={directSchedule}
        onDirectScheduleChange={setDirectSchedule}
        proposedSlots={proposedSlots}
        onAddProposedSlot={() => setProposedSlots([...proposedSlots, { date: "", startTime: "09:00", endTime: "12:00" }])}
        onUpdateProposedSlot={(idx, field, value) => {
          const updated = [...proposedSlots]
          updated[idx] = { ...updated[idx], [field]: value }
          setProposedSlots(updated)
        }}
        onRemoveProposedSlot={(idx) => setProposedSlots(proposedSlots.filter((_, i) => i !== idx))}
        selectedProviders={selectedProviders}
        onProviderToggle={(id) => setSelectedProviders(
          selectedProviders.includes(id)
            ? selectedProviders.filter(p => p !== id)
            : [...selectedProviders, id]
        )}
        providers={mockProviders}
        onConfirm={() => { setShowProgramming(false); alert("Programming confirmed!") }}
        isFormValid={programmingOption !== null && selectedProviders.length > 0}
        teamId="team-123"
      />

      <ChooseTimeSlotModal
        open={showChooseSlot}
        onOpenChange={setShowChooseSlot}
        slot={{
          ...mockSlot,
          intervention_id: mockIntervention.id,
          created_at: new Date().toISOString(),
          created_by: "user-123",
          response_deadline: null
        } as any}
        interventionId={mockIntervention.id}
        hasActiveQuotes={true}
        onSuccess={() => setShowChooseSlot(false)}
      />

      <CancelSlotModal
        isOpen={showCancelSlot}
        onClose={() => setShowCancelSlot(false)}
        slot={mockSlot}
        interventionId={mockIntervention.id}
        onSuccess={() => setShowCancelSlot(false)}
      />

      {/* Multi-Slot Response Modal (unified modal for all slot responses) */}
      <MultiSlotResponseModal
        isOpen={showMultiSlotResponse}
        onClose={() => setShowMultiSlotResponse(false)}
        slots={mockSlots.map(s => ({
          id: s.id,
          slot_date: s.slot_date,
          start_time: s.start_time,
          end_time: s.end_time,
          notes: s.notes,
          proposer_name: "Jean Dupont",
          proposer_role: "prestataire" as const,
          // Ajouter les réponses mockées pour tester les indicateurs
          responses: mockSlotResponses[s.id as keyof typeof mockSlotResponses] || []
        }))}
        interventionId={mockIntervention.id}
        onSuccess={() => { setShowMultiSlotResponse(false); alert("Responses saved!") }}
      />

      {/* Quote Modals */}
      <QuoteRequestModal
        isOpen={showQuoteRequest}
        onClose={() => setShowQuoteRequest(false)}
        intervention={mockIntervention}
        deadline={quoteDeadline}
        additionalNotes={quoteNotes}
        selectedProviderId={selectedProviderId}
        providers={mockProviders}
        onDeadlineChange={setQuoteDeadline}
        onNotesChange={setQuoteNotes}
        onProviderSelect={(id) => setSelectedProviderId(id)}
        onSubmit={() => { setShowQuoteRequest(false); alert("Quote requested!") }}
        isLoading={false}
        error={null}
      />

      <QuoteSubmissionModal
        open={showQuoteSubmission}
        onOpenChange={setShowQuoteSubmission}
        intervention={{
          id: mockIntervention.id,
          title: mockIntervention.title,
          description: mockIntervention.description,
          urgency: mockIntervention.urgency,
          type: mockIntervention.type
        }}
        onSuccess={() => setShowQuoteSubmission(false)}
      />

      <QuoteApprovalModal
        isOpen={showQuoteApproval}
        onClose={() => setShowQuoteApproval(false)}
        quote={{
          id: mockQuote.id,
          providerName: mockQuote.provider_name,
          totalAmount: mockQuote.total_amount
        }}
        onSuccess={() => setShowQuoteApproval(false)}
      />

      <QuoteRejectionModal
        isOpen={showQuoteRejection}
        onClose={() => setShowQuoteRejection(false)}
        quote={{
          id: mockQuote.id,
          providerName: mockQuote.provider_name,
          totalAmount: mockQuote.total_amount
        }}
        onSuccess={() => setShowQuoteRejection(false)}
      />

      <QuoteCancellationModal
        isOpen={showQuoteCancellation}
        isLoading={false}
        onConfirm={() => { setShowQuoteCancellation(false); alert("Quote cancelled!") }}
        onCancel={() => setShowQuoteCancellation(false)}
      />

      <QuoteRequestSuccessModal
        isOpen={showQuoteRequestSuccess}
        onClose={() => setShowQuoteRequestSuccess(false)}
        providerName="Jean Dupont Plomberie"
        interventionTitle={mockIntervention.title}
      />

      <CancelQuoteRequestModal
        isOpen={showCancelQuoteRequest}
        onClose={() => setShowCancelQuoteRequest(false)}
        onConfirm={() => { setShowCancelQuoteRequest(false); alert("Cancelled!") }}
        providerName="Jean Dupont Plomberie"
        isLoading={false}
      />

      <CancelQuoteConfirmModal
        isOpen={showCancelQuoteConfirm}
        onClose={() => setShowCancelQuoteConfirm(false)}
        onConfirm={() => { setShowCancelQuoteConfirm(false); alert("Confirmed!") }}
        providerName="Jean Dupont Plomberie"
        isLoading={false}
      />
    </div>
  )
}
