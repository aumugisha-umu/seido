# SEIDO Discovery Tree

> Auto-generated from `docs/qa/discovery-tree.json` — do not edit manually.

**Version:** 2.0 | **Last Updated:** 2026-03-21T00:00:00Z

**Coverage:** 0/103 passed | 0 failed | 103 untested

---

## Gestionnaire Gestionnaire

Entry: `/auth/login`

[ ] **Dashboard** (discovery) `/gestionnaire/dashboard`
  - [ ] **Liste des biens** (discovery) `/gestionnaire/biens`
    - [ ] **Creer un immeuble (wizard 5 etapes)** (creation) `/gestionnaire/biens/immeubles/nouveau`
    - [ ] **Detail immeuble** (discovery) `/gestionnaire/biens/immeubles/{id}`
      - [ ] **Modifier immeuble** (creation) `/gestionnaire/biens/immeubles/modifier/{id}`
      - [ ] **Supprimer immeuble** (destruction) `/gestionnaire/biens/immeubles/{id}`
      - [ ] **Creer un lot (wizard)** (creation) `/gestionnaire/biens/lots/nouveau`
    - [ ] **Detail lot** (discovery) `/gestionnaire/biens/lots/{id}`
      - [ ] **Modifier lot** (creation) `/gestionnaire/biens/lots/modifier/{id}`
      - [ ] **Supprimer lot** (destruction) `/gestionnaire/biens/lots/{id}`
  - [ ] **Operations (interventions + rappels)** (discovery) `/gestionnaire/operations`
    - [ ] **Creer intervention (wizard 6 etapes)** (creation) `/gestionnaire/operations/nouvelle-intervention`
    - [ ] **Detail intervention** (discovery) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Modifier intervention** (creation) `/gestionnaire/operations/interventions/modifier/{id}`
      - [ ] **Approuver intervention (modal ApprovalModal)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Rejeter intervention (modal ApprovalModal)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Assigner prestataire** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Demander devis (modal QuoteRequestModal)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Programmer intervention (modal ProgrammingModalFinal)** (creation) `/gestionnaire/operations/interventions/{id}`
        - [ ] **Programmer — mode Date fixe** (creation) `/gestionnaire/operations/interventions/{id}`
        - [ ] **Programmer — mode Proposer creneaux (2+)** (creation) `/gestionnaire/operations/interventions/{id}`
        - [ ] **Programmer — mode Organiser (presta propose)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Confirmer creneau selectionne (modal ChooseTimeSlotModal)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Chat — 3 threads (groupe, locataire, prestataire)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Cloturer intervention (modal FinalizationModalLive)** (creation) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Annuler intervention (modal CancelConfirmationModal)** (destruction) `/gestionnaire/operations/interventions/{id}`
      - [ ] **Documents intervention (upload/download/view)** (creation) `/gestionnaire/operations/interventions/{id}`
    - [ ] **Creer un rappel** (creation) `/gestionnaire/operations/nouveau-rappel`
    - [ ] **Detail rappel** (discovery) `/gestionnaire/operations/rappels/{id}`
      - [ ] **Demarrer un rappel** (creation) `/gestionnaire/operations/rappels/{id}`
      - [ ] **Completer un rappel** (creation) `/gestionnaire/operations/rappels/{id}`
      - [ ] **Annuler un rappel** (destruction) `/gestionnaire/operations/rappels/{id}`
      - [ ] **Supprimer un rappel** (destruction) `/gestionnaire/operations/rappels/{id}`
  - [ ] **Liste contacts** (discovery) `/gestionnaire/contacts`
    - [ ] **Creer contact prestataire** (creation) `/gestionnaire/contacts/nouveau?type=prestataire`
    - [ ] **Creer contact locataire** (creation) `/gestionnaire/contacts/nouveau?type=locataire`
    - [ ] **Creer contact proprietaire** (creation) `/gestionnaire/contacts/nouveau?type=proprietaire`
    - [ ] **Detail contact** (discovery) `/gestionnaire/contacts/details/{id}`
      - [ ] **Modifier contact** (creation) `/gestionnaire/contacts/modifier/{id}`
      - [ ] **Inviter contact (modal ContactInviteModal)** (creation) `/gestionnaire/contacts/details/{id}`
      - [ ] **Renvoyer invitation (modal ContactResendModal)** (creation) `/gestionnaire/contacts/details/{id}`
      - [ ] **Annuler invitation (modal ContactCancelModal)** (destruction) `/gestionnaire/contacts/details/{id}`
      - [ ] **Revoquer acces (modal ContactRevokeModal)** (destruction) `/gestionnaire/contacts/details/{id}`
      - [ ] **Supprimer contact (modal DeleteConfirmModal)** (destruction) `/gestionnaire/contacts/details/{id}`
    - [ ] **Detail societe** (discovery) `/gestionnaire/contacts/societes/{id}`
      - [ ] **Modifier societe** (creation) `/gestionnaire/contacts/societes/modifier/{id}`
  - [ ] **Liste contrats** (discovery) `/gestionnaire/contrats`
    - [ ] **Creer contrat bail (wizard 5 etapes)** (creation) `/gestionnaire/contrats/nouveau?type=bail`
    - [ ] **Creer contrat fournisseur** (creation) `/gestionnaire/contrats/nouveau?type=fournisseur`
    - [ ] **Detail contrat** (discovery) `/gestionnaire/contrats/{id}`
      - [ ] **Modifier contrat** (creation) `/gestionnaire/contrats/modifier/{id}`
      - [ ] **Activer contrat** (creation) `/gestionnaire/contrats/{id}`
      - [ ] **Resilier contrat** (destruction) `/gestionnaire/contrats/{id}`
      - [ ] **Renouveler contrat** (creation) `/gestionnaire/contrats/{id}`
      - [ ] **Decision echeance (renouveler/resilier)** (creation) `/gestionnaire/contrats/{id}`
      - [ ] **Documents contrat (upload/download)** (creation) `/gestionnaire/contrats/{id}`
      - [ ] **Supprimer contrat** (destruction) `/gestionnaire/contrats/{id}`
  - [ ] **Boite mail** (discovery) `/gestionnaire/mail`
    - [ ] **Composer email (modal ComposeEmailModal)** (creation) `/gestionnaire/mail`
    - [ ] **Lire un email (panneau detail)** (discovery) `/gestionnaire/mail`
    - [ ] **Lier email a une entite (immeuble/lot/intervention/contrat)** (creation) `/gestionnaire/mail`
    - [ ] **Gerer blacklist emails (modal BlacklistManager)** (creation) `/gestionnaire/mail`
  - [ ] **Parametres generaux** (discovery) `/gestionnaire/parametres`
    - [ ] **Connexions email (Gmail/Outlook OAuth)** (discovery) `/gestionnaire/parametres/emails`
      - [ ] **Connecter compte email (OAuth flow)** (creation) `/gestionnaire/parametres/emails`
      - [ ] **Synchroniser emails** (creation) `/gestionnaire/parametres/emails`
      - [ ] **Deconnecter compte email** (destruction) `/gestionnaire/parametres/emails`
    - [ ] **Assistant IA telephonique** (discovery) `/gestionnaire/parametres/assistant-ia`
      - [ ] **Historique appels IA** (discovery) `/gestionnaire/parametres/assistant-ia/historique`
    - [ ] **Facturation Stripe** (discovery) `/gestionnaire/settings/billing`
      - [ ] **Upgrade abonnement (modal UpgradeModal)** (creation) `/gestionnaire/settings/billing`
      - [ ] **Portail client Stripe** (discovery) `/gestionnaire/settings/billing`
  - [ ] **Profil utilisateur** (discovery) `/gestionnaire/profile`
    - [ ] **Modifier profil (nom, telephone)** (creation) `/gestionnaire/profile`
    - [ ] **Upload/supprimer avatar** (creation) `/gestionnaire/profile`
    - [ ] **Changer mot de passe** (creation) `/gestionnaire/profile`
  - [ ] **Centre de notifications** (discovery) `/gestionnaire/notifications`
  - [ ] **Page d'aide** (discovery) `/gestionnaire/aide`
  - [ ] **Import CSV (wizard 4 etapes)** (creation) `/gestionnaire/import`
