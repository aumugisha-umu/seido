# Checklist Design System - SEIDO

> **Objectif** : Vérifier la cohérence visuelle selon le Design System SEIDO.
> **Source de vérité** : `app/globals.css` + `docs/design/`
> **Notation** : ✅ OK | ❌ Violation | ⚠️ Incohérent

---

## 1. Couleurs OKLCH

### 1.1 Variables CSS Obligatoires

Vérifier que toutes les pages utilisent exclusivement les CSS variables :

| Variable | Usage | Valeur OKLCH |
|----------|-------|--------------|
| `--primary` | Actions principales, liens | `oklch(0.5854 0.2041 277.1173)` |
| `--primary-foreground` | Texte sur primary | `oklch(1 0 0)` |
| `--secondary` | Actions secondaires | `oklch(0.9670 0.0029 264.5419)` |
| `--destructive` | Erreurs, suppressions | `oklch(0.6368 0.2078 25.3313)` |
| `--muted` | Texte secondaire | `oklch(0.9670 0.0029 264.5419)` |
| `--muted-foreground` | Texte désactivé | `oklch(0.5510 0.0234 264.3640)` |
| `--accent` | Highlights | `oklch(0.9670 0.0029 264.5419)` |
| `--background` | Fond page | `oklch(0.9842 0.0034 247.8575)` |
| `--foreground` | Texte principal | `oklch(0.2795 0.0368 260.0310)` |
| `--border` | Bordures | `oklch(0.8717 0.0093 258.3382)` |
| `--ring` | Focus | `oklch(0.5854 0.2041 277.1173)` |

### 1.2 Couleurs Fonctionnelles

| État | Classe Tailwind | Usage |
|------|-----------------|-------|
| Succès | `bg-emerald-500`, `text-emerald-700` | Validations, confirmations |
| Warning | `bg-amber-500`, `text-amber-700` | Alertes non-critiques |
| Erreur | `bg-red-100`, `text-red-800` | Erreurs, échecs |
| Info | `bg-blue-100`, `text-blue-800` | Informations |

### 1.3 Checklist Couleurs

| # | Vérification | Status | Page(s) concernée(s) |
|---|--------------|--------|----------------------|
| 1.3.1 | Aucun `#XXXXXX` hardcodé dans le code | ☐ | |
| 1.3.2 | Aucun `rgb()` ou `rgba()` hardcodé | ☐ | |
| 1.3.3 | Tous les boutons primary utilisent `bg-primary` | ☐ | |
| 1.3.4 | Tous les boutons destructive utilisent `bg-destructive` | ☐ | |
| 1.3.5 | Liens utilisent `text-primary` | ☐ | |
| 1.3.6 | Bordures utilisent `border-border` | ☐ | |
| 1.3.7 | Focus rings utilisent `ring-ring` | ☐ | |
| 1.3.8 | Dark mode fonctionne (si activé) | ☐ | |

### 1.4 Anti-Patterns à Détecter

```tsx
// ❌ MAUVAIS - Couleur hardcodée
<div style={{ backgroundColor: '#2563eb' }}>

// ❌ MAUVAIS - Classe Tailwind directe pour couleur brand
<button className="bg-blue-600">

// ✅ BON - Utilise variable CSS
<button className="bg-primary">

// ❌ MAUVAIS - Inline style
<p style={{ color: 'red' }}>Erreur</p>

// ✅ BON - Classe sémantique
<p className="text-destructive">Erreur</p>
```

---

## 2. Typographie

### 2.1 Familles de Police

| Police | Variable | Usage |
|--------|----------|-------|
| Inter | `font-sans` | UI, corps de texte |
| Merriweather | `font-serif` | Éditorial (si utilisé) |
| JetBrains Mono | `font-mono` | Code, données |

### 2.2 Hiérarchie des Titres

