'use client'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AlertCircle, MoreVertical, MessageSquareText, Loader2 } from 'lucide-react'
import type { RoleBasedAction } from '@/lib/intervention-action-utils'
import { toButtonVariant } from '@/lib/intervention-action-utils'
import type { SharedComment } from './intervention-detail-types'

interface InterventionHeaderActionsProps {
  interventionStatus: string
  quotes: Array<{ id: string; status: string }>
  headerActions: RoleBasedAction[]
  dotMenuActions: RoleBasedAction[]
  transformedComments: SharedComment[]
  actionLoading: string | null
  onHeaderActionClick: (action: RoleBasedAction) => void
  onOpenCommentsModal: () => void
}

const shouldShowActionBadge = (
  status: string,
): boolean => {
  switch (status) {
    case 'demande':
    case 'approuvee':
    case 'cloturee_par_prestataire':
    case 'cloturee_par_locataire':
      return true
    default:
      return false
  }
}

export function InterventionHeaderActions({
  interventionStatus,
  headerActions,
  dotMenuActions,
  transformedComments,
  actionLoading,
  onHeaderActionClick,
  onOpenCommentsModal,
}: InterventionHeaderActionsProps) {
  const showBadge = shouldShowActionBadge(interventionStatus)

  return (
    <>
      {/* Desktop Layout (>=1024px) */}
      <div className="hidden lg:flex lg:items-center lg:gap-2 transition-all duration-200">
        {showBadge && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-xs font-medium text-amber-900 whitespace-nowrap">
              Action en attente
            </span>
          </div>
        )}

        {transformedComments.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenCommentsModal}
                  className="gap-2 min-h-[36px] relative"
                >
                  <MessageSquareText className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                    {transformedComments.length}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transformedComments.length} commentaire{transformedComments.length > 1 ? 's' : ''} interne{transformedComments.length > 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {headerActions.map((action, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={toButtonVariant(action.variant)}
                  size="sm"
                  onClick={() => onHeaderActionClick(action)}
                  disabled={actionLoading === action.actionType}
                  className={`gap-2 min-h-[36px] ${
                    action.variant === 'primary' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''
                  }`}
                >
                  {actionLoading === action.actionType ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <action.icon className="w-4 h-4" />
                  )}
                  <span>{action.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}

        {dotMenuActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">Plus d&apos;actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dotMenuActions.map((action, idx) => (
                <DropdownMenuItem
                  key={idx}
                  onClick={() => onHeaderActionClick(action)}
                  className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600 focus:bg-red-50' : ''}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Tablet Layout (768-1023px) */}
      <div className="hidden md:flex lg:hidden items-center gap-2 transition-all duration-200">
        {showBadge && (
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span className="sr-only">Action en attente</span>
          </div>
        )}

        {transformedComments.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenCommentsModal}
            className="h-9 w-9 relative"
          >
            <MessageSquareText className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
              {transformedComments.length}
            </span>
            <span className="sr-only">{transformedComments.length} commentaires</span>
          </Button>
        )}

        {headerActions.map((action, idx) => (
          <Button
            key={idx}
            variant={toButtonVariant(action.variant)}
            size="sm"
            onClick={() => onHeaderActionClick(action)}
            disabled={actionLoading === action.actionType}
            className={`gap-1.5 min-h-[36px] ${
              action.variant === 'primary' ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''
            }`}
          >
            {actionLoading === action.actionType ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <action.icon className="w-4 h-4" />
            )}
            <span>{action.label}</span>
          </Button>
        ))}

        {dotMenuActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
                <span className="sr-only">Plus d&apos;actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {dotMenuActions.map((action, idx) => (
                <DropdownMenuItem
                  key={idx}
                  onClick={() => onHeaderActionClick(action)}
                  className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600 focus:bg-red-50' : ''}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mobile Layout (<768px) */}
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="relative gap-2 min-h-[44px]"
            >
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
              <MoreVertical className="w-4 h-4" />
              <span>Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {showBadge && (
              <>
                <div className="px-2 py-1.5 text-xs font-medium text-amber-900 bg-amber-50 rounded-sm mx-1 mb-1">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Action en attente
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {transformedComments.length > 0 && (
              <>
                <DropdownMenuItem onClick={onOpenCommentsModal}>
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  Commentaires ({transformedComments.length})
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {headerActions.map((action, idx) => (
              <DropdownMenuItem
                key={idx}
                onClick={() => onHeaderActionClick(action)}
                disabled={actionLoading === action.actionType}
                className={
                  action.variant === 'primary' ? 'text-green-700 focus:text-green-800 focus:bg-green-50' :
                  action.variant === 'destructive' ? 'text-red-700 focus:text-red-800 focus:bg-red-50' : ''
                }
              >
                {actionLoading === action.actionType ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <action.icon className="w-4 h-4 mr-2" />
                )}
                {action.label}
              </DropdownMenuItem>
            ))}

            {dotMenuActions.length > 0 && headerActions.length > 0 && <DropdownMenuSeparator />}

            {dotMenuActions.map((action, idx) => (
              <DropdownMenuItem
                key={`dot-${idx}`}
                onClick={() => onHeaderActionClick(action)}
                className={action.variant === 'destructive' ? 'text-red-600 focus:text-red-600' : ''}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
