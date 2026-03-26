# Reminder Wizard Layout Alignment

**Date:** 2026-03-19
**Status:** Validated
**Complexity:** Simple (1 file)

## Context

The reminder creation wizard (`nouveau-rappel-client.tsx`) uses a different layout pattern than the intervention wizard. This creates visual inconsistency.

## Changes (align to intervention wizard pattern)

### Layout
- Root: Fragment `<>` instead of wrapper div
- Content: `flex-1 overflow-y-auto px-5 sm:px-6 lg:px-10 pb-10 bg-background` + `content-max-width w-full pt-10`
- Sticky footer: `sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t`

### Navigation
- Remove inline nav buttons from each step
- Sticky footer with responsive buttons (`flex-col sm:flex-row`, `w-full sm:w-auto`)
- Back hidden on step 1, "Continuer" steps 1-2, green "Créer le rappel" step 3

### Form elements
- Native `<label>` with `block text-sm font-medium text-foreground mb-2`
- Input borders: `border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20`
- Required: `<span className="text-red-500">*</span>`

### Cards
- Remove CardHeader/CardTitle, use custom icon+title headers
- Keep summary items pattern (icon + label + value in bg-muted/50)

### StepProgressHeader
- Add maxStepReached state
- Add backButtonText="Retour"
