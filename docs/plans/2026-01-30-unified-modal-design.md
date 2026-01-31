# UnifiedModal Component - Design Document

> **Status:** Approved - Ready for implementation
> **Date:** 2026-01-30
> **Author:** Claude Code (Brainstorming Session)

---

## 1. Executive Summary

### Objective
Create a **reusable modal component** (`UnifiedModal`) that standardizes all popup/dialog patterns across SEIDO, with:
- Consistent BEM styling in `globals.css`
- Responsive behavior (centered on desktop, bottom sheet on mobile for large modals)
- Composable sub-components (Header, Body, Footer)
- Size presets (sm, md, lg, xl, full)

### Scope
- **New component:** `components/ui/unified-modal/`
- **Migration:** 35 existing modals to use UnifiedModal
- **Cleanup:** 5 unused modals deleted, 5 base components to remove after migration

---

## 2. Architecture

### 2.1 File Structure

```
components/ui/unified-modal/
├── index.ts                    # Public exports
├── unified-modal.tsx           # Main component (wraps Radix Dialog)
├── unified-modal-header.tsx    # Header sub-component
├── unified-modal-body.tsx      # Body sub-component
├── unified-modal-footer.tsx    # Footer sub-component
└── unified-modal.types.ts      # TypeScript types
```

### 2.2 BEM Classes (globals.css)

```css
/* ═══════════════════════════════════════════════════════════════
   UNIFIED MODAL - Composant modal réutilisable
   Block: unified-modal
   ═══════════════════════════════════════════════════════════════ */

/* Block */
.unified-modal {
  @apply fixed inset-0 z-50;
}

/* Elements */
.unified-modal__overlay {
  @apply fixed inset-0 bg-black/50
         data-[state=open]:animate-in data-[state=closed]:animate-out
         data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0;
}

.unified-modal__content {
  @apply fixed bg-background border shadow-lg rounded-lg
         data-[state=open]:animate-in data-[state=closed]:animate-out
         data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
         flex flex-col max-h-[90vh] overflow-hidden;
}

.unified-modal__header {
  @apply flex items-center gap-3 p-4 border-b border-slate-100
         flex-shrink-0;
}

.unified-modal__header-icon {
  @apply p-2 rounded-lg bg-slate-100;
}

.unified-modal__header-title {
  @apply text-lg font-semibold text-slate-900;
}

.unified-modal__header-subtitle {
  @apply text-sm text-muted-foreground;
}

.unified-modal__header-close {
  @apply ml-auto p-2 rounded-lg hover:bg-slate-100
         focus:outline-none focus:ring-2 focus:ring-slate-400
         transition-colors;
}

.unified-modal__body {
  @apply flex-1 overflow-y-auto p-6;
}

.unified-modal__footer {
  @apply flex items-center gap-3 p-4 border-t border-slate-100
         flex-shrink-0 bg-slate-50/50;
}

/* ─────────────────────────────────────────────────────────────────
   Size Modifiers (Desktop centered)
   ───────────────────────────────────────────────────────────────── */

.unified-modal__content--sm {
  @apply w-full max-w-sm top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
         data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95;
}

.unified-modal__content--md {
  @apply w-full max-w-md top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
         data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95;
}

.unified-modal__content--lg {
  @apply w-full max-w-2xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
         data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95;
}

.unified-modal__content--xl {
  @apply w-full max-w-4xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
         data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95;
}

.unified-modal__content--full {
  @apply w-[95vw] max-w-7xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
         data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95;
}

/* ─────────────────────────────────────────────────────────────────
   Mobile Bottom Sheet Modifier
   ───────────────────────────────────────────────────────────────── */

@media (max-width: 640px) {
  /* sm et md restent centrés sur mobile */
  .unified-modal__content--sm,
  .unified-modal__content--md {
    @apply max-w-[calc(100%-2rem)];
  }

  /* lg, xl, full deviennent bottom sheet */
  .unified-modal__content--lg,
  .unified-modal__content--xl,
  .unified-modal__content--full {
    @apply top-auto bottom-0 left-0 right-0
           translate-x-0 translate-y-0
           max-w-full w-full max-h-[90vh]
           rounded-b-none rounded-t-2xl;

    animation-name: slideUp !important;
  }

  .unified-modal__content--lg[data-state="closed"],
  .unified-modal__content--xl[data-state="closed"],
  .unified-modal__content--full[data-state="closed"] {
    animation-name: slideDown !important;
  }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes slideDown {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

/* ─────────────────────────────────────────────────────────────────
   Footer Alignment Modifiers
   ───────────────────────────────────────────────────────────────── */

.unified-modal__footer--left {
  @apply justify-start;
}

.unified-modal__footer--center {
  @apply justify-center;
}

.unified-modal__footer--right {
  @apply justify-end;
}

.unified-modal__footer--between {
  @apply justify-between;
}

/* ─────────────────────────────────────────────────────────────────
   Variant Modifiers (couleurs header)
   ───────────────────────────────────────────────────────────────── */

.unified-modal__header--success {
  @apply bg-emerald-50 border-emerald-100;
}

.unified-modal__header--success .unified-modal__header-icon {
  @apply bg-emerald-100 text-emerald-600;
}

.unified-modal__header--danger {
  @apply bg-red-50 border-red-100;
}

.unified-modal__header--danger .unified-modal__header-icon {
  @apply bg-red-100 text-red-600;
}

.unified-modal__header--warning {
  @apply bg-amber-50 border-amber-100;
}

.unified-modal__header--warning .unified-modal__header-icon {
  @apply bg-amber-100 text-amber-600;
}
```

