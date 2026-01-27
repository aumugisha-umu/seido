---
paths:
  - "components/**"
  - "app/**/page.tsx"
  - "app/**/layout.tsx"
---

# Règles UI - SEIDO

> Ces règles s'appliquent quand tu crées ou modifies des composants.

## Avant de Créer un Composant

1. **Vérifier shadcn/ui** : https://ui.shadcn.com/docs/components (50+ composants)
2. **Chercher l'existant** : `components/ui/` et `components/`
3. **Lire le persona** concerné : `docs/design/persona-[role].md`
4. **Consulter** : `docs/design/ux-ui-decision-guide.md`

## Design Tokens (app/globals.css)

```css
/* Couleurs OKLCH - Source de vérité */
--primary, --primary-foreground
--secondary, --secondary-foreground
--background, --foreground
--muted, --muted-foreground
--accent, --accent-foreground
--destructive, --destructive-foreground

/* Spacing dashboard */
--dashboard-padding-sm   /* 12px */
--dashboard-padding-md   /* 16px */
--dashboard-padding-lg   /* 24px */

/* Header */
--header-height          /* 64px */

/* Border radius */
--radius                 /* 0.5rem */
```

## Contraintes Mobile-First

| Critère | Valeur |
|---------|--------|
| Touch targets | minimum 44px |
| Breakpoints | sm: 640px, md: 768px, lg: 1024px, xl: 1280px |
| Mobile menus | Bottom sheets > dropdowns |
| Formulaires | 1 colonne sur mobile |

## Accessibilité (WCAG 2.1 AA)

- `aria-label` sur éléments interactifs sans texte visible
- `tabindex` pour navigation clavier
- Contraste couleurs minimum 4.5:1
- États focus visibles
- Messages d'erreur associés aux inputs

## Server vs Client Components

| Server Component (default) | Client Component ('use client') |
|---------------------------|--------------------------------|
| Chargement de données | Forms interactifs |
| Pages statiques | Mises à jour temps réel |
| SEO important | State local complexe |
| Authentification | Animations |

## Pattern de Page Standard

```typescript
// app/[role]/example/page.tsx (Server Component)
import { getServerAuthContext } from '@/lib/server-context'

export default async function ExamplePage() {
  const { team, profile } = await getServerAuthContext('gestionnaire')
  const data = await loadData(team.id)

  return <ExamplePageClient data={data} profile={profile} />
}

// components/example-page-client.tsx (Client Component)
'use client'

export function ExamplePageClient({ data, profile }) {
  // État local, interactions, real-time
}
```

## Composants shadcn/ui Disponibles

**Layout**: Card, Separator, Tabs, Accordion, Collapsible
**Forms**: Button, Input, Select, Checkbox, RadioGroup, Switch, Textarea, DatePicker
**Feedback**: Alert, Toast, Dialog, Sheet, Popover, Tooltip
**Data**: Table, DataTable, Pagination, Badge, Avatar
**Navigation**: Breadcrumb, Command, DropdownMenu, NavigationMenu

## Conventions de Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Fichiers composants | kebab-case | `intervention-card.tsx` |
| Composants React | PascalCase | `InterventionCard` |
| Props interfaces | PascalCase + Props | `InterventionCardProps` |
| Event handlers | handle + Action | `handleSubmit`, `handleClick` |
| CSS classes | BEM ou Tailwind | `intervention-card__header` |

## Structure Dossier Components

```
components/
├── ui/                  # shadcn/ui (ne pas modifier)
├── biens/               # Composants biens immobiliers
├── intervention/        # Composants interventions
├── dashboard/           # Composants dashboard
├── forms/               # Formulaires réutilisables
├── layout/              # Header, Sidebar, etc.
└── shared/              # Composants partagés
```

## Anti-Patterns à Éviter

❌ Hardcoder des couleurs (utiliser CSS variables)
❌ Créer un composant qui existe déjà dans shadcn/ui
❌ Utiliser `'use client'` sans raison valable
❌ Ignorer les états loading/error
❌ Oublier l'accessibilité clavier
❌ Touch targets < 44px sur mobile

---

## Skills pour UI

**Avant creer un composant**:

| Etape | Skill | Action |
|-------|-------|--------|
| 1 | `sp-brainstorming` | Identifier persona, verifier shadcn/ui |
| 2 | `sp-test-driven-development` | Tests composant (a11y, responsive) |
| 3 | `sp-verification-before-completion` | Avant commit |

### Red Flags UI

| Pensee | Skill |
|--------|-------|
| "Nouveau composant..." | `sp-brainstorming` |
| "Bug UI/affichage..." | `sp-systematic-debugging` |
| "Refactoring composant..." | `sp-brainstorming` + `sp-writing-plans` |
| "Pret a merger..." | `sp-verification-before-completion` |
