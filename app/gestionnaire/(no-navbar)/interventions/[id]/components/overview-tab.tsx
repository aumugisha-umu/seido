'use client'

/**
 * Overview Tab Component for Gestionnaire
 * Displays intervention details, status timeline, assignments, and workflow actions
 */

import { useState } from 'react'
import { InterventionOverviewCard } from '@/components/interventions/intervention-overview-card'
import { InterventionProgressCard } from '@/components/interventions/intervention-progress-card'
import { InterventionCommentsCard } from '@/components/interventions/intervention-comments-card'
import { CancelQuoteRequestModal } from '@/components/intervention/modals/cancel-quote-request-modal'
import { useQuoteCancellation } from '@/hooks/use-quote-cancellation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatErrorMessage } from '@/lib/utils/error-formatter'
import { assignUserAction, unassignUserAction } from '@/app/actions/intervention-actions'
import { createBrowserSupabaseClient } from '@/lib/services'
import { UserPlus, AlertCircle } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type Quote = Database['public']['Tables']['intervention_quotes']['Row'] & {
  provider?: Database['public']['Tables']['users']['Row']
}

type TimeSlotResponse = Database['public']['Tables']['time_slot_responses']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

type TimeSlot = Database['public']['Tables']['intervention_time_slots']['Row'] & {
  proposed_by_user?: Database['public']['Tables']['users']['Row']
  responses?: TimeSlotResponse[]
}

interface Contact {
  id: string
  name: string
  email: string
  phone?: string | null
  type?: "gestionnaire" | "prestataire" | "locataire"
}

interface TimeSlotForPreview {
  date: string
  startTime: string
  endTime: string
}

interface Comment {
  id: string
  content: string
  created_at: string
  user?: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name' | 'email' | 'avatar_url' | 'role'>
}

interface OverviewTabProps {
  intervention: Intervention
  assignments: Assignment[]
  quotes: Quote[]
  timeSlots: TimeSlot[]
  comments: Comment[]
  currentUserId: string
  currentUserRole: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire' | 'proprietaire'
  onRefresh: () => void
  onOpenProgrammingModal?: () => void
  onCancelSlot?: (slot: TimeSlot) => void
  onApproveSlot?: (slot: TimeSlot) => void
  onRejectSlot?: (slot: TimeSlot) => void
  onEditSlot?: (slot: TimeSlot) => void
  onEditParticipants?: () => void
  onEditQuotes?: () => void
  // Quote approval/rejection handlers
  onApproveQuote?: (quoteId: string) => void
  onRejectQuote?: (quoteId: string) => void
}

