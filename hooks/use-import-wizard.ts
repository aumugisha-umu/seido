'use client';

/**
 * Import Wizard Hook
 * Manages the state and flow of the import wizard
 */

import { useState, useCallback } from 'react';
import type {
  ParseResult,
  ValidationResult,
  ImportResult,
  ImportRowError,
  ParsedData,
} from '@/lib/import/types';
import { parseExcelFile, getParseStats } from '@/lib/import/excel-parser';
import { validateAllData } from '@/lib/import/validators';

// ============================================================================
// Types
// ============================================================================

export type ImportWizardStep =
  | 'upload'
  | 'preview'
  | 'confirm'
  | 'progress'
  | 'result';

export interface ImportWizardState {
  step: ImportWizardStep;
  file: File | null;
  parseResult: ParseResult | null;
  validationResult: ValidationResult | null;
  importResult: ImportResult | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseImportWizardReturn {
  state: ImportWizardState;
  // Navigation
  goToStep: (step: ImportWizardStep) => void;
  goBack: () => void;
  reset: () => void;
  // Actions
  setFile: (file: File | null) => void;
  parseFile: () => Promise<void>;
  validateData: () => Promise<void>;
  executeImport: () => Promise<void>;
  // Computed
  canProceed: boolean;
  stats: ReturnType<typeof getParseStats> | null;
  errors: ImportRowError[];
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ImportWizardState = {
  step: 'upload',
  file: null,
  parseResult: null,
  validationResult: null,
  importResult: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// Hook
// ============================================================================

export function useImportWizard(): UseImportWizardReturn {
  const [state, setState] = useState<ImportWizardState>(initialState);

  // ---- Navigation ----

  const goToStep = useCallback((step: ImportWizardStep) => {
    setState((prev) => ({ ...prev, step, error: null }));
  }, []);

  const goBack = useCallback(() => {
    const stepOrder: ImportWizardStep[] = [
      'upload',
      'preview',
      'confirm',
      'progress',
      'result',
    ];
    const currentIndex = stepOrder.indexOf(state.step);

    if (currentIndex > 0) {
      setState((prev) => ({
        ...prev,
        step: stepOrder[currentIndex - 1],
        error: null,
      }));
    }
  }, [state.step]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  // ---- File Handling ----

  const setFile = useCallback((file: File | null) => {
    setState((prev) => ({
      ...prev,
      file,
      parseResult: null,
      validationResult: null,
      importResult: null,
      error: null,
    }));
  }, []);

  // ---- Parse ----

  const parseFile = useCallback(async () => {
    if (!state.file) {
      setState((prev) => ({ ...prev, error: 'Aucun fichier sélectionné' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await parseExcelFile(state.file);

      if (!result.success) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Erreur de parsing',
        }));
        return;
      }

      // Check if any data was found
      const stats = getParseStats(result);
      if (stats.total === 0) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Aucune donnée trouvée dans le fichier. Vérifiez les noms des onglets.',
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        parseResult: result,
        step: 'preview',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur de parsing',
      }));
    }
  }, [state.file]);

  // ---- Validate ----

  const validateData = useCallback(async () => {
    if (!state.parseResult) {
      setState((prev) => ({ ...prev, error: 'Aucune donnée à valider' }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = validateAllData(state.parseResult);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        validationResult: result,
        step: result.isValid ? 'confirm' : 'preview',
      }));

      if (!result.isValid) {
        setState((prev) => ({
          ...prev,
          error: `${result.errors.length} erreur(s) détectée(s). Corrigez-les avant d'importer.`,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur de validation',
      }));
    }
  }, [state.parseResult]);

  // ---- Import ----

  const executeImport = useCallback(async () => {
    if (!state.validationResult?.data) {
      setState((prev) => ({ ...prev, error: 'Aucune donnée à importer' }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      step: 'progress',
    }));

    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: state.validationResult.data,
          options: {
            mode: 'upsert',
            errorMode: 'all_or_nothing',
          },
        }),
      });

      const result = await response.json();

      // Handle 400 responses with import errors - these still have a valid result structure
      if (!response.ok) {
        // If we have a structured error response with errors array, use it as importResult
        if (result.errors && Array.isArray(result.errors)) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            importResult: result,
            step: 'result',
          }));
          return;
        }
        throw new Error(result.error || 'Erreur lors de l\'import');
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        importResult: result,
        step: 'result',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur d\'import',
        step: 'result',
      }));
    }
  }, [state.validationResult?.data]);

  // ---- Computed ----

  const canProceed = (() => {
    switch (state.step) {
      case 'upload':
        return state.file !== null;
      case 'preview':
        return state.parseResult?.success && !state.isLoading;
      case 'confirm':
        return state.validationResult?.isValid && !state.isLoading;
      default:
        return false;
    }
  })();

  const stats = state.parseResult ? getParseStats(state.parseResult) : null;

  const errors = state.validationResult?.errors || [];

  return {
    state,
    goToStep,
    goBack,
    reset,
    setFile,
    parseFile,
    validateData,
    executeImport,
    canProceed,
    stats,
    errors,
  };
}
