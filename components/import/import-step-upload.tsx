'use client';

/**
 * Import Step: Upload
 * File upload with drag & drop and template download
 */

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Download, FileText, Loader2 } from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';

interface ImportStepUploadProps {
  wizard: UseImportWizardReturn;
}

export function ImportStepUpload({ wizard }: ImportStepUploadProps) {
  const { state, setFile, parseFile, canProceed } = wizard;
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        setFile(files[0]);
      }
    },
    [setFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setFile(files[0]);
      }
    },
    [setFile]
  );

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const response = await fetch('/api/import/template?type=full');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_import_seido.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Template download section */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-orange-600">⚠️ Utilisation du template obligatoire</h4>
            <p className="text-sm text-muted-foreground">
              Téléchargez notre template Excel avec les bons en-têtes.
              L&apos;utilisation de ce template est obligatoire pour garantir
              la compatibilité des données lors de l&apos;import.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger le template
        </Button>
      </div>

      {/* Grid layout: File uploader (left) + Instructions (right) on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* File upload zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 min-h-[200px] flex flex-col justify-center transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : state.file
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="text-center space-y-3">
            {state.file ? (
              <>
                <FileSpreadsheet className="h-10 w-10 mx-auto text-green-600" />
                <div>
                  <p className="font-medium text-sm">{state.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(state.file.size / 1024).toFixed(1)} Ko
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Changer de fichier
                </Button>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">
                    Glissez-déposez votre fichier ici
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou cliquez pour parcourir
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Formats acceptés: .xlsx, .xls, .csv (max 10 Mo)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-3 lg:border-l lg:pl-6">
          <p className="font-medium text-foreground">Onglets disponibles (au moins un requis) :</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li><strong>Immeubles</strong> - Nom, Adresse, Ville, Code Postal</li>
            <li><strong>Lots</strong> - Référence, Nom Immeuble, Catégorie, Étage</li>
            <li><strong>Contacts</strong> - Nom, Email, Téléphone, Rôle</li>
            <li><strong>Baux</strong> - Titre, Réf Lot, Date Début, Durée, Loyer</li>
          </ul>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
              💡 Règle importante : Respectez les dépendances
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Certaines données nécessitent d&apos;autres données pour être créées.
              Par exemple : un contrat (Baux) nécessite un lot existant ainsi que
              les contacts (locataire, garant). Un immeuble doit contenir au moins 1 lot.
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end">
        <Button
          onClick={parseFile}
          disabled={!canProceed || state.isLoading}
          className="min-w-[140px]"
        >
          {state.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyse...
            </>
          ) : (
            'Analyser le fichier'
          )}
        </Button>
      </div>
    </div>
  );
}
