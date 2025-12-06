# 🎨 Design System SEIDO - Introduction

> 📁 **Source de vérité :** `app/globals.css` contient tous les design tokens centralisés (couleurs OKLCH, spacing, shadows, fonts)

## Vue d'ensemble

Ce Design System définit les principes, composants et guidelines pour la plateforme **SEIDO** de gestion immobilière. Il garantit une expérience utilisateur cohérente, accessible et efficace pour tous les rôles : Admin, Gestionnaire, Locataire et Prestataire.

## 📖 Documents de Référence

> **📖 Guide de décisions UX/UI :** [ux-ui-decision-guide.md](./ux-ui-decision-guide.md)
>
> **👥 Personas :** [Gestionnaire](./persona-gestionnaire-unifie.md) | [Locataire](./persona-locataire.md) | [Prestataire](./persona-prestataire.md)

### Structure du Design System

| Document | Contenu |
|----------|---------|
| [01-colors.md](./01-colors.md) | Système de couleurs OKLCH |
| [02-typography.md](./02-typography.md) | Typographie et hiérarchie |
| [03-spacing.md](./03-spacing.md) | Système d'espacement 4px |
| [04-layouts.md](./04-layouts.md) | Grilles et layouts responsive |
| [05-components.md](./05-components.md) | Composants UI et métier |
| [06-icons.md](./06-icons.md) | Système d'icônes Lucide React |
| [07-guidelines.md](./07-guidelines.md) | Bonnes pratiques UX |

## 🛠️ Stack Technologique

| Technologie | Version | Usage |
|-------------|---------|-------|
| **Tailwind CSS** | v4 | Styling avec syntaxe moderne |
| **shadcn/ui** | - | 50+ composants UI |
| **Lucide React** | - | Icônes SVG optimisées |
| **next-themes** | v0.4.6 | Dark/Light mode |
| **Radix UI** | - | Primitives accessibles |

### Tailwind CSS v4 — Syntaxe Moderne

SEIDO utilise la nouvelle syntaxe Tailwind v4 :

```css
/* globals.css - Structure */
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-primary: var(--primary);
  --color-background: var(--background);
  /* ... tokens mappés vers CSS variables */
}
```

### Système de Couleurs OKLCH

Toutes les couleurs sont définies en **OKLCH** pour une meilleure précision perceptuelle :

```css
:root {
  --primary: oklch(0.5854 0.2041 277.1173);
  --background: oklch(0.9842 0.0034 247.8575);
  --foreground: oklch(0.2795 0.0368 260.0310);
  /* ... voir globals.css pour la liste complète */
}
```

## 🎯 Principes Fondamentaux

### 1. Mobile-First

> "80% du travail gestionnaire se fait sur mobile" — Thomas, persona Gestionnaire

- Design pour mobile d'abord, puis adaptation desktop
- Touch targets minimum 44px (`--header-touch-target`)
- Progressive disclosure pour la densité d'information

### 2. Modularité & Réutilisabilité

> "Créer une fois, utiliser partout"

**Avant de créer un composant :**
1. ✅ Vérifier si shadcn/ui a un composant similaire
2. ✅ Chercher dans `components/` si un composant existe déjà
3. ✅ Considérer l'extension d'un composant existant avec des props

**Anti-patterns à éviter :**
- ❌ Copier-coller un composant pour modification mineure
- ❌ Styles inline ou valeurs hardcodées
- ❌ Composant trop spécifique (ex: `ButtonForDashboardOnlyForAdmin`)

### 3. Accessibilité Inclusive (WCAG 2.1 AA)

- **Contraste minimum** : 4.5:1 pour texte normal
- **Navigation clavier** : Tous les éléments interactifs accessibles
- **ARIA labels** : Pour les lecteurs d'écran
- **Focus visible** : Indicateurs clairs

### 4. Performance

- **60fps** pour les animations (transform, opacity)
- **Skeleton screens** pour les chargements
- **Code splitting** pour le temps de chargement initial

## 👥 Design par Rôle

### 🔧 Admin — Efficacité & Contrôle
- Interface dense, maximum d'information
- Actions groupées, bulk operations
- Monitoring système, alertes

### 🏢 Gestionnaire — Clarté & Décision
- KPIs en évidence, insights business
- 60% bureau / 40% mobile
- 280 logements en moyenne à gérer

### 🏠 Locataire — Simplicité & Guidance
- Interface épurée, guidée pas à pas
- Mobile-first (29 ans, Millennial)
- Usage occasionnel (interventions)

### ⚡ Prestataire — Action & Terrain
- Mobile absolu (75% terrain)
- Actions rapides, gros boutons
- Informations essentielles uniquement

## 🔄 Workflow de Design

### Création de Composant

1. **Recherche** : Vérifier shadcn/ui et `components/`
2. **Design** : 3 versions avec demo page
3. **Validation** : Tests utilisateur
4. **Implémentation** : Version finale
5. **Documentation** : Mise à jour du Design System

### Tokens de Design

Tous les tokens sont centralisés dans `app/globals.css` :

```css
/* Spacing Dashboard */
--dashboard-padding-x-mobile: 1.25rem;
--dashboard-padding-x-desktop: 2.5rem;
--dashboard-section-gap: 2rem;

/* Header */
--header-height-mobile: 3.5rem;
--header-height-desktop: 4rem;
--header-touch-target: 2.75rem;

/* Content */
--content-max-width: 96rem;
```

### Classes BEM Disponibles

```css
/* Header */
.header, .header__container, .header__nav, .header__logo

/* Dashboard */
.dashboard, .dashboard__container, .dashboard__header

/* Layout */
.layout-padding, .layout-container, .content-max-width
```

## ✅ Checklist Avant Développement

- [ ] Lu le [guide UX décisionnel](./ux-ui-decision-guide.md)
- [ ] Identifié le persona cible
- [ ] Vérifié les composants existants (shadcn/ui, `components/`)
- [ ] Utilisé les tokens de `globals.css`
- [ ] Testé responsive (mobile, tablet, desktop)
- [ ] Validé accessibilité (contraste, keyboard, ARIA)
- [ ] Documenté le composant

## 🔗 Ressources Externes

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)
- [Material Design 3](https://m3.material.io)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Nielsen's 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)

---

**💡 Conseil :** Commencez toujours par lire le guide UX décisionnel et identifier le persona cible avant de designer.

**📋 Checklist :** Chaque composant doit utiliser les tokens de `globals.css`, être accessible WCAG 2.1 AA, et être documenté.
