# 📋 PLAN D'ACTION - AMÉLIORATION AUTHENTIFICATION SEIDO

**Date de création :** 25 septembre 2025
**Statut :** En attente de démarrage
**Priorité :** CRITIQUE
**Durée estimée :** 5 semaines

---

## 🎯 OBJECTIF

Résoudre les problèmes d'authentification identifiés lors des tests automatisés Puppeteer tout en améliorant les performances, la sécurité et la maintenabilité du système d'authentification.

**Problèmes à résoudre :**
- ❌ Race conditions avec timeouts de 14s
- ❌ DOM instable pendant les tests automatisés
- ❌ Bundle JavaScript trop lourd (450KB)
- ❌ Architecture monolithique difficile à maintenir
- ❌ Middleware d'authentification trop permissif

---

## 🗂️ PHASE 1 - CORRECTIONS IMMÉDIATES
**⏰ Durée : 3-5 jours**
**🎯 Objectif : Stabiliser les tests et l'UX**

### ✅ TODO 1.1 : Réduire les Timeouts d'Authentification
- [ ] Modifier `lib/auth-service.ts` lignes 596-607
- [ ] Réduire timeout profile query de 6s → 2s
- [ ] Réduire timeout email fallback de 4s → 2s
- [ ] Implémenter exponential backoff au lieu de timeouts fixes
- [ ] Tester que les connexions manuelles fonctionnent toujours
- **Critère de succès :** Time to auth < 3s dans 95% des cas

### ✅ TODO 1.2 : Ajouter État de Chargement Explicite
- [ ] Créer interface `AuthState` avec propriété `isReady`
- [ ] Modifier `hooks/use-auth.tsx` pour inclure `isReady`
- [ ] Créer hook `useAuthReady()` pour composants et tests
- [ ] Ajouter flag global `window.__AUTH_READY__` pour tests
- [ ] Mettre à jour tous les composants qui utilisent useAuth
- **Critère de succès :** DOM stable, pas d'éléments qui disparaissent

### ✅ TODO 1.3 : Renforcer le Middleware d'Authentification
- [ ] Remplacer vérification de cookies par validation JWT réelle
- [ ] Implémenter `supabase.auth.getUser()` dans middleware
- [ ] Gérer les cas d'erreur avec redirections appropriées
- [ ] Ajouter logs pour debugging des redirections
- [ ] Tester avec les 3 rôles (gestionnaire, prestataire, locataire)
- **Critère de succès :** 0 faux positifs, sécurité renforcée

### ✅ TODO 1.4 : Ajouter Sélecteurs de Test Robustes
- [ ] Remplacer `#email` par `[data-testid="email-input"]`
- [ ] Ajouter data-testid sur tous les éléments critiques d'auth
- [ ] Mettre à jour les tests Puppeteer avec nouveaux sélecteurs
- [ ] Créer fichier `test/auth-test-config.js` avec configuration
- [ ] Ajouter hooks `waitForAuthReady()` dans les tests
- **Critère de succès :** Tests Puppeteer passent à 90%+

---

## 🗂️ PHASE 2 - OPTIMISATION PERFORMANCE
**⏰ Durée : 1 semaine**
**🎯 Objectif : Améliorer vitesse et réduire le bundle**

### ✅ TODO 2.1 : Implémenter Cache Intelligent
- [ ] Créer `lib/auth/cache-manager.ts`
- [ ] Implémenter cache Map avec TTL (5 min par défaut)
- [ ] Ajouter cache pour profils utilisateur (`profile_${userId}`)
- [ ] Ajouter cache pour permissions (`permissions_${userId}`)
- [ ] Intégrer dans `auth-service.ts` pour éviter requêtes dupliquées
- **Critère de succès :** -60% requêtes DB, +80% vitesse auth

