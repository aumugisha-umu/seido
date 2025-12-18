# Checklist Accessibilité - SEIDO

> **Standard** : WCAG 2.1 Niveau AA
> **Objectif** : Garantir l'accessibilité pour tous les utilisateurs
> **Outils** : axe DevTools, Lighthouse, NVDA (optionnel)

---

## 1. Perceivable (Perceptible)

### 1.1 Contraste des Couleurs

**Exigence** : Ratio minimum 4.5:1 pour texte normal, 3:1 pour grand texte (≥18px bold ou ≥24px)

| # | Test | Status | Pages |
|---|------|--------|-------|
| 1.1.1 | Texte principal sur fond blanc ≥ 4.5:1 | ☐ | |
| 1.1.2 | Texte secondaire (muted) ≥ 4.5:1 | ☐ | |
| 1.1.3 | Liens sur fond blanc ≥ 4.5:1 | ☐ | |
| 1.1.4 | Texte sur bouton primary ≥ 4.5:1 | ☐ | |
| 1.1.5 | Placeholder text ≥ 4.5:1 | ☐ | |
| 1.1.6 | Badges lisibles | ☐ | |
| 1.1.7 | Toasts lisibles | ☐ | |
| 1.1.8 | Dark mode contraste (si activé) | ☐ | |

**Outils** :
- WebAIM Contrast Checker : https://webaim.org/resources/contrastchecker/
- axe DevTools extension

### 1.2 Images et Médias

| # | Test | Status | Pages |
|---|------|--------|-------|
| 1.2.1 | Toutes images ont `alt` text | ☐ | |
| 1.2.2 | Images décoratives : `alt=""` | ☐ | |
| 1.2.3 | Images informatives : alt descriptif | ☐ | |
| 1.2.4 | Icônes décoratives : `aria-hidden="true"` | ☐ | |
| 1.2.5 | Icônes fonctionnelles : `aria-label` | ☐ | |
| 1.2.6 | Logo : alt="SEIDO" | ☐ | |

### 1.3 Formulaires

| # | Test | Status | Pages |
|---|------|--------|-------|
| 1.3.1 | Tous les inputs ont un `<label>` | ☐ | |
| 1.3.2 | Labels liés via `htmlFor` / `id` | ☐ | |
| 1.3.3 | Champs requis marqués visuellement | ☐ | |
| 1.3.4 | Champs requis : `aria-required="true"` | ☐ | |
| 1.3.5 | Erreurs liées via `aria-describedby` | ☐ | |
| 1.3.6 | Erreurs annoncées : `aria-invalid="true"` | ☐ | |
| 1.3.7 | Placeholder ≠ seul label | ☐ | |
| 1.3.8 | Instructions visibles avant input | ☐ | |

### 1.4 Structure du Contenu

| # | Test | Status | Pages |
|---|------|--------|-------|
| 1.4.1 | Une seule `<h1>` par page | ☐ | |
| 1.4.2 | Hiérarchie des titres (h1 > h2 > h3) | ☐ | |
| 1.4.3 | Pas de saut de niveau (h1 puis h3) | ☐ | |
| 1.4.4 | Listes utilisent `<ul>` ou `<ol>` | ☐ | |
| 1.4.5 | Tables ont `<th>` avec scope | ☐ | |

---

## 2. Operable (Utilisable)

### 2.1 Navigation Clavier

| # | Test | Status | Pages |
|---|------|--------|-------|
| 2.1.1 | Tous éléments interactifs focusables | ☐ | |
| 2.1.2 | Tab : ordre logique (gauche→droite, haut→bas) | ☐ | |
| 2.1.3 | Shift+Tab : navigation inverse | ☐ | |
| 2.1.4 | Enter : active boutons et liens | ☐ | |
| 2.1.5 | Space : active boutons, checkboxes | ☐ | |
| 2.1.6 | Escape : ferme modales, dropdowns | ☐ | |
| 2.1.7 | Arrows : navigation dans menus, tabs | ☐ | |
| 2.1.8 | Pas de piège au clavier | ☐ | |
| 2.1.9 | Skip link vers contenu principal | ☐ | |

### 2.2 Focus Visible

