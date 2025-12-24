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
  ImportProgressEvent,
  ImportPhase,
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
  | 'result'
  | 'invitation';

export interface InvitationProgress {
  total: number;
  sent: number;
  failed: number;
  isProcessing: boolean;
  currentContact: string | null;
}

export interface CreatedContact {
  id: string;
  name: string;
  email: string | null;
  role: string;
}

export interface ImportProgress {
  phase: ImportPhase;
  phaseIndex: number;
  totalPhases: number;
  phaseName: string;
  totalProgress: number;
  isComplete: boolean;
}

export interface ImportWizardState {
  step: ImportWizardStep;
  file: File | null;
  parseResult: ParseResult | null;
  validationResult: ValidationResult | null;
  importResult: ImportResult | null;
  isLoading: boolean;
  error: string | null;
  // Import progress tracking (real-time)
  importProgress: ImportProgress | null;
  // Invitation step state
  createdContacts: CreatedContact[];
  selectedContactIds: string[];
  invitationProgress: InvitationProgress;
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
  // Invitation actions
  setCreatedContacts: (contacts: CreatedContact[]) => void;
  toggleContactSelection: (contactId: string) => void;
  selectAllContacts: () => void;
  deselectAllContacts: () => void;
  sendInvitations: () => Promise<void>;
  goToInvitationStep: () => void;
  // Computed
  canProceed: boolean;
  stats: ReturnType<typeof getParseStats> | null;
  errors: ImportRowError[];
  invitableContacts: CreatedContact[];
  // Real-time import progress
  importProgress: ImportProgress | null;
}

// ============================================================================
// Initial State
// ============================================================================

const initialInvitationProgress: InvitationProgress = {
  total: 0,
  sent: 0,
  failed: 0,
  isProcessing: false,
  currentContact: null,
};

const initialState: ImportWizardState = {
  step: 'upload',
  file: null,
  parseResult: null,
  validationResult: null,
  importResult: null,
  isLoading: false,
  error: null,
  importProgress: null,
  createdContacts: [],
  selectedContactIds: [],
  invitationProgress: initialInvitationProgress,
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
      'invitation',
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

  // ---- Import with Streaming ----

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
      importProgress: null,
    }));

    try {
      // Use streaming API for real-time progress updates
      const response = await fetch('/api/import/execute-stream', {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de l\'import');
      }

      // Read the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream non disponible');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: ImportResult | null = null;

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            eventData = line.slice(6);

            if (eventType && eventData) {
              try {
                const parsedData = JSON.parse(eventData);

                if (eventType === 'progress') {
                  // Update progress state
                  const progressEvent = parsedData as ImportProgressEvent;
                  setState((prev) => ({
                    ...prev,
                    importProgress: {
                      phase: progressEvent.phase,
                      phaseIndex: progressEvent.phaseIndex,
                      totalPhases: progressEvent.totalPhases,
                      phaseName: progressEvent.phaseName,
                      totalProgress: progressEvent.totalProgress,
                      isComplete: progressEvent.isComplete,
                    },
                  }));
                } else if (eventType === 'result') {
                  finalResult = parsedData as ImportResult;
                } else if (eventType === 'error') {
                  throw new Error(parsedData.error || 'Erreur d\'import');
                }
              } catch (parseError) {
                // Skip invalid JSON
                console.warn('Failed to parse SSE event:', parseError);
              }

              eventType = '';
              eventData = '';
            }
          }
        }
      }

      // Handle final result
      if (finalResult) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          importResult: finalResult,
          step: 'result',
          importProgress: null,
        }));
      } else {
        throw new Error('Aucun résultat reçu du serveur');
      }

    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Erreur d\'import',
        step: 'result',
        importProgress: null,
      }));
    }
  }, [state.validationResult?.data]);

  // ---- Invitation ----

  const setCreatedContacts = useCallback((contacts: CreatedContact[]) => {
    setState((prev) => ({
      ...prev,
      createdContacts: contacts,
      // Auto-select all contacts with emails
      selectedContactIds: contacts
        .filter((c) => c.email !== null && c.email.trim() !== '')
        .map((c) => c.id),
    }));
  }, []);

  const toggleContactSelection = useCallback((contactId: string) => {
    setState((prev) => {
      const isSelected = prev.selectedContactIds.includes(contactId);
      return {
        ...prev,
        selectedContactIds: isSelected
          ? prev.selectedContactIds.filter((id) => id !== contactId)
          : [...prev.selectedContactIds, contactId],
      };
    });
  }, []);

  const selectAllContacts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedContactIds: prev.createdContacts
        .filter((c) => c.email !== null && c.email.trim() !== '')
        .map((c) => c.id),
    }));
  }, []);

  const deselectAllContacts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedContactIds: [],
    }));
  }, []);

  const goToInvitationStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: 'invitation',
      error: null,
    }));
  }, []);

  /**
   * Sends invitations to selected contacts with rate limiting
   * Resend has a 2 API calls/second limit, so we add 500ms delay between each call
   */
  const sendInvitations = useCallback(async () => {
    const DELAY_BETWEEN_CALLS_MS = 500; // 500ms = 2 calls/second max

    const contactsToInvite = state.createdContacts.filter(
      (c) => state.selectedContactIds.includes(c.id) && c.email
    );

    if (contactsToInvite.length === 0) {
      setState((prev) => ({
        ...prev,
        error: 'Aucun contact sélectionné pour l\'invitation',
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      invitationProgress: {
        total: contactsToInvite.length,
        sent: 0,
        failed: 0,
        isProcessing: true,
        currentContact: null,
      },
      error: null,
    }));

    for (let i = 0; i < contactsToInvite.length; i++) {
      const contact = contactsToInvite[i];

      // Update current contact being processed
      setState((prev) => ({
        ...prev,
        invitationProgress: {
          ...prev.invitationProgress,
          currentContact: contact.name,
        },
      }));

      try {
        const response = await fetch('/api/send-existing-contact-invitation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contactId: contact.id,
            email: contact.email,
          }),
        });

        if (response.ok) {
          setState((prev) => ({
            ...prev,
            invitationProgress: {
              ...prev.invitationProgress,
              sent: prev.invitationProgress.sent + 1,
            },
          }));
        } else {
          setState((prev) => ({
            ...prev,
            invitationProgress: {
              ...prev.invitationProgress,
              failed: prev.invitationProgress.failed + 1,
            },
          }));
        }
      } catch {
        setState((prev) => ({
          ...prev,
          invitationProgress: {
            ...prev.invitationProgress,
            failed: prev.invitationProgress.failed + 1,
          },
        }));
      }

      // Add delay between calls to respect rate limit (except for last call)
      if (i < contactsToInvite.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_CALLS_MS));
      }
    }

    // Mark as finished
    setState((prev) => ({
      ...prev,
      invitationProgress: {
        ...prev.invitationProgress,
        isProcessing: false,
        currentContact: null,
      },
    }));
  }, [state.createdContacts, state.selectedContactIds]);

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

  // Contacts that have emails and can receive invitations
  const invitableContacts = state.createdContacts.filter(
    (c) => c.email !== null && c.email.trim() !== ''
  );

  return {
    state,
    goToStep,
    goBack,
    reset,
    setFile,
    parseFile,
    validateData,
    executeImport,
    // Invitation actions
    setCreatedContacts,
    toggleContactSelection,
    selectAllContacts,
    deselectAllContacts,
    sendInvitations,
    goToInvitationStep,
    // Computed
    canProceed,
    stats,
    errors,
    invitableContacts,
    // Real-time import progress
    importProgress: state.importProgress,
  };
}
