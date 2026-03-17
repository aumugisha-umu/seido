'use client'

/**
 * Detail Page Header Component
 *
 * Renders into the full-width gestionnaire header via portal.
 * Status indicator and subtitle remain in the content flow below.
 */

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, MoreVertical, type LucideIcon } from 'lucide-react'
import { HeaderPortal } from '@/components/header-portal'

export interface DetailPageHeaderBadge {
  label: string
  icon?: LucideIcon
  color: string
  dotColor?: string
}

export interface DetailPageHeaderMetadata {
  icon: LucideIcon
  text: string
}

export interface DetailPageHeaderAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  disabled?: boolean
}

export interface DetailPageHeaderProps {
  onBack: () => void
  backButtonText?: string
  title: string
  subtitle?: string
  badges?: DetailPageHeaderBadge[]
  metadata?: DetailPageHeaderMetadata[]
  primaryActions?: DetailPageHeaderAction[]
  dropdownActions?: DetailPageHeaderAction[]
  actionButtons?: React.ReactNode
  statusIndicator?: {
    message: string
    variant: 'info' | 'warning' | 'error' | 'success'
  }
}

export function DetailPageHeader({
  onBack,
  backButtonText = 'Retour',
  title,
  subtitle,
  badges = [],
  metadata = [],
  primaryActions = [],
  dropdownActions = [],
  actionButtons,
  statusIndicator,
}: DetailPageHeaderProps) {
  return (
    <>
      {/* Main header content — rendered into full-width header via portal */}
      <HeaderPortal>
        <div className="flex items-center gap-2 sm:gap-4 w-full h-full">
          {/* LEFT: Back Button */}
          <Button
            variant="ghost"
            size="default"
            onClick={onBack}
            className="flex-shrink-0 text-gray-700 hover:text-gray-900 hover:bg-gray-100/80 active:bg-gray-200/80 transition-colors duration-200 h-9 px-2.5"
            aria-label={backButtonText}
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            <span className="hidden sm:inline ml-1.5 text-sm font-medium">{backButtonText}</span>
          </Button>

          {/* CENTER: Title + Badges + Metadata */}
          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-semibold truncate">
              {title}
            </h1>

            {badges.map((badge, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className={`text-xs flex items-center gap-1 ${badge.color}`}
              >
                {badge.dotColor && (
                  <div className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                )}
                {badge.icon && <badge.icon className="h-3 w-3" />}
                <span className="hidden sm:inline">{badge.label}</span>
              </Badge>
            ))}

            {metadata.length > 0 && (
              <div className="hidden lg:flex items-center gap-3 text-sm text-gray-600">
                {metadata.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1">
                    <item.icon className="h-3.5 w-3.5" />
                    <span className="text-xs">{item.text}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {actionButtons ? (
              actionButtons
            ) : (
              <>
                {primaryActions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className="flex items-center gap-1.5"
                  >
                    <action.icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                ))}

                {dropdownActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {dropdownActions.map((action, idx) => (
                        <div key={idx}>
                          {idx > 0 && action.label.toLowerCase().includes('supprimer') && (
                            <DropdownMenuSeparator />
                          )}
                          <DropdownMenuItem
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className="flex items-center gap-2"
                          >
                            <action.icon className="h-4 w-4" />
                            <span>{action.label}</span>
                          </DropdownMenuItem>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>
        </div>
      </HeaderPortal>

      {/* Status indicator and subtitle remain in the content flow */}
      {statusIndicator && (
        <div
          className={`
            px-4 sm:px-6 py-3 border-b text-sm
            ${
              statusIndicator.variant === 'warning'
                ? 'bg-orange-50 text-orange-900 border-orange-200'
                : statusIndicator.variant === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : statusIndicator.variant === 'success'
                ? 'bg-green-50 text-green-900 border-green-200'
                : 'bg-blue-50 text-blue-900 border-blue-200'
            }
          `}
        >
          <div className="content-max-width flex items-center gap-2">
            <span className="font-medium">{statusIndicator.message}</span>
          </div>
        </div>
      )}

      {subtitle && (
        <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b text-sm text-gray-600">
          <div className="content-max-width">{subtitle}</div>
        </div>
      )}
    </>
  )
}
