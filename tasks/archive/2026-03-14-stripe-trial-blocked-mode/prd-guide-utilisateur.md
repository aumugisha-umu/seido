# PRD: Guide Utilisateur In-App — Section Aides

## Context

SEIDO est un SaaS de gestion immobiliere pour gestionnaires belges. L'application dispose de 7 sections principales (Dashboard, Patrimoine, Contacts, Contrats, Interventions, Emails, Parametres) mais aucun guide utilisateur n'existe. Le lien "Aides" dans le sidebar pointe vers `/gestionnaire/aide` qui n'a pas de page.

### Persona Principal: Gestionnaire Immobilier
- **Age**: 38-45 ans, gere 200-350 lots
- **Frustrations**: Perd 2h/jour a chercher des infos, recoit 50 appels/jour pour des statuts, utilise 5 outils deconnectes
- **Comportement**: 80% mobile pour les urgences, pragmatique, veut voir la valeur immediatement
- **Langue**: Francais belge, vouvoiement professionnel

### Probleme
Les utilisateurs ne decouvrent pas toutes les fonctionnalites de l'app, ce qui:
- Reduit l'adoption des features avancees (devis, creneaux, linking email)
- Augmente les tickets de support
- Ralentit le time-to-value pour les nouveaux utilisateurs

## Solution

Un guide utilisateur in-app accessible via la section "Aides" du sidebar, structure en:
1. **Guide de demarrage** — Premiers pas pour voir la valeur en 10 minutes
2. **Guides par section** — Explication detaillee de chaque module avec value propositions
3. **FAQ** — Questions frequentes

### Architecture UI (Stripe Docs pattern)
- **Desktop**: Sidebar de navigation + zone de contenu avec cards + accordions
- **Mobile**: Tabs horizontaux sticky + cards empilees + accordions
- **Recherche**: Barre de recherche fuzzy (Cmd+K style)
- **Progressive disclosure**: 3 couches (overview → topics → details)

### Ton et Style
- Vouvoiement professionnel
- Titres orientes benefices ("Reduisez vos appels de 70%")
- Chiffres concrets plutot qu'adjectifs vagues
- Max 25 mots/phrase, screenshots quand pertinent

## User Stories

### US-001: Route et page de base (XS)
Creer la route `/gestionnaire/aide` avec le layout with-navbar, un Server Component d'entree, et une page client vide structuree.

**Acceptance Criteria:**
- Route `/gestionnaire/aide` fonctionne dans le navigateur
- La page affiche "Centre d'aide" dans le topbar
- Le composant suit le pattern getServerAuthContext
- Typecheck passe (npm run lint)

### US-002: Structure de navigation du guide (S)
Creer le layout du guide avec sidebar de navigation (desktop) et tabs horizontaux (mobile), permettant de naviguer entre les sections.

**Acceptance Criteria:**
- Sidebar avec les 7 sections + "Premiers pas" + "FAQ"
- Tabs horizontaux sur mobile (< 768px)
- Section active surlignee
- Navigation par ancres (scroll smooth vers section)
- Recherche basique dans les titres
- Responsive: sidebar masque sur mobile, tabs masques sur desktop
- Typecheck passe

### US-003: Contenu "Premiers Pas" (M)
Section d'accueil avec 3 guides de demarrage rapide orientes vers les quick wins du gestionnaire.

**Acceptance Criteria:**
- 3 cards: "Ajoutez votre premier immeuble", "Creez vos contacts", "Lancez votre premiere intervention"
- Chaque card a: icone, titre benefice, description 1-2 lignes, CTA vers la section concernee
- Step-by-step accordion dans chaque card (3-5 etapes)
- Responsive: cards empilees sur mobile
- Typecheck passe

### US-004: Guide section Dashboard (S)
Guide expliquant le tableau de bord et sa valeur pour le gestionnaire.

**Acceptance Criteria:**
- Titre benefice: "Pilotez votre portefeuille en temps reel"
- Value proposition expliquant comment le dashboard resout "2h/jour a chercher des infos"
- Liste des KPIs expliques (taux d'occupation, interventions en cours, etc.)
- Conseils d'utilisation (accordion)
- Typecheck passe

### US-005: Guide section Patrimoine (S)
Guide expliquant la gestion des biens (immeubles + lots).

**Acceptance Criteria:**
- Titre benefice: "Retrouvez n'importe quel bien en 5 secondes"
- Explication de la navigation double onglet (Immeubles/Lots)
- Guide de creation d'immeuble et de lot
- Explication du suivi d'occupation
- Typecheck passe

### US-006: Guide section Contacts (S)
Guide expliquant la gestion des contacts et invitations.

**Acceptance Criteria:**
- Titre benefice: "Fini les contacts perdus dans WhatsApp"
- 3 types de contacts expliques (locataires, prestataires, proprietaires)
- Systeme d'invitation explique
- Gestion des societes
- Typecheck passe

### US-007: Guide section Contrats (S)
Guide expliquant la gestion des contrats et transitions automatiques.

**Acceptance Criteria:**
- Titre benefice: "Plus jamais oublier une echeance"
- Workflow des statuts automatiques (a_venir → actif → expire)
- Creation de contrat expliquee
- Alertes d'echeance
- Typecheck passe

### US-008: Guide section Interventions (M)
Guide expliquant le workflow complet des interventions — section la plus critique pour le gestionnaire.

**Acceptance Criteria:**
- Titre benefice: "Reduisez vos appels de 70%"
- Les 9 statuts du workflow expliques visuellement
- Systeme de devis (requires_quote)
- Creneaux horaires et planification
- Conversations multi-thread
- Documents et photos
- Typecheck passe

### US-009: Guide section Emails (S)
Guide expliquant l'integration email et le linking d'entites.

**Acceptance Criteria:**
- Titre benefice: "Vos emails classes automatiquement"
- Integration Gmail expliquee
- Linking d'emails aux entites (interventions, biens, contacts)
- Suivi des reponses
- Blacklist
- Typecheck passe

### US-010: Guide section Parametres (XS)
Guide expliquant les parametres et la facturation.

**Acceptance Criteria:**
- Titre benefice: "Deleguez sans perdre le controle"
- Connexions email
- Gestion de l'abonnement
- Profil utilisateur
- Typecheck passe

### US-011: Section FAQ (S)
FAQ interactive avec les questions les plus frequentes, utilisant des accordions.

**Acceptance Criteria:**
- Categories: General, Facturation, Securite, Mobile, Integrations
- Au moins 15 questions-reponses couvrant les sujets majeurs
- Accordions avec une seule question ouverte a la fois
- Searchable (la recherche filtre les FAQs)
- Typecheck passe

### US-012: Polish et cohesion (S)
Review finale par le copywriter et l'UI designer pour assurer la cohesion du guide.

**Acceptance Criteria:**
- Tous les textes relus pour ton, clarte, benefices
- Hierarchie visuelle coherente (typo, spacing, couleurs)
- Navigation fluide entre sections
- Test sur mobile et desktop
- Typecheck passe
- Lint passe

## Tech Stack
- Next.js App Router (Server Component + Client Component)
- shadcn/ui: Accordion, Card, Tabs, Input, ScrollArea, Badge, Separator
- Lucide React icons
- Tailwind CSS
- Pattern: getServerAuthContext('gestionnaire')

## Priority Order
1. US-001 (route de base)
2. US-002 (structure navigation)
3. US-003 (premiers pas)
4. US-004 → US-010 (guides par section, en parallele possible)
5. US-011 (FAQ)
6. US-012 (polish)
