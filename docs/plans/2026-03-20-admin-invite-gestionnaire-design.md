# Admin Invite Gestionnaire — Design Document

**Date:** 2026-03-20
**Status:** Validated

## Context

Instead of waiting for gestionnaires to self-signup, the admin can invite them directly by entering their email, name, and organization. The gestionnaire receives an email with a link to set their password and quick start steps, then lands on their dashboard with the onboarding checklist.

## Architecture — Reuse Strategy

**Existing infrastructure reused:**
- `handle_new_user_confirmed` trigger → creates user profile + team (from `organization` metadata) + subscription `trialing` 30 days
- `/auth/callback` → detects `password_set: false` → redirects to `/auth/set-password`
- `/auth/set-password` → password form, then redirect to dashboard
- `emailService` + Resend infrastructure
- `user-admin-actions.ts` → `getAdminContext()` pattern
- `user_invitations` table → invitation tracking
- Admin users page UI (existing component)

**No DB migration needed** — all tables exist.

## Flow

```
Admin (/admin/users)
  → Click "Inviter un gestionnaire"
  → Modal: email, firstName, lastName, organization
  → Server action: inviteGestionnaireAction()
     1. Check duplicates (users table + auth.users)
     2. createUser({ email_confirm: true, user_metadata: { organization, name, role, password_set: false } })
     3. Trigger fires → creates profile + team (name = organization) + trialing subscription
     4. generateLink('magiclink') → hashed_token
     5. Insert user_invitations (pending, expires +7d)
     6. Send email via after() (non-blocking) with admin-invitation template

Gestionnaire receives email
  → Clicks link
  → /auth/confirm → verifies token
  → /auth/callback → detects password_set: false → /auth/set-password
  → Sets password
  → /gestionnaire/dashboard with onboarding checklist
```

## Changes

### 1. Server Actions (`app/actions/user-admin-actions.ts`)

#### `inviteGestionnaireAction(input)`

```typescript
input: { email: string, firstName: string, lastName: string, organization: string }
returns: ActionResult<{ userId: string; invitationId: string }>
```

Steps:
1. `getAdminContext()` — verify admin role
2. Check email uniqueness in `users` (active, non-deleted)
3. `supabaseAdmin.auth.admin.createUser()` with `email_confirm: true` + user_metadata
4. Trigger `handle_new_user_confirmed` fires automatically (profile + team + subscription)
5. `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })` → get hashed_token
6. Insert into `user_invitations` (email, role: gestionnaire, status: pending, expires_at: +7 days)
7. `after()` → send email via `emailService.sendAdminInvitationEmail()`

#### `resendGestionnaireInvitationAction(email)`

```typescript
input: email: string
returns: ActionResult
```

Steps:
1. Verify invitation exists and is pending/expired
2. Generate new magiclink
3. Update `user_invitations` (new token + reset expires_at)
4. Resend email

### 2. Email Template (`emails/templates/auth/admin-invitation.tsx`)

New template based on `invitation.tsx` structure. Reuses `EmailLayout`, `EmailHeader`, `EmailFooter`, `EmailButton`.

**Props:**
```typescript
interface AdminInvitationEmailProps {
  firstName: string
  organization: string
  invitationUrl: string
  expiresIn?: number  // default 7
}
```

**Content:**
- Subject: "Bienvenue sur SEIDO — Votre espace de gestion vous attend"
- Greeting + context (invited to manage {organization})
- CTA button: "Definir mon mot de passe et commencer"
- Quick start section (4 steps): add property, invite contacts, create intervention, connect email
- Expiration warning (7 days)
- Fallback link

### 3. Email Service (`lib/email/email-service.ts`)

Add `sendAdminInvitationEmail()` method — same pattern as other send methods (dynamic import + `sendEmailWithRetry`).

### 4. Email Types (`emails/utils/types.ts`)

Add `AdminInvitationEmailProps` interface.

### 5. Admin Users UI (existing component)

**Modal:**
- Button in header: "+ Inviter un gestionnaire"
- Dialog with 4 fields: email, firstName, lastName, organization
- Submit calls `inviteGestionnaireAction()`
- Toast success/error, close modal, refresh list

**Resend button:**
- For users with `computed_status === 'pending'` or `'expired'`
- Icon button `RotateCw` in action dropdown
- Calls `resendGestionnaireInvitationAction(email)`
- Toast confirmation

## Files Modified

| File | Change |
|------|--------|
| `app/actions/user-admin-actions.ts` | Add `inviteGestionnaireAction` + `resendGestionnaireInvitationAction` |
| `emails/templates/auth/admin-invitation.tsx` | **NEW** — template with quick start steps |
| `emails/utils/types.ts` | Add `AdminInvitationEmailProps` |
| `lib/email/email-service.ts` | Add `sendAdminInvitationEmail()` |
| Admin users client component | Add invitation modal + resend button |

## Verification

1. `npm run lint` — no errors
2. Manual test: admin invites gestionnaire → email received → click link → set password → dashboard with onboarding
3. Resend: expired invitation → click resend → new email → link works
4. Edge cases: duplicate email → error message, invalid email → validation error
