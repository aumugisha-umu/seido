# Inventaire des Modales SEIDO - Revue pour Migration

> **Date:** 2026-01-30
> **Objectif:** Identifier les modales à supprimer avant migration vers UnifiedModal
> **Total:** 36 modales actives (9 supprimées au total)

### Modales supprimées lors de l'unification (2026-01-30)
- ~~`approve-confirmation-modal.tsx`~~ → Remplacé par `ApprovalModal`
- ~~`reject-confirmation-modal.tsx`~~ → Remplacé par `ApprovalModal`
- ~~`success-modal.tsx`~~ → Code mort, supprimé
- ~~`quote-validation-modal.tsx`~~ → Remplacé par `QuoteApprovalModal`/`QuoteRejectionModal`

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ | À migrer vers UnifiedModal |
| ⚠️ | À vérifier (possiblement redondant) |
| 🗑️ | Candidat suppression |
| 🔄 | Doublon potentiel |

---

## 1. MODALES GESTIONNAIRE (22 modales)

### 1.1 Approbation & Décision Interventions

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 1 | `intervention/modals/approval-modal.tsx` | `ApprovalModal` | **UNIFIÉ** - Modal 3 états pour approuver/rejeter (liste + détail) | ✅ |
| 2 | `intervention/modals/cancel-confirmation-modal.tsx` | `CancelConfirmationModal` | **Utilisé par:** `intervention-cancellation-manager.tsx` - Annuler intervention | ✅ |
| 3 | `intervention/modals/base-confirmation-modal.tsx` | `BaseConfirmationModal` | **Base pour:** #2 - Template de confirmation | 🔄 Garder pour CancelConfirmationModal |

✅ **Unification complète** - `ApprovalModal` est maintenant la seule modale pour approbation/rejet

---

### 1.2 Planification & Créneaux

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 7 | `intervention/modals/programming-modal-FINAL.tsx` | `ProgrammingModalFinal` | **Page détail intervention** - Planifier intervention (3 méthodes) | ✅ |
| 8 | `intervention/modals/programming-modal.tsx` | `ProgrammingModal` | Re-export de #7 | 🔄 Supprimer après migration |
| 9 | `intervention/modals/choose-time-slot-modal.tsx` | `ChooseTimeSlotModal` | **Utilisé par:** `intervention-detail-client.tsx`, `intervention-scheduling-preview.tsx` | ✅ |

---

### 1.3 Gestion Devis (Gestionnaire)

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 4 | `quotes/quote-approval-modal.tsx` | `QuoteApprovalModal` | **UNIFIÉ** - Approbation devis (liste + détail + comparaison) | ✅ |
| 5 | `quotes/quote-rejection-modal.tsx` | `QuoteRejectionModal` | **UNIFIÉ** - Rejet devis avec motif (liste + détail + comparaison) | ✅ |
| 13 | `quotes/quote-cancellation-modal.tsx` | `QuoteCancellationModal` | **Exporté dans:** `quotes/index.ts` - Annuler devis | ✅ |
| 14 | `intervention/modals/quote-request-modal.tsx` | `QuoteRequestModal` | **Utilisé par:** `interventions-page-client.tsx`, `integrated-quotes-card.tsx` | ✅ |
| 15 | `intervention/modals/quote-request-success-modal.tsx` | `QuoteRequestSuccessModal` | **Utilisé par:** `interventions-page-client.tsx`, `intervention-action-buttons.tsx` | ✅ |
| 16 | `intervention/modals/cancel-quote-confirm-modal.tsx` | `CancelQuoteConfirmModal` | **Utilisé par:** `intervention-detail-client.tsx` | ✅ |
| 17 | `intervention/modals/cancel-quote-request-modal.tsx` | `CancelQuoteRequestModal` | **Utilisé par:** `interventions-page-client.tsx`, `intervention-detail-client.tsx`, `overview-tab.tsx` | ✅ |

**Questions à valider :**
- [ ] `QuoteApprovalModal` et `QuoteRejectionModal` sont-ils encore utilisés ou `QuoteValidationModal` les remplace ?

---

