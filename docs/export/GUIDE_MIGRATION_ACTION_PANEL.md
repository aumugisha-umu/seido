# 🚀 Guide de Migration de l'Intervention Action Panel
## De la branche `refacto` vers `optimization` - Migration Progressive par Workflow

---

## 📌 Vue d'ensemble

Ce guide vous permet de migrer **progressivement** l'ensemble du système d'Intervention Action Panel de la branche `refacto` vers `optimization`, en suivant l'**ordre chronologique du workflow d'intervention**.

### ✅ Avantages de cette approche
- **Testabilité** : Vous pouvez tester chaque phase du workflow au fur et à mesure
- **Progressivité** : Pas besoin de tout migrer d'un coup
- **Sécurité** : Si un problème survient, vous savez exactement quelle phase est concernée
- **Compréhension** : Vous comprenez le flow complet de l'intervention en le construisant étape par étape

### 🔄 Workflow complet d'une intervention

```
1. CRÉATION           → Locataire ou Gestionnaire crée une demande
2. APPROBATION        → Gestionnaire approuve ou rejette
3. DEVIS              → Gestionnaire demande → Prestataire soumet → Gestionnaire approuve
4. PLANIFICATION      → Collecte disponibilités → Matching → Confirmation
5. EXÉCUTION          → Prestataire marque comme terminé
6. VALIDATION         → Locataire valide ou conteste
7. FINALISATION       → Gestionnaire clôture définitivement
```

---

## 🛠️ Prérequis

### Vérifications initiales

```bash
# 1. Vérifier que vous êtes sur la branche refacto
git branch --show-current
# Résultat attendu : refacto

# 2. Vérifier qu'il n'y a pas de modifications non commitées
git status
# Résultat attendu : working tree clean

# 3. Créer un backup de sécurité
git branch backup-refacto-$(date +%Y%m%d-%H%M%S)
```

### Structure des dossiers cibles

Les fichiers seront migrés vers :
- `components/intervention/` - Composants principaux
- `components/intervention/modals/` - Modales de workflow
- `components/intervention/closure/` - Types et composants de clôture
- `hooks/` - Hooks métier
- `lib/` - Services et utilitaires

---

## 📦 Phase 0 : Fondations (Services & Hooks de base)

### 🎯 Objectif
Installer les **services métier** et **hooks de base** qui seront utilisés par tous les composants du workflow.

### 📋 Fichiers à migrer (6 fichiers)

#### Services métier
1. `lib/intervention-actions-service.ts` - Service central pour toutes les actions d'intervention
2. `lib/quote-state-utils.ts` - Utilitaires de gestion d'état des devis
3. `lib/availability-filtering-utils.ts` - Utilitaires de filtrage des disponibilités

#### Hooks de base
4. `hooks/use-intervention-quoting.ts` - Hook de gestion des devis
5. `hooks/use-intervention-planning.ts` - Hook de gestion de la planification
6. `hooks/use-auth.ts` - Hook d'authentification (si pas déjà présent)

### 💻 Commandes Git

```bash
# Naviguer vers la branche optimization
git checkout optimization

# Créer un backup de sécurité
git branch backup-optimization-before-migration-$(date +%Y%m%d-%H%M%S)

# Migrer les services
git checkout refacto -- lib/intervention-actions-service.ts
git checkout refacto -- lib/quote-state-utils.ts
git checkout refacto -- lib/availability-filtering-utils.ts

# Migrer les hooks
git checkout refacto -- hooks/use-intervention-quoting.ts
git checkout refacto -- hooks/use-intervention-planning.ts

# Vérifier si use-auth existe déjà, sinon le migrer
# (Adapter selon votre situation)
```

### ✅ Vérification

```bash
# Vérifier la compilation TypeScript
npm run build

# Vérifier les erreurs de lint
npm run lint
```

### ⚠️ Points d'attention

- **intervention-actions-service** : Assurez-vous que les routes API correspondent à celles de votre branche optimization
- **use-auth** : Ce hook peut déjà exister sur optimization avec une signature différente

### 🧪 Test de validation

À ce stade, rien de visible dans l'interface, mais vérifiez :
```bash
# Pas d'erreurs TypeScript
npm run build

# Les imports sont résolus
npm run lint
```

---

## 📦 Phase 1 : Création & Approbation

### 🎯 Objectif
Permettre aux **gestionnaires d'approuver ou rejeter** les demandes d'intervention créées par les locataires.

### 📋 Fichiers à migrer (5 fichiers)

#### Composant principal
1. `components/intervention/intervention-action-panel.tsx` - Composant principal d'action

#### Modales d'approbation
2. `components/intervention/modals/approval-modal.tsx` - Modale générique d'approbation
3. `components/intervention/modals/approve-confirmation-modal.tsx` - Confirmation d'approbation
4. `components/intervention/modals/reject-confirmation-modal.tsx` - Confirmation de rejet

#### Hook métier
5. `hooks/use-intervention-approval.ts` - Hook de gestion de l'approbation

### 💻 Commandes Git

