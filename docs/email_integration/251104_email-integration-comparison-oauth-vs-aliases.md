# Comparaison Architectures - Email Integration SEIDO

**Date**: 2025-11-04
**Contexte**: Choix architecture pour intégration email

---

## 🎯 Deux Approches Possibles

### Approche A: Alias Google Workspace (Guide actuel)
**Principe**: 1 compte central `gestionnaires@seido.pm` + alias par équipe

```
User Gmail/Outlook → FORWARD → team1@seido.pm (alias) → SEIDO lit depuis gestionnaires@seido.pm
```

### Approche B: OAuth Multi-Comptes (Alternative proposée)
**Principe**: Chaque équipe connecte sa propre boîte email directement

```
User Gmail/Outlook → OAUTH → SEIDO lit directement depuis compte user
```

---

## 📊 Comparaison Détaillée

| Critère | Approche A (Alias) | Approche B (OAuth Multi-Comptes) |
|---------|-------------------|----------------------------------|
| **COMPLEXITÉ TECHNIQUE** |
| Setup initial | 🟡 Moyenne (Google Cloud + Workspace) | 🔴 Élevée (Multi-provider OAuth) |
| Backend code | 🟢 Simple (1 provider, 1 compte) | 🔴 Complexe (2+ providers, N comptes) |
| Token management | 🟢 1 refresh token global | 🔴 1 refresh token par équipe |
| Watch renewal | 🟢 1 watch (gestionnaires@) | 🔴 N watches (1 par compte) |
| Error handling | 🟢 Centralisé | 🔴 Distributed (per account) |
| **COÛTS** |
| Infrastructure | 🔴 $12/mois (Google Workspace) | 🟢 $0.32/mois (Supabase seul) |
| Développement | 🟢 ~200h (8 semaines) | 🔴 ~400h (16 semaines) |
| Maintenance | 🟢 Faible | 🟡 Moyenne (multi-provider) |
| **EXPÉRIENCE UTILISATEUR** |
| Onboarding | 🔴 Manuel (forward → alias) | 🟢 Seamless (OAuth flow) |
| Configuration | 🔴 Expliquer forward emails | 🟢 "Connect your email" button |
| Gestion alias | 🔴 Admin SEIDO doit créer | 🟢 Self-service |
| Multi-comptes | 🔴 1 alias par équipe | 🟢 N comptes par équipe possible |
| **SÉCURITÉ & PERMISSIONS** |
| Accès emails | 🟢 Read-only (forward) | 🔴 Full access (OAuth scopes) |
| Révocation | 🟡 Désactiver alias | 🟢 User révoque OAuth |
| Audit trail | 🟢 Centralisé | 🟡 Par compte |
| **FONCTIONNALITÉS** |
| Providers supportés | 🔴 Emails forwarded uniquement | 🟢 Gmail, Outlook, Office 365 natif |
| Envoi emails | ❌ Non supporté | ✅ Possible (send as user) |
| Calendrier sync | ❌ Non | ✅ Possible (Calendar API) |
| **SCALABILITÉ** |
| Limite technique | 🔴 30 alias max/compte Workspace | 🟢 Illimité (1 OAuth/équipe) |
| Performance | 🟢 1 API call/batch | 🟡 N API calls (per account) |
| Quota API | 🟢 1 quota global | 🔴 N quotas (risque limits) |

---

## 🔧 Implémentation Approche B (OAuth Multi-Comptes)

### Architecture Technique

```typescript
// NOUVEAU: Table pour stocker OAuth credentials par équipe
CREATE TABLE team_email_connections (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams(id),

  -- Provider info
  provider VARCHAR(50), -- 'gmail' | 'microsoft' | 'outlook'
  email_address VARCHAR(255),

  -- OAuth tokens (ENCRYPTED!)
  encrypted_access_token TEXT,
  encrypted_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Watch state
  watch_history_id BIGINT,
  watch_expiration TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Flux OAuth Par Équipe

```typescript
// 1. User clique "Connect Gmail"
// app/gestionnaire/settings/emails/page.tsx
<Button onClick={() => initiateOAuthFlow('gmail')}>
  <Mail className="mr-2" />
  Connect Gmail Account