| # | Test | Status | Pages |
|---|------|--------|-------|
| 2.2.1 | Focus visible sur tous éléments interactifs | ☐ | |
| 2.2.2 | Focus ring cohérent (couleur, taille) | ☐ | |
| 2.2.3 | Focus ring contraste suffisant | ☐ | |
| 2.2.4 | Pas de `outline: none` sans alternative | ☐ | |
| 2.2.5 | Focus dans modales reste dans modal | ☐ | |
| 2.2.6 | Focus retourne après fermeture modal | ☐ | |

### 2.3 Touch Targets (Mobile)

| # | Test | Status | Pages |
|---|------|--------|-------|
| 2.3.1 | Boutons ≥ 44x44px | ☐ | |
| 2.3.2 | Liens ≥ 44x44px (ou padding suffisant) | ☐ | |
| 2.3.3 | Checkboxes/radios ≥ 44x44px zone cliquable | ☐ | |
| 2.3.4 | Espacement entre targets ≥ 8px | ☐ | |
| 2.3.5 | Menu items hauteur suffisante | ☐ | |
| 2.3.6 | Close buttons (X) facilement cliquables | ☐ | |

### 2.4 Timing et Mouvement

| # | Test | Status | Pages |
|---|------|--------|-------|
| 2.4.1 | Pas d'auto-refresh sans avertissement | ☐ | |
| 2.4.2 | Toasts : durée suffisante (≥5s) | ☐ | |
| 2.4.3 | Animations : `prefers-reduced-motion` respecté | ☐ | |
| 2.4.4 | Pas de contenu clignotant | ☐ | |
| 2.4.5 | Session timeout : avertissement avant | ☐ | |

---

## 3. Understandable (Compréhensible)

### 3.1 Langue et Texte

| # | Test | Status | Pages |
|---|------|--------|-------|
| 3.1.1 | `<html lang="fr">` défini | ☐ | |
| 3.1.2 | Texte en français correct | ☐ | |
| 3.1.3 | Abréviations expliquées ou évitées | ☐ | |
| 3.1.4 | Jargon technique minimal | ☐ | |
| 3.1.5 | Instructions claires et concises | ☐ | |

### 3.2 Messages d'Erreur

| # | Test | Status | Pages |
|---|------|--------|-------|
| 3.2.1 | Erreurs décrivent le problème | ☐ | |
| 3.2.2 | Erreurs suggèrent une solution | ☐ | |
| 3.2.3 | Erreurs près du champ concerné | ☐ | |
| 3.2.4 | Erreurs en rouge avec icône | ☐ | |
| 3.2.5 | Focus sur premier champ en erreur | ☐ | |
| 3.2.6 | Erreurs persistantes jusqu'à correction | ☐ | |

### 3.3 Navigation Cohérente

| # | Test | Status | Pages |
|---|------|--------|-------|
| 3.3.1 | Navigation principale même position | ☐ | |
| 3.3.2 | Éléments similaires même apparence | ☐ | |
| 3.3.3 | Liens même style partout | ☐ | |
| 3.3.4 | Boutons même style par type | ☐ | |
| 3.3.5 | Breadcrumbs cohérents | ☐ | |

### 3.4 Feedback Utilisateur

| # | Test | Status | Pages |
|---|------|--------|-------|
| 3.4.1 | Confirmation après actions importantes | ☐ | |
| 3.4.2 | Loading state pendant chargement | ☐ | |
| 3.4.3 | Success message après soumission | ☐ | |
| 3.4.4 | État actuel de l'élément visible | ☐ | |

---

## 4. Robust (Robuste)

### 4.1 HTML Sémantique

| # | Test | Status | Pages |
|---|------|--------|-------|
| 4.1.1 | `<header>` pour en-tête | ☐ | |
| 4.1.2 | `<nav>` pour navigation | ☐ | |
| 4.1.3 | `<main>` pour contenu principal | ☐ | |
| 4.1.4 | `<footer>` pour pied de page | ☐ | |
| 4.1.5 | `<aside>` pour sidebar | ☐ | |
| 4.1.6 | `<article>` pour contenu autonome | ☐ | |
| 4.1.7 | `<section>` avec heading | ☐ | |
| 4.1.8 | `<button>` pour actions (pas `<div>`) | ☐ | |
| 4.1.9 | `<a>` pour liens (pas `<button>`) | ☐ | |

