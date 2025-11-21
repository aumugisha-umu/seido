# 🔧 Troubleshooting Checklist - SEIDO App

> **Guide de dépannage pour problèmes récurrents et non-triviaux**
>
> **Mise à jour** : 2025-11-01

## 📋 Comment Utiliser Cette Checklist

**Quand l'utiliser** :
- ✅ Erreur non résolue après 2-3 tentatives
- ✅ Erreur cryptique sans cause évidente
- ✅ Comportement inattendu lié à l'architecture
- ✅ Problème de permissions/RLS inexpliqué
- ❌ Pas pour les erreurs de typo basiques
- ❌ Pas pour les erreurs de syntaxe évidentes

**Workflow** :
1. Identifier la catégorie du problème
2. Suivre la section correspondante
3. Documenter la solution si nouvelle
4. Mettre à jour cette checklist si pattern récurrent

---

## 1️⃣ Problèmes d'Édition de Fichiers (PowerShell/VSCode)

### Symptôme
```
Error: File has been unexpectedly modified. Read it again before attempting to write it.
```

### Checklist de Diagnostic

- [ ] **Fichier volumineux (>700 lignes)** ?
  - ✅ → Utiliser PowerShell par indices (voir [powershell-file-editing-workaround.md](./powershell-file-editing-workaround.md))
  - ❌ → Continuer diagnostic

- [ ] **VSCode Auto-Save activé** ?
  - ✅ → Désactiver temporairement ou utiliser PowerShell
  - ❌ → Vérifier formatter

- [ ] **Prettier/ESLint formatte en arrière-plan** ?
  - ✅ → Attendre 2-3 secondes entre Read et Edit
  - ❌ → Vérifier processus Node.js actifs

- [ ] **Processus Node.js/build en cours** ?
  ```bash
  tasklist | findstr node.exe
  taskkill /F /IM node.exe
  ```

### Solution Standard

**Pour fichiers >700 lignes** :
→ Voir template dans [powershell-file-editing-workaround.md](./powershell-file-editing-workaround.md)

**Pour fichiers <700 lignes** :
1. Lire le fichier
2. Attendre 1 seconde
3. Effectuer Edit
4. Si échec → PowerShell

---

## 2️⃣ Problèmes de Base de Données (Schema/Champs)

### Symptôme
```
error: column "tenant_id" does not exist
error: relation "old_table_name" does not exist
```

### Checklist de Diagnostic

- [ ] **Vérifier le schéma actuel (migrations)** ?
  ```bash
  # Lister les migrations appliquées
  ls supabase/migrations/

  # Lire la dernière migration
  cat supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql
  ```

- [ ] **Vérifier les types TypeScript** ?
  ```typescript
  // lib/database.types.ts - Source de vérité
  type Intervention = Database['public']['Tables']['interventions']['Row']
  ```

- [ ] **Types TypeScript à jour** ?
  ```bash
  npm run supabase:types
  ```

- [ ] **Champ renommé/supprimé dans migration** ?
  → Chercher dans les migrations récentes :
  ```bash
  grep -r "tenant_id" supabase/migrations/
  ```

### Solutions par Cas

#### Cas 1 : Champ supprimé dans migration

**Exemple** : `tenant_id` supprimé de `interventions`

**Solution** :
1. Identifier la migration qui l'a supprimé
2. Vérifier la nouvelle structure
3. Mettre à jour le code pour utiliser les nouveaux champs

**Migrations connues** :
- `20251015193000_remove_tenant_id_from_interventions.sql` → `tenant_id` supprimé
- `20251015000000_phase2_buildings_lots.sql` → Ajout tables `buildings`, `lots`

#### Cas 2 : Enum value invalide

**Exemple** : Utilisation de `'prive'` dans `document_visibility_level` (supprimé)

**Solution** :
1. Consulter `lib/database.types.ts` pour valeurs enum actuelles
2. Remplacer par valeur valide (`'equipe'`, `'locataire'`, `'intervention'`)

