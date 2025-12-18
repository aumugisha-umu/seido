# Checklist PWA (Progressive Web App) - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Priorité** : P1 - Important
> **Tests** : 18 tests documentés

---

## Vue d'ensemble

Cette checklist couvre les tests de la Progressive Web App (PWA) de SEIDO, incluant l'installation, le mode offline, le cache et les notifications push.

### Composants Testés

| Composant | Fichier | Fonction |
|-----------|---------|----------|
| PWA Install Banner | `components/pwa/pwa-install-banner.tsx` | Bannière d'installation fixe (44px) |
| PWA Banner Context | `contexts/pwa-banner-context.tsx` | Logique d'installation et état |
| PWA Prompt Hook | `hooks/use-pwa-prompt-once-per-session.ts` | Prompt une fois par session |
| Service Worker | `public/sw.js` | Cache et mode offline |

### Plateformes Prioritaires

| Plateforme | Priorité | Notes |
|------------|----------|-------|
| Android Chrome | P0 | Support complet PWA |
| Desktop Chrome | P0 | Support complet PWA |
| iOS Safari | P1 | Limité (pas de beforeinstallprompt) |
| Firefox Desktop | P2 | Support partiel |

---

## 1. Installation PWA - Banner

### Préconditions
- [ ] Utilisateur connecté (auth requis pour le prompt)
- [ ] Application servie en HTTPS
- [ ] Application non déjà installée (pas en mode standalone)
- [ ] Premier accès de la session (sessionStorage vide)

### Tests

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 1.1 | **Banner apparaît après 3s** | Charger la page après login | Banner visible après 3 secondes (PROMPT_DELAY_MS=3000) | P0 | ☐ |
| 1.2 | **Position fixe top** | Vérifier position du banner | Banner fixé en haut, hauteur 44px (PWA_BANNER_HEIGHT) | P0 | ☐ |
| 1.3 | **Contenu du banner** | Vérifier texte affiché | "Installer l'application pour un accès rapide" | P0 | ☐ |
| 1.4 | **Bouton Installer visible** | Vérifier boutons | Bouton "Installer" avec icône Download visible | P0 | ☐ |
| 1.5 | **Bouton Fermer visible** | Vérifier boutons | Bouton X (close) visible à droite | P0 | ☐ |

### Critères d'Acceptation

```gherkin
Feature: PWA Installation Banner

  Scenario: Banner apparaît pour un utilisateur éligible
    Given l'utilisateur est connecté
    And l'application n'est pas installée
    And c'est le premier accès de la session
    When 3 secondes se sont écoulées après le chargement
    Then la bannière d'installation est visible
    And elle est positionnée en haut de l'écran
    And elle a une hauteur de 44px
```

---

## 2. Installation PWA - Actions

### Préconditions
- [ ] Banner PWA visible
- [ ] Événement `beforeinstallprompt` capturé (Chrome/Android)

### Tests

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 2.1 | **Clic sur Installer** | Cliquer sur bouton "Installer" | Prompt natif d'installation affiché | P0 | ☐ |
| 2.2 | **Accepter installation** | Accepter dans le prompt natif | App ajoutée à l'écran d'accueil, banner disparaît | P0 | ☐ |
| 2.3 | **Refuser installation** | Refuser dans le prompt natif | Banner disparaît, aucune erreur console | P1 | ☐ |
| 2.4 | **Clic sur Fermer (X)** | Cliquer sur bouton X | Banner disparaît avec animation slide-out | P0 | ☐ |
| 2.5 | **Banner ne réapparaît pas** | Après fermeture, naviguer sur autres pages | Banner reste masqué pour toute la session | P0 | ☐ |

### Critères d'Acceptation

