# 🔧 Guide Reset Phase 2 - RLS Correction

**Date** : 2025-10-12
**Durée totale** : ~15 minutes
**Prérequis** : Accès Supabase Dashboard avec droits SQL

---

## 🎯 Objectif

Corriger les policies RLS Phase 2 en réinstallant complètement les migrations avec les corrections suivantes :
- ✅ Ajout de `TO authenticated` sur les 20 policies
- ✅ Correction des fonctions helper (`auth_user_id` au lieu de `id`)
- ✅ Correction de `is_team_manager()` avec JOIN sur users

---

## 📋 Étapes à Suivre

### Étape 1 : Supprimer Phase 2 (3 min)

1. **Ouvrir Supabase Dashboard**
   - Aller sur : https://supabase.com/dashboard
   - Sélectionner ton projet SEIDO
   - Cliquer sur **SQL Editor** dans le menu de gauche

2. **Exécuter le script de suppression**
   - Ouvrir le fichier : `docs/scripts/reset-phase2-db.sql`
   - Copier **PARTIE 1/2** (lignes 1-49)
   - Coller dans SQL Editor
   - Cliquer sur **Run** (ou Ctrl+Enter)

3. **Vérifier le résultat**
   - Tu dois voir : `✅ Phase 2 supprimée avec succès`
   - Si erreur → Partager l'erreur exacte

---

### Étape 2 : Réinstaller Phase 2 Corrigée (5 min)

1. **Ouvrir la migration corrigée**
   - Fichier : `supabase/migrations/20251010000002_phase2_buildings_lots_documents.sql`
   - Sélectionner **TOUT** le contenu (Ctrl+A)
   - Copier (Ctrl+C)

2. **Exécuter dans Supabase**
   - Retour dans SQL Editor
   - **New query** (pour vider l'ancien script)
   - Coller la migration Phase 2 (Ctrl+V)
   - Cliquer sur **Run**

3. **Vérifier qu'il n'y a pas d'erreur**
   - Si aucune erreur → Phase 2 réinstallée ✅
   - Si erreur → Copier l'erreur complète et me la partager

---

### Étape 3 : Vérifier les Corrections (5 min)

1. **Ouvrir le script de vérification**
   - Fichier : `docs/scripts/verify-rls-phase2.sql`
   - Copier **TEST 1** (lignes 11-49)
   - Coller dans SQL Editor
   - Run

2. **Vérifier les résultats TEST 1**
   - `is_admin()` : Doit contenir `WHERE auth_user_id = auth.uid()`
   - `is_team_manager()` : Doit contenir `INNER JOIN users u` et `WHERE u.auth_user_id = auth.uid()`
   - ✅ Si présent → Fonctions corrigées
   - ❌ Si absent → Me partager le résultat

3. **Exécuter TEST 2** (Policies)
   - Copier **TEST 2** du script (lignes 51-86)
   - Run
   - Vérifier colonne `roles` : Doit être `{authenticated}` pour toutes les policies

4. **Exécuter TEST 3** (Auth Context)
   - Copier **TEST 3** du script (lignes 88-102)
   - Run
   - Vérifier que `current_auth_uid` et `database_user_id` sont remplis

5. **Exécuter TEST 4** (Debug Building Insert)
   - **⚠️ IMPORTANT** : Remplacer `<TEAM_ID>` par ton team_id réel
   - Copier **TEST 4** (lignes 104-122)
   - Run
   - **CRITIQUE** : `is_manager_result` DOIT être `TRUE`
   - Si `FALSE` → Exécuter TEST 5

---

### Étape 4 : Tester Création Building (2 min)

1. **Dans l'application Next.js**
   - Aller sur `/gestionnaire/biens/immeubles/nouveau`
   - Remplir le formulaire
   - Soumettre

2. **Vérifier le résultat**
   - ✅ Succès → Building créé, redirection vers liste
   - ❌ Erreur → Copier l'erreur console + logs Next.js

---

### Étape 5 : Vérifier en DB (1 min)

**Exécuter dans SQL Editor** :
```sql
SELECT
  id,
  name,
  team_id,
  city,
  country,
  created_at
FROM buildings
ORDER BY created_at DESC
LIMIT 5;
```

**Résultat attendu** : Ton building apparaît dans la liste.

---

## 🚨 Troubleshooting

### Erreur à l'Étape 2 : "function already exists"
**Solution** : Retourner à l'Étape 1 et réexécuter le script de suppression.

### TEST 4 : `is_manager_result = FALSE`
**Cause** : Pas de membership actif dans team_members
**Solution** : Exécuter TEST 5 pour voir l'état de tes memberships

### Étape 4 : Erreur 403 persiste
**Solution** :
1. Relancer TOUS les tests de l'Étape 3
2. Vérifier que `is_manager_result = TRUE`
3. Si toujours FALSE → Vérifier team_members avec TEST 5

---

## ✅ Checklist Finale

- [ ] Étape 1 : Phase 2 supprimée (message de confirmation)
- [ ] Étape 2 : Phase 2 réinstallée (aucune erreur)
- [ ] Étape 3 - TEST 1 : Fonctions contiennent `auth_user_id`
- [ ] Étape 3 - TEST 2 : Policies ont `{authenticated}`
- [ ] Étape 3 - TEST 4 : `is_manager_result = TRUE`
- [ ] Étape 4 : Building créé avec succès
- [ ] Étape 5 : Building visible en DB

---

## 📞 Support

Si tu rencontres un problème :
1. Note l'étape où tu bloques
2. Copie l'erreur EXACTE (message + stack trace)
3. Copie le résultat des tests SQL qui échouent
4. Partage-moi tout ça pour diagnostic immédiat

---

**Dernière mise à jour** : 2025-10-12
**Status** : Prêt à l'emploi ✅