**Enums actuels** :
```typescript
// user_role
'admin' | 'gestionnaire' | 'locataire' | 'prestataire'

// team_member_role
'admin' | 'gestionnaire' | 'locataire' | 'prestataire'

// lot_category
'appartement' | 'collocation' | 'maison' | 'garage' | 'local_commercial' | 'parking' | 'autre'

// document_visibility_level (Phase 2)
'equipe' | 'locataire' // 'intervention' ajouté en Phase 3

// intervention_status
'demande' | 'rejetee' | 'approuvee' | 'demande_de_devis' | 'planification' |
'planifiee' | 'en_cours' | 'cloturee_par_prestataire' | 'cloturee_par_locataire' |
'cloturee_par_gestionnaire' | 'annulee'
```

### Référence Rapide : Structure DB Actuelle

**Tables Phase 1** (appliqué) :
- `users`, `teams`, `team_members`, `companies`, `user_invitations`

**Tables Phase 2** (appliqué) :
- `buildings`, `lots`, `building_contacts`, `lot_contacts`, `property_documents`

**Tables Phase 3** (planifié) :
- `document_intervention_shares` (partage temporaire documents)

**Fonctions RLS Helper** :
- `is_admin()` - Vérifie si user est admin
- `is_gestionnaire()` - Vérifie si user est gestionnaire
- `is_team_manager()` - Vérifie si user est manager de la team
- `get_building_team_id(building_id)` - Récupère team_id d'un immeuble
- `get_lot_team_id(lot_id)` - Récupère team_id d'un lot
- `is_tenant_of_lot(lot_id)` - Vérifie si user est locataire du lot
- `can_view_building(building_id)` - Permissions lecture immeuble
- `can_view_lot(lot_id)` - Permissions lecture lot

---

## 3️⃣ Problèmes d'Authentification (Server Components)

### Symptôme
```
Error: User not authenticated
Error: Profile not found
Error: Team not found
Redirect loop /login → /dashboard → /login
```

### Checklist de Diagnostic

- [ ] **Server Component utilise `getServerAuthContext()` ?**
  ```typescript
  // ✅ CORRECT
  import { getServerAuthContext } from '@/lib/server-context'
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // ❌ INCORRECT - Auth manuelle
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  ```

- [ ] **Client Component utilise `useAuth()` + `useTeamStatus()` ?**
  ```typescript
  // ✅ CORRECT
  const { user, profile } = useAuth()
  const { currentTeam } = useTeamStatus()

  // ❌ INCORRECT - Direct Supabase
  const [user, setUser] = useState(null)
  ```

- [ ] **Page protégée a validation de rôle** ?
  ```typescript
  // ✅ CORRECT - avec required role
  await getServerAuthContext('gestionnaire') // Redirige si pas gestionnaire

  // ❌ INCORRECT - pas de validation
  await getServerAuthContext() // N'importe quel user authentifié peut accéder
  ```

- [ ] **Cookies/Session corrompus** ?
  ```bash
  # Supprimer cookies manuellement
  # Ou logout/login
  ```

### Solutions par Cas

#### Cas 1 : Page accessible sans authentification (SÉCURITÉ !)

**Pages historiquement vulnérables** :
- `gestionnaire/biens/immeubles/[id]/page.tsx` (fixé 2025-10-22)
- `gestionnaire/biens/lots/[id]/page.tsx` (fixé 2025-10-22)
- `admin/notifications/page.tsx` (fixé 2025-10-22)

**Solution** :
```typescript
// Ajouter en haut de la page
import { getServerAuthContext } from '@/lib/server-context'

export default async function MyPage() {
  const { user, profile, team } = await getServerAuthContext('required-role')
  // ... reste du code
}
```

#### Cas 2 : Auth dupliquée (2+ requêtes DB identiques)

**Cause** : Layout + Page appellent auth séparément

**Solution** : `getServerAuthContext()` utilise déjà `React.cache()` → pas d'action nécessaire

#### Cas 3 : RLS bloque données malgré auth correcte

**Diagnostic** :
1. Vérifier que `profile.id` correspond à un `team_member`
2. Vérifier RLS policy de la table concernée
3. Tester la helper function RLS