```gherkin
Feature: PWA Installation Actions

  Scenario: Utilisateur installe l'application
    Given la bannière d'installation est visible
    When l'utilisateur clique sur "Installer"
    Then le prompt natif d'installation s'affiche
    When l'utilisateur accepte l'installation
    Then l'application est ajoutée à l'écran d'accueil
    And la bannière disparaît
    And l'événement 'appinstalled' est déclenché

  Scenario: Utilisateur ferme la bannière
    Given la bannière d'installation est visible
    When l'utilisateur clique sur le bouton fermer (X)
    Then la bannière disparaît avec une animation
    And la clé 'pwa-prompt-shown' est stockée en sessionStorage
    And la bannière ne réapparaît pas pendant cette session
```

---

## 3. Mode Standalone (App Installée)

### Préconditions
- [ ] Application installée sur l'appareil
- [ ] Ouvrir l'app depuis l'icône (pas depuis le navigateur)

### Tests

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 3.1 | **Détection mode standalone** | Ouvrir app installée | `matchMedia('(display-mode: standalone)')` retourne true | P0 | ☐ |
| 3.2 | **Banner non affiché** | Vérifier UI en mode standalone | Banner d'installation JAMAIS affiché | P0 | ☐ |
| 3.3 | **Navigation plein écran** | Naviguer dans l'app | Pas de barre d'adresse navigateur, header app complet | P1 | ☐ |
| 3.4 | **Retour après fermeture** | Fermer et rouvrir l'app | Dernière page visitée restaurée (ou dashboard) | P1 | ☐ |

### Critères d'Acceptation

```gherkin
Feature: PWA Standalone Mode

  Scenario: Application lancée en mode standalone
    Given l'utilisateur a installé l'application
    When il ouvre l'app depuis l'icône de l'écran d'accueil
    Then l'application s'ouvre en mode plein écran
    And la bannière d'installation n'est jamais affichée
    And la détection standalone retourne true
```

---

## 4. Session Storage & Persistence

### Préconditions
- [ ] Utilisateur non connecté ou connecté
- [ ] Application accessible en navigateur

### Tests

| # | Test | Action | Résultat Attendu | Priorité | Status |
|---|------|--------|------------------|----------|--------|
| 4.1 | **Clé session créée** | Fermer banner, inspecter sessionStorage | Clé `pwa-prompt-shown` = `'true'` | P1 | ☐ |
| 4.2 | **Persistance dans session** | Naviguer sur plusieurs pages | Banner reste masqué (sessionStorage persiste) | P1 | ☐ |
| 4.3 | **Reset nouvelle session** | Fermer navigateur, rouvrir | sessionStorage effacé, banner peut réapparaître | P1 | ☐ |
| 4.4 | **Non connecté = pas de banner** | Accéder sans être connecté | Banner jamais affiché (auth requis) | P0 | ☐ |

### Données de Test

| Clé SessionStorage | Valeur | Signification |
|--------------------|--------|---------------|
| `pwa-prompt-shown` | `'true'` | Banner déjà montré cette session |
| *(absente)* | - | Première visite, banner peut apparaître |

---

## 5. Tests par Plateforme

### 5.1 Android Chrome (P0)

| # | Test | Résultat Attendu | Status |
|---|------|------------------|--------|
| 5.1.1 | **beforeinstallprompt déclenché** | Événement capturé, banner affiché | ☐ |
| 5.1.2 | **Prompt natif Android** | Dialogue Material Design affiché | ☐ |
| 5.1.3 | **Ajout écran d'accueil** | Icône app créée sur home screen | ☐ |
| 5.1.4 | **Splash screen** | Splash SEIDO affiché au lancement | ☐ |

### 5.2 Desktop Chrome (P0)

| # | Test | Résultat Attendu | Status |
|---|------|------------------|--------|
| 5.2.1 | **beforeinstallprompt déclenché** | Événement capturé, banner affiché | ☐ |
| 5.2.2 | **Prompt natif Desktop** | Dialogue Chrome affiché | ☐ |
| 5.2.3 | **Installation comme app** | App visible dans lanceur d'apps | ☐ |
| 5.2.4 | **Fenêtre standalone** | Fenêtre sans barre d'adresse | ☐ |

### 5.3 iOS Safari (P1 - Limité)

