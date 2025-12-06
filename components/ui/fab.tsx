"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Plus, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface FABAction {
    id: string
    label: string
    icon: LucideIcon
    onClick: () => void
    variant?: 'default' | 'primary' | 'secondary' | 'destructive'
}

interface FABProps {
    /** Main actions to show when FAB is expanded */
    actions: FABAction[]
    /** Position on screen */
    position?: 'bottom-right' | 'bottom-center' | 'bottom-left'
    /** Main button icon when closed */
    mainIcon?: LucideIcon
    /** Custom main button label (for accessibility) */
    mainLabel?: string
    /** Additional CSS classes */
    className?: string
    /** Only show on mobile */
    mobileOnly?: boolean
}

// ============================================================================
// STYLES
// ============================================================================

const positionStyles = {
    'bottom-right': 'right-4 bottom-20 sm:bottom-4',
    'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20 sm:bottom-4',
    'bottom-left': 'left-4 bottom-20 sm:bottom-4'
}

const actionVariantStyles = {
    default: 'bg-card hover:bg-muted text-foreground shadow-lg',
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-lg',
    destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/25'
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FAB({
    actions,
    position = 'bottom-right',
    mainIcon: MainIcon = Plus,
    mainLabel = "Actions rapides",
    className,
    mobileOnly = true
}: FABProps) {
    const [isOpen, setIsOpen] = useState(false)

    const toggle = useCallback(() => {
        setIsOpen(prev => !prev)
    }, [])

    const handleActionClick = useCallback((action: FABAction) => {
        action.onClick()
        setIsOpen(false)
    }, [])

    return (
        <div
            className={cn(
                "fixed z-50",
                positionStyles[position],
                mobileOnly && "lg:hidden",
                className
            )}
        >
            {/* Backdrop when open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Action Buttons */}
            <div
                className={cn(
                    "flex flex-col-reverse items-end gap-3 mb-4 transition-all duration-300",
                    isOpen
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none"
                )}
            >
                {actions.map((action, index) => {
                    const Icon = action.icon
                    return (
                        <div
                            key={action.id}
                            className={cn(
                                "flex items-center gap-3 transition-all duration-200",
                                isOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                            )}
                            style={{
                                transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                            }}
                        >
                            {/* Label */}
                            <span className="bg-card/95 backdrop-blur-sm text-foreground text-sm font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                                {action.label}
                            </span>

                            {/* Action Button */}
                            <Button
                                size="icon"
                                className={cn(
                                    "h-12 w-12 rounded-full transition-all",
                                    actionVariantStyles[action.variant || 'default']
                                )}
                                onClick={() => handleActionClick(action)}
                                aria-label={action.label}
                            >
                                <Icon className="h-5 w-5" />
                            </Button>
                        </div>
                    )
                })}
            </div>

            {/* Main FAB Button */}
            <Button
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-xl transition-all duration-300",
                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                    "shadow-primary/30 hover:shadow-primary/40 hover:shadow-2xl",
                    isOpen && "rotate-45 bg-muted hover:bg-muted/90 text-muted-foreground shadow-lg"
                )}
                onClick={toggle}
                aria-label={mainLabel}
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <X className="h-6 w-6" />
                ) : (
                    <MainIcon className="h-6 w-6" />
                )}
            </Button>
        </div>
    )
}

// ============================================================================
// PRESET FOR GESTIONNAIRE DASHBOARD
// ============================================================================

import { Wrench, FileText, Building2, Home, UserPlus } from "lucide-react"

interface GestionnaireFABProps {
    onCreateIntervention: () => void
    onCreateContract: () => void
    onCreateBuilding: () => void
    onCreateLot: () => void
    onCreateContact: () => void
}

export function GestionnaireFAB({
    onCreateIntervention,
    onCreateContract,
    onCreateBuilding,
    onCreateLot,
    onCreateContact
}: GestionnaireFABProps) {
    const actions: FABAction[] = [
        {
            id: 'intervention',
            label: 'Nouvelle intervention',
            icon: Wrench,
            onClick: onCreateIntervention,
            variant: 'primary'
        },
        {
            id: 'contract',
            label: 'Nouveau contrat',
            icon: FileText,
            onClick: onCreateContract,
            variant: 'default'
        },
        {
            id: 'building',
            label: 'Nouvel immeuble',
            icon: Building2,
            onClick: onCreateBuilding,
            variant: 'default'
        },
        {
            id: 'lot',
            label: 'Nouveau lot',
            icon: Home,
            onClick: onCreateLot,
            variant: 'default'
        },
        {
            id: 'contact',
            label: 'Nouveau contact',
            icon: UserPlus,
            onClick: onCreateContact,
            variant: 'default'
        }
    ]

    return <FAB actions={actions} position="bottom-right" />
}