**Exemple test RLS** :
```sql
-- Dans Supabase SQL Editor
SELECT is_team_manager('team-uuid-here');
SELECT get_building_team_id('building-uuid-here');
```

---

## 4️⃣ Problèmes de Permissions (RLS Policies)

### Symptôme
```
Error: new row violates row-level security policy
Error: Permission denied for table X
Données vides malgré présence en DB
```

### Checklist de Diagnostic

- [ ] **User a le bon rôle** ?
  ```typescript
  console.log('User role:', profile.role)
  console.log('Required role:', 'gestionnaire')
  ```

- [ ] **User est membre de la team** ?
  ```sql
  SELECT * FROM team_members WHERE user_id = 'profile-id';
  ```

- [ ] **Ressource appartient à la team de l'user** ?
  ```sql
  SELECT get_building_team_id('building-id');
  SELECT team_id FROM team_members WHERE user_id = 'profile-id';
  ```

- [ ] **Policy RLS autorise l'opération** ?
  → Vérifier dans `supabase/migrations/` la policy concernée

- [ ] **Helper function RLS existe et retourne vrai** ?
  ```sql
  SELECT can_view_building('building-id');
  SELECT can_view_lot('lot-id');
  ```

### Solutions par Cas

#### Cas 1 : Admin contourné par RLS (devrait avoir accès à tout)

**Vérifier** : Policy a clause `OR is_admin()`

```sql
-- ✅ CORRECT
CREATE POLICY "buildings_select" ON buildings FOR SELECT
USING (
  is_team_manager(team_id) OR is_admin()
);

-- ❌ INCORRECT - Admin bloqué
CREATE POLICY "buildings_select" ON buildings FOR SELECT
USING (
  is_team_manager(team_id)
);
```

#### Cas 2 : Gestionnaire ne voit pas ses propres ressources

**Diagnostic** :
1. Vérifier `team_members.team_id` correspond à `buildings.team_id`
2. Vérifier `team_members.role` = `'gestionnaire'`
3. Vérifier helper `is_team_manager()` fonctionne

**Fix si helper cassée** :
```sql
-- Recréer la fonction (voir migration Phase 1 ou 2)
CREATE OR REPLACE FUNCTION is_team_manager(check_team_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = check_team_id
      AND u.auth_user_id = auth.uid()
      AND tm.role IN ('admin', 'gestionnaire')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Cas 3 : Locataire accède à lots d'autres locataires

**Vérifier** : Policy utilise `is_tenant_of_lot()`

```sql
CREATE POLICY "lots_tenant_select" ON lots FOR SELECT
USING (
  is_team_manager(team_id) OR is_tenant_of_lot(id)
);
```

---

## 5️⃣ Problèmes de Build/Compilation

### Symptôme
```
Error: Cannot find module 'X'
Error: Type 'Y' is not assignable to type 'Z'
Build failed with X errors
```

### Checklist de Diagnostic

- [ ] **Processus Node.js en cours** ?
  ```bash
  tasklist | findstr node.exe
  taskkill /F /IM node.exe
  ```

- [ ] **Cache Next.js corrompu** ?
  ```bash
  rm -rf .next
  npm run build
  ```

- [ ] **Types TypeScript obsolètes** ?
  ```bash
  npm run supabase:types
  ```

- [ ] **Dépendances manquantes** ?
  ```bash
  npm install
  ```

- [ ] **Import path incorrect** ?
  ```typescript
  // ✅ CORRECT - alias @
  import { X } from '@/lib/services'

  // ❌ INCORRECT - chemin relatif long
  import { X } from '../../../lib/services'
  ```

### Solutions par Cas

#### Cas 1 : Type mismatch après migration DB

**Cause** : `database.types.ts` obsolète

**Solution** :
```bash
# Régénérer les types
npm run supabase:types

# Vérifier les changements
git diff lib/database.types.ts
```

#### Cas 2 : Module not found malgré installation

**Solution** :
```bash
# Nettoyer complètement
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

#### Cas 3 : Hydration mismatch React

**Cause** : Server Component retourne HTML différent du Client Component attendu

