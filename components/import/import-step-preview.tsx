'use client';

/**
 * Import Step: Preview
 * Shows parsed data and validation errors
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Home,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';
import { SHEET_NAMES } from '@/lib/import/constants';

interface ImportStepPreviewProps {
  wizard: UseImportWizardReturn;
}

export function ImportStepPreview({ wizard }: ImportStepPreviewProps) {
  const { state, stats, errors, validateData, canProceed } = wizard;

  // Get errors by sheet
  const getErrorsForSheet = (sheet: string) =>
    errors.filter((e) => e.sheet === sheet);

  // Tab configuration
  const tabs = [
    {
      value: 'buildings',
      label: 'Immeubles',
      icon: Building2,
      count: stats?.buildings || 0,
      errors: getErrorsForSheet(SHEET_NAMES.BUILDINGS).length,
      data: state.parseResult?.buildings.rows || [],
    },
    {
      value: 'lots',
      label: 'Lots',
      icon: Home,
      count: stats?.lots || 0,
      errors: getErrorsForSheet(SHEET_NAMES.LOTS).length,
      data: state.parseResult?.lots.rows || [],
    },
    {
      value: 'contacts',
      label: 'Contacts',
      icon: Users,
      count: stats?.contacts || 0,
      errors: getErrorsForSheet(SHEET_NAMES.CONTACTS).length,
      data: state.parseResult?.contacts.rows || [],
    },
    {
      value: 'contracts',
      label: 'Baux',
      icon: FileText,
      count: stats?.contracts || 0,
      errors: getErrorsForSheet(SHEET_NAMES.CONTRACTS).length,
      data: state.parseResult?.contracts.rows || [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tabs.map((tab) => (
          <div
            key={tab.value}
            className="bg-muted/50 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <tab.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{tab.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{tab.count}</span>
              {tab.errors > 0 ? (
                <Badge variant="destructive" className="text-xs">
                  {tab.errors} erreur{tab.errors > 1 ? 's' : ''}
                </Badge>
              ) : tab.count > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Errors summary */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive">
                {errors.length} erreur{errors.length > 1 ? 's' : ''} détectée
                {errors.length > 1 ? 's' : ''}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Corrigez ces erreurs dans votre fichier et réimportez-le.
              </p>
              <ul className="mt-3 space-y-1 text-sm">
                {errors.slice(0, 5).map((error, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground">
                      Ligne {error.row} ({error.sheet}):
                    </span>
                    <span>{error.message}</span>
                  </li>
                ))}
                {errors.length > 5 && (
                  <li className="text-muted-foreground">
                    ... et {errors.length - 5} autre
                    {errors.length - 5 > 1 ? 's' : ''} erreur
                    {errors.length - 5 > 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Data preview tabs */}
      <Tabs defaultValue="buildings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {state.parseResult &&
                        (state.parseResult as Record<string, { headers: string[] }>)[
                          tab.value === 'buildings'
                            ? 'buildings'
                            : tab.value === 'lots'
                            ? 'lots'
                            : tab.value === 'contacts'
                            ? 'contacts'
                            : 'contracts'
                        ]?.headers
                          .slice(0, 5)
                          .map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tab.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          Aucune donnée trouvée dans l&apos;onglet &quot;{tab.label}&quot;
                        </TableCell>
                      </TableRow>
                    ) : (
                      tab.data.slice(0, 10).map((row, index) => {
                        const rowErrors = errors.filter(
                          (e) =>
                            e.sheet ===
                              (tab.value === 'buildings'
                                ? SHEET_NAMES.BUILDINGS
                                : tab.value === 'lots'
                                ? SHEET_NAMES.LOTS
                                : tab.value === 'contacts'
                                ? SHEET_NAMES.CONTACTS
                                : SHEET_NAMES.CONTRACTS) && e.row === index + 2
                        );

                        return (
                          <TableRow
                            key={index}
                            className={
                              rowErrors.length > 0 ? 'bg-destructive/5' : ''
                            }
                          >
                            <TableCell className="font-mono text-xs">
                              {index + 1}
                              {rowErrors.length > 0 && (
                                <AlertTriangle className="h-3 w-3 text-destructive inline ml-1" />
                              )}
                            </TableCell>
                            {Object.values(row as Record<string, unknown>)
                              .slice(0, 5)
                              .map((value, i) => (
                                <TableCell key={i} className="truncate max-w-[150px]">
                                  {String(value ?? '')}
                                </TableCell>
                              ))}
                          </TableRow>
                        );
                      })
                    )}
                    {tab.data.length > 10 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground"
                        >
                          ... et {tab.data.length - 10} autre
                          {tab.data.length - 10 > 1 ? 's' : ''} ligne
                          {tab.data.length - 10 > 1 ? 's' : ''}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={validateData}
          disabled={!canProceed || state.isLoading}
          className="min-w-[140px]"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Validation...
            </>
          ) : (
            'Valider les données'
          )}
        </Button>
      </div>
    </div>
  );
}