| # | Test | Résultat Attendu | Status |
|---|------|------------------|--------|
| 5.3.1 | **Pas de beforeinstallprompt** | Événement non déclenché (limitation iOS) | ☐ |
| 5.3.2 | **Banner non affiché** | Banner SEIDO non affiché (canInstall=false) | ☐ |
| 5.3.3 | **Ajout manuel possible** | "Ajouter à l'écran d'accueil" via menu Share | ☐ |

---

## 6. Cas Négatifs & Edge Cases

### Tests

| # | Scénario Négatif | Action | Comportement Attendu | Status |
|---|------------------|--------|----------------------|--------|
| 6.1 | **HTTP (non HTTPS)** | Charger en HTTP | PWA non disponible, banner jamais affiché | ☐ |
| 6.2 | **Navigateur non compatible** | Firefox Mobile, IE | Pas de prompt, pas d'erreur console | ☐ |
| 6.3 | **Déjà installé + navigateur** | Ouvrir dans Chrome après install | Banner non affiché (standalone détecté) | ☐ |
| 6.4 | **Multiples onglets** | Ouvrir 3 onglets SEIDO | Banner affiché sur 1 seul onglet max | ☐ |
| 6.5 | **Logout pendant session** | Afficher banner, logout | Banner reste visible (pas de crash) | ☐ |
| 6.6 | **Réseau lent** | 3G simulé | Banner affiché normalement, pas de timeout | ☐ |

---

## 7. Accessibilité PWA Banner

### Tests

| # | Test | Action | Résultat Attendu | Status |
|---|------|--------|------------------|--------|
| 7.1 | **Navigation clavier** | Tab vers banner | Boutons Installer et X focusables | ☐ |
| 7.2 | **Contraste texte** | Vérifier contraste | Ratio ≥ 4.5:1 sur fond banner | ☐ |
| 7.3 | **Touch target** | Mesurer boutons | Boutons ≥ 44x44px (touch-friendly) | ☐ |
| 7.4 | **Screen reader** | VoiceOver/TalkBack | Banner annoncé, boutons labelisés | ☐ |

---

## 8. Performance PWA

### Tests

| # | Test | Métrique | Seuil | Status |
|---|------|----------|-------|--------|
| 8.1 | **Délai banner** | Temps avant affichage | 3000ms ± 100ms | ☐ |
| 8.2 | **Animation banner** | FPS animation slide | ≥ 60 FPS | ☐ |
| 8.3 | **Impact LCP** | LCP avec banner | < 2.5s | ☐ |
| 8.4 | **Taille bundle PWA** | JS contexte PWA | < 5KB gzip | ☐ |

---

## Résumé d'Exécution

### Compteur de Tests

| Section | Tests | Passés | Échoués |
|---------|-------|--------|---------|
| 1. Banner Affichage | 5 | ☐ /5 | ☐ |
| 2. Actions Installation | 5 | ☐ /5 | ☐ |
| 3. Mode Standalone | 4 | ☐ /4 | ☐ |
| 4. Session Storage | 4 | ☐ /4 | ☐ |
| 5. Tests Plateformes | 12 | ☐ /12 | ☐ |
| 6. Cas Négatifs | 6 | ☐ /6 | ☐ |
| 7. Accessibilité | 4 | ☐ /4 | ☐ |
| 8. Performance | 4 | ☐ /4 | ☐ |
| **TOTAL** | **44** | ☐ /44 | ☐ |

### Critères de Go/No-Go

| Résultat | Décision |
|----------|----------|
| **Sections 1-4 : 18/18** | ✅ GO - Fonctionnalités core OK |
| **< 16/18 core** | ❌ NO-GO - Bugs critiques PWA |

---

## Références

- **MDN PWA Guide** : [Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- **Web.dev PWA** : [What makes a good PWA](https://web.dev/pwa-checklist/)
- **Manifest** : `public/manifest.json`
- **Service Worker** : `public/sw.js`

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (44 tests) |

---

**Mainteneur** : Claude Code
**Tests** : 44 (18 core + 26 extended)
**Durée estimée** : 45-60 min (complet)
