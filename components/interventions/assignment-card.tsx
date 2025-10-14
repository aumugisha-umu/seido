'use client'

/**
 * Assignment Card Component
 * Displays current assignments for an intervention
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Users,
  UserPlus,
  UserMinus,
  MoreVertical,
  Phone,
  Mail,
  Star,
  Calendar,
  Briefcase
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { Database } from '@/lib/database.types'

type Assignment = Database['public']['Tables']['intervention_assignments']['Row'] & {
  user?: Database['public']['Tables']['users']['Row']
}

interface AssignmentCardProps {
  assignments: Assignment[]
  canManage?: boolean
  onAssign?: () => void
  onRemove?: (assignmentId: string) => void
}

// Role colors and labels
const roleConfig = {
  gestionnaire: {
    label: 'Gestionnaire',
    color: 'bg-blue-100 text-blue-800',
    icon: Users
  },
  prestataire: {
    label: 'Prestataire',
    color: 'bg-purple-100 text-purple-800',
    icon: Briefcase
  }
}

export function AssignmentCard({
  assignments,
  canManage = false,
  onAssign,
  onRemove
}: AssignmentCardProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Group assignments by role
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const role = assignment.role as 'gestionnaire' | 'prestataire'
    if (!acc[role]) acc[role] = []
    acc[role].push(assignment)
    return acc
  }, {} as Record<string, Assignment[]>)

  // Handle remove with confirmation
  const handleRemove = async (assignmentId: string) => {
    if (!onRemove) return

    setRemovingId(assignmentId)
    try {
      await onRemove(assignmentId)
      toast.success('Attribution retirée avec succès')
    } catch (error) {
      toast.error('Erreur lors du retrait de l\'attribution')
    } finally {
      setRemovingId(null)
    }
  }

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Format assignment date
  const formatAssignmentDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Attributions
          </CardTitle>
          {canManage && onAssign && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAssign}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Attribuer
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {assignments.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Aucune attribution pour le moment
            </p>
            {canManage && onAssign && (
              <Button
                variant="outline"
                size="sm"
                onClick={onAssign}
                className="mt-3"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Faire la première attribution
              </Button>
            )}
          </div>
        ) : (
          Object.entries(groupedAssignments).map(([role, roleAssignments]) => {
            const config = roleConfig[role as keyof typeof roleConfig]
            if (!config) return null
            const RoleIcon = config.icon

            return (
              <div key={role} className="space-y-3">
                <div className="flex items-center gap-2">
                  <RoleIcon className="w-4 h-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium">{config.label}s</h4>
                  <Badge variant="secondary" className="text-xs">
                    {roleAssignments.length}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {roleAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {assignment.user?.avatar_url && (
                            <AvatarImage src={assignment.user.avatar_url} />
                          )}
                          <AvatarFallback className={config.color}>
                            {assignment.user ? getInitials(assignment.user.name) : '?'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">
                              {assignment.user?.name || 'Utilisateur inconnu'}
                            </p>
                            {assignment.is_primary && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="w-3 h-3 mr-1" />
                                Principal
                              </Badge>
                            )}
                          </div>

                          {assignment.user && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {assignment.user.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {assignment.user.email}
                                </span>
                              )}
                              {assignment.user.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {assignment.user.phone}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            Attribué le {formatAssignmentDate(assignment.assigned_at)}
                          </div>

                          {assignment.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Note: {assignment.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {canManage && onRemove && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={removingId === assignment.id}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleRemove(assignment.id)}
                              className="text-red-600"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              Retirer l'attribution
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}

        {/* Statistics */}
        {assignments.length > 0 && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total des attributions</p>
                <p className="font-medium">{assignments.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Attributions principales</p>
                <p className="font-medium">
                  {assignments.filter((a) => a.is_primary).length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}