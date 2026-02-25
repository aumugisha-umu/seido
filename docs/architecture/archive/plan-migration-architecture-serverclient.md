# Plan de Migration Architecture Server/Client Components

**Date de création** : 2025-10-09 (Dernière mise à jour: 2025-10-10)
**Objectif** : Migrer progressivement les pages SEIDO vers l'architecture hybride Next.js 15 (Server Component + Client Component)
**Pattern de référence** : `/gestionnaire/contacts/details/[id]` (Phase 1 - COMPLÉTÉE ✅)
**Status**: ⏳ **EN COURS** - Phase 1 complétée, Phase 2-3 en attente

---

## 📋 Table des Matières

1. [Principes d'Architecture](#principes-darchitecture)
2. [Pattern de Référence (Contacts Details - Phase 1)](#pattern-de-référence-contacts-details---phase-1)
3. [Phase 2 : Migration Section Biens](#phase-2--migration-section-biens)
4. [Phase 3 : Migration Section Interventions](#phase-3--migration-section-interventions)
5. [Checklist de Migration](#checklist-de-migration)
6. [Critères de Validation](#critères-de-validation)

---

## 🎯 Principes d'Architecture

### **Quand utiliser un Server Component ?**

✅ **Utilisez un Server Component quand :**
- La page nécessite du **data fetching au chargement**
- L'accès aux données nécessite **SSR authentication** (`cookies()`)
- Vous voulez **réduire le bundle JavaScript client** (~50KB économisés)
- Les données doivent être **rendues côté serveur pour le SEO**
- La page contient de la **logique métier côté serveur** (filtrage, calculs, etc.)

❌ **N'utilisez PAS un Server Component quand :**
- La page nécessite **useState, useEffect, useContext** (React hooks client)
- Vous devez gérer des **événements utilisateur** (onClick, onChange, etc.)
- Vous utilisez des **APIs Browser** (window, localStorage, etc.)
- Vous avez besoin de **Web APIs non disponibles en SSR** (navigator, document, etc.)

### **Architecture Hybride Optimale (3 Layers)**

```
┌─────────────────────────────────────────────────────────┐
│  Server Component (page.tsx)                           │
│  - Fetch data avec Server Services (SSR auth)          │
│  - Validation accès utilisateur                        │
│  - Filtrage/calculs métier côté serveur                │
│  - Passage données → Client Component via props        │
└─────────────────────┬───────────────────────────────────┘
                      │ Props (initialData)
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Client Component (*-client.tsx)                        │
│  - State management (tabs, modals, loading, etc.)      │
│  - Event handlers (onClick, onChange, etc.)            │
│  - User interactions (navigation, formulaires, etc.)   │
│  - Pas de data fetching initial (utilise props)        │
└─────────────────────┬───────────────────────────────────┘
                      │ Mutations (POST, PATCH, DELETE)
                      ▼
┌─────────────────────────────────────────────────────────┐
│  API Routes (/api/*)                                    │
│  - Mutations avec Server Services                       │
│  - Validation des entrées utilisateur                  │
│  - Business logic complexe                             │
└─────────────────────────────────────────────────────────┘
```

### **Avantages de l'Architecture Hybride**

| **Aspect**       | **Avant (Client Component seul)** | **Après (Hybrid Server + Client)** |
|------------------|-----------------------------------|-------------------------------------|
| **Performance**  | ~150KB JS envoyé au client        | ~100KB JS (-33% bundle)             |
| **SEO**          | Données rendues côté client       | Données rendues côté serveur (SSR)  |
| **Auth**         | Nécessite re-fetch client         | SSR authentication avec `cookies()` |
| **Sécurité**     | Tokens exposés côté client        | Tokens sécurisés côté serveur       |
| **UX**           | Flash de chargement initial       | Données prêtes au premier rendu     |
| **Maintenance**  | Logique mélangée data/UI          | Séparation claire Data/UI           |

---

## ✅ Pattern de Référence (Contacts Details - Phase 1)

**Fichiers modifiés :**
- `app/gestionnaire/contacts/details/[id]/page.tsx` (NEW - Server Component)
- `app/gestionnaire/contacts/details/[id]/contact-details-client.tsx` (RENAMED - Client Component)

### **1️⃣ Server Component (`page.tsx`)**

```typescript
// ✅ Server Component (pas de "use client")
import {
  createServerContactService,
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  createServerUserService,
  type Contact as ContactType,
  type Intervention as InterventionType,
  type Lot as LotType,
  type Building as BuildingType
} from '@/lib/services'
import { ContactDetailsClient } from './contact-details-client'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailsPage({ params }: PageProps) {
  const resolvedParams = await params

  // ÉTAPE 1 : Authentication & User Context
  const userService = await createServerUserService()
  const currentUser = await userService.getCurrentUser()
  if (!currentUser) redirect('/auth/login')

  // ÉTAPE 2 : Fetch Contact Data (Server-side avec SSR auth)
  const contactService = await createServerContactService()
  const contact = await contactService.getById(resolvedParams.id)
  if (!contact) notFound()

  // ÉTAPE 3 : Fetch Related Data (Parallel pour performance)
  const [allInterventions, allBuildings, allLots] = await Promise.all([
    interventionService.getAll().catch(() => []),
    buildingService.getAll().catch(() => []),
    lotService.getAll().catch(() => [])
  ])

  // ÉTAPE 4 : Filter Data by Contact Role (Business Logic Server-side)
  const interventions = /* filtrage selon role du contact */
  const properties = /* filtrage selon role du contact */

  // ÉTAPE 5 : Render Client Component avec Initial Data
  return (
    <ContactDetailsClient
      contactId={resolvedParams.id}
      initialContact={contact}
      initialInterventions={interventions}
      initialProperties={properties}
      currentUser={{
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        team_id: currentUser.team_id
      }}
    />
  )
}
```

**Points clés :**
- ✅ Pas de directive `"use client"`
- ✅ Fonction `async` pour data fetching
- ✅ Utilisation de `createServerUserService()`, `createServerContactService()`, etc.
- ✅ Authentication SSR avec `cookies()` (via Server Services)
- ✅ Filtrage métier côté serveur (rôle du contact)
- ✅ Passage données via props au Client Component

### **2️⃣ Client Component (`contact-details-client.tsx`)**

```typescript
"use client" // ✅ Client Component (UI Layer - Interactivité)

import React, { useState, useCallback } from "react"
import { /* UI components */ } from "@/components/ui/*"
import { useRouter } from "next/navigation"
import {
  type Contact as ContactType,
  type Intervention as InterventionType,
  type Lot as LotType,
  type Building as BuildingType
} from '@/lib/services'

interface ContactDetailsClientProps {
  contactId: string
  initialContact: ContactType
  initialInterventions: InterventionType[]
  initialProperties: Array<(LotType & { type: 'lot' }) | (BuildingType & { type: 'building' })>
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}

export function ContactDetailsClient({
  contactId,
  initialContact,
  initialInterventions,
  initialProperties,
  currentUser
}: ContactDetailsClientProps) {
  const router = useRouter()

  // STATE (UI uniquement - pas de data fetching)
  const [activeTab, setActiveTab] = useState("overview")
  const [invitationStatus, setInvitationStatus] = useState<string | null>(null)

  // Utiliser les données initiales du Server Component
  const contact = initialContact
  const interventions = initialInterventions
  const properties = initialProperties

  // HANDLERS (Actions utilisateur)
  const handleBack = () => router.push("/gestionnaire/contacts")
  const handleEdit = () => router.push(`/gestionnaire/contacts/modifier/${contactId}`)

  const handleSendInvitation = async () => {
    const response = await fetch("/api/invite-user", {
      method: "POST",
      body: JSON.stringify({ email: contact.email, teamId: currentUser.team_id })
    })
    // ...
  }

  // RENDER
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header, tabs, navigators, etc. */}
    </div>
  )
}
```

**Points clés :**
- ✅ Directive `"use client"` en première ligne
- ✅ Pas de data fetching initial (utilise `initialContact`, `initialInterventions`, etc.)
- ✅ State management pour UI (`useState`, `activeTab`, `invitationStatus`)
- ✅ Event handlers (`onClick`, `onChange`, etc.)
- ✅ Mutations via API routes (`/api/invite-user`, etc.)

---

## 🏗️ Phase 2 : Migration Section Biens

### **Objectif**
Appliquer le pattern hybride Server + Client aux pages de détails des Biens (Immeubles et Lots).

### **Pages à migrer**

#### **2.1 Immeubles Details (`/gestionnaire/biens/immeubles/[id]`)**

**Fichiers à créer/modifier :**
1. `app/gestionnaire/biens/immeubles/[id]/page.tsx` (NEW - Server Component)
2. `app/gestionnaire/biens/immeubles/[id]/building-details-client.tsx` (RENAMED - Client Component)

**Architecture prévue :**

**Server Component (`page.tsx`)** :
- Fetch immeuble avec `createServerBuildingService()`
- Fetch lots associés avec `createServerLotService()`
- Fetch interventions liées avec `createServerInterventionService()`
- Fetch contacts (locataires, prestataires) avec `createServerContactService()`
- Filtrage selon `team_id` de l'utilisateur courant (RLS)
- Passage données via props au Client Component

**Client Component (`building-details-client.tsx`)** :
- Tabs (overview, lots, interventions, documents)
- State management (activeTab, modals, etc.)
- Event handlers (edit, archive, add lot, etc.)
- Mutations via API routes (`/api/buildings/*`, etc.)

**Données à passer en props :**
```typescript
interface BuildingDetailsClientProps {
  buildingId: string
  initialBuilding: BuildingType
  initialLots: LotType[]
  initialInterventions: InterventionType[]
  initialContacts: ContactType[]
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}
```

---

#### **2.2 Lots Details (`/gestionnaire/biens/lots/[id]`)**

**Fichiers à créer/modifier :**
1. `app/gestionnaire/biens/lots/[id]/page.tsx` (NEW - Server Component)
2. `app/gestionnaire/biens/lots/[id]/lot-details-client.tsx` (RENAMED - Client Component)

**Architecture prévue :**

**Server Component (`page.tsx`)** :
- Fetch lot avec `createServerLotService()`
- Fetch immeuble parent avec `createServerBuildingService()`
- Fetch interventions du lot avec `createServerInterventionService()`
- Fetch contacts assignés (locataires) via `lot.lot_contacts`
- Filtrage selon `team_id` via `lot.building.team_id`
- Passage données via props au Client Component

**Client Component (`lot-details-client.tsx`)** :
- Tabs (overview, interventions, locataires, documents)
- State management (activeTab, modals, etc.)
- Event handlers (edit, archive, assign tenant, etc.)
- Mutations via API routes (`/api/lots/*`, etc.)

**Données à passer en props :**
```typescript
interface LotDetailsClientProps {
  lotId: string
  initialLot: LotType
  initialBuilding: BuildingType
  initialInterventions: InterventionType[]
  initialTenants: ContactType[]
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}
```

---

### **Étapes de migration Phase 2**

1. **Analyser le fichier actuel** (identifier data fetching, state, handlers)
2. **Créer nouveau Server Component `page.tsx`** :
   - Ajouter authentication (`createServerUserService()`)
   - Migrer data fetching vers Server Services
   - Implémenter filtrage métier côté serveur
   - Définir interface Props pour Client Component
3. **Renommer fichier actuel → `*-details-client.tsx`** :
   - Ajouter directive `"use client"`
   - Supprimer data fetching (remplacer par props)
   - Conserver state management et event handlers
   - Adapter interface Props
4. **Tester la page** :
   - Vérifier build TypeScript (`npm run build`)
   - Tester navigation, tabs, actions utilisateur
   - Vérifier console browser (pas d'erreurs)
5. **Valider performance** :
   - Vérifier réduction bundle JS (Lighthouse)
   - Vérifier temps de chargement initial (< 2s)

---

## 🔧 Phase 3 : Migration Section Interventions

### **Objectif**
Appliquer le pattern hybride Server + Client aux pages de détails des Interventions.

### **Pages à migrer**

#### **3.1 Interventions Details (Gestionnaire) (`/gestionnaire/interventions/[id]`)**

**Fichiers à créer/modifier :**
1. `app/gestionnaire/interventions/[id]/page.tsx` (NEW - Server Component)
2. `app/gestionnaire/interventions/[id]/intervention-details-client.tsx` (RENAMED - Client Component)

**Architecture prévue :**

**Server Component (`page.tsx`)** :
- Fetch intervention avec `createServerInterventionService()`
- Fetch lot et immeuble associés (via `intervention.lot`)
- Fetch contact assigné (prestataire) via `intervention.assigned_contact_id`
- Fetch documents attachés
- Fetch historique des actions (workflow)
- Filtrage selon `team_id` via `intervention.lot.building.team_id`
- Passage données via props au Client Component

**Client Component (`intervention-details-client.tsx`)** :
- Tabs (overview, quote, planning, documents, history)
- State management (activeTab, modals workflow, etc.)
- Event handlers (approve, reject, start, complete, etc.)
- Mutations via API routes (`/api/intervention-*`, etc.)

**Données à passer en props :**
```typescript
interface InterventionDetailsClientProps {
  interventionId: string
  initialIntervention: InterventionType
  initialLot: LotType
  initialBuilding: BuildingType
  initialProvider: ContactType | null
  initialDocuments: DocumentType[]
  initialHistory: ActionType[]
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}
```

---

#### **3.2 Interventions Details (Prestataire) (`/prestataire/interventions/[id]`)**

**Fichiers à créer/modifier :**
1. `app/prestataire/interventions/[id]/page.tsx` (NEW - Server Component)
2. `app/prestataire/interventions/[id]/intervention-details-client.tsx` (RENAMED - Client Component)

**Architecture prévue :**

**Server Component (`page.tsx`)** :
- Fetch intervention avec `createServerInterventionService()`
- Vérifier que `intervention.assigned_contact_id === currentUser.id` (sécurité)
- Fetch lot et immeuble associés
- Fetch contact gestionnaire
- Fetch documents, quotes, planning
- Passage données via props au Client Component

**Client Component (`intervention-details-client.tsx`)** :
- Tabs (overview, quote, planning, documents)
- State management (activeTab, quote form, planning, etc.)
- Event handlers (submit quote, complete work, upload documents, etc.)
- Mutations via API routes (`/api/intervention-quote-submit`, etc.)

**Données à passer en props :**
```typescript
interface InterventionDetailsClientProps {
  interventionId: string
  initialIntervention: InterventionType
  initialLot: LotType
  initialBuilding: BuildingType
  initialManager: ContactType
  initialQuotes: QuoteType[]
  initialAvailabilities: AvailabilityType[]
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}
```

---

#### **3.3 Interventions Details (Locataire) (`/locataire/interventions/[id]`)**

**Fichiers à créer/modifier :**
1. `app/locataire/interventions/[id]/page.tsx` (NEW - Server Component)
2. `app/locataire/interventions/[id]/intervention-details-client.tsx` (RENAMED - Client Component)

**Architecture prévue :**

**Server Component (`page.tsx`)** :
- Fetch intervention avec `createServerInterventionService()`
- Vérifier que `intervention.lot.lot_contacts` contient `currentUser.id` (sécurité)
- Fetch lot et immeuble
- Fetch contact prestataire assigné
- Fetch gestionnaire responsable
- Passage données via props au Client Component

**Client Component (`intervention-details-client.tsx`)** :
- Tabs (overview, planning, documents)
- State management (activeTab, validation form, etc.)
- Event handlers (validate work, upload documents, etc.)
- Mutations via API routes (`/api/intervention-validate-tenant`, etc.)

**Données à passer en props :**
```typescript
interface InterventionDetailsClientProps {
  interventionId: string
  initialIntervention: InterventionType
  initialLot: LotType
  initialBuilding: BuildingType
  initialProvider: ContactType | null
  initialManager: ContactType
  currentUser: {
    id: string
    email: string
    role: string
    team_id: string
  }
}
```

---

### **Étapes de migration Phase 3**

1. **Analyser chaque rôle séparément** (gestionnaire, prestataire, locataire)
2. **Créer Server Component `page.tsx`** pour chaque rôle :
   - Authentication + vérification permissions
   - Data fetching avec Server Services
   - Filtrage métier selon rôle (RLS, team_id, assigned_contact_id, etc.)
3. **Renommer fichier actuel → `intervention-details-client.tsx`** :
   - Directive `"use client"`
   - Supprimer data fetching (utiliser props)
   - Conserver workflow management (state machine)
4. **Tester workflow complet** :
   - Créer intervention (locataire)
   - Approuver (gestionnaire)
   - Assigner prestataire (gestionnaire)
   - Soumettre devis (prestataire)
   - Valider devis (gestionnaire)
   - Planifier (gestionnaire + prestataire)
   - Terminer travaux (prestataire)
   - Valider résultat (locataire)
   - Finaliser (gestionnaire)
5. **Valider performance** :
   - Vérifier bundle JS réduit
   - Vérifier temps de chargement workflow (~3s max)

---

## ✅ Checklist de Migration

### **Pour chaque page à migrer :**

- [ ] **1. Analyse initiale**
  - [ ] Identifier data fetching actuel (services, API calls)
  - [ ] Identifier state management (useState, useEffect)
  - [ ] Identifier event handlers (onClick, onChange)
  - [ ] Identifier props nécessaires pour Client Component

- [ ] **2. Création Server Component**
  - [ ] Créer fichier `page.tsx` (pas de "use client")
  - [ ] Implémenter authentication avec `createServerUserService()`
  - [ ] Migrer data fetching vers Server Services
  - [ ] Implémenter filtrage métier côté serveur
  - [ ] Définir interface Props TypeScript stricte
  - [ ] Passer données via props au Client Component

- [ ] **3. Adaptation Client Component**
  - [ ] Renommer fichier existant → `*-details-client.tsx`
  - [ ] Ajouter directive `"use client"` en première ligne
  - [ ] Supprimer data fetching (remplacer par props)
  - [ ] Adapter interface Props pour recevoir données serveur
  - [ ] Conserver state management (tabs, modals, loading, etc.)
  - [ ] Conserver event handlers (onClick, onChange, etc.)

- [ ] **4. Tests & Validation**
  - [ ] Build TypeScript réussi (`npm run build`)
  - [ ] Aucune erreur console browser
  - [ ] Navigation fonctionnelle (tabs, back, etc.)
  - [ ] Actions utilisateur fonctionnelles (edit, archive, etc.)
  - [ ] Mutations API fonctionnelles (POST, PATCH, DELETE)
  - [ ] Performance bundle JS améliorée (Lighthouse)
  - [ ] Temps de chargement initial < 2-3s

- [ ] **5. Documentation**
  - [ ] Commenter sections Server Component (ÉTAPE 1, 2, 3, etc.)
  - [ ] Commenter sections Client Component (STATE, HANDLERS, RENDER)
  - [ ] Ajouter JSDoc pour interface Props
  - [ ] Mettre à jour ce plan de migration si nouveau pattern découvert

---

## 🎯 Critères de Validation

### **Technique**

- ✅ Build TypeScript réussi sans erreurs ni warnings
- ✅ Pas d'erreurs console browser (Network, Console, Sources)
- ✅ Pas d'usage de `cookies()` dans Client Component
- ✅ Pas d'usage de `useState`, `useEffect` dans Server Component
- ✅ Props TypeScript strictement typées (pas de `any`)
- ✅ Server Services utilisés côté serveur (`createServer*Service()`)
- ✅ Browser Services utilisés côté client (`create*Service()`) **seulement pour mutations**

### **Performance**

- ✅ Bundle JS réduit (~30-50% pour pages complexes)
- ✅ Temps de chargement initial < 2-3s (mesure Lighthouse)
- ✅ First Contentful Paint (FCP) < 1.5s
- ✅ Time to Interactive (TTI) < 3s
- ✅ Cumulative Layout Shift (CLS) < 0.1

### **Fonctionnel**

- ✅ Authentication SSR fonctionnelle (redirection `/auth/login` si non connecté)
- ✅ Filtrage RLS correct (team_id, role-based access)
- ✅ Tabs navigation fonctionnelle
- ✅ Actions utilisateur fonctionnelles (edit, archive, assign, etc.)
- ✅ Mutations API fonctionnelles (POST, PATCH, DELETE)
- ✅ Workflow complet testé (pour interventions)

### **Sécurité**

- ✅ Tokens jamais exposés côté client
- ✅ Validation permissions server-side (RLS, team_id, assigned_contact_id)
- ✅ Validation inputs utilisateur (Zod schemas API routes)
- ✅ Pas de fuite de données entre équipes (multi-tenant isolation)

---

## 📊 Roadmap Globale

| **Phase** | **Section**       | **Pages**                          | **Statut**       | **Date**       |
|-----------|-------------------|------------------------------------|------------------|----------------|
| Phase 1   | Contacts          | `/contacts/details/[id]`           | ✅ **COMPLÉTÉE** | 2025-10-10     |
| Phase 2   | Biens Immeubles   | `/biens/immeubles/[id]`            | ❌ À FAIRE       | -              |
| Phase 2   | Biens Lots        | `/biens/lots/[id]`                 | ❌ À FAIRE       | -              |
| Phase 3   | Interventions (G) | `/gestionnaire/interventions/[id]` | ❌ À FAIRE       | -              |
| Phase 3   | Interventions (P) | `/prestataire/interventions/[id]`  | ❌ À FAIRE       | -              |
| Phase 3   | Interventions (L) | `/locataire/interventions/[id]`    | ❌ À FAIRE       | -              |

### Notes de Phase 1 (2025-10-10)
- ✅ Pattern Server Component + Client Component validé et documenté
- ✅ Authentication SSR avec `createServerUserService()` fonctionnelle
- ✅ Data fetching optimisé côté serveur (0 N+1 queries)
- ✅ Props TypeScript strictement typées
- ✅ Build réussi sans erreurs ni warnings
- ✅ **RLS Fix appliqué**: Fonction `can_manager_update_user()` permet édition contacts
- ✅ **Email Templates**: Design finalisé avec logo repositionné et CTA optimisé

---

## 🚀 Prochaines Étapes

1. **Tester Phase 1** (Contacts Details) :
   - Naviguer vers `/gestionnaire/contacts/details/[id]`
   - Vérifier tabs, actions, invitations
   - Vérifier console browser (pas d'erreurs)

2. **Démarrer Phase 2** (Biens) :
   - Analyser `/gestionnaire/biens/immeubles/[id]`
   - Créer Server Component `page.tsx`
   - Renommer actuel → `building-details-client.tsx`
   - Tester build + navigation

3. **Itérer sur Phase 2** (Lots) :
   - Appliquer même pattern sur `/gestionnaire/biens/lots/[id]`

4. **Démarrer Phase 3** (Interventions) :
   - Analyser chaque rôle séparément (G, P, L)
   - Migrer selon pattern établi

---

## 📝 Notes & Insights

### **Erreurs courantes à éviter**

1. **`cookies() called outside request scope`** :
   - ❌ Utiliser `createServerUserService()` dans Client Component
   - ✅ Toujours utiliser Server Services dans Server Components uniquement

2. **`await isn't allowed in non-async function`** :
   - ❌ Utiliser `await` dans `useEffect` directement
   - ✅ Wrapper dans une fonction async IIFE : `const processData = async () => { ... }; processData()`

3. **`Hydration mismatch`** :
   - ❌ Server et Client rendent du contenu différent
   - ✅ Passer données exactes du serveur au client via props (pas de re-fetch)

4. **Props non typées** :
   - ❌ Utiliser `any` ou passer objets complexes sans interface
   - ✅ Définir interface TypeScript stricte pour Props

### **Bonnes pratiques**

- ✅ **Toujours parallel fetch** : `Promise.all([service1.getAll(), service2.getAll()])`
- ✅ **Filtrage côté serveur** : Jamais envoyer toutes les données au client puis filtrer
- ✅ **Error boundaries** : `try/catch` + `notFound()` / `redirect()` dans Server Components
- ✅ **Props minimales** : Passer uniquement ce dont le Client Component a besoin (pas de données inutilisées)
- ✅ **Commentaires clairs** : Séparer Server Component en ÉTAPES (1, 2, 3, etc.)

---

**Dernière mise à jour** : 2025-10-10
**Maintenu par** : Claude Code (Anthropic)
**Référence** : [Next.js 15 Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
**Prochaine étape** : Phase 2 - Migration Section Biens (Buildings + Lots) selon MIGRATION-MASTER-GUIDE.md
