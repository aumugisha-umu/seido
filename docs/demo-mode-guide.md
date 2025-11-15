# SEIDO Demo Mode - Guide Complet

**Version**: 1.0
**Date**: 2025-01-15
**Statut**: ✅ Production Ready

---

## 📖 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Pages Implémentées](#pages-implémentées)
4. [Utilisation](#utilisation)
5. [Données de Démo](#données-de-démo)
6. [Développement](#développement)
7. [Limitations](#limitations)

---

## Vue d'ensemble

Le **mode démo** de SEIDO est une réplique fonctionnelle de l'application en production, utilisant des données locales stockées en mémoire (LokiJS) plutôt que Supabase. Il permet aux utilisateurs de découvrir toutes les fonctionnalités de l'application sans créer de compte.

### Caractéristiques Principales

- ✅ **Données 100% locales** - Aucun appel Supabase
- ✅ **4 rôles complets** - Gestionnaire, Locataire, Prestataire, Admin
- ✅ **Données réalistes** - Basé sur la Belgique (80%) et pays limitrophes (20%)
- ✅ **Changement de rôle** - Switcher entre rôles avec mémoire d'impersonation
- ✅ **Reset à volonté** - Bouton pour réinitialiser les données
- ✅ **UI identique** - Réutilise les composants de production

---

## Architecture

### Structure des Dossiers

```
app/demo/
├── layout.tsx                     # DemoProvider + initialisation
├── gestionnaire/
│   ├── layout.tsx                 # Layout gestionnaire avec DemoRoleSwitcher
│   ├── dashboard/page.tsx
│   ├── biens/
│   │   ├── page.tsx               # Liste (PropertySelector)
│   │   ├── immeubles/
│   │   │   ├── [id]/page.tsx      # Détail immeuble
│   │   │   ├── nouveau/page.tsx   # Création (placeholder)
│   │   │   └── modifier/[id]/page.tsx
│   │   └── lots/
│   │       ├── [id]/page.tsx      # Détail lot
│   │       ├── nouveau/page.tsx
│   │       └── modifier/[id]/page.tsx
│   ├── contacts/
│   │   ├── page.tsx               # Liste contacts
│   │   ├── details/[id]/page.tsx  # Détail contact
│   │   ├── nouveau/page.tsx
│   │   └── modifier/[id]/page.tsx
│   ├── interventions/
│   │   ├── page.tsx               # Liste (InterventionsNavigator)
│   │   ├── [id]/page.tsx          # Détail intervention
│   │   └── nouvelle/page.tsx      # ✅ Fonctionnel
│   ├── notifications/page.tsx
│   ├── parametres/page.tsx
│   └── profile/page.tsx
├── locataire/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── interventions/
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx
│   │   └── nouvelle/page.tsx      # Placeholder
│   ├── notifications/page.tsx
│   ├── parametres/page.tsx
│   └── profile/page.tsx
├── prestataire/
│   ├── layout.tsx
│   ├── interventions/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── notifications/page.tsx
│   ├── parametres/page.tsx
│   └── profile/page.tsx
└── admin/
    ├── layout.tsx
    ├── dashboard/page.tsx
    ├── notifications/page.tsx
    ├── parametres/page.tsx
    └── profile/page.tsx
```

### Composants Clés

#### 1. **DemoProvider** (`lib/demo/demo-context.tsx`)
- Context React pour l'état global du démo
- Gère le rôle actuel et les utilisateurs impersonnés
- Expose `getCurrentUser()`, `switchRole()`, `impersonateUser()`, `resetDemo()`

#### 2. **DemoRoleSwitcher** (`components/demo-role-switcher.tsx`)
- Barre sticky orange en haut de page
- Affiche rôle + utilisateur courant
- Permet de changer de rôle et d'utilisateur
- Bouton reset des données

#### 3. **Demo Hooks** (`hooks/demo/`)
- `useDemoBuildings()` - Récupère les immeubles
- `useDemoLots()` - Récupère les lots
- `useDemoContacts()` - Récupère les contacts
- `useDemoInterventions()` - Récupère les interventions
- `useDemoUsers()` - Récupère les utilisateurs
- `useDemoStats()` - Statistiques agrégées

#### 4. **Store LokiJS** (`lib/demo/store/`)
- Base de données in-memory
- Collections: users, teams, buildings, lots, contacts, interventions, etc.
- Mutations: create, update, delete pour chaque entité

---

## Pages Implémentées

### ✅ Complètement Fonctionnelles (28 pages)

#### Gestionnaire (13 pages)
- Dashboard
- Biens (liste avec PropertySelector)
- Biens > Immeuble [id] (détail complet)
- Biens > Lot [id] (détail complet avec onglets)
- Contacts (liste)
- Contacts > [id] (détail avec onglets)
- Interventions (liste avec InterventionsNavigator)
- Interventions > [id] (détail basique)
- **Interventions > Nouvelle** ✅ Formulaire fonctionnel
- Notifications
- Paramètres
- Profile

#### Locataire (6 pages)
- Dashboard
- Interventions (liste)
- Interventions > [id] (détail)
- Notifications
- Paramètres
- Profile

#### Prestataire (5 pages)
- Interventions (liste)
- Interventions > [id] (détail)
- Notifications
- Paramètres
- Profile

#### Admin (4 pages)
- Dashboard
- Notifications
- Paramètres
- Profile

### 🚧 Placeholders (8 pages)

**Formulaires de création:**
- Nouvel immeuble
- Nouveau lot
- Nouveau contact
- Nouvelle intervention (locataire)

**Formulaires d'édition:**
- Modifier immeuble
- Modifier lot
- Modifier contact

Ces pages affichent un message informatif avec bouton retour.

---

## Utilisation

### Accéder au Mode Démo

1. **Depuis la page de login**: Cliquer sur le bouton "Mode Démo"
2. **URL directe**: `/demo/gestionnaire/dashboard` (ou autre rôle)

### Changer de Rôle

1. Cliquer sur le **sélecteur de rôle** dans la barre orange (en haut)
2. Choisir un rôle: Gestionnaire, Locataire, Prestataire, Admin
3. L'application charge le dernier utilisateur impersonné pour ce rôle

### Impersonner un Utilisateur

1. Dans la page **Contacts** (gestionnaire uniquement pour l'instant)
2. Cliquer sur "Se connecter" sur une carte utilisateur
3. L'interface bascule vers le rôle de cet utilisateur

### Réinitialiser les Données

1. Cliquer sur le bouton **Reset** dans la barre orange
2. Confirmer la réinitialisation
3. Toutes les données reviennent à l'état initial (seed data)

---

## Données de Démo

### Génération (`lib/demo/seed.ts`)

Les données sont générées au premier chargement du mode démo:

```typescript
generateDemoData(store: LokiDatabase): void
```

### Caractéristiques des Données

**Géolocalisation:**
- 80% Belgique (Brussels, Gand, Liège, Anvers, Bruges, Namur)
- 20% Pays limitrophes (France, Pays-Bas, Allemagne, Luxembourg)

**Volumes:**
- 15 utilisateurs (5 gestionnaires, 4 locataires, 4 prestataires, 2 admins)
- 3 équipes (Immobilière Bruxelles SA, Gestion Patrimoine Wallonie, Syndic Flandre BVBA)
- 12 immeubles
- 25 lots
- 30+ interventions
- Contacts multiples (building_contacts, lot_contacts)

**Relations:**
- Chaque immeuble a 2-3 lots
- Chaque lot peut avoir un locataire, propriétaire, gestionnaire
- Interventions assignées à des prestataires spécifiques
- Statuts d'intervention variés (demande, approuvée, planifiée, en_cours, clôturée, etc.)

### Enrichissement des Données

Les données incluent:
- Adresses réelles belges
- Noms flamands/francophones
- Numéros de téléphone belges (+32)
- Entreprises locales réalistes
- Références d'intervention (INT-XXXX-XXXX)

---

## Développement

### Ajouter une Nouvelle Page Démo

1. **Créer le fichier page** dans `app/demo/[role]/[feature]/page.tsx`

```typescript
'use client'

import { useDemoXXX } from '@/hooks/demo/use-demo-xxx'
import { useDemoContext } from '@/lib/demo/demo-context'

export default function MyDemoPage() {
  const { getCurrentUser } = useDemoContext()
  const user = getCurrentUser()
  const { data } = useDemoXXX({ team_id: user?.team_id })

  return <ProductionComponent data={data} />
}
```

2. **Réutiliser les composants de production** quand possible
3. **Utiliser les demo hooks** pour accéder aux données

### Ajouter un Nouveau Hook Démo

1. **Créer le hook** dans `hooks/demo/use-demo-xxx.ts`

```typescript
import { useDemoContext } from '@/lib/demo/demo-context'

export function useDemoXXX(filters?: any) {
  const { store, currentRole } = useDemoContext()

  const data = store
    .getCollection('my_collection')
    .find(filters)

  return {
    data,
    isLoading: false,
    error: null
  }
}
```

2. **Filtrer par équipe** si nécessaire
3. **Retourner le même format** que le hook de production

### Ajouter des Données Seed

Dans `lib/demo/seed.ts`:

```typescript
export function generateDemoData(store: LokiDatabase) {
  // ... existing data

  // Add new entities
  const myEntities = store.addCollection('my_entities')
  myEntities.insert({
    id: generateId(),
    name: 'My Entity',
    team_id: teams[0].id,
    created_at: new Date().toISOString()
  })
}
```

---

## Limitations

### Fonctionnalités Non Implémentées en Démo

1. **Formulaires de création/modification** (sauf intervention gestionnaire)
   - Affichent des placeholders informatifs
   - Seront ajoutés dans les prochaines versions

2. **Upload de fichiers**
   - Pas de gestion de documents/images en démo
   - Interface affichée mais non fonctionnelle

3. **Envoi d'emails**
   - Invitations, notifications par email simulées

4. **Recherche avancée**
   - Filtres de base fonctionnels
   - Recherche fulltext non implémentée

5. **Real-time**
   - Pas de synchronisation temps réel
   - Données mises à jour au rechargement

### Différences avec Production

| Aspect | Production | Démo |
|--------|-----------|------|
| **Stockage** | Supabase PostgreSQL | LokiJS (mémoire) |
| **Authentification** | Supabase Auth | Impersonation locale |
| **Persistence** | Permanente (DB) | Session (reset = perte) |
| **Fichiers** | Supabase Storage | Non supporté |
| **Real-time** | Subscriptions Supabase | Non supporté |
| **Performance** | Queries DB | Instant (mémoire) |

---

## Maintenance

### Tests

**Vérifier le mode démo:**

```bash
# Lancer l'application
npm run dev

# Naviguer vers /demo/gestionnaire/dashboard
# Tester:
# - Changement de rôle
# - Navigation entre pages
# - Affichage des données
# - Reset des données
```

**Tests automatisés à ajouter:**
- E2E tests pour chaque page démo
- Tests unitaires des hooks démo
- Tests d'intégration du store LokiJS

### Mise à Jour

**Quand ajouter du contenu démo:**
1. Nouvelle table en production → Ajouter collection dans seed.ts
2. Nouveau rôle → Ajouter layout + pages
3. Nouvelle fonctionnalité → Créer hook démo + page

**Checklist avant release:**
- [ ] Toutes les pages démo chargent sans erreur
- [ ] Données seed cohérentes et réalistes
- [ ] Changement de rôle fonctionne
- [ ] Reset fonctionne
- [ ] UI identique à production
- [ ] Documentation à jour

---

## FAQ

**Q: Comment ajouter plus de données seed?**
A: Éditer `lib/demo/seed.ts` et ajouter des entités dans les collections existantes.

**Q: Peut-on persister les données entre sessions?**
A: Non, LokiJS est en mémoire. Pour persister, il faudrait utiliser localStorage (non implémenté).

**Q: Comment débugger les données démo?**
A: Utiliser `console.log(store.getCollection('users').find())` pour inspecter les collections.

**Q: Pourquoi certaines pages sont des placeholders?**
A: Les formulaires complexes nécessitent beaucoup de code. Implémentés progressivement selon priorité.

**Q: Le mode démo affecte-t-il la production?**
A: Non, isolation complète. Aucune donnée démo ne touche Supabase.

---

## Roadmap

### Version 1.1 (Prochaine)
- [ ] Formulaires de création fonctionnels (building, lot, contact)
- [ ] Upload de fichiers simulé (base64 local)
- [ ] Recherche fulltext dans les listes

### Version 1.2
- [ ] Mode collaboratif (2+ utilisateurs simulés)
- [ ] Timeline d'activité
- [ ] Export des données (JSON)

### Version 2.0
- [ ] Persistence localStorage optionnelle
- [ ] Import de datasets custom
- [ ] Mode tutoriel interactif

---

## Support

**Questions ou bugs?**
Ouvrir une issue GitHub avec le tag `demo-mode`.

**Contribuer?**
Pull requests bienvenues! Suivre la structure existante et documenter les changements.

---

**🎉 Le mode démo SEIDO est prêt pour la production!**