```bash
# Migrer le composant principal
git checkout refacto -- components/intervention/intervention-action-panel.tsx

# Migrer les modales d'approbation
git checkout refacto -- components/intervention/modals/approval-modal.tsx
git checkout refacto -- components/intervention/modals/approve-confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/reject-confirmation-modal.tsx

# Migrer le hook
git checkout refacto -- hooks/use-intervention-approval.ts
```

### 🔌 Intégration dans les pages

#### Pour le Gestionnaire (`app/dashboard/gestionnaire/interventions/[id]/page.tsx`)

```tsx
import { InterventionActionPanel } from "@/components/intervention/intervention-action-panel"
import { useAuth } from "@/hooks/use-auth"

export default function InterventionDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [intervention, setIntervention] = useState(null)

  const handleActionComplete = async () => {
    // Recharger les données de l'intervention
    await fetchIntervention()
  }

  return (
    <div className="container mx-auto p-6">
      {/* Vos composants existants */}

      {/* Ajouter le panneau d'actions */}
      <InterventionActionPanel
        intervention={intervention}
        userRole="gestionnaire"
        userId={user?.id || ''}
        onActionComplete={handleActionComplete}
      />
    </div>
  )
}
```

### ✅ Vérification

```bash
# Compilation
npm run build

# Lancer l'application
npm run dev
```

### 🧪 Test de validation

**Scénario : Approbation d'une intervention**

1. **Créer une intervention** (en tant que locataire si possible, sinon créer manuellement dans la DB)
2. **Se connecter en tant que gestionnaire**
3. **Naviguer vers une intervention au statut "demande"**
4. **Vérifier que 2 boutons apparaissent** :
   - ✅ "Approuver"
   - ❌ "Rejeter"
5. **Cliquer sur "Approuver"**
   - Une modale de confirmation s'ouvre
   - Cliquer sur "Confirmer"
   - L'intervention passe au statut "approuvee"
6. **Cliquer sur "Rejeter"** (sur une autre intervention)
   - Une modale demandant un motif s'ouvre
   - Saisir un motif
   - Confirmer
   - L'intervention passe au statut "rejetee"

### ⚠️ Points d'attention

- Vérifier que le statut change bien dans la base de données
- Vérifier que les notifications sont envoyées (si système de notifications actif)

---

## 📦 Phase 2 : Gestion des Devis

### 🎯 Objectif
Permettre au **gestionnaire de demander des devis** et aux **prestataires de les soumettre**.

### 📋 Fichiers à migrer (8 fichiers)

#### Modales de demande de devis (côté Gestionnaire)
1. `components/intervention/modals/multi-quote-request-modal.tsx` - Demande de devis à plusieurs prestataires
2. `components/intervention/modals/quote-request-modal.tsx` - Demande de devis simple
3. `components/intervention/modals/quote-request-success-modal.tsx` - Confirmation d'envoi
4. `components/intervention/modals/external-quote-request-modal.tsx` - Demande externe

#### Composants de soumission (côté Prestataire)
5. `components/intervention/quote-submission-form.tsx` - Formulaire de soumission de devis
6. `components/quotes/quotes-list.tsx` - Liste des devis (si pas déjà présent)
7. `components/quotes/integrated-quotes-section.tsx` - Section intégrée des devis

#### Hook métier déjà migré en Phase 0
- ✅ `hooks/use-intervention-quoting.ts` (déjà fait)

### 💻 Commandes Git

```bash
# Migrer les modales de demande de devis
git checkout refacto -- components/intervention/modals/multi-quote-request-modal.tsx
git checkout refacto -- components/intervention/modals/quote-request-modal.tsx
git checkout refacto -- components/intervention/modals/quote-request-success-modal.tsx
git checkout refacto -- components/intervention/modals/external-quote-request-modal.tsx

# Migrer le formulaire de soumission
git checkout refacto -- components/intervention/quote-submission-form.tsx

# Migrer les composants quotes (vérifier d'abord s'ils existent)
git checkout refacto -- components/quotes/quotes-list.tsx
git checkout refacto -- components/quotes/integrated-quotes-section.tsx
```

### 🔌 Intégration dans les pages

Le composant `InterventionActionPanel` migré en Phase 1 gère déjà les devis via le hook `useInterventionQuoting`, donc **aucune modification supplémentaire n'est nécessaire** dans les pages.

Les modales s'ouvrent automatiquement quand :
- Gestionnaire clique sur "Demander des devis"
- Prestataire clique sur "Soumettre un devis"

### ✅ Vérification

```bash
# Compilation
npm run build

# Vérifier les imports de composants quotes
npm run lint
```

### 🧪 Test de validation

**Scénario : Cycle complet de devis**

#### A. Demande de devis (Gestionnaire)
1. **Se connecter en tant que gestionnaire**
2. **Aller sur une intervention au statut "approuvee"**
3. **Cliquer sur "Demander des devis"**
   - Modale s'ouvre avec liste de prestataires
4. **Sélectionner 2-3 prestataires**
5. **Ajouter une note (optionnel)**
6. **Confirmer l'envoi**
   - Modale de succès s'affiche
   - Le statut passe à "demande_de_devis"

#### B. Soumission de devis (Prestataire)
1. **Se connecter en tant que prestataire**
2. **Aller sur l'intervention créée à l'étape A**
3. **Cliquer sur "Soumettre un devis"**
   - Modale de soumission s'ouvre