**Diagnostic** :
1. Vérifier que data passée en props est sérialisable (pas de Date, Function, etc.)
2. Vérifier que Server + Client utilisent même source de données
3. Vérifier condition `if (typeof window !== 'undefined')` pas dans render

**Solution** :
```typescript
// ✅ CORRECT - Serialize dates
const data = {
  ...rawData,
  createdAt: rawData.createdAt.toISOString() // String, pas Date
}

// ❌ INCORRECT - Pass Date object
<ClientComponent data={rawData} />
```

---

## 6️⃣ Problèmes de Routing/Navigation

### Symptôme
```
404 Not Found pour route existante
Redirect loop
Navigation ne change pas la page
```

### Checklist de Diagnostic

- [ ] **Route correspond à structure de dossiers** ?
  ```
  app/[role]/interventions/[id]/page.tsx
  → /gestionnaire/interventions/123
  ```

- [ ] **Dynamic segment bien nommé** ?
  ```typescript
  // ✅ CORRECT
  app/interventions/[id]/page.tsx
  export default function Page({ params }: { params: { id: string } })

  // ❌ INCORRECT - nom mismatch
  app/interventions/[interventionId]/page.tsx
  export default function Page({ params }: { params: { id: string } })
  ```

- [ ] **Middleware n'interfère pas** ?
  → Vérifier `middleware.ts` pour redirects

- [ ] **Layout parent a `{children}` ?**
  ```typescript
  // ✅ CORRECT
  export default function Layout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>
  }

  // ❌ INCORRECT - oubli children
  export default function Layout() {
    return <div>Header only</div>
  }
  ```

### Solutions par Cas

#### Cas 1 : Route protégée redirige en boucle

**Cause** : Middleware + Page auth créent cycle

**Solution** :
```typescript
// middleware.ts - Exclure routes publiques
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|auth/login|auth/signup).*)',
  ],
}
```

#### Cas 2 : Navigation client ne met pas à jour l'UI

**Cause** : `router.push()` appelé mais component pas re-rendu

**Solution** :
```typescript
// ✅ CORRECT - Force refresh si nécessaire
router.push('/new-route')
router.refresh()

// Ou utiliser Link component
<Link href="/new-route">Navigate</Link>
```

---

## 7️⃣ Problèmes de Performance

### Symptôme
```
Page prend >3 secondes à charger
UI freeze au scroll
Memory leak
```

### Checklist de Diagnostic

- [ ] **Requêtes DB optimisées** ?
  → Vérifier `select()` limite colonnes nécessaires
  → Vérifier index existent sur colonnes filtrées

- [ ] **Cache L1 (React.cache) utilisé** ?
  → `getServerAuthContext()` cache déjà auth
  → Services utilisent `CacheManager` pour requêtes répétées

- [ ] **useMemo/useCallback pour calculs coûteux** ?
  ```typescript
  // ✅ CORRECT
  const expensiveData = useMemo(() => processLargeArray(data), [data])

  // ❌ INCORRECT - recalcule à chaque render
  const expensiveData = processLargeArray(data)
  ```

- [ ] **Pagination pour grandes listes** ?
  → Utiliser `limit()` et `offset()` Supabase

- [ ] **Images optimisées** ?
  → Utiliser `next/image` avec `width` et `height`

### Solutions par Cas

#### Cas 1 : Page Dashboard lente (>2s)

**Diagnostic** :
1. Ouvrir DevTools → Network → Identifier requêtes lentes
2. Vérifier nombre de requêtes Supabase (devrait être <5)

**Solution** :
```typescript
// ✅ CORRECT - 1 requête avec joins
const { data } = await supabase
  .from('interventions')
  .select('*, lot:lots(*), building:buildings(*)')

// ❌ INCORRECT - N+1 queries
const interventions = await getInterventions()
for (const i of interventions) {
  const lot = await getLot(i.lot_id) // N requêtes !
}
```

#### Cas 2 : Liste longue lag au scroll

**Solution** : Utiliser virtualisation
```typescript
// Installer react-window
npm install react-window

// Utiliser FixedSizeList
<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
>
  {({ index, style }) => <ItemRow item={items[index]} style={style} />}
</FixedSizeList>
```