### ✅ TODO 2.2 : Découper le Service Monolithique
- [ ] Créer dossier `lib/auth/services/`
- [ ] Extraire `authentication.service.ts` (login/logout uniquement)
- [ ] Extraire `profile.service.ts` (gestion profils)
- [ ] Extraire `permission.service.ts` (droits et rôles)
- [ ] Extraire `session.service.ts` (gestion sessions)
- [ ] Sortir logique équipes vers `team.service.ts` (hors auth)
- [ ] Créer tests unitaires pour chaque service
- **Critère de succès :** Services < 200 lignes, testabilité améliorée

### ✅ TODO 2.3 : Optimiser le Bundle JavaScript
- [ ] Configurer code splitting dans `next.config.js`
- [ ] Créer chunk spécifique pour auth (`cacheGroups.auth`)
- [ ] Implémenter lazy loading pour composants auth
- [ ] Analyser bundle avec `@next/bundle-analyzer`
- [ ] Supprimer imports Supabase inutilisés
- **Critère de succès :** Bundle auth 450KB → 120KB (-73%)

---

## 🗂️ PHASE 3 - ARCHITECTURE MODERNE
**⏰ Durée : 2 semaines**
**🎯 Objectif : État prévisible et performance optimale**

### ✅ TODO 3.1 : Migration vers Zustand
- [ ] Installer Zustand : `npm install zustand`
- [ ] Créer `lib/auth/store.ts` avec interface AuthStore
- [ ] Implémenter actions atomiques (setUser, setLoading, clearAuth)
- [ ] Ajouter persistence avec `zustand/middleware/persist`
- [ ] Migrer useAuth pour utiliser Zustand au lieu de Context
- [ ] Tester que tous les composants fonctionnent encore
- **Critère de succès :** État global cohérent, -75% re-renders

### ✅ TODO 3.2 : Intégration React Query pour Cache Serveur
- [ ] Installer React Query : `npm install @tanstack/react-query`
- [ ] Créer `providers/auth-query-provider.tsx`
- [ ] Implémenter `hooks/use-auth-query.ts` avec cache intelligent
- [ ] Configurer staleTime: 5min, retry: 3 avec exponential backoff
- [ ] Ajouter invalidation cache sur logout/login
- [ ] Migrer composants pour utiliser les nouveaux hooks
- **Critère de succès :** Cache hit rate 80%+, requêtes optimisées

### ✅ TODO 3.3 : Implémenter State Machine (Optionnel)
- [ ] Installer XState : `npm install xstate`
- [ ] Créer `lib/auth/auth-machine.ts` avec états définis
- [ ] Définir transitions : idle → authenticating → loadingProfile → authenticated
- [ ] Intégrer avec Zustand store existant
- [ ] Créer hook `useAuthMachine()` pour composants complexes
- [ ] Documenter les flows d'authentification
- **Critère de succès :** Flows prévisibles, debugging facilité

---

## 🗂️ PHASE 4 - OPTIMISATION TESTS
**⏰ Durée : 1 semaine**
**🎯 Objectif : Tests stables et fiables**

### ✅ TODO 4.1 : Configuration Puppeteer Optimisée
- [ ] Créer `test/auth-test-config.js` avec timeouts adaptés
- [ ] Réduire authTimeout à 3s (au lieu de 5s)
- [ ] Ajouter domStable: 1000ms pour stabilisation
- [ ] Implémenter retry strategy (3 tentatives, délai 1s)
- [ ] Centraliser tous les sélecteurs de test
- **Critère de succès :** Configuration centralisée et réutilisable

### ✅ TODO 4.2 : Hooks de Test pour Stabilité
- [ ] Créer `test/auth-test-hooks.ts`
- [ ] Implémenter `waitForAuthReady()` avec flag global
- [ ] Implémenter `mockAuthState()` pour données de test
- [ ] Ajouter `waitForDOMStable()` pour éviter race conditions
- [ ] Intégrer dans tous les tests d'authentification existants
- **Critère de succès :** Tests reproductibles et prévisibles