---

## 3. TypeScript Types

```typescript
// unified-modal.types.ts

import { ReactNode } from 'react'

export type UnifiedModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type UnifiedModalVariant = 'default' | 'success' | 'danger' | 'warning'
export type UnifiedModalFooterAlign = 'left' | 'center' | 'right' | 'between'

export interface UnifiedModalProps {
  /** État d'ouverture */
  open: boolean
  /** Callback changement d'état */
  onOpenChange: (open: boolean) => void
  /** Taille de la modale */
  size?: UnifiedModalSize
  /** Afficher le bouton close */
  showCloseButton?: boolean
  /** Empêcher fermeture au clic extérieur */
  preventCloseOnOutsideClick?: boolean
  /** Empêcher fermeture avec Escape */
  preventCloseOnEscape?: boolean
  /** Classes additionnelles sur le content */
  className?: string
  /** Contenu (sous-composants) */
  children: ReactNode
}

export interface UnifiedModalHeaderProps {
  /** Titre principal */
  title: string
  /** Sous-titre optionnel */
  subtitle?: string
  /** Icône optionnelle (composant Lucide) */
  icon?: ReactNode
  /** Variante de couleur */
  variant?: UnifiedModalVariant
  /** Bouton retour (pour navigation multi-étapes) */
  onBack?: () => void
  /** Classes additionnelles */
  className?: string
}

export interface UnifiedModalBodyProps {
  /** Contenu du body */
  children: ReactNode
  /** Désactiver le padding par défaut */
  noPadding?: boolean
  /** Classes additionnelles */
  className?: string
}

export interface UnifiedModalFooterProps {
  /** Contenu du footer (boutons) */
  children: ReactNode
  /** Alignement des boutons */
  align?: UnifiedModalFooterAlign
  /** Classes additionnelles */
  className?: string
}
```

---

## 4. Size Specifications

### 4.1 Desktop Sizes

| Size | Width | Usage |
|------|-------|-------|
| `sm` | 384px (max-w-sm) | Confirmations, alertes |
| `md` | 448px (max-w-md) | Formulaires simples, approbations |
| `lg` | 672px (max-w-2xl) | Formulaires complexes, liaison entités |
| `xl` | 896px (max-w-4xl) | Tableaux, listes longues |
| `full` | 95vw (max 1200px) | Prévisualisation documents |

### 4.2 Mobile Behavior

