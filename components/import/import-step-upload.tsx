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
    <div className="space-y-6">
      {/* Template download section */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium">Besoin d&apos;un modèle ?</h4>
            <p className="text-sm text-muted-foreground">
              Téléchargez notre template Excel avec les bons en-têtes et exemples
              pour remplir vos données facilement.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger le template
        </Button>
      </div>

      {/* File upload zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 transition-colors ${
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

        <div className="text-center space-y-4">
          {state.file ? (
            <>
              <FileSpreadsheet className="h-12 w-12 mx-auto text-green-600" />
              <div>
                <p className="font-medium">{state.file.name}</p>
                <p className="text-sm text-muted-foreground">
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
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">
                  Glissez-déposez votre fichier ici
                </p>
                <p className="text-sm text-muted-foreground">
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
      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">Le fichier doit contenir les onglets suivants :</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Immeubles</strong> - Nom, Adresse, Ville, Code Postal</li>
          <li><strong>Lots</strong> - Référence, Nom Immeuble, Catégorie, Étage</li>
          <li><strong>Contacts</strong> - Nom, Email, Téléphone, Rôle</li>
          <li><strong>Baux</strong> - Titre, Réf Lot, Date Début, Durée, Loyer</li>
        </ul>
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
