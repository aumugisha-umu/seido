# 🐛 Guide du Debug Panel - Navigation & Cache

## 🎯 **Vue d'Ensemble**

Le Debug Panel est un outil intégré pour diagnostiquer et tester le système de navigation et de cache de l'application. Il permet de détecter les problèmes de performance, les boucles infinies et de tester les mécanismes de refresh des données.

## ✨ **Fonctionnalités**

### 🔘 **Toggle Intelligent**
- **Bouton flottant** en bas à droite pour ouvrir/fermer le panel
- **Persistance** des préférences utilisateur dans localStorage
- **Indicateur visuel** rouge clignotant si boucle détectée
- **État réduit/étendu** sauvegardé entre les sessions

### ⌨️ **Raccourci Clavier**
- **`Ctrl + Shift + D`** (Windows/Linux) ou **`Cmd + Shift + D`** (Mac)
- Ouverture/fermeture rapide du debug panel
- Pratique pour les développeurs

### 🚨 **Détection de Boucle Infinie**
- **Détection automatique** si > 10 messages de cache consécutifs
- **Alerte visuelle** rouge avec bouton d'urgence
- **Emergency Stop** pour arrêter les boucles
- **Proposition de refresh** si boucle persiste

## 🎮 **Comment Utiliser**

### **1. Ouvrir le Debug Panel**

#### **Option 1 : Bouton Flottant**
1. Chercher le **bouton rond** en bas à droite avec l'icône `🐛`
2. **Cliquer** pour ouvrir le panel
3. **Rouge clignotant** = boucle détectée

#### **Option 2 : Raccourci Clavier**
1. Appuyer sur **`Ctrl + Shift + D`** (ou `Cmd + Shift + D` sur Mac)
2. Le panel s'ouvre/ferme instantanément

### **2. Tests Automatisés**

#### **Cliquer "Run Tests"**
- ✅ **Cache Test** - Vérifie le système de cache
- ✅ **Invalidation Test** - Teste l'invalidation du cache
- ✅ **Navigation Test** - Vérifie la détection des changements de route
- ✅ **Refresh Test** - Teste les callbacks de refresh

#### **Résultats Attendus**
```
✅ Cache test: PASS
✅ Invalidation test: PASS  
✅ Navigation test: PASS
✅ Refresh test: PASS
```

### **3. Tests de Navigation**

#### **Navigation Entre Sections**
1. **Dashboard** → Cliquer "Refresh Section" → Observer les logs
2. **Biens** → Vérifier le refresh automatique
3. **Interventions** → Surveiller les boucles potentielles  
4. **Contacts** → Tester le système de cache

#### **Logs Normaux (Attendus)**
```
🧭 Navigation to /gestionnaire/dashboard at 14:32:15
🏠 Dashboard section - refreshing stats
🔄 Cache refresh triggered
✅ Manager stats loaded: {...}
```

#### **Logs Problématiques (À Investiguer)**
```
🎯 Route matches pattern, invalidating cache for: [...]
🎯 Route matches pattern, invalidating cache for: [...] 
🎯 Route matches pattern, invalidating cache for: [...]
... (répété = boucle infinie)
```

### **4. Actions d'Urgence**

#### **Si Boucle Détectée**
1. **Alerte rouge** apparaît automatiquement
2. **Cliquer "Emergency Stop"** pour arrêter la boucle
3. **Confirmer le refresh** de page si suggéré
4. **Observer les logs** pour vérifier l'arrêt

#### **Si Performance Lente**
1. **Cliquer "Global Refresh"** pour forcer un refresh complet
2. **Vérifier les temps** dans les logs
3. **Utiliser "Clear Logs"** pour redémarrer proprement

## 📊 **Interprétation des Résultats**

### **🟢 Système Sain**
- **Tests** : Tous PASS ✅
- **Navigation** : < 500ms entre sections
- **Logs** : 1-3 messages normaux par navigation
- **CPU** : Usage normal

### **🟡 Performance Dégradée**  
- **Tests** : Quelques échecs ⚠️
- **Navigation** : 500ms - 2s entre sections
- **Logs** : Messages multiples mais pas en boucle
- **Action** : Utiliser "Refresh Section"