| Size | Mobile (<640px) | Animation |
|------|-----------------|-----------|
| `sm` | Centré, 100% - 32px | Zoom in/out |
| `md` | Centré, 100% - 32px | Zoom in/out |
| `lg` | **Bottom sheet 90vh** | **Slide up/down** |
| `xl` | **Bottom sheet 90vh** | **Slide up/down** |
| `full` | **Bottom sheet 90vh** | **Slide up/down** |

---

## 5. Usage Examples

### 5.1 Simple Confirmation

```tsx
<UnifiedModal open={open} onOpenChange={setOpen} size="sm">
  <UnifiedModalHeader
    title="Supprimer ce lot ?"
    icon={<Trash2 className="h-5 w-5" />}
    variant="danger"
  />
  <UnifiedModalBody>
    <p>Cette action est irréversible.</p>
  </UnifiedModalBody>
  <UnifiedModalFooter>
    <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
    <Button variant="destructive">Supprimer</Button>
  </UnifiedModalFooter>
</UnifiedModal>
```

### 5.2 Form Modal

```tsx
<UnifiedModal open={open} onOpenChange={setOpen} size="md">
  <UnifiedModalHeader title="Ajouter un commentaire" />
  <UnifiedModalBody>
    <Textarea placeholder="Votre commentaire..." />
  </UnifiedModalBody>
  <UnifiedModalFooter>
    <Button variant="outline">Annuler</Button>
    <Button>Envoyer</Button>
  </UnifiedModalFooter>
</UnifiedModal>
```

### 5.3 Multi-Step Modal (ApprovalModal style)

```tsx
<UnifiedModal open={open} onOpenChange={setOpen} size="md" showCloseButton={step === 'decision'}>
  {step === 'decision' ? (
    <UnifiedModalBody className="p-6">
      {/* Contenu libre: badges, description, boutons décision */}
    </UnifiedModalBody>
  ) : (
    <>
      <UnifiedModalHeader
        title="Confirmer l'approbation"
        icon={<Check className="h-5 w-5" />}
        variant="success"
        onBack={() => setStep('decision')}
      />
      <UnifiedModalBody>
        <Textarea placeholder="Note optionnelle..." />
      </UnifiedModalBody>
      <UnifiedModalFooter>
        <Button onClick={handleSubmit}>Confirmer</Button>
      </UnifiedModalFooter>
    </>
  )}
</UnifiedModal>
```

### 5.4 Complex List Modal (LinkToEntityDialog style)

```tsx
<UnifiedModal open={open} onOpenChange={setOpen} size="lg">
  <UnifiedModalHeader
    title="Lier cet email"
    subtitle={`${links.length} liaison(s)`}
    icon={<Link2 className="h-5 w-5" />}
  />
  <UnifiedModalBody noPadding className="p-4">
    {/* Tabs + Search + 2-column layout */}
  </UnifiedModalBody>
  <UnifiedModalFooter>
    <Button variant="outline">Annuler</Button>
    <Button>Enregistrer</Button>
  </UnifiedModalFooter>
</UnifiedModal>
```

---

## 6. LinkToEntityDialog Redesign

### 6.1 BEM Classes additionnelles