</Button>

// 2. Redirection OAuth (multi-provider)
async function initiateOAuthFlow(provider: 'gmail' | 'microsoft') {
  const authUrl = provider === 'gmail'
    ? getGmailAuthUrl(teamId)
    : getMicrosoftAuthUrl(teamId);

  window.location.href = authUrl;
}

// 3. Callback OAuth
// app/api/auth/[provider]/callback/route.ts
export async function GET(request: NextRequest, { params }: { params: { provider: string } }) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const teamId = searchParams.get('state'); // Passed via state param

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(params.provider, code);

  // Store encrypted tokens
  await storeTeamEmailConnection(teamId, params.provider, tokens);

  // Setup watch for this account
  await setupWatchForAccount(teamId, params.provider, tokens);

  redirect('/gestionnaire/settings/emails?connected=true');
}

// 4. Webhook par provider
// app/api/webhooks/gmail/[teamId]/route.ts
export async function POST(request: NextRequest, { params }: { params: { teamId: string } }) {
  const connection = await getTeamEmailConnection(params.teamId, 'gmail');

  // Refresh token if needed
  const accessToken = await refreshTokenIfNeeded(connection);

  // Fetch emails for THIS team's account
  await emailService.processEmailsForTeam(params.teamId, accessToken);
}
```

### Support Multi-Provider

#### Gmail API (déjà documenté)
- OAuth: https://developers.google.com/gmail/api/auth/web-server
- Push: Pub/Sub (1 topic par équipe)
- Scopes: `gmail.readonly`, `gmail.modify`

#### Microsoft Graph API (NOUVEAU)
```typescript
// lib/services/providers/microsoft-email.provider.ts
import { Client } from '@microsoft/microsoft-graph-client';

export class MicrosoftEmailProvider {
  async fetchEmails(accessToken: string) {
    const client = Client.init({
      authProvider: (done) => done(null, accessToken)
    });

    const messages = await client
      .api('/me/mailFolders/inbox/messages')
      .select('id,subject,from,body,receivedDateTime')
      .top(50)
      .get();

    return messages.value;
  }