4. **Remplir le formulaire** :
   - Montant estimé
   - Description des travaux
   - Disponibilités
5. **Soumettre**
   - Le devis apparaît dans la liste

#### C. Approbation de devis (Gestionnaire)
1. **Retour en tant que gestionnaire**
2. **Aller sur l'intervention**
3. **Voir la liste des devis reçus**
4. **Approuver un devis**
   - Le statut du devis passe à "approved"
   - L'intervention peut maintenant être planifiée

### ⚠️ Points d'attention

- Vérifier que les **notifications** sont bien envoyées aux prestataires
- Vérifier que seul le **prestataire dont le devis est approuvé** peut voir l'intervention en planification
- Tester l'**annulation de devis** par le prestataire

---

## 📦 Phase 3 : Planification

### 🎯 Objectif
Permettre la **collecte des disponibilités** de tous les acteurs et le **matching de créneaux** pour planifier l'intervention.

### 📋 Fichiers à migrer (8 fichiers)

#### Modales de planification
1. `components/intervention/modals/programming-modal.tsx` - Modale de choix de mode de planification
2. `components/intervention/modals/programming-modal-enhanced.tsx` - Version enrichie (optionnel)
3. `components/intervention/modals/provider-availability-modal.tsx` - Saisie des disponibilités prestataire
4. `components/intervention/tenant-slot-confirmation-modal.tsx` - Confirmation de créneau par le locataire
5. `components/intervention/modals/schedule-rejection-modal.tsx` - Rejet de planning

#### Composants de disponibilité
6. `components/intervention/provider-availability-selection.tsx` - Sélection de disponibilités prestataire
7. `components/intervention/tenant-availability-input.tsx` - Saisie de disponibilités locataire
8. `components/intervention/user-availabilities-display.tsx` - Affichage des disponibilités

#### Hook métier déjà migré en Phase 0
- ✅ `hooks/use-intervention-planning.ts` (déjà fait)

#### Utilitaire déjà migré en Phase 0
- ✅ `lib/availability-filtering-utils.ts` (déjà fait)

### 💻 Commandes Git

```bash
# Migrer les modales de planification
git checkout refacto -- components/intervention/modals/programming-modal.tsx
git checkout refacto -- components/intervention/modals/programming-modal-enhanced.tsx
git checkout refacto -- components/intervention/modals/provider-availability-modal.tsx
git checkout refacto -- components/intervention/tenant-slot-confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/schedule-rejection-modal.tsx

# Migrer les composants de disponibilité
git checkout refacto -- components/intervention/provider-availability-selection.tsx
git checkout refacto -- components/intervention/tenant-availability-input.tsx
git checkout refacto -- components/intervention/user-availabilities-display.tsx
```

### 🔌 Intégration dans les pages

Le composant `InterventionActionPanel` gère déjà la planification via le hook `useInterventionPlanning`, donc **aucune modification supplémentaire n'est nécessaire**.

### ✅ Vérification

```bash
# Compilation
npm run build

# Lancer l'application
npm run dev
```

### 🧪 Test de validation

**Scénario : Cycle complet de planification**

#### A. Lancement de la planification (Gestionnaire)
1. **Intervention au statut "approuvee" ou avec un devis approuvé**
2. **Cliquer sur "Organiser la planification"** ou "Planification"
3. **Modale de programmation s'ouvre** avec 2 options :
   - Planification directe (date fixe)
   - Collecte de disponibilités
4. **Choisir "Collecte de disponibilités"**
5. **Confirmer**
   - Statut passe à "planification"

#### B. Ajout de disponibilités (Prestataire)
1. **Se connecter en tant que prestataire (celui dont le devis est approuvé)**
2. **Aller sur l'intervention en planification**
3. **Cliquer sur "Ajouter mes disponibilités"**
4. **Saisir 2-3 créneaux**
   - Date
   - Heure de début
   - Heure de fin
5. **Confirmer**

#### C. Ajout de disponibilités (Locataire)
1. **Se connecter en tant que locataire**
2. **Aller sur l'intervention**
3. **Voir les créneaux proposés**
4. **Ajouter ses propres disponibilités** (si interface le permet)

#### D. Confirmation de créneau (Locataire)
1. **Voir les créneaux communs** (matching automatique)
2. **Cliquer sur "Valider un créneau"**
3. **Sélectionner un créneau compatible**
4. **Confirmer**
   - Statut passe à "planifiee"
   - La date est fixée

#### E. Rejet de planning (Prestataire)
1. **Scénario alternatif** : Si le gestionnaire impose une date fixe
2. **Prestataire voit "Accepter/Refuser le planning"**
3. **Cliquer sur "Refuser le planning"**
4. **Modale de rejet s'ouvre**
5. **Saisir le motif + proposer alternative**
6. **Confirmer**
   - Retour en planification

### ⚠️ Points d'attention

- Vérifier le **filtrage des disponibilités** selon le prestataire approuvé
- Tester le **matching automatique** de créneaux
- Vérifier les **notifications** à chaque étape
- Tester le **rejet de planification** par le locataire également