| Niveau | Classe Tailwind | Taille | Poids | Usage |
|--------|-----------------|--------|-------|-------|
| H1 | `text-2xl md:text-3xl lg:text-4xl` | 24-48px | `font-bold` | Titre de page |
| H2 | `text-xl md:text-2xl` | 20-24px | `font-semibold` | Section principale |
| H3 | `text-lg md:text-xl` | 18-20px | `font-semibold` | Sous-section |
| H4 | `text-base md:text-lg` | 16-18px | `font-medium` | Titre de carte |
| Body | `text-base` | 16px | `font-normal` | Texte standard |
| Small | `text-sm` | 14px | `font-normal` | Métadonnées |
| Caption | `text-xs` | 12px | `font-normal` | Labels, timestamps |

### 2.3 Checklist Typographie

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 2.3.1 | H1 jamais plus petit que H2 | ☐ | |
| 2.3.2 | Une seule H1 par page | ☐ | |
| 2.3.3 | Hiérarchie respectée (H1 > H2 > H3) | ☐ | |
| 2.3.4 | Line-height minimum 1.5 pour texte | ☐ | |
| 2.3.5 | Pas de font-size inline | ☐ | |
| 2.3.6 | Taille minimum 12px (text-xs) | ☐ | |
| 2.3.7 | Responsive: titres s'adaptent | ☐ | |
| 2.3.8 | Police Inter chargée correctement | ☐ | |

---

## 3. Spacing (Grille 4px)

### 3.1 Échelle de Spacing

| Token | Valeur | Pixel | Usage |
|-------|--------|-------|-------|
| `space-1` | 0.25rem | 4px | Gap minimal |
| `space-2` | 0.5rem | 8px | Padding interne compact |
| `space-3` | 0.75rem | 12px | Spacing petit |
| `space-4` | 1rem | 16px | Padding standard |
| `space-5` | 1.25rem | 20px | Mobile padding |
| `space-6` | 1.5rem | 24px | Gap entre éléments |
| `space-8` | 2rem | 32px | Section gap |
| `space-10` | 2.5rem | 40px | Desktop padding |
| `space-12` | 3rem | 48px | Large section gap |

### 3.2 Variables Dashboard

| Variable CSS | Usage |
|--------------|-------|
| `--dashboard-padding-x-mobile` | 1.25rem (20px) |
| `--dashboard-padding-x-desktop` | 2.5rem (40px) |
| `--dashboard-section-gap` | 2rem (32px) |
| `--dashboard-header-gap` | 1rem (16px) |
| `--header-touch-target` | 2.75rem (44px) |

### 3.3 Checklist Spacing

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 3.3.1 | Pas de valeurs arbitraires `p-[13px]` | ☐ | |
| 3.3.2 | Padding cohérent entre pages similaires | ☐ | |
| 3.3.3 | Gap entre sections = space-8 (32px) | ☐ | |
| 3.3.4 | Padding mobile ≤ padding desktop | ☐ | |
| 3.3.5 | Touch targets ≥ 44px sur mobile | ☐ | |
| 3.3.6 | Margin entre éléments de liste cohérent | ☐ | |
| 3.3.7 | Cards: padding interne uniforme | ☐ | |

---

## 4. Composants shadcn/ui

### 4.1 Composants Utilisés

Vérifier l'utilisation correcte des composants :

| Composant | Usage | Fichier |
|-----------|-------|---------|
| `Button` | Actions | `components/ui/button.tsx` |
| `Card` | Conteneurs | `components/ui/card.tsx` |
| `Input` | Champs texte | `components/ui/input.tsx` |
| `Select` | Sélecteurs | `components/ui/select.tsx` |
| `Dialog` | Modales | `components/ui/dialog.tsx` |
| `Toast` | Notifications | `components/ui/toast.tsx` |
| `Badge` | Labels | `components/ui/badge.tsx` |
| `Table` | Tableaux | `components/ui/table.tsx` |
| `Tabs` | Onglets | `components/ui/tabs.tsx` |
| `Tooltip` | Info-bulles | `components/ui/tooltip.tsx` |

### 4.2 Variants de Boutons

| Variant | Usage | Apparence |
|---------|-------|-----------|
| `default` | Action principale | Primary bg |
| `secondary` | Action secondaire | Secondary bg |
| `destructive` | Suppression | Red bg |
| `outline` | Tertiaire | Border only |
| `ghost` | Subtil | No background |
| `link` | Lien | Text only |

