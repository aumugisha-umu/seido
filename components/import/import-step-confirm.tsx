'use client';

/**
 * Import Step: Confirm
 * Final confirmation before executing import
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Home,
  Users,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';

interface ImportStepConfirmProps {
  wizard: UseImportWizardReturn;
}

export function ImportStepConfirm({ wizard }: ImportStepConfirmProps) {
  const { state, stats, executeImport, canProceed } = wizard;

  const items = [
    {
      icon: Building2,
      label: 'Immeubles',
      count: stats?.buildings || 0,
      color: 'bg-blue-500',
    },
    {
      icon: Home,
      label: 'Lots',
      count: stats?.lots || 0,
      color: 'bg-green-500',
    },
    {
      icon: Users,
      label: 'Contacts',
      count: stats?.contacts || 0,
      color: 'bg-purple-500',
    },
    {
      icon: FileText,
      label: 'Baux',
      count: stats?.contracts || 0,
      color: 'bg-orange-500',
    },
  ];

  const totalItems = stats?.total || 0;

  return (
    <div className="space-y-6">
      {/* Success message */}
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-200">
              Données validées avec succès
            </h4>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Vos données sont prêtes à être importées. Vérifiez le résumé ci-dessous.
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <h3 className="font-semibold">Résumé de l&apos;import</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.label}
              className="bg-muted/50 rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${item.color}`}>
                  <item.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="text-2xl font-bold">{item.count}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Import mode info */}
        <div className="space-y-3">
          <h4 className="font-medium">Mode d&apos;import</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Upsert</Badge>
              <span className="text-sm text-muted-foreground">
                Les entrées existantes seront mises à jour
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Tout ou rien</Badge>
              <span className="text-sm text-muted-foreground">
                En cas d&apos;erreur, aucune donnée ne sera importée
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Order info */}
        <div className="space-y-3">
          <h4 className="font-medium">Ordre d&apos;import</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Contacts</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">Immeubles</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">Lots</span>
            <ArrowRight className="h-3 w-3" />
            <span className="font-medium">Baux</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Les entités sont créées dans cet ordre pour respecter les relations.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200">
              Important
            </h4>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Cette action va créer ou mettre à jour <strong>{totalItems}</strong>{' '}
              entrées dans votre base de données. Cette opération peut prendre
              quelques instants.
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={executeImport}
          disabled={!canProceed || state.isLoading}
          size="lg"
          className="min-w-[180px]"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Import en cours...
            </>
          ) : (
            <>
              Lancer l&apos;import
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