[ ] **Accepter devis (modal QuoteApprovalModal)** (creation) `/gestionnaire/operations/interventions/{id}`
[ ] **Rejeter devis (modal QuoteRejectionModal)** (creation) `/gestionnaire/operations/interventions/{id}`

## Locataire Locataire

Entry: `/auth/login`

[ ] **Dashboard locataire** (discovery) `/locataire/dashboard`
  - [ ] **Detail du lot** (discovery) `/locataire/lots/{id}`
  - [ ] **Nouvelle demande d'intervention (wizard)** (creation) `/locataire/interventions/nouvelle-demande`
  - [ ] **Detail intervention (vue locataire)** (discovery) `/locataire/interventions/{id}`
    - [ ] **Selectionner creneau (modal MultiSlotResponseModal)** (creation) `/locataire/interventions/{id}`
    - [ ] **Valider cloture (modal TenantValidationSimple)** (creation) `/locataire/interventions/{id}`
    - [ ] **Chat locataire (thread tenant_to_managers)** (creation) `/locataire/interventions/{id}`
    - [ ] **Documents intervention (vue locataire)** (discovery) `/locataire/interventions/{id}`
  - [ ] **Profil locataire** (discovery) `/locataire/profile`
  - [ ] **Notifications locataire** (discovery) `/locataire/notifications`
  - [ ] **Parametres locataire** (discovery) `/locataire/parametres`

## Prestataire Prestataire

Entry: `/auth/login`