  async setupWebhook(accessToken: string, teamId: string) {
    // Microsoft Graph Subscriptions
    const subscription = await client.api('/subscriptions').post({
      changeType: 'created',
      notificationUrl: `https://seido.pm/api/webhooks/microsoft/${teamId}`,
      resource: '/me/mailFolders/inbox/messages',
      expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days max
      clientState: teamId
    });
  }
}
```

**⚠️ COMPLEXITÉ**: Microsoft Graph API ≠ Gmail API
- Différente structure réponses
- Différent format attachments
- Webhook expiration 3 jours (vs 7 jours Gmail)
- Nécessite application Azure AD

---

## 💰 Analyse Coûts Comparée

### Approche A (Alias)

| Poste | Coût |
|-------|------|
| Google Workspace | $12/mois |
| Supabase Storage | $0.32/mois |
| Développement (200h) | Variable |
| **TOTAL Infrastructure** | **$12.32/mois** |

**Timeline**: 8 semaines

---

### Approche B (OAuth Multi-Comptes)

| Poste | Coût |
|-------|------|
| Google Workspace | $0 (pas besoin) ✅ |
| Supabase Storage | $0.32/mois |
| Supabase Database (tokens encrypted) | Inclus Pro |
| **Développement supplémentaire** | |
| - Multi-provider abstraction | +80h |
| - Microsoft Graph API integration | +60h |
| - OAuth flow per team | +40h |
| - Token rotation system | +20h |
| **TOTAL Dev** | **+200h = 400h total** |
| **TOTAL Infrastructure** | **$0.32/mois** ✅ |

**Timeline**: 16 semaines (double)

**Économie annuelle infrastructure**: $144/an (pas de Google Workspace)
**Coût dev supplémentaire**: +200h × taux horaire

---

## ⚖️ Recommandation

### 🟢 Choisir Approche A (Alias) SI:

✅ Vous voulez **livrer rapidement** (8 semaines vs 16)
✅ Budget dev limité (200h vs 400h)
✅ 10 équipes uniquement (< 30 alias limit)
✅ **Priorité = réception emails** (pas envoi, pas calendrier)
✅ Acceptez coût fixe $12/mois

**Cas d'usage SEIDO**: ✅ **RECOMMANDÉ**
- 10 équipes actuelles
- Priorité réception emails
- Budget dev à optimiser
- Délai 8 semaines acceptable

---

### 🟡 Choisir Approche B (OAuth) SI:

✅ Budget dev confortable (+200h)
✅ Vision long-terme (envoi emails, calendrier sync)
✅ > 30 équipes futures (scaling)
✅ UX seamless prioritaire
✅ Support multi-provider obligatoire (clients Outlook)

**Cas d'usage**: Plateforme SaaS avec 100+ clients, self-service complet

---

## 🎯 Approche Hybride (Compromis)

**Phase 1 (MVP - 8 semaines)**: Approche A (Alias)
- Livrer rapidement
- Valider besoins utilisateurs
- 10 équipes pilotes

**Phase 2 (6 mois+)**: Migration vers Approche B
- Une fois MVP validé
- Si demande forte multi-provider
- Si scaling > 30 équipes

**Avantages**:
- ✅ Time-to-market rapide
- ✅ Validation product-market fit
- ✅ Migration progressive (backwards compatible)

---

## 📋 Checklist Décision

**Questions clés**:

1. **Combien d'équipes à 12 mois ?**
   - < 30 équipes → Approche A ✅
   - > 30 équipes → Approche B ou Hybride

2. **Budget dev disponible ?**
   - 200h → Approche A
   - 400h → Approche B

3. **Délai souhaité ?**
   - 2 mois → Approche A
   - 4 mois → Approche B

4. **Providers requis ?**
   - Emails forwarded OK → Approche A
   - Outlook/Gmail natif obligatoire → Approche B

5. **Fonctionnalités futures ?**
   - Réception seule → Approche A
   - Envoi emails + calendrier → Approche B

---

## 🚀 Recommandation Finale SEIDO

**CHOIX: Approche A (Alias Google Workspace)**

**Justification**:
1. ✅ **10 équipes**: Largement sous limite 30 alias
2. ✅ **Priorité réception**: Pas besoin envoi emails immédiatement
3. ✅ **Budget dev**: Économise 200h (= plusieurs semaines)
4. ✅ **Délai**: 8 semaines vs 16 semaines
5. ✅ **Simplicité maintenance**: 1 provider = moins de bugs

**Coût total**:
- Infrastructure: $12.32/mois ($148/an)
- Dev: 200h (8 semaines)

**Migration future possible**: Si besoin Approche B dans 12-24 mois, architecture permet migration progressive (tables compatibles).

---

## 📚 Ressources Approche B

Si vous choisissez quand même l'approche OAuth multi-comptes:

**Gmail API**:
- OAuth: https://developers.google.com/gmail/api/auth/web-server
- Push Notifications: https://developers.google.com/gmail/api/guides/push

**Microsoft Graph API**:
- Overview: https://learn.microsoft.com/en-us/graph/overview
- Mail API: https://learn.microsoft.com/en-us/graph/api/resources/mail-api-overview
- Webhooks: https://learn.microsoft.com/en-us/graph/webhooks
- OAuth: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow

**Libraries**:
- Gmail: `googleapis` (npm)
- Microsoft: `@microsoft/microsoft-graph-client` (npm)
- OAuth abstraction: `passport` (multi-provider)

---

**Version**: 1.0
**Auteur**: Claude Code (Anthropic)
**Statut**: 📊 Analyse Comparative
