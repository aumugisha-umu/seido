'use client';

/**
 * Import Step: Progress
 * Shows import progress with real-time updates via SSE streaming
 */

import { Progress } from '@/components/ui/progress';
import { Loader2, Check } from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';
import type { ImportPhase } from '@/lib/import/types';
import { cn } from '@/lib/utils';

interface ImportStepProgressProps {
  wizard: UseImportWizardReturn;
}

// Phase configuration with French labels and order
const PHASES: { key: ImportPhase; label: string }[] = [
  { key: 'companies', label: 'Création des sociétés' },
  { key: 'contacts', label: 'Création des contacts' },
  { key: 'buildings', label: 'Création des immeubles' },
  { key: 'lots', label: 'Création des lots' },
  { key: 'contracts', label: 'Création des baux' },
];

export function ImportStepProgress({ wizard }: ImportStepProgressProps) {
  const { stats, importProgress } = wizard;
  const total = stats?.total || 0;

  // Determine current phase index (0-4, or -1 if not started)
  const currentPhaseIndex = importProgress?.phaseIndex ?? -1;

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
        <Progress
          value={importProgress?.totalProgress ?? 0}
          className="h-2"
        />
        <p className="text-sm text-center text-muted-foreground">
          {importProgress?.phaseName || `Import de ${total} entrées en cours...`}
          {importProgress && ` (${importProgress.totalProgress}%)`}
        </p>
      </div>

      {/* Steps indicator - dynamic based on real progress */}
      <div className="space-y-3 max-w-md mx-auto">
        {PHASES.map((phase, index) => {
          const isCompleted = currentPhaseIndex > index;
          const isCurrent = currentPhaseIndex === index;
          const isPending = currentPhaseIndex < index;

          return (
            <div key={phase.key} className="flex items-center gap-3">
              {/* Status indicator */}
              {isCompleted ? (
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              ) : isCurrent ? (
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-muted" />
              )}

              {/* Label */}
              <span
                className={cn(
                  'text-sm',
                  isCompleted && 'text-green-600 font-medium',
                  isCurrent && 'text-foreground font-medium',
                  isPending && 'text-muted-foreground'
                )}
              >
                {isCurrent ? `${phase.label}...` : phase.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground">
        Ne fermez pas cette fenêtre pendant l&apos;import
      </p>
    </div>
  );
}