### 4.3 Checklist Composants

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 4.3.1 | Buttons: variants cohérents par action | ☐ | |
| 4.3.2 | Cards: shadow uniforme (shadow-sm ou shadow-md) | ☐ | |
| 4.3.3 | Forms: tous les inputs utilisent shadcn/ui | ☐ | |
| 4.3.4 | Selects: même style partout | ☐ | |
| 4.3.5 | Modales: utilisent Dialog shadcn | ☐ | |
| 4.3.6 | Toasts: utilisent Sonner/Toast shadcn | ☐ | |
| 4.3.7 | Badges: variants sémantiques | ☐ | |
| 4.3.8 | Tables: header sticky si longue | ☐ | |
| 4.3.9 | Pas de composants custom dupliquant shadcn | ☐ | |

---

## 5. Icônes (Lucide React)

### 5.1 Règles d'Utilisation

| Règle | Détail |
|-------|--------|
| Bibliothèque | Lucide React uniquement |
| Taille par défaut | 16-24px selon contexte |
| Couleur | `currentColor` (hérite du texte) |
| Accessibility | `aria-hidden="true"` si décoratif |

### 5.2 Icônes Fréquentes

| Action | Icône | Import |
|--------|-------|--------|
| Ajouter | `Plus` | `lucide-react` |
| Modifier | `Pencil` | `lucide-react` |
| Supprimer | `Trash2` | `lucide-react` |
| Rechercher | `Search` | `lucide-react` |
| Fermer | `X` | `lucide-react` |
| Menu | `Menu` | `lucide-react` |
| Notifications | `Bell` | `lucide-react` |
| Paramètres | `Settings` | `lucide-react` |
| Utilisateur | `User` | `lucide-react` |
| Immeuble | `Building` | `lucide-react` |
| Intervention | `Wrench` | `lucide-react` |

### 5.3 Checklist Icônes

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 5.3.1 | Toutes icônes de Lucide React | ☐ | |
| 5.3.2 | Pas d'icônes inline SVG custom | ☐ | |
| 5.3.3 | Taille cohérente dans boutons | ☐ | |
| 5.3.4 | Icônes + labels pour accessibilité | ☐ | |
| 5.3.5 | Même icône = même action partout | ☐ | |

---

## 6. Layouts Responsive

### 6.1 Breakpoints

| Breakpoint | Largeur | Classe Tailwind |
|------------|---------|-----------------|
| Mobile S | 320px | default |
| Mobile M | 375px | default |
| Mobile L | 425px | default |
| Tablet | 640px | `sm:` |
| Laptop | 768px | `md:` |
| Desktop | 1024px | `lg:` |
| Large | 1280px | `xl:` |
| XL | 1536px | `2xl:` |

### 6.2 Patterns de Layout

| Pattern | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Sidebar | Drawer | Drawer | Fixed sidebar |
| Grid | 1 col | 2 cols | 3-4 cols |
| Cards | Stack | 2 cols | 3 cols |
| Table | Scroll H | Scroll H | Full width |
| Forms | Stack | Stack | 2 cols |

### 6.3 Checklist Responsive

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 6.3.1 | Mobile-first: styles par défaut pour mobile | ☐ | |
| 6.3.2 | Pas de scroll horizontal sur mobile | ☐ | |
| 6.3.3 | Touch targets ≥ 44px sur mobile | ☐ | |
| 6.3.4 | Texte lisible sans zoom | ☐ | |
| 6.3.5 | Images responsive | ☐ | |
| 6.3.6 | Sidebar collapse < 1024px | ☐ | |
| 6.3.7 | Tables scroll ou stack sur mobile | ☐ | |
| 6.3.8 | Modales full-screen sur mobile | ☐ | |

---

## 7. UX par Rôle

### 7.1 Gestionnaire (70% users)

| # | Règle UX | Status | Page(s) |
|---|----------|--------|---------|
| 7.1.1 | Dashboard: urgences en premier | ☐ | |
| 7.1.2 | Filtres sticky sur listes longues | ☐ | |
| 7.1.3 | Actions bulk visibles | ☐ | |
| 7.1.4 | KPIs au-dessus de la fold | ☐ | |
| 7.1.5 | Navigation rapide entre sections | ☐ | |

