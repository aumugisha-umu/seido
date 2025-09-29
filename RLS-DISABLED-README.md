# ⚠️ RLS TEMPORAIREMENT DÉSACTIVÉ POUR TESTS

## 📊 Status Actuel

**Date:** 29 décembre 2025
**État:** RLS désactivé sur storage et intervention_documents
**Objectif:** Permettre l'upload de fichiers sans contraintes pour les tests

## 🛠️ Modifications Apportées

### 1. **Code Modifié (Temporaire)**
- **`lib/file-service.ts`** : Utilise `createServiceRoleClient()` pour bypasser RLS
- Toutes les opérations Storage utilisent maintenant la Service Role Key
- Marquées avec `⚠️ TEMPORAIRE` dans les commentaires

### 2. **Migrations Créées**
- **`disable-all-rls-temp.sql`** : Script SQL pour désactiver tous les RLS manuellement
- **`20251230000002_intervention_documents_no_rls.sql`** : Migration propre sans RLS

### 3. **RLS Désactivé Sur**
- `storage.objects` (table système Supabase)
- `intervention_documents` (table application)
- Suppression de toutes les politiques existantes

## 🚀 Actions de Test

### **Pour Tester Maintenant :**

1. **Appliquer la migration sans RLS :**
   ```bash
   npx supabase db push
   ```

2. **Ou exécuter le script manuel :**
   ```sql
   -- Dans Supabase SQL Editor, copier/coller le contenu de:
   -- disable-all-rls-temp.sql
   ```

3. **Vérifier que SUPABASE_SERVICE_ROLE_KEY est définie :**
   ```bash
   # Vérifier dans .env.local
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

4. **Tester l'upload depuis l'interface gestionnaire :**
   - Créer une intervention avec fichier
   - Vérifier que le fichier apparaît en DB
   - Consulter l'onglet "Exécution" de l'intervention

## 🔧 Debugging

### **Si l'erreur RLS persiste :**
1. Vérifier que la Service Role Key est bien configurée
2. Contrôler les logs pour "⚠️ USING SERVICE ROLE CLIENT TO BYPASS RLS"
3. S'assurer que les migrations sont appliquées

### **Variables d'environnement requises :**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsI...
```

## ✅ Validation du Fix

### **Critères de Succès :**
- [ ] Upload fichier depuis interface gestionnaire réussit
- [ ] Fichier visible dans la table `intervention_documents`
- [ ] Fichier affiché dans l'onglet "Exécution"
- [ ] Aucune erreur "row violates row-level security policy"

### **Logs à Surveiller :**
```
⚠️ USING SERVICE ROLE CLIENT TO BYPASS RLS (TEMPORARY)
📁 Starting file upload: {...}
✅ File uploaded to storage: interventions/xxx/...
✅ File uploaded successfully: filename.jpg
```

## 🔄 Remise en Place des RLS (Plus Tard)

### **Quand les tests seront validés :**

1. **Remettre le code normal** (enlever createServiceRoleClient)
2. **Créer les vraies politiques RLS** avec les bonnes expressions
3. **Réactiver RLS** sur les tables
4. **Supprimer ce fichier** et les scripts temporaires

### **Fichiers à Nettoyer :**
- `disable-all-rls-temp.sql`
- `20251230000002_intervention_documents_no_rls.sql`
- `RLS-DISABLED-README.md` (ce fichier)
- Commentaires `⚠️ TEMPORAIRE` dans le code

## 🎯 Objectif Final

Avoir un système d'upload de fichiers **complètement fonctionnel** avec RLS appropriés pour la production, permettant :

- Upload sécurisé par rôle utilisateur
- Accès contrôlé aux documents d'intervention
- Politiques RLS claires et maintenables

---

**⚠️ IMPORTANT:** Ce setup est **uniquement pour les tests de développement**.
**Ne JAMAIS déployer en production avec RLS désactivé !**