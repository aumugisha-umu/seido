"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UnifiedModalProps } from "./unified-modal.types"

/**
 * UnifiedModal - Composant modal réutilisable basé sur Radix Dialog
 *
 * Features:
 * - Responsive sizes (sm, md, lg, xl, full)
 * - Mobile bottom sheet for large modals
 * - BEM classes in globals.css
 * - Composable sub-components (Header, Body, Footer)
 * - Auto fallback DialogTitle for accessibility (always present as hidden fallback)
 */
export const UnifiedModal = ({
  open,
  onOpenChange,
  size = 'md',
  showCloseButton = true,
  preventCloseOnOutsideClick = false,
  preventCloseOnEscape = false,
  className,
  children,
  'aria-labelledby': ariaLabelledBy,
}: UnifiedModalProps & { 'aria-labelledby'?: string }) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay className="unified-modal__overlay" />

        {/* Content */}
        <DialogPrimitive.Content
          className={cn(
            "unified-modal__content",
            `unified-modal__content--${size}`,
            className
          )}
          aria-labelledby={ariaLabelledBy}
          onPointerDownOutside={(e) => {
            if (preventCloseOnOutsideClick) {
              e.preventDefault()
            }
          }}
          onEscapeKeyDown={(e) => {
            if (preventCloseOnEscape) {
              e.preventDefault()
            }
          }}
        >
          {/*
            Fallback visually hidden title/description for Radix accessibility requirement.
            UnifiedModalHeader provides the actual visible title via DialogPrimitive.Title.
            This hidden fallback ensures no console warning when header is not yet rendered
            or when modals use custom internal structures.
          */}
          <VisuallyHidden>
            <DialogPrimitive.Title>Modal</DialogPrimitive.Title>
            <DialogPrimitive.Description>Contenu de la modale</DialogPrimitive.Description>
          </VisuallyHidden>

          {children}

          {/* Default close button (top-right) */}
          {showCloseButton && (
            <DialogPrimitive.Close
              className="unified-modal__header-close absolute top-3 right-3"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

UnifiedModal.displayName = "UnifiedModal"