### ✅ TODO 4.3 : Tests E2E Complets des 4 Rôles
- [ ] Créer test pour Admin (credentials à définir)
- [ ] Valider test Gestionnaire (arthur@umumentum.com)
- [ ] Valider test Prestataire (arthur+prest@seido.pm)
- [ ] Valider test Locataire (arthur+loc@seido.pm)
- [ ] Tester workflow complet : login → dashboard → logout
- [ ] Ajouter test de permissions par rôle
- **Critère de succès :** 4/4 rôles testés avec succès 95%+

---

## 📊 CRITÈRES DE VALIDATION GLOBAUX

### Métriques Performance
- [ ] Time to Auth : < 2s (au lieu de 14s max)
- [ ] Bundle Auth : < 120KB (au lieu de 450KB)
- [ ] Tests Success Rate : > 95% (au lieu de 40%)
- [ ] DB Queries/login : 1-2 (au lieu de 3-5)
- [ ] Re-renders : < 3 (au lieu de 8-12)

### Métriques Qualité
- [ ] Services modulaires : < 200 lignes chacun
- [ ] Coverage tests unitaires : > 90%
- [ ] Tests E2E stables sur 10 runs consécutifs
- [ ] Aucun `setTimeout` > 2s dans le code auth
- [ ] Documentation technique complète

### Métriques Utilisateur
- [ ] Login time perçu < 1s (optimistic updates)
- [ ] Zéro refresh forcé après login
- [ ] Messages d'erreur informatifs (pas de 500)
- [ ] Déconnexion propre sur tous les onglets

---

## 🚨 RISQUES ET MITIGATION

### Risques Identifiés
1. **Régression pendant migration** → Tests existants en garde-fou
2. **Breaking changes Zustand** → Migration progressive avec fallback
3. **Performance dégradée** → Benchmark avant/après à chaque étape
4. **Tests instables** → Validation sur 10 runs avant validation

### Plan de Rollback
- Conserver ancien code en parallèle pendant Phase 3
- Feature flags pour basculer entre ancien/nouveau système
- Scripts de migration de données si nécessaire

---

## 📅 PLANNING DÉTAILLÉ

### Semaine 1 : Phase 1 - Corrections Immédiates
- **Jour 1-2** : TODO 1.1 + 1.2 (timeouts + état loading)
- **Jour 3-4** : TODO 1.3 (middleware renforcé)
- **Jour 5** : TODO 1.4 + tests validation

### Semaine 2 : Phase 2 - Performance
- **Jour 1-2** : TODO 2.1 (cache intelligent)
- **Jour 3-4** : TODO 2.2 (découpage services)
- **Jour 5** : TODO 2.3 (optimisation bundle)

### Semaine 3-4 : Phase 3 - Architecture Moderne
- **Semaine 3** : TODO 3.1 + 3.2 (Zustand + React Query)
- **Semaine 4** : TODO 3.3 + intégration complète

### Semaine 5 : Phase 4 - Tests et Validation
- **Jour 1-3** : TODO 4.1 + 4.2 (config et hooks test)
- **Jour 4-5** : TODO 4.3 + validation finale

---

## 📝 NOTES DE SUIVI

### Décisions Prises
- Conserver compatibilité avec comptes test existants
- Priorité UX > performances dans phase 1
- Migration progressive sans interruption service

### Questions Ouvertes
- [ ] Faut-il créer un compte Admin pour les tests ?
- [ ] Migration base de données nécessaire ?
- [ ] Impact sur les autres modules (interventions, etc.) ?

### Métriques à Surveiller
- Bundle size à chaque commit
- Test success rate en CI/CD
- Temps de réponse auth en production
- Erreurs JS côté client

---

**Responsable :** À assigner
**Review :** À planifier à la fin de chaque phase
**Documentation :** Mise à jour du README.md et docs/ en continu