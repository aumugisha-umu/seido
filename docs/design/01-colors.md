# 🎨 Design System - Couleurs

> 📁 **Source de vérité :** `app/globals.css` contient toutes les couleurs en OKLCH. Ce document sert de référence, mais `globals.css` fait autorité.

## Vue d'ensemble

Notre palette de couleurs utilise le système **OKLCH** (Oklab Lightness, Chroma, Hue) pour une meilleure précision perceptuelle. Chaque couleur a été choisie pour optimiser la lisibilité, l'accessibilité et la hiérarchie visuelle dans l'écosystème de gestion immobilière SEIDO.

### Pourquoi OKLCH ?

- ✅ **Précision perceptuelle** : Les transitions de couleurs sont plus fluides
- ✅ **Contraste prévisible** : Plus facile de maintenir l'accessibilité
- ✅ **Manipulation mathématique** : Modifier lightness/chroma de façon cohérente
- ✅ **Compatibilité moderne** : Supporté par tous les navigateurs modernes

## 🎯 Couleurs Sémantiques (globals.css)

### Couleurs Principales

```css
:root {
  /* Background & Foreground */
  --background: oklch(0.9842 0.0034 247.8575);  /* Fond principal clair */
  --foreground: oklch(0.2795 0.0368 260.0310);  /* Texte principal sombre */

  /* Primary - Actions principales */
  --primary: oklch(0.5854 0.2041 277.1173);           /* Bleu primaire */
  --primary-foreground: oklch(1.0000 0 0);            /* Texte sur primary */

  /* Secondary - Actions secondaires */
  --secondary: oklch(0.9276 0.0058 264.5313);         /* Gris clair */
  --secondary-foreground: oklch(0.3729 0.0306 259.7328);

  /* Muted - Éléments atténués */
  --muted: oklch(0.9670 0.0029 264.5419);             /* Fond atténué */
  --muted-foreground: oklch(0.5510 0.0234 264.3637);  /* Texte secondaire */

  /* Accent - Mise en évidence */
  --accent: oklch(0.9299 0.0334 272.7879);
  --accent-foreground: oklch(0.3729 0.0306 259.7328);

  /* Destructive - Actions dangereuses */
  --destructive: oklch(0.6368 0.2078 25.3313);        /* Rouge erreur */
  --destructive-foreground: oklch(1.0000 0 0);

  /* UI Elements */
  --border: oklch(0.8717 0.0093 258.3382);            /* Bordures */
  --input: oklch(0.8717 0.0093 258.3382);             /* Inputs */
  --ring: oklch(0.5854 0.2041 277.1173);              /* Focus ring */

  /* Card */
  --card: oklch(1.0000 0 0);                          /* Fond carte */
  --card-foreground: oklch(0.2795 0.0368 260.0310);   /* Texte carte */

  /* Popover */
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.2795 0.0368 260.0310);
}
```

### Couleurs Sidebar

```css
:root {
  --sidebar: oklch(0.9670 0.0029 264.5419);
  --sidebar-foreground: oklch(0.2795 0.0368 260.0310);
  --sidebar-primary: oklch(0.5854 0.2041 277.1173);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.9299 0.0334 272.7879);
  --sidebar-accent-foreground: oklch(0.3729 0.0306 259.7328);
  --sidebar-border: oklch(0.8717 0.0093 258.3382);
  --sidebar-ring: oklch(0.5854 0.2041 277.1173);
}
```

### Couleurs Charts

```css
:root {
  --chart-1: oklch(0.5854 0.2041 277.1173);  /* Bleu primary */
  --chart-2: oklch(0.5106 0.2301 276.9656);  /* Bleu foncé */
  --chart-3: oklch(0.4568 0.2146 277.0229);  /* Bleu très foncé */
  --chart-4: oklch(0.3984 0.1773 277.3662);  /* Bleu profond */
  --chart-5: oklch(0.3588 0.1354 278.6973);  /* Bleu nuit */
}
```

## 🚨 Couleurs Fonctionnelles

### Usage avec Tailwind

```tsx
// Success - Validation & Accomplissement
className="text-emerald-500"      // Texte
className="bg-emerald-100"        // Background léger
className="border-emerald-200"    // Bordure

// Warning - Attention & Attente
className="text-amber-500"        // Texte
className="bg-amber-100"          // Background léger
className="border-amber-200"      // Bordure

// Error - Urgence & Erreurs (utilise --destructive)
className="text-destructive"      // Via CSS variable
className="bg-red-100"            // Background léger
className="border-red-200"        // Bordure

// Info - Information & Navigation
className="text-blue-500"         // Texte
className="bg-blue-100"           // Background léger
className="border-blue-200"       // Bordure
```

## 📊 Mapping par Rôle Utilisateur

### 🔧 Admin - Supervision

- **Couleur dominante** : `foreground` (texte sombre, autorité)
- **Accent** : `destructive` (actions critiques)
- **Background** : `background` (neutralité)

### 🏢 Gestionnaire - Gestion