---

## 📦 Phase 4 : Exécution des Travaux

### 🎯 Objectif
Permettre au **prestataire de marquer l'intervention comme terminée** avec un rapport de fin de travaux.

### 📋 Fichiers à migrer (3 fichiers)

#### Modales de complétion
1. `components/intervention/simple-work-completion-modal.tsx` - Modale simple de fin de travaux
2. `components/intervention/work-completion-report.tsx` - Rapport détaillé de fin de travaux

#### Hook métier
3. `hooks/use-intervention-execution.ts` - Hook de gestion de l'exécution

### 💻 Commandes Git

```bash
# Migrer les modales de complétion
git checkout refacto -- components/intervention/simple-work-completion-modal.tsx
git checkout refacto -- components/intervention/work-completion-report.tsx

# Migrer le hook
git checkout refacto -- hooks/use-intervention-execution.ts
```

### 🔌 Intégration

Le composant `InterventionActionPanel` gère déjà l'exécution, donc **aucune modification supplémentaire n'est nécessaire**.

### ✅ Vérification

```bash
npm run build
npm run dev
```

### 🧪 Test de validation

**Scénario : Complétion des travaux**

#### A. Marquer comme terminé (Prestataire)
1. **Intervention au statut "planifiee" ou "en_cours"**
2. **Se connecter en tant que prestataire**
3. **Cliquer sur "Marquer comme terminé"**
4. **Modale de complétion s'ouvre**
5. **Remplir le formulaire** :
   - Rapport des travaux effectués
   - Photos avant/après (optionnel)
   - Documents (factures, etc.)
6. **Confirmer**
   - Statut passe à "cloturee_par_prestataire"

#### B. Complétion par le Gestionnaire (alternatif)
1. **Le gestionnaire peut aussi marquer comme terminé**
2. **Même formulaire**

### ⚠️ Points d'attention

- Vérifier l'**upload de photos** (mocks ou réel selon votre backend)
- Tester avec et **sans photos**
- Vérifier que le **rapport est bien sauvegardé**

---

## 📦 Phase 5 : Validation & Clôture

### 🎯 Objectif
Permettre au **locataire de valider ou contester** les travaux, puis au **gestionnaire de finaliser** l'intervention.

### 📋 Fichiers à migrer (7 fichiers)

#### Modales de validation (Locataire)
1. `components/intervention/tenant-validation-simple.tsx` - Validation ou contestation simple
2. `components/intervention/tenant-validation-form.tsx` - Formulaire de validation détaillé

#### Modale de finalisation (Gestionnaire)
3. `components/intervention/simplified-finalization-modal.tsx` - Finalisation simplifiée
4. `components/intervention/finalization-confirmation-modal.tsx` - Confirmation de finalisation

#### Types de clôture
5. `components/intervention/closure/types.ts` - Types TypeScript pour la clôture
6. `components/intervention/closure/simple-types.ts` - Types simplifiés
7. `components/intervention/closure/index.ts` - Exports

#### Hook métier
8. `hooks/use-intervention-finalization.ts` - Hook de finalisation

### 💻 Commandes Git

```bash
# Migrer les modales de validation locataire
git checkout refacto -- components/intervention/tenant-validation-simple.tsx
git checkout refacto -- components/intervention/tenant-validation-form.tsx

# Migrer les modales de finalisation
git checkout refacto -- components/intervention/simplified-finalization-modal.tsx
git checkout refacto -- components/intervention/finalization-confirmation-modal.tsx

# Migrer les types de clôture (créer le dossier si nécessaire)
git checkout refacto -- components/intervention/closure/

# Migrer le hook
git checkout refacto -- hooks/use-intervention-finalization.ts
```

### 🔌 Intégration

Le composant `InterventionActionPanel` gère déjà la validation et la finalisation, donc **aucune modification supplémentaire n'est nécessaire**.

### ✅ Vérification

```bash
npm run build
npm run dev
```

### 🧪 Test de validation

**Scénario : Validation et Clôture**

#### A. Validation des travaux (Locataire)
1. **Intervention au statut "cloturee_par_prestataire"**
2. **Se connecter en tant que locataire**
3. **Voir 2 boutons** :
   - ✅ "Valider les travaux"
   - ⚠️ "Contester"
4. **Cliquer sur "Valider les travaux"**
5. **Modale de validation s'ouvre**
6. **Ajouter des commentaires (optionnel)**
7. **Ajouter des photos (optionnel)**
8. **Confirmer**
   - Statut passe à "cloturee_par_locataire"

#### B. Contestation (Locataire - scénario alternatif)
1. **Cliquer sur "Contester"**
2. **Modale de contestation s'ouvre**
3. **Saisir le motif de contestation**
4. **Ajouter des photos du problème**
5. **Confirmer**
   - Statut passe à "contestee" (ou retour en "en_cours")

#### C. Finalisation (Gestionnaire)
1. **Intervention au statut "cloturee_par_locataire"**
2. **Se connecter en tant que gestionnaire**
3. **Cliquer sur "Finaliser"**
4. **Modale de finalisation s'ouvre**
5. **Vérifier le récapitulatif**
6. **Ajouter des notes finales (optionnel)**
7. **Confirmer**
   - Statut passe à "finalisee" ou "terminee"

