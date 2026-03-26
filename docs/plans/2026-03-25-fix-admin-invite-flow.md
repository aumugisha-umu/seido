# Fix Admin Gestionnaire Invite Flow

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken admin gestionnaire invitation so it creates user+team+subscription, sends email, and routes through the correct post-invite flow (set-password -> dashboard).
**Architecture:** Replace `createUser` + `generateLink(magiclink)` with single `generateLink(invite)`. Fix magiclink verification to check `password_set` instead of hardcoding. Reuse existing trigger, email templates, and set-password page.
**Tech Stack:** Supabase Auth Admin API, Next.js Server Actions, PostgreSQL triggers

---

## Acceptance Criteria

- [ ] Admin can invite a gestionnaire from `/admin/users` page
- [ ] Auth user is created with correct metadata (first_name, last_name, organization, role, password_set: false)
- [ ] Trigger `handle_new_user_confirmed()` fires and creates: profile, team (named after organization), team_member (admin role), subscription (trialing)
- [ ] Invitation record created in `user_invitations` with correct `team_id` (NOT null)
- [ ] Email sent via `sendAdminInvitationEmail` with working invite URL
- [ ] Invite URL format: `/auth/confirm?token_hash=xxx&type=invite`
- [ ] User clicks link -> verifyOtp(invite) -> redirect to `/auth/set-password`
- [ ] User sets password -> `password_set` marked true -> invitation accepted -> redirect to `/gestionnaire/dashboard`
- [ ] Admin resend: generates new magiclink -> user who hasn't set password is redirected to `/auth/set-password`
- [ ] Admin resend: existing user with password goes to dashboard
- [ ] Lint passes: `npm run lint`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `generateLink(invite)` fails for existing auth email | Medium | High | Check auth.users existence first, return clear error |
| Trigger timing — profile not ready when queried | Low | Medium | Trigger is synchronous in PG, should be instant |
| Resend for unconfirmed user fails with magiclink | Low | Medium | User was created with email_confirm via invite, already confirmed |

## Tasks

---

### Task 1: Fix `inviteGestionnaireAction` (Size: S)

Replace the broken `createUser` + `generateLink(magiclink)` with single `generateLink({ type: 'invite' })`.

**Files:**
- Modify: `app/actions/user-admin-actions.ts:555-692`

**Step 1: Replace steps 2-3 (createUser + generateLink) with single generateLink(invite)**

Replace lines 585-626 with:

```typescript
    // 2. Generate invite link — creates auth user + triggers profile/team/subscription
    const fullName = `${firstName} ${lastName}`
    const { data: inviteLink, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        data: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          display_name: fullName,
          organization,
          role: 'gestionnaire',
          password_set: false,
        },
      },
    })

    if (inviteError || !inviteLink?.user) {
      logger.error({ error: inviteError }, '[ADMIN-INVITE] Failed to generate invite link')
      return { success: false, error: inviteError?.message || 'Echec de la creation du compte' }
    }

    const authUserId = inviteLink.user.id
    const hashedToken = inviteLink.properties.hashed_token
    const invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`

    logger.info({ authUserId }, '[ADMIN-INVITE] Invite link generated, trigger should have fired')
```

**Step 2: Fix step 4 — query profile to get team_id**

Replace lines 628-634 with:

```typescript
    // 3. Get the profile + team created by the trigger
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, team_id')
      .eq('auth_user_id', authUserId)
      .limit(1)
      .maybeSingle()
