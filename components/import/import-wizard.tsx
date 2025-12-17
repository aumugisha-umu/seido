'use client';

/**
 * Import Wizard Component
 * Main wizard for bulk importing data from Excel/CSV
 */

import { useImportWizard } from '@/hooks/use-import-wizard';
import { ImportStepUpload } from './import-step-upload';
import { ImportStepPreview } from './import-step-preview';
import { ImportStepConfirm } from './import-step-confirm';
import { ImportStepProgress } from './import-step-progress';
import { ImportStepResult } from './import-step-result';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, X } from 'lucide-react';

interface ImportWizardProps {
  onClose?: () => void;
}

export function ImportWizard({ onClose }: ImportWizardProps) {
  const wizard = useImportWizard();
  const { state, goBack, reset } = wizard;

  const handleClose = () => {
    reset();
    onClose?.();
  };

  // Step titles
  const stepTitles = {
    upload: 'Importer des données',
    preview: 'Prévisualisation',
    confirm: 'Confirmation',
    progress: 'Import en cours',
    result: 'Résultat',
  };

  const stepDescriptions = {
    upload: 'Téléchargez un fichier Excel ou CSV contenant vos données',
    preview: 'Vérifiez vos données avant l\'import',
    confirm: 'Confirmez les données à importer',
    progress: 'Veuillez patienter pendant l\'import...',
    result: 'L\'import est terminé',
  };

  // Can go back?
  const canGoBack = ['preview', 'confirm'].includes(state.step);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goBack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <CardTitle>{stepTitles[state.step]}</CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>{stepDescriptions[state.step]}</CardDescription>

        {/* Step indicator */}
        <div className="flex items-center gap-2 pt-4">
          {(['upload', 'preview', 'confirm', 'progress', 'result'] as const).map(
            (step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`h-2 w-2 rounded-full transition-colors ${
                    state.step === step
                      ? 'bg-primary'
                      : index <
                        ['upload', 'preview', 'confirm', 'progress', 'result'].indexOf(
                          state.step
                        )
                      ? 'bg-primary/50'
                      : 'bg-muted'
                  }`}
                />
                {index < 4 && (
                  <div
                    className={`h-0.5 w-8 transition-colors ${
                      index <
                      ['upload', 'preview', 'confirm', 'progress', 'result'].indexOf(
                        state.step
                      )
                        ? 'bg-primary/50'
                        : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            )
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Error display */}
        {state.error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        )}

        {/* Step content */}
        {state.step === 'upload' && <ImportStepUpload wizard={wizard} />}
        {state.step === 'preview' && <ImportStepPreview wizard={wizard} />}
        {state.step === 'confirm' && <ImportStepConfirm wizard={wizard} />}
        {state.step === 'progress' && <ImportStepProgress wizard={wizard} />}
        {state.step === 'result' && (
          <ImportStepResult wizard={wizard} onClose={handleClose} />
        )}
      </CardContent>
    </Card>
  );
}
