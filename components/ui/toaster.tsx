"use client"

import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
      case "destructive":
        return <XCircle className="h-5 w-5 text-red-600 shrink-0" />
      default:
        return <Info className="h-5 w-5 text-sky-600 shrink-0" />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start space-x-3 w-full">
              {getIcon(variant)}
              <div className="flex-1 space-y-1">
                {title && (
                  <ToastTitle className="text-sm font-semibold">
                    {title}
                  </ToastTitle>
                )}
                {description && (
                  <ToastDescription className="text-sm opacity-90">
                    {description}
                  </ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