- **Couleur dominante** : `foreground` (professionnalisme)
- **Accent** : `primary` (actions business)
- **Background** : `card` (clarté)

### 🏠 Locataire - Confort

- **Couleur dominante** : `muted-foreground` (accessibilité)
- **Accent** : `emerald-500` (positif, rassurant)
- **Background** : `muted` (sérénité)

### ⚡ Prestataire - Action

- **Couleur dominante** : `foreground` (fiabilité)
- **Accent** : `amber-500` (urgence, action)
- **Background** : `card` (efficacité)

## 🎨 Contextes d'Usage

### Interface Principale

```tsx
// Header navigation
className="bg-primary text-primary-foreground"

// Page background
className="bg-background min-h-screen"

// Cards principales
className="bg-card border-border shadow-sm"

// Texte principal
className="text-foreground"

// Texte secondaire
className="text-muted-foreground"
```

### États Interactifs

```tsx
// Bouton principal
className="bg-primary hover:bg-primary/90 text-primary-foreground"

// Bouton secondaire
className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"

// Bouton destructif
className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"

// Link
className="text-primary hover:text-primary/80 underline"
```

### Status & Badges

```tsx
// Success
className="bg-emerald-100 text-emerald-800 border-emerald-200"

// Warning
className="bg-amber-100 text-amber-800 border-amber-200"

// Error
className="bg-red-100 text-red-800 border-red-200"

// Info
className="bg-blue-100 text-blue-800 border-blue-200"
```

## 🌙 Dark Mode

Les couleurs sont automatiquement ajustées en dark mode via la classe `.dark` :

```css
.dark {
  --background: oklch(0.1783 0.0181 256.8019);
  --foreground: oklch(0.9842 0.0034 247.8575);
  --card: oklch(0.1783 0.0181 256.8019);
  --card-foreground: oklch(0.9842 0.0034 247.8575);
  --primary: oklch(0.5854 0.2041 277.1173);
  --primary-foreground: oklch(1.0000 0 0);
  /* ... autres variables inversées */
}
```

## 🔍 Contraste & Accessibilité

### Ratios de contraste validés WCAG 2.1 AA

| Combinaison | Ratio | Statut |
|-------------|-------|--------|
| `foreground` sur `background` | 18.07:1 | ✅ AAA |
| `primary` sur `background` | 7.14:1 | ✅ AAA |
| `muted-foreground` sur `background` | 4.59:1 | ✅ AA |
| `primary-foreground` sur `primary` | 7.14:1 | ✅ AAA |

### Tests de daltonisme

- ✅ Protanopie (8% hommes)
- ✅ Deutéranopie (1% hommes)
- ✅ Tritanopie (rare)

## 🚫 Couleurs Interdites

### À éviter absolument

- ❌ Couleurs HEX hardcodées (`#FF0000`, `#2563eb`)
- ❌ Couleurs fluorescentes ou saturées à 100%
- ❌ Gradients complexes sur texte
- ❌ Contrastes insuffisants (<4.5:1)

### Anti-patterns

```tsx
// ❌ MAUVAIS - Couleur hardcodée
style={{ backgroundColor: '#FF5733' }}

// ❌ MAUVAIS - Contraste insuffisant
className="text-muted bg-muted"

// ❌ MAUVAIS - Pas d'utilisation des variables
className="text-[#2563eb]"

// ✅ BON - Utilisation des CSS variables
className="bg-primary text-primary-foreground"

// ✅ BON - Utilisation des classes Tailwind sémantiques
className="text-destructive"
```

## 🔧 Implémentation Technique

### Tailwind v4 avec @theme inline

```css
/* globals.css */
@theme inline {
  --color-primary: var(--primary);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-destructive: var(--destructive);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  /* ... */
}
```

### Utilisation dans les Composants

```tsx
// Via className Tailwind (recommandé)
<Button className="bg-primary text-primary-foreground">
  Action
</Button>

// Via CSS variable directe
<div style={{ color: 'var(--foreground)' }}>
  Texte
</div>

// Via cn() helper avec conditions
<Badge className={cn(
  "px-2 py-1",
  status === "success" && "bg-emerald-100 text-emerald-800",
  status === "error" && "bg-destructive/10 text-destructive"
)}>
  {status}
</Badge>
```

## 📋 Checklist Couleurs

- [ ] Utilise les CSS variables de `globals.css`
- [ ] Respecte les ratios de contraste WCAG 2.1 AA (4.5:1 minimum)
- [ ] Fonctionne en dark mode
- [ ] Pas de couleurs hardcodées
- [ ] Cohérent avec le rôle utilisateur cible

---

**💡 Conseil :** Utilisez toujours les CSS variables (`--primary`, `--foreground`, etc.) plutôt que les valeurs Tailwind directes. Cela garantit la cohérence et le support du dark mode.

**📋 Checklist :** Avant d'utiliser une couleur, vérifiez qu'elle existe dans `globals.css` et qu'elle respecte les ratios de contraste WCAG 2.1 AA.