### 7.2 Prestataire

| # | Règle UX | Status | Page(s) |
|---|----------|--------|---------|
| 7.2.1 | Gros boutons d'action | ☐ | |
| 7.2.2 | Infos essentielles visibles | ☐ | |
| 7.2.3 | Mobile-first design | ☐ | |
| 7.2.4 | Formulaires simplifiés | ☐ | |

### 7.3 Locataire

| # | Règle UX | Status | Page(s) |
|---|----------|--------|---------|
| 7.3.1 | Wizard simplifié | ☐ | |
| 7.3.2 | Couleurs rassurantes (emerald) | ☐ | |
| 7.3.3 | Statut intervention visible | ☐ | |
| 7.3.4 | Feedback positif après actions | ☐ | |

### 7.4 Admin

| # | Règle UX | Status | Page(s) |
|---|----------|--------|---------|
| 7.4.1 | Interface dense | ☐ | |
| 7.4.2 | Données tabulaires | ☐ | |
| 7.4.3 | Actions bulk | ☐ | |
| 7.4.4 | Logs visibles | ☐ | |

### 7.5 Proprietaire

| # | Règle UX | Status | Page(s) |
|---|----------|--------|---------|
| 7.5.1 | Interface lecture seule claire | ☐ | Dashboard, Biens, Interventions |
| 7.5.2 | **Pas de boutons création/modification** | ☐ | Toutes pages |
| 7.5.3 | Vue consolidée du patrimoine | ☐ | Dashboard |
| 7.5.4 | Statistiques et KPIs visibles | ☐ | Dashboard |
| 7.5.5 | Navigation intuitive entre biens | ☐ | Biens |
| 7.5.6 | Détails interventions accessibles | ☐ | Interventions |
| 7.5.7 | Coûts et devis consultables | ☐ | Interventions |
| 7.5.8 | Interface professionnelle (confiance) | ☐ | Toutes pages |

---

## 8. États UI

### 8.1 Loading States

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 8.1.1 | Skeleton loaders pour contenu | ☐ | |
| 8.1.2 | Spinner pour actions | ☐ | |
| 8.1.3 | Button disabled + loading pendant submit | ☐ | |
| 8.1.4 | Progress bar pour uploads | ☐ | |

### 8.2 Empty States

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 8.2.1 | Message explicatif si liste vide | ☐ | |
| 8.2.2 | Illustration ou icône | ☐ | |
| 8.2.3 | CTA pour créer premier élément | ☐ | |

### 8.3 Error States

| # | Vérification | Status | Page(s) |
|---|--------------|--------|---------|
| 8.3.1 | Message d'erreur clair | ☐ | |
| 8.3.2 | Couleur destructive | ☐ | |
| 8.3.3 | Action de retry si applicable | ☐ | |
| 8.3.4 | Pas de stack trace visible | ☐ | |

---

## 9. Outils de Vérification

### 9.1 Recherche de Violations

```bash
# Rechercher couleurs hardcodées
grep -r "#[0-9a-fA-F]\{6\}" --include="*.tsx" app/ components/

# Rechercher rgb/rgba
grep -r "rgb(" --include="*.tsx" app/ components/

# Rechercher inline styles
grep -r "style={{" --include="*.tsx" app/ components/

# Rechercher spacing arbitraire
grep -rE "p-\[|m-\[|gap-\[" --include="*.tsx" app/ components/
```

### 9.2 Extensions Recommandées

- **Tailwind CSS IntelliSense** - Autocomplete et validation
- **axe DevTools** - Accessibilité
- **Lighthouse** - Performance et best practices

---

## Résumé des Violations

| Catégorie | Violations | Pages Affectées |
|-----------|------------|-----------------|
| Couleurs | | |
| Typographie | | |
| Spacing | | |
| Composants | | |
| Icônes | | |
| Responsive | | |
| **TOTAL** | | |

---

**Testeur** : _________________
**Date** : _________________