---

## 8️⃣ Problèmes de Tests (E2E Playwright)

### Symptôme
```
Test timeout après 30s
Element not found
Test flakey (passe/échoue aléatoirement)
```

### Checklist de Diagnostic

- [ ] **Isolation des tests (Pattern 5) respectée** ?
  → Chaque test crée ses propres données
  → Cleanup après test

- [ ] **Waiters corrects** ?
  ```typescript
  // ✅ CORRECT
  await page.waitForSelector('[data-testid="intervention-card"]')

  // ❌ INCORRECT - race condition
  await page.click('button')
  const text = await page.textContent('.result') // Peut être vide !
  ```

- [ ] **Sélecteurs stables** ?
  ```typescript
  // ✅ CORRECT - data-testid
  await page.click('[data-testid="submit-button"]')

  // ❌ INCORRECT - classe CSS changeante
  await page.click('.bg-blue-500.hover\\:bg-blue-600')
  ```

- [ ] **Base de données Supabase accessible** ?
  → Vérifier credentials dans `.env.local`
  → Vérifier connexion réseau

### Solutions par Cas

#### Cas 1 : Test timeout sur page load

**Cause** : Page attend auth/data qui ne vient jamais

**Solution** :
```typescript
// Augmenter timeout pour pages lentes
await page.goto('/gestionnaire/dashboard', {
  timeout: 60000,
  waitUntil: 'networkidle'
})
```

#### Cas 2 : Element not found malgré présence visuelle

**Cause** : Element dans iframe/shadow DOM ou async

**Solution** :
```typescript
// Attendre vraiment que l'élément soit là
await page.waitForSelector('[data-testid="card"]', {
  state: 'visible',
  timeout: 10000
})
```

#### Cas 3 : Tests interfèrent entre eux

**Solution** : Appliquer Pattern 5 (Isolation)
```typescript
test.beforeEach(async () => {
  // Créer données isolées avec suffix unique
  const uniqueSuffix = Date.now()
  testBuilding = await createBuilding(`Building-${uniqueSuffix}`)
})

test.afterEach(async () => {
  // Cleanup
  await deleteBuilding(testBuilding.id)
})
```

---

## 9️⃣ Template de Documentation Nouveau Bug

Quand vous découvrez un nouveau bug récurrent non-trivial :

```markdown
## [Numéro]️⃣ [Catégorie du Problème]

### Symptôme
```
[Message d'erreur exact ou comportement observé]
```

### Checklist de Diagnostic

- [ ] **[Question de diagnostic 1]** ?
  → [Action à prendre]

- [ ] **[Question de diagnostic 2]** ?
  → [Action à prendre]

### Solutions par Cas

#### Cas 1 : [Description cas spécifique]

**Cause** : [Explication racine]

**Solution** :
```[language]
[Code de la solution]
```

#### Cas 2 : [Description autre cas]

**Cause** : [Explication]

**Solution** :
```[language]
[Code de la solution]
```
```

---

## 📊 Statistiques de Bugs Résolus

| Catégorie | Bugs Documentés | Dernière MAJ |
|-----------|----------------|--------------|
| Édition Fichiers | 1 | 2025-11-01 |
| Base de Données | 3 | 2025-11-01 |
| Authentification | 3 | 2025-10-22 |
| Permissions RLS | 3 | 2025-10-22 |
| Build/Compilation | 3 | 2025-11-01 |
| Routing | 2 | 2025-11-01 |
| Performance | 2 | 2025-11-01 |
| Tests E2E | 3 | 2025-11-01 |

**Total** : 20 patterns de bugs documentés

---

## 🔄 Historique des Mises à Jour

| Date | Ajout | Raison |
|------|-------|--------|
| 2025-11-01 | Création initiale + 8 sections | Consolidation bugs récurrents Phase 1-2 |
| 2025-11-01 | Section PowerShell | Problème répété 5+ fois |
| 2025-10-22 | Section Auth Server Components | Migration 21 pages vers `getServerAuthContext()` |

---

**Maintenu par** : Claude + Arthur
**Licence** : Usage interne projet SEIDO
