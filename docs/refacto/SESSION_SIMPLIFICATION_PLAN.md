# 🔧 PLAN DE RÉACTIVATION PROGRESSIVE

## ✅ **ÉTAT ACTUEL - SYSTÈME SIMPLIFIÉ**
- ❌ Détection automatique désactivée
- ❌ Nettoyage complexe désactivé  
- ❌ Retries multiples supprimés
- ✅ Fonction de test manuelle disponible
- ✅ Auth de base fonctionnel

## 📋 **PLAN DE RÉACTIVATION** (si tests OK)

### **Phase 1 : Test Manuel**
```javascript
// Dans la console du navigateur
window.testSessionCleanup()
```
**Résultat attendu :** Redirection vers login

### **Phase 2 : Détection de Base**
- Réactiver `onAuthStateChange` cleanup pour comptes supprimés
- Garder timeouts simples

### **Phase 3 : Nettoyage Intelligent**  
- Réactiver `cleanupCorruptedSession` avec la nouvelle logique
- Ajouter vérifications des cookies

### **Phase 4 : Détection Automatique**
- Réactiver `initializeSessionDetection` avec exclusions
- Timeouts adaptés par environnement

## 🧪 **TESTS À EFFECTUER**

### **Test 1 : Fonction Manuelle**
1. Ouvrir console (F12)
2. Taper `window.testSessionCleanup()`
3. Vérifier redirection vers login

### **Test 2 : Session Normale**
1. Login normal
2. Navigation normale
3. Pas de nettoyage intempestif

### **Test 3 : Session Corrompue**
1. Login normal
2. Supprimer compte de DB
3. Naviguer vers nouvelle page
4. Observer comportement

## 🎯 **CRITÈRES DE SUCCÈS**

- ✅ Login/logout fonctionne
- ✅ Navigation normale sans interruption  
- ✅ Fonction test redirige correctement
- ✅ Pas de boucles infinies
- ✅ Pas de false positives

## 🚨 **SI PROBLÈMES DÉTECTÉS**

1. **Noter les logs exacts**
2. **Identifier l'étape problématique**  
3. **Revenir à la phase précédente**
4. **Corriger avant de continuer**

## 📝 **FICHIERS MODIFIÉS**

- `hooks/use-auth.tsx` - Simplifié
- `lib/session-cleanup.ts` - Fonction test ajoutée
- Code complexe commenté, pas supprimé

## 🔄 **ROLLBACK POSSIBLE**

Tous les changements sont **réversibles** :
- Code original commenté
- Pas de suppression définitive
- Retour possible en quelques minutes
