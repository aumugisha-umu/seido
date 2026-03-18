# Email UX Improvements Design

**Date**: 2026-03-17
**Status**: Validated
**Branch**: preview

## Requirements

1. Change compose modal title: "Nouveau message" → "Nouvel email"
2. No-email-connected state: full takeover of mail page with inline connection form (no empty folders)
3. Shared `EmailConnectionPrompt` component — single reusable UI for both inline and modal usage
4. Disable "Rédiger" button when no email is connected
5. Add `+` button next to "Emails" in sidebar — opens compose modal from any page (no redirect), hidden if no email connected

## Architecture Decisions

- **Global compose**: Context/Provider at gestionnaire layout level (not URL-based) — user said "sans redirection"
- **No-email state**: Full page takeover (not partial) — empty folders are meaningless noise
- **Shared component**: Extract visual content only (not dialog+form) — settings needs dialog wrapper, mail page needs inline

## Component Design

### 1. `EmailConnectionPrompt` (NEW)

**Path**: `components/email/email-connection-prompt.tsx`

Extracted from `parametres/emails/components/email-connection-form.tsx` — contains the tabs (Gmail OAuth / Autres IMAP), Google connect button, IMAP form fields, "Recommandé" info box.

```typescript
interface EmailConnectionPromptProps {
  onSuccess?: () => void
  onCancel?: () => void
  className?: string
}
```

**Consumers**:
- Settings page: wraps in `<Dialog>` with title "Ajouter une connexion email" + Annuler
- Mail page: renders inline, centered, when `emailConnections.length === 0`

### 2. `ComposeEmailProvider` (NEW)

**Path**: `contexts/compose-email-context.tsx`

```typescript
interface ComposeEmailContextValue {
  openCompose: () => void
  closeCompose: () => void
  hasActiveConnections: boolean
}
```

- Wraps children in `app/gestionnaire/(with-navbar)/layout.tsx`
- Renders single `<ComposeEmailModal />` instance
- Receives `emailConnections` from SSR layout fetch

### 3. Mail page full takeover

In `mail-client.tsx`, when `emailConnections.length === 0`:
- Replace entire 3-column layout with centered connection prompt
- Mail icon + heading "Connectez votre email" + subtitle
- `<EmailConnectionPrompt onSuccess={router.refresh} />`

### 4. Sidebar `+` button

In `gestionnaire-sidebar.tsx`:
- New `createAction: "compose-email"` on Emails nav item
- Renders `+` button that calls `openCompose()` from context
- Hidden when `!hasActiveConnections`

### 5. Title change

In `compose-email-modal.tsx`: "Nouveau message" → "Nouvel email"

## Files Changed

| File | Change |
|------|--------|
| `components/email/email-connection-prompt.tsx` | NEW — extracted connection UI |
| `parametres/emails/email-settings-client.tsx` | Refactor to use `EmailConnectionPrompt` inside dialog |
| `parametres/emails/components/email-connection-form.tsx` | Thin wrapper or delete |
| `mail/mail-client.tsx` | Full takeover when no connections, remove local compose state |
| `mail/components/compose-email-modal.tsx` | Title → "Nouvel email" |
| `contexts/compose-email-context.tsx` | NEW — global compose provider |
| `app/gestionnaire/(with-navbar)/layout.tsx` | Wrap with `ComposeEmailProvider`, fetch connections |
| `components/gestionnaire-sidebar.tsx` | Add conditional `+` button for Emails |
