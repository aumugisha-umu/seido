# Glossaire & Terminologie - SEIDO

> **Version** : 1.0
> **Date** : 2025-12-18
> **Objectif** : Standardiser le vocabulaire utilisé dans les tests QA

---

## 1. Termes Métier

### 1.1 Entités Principales

| Terme | Définition | Alias/Synonymes |
|-------|------------|-----------------|
| **Immeuble** | Bâtiment contenant plusieurs lots, géré par un gestionnaire | Building, Bien immobilier |
| **Lot** | Unité locative au sein d'un immeuble (appartement, garage, etc.) | Unit, Appartement, Logement |
| **Intervention** | Action de maintenance ou réparation sur un bien | Ticket, Demande, Ordre de travail |
| **Devis** | Proposition commerciale d'un prestataire pour une intervention | Quote, Estimation |
| **Contrat** | Document juridique liant parties (bail, prestation) | Contract, Bail |
| **Contact** | Personne ou société liée à l'activité (prestataire, locataire) | Contact |

### 1.2 Acteurs

| Terme | Définition | Rôle système |
|-------|------------|--------------|
| **Gestionnaire** | Professionnel qui gère un parc immobilier | `gestionnaire` |
| **Prestataire** | Artisan/entreprise effectuant les interventions | `prestataire` |
| **Locataire** | Occupant d'un lot | `locataire` |
| **Propriétaire** | Détenteur d'un bien immobilier | `proprietaire` |
| **Administrateur** | Utilisateur système avec accès complet | `admin` |

### 1.3 Actions

| Terme | Définition | Contexte |
|-------|------------|----------|
| **Créer** | Ajouter une nouvelle entité | CRUD - Create |
| **Modifier** | Changer une entité existante | CRUD - Update |
| **Supprimer** | Retirer une entité | CRUD - Delete |
| **Assigner** | Attribuer une intervention à un prestataire | Workflow intervention |
| **Approuver** | Valider une demande de locataire | Workflow intervention |
| **Rejeter** | Refuser une demande ou un devis | Workflow intervention |
| **Clôturer** | Terminer une intervention | Workflow intervention |
| **Planifier** | Définir une date/heure pour intervention | Workflow intervention |

---

## 2. États et Statuts

### 2.1 Statuts d'Intervention

| Statut Code | Label FR | Description | Icône | Couleur |
|-------------|----------|-------------|-------|---------|
| `demande` | Demande | Nouvelle demande créée par locataire | 📝 | `gray-500` |
| `rejetee` | Rejetée | Demande refusée par le gestionnaire | ❌ | `red-600` |
| `approuvee` | Approuvée | Demande validée, intervention autorisée | ✅ | `green-600` |
| `demande_de_devis` | En attente de devis | Devis demandés aux prestataires | 📋 | `orange-500` |
| `planification` | En planification | Recherche de créneau disponible | 📅 | `blue-400` |
| `planifiee` | Planifiée | RDV confirmé avec date/heure | 📆 | `blue-600` |
| `en_cours` | En cours | Intervention démarrée | 🔧 | `purple-600` |
| `cloturee_par_prestataire` | Clôturée (prest.) | Travaux terminés par prestataire | ✔️ | `green-400` |
| `cloturee_par_locataire` | Clôturée (loc.) | Travaux validés par locataire | ✔️ | `green-500` |
| `cloturee_par_gestionnaire` | Clôturée | Intervention finalisée | ✅ | `green-700` |
| `annulee` | Annulée | Intervention annulée | 🚫 | `red-500` |

### 2.2 Machine d'États (Transitions)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [demande] ─────┬───► [approuvee] ───┬───► [planification] ───► [planifiee]
│                 │                     │                              │
│                 │                     │                              ▼
│                 ▼                     ▼                          [en_cours]
│            [rejetee]         [demande_de_devis]                      │
│                                      │                               ▼
│                                      │              [cloturee_par_prestataire]
│                                      │                               │
│                                      ▼                               ▼
│                              [planification]          [cloturee_par_locataire]
│                                                                      │
│                                                                      ▼
│                                                      [cloturee_par_gestionnaire]
│                                                                         │
│  ───────────────────────────────────────────────────────────────────────┤
│  Depuis n'importe quel statut (sauf clôturé) ───► [annulee]             │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Statuts de Devis

| Statut | Label | Description |
|--------|-------|-------------|
| `pending` | En attente | Devis soumis, en attente de décision |
| `accepted` | Accepté | Devis retenu par le gestionnaire |
| `rejected` | Rejeté | Devis refusé |

### 2.4 Statuts d'Invitation

| Statut | Label | Description |
|--------|-------|-------------|
| `pending` | En attente | Invitation envoyée |
| `accepted` | Acceptée | Invitation acceptée par l'utilisateur |
| `expired` | Expirée | Invitation non utilisée dans le délai |
| `cancelled` | Annulée | Invitation annulée par l'émetteur |