[ ] **Dashboard prestataire** (discovery) `/prestataire/dashboard`
  - [ ] **Detail intervention (vue prestataire)** (discovery) `/prestataire/interventions/{id}`
    - [ ] **Proposer creneaux (modal MultiSlotResponseModal)** (creation) `/prestataire/interventions/{id}`
    - [ ] **Soumettre devis (modal QuoteSubmissionModal)** (creation) `/prestataire/interventions/{id}`
    - [ ] **Cloturer intervention (modal SimpleWorkCompletionModal)** (creation) `/prestataire/interventions/{id}`
    - [ ] **Chat prestataire (thread provider_to_managers)** (creation) `/prestataire/interventions/{id}`
    - [ ] **Documents intervention (upload prestataire)** (creation) `/prestataire/interventions/{id}`
    - [ ] **Confirmer participation a l'intervention** (creation) `/prestataire/interventions/{id}`
  - [ ] **Profil prestataire** (discovery) `/prestataire/profile`
  - [ ] **Notifications prestataire** (discovery) `/prestataire/notifications`
  - [ ] **Parametres prestataire** (discovery) `/prestataire/parametres`

## Cross-Role Scenarios

Scenarios end-to-end impliquant plusieurs roles (switch login entre chaque phase)

### Cycle de vie complet d'une intervention

**Phase 1: Demande** (locataire)
- Naviguer vers /locataire/interventions/nouvelle-demande
- Selectionner le lot
- Choisir categorie puis type: Plomberie
- Remplir description + upload photo
- Soumettre → verifier statut demande + toast + redirect

**Phase 2: Approbation + Assignment** (gestionnaire)
- Verifier notification recue dans /notifications
- Clic → detail intervention
- Approuver via modal → statut approuvee
- Assigner un prestataire via selector
- Activer requires_quote si besoin

**Phase 3: Devis** (prestataire)
- Verifier notification recue
- Ouvrir detail intervention
- Confirmer participation
- Soumettre devis via modal (montant, description, type estimation)
- Verifier statut devis sent

**Phase 4: Acceptation devis + Planification** (gestionnaire)
- Recevoir notification devis
- Onglet Devis → accepter devis via modal → statut accepted
- Programmer intervention avec 2 creneaux via ProgrammingModal mode proposer
- Verifier statut planification

**Phase 5: Selection creneau** (locataire)
- Verifier notification creneaux proposes
- Ouvrir detail intervention
- Onglet Creneaux → selectionner un creneau via modal → status selected
- Verifier confirmation envoyee

**Phase 6: Confirmation creneau** (gestionnaire)
- Verifier notification creneau selectionne
- Confirmer le creneau via ChooseTimeSlotModal → statut planifiee
- Verifier date/heure affichees dans le detail

**Phase 7: Chat cross-role** (gestionnaire)
- Envoyer message dans thread groupe
- Switch → locataire: verifier message visible dans thread groupe
- Locataire: envoyer message dans thread tenant_to_managers
- Switch → gestionnaire: verifier message recu dans thread locataire
- Switch → prestataire: envoyer message dans thread provider_to_managers
- Switch → gestionnaire: verifier 3 threads avec messages corrects

**Phase 8: Cloture sequentielle** (prestataire)
- Cloturer via SimpleWorkCompletionModal → statut cloturee_par_prestataire
- Switch → locataire: valider via TenantValidationSimple → cloturee_par_locataire
- Switch → gestionnaire: cloturer via FinalizationModalLive → cloturee_par_gestionnaire
- Verifier intervention dans liste terminees (chaque role)
- Verifier pas d'actions restantes (boutons grises ou absents)

### Annulation d'une intervention en cours

**Phase 1: Creation rapide** (gestionnaire)
- Creer intervention via wizard gestionnaire
- Assigner prestataire
- Approuver

**Phase 2: Annulation** (gestionnaire)
- Annuler via CancelConfirmationModal → statut annulee
- Verifier notification envoyee presta + locataire

**Phase 3: Verification post-annulation** (locataire)
- Voir intervention annulee
- Verifier pas d'actions disponibles
- Switch → prestataire: meme verification

### Invitation et onboarding d'un contact

**Phase 1: Creation + invitation** (gestionnaire)
- Creer contact prestataire avec email demo+invite-{ts}@seido-app.com
- Inviter via ContactInviteModal
- Verifier statut pending

**Phase 2: Gestion invitation** (gestionnaire)
- Renvoyer invitation via ContactResendModal
- Annuler invitation via ContactCancelModal
- Re-inviter
- Revoquer acces via ContactRevokeModal

### Cycle de vie d'un contrat bail

**Phase 1: Creation** (gestionnaire)
- Creer contrat bail via wizard (5 etapes)
- Associer lot + locataire
- Upload document

**Phase 2: Activation + gestion** (gestionnaire)
- Activer le contrat
- Verifier statut active
- Ajouter/supprimer contacts
- Upload documents supplementaires

**Phase 3: Echeance + decision** (gestionnaire)
- Verifier alerte echeance (si applicable)
- Prendre decision: renouveler ou resilier
- Verifier nouveau statut

