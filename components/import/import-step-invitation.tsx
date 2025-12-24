'use client';

/**
 * Import Step: Invitation
 * Allows selecting contacts to invite to the app after import
 * Implements rate limiting (500ms between calls) to respect Resend's 2 API calls/sec limit
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  Users,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  SkipForward,
  Loader2,
} from 'lucide-react';
import type { UseImportWizardReturn } from '@/hooks/use-import-wizard';

interface ImportStepInvitationProps {
  wizard: UseImportWizardReturn;
  onClose?: () => void;
}

export function ImportStepInvitation({ wizard, onClose }: ImportStepInvitationProps) {
  const {
    state,
    invitableContacts,
    toggleContactSelection,
    selectAllContacts,
    deselectAllContacts,
    sendInvitations,
    reset,
  } = wizard;

  const { selectedContactIds, invitationProgress, createdContacts, error } = state;
  const { isProcessing, total, sent, failed, currentContact } = invitationProgress;

  // Calculate estimated time (500ms per contact)
  const estimatedSeconds = Math.ceil((selectedContactIds.length * 0.5));

  // Check if invitations have been sent (total > 0 means we've started)
  const hasStartedSending = total > 0;
  const isFinished = hasStartedSending && !isProcessing;
  const progressPercent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0;

  // Contacts without emails (informational only)
  const contactsWithoutEmail = createdContacts.filter(
    (c) => !c.email || c.email.trim() === ''
  );

  const handleSelectAll = () => {
    if (selectedContactIds.length === invitableContacts.length) {
      deselectAllContacts();
    } else {
      selectAllContacts();
    }
  };

  const isAllSelected = selectedContactIds.length === invitableContacts.length && invitableContacts.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">
              Inviter les contacts
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Sélectionnez les contacts à inviter sur l'application SEIDO.
              Une invitation par email sera envoyée à chaque contact sélectionné.
            </p>
          </div>
        </div>
      </div>

      {/* Progress during sending */}
      {isProcessing && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">Envoi en cours...</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {sent + failed}/{total}
            </span>
          </div>

          <Progress value={progressPercent} className="h-2" />

          {currentContact && (
            <p className="text-xs text-muted-foreground">
              Invitation de {currentContact}...
            </p>
          )}
        </div>
      )}

      {/* Results after sending */}
      {isFinished && (
        <div className={`rounded-lg p-4 ${
          failed === 0
            ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start gap-3">
            {failed === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            )}
            <div>
              <h4 className={`font-semibold ${
                failed === 0 ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'
              }`}>
                Invitations envoyées
              </h4>
              <div className="flex gap-4 mt-2">
                {sent > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {sent} envoyée{sent > 1 ? 's' : ''}
                  </Badge>
                )}
                {failed > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {failed} échec{failed > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact selection (only show if not sending and not finished) */}
      {!isProcessing && !isFinished && (
        <>
          {/* Stats and select all */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{selectedContactIds.length}</strong> contact{selectedContactIds.length !== 1 ? 's' : ''} sélectionné{selectedContactIds.length !== 1 ? 's' : ''}
                {' '}sur {invitableContacts.length} invitable{invitableContacts.length !== 1 ? 's' : ''}
              </span>
            </div>

            {invitableContacts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            )}
          </div>

          {/* Estimated time */}
          {selectedContactIds.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4" />
              <span>
                Durée estimée : ~{estimatedSeconds} seconde{estimatedSeconds !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Contact list */}
          {invitableContacts.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="w-10 p-2"></th>
                      <th className="text-left p-2 font-medium">Nom</th>
                      <th className="text-left p-2 font-medium">Email</th>
                      <th className="text-left p-2 font-medium">Rôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitableContacts.map((contact) => {
                      const isSelected = selectedContactIds.includes(contact.id);
                      return (
                        <tr
                          key={contact.id}
                          className={`border-t cursor-pointer hover:bg-muted/30 ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => toggleContactSelection(contact.id)}
                        >
                          <td className="p-2 text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleContactSelection(contact.id)}
                            />
                          </td>
                          <td className="p-2 font-medium">{contact.name}</td>
                          <td className="p-2 text-muted-foreground">{contact.email}</td>
                          <td className="p-2">
                            <Badge variant="outline" className="capitalize">
                              {contact.role}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="border border-dashed rounded-lg p-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                Aucun contact avec adresse email n'a été créé pendant l'import.
              </p>
            </div>
          )}

          {/* Contacts without email (info) */}
          {contactsWithoutEmail.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="italic">
                {contactsWithoutEmail.length} contact{contactsWithoutEmail.length !== 1 ? 's' : ''} sans email
                (non invitable{contactsWithoutEmail.length !== 1 ? 's' : ''})
              </span>
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <Separator />

      {/* Action buttons */}
      <div className="flex justify-end gap-3">
        {!isProcessing && !isFinished && (
          <>
            <Button variant="outline" onClick={onClose}>
              <SkipForward className="h-4 w-4 mr-2" />
              Passer cette étape
            </Button>
            <Button
              onClick={sendInvitations}
              disabled={selectedContactIds.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer {selectedContactIds.length > 0 ? `(${selectedContactIds.length})` : ''}
            </Button>
          </>
        )}

        {isFinished && (
          <>
            <Button variant="outline" onClick={reset}>
              Nouvel import
            </Button>
            {onClose && (
              <Button onClick={onClose}>
                Terminer
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