---

## 3. Interface Utilisateur

### 3.1 Composants UI

| Terme | Description | Exemple |
|-------|-------------|---------|
| **Header** | Barre supérieure avec navigation et profil | Logo, menu, notifications |
| **Sidebar** | Menu latéral de navigation | Dashboard, Biens, Interventions |
| **Dashboard** | Tableau de bord principal | KPIs, graphiques, raccourcis |
| **Card** | Conteneur d'information | Carte intervention, carte bien |
| **Modal** | Fenêtre modale superposée | Confirmation, formulaire popup |
| **Toast** | Notification temporaire | Message succès/erreur |
| **Badge** | Indicateur visuel (compteur, statut) | Badge notification, badge urgent |
| **Stepper** | Indicateur d'étapes (wizard) | Création multi-étapes |
| **Breadcrumb** | Fil d'Ariane navigation | Dashboard > Biens > Immeuble |
| **Tab** | Onglet de navigation interne | Détails, Documents, Historique |
| **Dropdown** | Menu déroulant | Sélection, actions contextuelles |
| **Chip** | Tag/étiquette | Catégorie, filtre actif |

### 3.2 États UI

| État | Description | Apparence |
|------|-------------|-----------|
| **Default** | État normal, sans interaction | Style de base |
| **Hover** | Survol souris | Changement léger de couleur |
| **Focus** | Élément sélectionné (clavier) | Bordure focus visible |
| **Active** | En cours d'activation (clic) | Léger enfoncement |
| **Disabled** | Non interactif | Grisé, opacité réduite |
| **Loading** | Chargement en cours | Spinner, skeleton |
| **Error** | Erreur de validation | Bordure rouge, message |
| **Success** | Action réussie | Bordure verte, coche |
| **Empty** | Pas de données | Message "Aucun élément" |

### 3.3 Messages Standards

| Type | Format | Exemple |
|------|--------|---------|
| **Succès création** | "[Entité] créé(e) avec succès" | "Intervention créée avec succès" |
| **Succès modification** | "[Entité] modifié(e) avec succès" | "Immeuble modifié avec succès" |
| **Succès suppression** | "[Entité] supprimé(e)" | "Contact supprimé" |
| **Erreur validation** | "[Champ] : [Raison]" | "Email : Format invalide" |
| **Erreur serveur** | "Une erreur est survenue" | "Une erreur est survenue. Réessayez." |
| **Confirmation action** | "Êtes-vous sûr de vouloir [action] ?" | "Êtes-vous sûr de vouloir supprimer ?" |
| **Champ requis** | "[Champ] est requis" | "Le nom est requis" |

---

## 4. Termes Techniques

### 4.1 Architecture

| Terme | Définition |
|-------|------------|
| **API Route** | Point d'entrée serveur Next.js (app/api/) |
| **Server Action** | Fonction serveur appelée depuis client (Next.js 15) |
| **Server Component** | Composant React rendu côté serveur |
| **Client Component** | Composant React avec interactivité navigateur |
| **RLS** | Row Level Security - Sécurité niveau ligne (Supabase) |
| **Repository** | Couche d'accès aux données |
| **Service** | Couche logique métier |
| **Hook** | Fonction React réutilisable (use*) |

### 4.2 Base de Données

| Terme | Définition |
|-------|------------|
| **Table** | Structure de stockage (users, buildings, etc.) |
| **Row** | Ligne/enregistrement dans une table |
| **Column** | Champ/attribut d'une table |
| **Enum** | Type énuméré (intervention_status, user_role) |
| **Foreign Key** | Clé étrangère (relation entre tables) |
| **UUID** | Identifiant unique universel |
| **Timestamp** | Date/heure avec timezone |

### 4.3 Tests

| Terme | Définition |
|-------|------------|
| **Test Case** | Cas de test individuel |
| **Test Suite** | Ensemble de tests regroupés |
| **Précondition** | Condition requise avant exécution |
| **Critère d'acceptation** | Condition de succès mesurable |
| **Happy Path** | Scénario nominal (tout fonctionne) |
| **Edge Case** | Cas limite à tester |
| **Regression** | Bug réapparu après correction |
| **Smoke Test** | Test rapide de fonctionnement basique |
| **E2E** | End-to-End - Test bout en bout |

---

## 5. Abréviations

