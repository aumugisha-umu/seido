'use client'

/**
 * PlanningCard - Card de gestion du planning et des créneaux
 *
 * @example
 * <PlanningCard
 *   timeSlots={slots}
 *   scheduledDate="2025-01-20"
 *   userRole="manager"
 *   currentUserId="user-123"
 *   onAddSlot={handleAdd}
 * />
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  CalendarCheck
} from 'lucide-react'
import { PlanningCardProps } from '../types'
import { TimeSlotCard } from '../atoms'
import { formatDate } from '../utils/helpers'
import { permissions } from '../utils'

/**
 * Card de planning
 */
export const PlanningCard = ({
  timeSlots = [],
  scheduledDate,
  userRole,
  currentUserId,
  onAddSlot,
  onSelectSlot,
  onApproveSlot,
  onRejectSlot,
  onEditSlot,
  onCancelSlot,
  onChooseSlot,
  isLoading = false,
  className
}: PlanningCardProps) => {
  const canPropose = permissions.canProposeTimeSlot(userRole)

  // Sépare les créneaux par statut
  const confirmedSlots = timeSlots.filter(s =>
    ['confirmed', 'selected'].includes(s.status)
  )
  const pendingSlots = timeSlots.filter(s =>
    ['pending', 'proposed'].includes(s.status)
  )

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Planning
          </CardTitle>

          {canPropose && onAddSlot && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddSlot}
              disabled={isLoading}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Proposer un créneau
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 overflow-y-auto">
        {/* Date planifiée confirmée */}
        {scheduledDate && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-green-100">
                <CalendarCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700">
                  Intervention planifiée
                </p>
                <p className="text-lg font-semibold text-green-800">
                  {formatDate(scheduledDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Créneaux confirmés */}
        {confirmedSlots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium">Créneau confirmé</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {confirmedSlots.map((slot) => (
                <TimeSlotCard
                  key={slot.id}
                  slot={slot}
                  userRole={userRole}
                  currentUserId={currentUserId}
                  variant="default"
                />
              ))}
            </div>
          </div>
        )}

        {/* Créneaux proposés / en attente */}
        {pendingSlots.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-medium">Créneaux proposés</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {pendingSlots.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingSlots.map((slot) => (
                <TimeSlotCard
                  key={slot.id}
                  slot={slot}
                  userRole={userRole}
                  currentUserId={currentUserId}
                  onSelect={onSelectSlot}
                  onApprove={onApproveSlot}
                  onReject={onRejectSlot}
                  onEdit={onEditSlot}
                  onCancel={onCancelSlot}
                  onChoose={onChooseSlot}
                  variant="default"
                />
              ))}
            </div>
          </div>
        )}

        {/* Message si aucun créneau et pas de date planifiée */}
        {!scheduledDate && timeSlots.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Calendar className="h-10 w-10 mb-2 text-slate-300" />
            <p className="text-sm">Aucun créneau proposé</p>
            {canPropose && onAddSlot && (
              <Button
                variant="link"
                size="sm"
                onClick={onAddSlot}
                className="mt-2"
              >
                Proposer un créneau
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Version compacte du planning (pour le résumé)
 */
export interface CompactPlanningProps {
  scheduledDate?: string | null
  slotsCount?: number
  className?: string
}

export const CompactPlanning = ({
  scheduledDate,
  slotsCount = 0,
  className
}: CompactPlanningProps) => {
  if (scheduledDate) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <CalendarCheck className="h-4 w-4 text-green-600" />
        <span className="text-sm font-medium">{formatDate(scheduledDate)}</span>
      </div>
    )
  }

  if (slotsCount > 0) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Clock className="h-4 w-4 text-amber-600" />
        <span className="text-sm text-muted-foreground">
          {slotsCount} créneau{slotsCount > 1 ? 'x' : ''} proposé{slotsCount > 1 ? 's' : ''}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Calendar className="h-4 w-4 text-slate-400" />
      <span className="text-sm text-muted-foreground">Non planifié</span>
    </div>
  )
}
