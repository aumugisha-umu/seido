'use client'

import { Badge } from '@/components/ui/badge'
import { Bot, Clock, Globe } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface AiSourceBadgeProps {
  source: string | null
  /** For gestionnaire view -- show full details */
  detailed?: boolean
  /** Call duration in seconds */
  durationSeconds?: number | null
  /** Detected language */
  language?: string | null
}

const LANG_LABELS: Record<string, string> = {
  fr: 'Francais',
  nl: 'Neerlandais',
  en: 'Anglais',
}

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

function AiSourceBadge({
  source,
  detailed = false,
  durationSeconds,
  language,
}: AiSourceBadgeProps) {
  if (source !== 'phone_ai') return null

  const badge = (
    <Badge
      className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700"
    >
      <Bot className="size-3" />
      {detailed ? 'Assistant IA' : 'IA'}
    </Badge>
  )

  if (!detailed) return badge

  const hasDetails = durationSeconds != null || language != null

  if (!hasDetails) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <span className="font-medium">Cree par Assistant IA</span>
          {durationSeconds != null && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3" />
              {formatDuration(durationSeconds)}
            </span>
          )}
          {language != null && (
            <span className="flex items-center gap-1.5">
              <Globe className="size-3" />
              {LANG_LABELS[language] ?? language}
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export { AiSourceBadge }
