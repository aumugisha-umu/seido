'use client'

/**
 * InterventionDetailsCard - Card affichant les détails d'une intervention
 *
 * @example
 * <InterventionDetailsCard
 *   title="Fuite d'eau"
 *   description="Fuite importante sous l'évier de la cuisine"
 *   instructions="Merci de prévoir des joints de rechange"
 *   location="Appartement 3A, 15 rue de la Paix"
 * />
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { FileText, ListChecks, MapPin } from 'lucide-react'
import { InterventionDetailsCardProps } from '../types'

/**
 * Card de détails d'intervention
 */
export const InterventionDetailsCard = ({
  title,
  description,
  instructions,
  location,
  className
}: InterventionDetailsCardProps) => {
  const hasContent = description || instructions || location

  if (!hasContent) {
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {title || "Détails de l'intervention"}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {description && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-muted-foreground">
              Description
            </h4>
            <p className="text-sm leading-relaxed">{description}</p>
          </div>
        )}

        {/* Instructions pour le prestataire */}
        {instructions && (
          <>
            {description && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Instructions
              </h4>
              <p className="text-sm leading-relaxed">{instructions}</p>
            </div>
          </>
        )}

        {/* Localisation */}
        {location && (
          <>
            {(description || instructions) && <Separator />}
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Localisation
              </h4>
              <p className="text-sm">{location}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Version compacte de la card de détails
 */
export interface CompactDetailsCardProps {
  description?: string
  location?: string
  className?: string
}

export const CompactDetailsCard = ({
  description,
  location,
  className
}: CompactDetailsCardProps) => {
  return (
    <div className={cn('p-4 bg-slate-50 rounded-lg space-y-3', className)}>
      {description && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
          <p className="text-sm line-clamp-3">{description}</p>
        </div>
      )}

      {location && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{location}</span>
        </div>
      )}
    </div>
  )
}
