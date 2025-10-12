# 🚀 Reset Phase 2 avec Supabase CLI (Méthode Recommandée)

**Date** : 2025-10-12
**Durée totale** : ~2 minutes ⚡
**Prérequis** : Supabase CLI installé et projet lié

---

## 🎯 Avantages de Cette Méthode

- ✅ **1 seule commande** au lieu de 5 étapes manuelles
- ✅ **Pas d'erreur de copier-coller**
- ✅ **Applique toutes les migrations** dans l'ordre
- ✅ **Garantit cohérence** avec fichiers locaux
- ✅ **Méthode officielle** Supabase

---

## 📋 Prérequis (Vérification Rapide)

### Vérifier Supabase CLI installé
```bash
supabase --version
```

**Résultat attendu** : `supabase version 1.x.x` (n'importe quelle version récente)

**Si pas installé** :
```bash
npm install -g supabase
```

### Vérifier projet lié
```bash
supabase status
```

**Résultat attendu** : Affiche les détails de ton projet SEIDO
**Si erreur "Not linked"** : Voir section "Configuration Initiale" ci-dessous

---

## 🔄 Reset Complet (1 Commande)

### Dans ton terminal (répertoire projet)

```bash
supabase db reset --linked
```

**Ce que cette commande fait** :
1. ✅ Drop toutes les tables existantes
2. ✅ Supprime toutes les fonctions
3. ✅ Supprime toutes les policies
4. ✅ Réapplique Phase 1 (users, teams, invitations)
5. ✅ Réapplique Phase 2 (buildings, lots, documents) avec corrections
6. ✅ Recrée toutes les données de seed (si présentes)

**Durée** : ~30 secondes - 1 minute selon la taille

---

## ⚠️ IMPORTANT : Backup Données

**Cette commande SUPPRIME TOUTES les données !**

Si tu as des données importantes à conserver :

```bash
# Option 1 : Sauvegarder dans un fichier SQL
supabase db dump --linked > backup-$(date +%Y%m%d-%H%M%S).sql

# Option 2 : Utiliser pg_dump directement (plus fiable)
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres" > backup.sql
```

---

## ✅ Vérification Post-Reset

### Vérifier les migrations appliquées
```bash
supabase migration list --linked
```

**Résultat attendu** :
```
local      | remote     | status
───────────────────────────────────────
20251009000001 | 20251009000001 | applied
20251010000002 | 20251010000002 | applied
```

### Vérifier les fonctions RLS (SQL Editor ou psql)
```sql
-- Vérifier is_team_manager() corrigée
SELECT pg_get_functiondef('is_team_manager(uuid)'::regprocedure);
```

**Tu dois voir** :
```sql
INNER JOIN users u ON tm.user_id = u.id
WHERE u.auth_user_id = auth.uid()  -- ✅ Cette ligne est critique
```

### Vérifier les policies (SQL Editor)
```sql
SELECT tablename, policyname, roles
FROM pg_policies
WHERE tablename = 'buildings';
```

**Tu dois voir** : `roles: {authenticated}` pour toutes les policies

---

## 🧪 Test Final : Création Building

### Dans l'application Next.js
1. Aller sur `/gestionnaire/biens/immeubles/nouveau`
2. Remplir le formulaire
3. Soumettre

**Résultat attendu** : Building créé avec succès ✅

---

## 🔧 Configuration Initiale (Si Projet Pas Lié)

### Si `supabase status` dit "Not linked"

1. **Login Supabase CLI**
```bash
supabase login
```

2. **Lier le projet**
```bash
supabase link --project-ref [TON_PROJECT_REF]
```

**Trouver ton PROJECT_REF** :
- Dashboard Supabase → Settings → General
- Ou dans l'URL : `https://supabase.com/dashboard/project/[PROJECT_REF]`

3. **Vérifier le lien**
```bash
supabase status
```

---

## 📊 Comparaison des Méthodes

| Critère | CLI Reset | Scripts SQL Manuels |
|---------|-----------|-------------------|
| **Commandes** | 1 | 15+ |
| **Durée** | 1 min | 15 min |
| **Erreurs possibles** | Très rare | Copier-coller, ordre |
| **Cohérence** | Garantie | Manuelle |
| **Recommandation** | ✅ OUI | ❌ Fallback only |

---

## 🚨 Troubleshooting

### Erreur : "Cannot connect to linked project"
**Solution** :
```bash
# Vérifier connexion
supabase status

# Re-login si nécessaire
supabase login
```

### Erreur : "Migration failed"
**Solution** :
1. Vérifier que tes migrations SQL sont valides
2. Tester localement d'abord :
```bash
supabase db reset  # Sans --linked (local)
```

### Vérifier connexion DB
```bash
supabase db remote commit
```

---

## ✅ Checklist Complète

- [ ] Supabase CLI installé
- [ ] Projet lié avec `supabase link`
- [ ] Backup des données (si nécessaire)
- [ ] Exécuter `supabase db reset --linked`
- [ ] Vérifier migrations appliquées
- [ ] Vérifier fonctions RLS corrigées
- [ ] Vérifier policies avec `{authenticated}`
- [ ] Tester création building dans l'app
- [ ] Vérifier building en DB

---

## 🎉 Avantages Bonus

### Seed Data (Optionnel)
Si tu veux des données de test après chaque reset :

1. Créer `supabase/seed.sql`
```sql
-- Insérer données de test
INSERT INTO teams (name) VALUES ('Test Team');
-- etc...
```

2. Le reset appliquera automatiquement le seed ! 🎉

### Migrations Futures
Pour ajouter de nouvelles migrations :
```bash
supabase migration new nom_migration
```

Puis reset pour appliquer :
```bash
supabase db reset --linked
```

---

**Dernière mise à jour** : 2025-10-12
**Méthode recommandée** : ✅ CLI Reset
**Méthode manuelle** : ⚠️ Fallback seulement si CLI indisponible
