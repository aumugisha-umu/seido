'use client';

/**
 * Import Step: Result
 * Shows import results (success or errors)
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Building2,
  Home,
  Users,
  FileText,
  AlertTriangle,
  Download,
  RefreshCw,
  Mail,
} from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';
import type { CreatedContactInfo } from '@/lib/import/types';
import { SHEET_NAMES } from '@/lib/import/constants';

interface ImportStepResultProps {
  wizard: UseImportWizardReturn;
  onClose?: () => void;
}

export function ImportStepResult({ wizard, onClose }: ImportStepResultProps) {
  const { state, reset, goToInvitationStep, setCreatedContacts } = wizard;
  const { importResult, error } = state;

  const isSuccess = importResult?.success && !error;

  // Extract created contacts with emails for invitation
  const createdContactsWithEmail = (importResult?.createdContacts || []).filter(
    (c: CreatedContactInfo) => c.email && c.email.trim() !== ''
  );

  const handleGoToInvitations = () => {
    // Set the created contacts in the wizard state
    setCreatedContacts(importResult?.createdContacts || []);
    // Navigate to invitation step
    goToInvitationStep();
  };

  // Get stats from result
  const summary = importResult?.summary;

  const items = [
    {
      icon: Building2,
      label: 'Immeubles',
      created: summary?.buildings.created || 0,
      updated: summary?.buildings.updated || 0,
      failed: summary?.buildings.failed || 0,
    },
    {
      icon: Home,
      label: 'Lots',
      created: summary?.lots.created || 0,
      updated: summary?.lots.updated || 0,
      failed: summary?.lots.failed || 0,
    },
    {
      icon: Users,
      label: 'Contacts',
      created: summary?.contacts.created || 0,
      updated: summary?.contacts.updated || 0,
      failed: summary?.contacts.failed || 0,
    },
    {
      icon: FileText,
      label: 'Baux',
      created: summary?.contracts.created || 0,
      updated: summary?.contracts.updated || 0,
      failed: summary?.contracts.failed || 0,
    },
  ];

  const errors = importResult?.errors || [];

  return (
    <div className="space-y-6">
      {/* Status header */}
      {isSuccess ? (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
            Import réussi !
          </h3>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            {summary?.totalSuccess || 0} entrées ont été importées avec succès.
          </p>
          {summary?.duration && (
            <p className="text-xs text-green-500 mt-1">
              Durée: {(summary.duration / 1000).toFixed(1)}s
            </p>
          )}
        </div>
      ) : (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive">
            Import échoué
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            {error || 'Une erreur est survenue pendant l\'import.'}
          </p>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <>
          <div className="space-y-4">
            <h4 className="font-medium">Détail par type</h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {items.map((item) => {
                const total = item.created + item.updated;
                return (
                  <div
                    key={item.label}
                    className="bg-muted/50 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="space-y-1">
                      {item.created > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          >
                            +{item.created} créé{item.created > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                      {item.updated > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          >
                            {item.updated} maj
                          </Badge>
                        </div>
                      )}
                      {item.failed > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">
                            {item.failed} échec{item.failed > 1 ? 's' : ''}
                          </Badge>
                        </div>
                      )}
                      {total === 0 && item.failed === 0 && (
                        <span className="text-xs text-muted-foreground">
                          Aucune donnée
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />
        </>
      )}

      {/* Errors list */}
      {errors.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Erreurs ({errors.length})
            </h4>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exporter les erreurs
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="max-h-[200px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Ligne</th>
                    <th className="text-left p-2 font-medium">Onglet</th>
                    <th className="text-left p-2 font-medium">Erreur</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-mono">{err.row}</td>
                      <td className="p-2">{err.sheet}</td>
                      <td className="p-2 text-muted-foreground">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Nouvel import
        </Button>
        {isSuccess && createdContactsWithEmail.length > 0 && (
          <Button variant="outline" onClick={handleGoToInvitations}>
            <Mail className="h-4 w-4 mr-2" />
            Inviter les contacts ({createdContactsWithEmail.length})
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose}>
            {isSuccess ? 'Fermer' : 'Retour'}
          </Button>
        )}
      </div>
    </div>
  );
}
