'use client'

/**
 * Overview Tab Component for Gestionnaire
 * Displays intervention details, status timeline, assignments, and workflow actions
 */

import { useState } from 'react'
import { InterventionOverviewCard } from '@/components/interventions/intervention-overview-card'
import { AssignmentCard } from '@/components/interventions/assignment-card'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { toast } from 'sonner'
import { assignUserAction, unassignUserAction } from '@/app/actions/intervention-actions'
import { createBrowserSupabaseClient } from '@/lib/services'
import { UserPlus, Activity, AlertCircle } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Intervention = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  tenant?: Database['public']['Tables']['users']['Row']
}

type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface OverviewTabProps {
  intervention: Intervention
  assignments: Assignment[]
  onRefresh: () => void
}

export function OverviewTab({
  intervention,
  assignments,
  onRefresh
}: OverviewTabProps) {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'gestionnaire' | 'prestataire'>('prestataire')
  const [availableUsers, setAvailableUsers] = useState<Database['public']['Tables']['users']['Row'][]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [assigning, setAssigning] = useState(false)

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
        toast.error(result.error)
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
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error('Erreur lors du retrait de l\'attribution')
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Intervention details */}
          <InterventionOverviewCard intervention={intervention} />
        </div>

        {/* Right column - Assignments */}
        <div className="space-y-6">
          {/* Assignments */}
          <AssignmentCard
            assignments={assignments}
            canManage={true}
            onAssign={handleOpenAssignDialog}
            onRemove={handleRemoveAssignment}
          />

          {/* Alerts or important notes */}
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
    </>
  )
}