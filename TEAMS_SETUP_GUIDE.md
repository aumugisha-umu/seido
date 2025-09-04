# Guide d'installation du système d'équipes

Ce guide explique comment mettre en place et utiliser le nouveau système d'équipes pour la gestion des bâtiments, lots et contacts.

## 🚀 Installation

### 1. Exécuter la migration

Appliquez la nouvelle migration à votre base de données Supabase :

```bash
# Si vous utilisez Supabase CLI
supabase db push

# Ou directement via l'interface Supabase
# Copiez le contenu de supabase/migrations/20250115000000_add_team_system.sql
# et exécutez-le dans l'éditeur SQL de Supabase
```

### 2. Vérifier l'installation

La migration ajoute :
- ✅ Table `teams` pour les équipes
- ✅ Table `team_members` pour les membres d'équipe
- ✅ Colonnes `team_id` dans `buildings` et `contacts`
- ✅ Politiques RLS mises à jour
- ✅ Fonctions utilitaires
- ✅ Données de test (équipe et gestionnaire)

### 3. Régénérer les types TypeScript (optionnel)

Pour avoir des types TypeScript complets :

```bash
# Si vous utilisez Supabase CLI
supabase gen types typescript --local > lib/database.types.ts

# Ou depuis le projet Supabase en ligne
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
```

## 📋 Fonctionnalités

### Système d'équipes
- **Création d'équipes** : Les gestionnaires peuvent créer des équipes
- **Gestion des membres** : Ajout/suppression de membres avec rôles (admin/member)
- **Accès partagé** : Tous les membres de l'équipe ont accès aux bâtiments/contacts de l'équipe
- **Compatibilité** : Compatible avec la gestion individuelle existante

### Création de bâtiments
- **Interface mise à jour** : Sélection d'équipe dans le formulaire
- **Intégration Supabase** : Sauvegarde complète des données
- **Gestion d'erreurs** : Validation et messages d'erreur appropriés
- **États de chargement** : Interface responsive pendant les opérations

## 🔧 Utilisation

### 1. Créer une équipe

```typescript
import { teamService } from '@/lib/database-service'

const team = await teamService.create({
  name: "Équipe Paris Centre",
  description: "Gestion des biens du centre de Paris",
  created_by: userId
})
```

### 2. Ajouter des membres

```typescript
await teamService.addMember(teamId, userId, 'member')
```

### 3. Créer un bâtiment avec équipe

Le formulaire `app/gestionnaire/nouveau-batiment/page.tsx` gère automatiquement :
- Chargement des équipes de l'utilisateur
- Sélection d'équipe (optionnelle)
- Création du bâtiment avec lots et contacts
- Association automatique à l'équipe sélectionnée

### 4. Accès aux données

```typescript
// Récupérer les bâtiments d'un utilisateur (individuels + équipe)
const buildings = await buildingService.getUserBuildings(userId)

// Récupérer les contacts d'une équipe
const contacts = await contactService.getTeamContacts(teamId)

// Récupérer toutes les données d'un utilisateur
const userData = await compositeService.getUserTeamData(userId)
```

## 🔒 Sécurité (RLS)

Les politiques Row Level Security garantissent :
- ✅ Les utilisateurs ne voient que leurs propres équipes
- ✅ Les membres d'équipe accèdent seulement aux ressources de leur équipe
- ✅ Les admins d'équipe peuvent gérer les membres
- ✅ Compatibilité avec la gestion individuelle existante

## 🧪 Test

### Données de test incluses
La migration crée automatiquement :
- Un gestionnaire de test (si aucun n'existe)
- Une équipe de test "Équipe Paris Centre"
- Le gestionnaire comme admin de l'équipe

### Tester le formulaire
1. Connectez-vous comme gestionnaire
2. Allez sur `/gestionnaire/nouveau-batiment`
3. Vérifiez que les équipes apparaissent dans le formulaire
4. Créez un bâtiment avec des lots
5. Vérifiez que les données sont sauvegardées correctement

## 🐛 Dépannage

### Types TypeScript
Si vous rencontrez des erreurs de types, c'est temporaire. Les services utilisent `any` pour contourner les types manquants jusqu'à ce que les types soient régénérés.

### Erreurs RLS
Si vous avez des erreurs d'accès :
1. Vérifiez que l'utilisateur est bien dans une équipe
2. Vérifiez que les politiques RLS sont actives
3. Consultez les logs Supabase pour plus de détails

### Migrations
Si la migration échoue :
1. Vérifiez que la base de données est à jour
2. Exécutez les migrations une par une si nécessaire
3. Vérifiez les permissions sur les tables

## 📁 Fichiers modifiés

### Migration
- `supabase/migrations/20250115000000_add_team_system.sql`

### Services
- `lib/database-service.ts` : Services étendus avec équipes

### Interface
- `app/gestionnaire/nouveau-batiment/page.tsx` : Formulaire intégré Supabase

### Types
- Types `Team` et `TeamMember` temporaires ajoutés

## 🚀 Prochaines étapes

1. **Régénérer les types** TypeScript après migration
2. **Tester** la fonctionnalité complète
3. **Créer** une interface de gestion d'équipe
4. **Étendre** le système à d'autres entités (interventions, etc.)

---

💡 **Conseil** : Commencez par tester avec des données de développement avant d'appliquer en production !