### ⚠️ Points d'attention

- Vérifier que le **locataire ne peut pas valider** une intervention dont il n'est pas le demandeur
- Tester le **workflow de contestation** complet
- Vérifier les **notifications** à chaque étape

---

## 📦 Phase 6 : Intégration Complète & Header

### 🎯 Objectif
Intégrer le **header action panel** pour affichage compact dans l'en-tête des pages, et finaliser l'intégration dans toutes les pages.

### 📋 Fichiers à migrer (1 fichier + modales manquantes)

#### Composant header
1. `components/intervention/intervention-action-panel-header.tsx` - Version header du panneau d'actions

#### Modales de base (si pas déjà migrées)
2. `components/intervention/modals/base-confirmation-modal.tsx` - Modale de base
3. `components/intervention/modals/confirmation-modal.tsx` - Modale de confirmation générique
4. `components/intervention/modals/success-modal.tsx` - Modale de succès

### 💻 Commandes Git

```bash
# Migrer le header
git checkout refacto -- components/intervention/intervention-action-panel-header.tsx

# Migrer les modales de base si manquantes
git checkout refacto -- components/intervention/modals/base-confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/success-modal.tsx
```

### 🔌 Intégration dans les pages

#### Utilisation du Header dans l'en-tête de page

```tsx
// app/dashboard/[role]/interventions/[id]/page.tsx
import { InterventionActionPanelHeader } from "@/components/intervention/intervention-action-panel-header"
import { useAuth } from "@/hooks/use-auth"

export default function InterventionDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [intervention, setIntervention] = useState(null)

  const handleActionComplete = async () => {
    await fetchIntervention()
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header avec actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{intervention?.title}</h1>
          <p className="text-sm text-gray-500">Intervention #{intervention?.id}</p>
        </div>

        {/* Actions en boutons horizontaux */}
        <InterventionActionPanelHeader
          intervention={intervention}
          userRole={user?.role as 'locataire' | 'gestionnaire' | 'prestataire'}
          userId={user?.id || ''}
          onActionComplete={handleActionComplete}
        />
      </div>

      {/* Contenu de la page */}
      {/* ... vos composants existants ... */}
    </div>
  )
}
```

#### Alternative : Utilisation du Panel complet (sidebar ou section)

```tsx
// Si vous préférez l'affichage vertical complet
import { InterventionActionPanel } from "@/components/intervention/intervention-action-panel"

<InterventionActionPanel
  intervention={intervention}
  userRole={user?.role}
  userId={user?.id}
  onActionComplete={handleActionComplete}
/>
```

### 🎨 Différences entre Header et Panel

| Caractéristique | InterventionActionPanel | InterventionActionPanelHeader |
|----------------|------------------------|------------------------------|
| **Affichage** | Vertical (Card) | Horizontal (Buttons) |
| **Placement** | Sidebar ou section | En-tête de page |
| **Taille** | Complet avec descriptions | Compact |
| **Badge statut** | Oui | Non |
| **Descriptions** | Oui | Tooltips seulement |

### ✅ Vérification finale

```bash
# Compilation complète
npm run build

# Vérifier qu'il n'y a pas d'erreurs
npm run lint

# Lancer l'application
npm run dev
```

### 🧪 Test de validation End-to-End

**Scénario : Workflow complet de A à Z**

1. **Création** (Locataire)
   - Créer une intervention
   - Vérifier qu'elle apparaît au statut "demande"

2. **Approbation** (Gestionnaire)
   - Approuver l'intervention
   - Statut → "approuvee"

3. **Demande de devis** (Gestionnaire)
   - Demander des devis à 2-3 prestataires
   - Statut → "demande_de_devis"

4. **Soumission devis** (Prestataire 1 & 2)
   - Chaque prestataire soumet un devis
   - Devis apparaissent dans la liste

5. **Approbation devis** (Gestionnaire)
   - Approuver un devis
   - Statut reste "demande_de_devis" mais un devis est approuvé

6. **Planification** (Gestionnaire)
   - Lancer la planification
   - Statut → "planification"

7. **Disponibilités** (Prestataire + Locataire)
   - Prestataire ajoute ses dispos
   - Locataire voit les créneaux

8. **Confirmation créneau** (Locataire)
   - Valider un créneau
   - Statut → "planifiee"

9. **Exécution** (Prestataire)
   - Marquer comme terminé
   - Statut → "cloturee_par_prestataire"

10. **Validation** (Locataire)
    - Valider les travaux
    - Statut → "cloturee_par_locataire"

11. **Finalisation** (Gestionnaire)
    - Finaliser l'intervention
    - Statut → "finalisee" ou "terminee"

### ⚠️ Points d'attention finaux

