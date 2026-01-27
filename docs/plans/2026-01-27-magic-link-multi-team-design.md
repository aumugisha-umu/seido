# Design : Correction Magic Link Multi-Équipe

**Date** : 2026-01-27
**Statut** : Validé
**Auteur** : Claude + Arthur

---

## Problème

Les emails d'invitation pour utilisateurs existants (ajout à une nouvelle équipe) contiennent un simple lien `/auth/login` au lieu d'un magic link qui :
1. Connecte automatiquement l'utilisateur
2. Accepte l'invitation automatiquement

### Bugs Identifiés

| # | Bug | Impact |
|---|-----|--------|
| 1 | `sendTeamAdditionEmail` reçoit `loginUrl` au lieu du magic link généré | Pas de connexion automatique |
| 2 | Les URLs de magic link ne contiennent pas `team_id` | Impossible de savoir quelle invitation accepter |
| 3 | `verifyInviteOrRecoveryAction` n'accepte pas l'invitation | Invitation reste en "pending" |

### Routes Affectées

| Route API | Cas Utilisateur Existant | Bug |
|-----------|--------------------------|-----|
| `invite-user/route.ts` | Ligne 528-534 | `loginUrl` au lieu de `invitationUrl` |
| `resend-invitation/route.ts` | Ligne 199 | `loginUrl` au lieu de `magicLink` |
| `send-existing-contact-invitation/route.ts` | Ligne 285 | `loginUrl` au lieu de `invitationUrl` |

---

## Solution

### 1. Routes API - Ajouter `team_id` et passer le magic link

**Fichiers** :
- `app/api/invite-user/route.ts`
- `app/api/resend-invitation/route.ts`
- `app/api/send-existing-contact-invitation/route.ts`

**Changements** :

```typescript
// URL du magic link - AJOUTER team_id
invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite&team_id=${teamId}`

// Email - PASSER le magic link au lieu de loginUrl
await emailService.sendTeamAdditionEmail(email, {
  // ...
  magicLinkUrl: invitationUrl  // au lieu de loginUrl: /auth/login
})
```

### 2. Template Email - Renommer prop et améliorer CTA

**Fichiers** :
- `emails/templates/auth/team-addition.tsx`
- `emails/utils/types.ts`

**Changements** :

```typescript
// Interface
interface TeamAdditionEmailProps {
  // ...
  magicLinkUrl: string  // renommé depuis loginUrl
}

// Template - Bouton plus explicite
<EmailButton href={magicLinkUrl}>
  Accéder à l'équipe
</EmailButton>
```

### 3. Page Confirm - Propager `team_id`

**Fichiers** :
- `app/auth/confirm/page.tsx`
- `components/auth/invite-recovery-flow.tsx`

**Changements** :

```typescript
// Page - Extraire team_id
const { token_hash, type, team_id } = params
return <InviteRecoveryFlow tokenHash={token_hash} type={type} teamId={team_id} />

// Composant - Passer à la Server Action
const result = await verifyInviteOrRecoveryAction(tokenHash, type, teamId)
```

### 4. Server Action - Accepter l'invitation automatiquement

**Fichier** : `app/actions/confirm-actions.ts`

**Changements** :

```typescript
export async function verifyInviteOrRecoveryAction(
  tokenHash: string,
  type: 'invite' | 'recovery',
  teamId?: string  // Nouveau paramètre
) {
  // ... après vérification OTP réussie ...

  if (type === 'invite' && passwordAlreadySet && teamId) {
    // Accepter l'invitation automatiquement
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin
      .from('user_invitations')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('email', user.email)
      .eq('team_id', teamId)
      .eq('status', 'pending')

    logger.info({ teamId }, '✅ Invitation auto-accepted for existing user')
  }
}
```

---

## Fichiers à Modifier

| # | Fichier | Type de Modification |
|---|---------|---------------------|
| 1 | `app/api/invite-user/route.ts` | URL + appel email |
| 2 | `app/api/resend-invitation/route.ts` | URL + appel email |
| 3 | `app/api/send-existing-contact-invitation/route.ts` | URL + appel email |
| 4 | `emails/templates/auth/team-addition.tsx` | Props + bouton |
| 5 | `emails/utils/types.ts` | Interface |
| 6 | `app/auth/confirm/page.tsx` | Extraction team_id |
| 7 | `components/auth/invite-recovery-flow.tsx` | Propagation teamId |
| 8 | `app/actions/confirm-actions.ts` | Acceptation invitation |

---

## Flow Après Correction

```
┌─────────────────────────────────────────────────────────────────┐
│  GESTIONNAIRE invite un utilisateur existant                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Route API génère magic link                                    │
│  URL: /auth/confirm?token_hash=XXX&type=invite&team_id=YYY     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Email envoyé avec magic link                                   │
│  Bouton: "Accéder à l'équipe"                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Utilisateur clique → /auth/confirm                            │
│  - Token vérifié ✅                                             │
│  - Session créée ✅                                             │
│  - Invitation acceptée automatiquement ✅                       │
│  - Redirect → /[role]/dashboard?welcome=true                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Scénarios Couverts

| Scénario | Email | Résultat |
|----------|-------|----------|
| Nouvel utilisateur (1ère invitation) | Template invitation | Set password → Dashboard |
| Utilisateur existant (1ère invitation) | Template team-addition | Connexion auto → Dashboard |
| Renvoi invitation (nouvel user) | Template invitation | Set password → Dashboard |
| Renvoi invitation (user existant) | Template team-addition | Connexion auto → Dashboard |

---

## Tests de Validation

- [ ] Inviter nouvel utilisateur → reçoit email invitation avec magic link
- [ ] Inviter utilisateur existant → reçoit email "Bienvenue dans l'équipe" avec magic link
- [ ] Clic magic link (user existant) → connecté automatiquement + invitation acceptée
- [ ] Renvoyer invitation (user existant) → même comportement
- [ ] Vérifier `user_invitations.status` = 'accepted' après clic

---

## Risques

- **Faible** : Modifications isolées dans le flow d'invitation
- **Rétrocompatibilité** : Les nouveaux utilisateurs ne sont pas affectés
- **Sécurité** : Le `team_id` dans l'URL est validé côté serveur
