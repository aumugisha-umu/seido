# SEIDO Debugging Toolkit - Index Complet

Guide complet de tous les outils de debugging disponibles pour SEIDO, organisé par cas d'usage.

## 📁 Structure des outils de debugging

```
seido-debugging-toolkit/
├── docs/
│   ├── seido-debugger-agent.md           # Agent spécialisé SEIDO
│   ├── seido-debugging-scenarios.md      # Scénarios courants
│   └── debugging-toolkit-index.md        # Ce fichier
├── lib/
│   └── seido-debugger.ts                # Utilitaires de debugging
├── components/debug/
│   └── seido-debug-panel.tsx            # Panel debug UI
└── test/
    └── [test files...]                   # Tests automatisés
```

## 🎯 Guide d'utilisation rapide

### 1. Premier diagnostic (30 secondes)
```typescript
// Dans n'importe quel composant
import { SEIDODebugger } from '@/lib/seido-debugger'

// Test rapide de l'utilisateur courant
SEIDODebugger.debugAuth('role_check', user.email, user.role, !!user)

// Test de connectivité
SEIDODebugger.testSupabaseConnectivity()
```

### 2. Debugging d'intervention (2 minutes)
```typescript
// Tracer une intervention complète
SEIDODebugger.traceIntervention('intervention-id')

// Debugging de transition d'état
SEIDODebugger.debugInterventionTransition(
  'intervention-id',
  'currentStatus',
  'targetStatus',
  'userRole',
  success
)
```

### 3. Debugging de permissions (1 minute)
```typescript
// Vérifier les permissions sur une ressource
SEIDODebugger.debugPermissions(
  'view_intervention',
  'gestionnaire',
  'user-id',
  resource,
  authorized
)
```

## 🔧 Outils par catégorie

### Debugging d'authentification et rôles
| Outil | Usage | Fichier |
|-------|--------|---------|
| `debugAuth()` | Test connexion/rôle | `lib/seido-debugger.ts:86` |
| `debugPermissions()` | Vérif permissions | `lib/seido-debugger.ts:47` |
| Auth Service Debug | Flow complet auth | `docs/seido-debugger-agent.md:280` |

### Debugging d'interventions
| Outil | Usage | Fichier |
|-------|--------|---------|
| `debugInterventionTransition()` | Transitions d'état | `lib/seido-debugger.ts:63` |
| `traceIntervention()` | Timeline complète | `lib/seido-debugger.ts:154` |
| Workflow Debug Patterns | Debugging workflow | `docs/seido-debugger-agent.md:58` |

### Debugging de notifications
| Outil | Usage | Fichier |
|-------|--------|---------|
| `debugNotification()` | Livraison notifications | `lib/seido-debugger.ts:79` |
| Real-time Debug | Test connexions temps réel | `docs/seido-debugger-agent.md:130` |
| Notification Pipeline Trace | Traçage complet | `docs/seido-debugging-scenarios.md:134` |

### Debugging de données et base
| Outil | Usage | Fichier |
|-------|--------|---------|
| `debugDatabaseOperation()` | Opérations DB | `lib/seido-debugger.ts:95` |
| `validateSEIDOData()` | Validation données | `lib/seido-debugger.ts:193` |
| RLS Policy Debug | Politiques sécurité | `docs/seido-debugger-agent.md:250` |

### Debugging d'interface utilisateur
| Outil | Usage | Fichier |
|-------|--------|---------|
| `debugDashboardData()` | Données dashboard | `lib/seido-debugger.ts:116` |
| `useSEIDODebug()` | Hook composants | `lib/seido-debugger.ts:250` |
| Debug Panel UI | Interface debugging | `components/debug/seido-debug-panel.tsx` |

### Debugging de performances
| Outil | Usage | Fichier |
|-------|--------|---------|
| `debugPerformance()` | Mesure performance | `lib/seido-debugger.ts:139` |
| `debuggedApiCall()` | Wrapper API calls | `lib/seido-debugger.ts:262` |
| Performance Profiling | Profiling complet | `docs/seido-debugging-scenarios.md:373` |

## 🚀 Quick Start par problème

### "Mon dashboard ne charge pas"
1. **Vérifier l'auth** : `SEIDODebugger.debugAuth('role_check', email, role, true)`
2. **Tester la DB** : `SEIDODebugger.testSupabaseConnectivity()`
3. **Debug dashboard** : `SEIDODebugger.debugDashboardData(role, 'main', metrics)`
4. **Vérifier RLS** : [Guide RLS](docs/seido-debugging-scenarios.md:28)

