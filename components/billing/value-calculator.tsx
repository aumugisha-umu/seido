'use client'

import { Clock, Euro, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface ValueCalculatorProps {
  /** Number of completed (cloturees) interventions */
  completedInterventions: number
  className?: string
  variant?: 'card' | 'inline'
}

// =============================================================================
// Constants — Value assumptions
// =============================================================================

// Average time saved per intervention managed via SEIDO vs manual (phone/email/paper)
const MINUTES_SAVED_PER_INTERVENTION = 30
// Hourly rate for a gestionnaire's time (EUR)
const HOURLY_RATE = 45

// =============================================================================
// Component
// =============================================================================

export function ValueCalculator({
  completedInterventions,
  className,
  variant = 'card',
}: ValueCalculatorProps) {
  const hoursSaved = (completedInterventions * MINUTES_SAVED_PER_INTERVENTION) / 60
  const moneySaved = hoursSaved * HOURLY_RATE

  const metrics = [
    {
      icon: Wrench,
      value: completedInterventions,
      label: 'interventions g\u00e9r\u00e9es',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      icon: Clock,
      value: `${hoursSaved.toFixed(1)}h`,
      label: '\u00e9conomis\u00e9es',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      icon: Euro,
      value: `${Math.round(moneySaved)}\u20ac`,
      label: '\u00e9quivalent',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ]

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-6', className)}>
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <m.icon className={cn('h-4 w-4', m.color)} />
            <div>
              <span className="text-sm font-semibold text-foreground">{m.value}</span>
              <span className="text-xs text-muted-foreground ml-1">{m.label}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Votre valeur SEIDO</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center space-y-2">
              <div className={cn(
                'mx-auto w-10 h-10 rounded-lg flex items-center justify-center',
                m.bgColor,
              )}>
                <m.icon className={cn('h-5 w-5', m.color)} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3">
          Calcul : {MINUTES_SAVED_PER_INTERVENTION} min/intervention &times; {HOURLY_RATE}&euro;/h
        </p>
      </CardContent>
    </Card>
  )
}