```

**Step 3: Fix step 5 — insert invitation with real team_id**

Replace lines 636-656 with:

```typescript
    // 4. Insert invitation record (with real team_id from trigger)
    const { data: invitation, error: invError } = await supabase
      .from('user_invitations')
      .insert({
        email: normalizedEmail,
        first_name: firstName,
        last_name: lastName,
        role: 'gestionnaire' as const,
        team_id: userProfile?.team_id || null,
        invited_by: userProfile?.id || null,
        invitation_token: hashedToken,
        user_id: userProfile?.id || null,
        status: 'pending' as const,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single()

    if (invError) {
      logger.warn({ error: invError }, '[ADMIN-INVITE] Failed to create invitation record (non-blocking)')
    }
```

**Step 4: Fix error cleanup — remove deleteUser (generateLink handles cleanup)**

The old code had `await supabase.auth.admin.deleteUser(authUserId)` on link failure. With `generateLink(invite)`, there's no separate cleanup needed — if it fails, no user was created.

**Step 5: Verify lint passes**

Run: `npm run lint -- app/actions/user-admin-actions.ts`

---

### Task 2: Fix `resendGestionnaireInvitationAction` URL type (Size: XS)

The resend generates `type: 'magiclink'` which is correct (can't re-invite a confirmed user). But we need the URL to pass through to the magiclink handler which we'll fix in Task 3.

No code change needed here — the resend already uses `magiclink` and the URL is `/auth/confirm?token_hash=xxx&type=magiclink`. Task 3 fixes the handler to check `password_set`.

---

### Task 3: Fix magiclink verification to check `password_set` (Size: XS)

The magiclink branch in `verifyInviteOrRecoveryAction` hardcodes `shouldSetPassword: false`. Fix it to check the actual `password_set` metadata.

**Files:**
- Modify: `app/actions/confirm-actions.ts:441-479`

**Step 1: Replace the magiclink branch**

Replace lines 441-479 with:

```typescript
    if (type === 'magiclink') {
      // Check if user actually needs to set password (admin resend case)
      if (needsPasswordSetup) {
        logger.info('🔑 [VERIFY-INVITE-RECOVERY] Magic link confirmed - password NOT set, redirect to set-password')
        return {
          success: true,
          data: {
            shouldSetPassword: true,
            role,
            redirectTo: '/auth/set-password'
          }
        }
      }

      // Existing user with password — accept invitation and go to dashboard
      logger.info('✅ [VERIFY-INVITE-RECOVERY] Magic link confirmed - existing user, accepting invitation...')

      // Accepter l'invitation automatiquement
      if (teamId && user.email) {
        try {
          const admin = getSupabaseAdmin()
          if (admin) {
            const { error: updateError } = await admin
              .from('user_invitations')
              .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('email', user.email)
              .eq('team_id', teamId)
              .eq('status', 'pending')

            if (updateError) {
              logger.warn('⚠️ [VERIFY-INVITE-RECOVERY] Failed to update invitation status (non-blocking):', updateError)
            } else {
              logger.info({ teamId, email: user.email }, '✅ [VERIFY-INVITE-RECOVERY] Invitation auto-accepted for existing user via magiclink')
            }
          }
        } catch (acceptError) {
          logger.warn('⚠️ [VERIFY-INVITE-RECOVERY] Error accepting invitation (non-blocking):', acceptError)
        }
      }

      return {
        success: true,
        data: {
          shouldSetPassword: false,
          role,
          redirectTo: `/${role}/dashboard?welcome=true${teamId ? `&team=${teamId}` : ''}`
        }
      }
    }
```

**Step 2: Verify lint passes**

Run: `npm run lint -- app/actions/confirm-actions.ts`

---

### Task 4: Verify end-to-end flow (manual, Size: XS)

No code changes. Verify these paths are correctly wired:

1. **Initial invite path:**
   - `inviteGestionnaireAction` -> `generateLink(invite)` -> trigger fires -> profile+team+subscription created
   - URL: `/auth/confirm?token_hash=xxx&type=invite`
   - `confirm/page.tsx` -> routes to `InviteRecoveryFlow` (line 64: `type === 'invite'`)
   - `verifyInviteOrRecoveryAction(tokenHash, 'invite')` -> `verifyOtp(invite)` -> `needsPasswordSetup=true` -> redirect `/auth/set-password`
   - `set-password/page.tsx` -> `updateUser({ password })` -> marks `password_set=true` -> calls `/api/accept-invitation` -> redirect to dashboard

2. **Resend path:**
   - `resendGestionnaireInvitationAction` -> `generateLink(magiclink)` (user exists, confirmed)
   - URL: `/auth/confirm?token_hash=xxx&type=magiclink`
   - `confirm/page.tsx` -> routes to `InviteRecoveryFlow` (line 64: `type === 'magiclink'`)
   - `verifyInviteOrRecoveryAction(tokenHash, 'magiclink')` -> `verifyOtp(magiclink)` -> `needsPasswordSetup=true` (password_set=false) -> redirect `/auth/set-password`
   - Same password flow as above

3. **Existing user team invite (unchanged):**
   - `invite-user/route.ts` -> `generateLink(magiclink)` with team_id in URL
   - `verifyInviteOrRecoveryAction(tokenHash, 'magiclink', teamId)` -> `needsPasswordSetup=false` (existing user has password) -> auto-accept -> dashboard

---

## Files Changed Summary

| File | Change | Size |
|------|--------|------|
| `app/actions/user-admin-actions.ts` | Replace createUser+magiclink with generateLink(invite) | S |
| `app/actions/confirm-actions.ts` | Fix magiclink branch to check password_set | XS |

**Total: 2 files, ~40 lines changed**