- Vérifier que **toutes les modales s'affichent correctement** sur mobile
- Tester avec **différents rôles** sur une même intervention
- Vérifier que les **permissions** sont bien respectées (un prestataire non approuvé ne doit pas voir l'intervention)
- Tester les **cas d'erreur** (réseau, serveur, etc.)

---

## 📦 Phase 7 : Composants Complémentaires (Optionnel)

### 🎯 Objectif
Migrer les **composants complémentaires** qui enrichissent l'expérience utilisateur mais ne sont pas critiques pour le workflow de base.

### 📋 Fichiers à migrer (optionnels)

#### Composants d'affichage
1. `components/intervention/intervention-detail-header.tsx` - En-tête détaillé
2. `components/intervention/intervention-detail-tabs.tsx` - Système d'onglets
3. `components/intervention/intervention-details-card.tsx` - Card de détails
4. `components/intervention/intervention-logement-card.tsx` - Card logement
5. `components/intervention/logement-card.tsx` - Card logement alternatif
6. `components/intervention/assigned-contacts-card.tsx` - Card contacts assignés
7. `components/intervention/planning-card.tsx` - Card de planning
8. `components/intervention/chats-card.tsx` - Card de messagerie
9. `components/intervention/files-card.tsx` - Card de fichiers

#### Gestion d'annulation
10. `components/intervention/intervention-cancel-button.tsx` - Bouton d'annulation
11. `components/intervention/intervention-cancellation-manager.tsx` - Gestionnaire d'annulation
12. `components/intervention/modals/cancel-confirmation-modal.tsx` - Confirmation d'annulation
13. `hooks/use-intervention-cancellation.ts` - Hook d'annulation

### 💻 Commandes Git

```bash
# Migrer les composants d'affichage
git checkout refacto -- components/intervention/intervention-detail-header.tsx
git checkout refacto -- components/intervention/intervention-detail-tabs.tsx
git checkout refacto -- components/intervention/intervention-details-card.tsx
git checkout refacto -- components/intervention/intervention-logement-card.tsx
git checkout refacto -- components/intervention/logement-card.tsx
git checkout refacto -- components/intervention/assigned-contacts-card.tsx
git checkout refacto -- components/intervention/planning-card.tsx
git checkout refacto -- components/intervention/chats-card.tsx
git checkout refacto -- components/intervention/files-card.tsx

# Migrer les composants d'annulation
git checkout refacto -- components/intervention/intervention-cancel-button.tsx
git checkout refacto -- components/intervention/intervention-cancellation-manager.tsx
git checkout refacto -- components/intervention/modals/cancel-confirmation-modal.tsx
git checkout refacto -- hooks/use-intervention-cancellation.ts
```

### 🧪 Test

Ces composants sont optionnels et peuvent être intégrés progressivement selon vos besoins.

---

## 🎯 Checklist de Migration Complète

### ✅ Phase 0 : Fondations
- [ ] Services migrés (intervention-actions-service, quote-state-utils, availability-filtering-utils)
- [ ] Hooks de base migrés (use-intervention-quoting, use-intervention-planning)
- [ ] Compilation réussie (`npm run build`)
- [ ] Pas d'erreurs de lint (`npm run lint`)

### ✅ Phase 1 : Création & Approbation
- [ ] Composant action panel migré
- [ ] Modales d'approbation migrées
- [ ] Hook d'approbation migré
- [ ] Test : Approbation d'intervention ✓
- [ ] Test : Rejet d'intervention ✓

### ✅ Phase 2 : Gestion des Devis
- [ ] Modales de demande de devis migrées
- [ ] Formulaire de soumission migré
- [ ] Test : Demande de devis ✓
- [ ] Test : Soumission de devis ✓
- [ ] Test : Approbation de devis ✓

### ✅ Phase 3 : Planification
- [ ] Modales de planification migrées
- [ ] Composants de disponibilité migrés
- [ ] Test : Lancement planification ✓
- [ ] Test : Ajout disponibilités prestataire ✓
- [ ] Test : Confirmation créneau locataire ✓
- [ ] Test : Rejet de planning ✓

### ✅ Phase 4 : Exécution
- [ ] Modales de complétion migrées
- [ ] Hook d'exécution migré
- [ ] Test : Marquer comme terminé ✓
- [ ] Test : Upload de photos ✓

### ✅ Phase 5 : Validation & Clôture
- [ ] Modales de validation migrées
- [ ] Modales de finalisation migrées
- [ ] Types de clôture migrés
- [ ] Hook de finalisation migré
- [ ] Test : Validation locataire ✓
- [ ] Test : Contestation locataire ✓
- [ ] Test : Finalisation gestionnaire ✓

### ✅ Phase 6 : Intégration Complète
- [ ] Header action panel migré
- [ ] Modales de base migrées
- [ ] Intégration dans toutes les pages (gestionnaire, prestataire, locataire)
- [ ] Test End-to-End complet ✓

### ✅ Phase 7 : Composants Optionnels
- [ ] Composants d'affichage migrés (selon besoins)
- [ ] Système d'annulation migré (selon besoins)

---

## 🐛 Troubleshooting - Problèmes Courants

### Erreur : Module not found

```
Error: Cannot find module '@/components/intervention/modals/xxx'
```

**Solution** : Vérifiez que vous avez bien migré le fichier concerné
```bash
git checkout refacto -- components/intervention/modals/xxx.tsx
```

### Erreur : Type 'Quote' is not defined

```
Error: Cannot find name 'Quote'
```

**Solution** : Migrer les types manquants
```bash
git checkout refacto -- lib/quote-state-utils.ts
```

### Erreur : Hook useInterventionQuoting not found

```
Error: Cannot find module '@/hooks/use-intervention-quoting'
```

**Solution** : Migrer le hook
```bash
git checkout refacto -- hooks/use-intervention-quoting.ts
```

### Les boutons d'action n'apparaissent pas

**Causes possibles** :
1. Le statut de l'intervention ne correspond pas au workflow
2. Le rôle de l'utilisateur n'est pas le bon
3. Les données de l'intervention sont incomplètes (manque quotes, availabilities, etc.)

**Solution** :
- Vérifier les props passées au composant
- Inspecter `intervention.status` et `userRole`
- Vérifier dans la console les logs du composant

### Les modales ne s'ouvrent pas

**Causes possibles** :
1. Le hook concerné n'est pas importé
2. Le callback n'est pas passé correctement

**Solution** :
- Vérifier les imports du hook
- Vérifier que `onActionComplete` est bien défini

### Erreur de compilation TypeScript

```
Type 'X' is not assignable to type 'Y'
```

**Solution** :
- Vérifier que tous les types ont été migrés (dossier `closure/`)
- Vérifier la version de TypeScript
- Nettoyer le cache : `rm -rf .next && npm run build`

---

## 📚 Annexes

### A. Architecture du système

```
┌─────────────────────────────────────────────────────────┐
│                    Page Intervention                     │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │      InterventionActionPanel (ou Header)          │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │         getAvailableActions()                │ │ │
│  │  │  (Détermine les actions selon rôle/statut)  │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │            executeAction()                   │ │ │
│  │  │  (Ouvre modales ou appelle services)        │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  │                                                    │ │
│  │  Hooks utilisés :                                 │ │
│  │  • useInterventionQuoting                         │ │
│  │  • useInterventionPlanning                        │ │
│  │  • useAuth                                        │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                    Modales                         │ │
│  │                                                    │ │
│  │  • MultiQuoteRequestModal                         │ │
│  │  • ProgrammingModal                               │ │
│  │  • SimpleWorkCompletionModal                      │ │
│  │  • TenantValidationSimple                         │ │
│  │  • SimplifiedFinalizationModal                    │ │
│  │  • ... etc                                         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                   Services                         │ │
│  │                                                    │ │
│  │  • interventionActionsService                     │ │
│  │    → API calls pour toutes les actions            │ │
│  │                                                    │ │
│  │  • quote-state-utils                              │ │
│  │    → Gestion d'état des devis                     │ │
│  │                                                    │ │
│  │  • availability-filtering-utils                   │ │
│  │    → Filtrage des disponibilités                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### B. Mapping Statuts → Actions → Modales

| Statut | Rôle | Actions disponibles | Modales |
|--------|------|---------------------|---------|
| `demande` | Gestionnaire | Approuver / Rejeter | ApproveConfirmationModal / RejectConfirmationModal |
| `approuvee` | Gestionnaire | Demander devis / Planification | MultiQuoteRequestModal / ProgrammingModal |
| `demande_de_devis` | Gestionnaire | Relancer / Gérer devis | MultiQuoteRequestModal |
| `demande_de_devis` | Prestataire | Soumettre devis / Modifier devis | QuoteSubmissionForm |
| `planification` | Gestionnaire | Modifier planification | ProgrammingModal |
| `planification` | Prestataire | Ajouter disponibilités / Accepter/Refuser | ProviderAvailabilityModal / ScheduleRejectionModal |
| `planification` | Locataire | Confirmer créneau | TenantSlotConfirmationModal |
| `planifiee` | Prestataire | Marquer terminé | SimpleWorkCompletionModal |
| `en_cours` | Prestataire | Marquer terminé | SimpleWorkCompletionModal |
| `cloturee_par_prestataire` | Locataire | Valider / Contester | TenantValidationSimple |
| `cloturee_par_prestataire` | Gestionnaire | Finaliser | SimplifiedFinalizationModal |
| `cloturee_par_locataire` | Gestionnaire | Finaliser | SimplifiedFinalizationModal |

### C. Liste complète des fichiers migrés

#### Composants (35 fichiers)
```
components/intervention/
├── intervention-action-panel.tsx
├── intervention-action-panel-header.tsx
├── simple-work-completion-modal.tsx
├── work-completion-report.tsx
├── tenant-validation-simple.tsx
├── tenant-validation-form.tsx
├── simplified-finalization-modal.tsx
├── finalization-confirmation-modal.tsx
├── tenant-slot-confirmation-modal.tsx
├── quote-submission-form.tsx
├── provider-availability-selection.tsx
├── tenant-availability-input.tsx
├── user-availabilities-display.tsx
├── modals/
│   ├── multi-quote-request-modal.tsx
│   ├── quote-request-modal.tsx
│   ├── quote-request-success-modal.tsx
│   ├── external-quote-request-modal.tsx
│   ├── programming-modal.tsx
│   ├── programming-modal-enhanced.tsx
│   ├── provider-availability-modal.tsx
│   ├── schedule-rejection-modal.tsx
│   ├── approval-modal.tsx
│   ├── approve-confirmation-modal.tsx
│   ├── reject-confirmation-modal.tsx
│   ├── cancel-confirmation-modal.tsx
│   ├── base-confirmation-modal.tsx
│   ├── confirmation-modal.tsx
│   └── success-modal.tsx
└── closure/
    ├── types.ts
    ├── simple-types.ts
    └── index.ts
```

#### Hooks (6 fichiers)
```
hooks/
├── use-intervention-quoting.ts
├── use-intervention-planning.ts
├── use-intervention-approval.ts
├── use-intervention-execution.ts
├── use-intervention-finalization.ts
└── use-intervention-cancellation.ts
```

#### Services & Utilitaires (3 fichiers)
```
lib/
├── intervention-actions-service.ts
├── quote-state-utils.ts
└── availability-filtering-utils.ts
```

**Total : 44 fichiers**

---

## 🎓 Conseils Finaux

### 1. Migration Progressive
- **Ne migrez pas tout d'un coup** - Suivez les phases
- **Testez après chaque phase** - Validez avant de continuer
- **Commitez après chaque phase réussie** - Facilite le rollback

### 2. Gestion des Conflits
Si des conflits surviennent lors du `git checkout` :
```bash
# Option 1 : Forcer l'écrasement (ATTENTION : perte de modifications locales)
git checkout refacto -- chemin/vers/fichier --force

# Option 2 : Merge manuel
git show refacto:chemin/vers/fichier > fichier_refacto.tsx
# Comparer et merger manuellement
```

### 3. Performance
- **Build incrémental** : `npm run build` après chaque phase
- **Cache** : Si problèmes persistants, `rm -rf .next node_modules && npm install`

### 4. Debug
- Utiliser les **React DevTools** pour inspecter les props
- Vérifier les **Network requests** pour les appels API
- Consulter les **Console logs** pour les erreurs runtime

---

## 🚀 Commande de Migration Rapide (All-in-One)

Si vous voulez tout migrer d'un coup (**non recommandé**, mais possible) :

```bash
#!/bin/bash
echo "🚀 Migration complète de l'Intervention Action Panel"

git checkout optimization

# Phase 0 : Fondations
git checkout refacto -- lib/intervention-actions-service.ts
git checkout refacto -- lib/quote-state-utils.ts
git checkout refacto -- lib/availability-filtering-utils.ts
git checkout refacto -- hooks/use-intervention-quoting.ts
git checkout refacto -- hooks/use-intervention-planning.ts

# Phase 1 : Approbation
git checkout refacto -- components/intervention/intervention-action-panel.tsx
git checkout refacto -- components/intervention/modals/approval-modal.tsx
git checkout refacto -- components/intervention/modals/approve-confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/reject-confirmation-modal.tsx
git checkout refacto -- hooks/use-intervention-approval.ts

# Phase 2 : Devis
git checkout refacto -- components/intervention/modals/multi-quote-request-modal.tsx
git checkout refacto -- components/intervention/modals/quote-request-modal.tsx
git checkout refacto -- components/intervention/modals/quote-request-success-modal.tsx
git checkout refacto -- components/intervention/modals/external-quote-request-modal.tsx
git checkout refacto -- components/intervention/quote-submission-form.tsx

# Phase 3 : Planification
git checkout refacto -- components/intervention/modals/programming-modal.tsx
git checkout refacto -- components/intervention/modals/provider-availability-modal.tsx
git checkout refacto -- components/intervention/tenant-slot-confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/schedule-rejection-modal.tsx
git checkout refacto -- components/intervention/provider-availability-selection.tsx
git checkout refacto -- components/intervention/tenant-availability-input.tsx
git checkout refacto -- components/intervention/user-availabilities-display.tsx

# Phase 4 : Exécution
git checkout refacto -- components/intervention/simple-work-completion-modal.tsx
git checkout refacto -- components/intervention/work-completion-report.tsx
git checkout refacto -- hooks/use-intervention-execution.ts

# Phase 5 : Clôture
git checkout refacto -- components/intervention/tenant-validation-simple.tsx
git checkout refacto -- components/intervention/simplified-finalization-modal.tsx
git checkout refacto -- components/intervention/finalization-confirmation-modal.tsx
git checkout refacto -- components/intervention/closure/
git checkout refacto -- hooks/use-intervention-finalization.ts

# Phase 6 : Header
git checkout refacto -- components/intervention/intervention-action-panel-header.tsx
git checkout refacto -- components/intervention/modals/base-confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/confirmation-modal.tsx
git checkout refacto -- components/intervention/modals/success-modal.tsx

echo "✅ Migration terminée !"
echo "🔍 Vérification..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build réussi !"
else
  echo "❌ Erreurs de build détectées"
fi
```

---

## 📞 Support

En cas de problème :
1. Vérifier le **Troubleshooting** ci-dessus
2. Consulter les **logs de build** : `npm run build`
3. Vérifier la **console navigateur** pour les erreurs runtime

---

**Bon courage pour la migration ! 🎉**

Ce guide vous permet de migrer progressivement et de tester chaque étape du workflow. N'hésitez pas à adapter selon vos besoins spécifiques.