### 1.4 Gestion Contacts

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 18 | `contact-details/modals/contact-invite-modal.tsx` | `ContactInviteModal` | **Utilisé par:** `contact-details-client.tsx` - Inviter contact | ✅ |
| 19 | `contact-details/modals/contact-cancel-modal.tsx` | `ContactCancelModal` | **Utilisé par:** `contact-details-client.tsx` - Annuler invitation | ✅ |
| 20 | `contact-details/modals/contact-resend-modal.tsx` | `ContactResendModal` | **Utilisé par:** `contact-details-client.tsx` - Renvoyer invitation | ✅ |
| 21 | `contact-details/modals/contact-revoke-modal.tsx` | `ContactRevokeModal` | **Utilisé par:** `contact-details-client.tsx` - Révoquer accès | ✅ |

---

### 1.5 Communication Interne

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 22 | `app/gestionnaire/.../mail/components/add-participant-modal.tsx` | `AddParticipantModal` | **Utilisé par:** `internal-chat-panel.tsx` - Ajouter participant discussion | ✅ |
| 23 | `app/gestionnaire/.../mail/components/start-conversation-modal.tsx` | `StartConversationModal` | **Utilisé par:** `internal-chat-panel.tsx` - Nouvelle conversation | ✅ |

---

### 1.6 Finalisation Interventions

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 24 | `intervention/finalization-modal-live.tsx` | `FinalizationModalLive` | **Utilisé par:** `intervention-detail-client.tsx`, `intervention-action-buttons.tsx` | ✅ |

---

## 2. MODALES PRESTATAIRE (5 modales)

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 25 | `intervention/modals/quote-submission-modal.tsx` | `QuoteSubmissionModal` | **Utilisé par:** `intervention-detail-client.tsx` (prestataire) - Soumettre devis | ✅ |
| 26 | `intervention/modals/cancel-slot-modal.tsx` | `CancelSlotModal` | **Utilisé par:** `intervention-detail-client.tsx` (3 rôles) - Annuler créneau | ✅ |
| 27 | `intervention/modals/reject-slot-modal.tsx` | `RejectSlotModal` | **Utilisé par:** `intervention-detail-client.tsx`, `quote-submission-form.tsx` | ✅ |
| 28 | `intervention/modals/modify-choice-modal.tsx` | `ModifyChoiceModal` | **Utilisé par:** `intervention-detail-client.tsx` (prestataire) | ✅ |
| 29 | `intervention/simple-work-completion-modal.tsx` | `SimpleWorkCompletionModal` | **Utilisé par:** `intervention-action-buttons.tsx` - Rapport fin travaux | ✅ |

---

## 3. MODALES LOCATAIRE (1 modale)

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 30 | `intervention/tenant-slot-confirmation-modal.tsx` | `TenantSlotConfirmationModal` | **Utilisé par:** `intervention-action-buttons.tsx` - Confirmer créneau | ✅ |

---

## 4. MODALES PARTAGÉES (10 modales)

### 4.1 Créneaux (Multi-rôle)

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 31 | `intervention/modals/time-slot-response-modal.tsx` | `TimeSlotResponseModal` | **Utilisé par:** `intervention-detail-client.tsx` - Répondre créneau (3 rôles) | ✅ |

---

### 4.2 Commentaires & Documents

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 32 | `interventions/modals/add-comment-modal.tsx` | `AddCommentModal` | **Utilisé par:** `intervention-comments-card.tsx` | ✅ |
| 33 | `intervention/modals/document-preview-modal.tsx` | `DocumentPreviewModal` | **Utilisé par:** `intervention-detail-client.tsx` | ✅ |
| 34 | `intervention/document-viewer-modal.tsx` | `DocumentViewerModal` | **Utilisé par:** `documents-section.tsx` | ⚠️ Doublon avec #33 ? |

**Questions à valider :**
- [ ] `DocumentPreviewModal` et `DocumentViewerModal` font-ils la même chose ?

---

