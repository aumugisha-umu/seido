'use client';

/**
 * Import Step: Progress
 * Shows import progress with animation
 */

import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';

interface ImportStepProgressProps {
  wizard: UseImportWizardReturn;
}

export function ImportStepProgress({ wizard }: ImportStepProgressProps) {
  const { stats } = wizard;
  const total = stats?.total || 0;

  return (
    <div className="space-y-8 py-8">
      {/* Animation */}
      <div className="flex justify-center">
        <div className="relative">
          <Loader2 className="h-16 w-16 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-primary/10" />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2 max-w-md mx-auto">
        <Progress value={undefined} className="h-2" />
        <p className="text-sm text-center text-muted-foreground">
          Import de {total} entrées en cours...
        </p>
      </div>

      {/* Steps indicator */}
      <div className="space-y-3 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm">Création des contacts...</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-muted" />
          <span className="text-sm text-muted-foreground">
            Création des immeubles
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-muted" />
          <span className="text-sm text-muted-foreground">Création des lots</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-muted" />
          <span className="text-sm text-muted-foreground">Création des baux</span>
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        Ne fermez pas cette fenêtre pendant l&apos;import
      </p>
    </div>
  );
}
