'use client'

/**
 * Success Header Component
 *
 * Animated header for celebrating successful intervention creation.
 * Addresses the need for positive feedback and celebration.
 *
 * @see docs/design/ux-role-locataire.md - Micro-interactions: Confetti animation + "Demande envoyée!"
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, Sparkles, Send, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuccessHeaderProps {
  variant: 'tenant' | 'manager'
  interventionTitle?: string
  className?: string
}

export function SuccessHeader({
  variant,
  interventionTitle,
  className,
}: SuccessHeaderProps) {
  const [showSparkles, setShowSparkles] = useState(true)

  // Disable sparkles animation after 3 seconds for performance
  useEffect(() => {
    const timer = setTimeout(() => setShowSparkles(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const isTenant = variant === 'tenant'

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        isTenant
          ? "bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50"
          : "bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50",
        "border-b",
        isTenant ? "border-green-100" : "border-blue-100",
        "py-5 px-5",
        className
      )}
    >
      {/* Animated sparkles background (reduced motion safe) */}
      {showSparkles && (
        <div
          className="absolute inset-0 pointer-events-none motion-reduce:hidden"
          aria-hidden="true"
        >
          {/* Floating sparkles */}
          {[...Array(6)].map((_, i) => (
            <Sparkles
              key={i}
              className={cn(
                "absolute w-4 h-4 opacity-0",
                isTenant ? "text-green-300" : "text-blue-300",
                "animate-[sparkle_2s_ease-in-out_forwards]"
              )}
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex items-center gap-4 relative z-10">
        {/* Success icon with animation */}
        <div
          className={cn(
            "flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center",
            "animate-in zoom-in duration-500",
            "shadow-lg",
            isTenant
              ? "bg-gradient-to-br from-green-400 to-emerald-500"
              : "bg-gradient-to-br from-blue-400 to-indigo-500"
          )}
        >
          {isTenant ? (
            <Send className="w-6 h-6 text-white" />
          ) : (
            <Users className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2
              className={cn(
                "text-lg font-bold leading-tight animate-in fade-in slide-in-from-left-3 duration-500",
                isTenant ? "text-green-900" : "text-blue-900"
              )}
            >
              {isTenant ? 'Demande envoyée ! 🎉' : 'Intervention créée !'}
            </h2>
            <CheckCircle2
              className={cn(
                "w-5 h-5 animate-in zoom-in duration-700 delay-300",
                isTenant ? "text-green-600" : "text-blue-600"
              )}
            />
          </div>

          <p
            className={cn(
              "text-sm animate-in fade-in slide-in-from-left-3 duration-700 delay-100",
              isTenant ? "text-green-700" : "text-blue-700"
            )}
          >
            {isTenant
              ? "C'est noté ! On revient vers vous sous 24h"
              : 'Tous les participants ont été notifiés'}
          </p>

          {interventionTitle && (
            <p
              className={cn(
                "text-xs mt-1 truncate animate-in fade-in duration-1000 delay-200",
                isTenant ? "text-green-600/80" : "text-blue-600/80"
              )}
            >
              {interventionTitle}
            </p>
          )}
        </div>
      </div>

      {/* Custom animation keyframes */}
      <style jsx>{`
        @keyframes sparkle {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.2) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.5) rotate(360deg) translateY(-20px);
          }
        }
      `}</style>
    </div>
  )
}
