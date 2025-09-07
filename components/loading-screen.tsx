"use client"

import { Loader2 } from "lucide-react"

interface LoadingScreenProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingScreen({ message = "Chargement...", fullScreen = true }: LoadingScreenProps) {
  const containerClass = fullScreen 
    ? "flex items-center justify-center min-h-screen"
    : "flex items-center justify-center p-8"

  return (
    <div className={containerClass}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export function InlineLoader({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  )
}