```css
/* ═══════════════════════════════════════════════════════════════
   LINK ENTITY MODAL - Modale de liaison email
   ═══════════════════════════════════════════════════════════════ */

.link-entity-modal__tabs {
  @apply flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto;
}

.link-entity-modal__tab {
  @apply flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium
         text-slate-600 hover:text-slate-900 hover:bg-white/50
         transition-colors whitespace-nowrap;
}

.link-entity-modal__tab--active {
  @apply bg-white text-slate-900 shadow-sm;
}

.link-entity-modal__tab-icon {
  @apply h-4 w-4 flex-shrink-0;
}

.link-entity-modal__tab-label {
  @apply hidden sm:inline;
}

.link-entity-modal__tab-count {
  @apply ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary;
}

.link-entity-modal__layout {
  @apply grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-4 min-h-[400px];
}

.link-entity-modal__list-column {
  @apply flex flex-col min-h-0;
}

.link-entity-modal__search {
  @apply relative mb-3;
}

.link-entity-modal__search-icon {
  @apply absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground;
}

.link-entity-modal__search-input {
  @apply pl-10 h-10;
}

.link-entity-modal__results {
  @apply flex-1 overflow-y-auto space-y-2 pr-1;
}

.link-entity-modal__entity-card {
  @apply flex items-start gap-3 p-3 rounded-lg border border-slate-200
         hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer
         transition-all;
}

.link-entity-modal__entity-card--selected {
  @apply border-primary/50 bg-primary/5;
}

.link-entity-modal__entity-card--linked {
  @apply border-emerald-200 bg-emerald-50/50;
}

.link-entity-modal__sidebar {
  @apply hidden lg:flex flex-col bg-slate-50 rounded-lg p-4 border border-slate-200;
}

.link-entity-modal__link-badge {
  @apply inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm
         bg-white border border-slate-200 hover:border-red-200
         hover:bg-red-50 group transition-colors;
}

@media (max-width: 1024px) {
  .link-entity-modal__layout {
    @apply grid-cols-1;
  }

  .link-entity-modal__sidebar {
    @apply flex order-first mb-4 p-3;
  }
}
```

### 6.2 Améliorations UX

| Avant | Après |
|-------|-------|
| Tabs texte 6 colonnes | Icônes + labels responsifs + compteurs |
| Liste checkbox simple | Cards enrichies (adresse, metadata) |
| Liaisons en bas | Sidebar fixe à droite |
| Badge "Lié" discret | Highlight couleur visible |
| Mobile identique | Bottom sheet + sidebar collapsible |

---

## 7. Migration Plan

### 7.1 Fichiers supprimés (code mort)

| Fichier | Status |
|---------|--------|
| ~~`schedule-rejection-modal.tsx`~~ | ✅ Supprimé |
| ~~`provider-availability-modal.tsx`~~ | ✅ Supprimé |
| ~~`external-quote-request-modal.tsx`~~ | ✅ Supprimé |
| ~~`signup-success-modal.tsx`~~ | ✅ Supprimé |
| ~~`lease-scheduling-modal.tsx`~~ | ✅ Supprimé |

### 7.2 Fichiers à supprimer APRÈS migration

| Fichier | Bloqué par |
|---------|------------|
| `intervention-modal-base.tsx` | quote-submission-modal.tsx |
| `intervention-modal-content.tsx` | quote-submission-modal.tsx |
| `intervention-modal-footer.tsx` | quote-submission-modal.tsx |
| `intervention-modal-header.tsx` | quote-submission-modal.tsx |
| `base/index.ts` | Tout le dossier |

### 7.3 Modales à migrer (35 fichiers)

#### Priorité Haute (Références)
1. `approval-modal.tsx` → Référence multi-étapes
2. `link-to-entity-dialog.tsx` → Référence layout complexe
3. `delete-confirm-modal.tsx` → Référence confirmations
4. `add-comment-modal.tsx` → Référence formulaires

#### Par catégorie
- **Confirmations (sm):** 8 modales
- **Formulaires simples (md):** 11 modales
- **Formulaires complexes (md/lg):** 11 modales
- **Sélections/listes (lg):** 11 modales
- **Plein écran (xl/full):** 4 modales

---

## 8. Implementation Checklist

- [x] Créer `components/ui/unified-modal/` avec tous les fichiers ✅ (2026-01-30)
- [x] Ajouter classes BEM dans `globals.css` ✅ (2026-01-30)
- [ ] Ajouter classes LinkToEntityDialog dans `globals.css`
- [ ] Tester sur mobile (bottom sheet)
- [x] Migrer 2 modales de référence ✅ (AddCommentModal, DeleteConfirmModal)
- [ ] Migrer les autres modales par catégorie (34 restantes)
- [ ] Supprimer le dossier `intervention/modals/base/`
- [ ] Mettre à jour la documentation

---

## 9. References

- [Radix UI Dialog](https://www.radix-ui.com/primitives/docs/components/dialog)
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog)
- [BEM Methodology](https://getbem.com/)
- SEIDO Design System: `docs/design/04-layouts.md`