### **🔴 Problème Critique**
- **Tests** : Échecs multiples ❌
- **Navigation** : > 2s ou bloquée
- **Logs** : Boucle infinie détectée 🚨
- **Action** : Emergency Stop + refresh page

## 🛠️ **Fonctionnalités Avancées**

### **Persistance des Préférences**
```javascript
// Sauvegardé automatiquement dans localStorage
- debug-panel-visible: true/false
- debug-panel-expanded: true/false
```

### **Raccourcis & Tips**
- **Double-clic sur les logs** pour les copier
- **Hover sur les badges** pour plus d'infos
- **Réduire le panel** pour garder seulement l'essentiel
- **Emergency Stop** nettoie tous les timeouts actifs

### **Intégration avec DevTools**
1. **Console** : Tous les logs y sont aussi affichés
2. **Network** : Observer les requêtes pendant les tests
3. **Performance** : Profiler les re-renders avec le panel ouvert

## 📱 **États du Bouton Toggle**

### **🔘 État Normal**
```css
/* Bouton gris foncé, icône Bug */
bg-slate-800 hover:bg-slate-700
```

### **🚨 État d'Alerte**
```css
/* Bouton rouge clignotant + indicator ping */
bg-red-600 hover:bg-red-500 animate-pulse
+ point rouge clignotant en haut à droite
```

## 🎯 **Scénarios d'Usage**

### **Développement Quotidien**
1. **Ouvrir** avec `Ctrl+Shift+D`
2. **Tester** la navigation après modifications
3. **Vérifier** les performances
4. **Fermer** quand satisfait

### **Debug d'un Problème**
1. **Reproduire** le problème
2. **Observer les logs** en temps réel  
3. **Run Tests** pour diagnostic
4. **Emergency Stop** si boucle
5. **Copier les logs** pour analyse

### **Tests de Performance**
1. **Clear Logs** pour commencer proprement
2. **Naviguer** entre toutes les sections
3. **Chronométrer** les temps de réponse
4. **Vérifier** les métriques dans les logs

## ⚙️ **Configuration & Personnalisation**

Le debug panel se configure automatiquement mais vous pouvez :

### **Modifier les Seuils de Détection**
```typescript
// Dans navigation-debug.tsx
if (cacheInvalidateMessages.length > 10) { // Modifier ce seuil
  setLoopDetected(true)
}
```

### **Ajouter des Tests Personnalisés**
```typescript
// Exemple d'ajout de test
const customTest = () => {
  // Votre logique de test
  setTestResults(prev => ({ ...prev, customTest: true }))
}
```

### **Personnaliser les Logs**
```typescript
// Filtrer les logs par type
const filteredLogs = logs.filter(log => 
  log.includes('[CACHE]') || log.includes('[NAV-REFRESH]')
)
```

## 📋 **Checklist de Test**

### **✅ Tests Quotidiens**
- [ ] Ouvrir le debug panel (`Ctrl+Shift+D`)
- [ ] Cliquer "Run Tests" - tous PASS
- [ ] Naviguer Dashboard → Biens → Interventions → Contacts  
- [ ] Vérifier temps < 500ms chacun
- [ ] Aucune alerte rouge détectée
- [ ] Fermer le panel

### **✅ Tests de Régression** 
- [ ] Reproduire ancien problème de boucle
- [ ] Vérifier détection automatique
- [ ] Tester Emergency Stop
- [ ] Confirmer arrêt effectif
- [ ] Valider logs normaux après correction

### **✅ Tests de Performance**
- [ ] Clear Logs + navigation complète
- [ ] Mesurer temps de chaque section
- [ ] Vérifier usage CPU/mémoire stable
- [ ] Tester sur différents navigateurs
- [ ] Valider sur mobile/tablet

---

**🎯 Le Debug Panel est maintenant votre allié principal pour diagnostiquer et résoudre les problèmes de navigation et de cache. Utilisez-le régulièrement pour maintenir des performances optimales !**