| Abréviation | Signification |
|-------------|---------------|
| **CA** | Critère d'Acceptation |
| **TC** | Test Case |
| **E2E** | End-to-End |
| **UI** | User Interface |
| **UX** | User Experience |
| **API** | Application Programming Interface |
| **CRUD** | Create, Read, Update, Delete |
| **RLS** | Row Level Security |
| **JWT** | JSON Web Token |
| **UUID** | Universally Unique Identifier |
| **QA** | Quality Assurance |
| **P0/P1/P2** | Priorité 0/1/2 (critique/haute/moyenne) |
| **SLA** | Service Level Agreement |
| **LCP** | Largest Contentful Paint |
| **INP** | Interaction to Next Paint |
| **CLS** | Cumulative Layout Shift |
| **WCAG** | Web Content Accessibility Guidelines |
| **A11Y** | Accessibility (a + 11 lettres + y) |

---

## 6. Codes Couleur UI

### 6.1 Couleurs Sémantiques

| Usage | Nom | Code Hex | CSS Variable |
|-------|-----|----------|--------------|
| Primaire | Bleu SEIDO | `#3b82f6` | `--primary` |
| Succès | Vert | `#16a34a` | `--success` |
| Erreur | Rouge | `#dc2626` | `--destructive` |
| Warning | Orange | `#f59e0b` | `--warning` |
| Info | Bleu clair | `#0ea5e9` | `--info` |
| Neutre | Gris | `#6b7280` | `--muted` |

### 6.2 États de Validation

| État | Couleur bordure | Couleur texte |
|------|-----------------|---------------|
| Normal | `gray-300` | `gray-900` |
| Focus | `primary` | `gray-900` |
| Erreur | `red-500` | `red-600` |
| Succès | `green-500` | `green-600` |
| Désactivé | `gray-200` | `gray-400` |

---

## 7. Formats Standards

### 7.1 Dates

| Format | Exemple | Usage |
|--------|---------|-------|
| Affichage court | `18/12/2025` | Listes, tableaux |
| Affichage long | `18 décembre 2025` | Détails, documents |
| Avec heure | `18/12/2025 à 14:30` | Planification |
| Relatif | `Il y a 2 heures` | Notifications, historique |
| ISO | `2025-12-18T14:30:00Z` | API, base de données |

### 7.2 Références

| Entité | Format | Exemple |
|--------|--------|---------|
| Intervention | `INT-YYYY-NNNN` | INT-2025-0042 |
| Devis | `DEV-YYYY-NNNN` | DEV-2025-0015 |
| Immeuble | `IMM-NNNN` | IMM-0001 |
| Lot | `LOT-NNNN` | LOT-0023 |

### 7.3 Téléphone

| Format | Exemple | Validation |
|--------|---------|------------|
| France | `06 12 34 56 78` | 10 chiffres |
| International | `+33 6 12 34 56 78` | Préfixe pays |
| Stockage | `0612345678` | Sans espaces |

### 7.4 Montants

| Format | Exemple | Usage |
|--------|---------|-------|
| Affichage | `1 250,00 €` | Interface |
| Saisie | `1250.00` | Formulaires |
| Stockage | `125000` | Base (centimes) |

---

## 8. Mapping Code ↔ UI

### 8.1 Intervention Status

| Code DB | Label UI FR | Label UI Court |
|---------|-------------|----------------|
| `demande` | Demande en cours | Demande |
| `rejetee` | Demande rejetée | Rejetée |
| `approuvee` | Intervention approuvée | Approuvée |
| `demande_de_devis` | En attente de devis | Devis |
| `planification` | En cours de planification | Planification |
| `planifiee` | Intervention planifiée | Planifiée |
| `en_cours` | Intervention en cours | En cours |
| `cloturee_par_prestataire` | Terminée (prestataire) | Terminée |
| `cloturee_par_locataire` | Validée (locataire) | Validée |
| `cloturee_par_gestionnaire` | Clôturée | Clôturée |
| `annulee` | Intervention annulée | Annulée |

### 8.2 Intervention Type

| Code DB | Label UI | Icône |
|---------|----------|-------|
| `plomberie` | Plomberie | Wrench |
| `electricite` | Électricité | Zap |
| `chauffage` | Chauffage | Flame |
| `serrurerie` | Serrurerie | Key |
| `peinture` | Peinture | Paintbrush |
| `menage` | Ménage | Sparkles |
| `jardinage` | Jardinage | TreeDeciduous |
| `autre` | Autre | Settings |

### 8.3 Urgency

| Code DB | Label UI | Badge Style |
|---------|----------|-------------|
| `basse` | Basse priorité | `bg-gray-100 text-gray-700` |
| `normale` | Normale | `bg-blue-100 text-blue-700` |
| `haute` | Haute priorité | `bg-orange-100 text-orange-700` |
| `urgente` | Urgente | `bg-red-100 text-red-700` |

---

## Références

- [Database Types](/lib/database.types.ts)
- [Service Types](/lib/services/core/service-types.ts)
- [Design System](/docs/design/design-system/)
- [Données de Test](/docs/testing/QA/11-donnees-test.md)