### 4.3 Suppression & Confirmation

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 35 | `delete-confirm-modal.tsx` | `DeleteConfirmModal` | **Utilisé par:** 6 fichiers (lots, buildings, etc.) | ✅ |
| 36 | `ui/contact-delete-confirm-modal.tsx` | `ContactDeleteConfirmModal` | **Utilisé par:** 4 fichiers (grids contacts) | ⚠️ Fusionner avec #35 ? |
| 37 | `intervention/modals/confirmation-modal.tsx` | `ConfirmationModal` | **Utilisé par:** `intervention-cancellation-manager.tsx` | ⚠️ Fusionner avec #35 ? |

**Questions à valider :**
- [ ] Peut-on fusionner les 3 modales de confirmation/suppression en une seule ?

---

### 4.4 Système & Auth

| # | Fichier | Composant | Contexte d'utilisation | Status |
|---|---------|-----------|------------------------|--------|
| 38 | `onboarding/onboarding-modal.tsx` | `OnboardingModal` | **Utilisé par:** `onboarding-button.tsx` - Guide première visite | ✅ |
| 39 | `team-check-modal.tsx` | `TeamCheckModal` | **Utilisé par:** 3 pages création (lots, immeubles) | ✅ |
| 40 | `ui/security-modals.tsx` | `ChangePasswordModal`, `ChangeEmailModal` | **Utilisé par:** `profile-page.tsx` | ✅ |
| 41 | `pwa/pwa-install-prompt-modal.tsx` | `PWAInstallPromptModal` | **Utilisé par:** `pwa-dashboard-prompt.tsx` | ✅ |

---

## 5. COMPOSANTS BASE (À supprimer après migration)

| # | Fichier | Composant | Remplacé par | Status |
|---|---------|-----------|--------------|--------|
| 42 | `intervention/modals/base/intervention-modal-base.tsx` | `InterventionModalBase` | UnifiedModal | 🔄 |
| 43 | `intervention/modals/base/intervention-modal-content.tsx` | `InterventionModalContent` | UnifiedModalBody | 🔄 |
| 44 | `intervention/modals/base/intervention-modal-footer.tsx` | `InterventionModalFooter` | UnifiedModalFooter | 🔄 |
| 45 | `intervention/modals/base/intervention-modal-header.tsx` | `InterventionModalHeader` | UnifiedModalHeader | 🔄 |
| 46 | `intervention/modals/base/index.ts` | Exports | - | 🔄 |

---

## Résumé des Questions à Valider

### Doublons potentiels à vérifier

| Question | Fichiers concernés | Action si doublon |
|----------|-------------------|-------------------|
| 1. Approbation intervention | `ApprovalModal` vs `ApproveConfirmationModal` + `RejectConfirmationModal` | Supprimer les 2 anciens |
| 2. Validation devis | `QuoteValidationModal` vs `QuoteApprovalModal` + `QuoteRejectionModal` | Supprimer les 2 anciens |
| 3. Preview documents | `DocumentPreviewModal` vs `DocumentViewerModal` | Garder le plus complet |
| 4. Confirmation suppression | `DeleteConfirmModal` vs `ContactDeleteConfirmModal` vs `ConfirmationModal` | Fusionner en 1 |

### Statistiques

| Catégorie | Nombre | À migrer | Doublons ? |
|-----------|--------|----------|------------|
| Gestionnaire | 24 | 19 | 5 |
| Prestataire | 5 | 5 | 0 |
| Locataire | 1 | 1 | 0 |
| Partagées | 10 | 7 | 3 |
| Base (à supprimer) | 5 | 0 | - |
| **Total** | **45** | **32** | **8** |

---

## Actions Recommandées

### Immédiat (avant migration)
1. [ ] Vérifier si `ApproveConfirmationModal` et `RejectConfirmationModal` sont encore utilisés
2. [ ] Vérifier si `QuoteApprovalModal` et `QuoteRejectionModal` sont encore utilisés
3. [ ] Comparer `DocumentPreviewModal` vs `DocumentViewerModal`
4. [ ] Décider si fusionner les modales de confirmation

### Après validation
1. [ ] Supprimer les doublons confirmés
2. [ ] Créer `UnifiedModal`
3. [ ] Migrer les 32+ modales restantes
4. [ ] Supprimer le dossier `base/`
