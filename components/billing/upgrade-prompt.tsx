'use client'

import { useRouter } from 'next/navigation'
import { Building2, Wrench, Download, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

type UpgradeContext = 'add_lot' | 'add_intervention' | 'export_data' | 'ai_feature'

interface UpgradePromptProps {
  context: UpgradeContext
  className?: string
}

// =============================================================================
// Config
// =============================================================================

const CONTEXT_CONFIG: Record<UpgradeContext, {
  icon: typeof Building2
  title: string
  description: string
  cta: string
}> = {
  add_lot: {
    icon: Building2,
    title: 'Limite de lots atteinte',
    description: 'Passez \u00e0 Pro pour g\u00e9rer plus de biens et d\u00e9bloquer toutes les fonctionnalit\u00e9s.',
    cta: 'Mettre \u00e0 niveau',
  },
  add_intervention: {
    icon: Wrench,
    title: 'Fonctionnalit\u00e9 r\u00e9serv\u00e9e aux abonn\u00e9s',
    description: 'Souscrivez un abonnement pour cr\u00e9er de nouvelles interventions.',
    cta: 'D\u00e9couvrir les plans',
  },
  export_data: {
    icon: Download,
    title: 'Export avanc\u00e9',
    description: 'L\u2019export de donn\u00e9es reste accessible m\u00eame en lecture seule (RGPD).',
    cta: '',
  },
  ai_feature: {
    icon: Sparkles,
    title: 'Fonctionnalit\u00e9 IA',
    description: 'Les fonctionnalit\u00e9s IA sont disponibles avec un abonnement actif.',
    cta: 'Voir les plans',
  },
}

// =============================================================================
// Component
// =============================================================================

export function UpgradePrompt({ context, className }: UpgradePromptProps) {
  const router = useRouter()
  const config = CONTEXT_CONFIG[context]
  const Icon = config.icon

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border bg-muted/30',
      className,
    )}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
        <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{config.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
      </div>

      {config.cta && (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
          onClick={() => router.push('/gestionnaire/settings/billing')}
        >
          {config.cta}
        </Button>
      )}
    </div>
  )
}
