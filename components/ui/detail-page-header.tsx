'use client'

/**
 * Detail Page Header Component
 *
 * Unified sticky header for all detail pages (intervention, building, lot, contact)
 * Follows the same pattern as StepProgressHeader used in creation pages
 *
 * Features:
 * - Sticky positioning (stuck below main app header)
 * - White background with shadow
 * - Left: Back button
 * - Center: Title + Badges + Metadata
 * - Right: Primary actions + Dropdown menu
 * - Responsive design (mobile/tablet/desktop)
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

export interface DetailPageHeaderBadge {
  label: string
  icon?: LucideIcon
  color: string // Tailwind classes (e.g., "bg-blue-100 text-blue-800 border-blue-200")
  dotColor?: string // For the colored dot (e.g., "bg-blue-500")
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
  // Navigation
  onBack: () => void
  backButtonText?: string

  // Content
  title: string
  subtitle?: string

  // Badges (status, urgency, etc.)
  badges?: DetailPageHeaderBadge[]

  // Metadata (building, date, user, etc.)
  metadata?: DetailPageHeaderMetadata[]

  // Actions
  primaryActions?: DetailPageHeaderAction[]
  dropdownActions?: DetailPageHeaderAction[]

  // Custom action buttons (replaces primaryActions/dropdownActions when provided)
  actionButtons?: React.ReactNode

  // Status indicator (optional alert/warning banner)
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
      {/* Sticky Header - Stuck below main app header (top-16 = 64px) */}
      <div className="sticky top-16 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="content-max-width px-4 sm:px-6">
          <div className="h-16 flex items-center gap-3 sm:gap-6">
            {/* LEFT: Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{backButtonText}</span>
            </Button>

            {/* CENTER: Title + Badges + Metadata */}
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 min-w-0">
              {/* Title */}
              <h1 className="text-base sm:text-lg font-semibold truncate">
                {title}
              </h1>

              {/* Badges */}
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

              {/* Metadata (hidden on small screens) */}
              {metadata.length > 0 && (
                <div className="hidden lg:flex items-center gap-3 text-sm text-gray-600">
                  {metadata.map((item, idx) => (
                    <span key={idx} className="flex items-center gap-1">
                      <item.icon className="h-4 w-4" />
                      <span>{item.text}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Custom Action Buttons (if provided) */}
              {actionButtons ? (
                actionButtons
              ) : (
                <>
                  {/* Primary Actions */}
                  {primaryActions.map((action, idx) => (
                    <Button
                      key={idx}
                      variant={action.variant || 'outline'}
                      size="sm"
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className="flex items-center gap-1.5"
                    >
                      <action.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{action.label}</span>
                    </Button>
                  ))}

                  {/* Dropdown Menu for Secondary Actions */}
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
        </div>
      </div>

      {/* Optional Status Indicator Banner */}
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

      {/* Subtitle (if provided) */}
      {subtitle && (
        <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b text-sm text-gray-600">
          <div className="content-max-width">{subtitle}</div>
        </div>
      )}
    </>
  )
}