### 4.2 ARIA (Accessible Rich Internet Applications)

| # | Test | Status | Pages |
|---|------|--------|-------|
| 4.2.1 | Modales : `role="dialog"` | ☐ | |
| 4.2.2 | Modales : `aria-modal="true"` | ☐ | |
| 4.2.3 | Modales : `aria-labelledby` | ☐ | |
| 4.2.4 | Alerts : `role="alert"` | ☐ | |
| 4.2.5 | Navigation : `role="navigation"` ou `<nav>` | ☐ | |
| 4.2.6 | Tabs : `role="tablist"`, `role="tab"`, `role="tabpanel"` | ☐ | |
| 4.2.7 | Menus : `role="menu"`, `role="menuitem"` | ☐ | |
| 4.2.8 | Loading : `aria-busy="true"` | ☐ | |
| 4.2.9 | Expanded : `aria-expanded` pour accordéons | ☐ | |
| 4.2.10 | Selected : `aria-selected` pour tabs | ☐ | |
| 4.2.11 | Live regions : `aria-live` pour updates | ☐ | |

### 4.3 Compatibilité

| # | Test | Status |
|---|------|--------|
| 4.3.1 | HTML valide (pas d'erreurs W3C) | ☐ |
| 4.3.2 | Fonctionne sans JavaScript (dégradation gracieuse) | ☐ |
| 4.3.3 | Fonctionne avec zoom 200% | ☐ |
| 4.3.4 | Fonctionne en mode haut contraste | ☐ |

---

## 5. Tests Automatisés

### 5.1 Outils à Utiliser

| Outil | Type | Commande/Usage |
|-------|------|----------------|
| axe DevTools | Extension Chrome | F12 > axe tab |
| Lighthouse | Chrome intégré | F12 > Lighthouse > Accessibility |
| WAVE | Extension | https://wave.webaim.org/ |
| Pa11y | CLI | `npx pa11y https://localhost:3000` |

### 5.2 Tests par Page

Exécuter Lighthouse Accessibility sur chaque page :

| Page | Score | Issues | Corrigé |
|------|-------|--------|---------|
| `/` | /100 | | ☐ |
| `/auth/login` | /100 | | ☐ |
| `/gestionnaire/dashboard` | /100 | | ☐ |
| `/gestionnaire/biens` | /100 | | ☐ |
| `/gestionnaire/interventions` | /100 | | ☐ |
| `/prestataire/dashboard` | /100 | | ☐ |
| `/locataire/dashboard` | /100 | | ☐ |
| `/admin/dashboard` | /100 | | ☐ |

**Objectif** : Score ≥ 90 sur toutes les pages

---

## 6. Tests Manuels Screen Reader (Optionnel)

### 6.1 Test avec NVDA (Windows) ou VoiceOver (Mac)

| # | Test | Status |
|---|------|--------|
| 6.1.1 | Page title annoncé correctement | ☐ |
| 6.1.2 | Headings navigables | ☐ |
| 6.1.3 | Liens annoncés avec destination | ☐ |
| 6.1.4 | Boutons annoncés avec action | ☐ |
| 6.1.5 | Formulaires navigables | ☐ |
| 6.1.6 | Erreurs annoncées | ☐ |
| 6.1.7 | Modales annoncées | ☐ |
| 6.1.8 | Tables navigables | ☐ |

---

## 7. Checklist Rapide par Page

Pour chaque page, vérifier rapidement :

```
☐ Tab through : navigation complète au clavier
☐ Focus visible : ring visible à chaque étape
☐ Alt text : images et icônes
☐ Labels : tous les formulaires
☐ Headings : structure logique
☐ Contrast : texte lisible
☐ Touch : targets ≥ 44px sur mobile
☐ Lighthouse : score ≥ 90
```

---

## Résumé des Issues

| Catégorie | Critical | Major | Minor |
|-----------|----------|-------|-------|
| Perceivable | | | |
| Operable | | | |
| Understandable | | | |
| Robust | | | |
| **TOTAL** | | | |

---

## Ressources

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

**Testeur** : _________________
**Date** : _________________
**Score Global Lighthouse** : _____/100