### "L'intervention ne change pas de statut"
1. **Tracer l'intervention** : `SEIDODebugger.traceIntervention('int-id')`
2. **Debug transition** : `SEIDODebugger.debugInterventionTransition(...)`
3. **Vérifier permissions** : [Guide permissions](docs/seido-debugging-scenarios.md:157)
4. **Tracer action** : [Action tracing](docs/seido-debugging-scenarios.md:186)

### "Je ne reçois pas de notifications"
1. **Test real-time** : [Real-time test](docs/seido-debugging-scenarios.md:78)
2. **Debug notification** : `SEIDODebugger.debugNotification(...)`
3. **Tracer pipeline** : [Pipeline trace](docs/seido-debugging-scenarios.md:134)

### "Les performances sont lentes"
1. **Profiler dashboard** : [Performance profiling](docs/seido-debugging-scenarios.md:373)
2. **Analyser re-renders** : [Render tracking](docs/seido-debugging-scenarios.md:411)
3. **Debug queries** : `SEIDODebugger.debugDatabaseOperation(...)`

## 📊 Interface de debugging

### Debug Panel (Mode développement)
- **Activation** : Bouton flottant en bas à droite
- **Tabs disponibles** :
  - **Logs** : Logs temps réel filtrés SEIDO
  - **Stats** : Statistiques par composant et niveau
  - **Tools** : Outils de test rapide

### Console Commands
```javascript
// Dans la console du navigateur
window.SEIDO_DEBUG = true  // Active le debugging verbose
SEIDODebugger.traceIntervention('id')  // Trace intervention
SEIDODebugger.testSupabaseConnectivity()  // Test connectivité
```

## 🎯 Agent Debugging Spécialisé

### Invocation de l'agent
```markdown
@seido-debugger J'ai un problème avec [description du problème]

Contexte :
- Rôle utilisateur: [gestionnaire/prestataire/locataire/admin]
- Action tentée: [action spécifique]
- Erreur observée: [message d'erreur ou comportement]
- Étapes de reproduction: [étapes détaillées]
```

### Capacités de l'agent
- **Diagnostic systématique** : Analyse méthodique des problèmes
- **Corrélation d'erreurs** : Identification de patterns
- **Solutions contextuelles** : Adaptées à l'architecture SEIDO
- **Prevention** : Recommandations pour éviter la récurrence

## 📋 Checklist debugging complète

### Avant de débugger
- [ ] Environment en mode développement
- [ ] Console ouverte avec filtres
- [ ] React DevTools disponible
- [ ] Network tab accessible
- [ ] Debug panel SEIDO activé

### Debugging systématique
1. **Identification** du problème
   - [ ] Reproduction consistante
   - [ ] Rôle utilisateur identifié
   - [ ] Context et données notées

2. **Investigation**
   - [ ] Logs SEIDO consultés
   - [ ] Network requests vérifiées
   - [ ] État des composants React inspecté
   - [ ] Base de données testée

3. **Résolution**
   - [ ] Cause racine identifiée
   - [ ] Solution implémentée
   - [ ] Tests de validation effectués
   - [ ] Impact vérifié sur autres rôles

4. **Documentation**
   - [ ] Problème documenté
   - [ ] Solution archivée
   - [ ] Tests de régression ajoutés
   - [ ] Knowledge base mise à jour

## 🔗 Ressources externes

### Outils de développement
- **React DevTools** : Extension navigateur pour composants
- **Redux DevTools** : Si state management complexe
- **Supabase Dashboard** : Monitoring base de données
- **Vercel Analytics** : Performance en production

### Documentation
- [Next.js Debugging Guide](https://nextjs.org/docs/debugging)
- [Supabase Debugging](https://supabase.com/docs/guides/getting-started/debugging)
- [React DevTools Guide](https://react.dev/learn/react-developer-tools)

## 📞 Support et escalade

### Niveaux de support
1. **Self-service** : Utiliser ce toolkit
2. **Agent SEIDO** : Debugging automatisé
3. **Team debugging** : Session collaborative
4. **Expert consultation** : Problèmes complexes

### Informations à préparer pour l'escalade
- Logs complets avec timestamps
- Étapes de reproduction détaillées
- Context utilisateur (rôle, ID, team)
- Screenshots ou vidéos si pertinent
- Configuration environment

Ce toolkit couvre tous les aspects du debugging dans SEIDO, de l'auto-diagnostic rapide aux investigations complexes avec l'agent spécialisé.