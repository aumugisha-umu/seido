# 🔍 Guide de Debug - Création de Bâtiment

## Comment diagnostiquer l'erreur

### 1. 🌐 Ouvrir la console du navigateur
- **Chrome/Edge** : F12 → onglet "Console"
- **Firefox** : F12 → onglet "Console"
- **Safari** : Cmd+Option+C

### 2. 📋 Suivre le processus étape par étape

Quand vous cliquez sur "Créer le bâtiment", vous devriez voir ces logs dans l'ordre :

#### ✅ **Étapes normales attendues :**

1. **Clic sur le bouton**
   ```
   🖱️ Create button clicked!
   ```

2. **Début de la fonction**
   ```
   🚀 handleFinish called
   📊 Current state: {user: "User ID: ...", buildingInfo: {...}, lots: "1 lots", contacts: "0 contacts"}
   ```

3. **Validations**
   ```
   ✅ All validations passed, starting creation...
   🔄 Set isCreating to true
   ```

4. **Préparation des données**
   ```
   🏢 Building data prepared: {...}
   🏠 Lots data prepared: [...]
   👥 Contacts data prepared: []
   ```

5. **Appel du service**
   ```
   📡 Calling compositeService.createCompleteProperty...
   🏭 compositeService.createCompleteProperty called with: {...}
   ```

6. **Création du bâtiment**
   ```
   📝 Step 1: Creating building with lots...
   🏗️ createBuildingWithLots called with: {...}
   📝 Creating building...
   🏢 buildingService.create called with: {...}
   ✅ Building created in database: {...}
   ```

7. **Création des lots**
   ```
   📝 Creating lots...
   🏠 lotService.create called with: {...}
   ✅ Lot created in database: {...}
   ✅ Lots created successfully: {...}
   ```

8. **Finalisation**
   ```
   ✅ Step 1 completed - Building and lots created: {...}
   ⚠️ No contacts to create, skipping contact steps
   🎉 Building and lots created successfully!
   ✅ Building created successfully: {...}
   🔄 Redirecting to dashboard...
   🔄 Setting isCreating to false
   ```

### 3. ❌ **Erreurs possibles et solutions**

#### **A. Pas de log initial** → Le bouton ne fonctionne pas
- Vérifiez que vous êtes bien à l'étape 3 (contacts)
- Vérifiez qu'il y a au moins 1 lot créé à l'étape 2

#### **B. "No user ID found"** → Problème d'authentification
- Vérifiez que vous êtes connecté
- Regardez les logs de useAuth : `🔐 useAuth hook user state:`

#### **C. "No address provided"** → Données manquantes
- Retournez à l'étape 1 et saisissez une adresse

#### **D. "No lots provided"** → Pas de lots
- Retournez à l'étape 2 et ajoutez au moins un lot

#### **E. Erreur lors de `buildingService.create`** → Problème base de données
```
❌ Building creation error: {...}
```
**Solutions :**
- Vérifiez la connexion Supabase
- Vérifiez les politiques RLS
- Vérifiez que les migrations sont appliquées

#### **F. Erreur lors de `lotService.create`** → Problème création lots
```
❌ Lot creation error: {...}
```
**Solutions :**
- Vérifiez les données des lots (référence unique, etc.)
- Vérifiez que le bâtiment a bien été créé avant

#### **G. Erreur générique**
```
❌ Error creating building: {...}
```
- Copiez l'erreur complète et le stack trace
- Vérifiez la configuration Supabase

### 4. 📊 **Logs de diagnostic**

#### **Configuration Supabase**
Au chargement de la page, vous devriez voir :
```
🔧 Database service loaded with Supabase: {url: "https://...", hasAuth: true, hasFrom: true}
```

#### **État utilisateur**
```
🔐 useAuth hook user state: {id: "...", email: "...", role: "gestionnaire"}
```

#### **Équipes chargées**
```
📡 Loading user teams for user: ...
✅ User teams loaded: [...]
```

### 5. 🔧 **Vérifications rapides**

1. **Variables d'environnement** : `.env.local` contient bien les clés Supabase
2. **Authentification** : Vous êtes connecté en tant que gestionnaire
3. **Base de données** : Les migrations sont appliquées
4. **Réseau** : Pas d'erreur 400/500 dans l'onglet Network

### 6. 📝 **Comment reporter l'erreur**

1. Copiez **TOUS** les logs de la console
2. Faites une capture d'écran de l'état final
3. Indiquez à quelle étape ça s'arrête
4. Partagez les données de test utilisées

---

## 🚨 **Actions immédiates si ça ne fonctionne pas**

1. **Ouvrez la console** avant de cliquer sur créer
2. **Cliquez sur "Créer le bâtiment"** et attendez
3. **Copiez tous les logs** qui apparaissent
4. **Partagez-moi ces logs** pour que je puisse identifier le problème exact

Les logs me diront exactement où le processus s'arrête ! 🎯