export function OverviewTab({
  intervention,
  assignments,
  quotes,
  timeSlots,
  comments,
  currentUserId,
  currentUserRole,
  onRefresh,
  onOpenProgrammingModal,
  onCancelSlot,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  onEditParticipants,
  onEditQuotes,
  onApproveQuote,
  onRejectQuote
}: OverviewTabProps) {
  // Transform assignments into contacts grouped by role
  const managers: Contact[] = assignments
    .filter(a => a.role === 'gestionnaire' && a.user)
    .map(a => ({
      id: a.user!.id,
      name: a.user!.name,
      email: a.user!.email || '',
      phone: a.user!.phone || null,
      type: 'gestionnaire' as const
    }))

  const providers: Contact[] = assignments
    .filter(a => a.role === 'prestataire' && a.user)
    .map(a => ({
      id: a.user!.id,
      name: a.user!.name,
      email: a.user!.email || '',
      phone: a.user!.phone || null,
      type: 'prestataire' as const
    }))

  const tenants: Contact[] = assignments
    .filter(a => a.role === 'locataire' && a.user)
    .map(a => ({
      id: a.user!.id,
      name: a.user!.name,
      email: a.user!.email || '',
      phone: a.user!.phone || null,
      type: 'locataire' as const
    }))

  // Transform time slots for preview
  const schedulingSlotsForPreview: TimeSlotForPreview[] = timeSlots
    .filter(ts => ts.slot_date && ts.start_time && ts.end_time)
    .map(ts => ({
      date: ts.slot_date!,
      startTime: ts.start_time!,
      endTime: ts.end_time!
    }))

  // Scheduling type is determined ONLY from the DB field (no fallback inference)
  // This decouples TYPE display from DATA display (slots/dates are shown separately)
  const schedulingType = intervention.scheduling_type as 'fixed' | 'slots' | 'flexible' | null

  // Check if quote is required (status or active quotes)
  const requireQuote = intervention.status === 'demande_de_devis' ||
    quotes.some(q => ['pending', 'sent', 'accepted'].includes(q.status))
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'gestionnaire' | 'prestataire'>('prestataire')
  const [availableUsers, setAvailableUsers] = useState<Database['public']['Tables']['users']['Row'][]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [assigning, setAssigning] = useState(false)

  // Quote cancellation hook
  const {
    isLoading: isCancellingQuote,
    isConfirmModalOpen: isCancelQuoteModalOpen,
    handleCancelRequest: handleCancelQuoteRequest,
    handleConfirmCancel: handleConfirmCancelQuote,
    handleCancelModal: handleCloseCancelQuoteModal
  } = useQuoteCancellation({
    onSuccess: onRefresh
  })

  // Load available users based on role
  const loadAvailableUsers = async (role: 'gestionnaire' | 'prestataire') => {
    setLoadingUsers(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', role)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoadingUsers(false)
    }
  }

  // Handle role change
  const handleRoleChange = (role: 'gestionnaire' | 'prestataire') => {
    setSelectedRole(role)
    setSelectedUserId('')
    loadAvailableUsers(role)
  }

  // Open assign dialog
  const handleOpenAssignDialog = () => {
    setAssignDialogOpen(true)
    loadAvailableUsers(selectedRole)
  }

  // Handle assign user
  const handleAssignUser = async () => {
    if (!selectedUserId) {
      toast.error('Veuillez sélectionner un utilisateur')
      return
    }

    setAssigning(true)
    try {
      const result = await assignUserAction(intervention.id, selectedUserId, selectedRole)
      if (result.success) {
        toast.success('Utilisateur attribué avec succès')
        setAssignDialogOpen(false)
        setSelectedUserId('')
        onRefresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors de l\'attribution'))
      }
    } catch (error) {
      console.error('Error assigning user:', error)
      toast.error('Erreur lors de l\'attribution')
    } finally {
      setAssigning(false)
    }
  }

  // Handle remove assignment
  const handleRemoveAssignment = async (assignmentId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId)
    if (!assignment) return

    try {
      const result = await unassignUserAction(
        intervention.id,
        assignment.user_id,
        assignment.role
      )
      if (result.success) {
        toast.success('Attribution retirée avec succès')
        onRefresh()
      } else {
        toast.error(formatErrorMessage(result.error, 'Erreur lors du retrait de l\'attribution'))
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error('Erreur lors du retrait de l\'attribution')
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-6">
          <InterventionOverviewCard
            intervention={intervention}
            managers={managers}
            providers={providers}
            tenants={tenants}
            requireQuote={requireQuote}
            quotes={quotes}
            schedulingType={schedulingType}
            schedulingSlots={schedulingSlotsForPreview}
            fullTimeSlots={timeSlots}
            onOpenProgrammingModal={onOpenProgrammingModal}
            onCancelSlot={onCancelSlot}
            onApproveSlot={onApproveSlot}
            onRejectSlot={onRejectSlot}
            onEditSlot={onEditSlot}
            canManageSlots={['approuvee', 'demande_de_devis', 'planification'].includes(intervention.status)}
            currentUserId={currentUserId}
            onEditParticipants={onEditParticipants}
            onEditQuotes={onEditQuotes}
            currentUserRole={currentUserRole}
            onUpdate={onRefresh}
            onCancelQuoteRequest={handleCancelQuoteRequest}
            onApproveQuote={onApproveQuote}
            onRejectQuote={onRejectQuote}
          />

          {/* Alert for urgent intervention */}
          {intervention.urgency === 'urgente' && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  Intervention urgente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-orange-700">
                  Cette intervention est marquée comme urgente et nécessite une attention prioritaire.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar - 1/3 width on large screens */}
        <div className="space-y-6">
          {/* Comments Card - AU-DESSUS de Progression */}
          <InterventionCommentsCard
            interventionId={intervention.id}
            comments={comments}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
          />

          {/* Progression Card */}
          <InterventionProgressCard intervention={intervention} />
        </div>
      </div>

      {/* Assign User Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attribuer un utilisateur</DialogTitle>
            <DialogDescription>
              Sélectionnez un utilisateur à attribuer à cette intervention
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => handleRoleChange(value as 'gestionnaire' | 'prestataire')}
                disabled={loadingUsers}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                  <SelectItem value="prestataire">Prestataire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Utilisateur</Label>
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={loadingUsers || availableUsers.length === 0}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder={
                    loadingUsers
                      ? "Chargement..."
                      : availableUsers.length === 0
                        ? "Aucun utilisateur disponible"
                        : "Sélectionnez un utilisateur"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers
                    .filter(user => !assignments.some(a => a.user_id === user.id))
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} {user.email && `(${user.email})`}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={assigning}
            >
              Annuler
            </Button>
            <Button
              onClick={handleAssignUser}
              disabled={!selectedUserId || assigning}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {assigning ? 'Attribution...' : 'Attribuer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Quote Request Modal */}
      <CancelQuoteRequestModal
        isOpen={isCancelQuoteModalOpen}
        onClose={handleCloseCancelQuoteModal}
        onConfirm={handleConfirmCancelQuote}
        providerName={quotes.find(q => q.id === quotes[0]?.id)?.provider?.name || 'Prestataire'}
        isLoading={isCancellingQuote}
      />
    </>
  )
}