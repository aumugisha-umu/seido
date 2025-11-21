# Approche IMAP/POP3 - La Solution Simple pour SEIDO

**Date**: 2025-11-04
**Type**: Architecture Alternative (Approche C)

---

## 🎯 Votre Question

> "Ce n'est pas possible de faire ça plus simplement avec une connexion SMTP qui permet d'utiliser n'importe quel email ?"

**Réponse**: Presque ! Vous pensez à **IMAP** (pas SMTP).

### Clarification Protocoles

| Protocole | Usage | Direction |
|-----------|-------|-----------|
| **SMTP** | **Envoyer** emails | App → Server email |
| **IMAP** | **Recevoir** emails (sync) | Server email → App ✅ |
| **POP3** | **Recevoir** emails (download) | Server email → App ✅ |

**Pour votre besoin (réception)**: IMAP ou POP3 ✅

---

## 📊 Approche C: IMAP Multi-Comptes

### Principe

```
┌──────────────────┐
│ User Gmail/Outlook│
│ username@gmail.com│
└────────┬─────────┘
         │
         │ IMAP Connection (user/password)
         ▼
┌──────────────────┐
│  SEIDO Backend   │ ◄── Poll IMAP every 2-5 minutes
│  (Polling Cron)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   PostgreSQL     │
│  emails table    │
└──────────────────┘
```

### Configuration Utilisateur

```typescript
// Équipe connecte sa boîte email avec credentials IMAP
interface TeamEmailConnection {
  team_id: string;
  email_address: string;

  // IMAP config
  imap_host: string;        // imap.gmail.com
  imap_port: number;        // 993 (SSL)
  imap_username: string;    // email address
  imap_password_encrypted: string; // App password (encrypted)

  // Sync state
  last_sync_at: string;
  last_uid: number;         // Last processed email UID
}
```

### Exemples Configurations Providers

| Provider | IMAP Host | Port | Sécurité |
|----------|-----------|------|----------|
| **Gmail** | imap.gmail.com | 993 | SSL ✅ |
| **Outlook** | outlook.office365.com | 993 | SSL ✅ |
| **Yahoo** | imap.mail.yahoo.com | 993 | SSL ✅ |
| **OVH** | ssl0.ovh.net | 993 | SSL ✅ |
| **Autre** | Custom IMAP server | 993/143 | SSL/TLS |

**✅ Fonctionne avec 99% des providers email existants !**

---

## 🔧 Implémentation Technique

### 1. Base de Données

```sql
CREATE TABLE team_email_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Email config
  email_address VARCHAR(255) NOT NULL,
  provider VARCHAR(50), -- 'gmail', 'outlook', 'other'

  -- IMAP credentials (ENCRYPTED!)
  imap_host VARCHAR(255) NOT NULL,
  imap_port INT DEFAULT 993,
  imap_username VARCHAR(255) NOT NULL,
  imap_password_encrypted TEXT NOT NULL, -- AES-256 encryption
  imap_use_ssl BOOLEAN DEFAULT TRUE,

  -- Sync state
  last_sync_at TIMESTAMPTZ,
  last_uid BIGINT DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_team_email_connections_team_id
ON team_email_connections(team_id) WHERE is_active = TRUE;
```

### 2. Service IMAP

```typescript
// lib/services/imap-email.service.ts
import Imap from 'imap';
import { simpleParser } from 'mailparser';

export class ImapEmailService {
  private imap: Imap;

  constructor(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    tls: boolean;
  }) {
    this.imap = new Imap({
      user: config.user,
      password: config.password,
      host: config.host,
      port: config.port,
      tls: config.tls,
      tlsOptions: { rejectUnauthorized: false }
    });
  }

  /**
   * Fetch new emails since last sync
   */
  async fetchNewEmails(lastUid: number): Promise<ParsedEmail[]> {
    return new Promise((resolve, reject) => {
      const emails: ParsedEmail[] = [];

      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) return reject(err);

          // Search emails with UID > lastUid
          const searchCriteria = [['UID', `${lastUid + 1}:*`]];

          this.imap.search(searchCriteria, (err, uids) => {
            if (err) return reject(err);
            if (!uids || uids.length === 0) {
              this.imap.end();
              return resolve([]);
            }

            const fetch = this.imap.fetch(uids, {
              bodies: '',
              struct: true
            });

            fetch.on('message', (msg, seqno) => {
              msg.on('body', async (stream, info) => {
                const parsed = await simpleParser(stream);
                emails.push({
                  uid: info.attrs.uid,
                  ...parsed
                });
              });
            });

            fetch.once('end', () => {
              this.imap.end();
              resolve(emails);
            });

            fetch.once('error', reject);
          });
        });
      });

      this.imap.once('error', reject);
      this.imap.connect();
    });
  }

  /**
   * Mark email as read
   */
  async markAsRead(uid: number) {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.imap.openBox('INBOX', false, (err) => {
          if (err) return reject(err);

          this.imap.setFlags(uid, ['\\Seen'], (err) => {
            this.imap.end();
            err ? reject(err) : resolve(true);
          });
        });
      });

      this.imap.connect();
    });
  }
}
```

### 3. Cron Job Polling

```typescript
// app/api/cron/sync-emails/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = await createServerSupabaseClient();

  // Get all active email connections
  const { data: connections } = await supabase
    .from('team_email_connections')
    .select('*')
    .eq('is_active', true);

  const results = [];

  for (const connection of connections || []) {
    try {
      // Decrypt password
      const password = await decryptPassword(connection.imap_password_encrypted);

      // Connect IMAP
      const imapService = new ImapEmailService({
        host: connection.imap_host,
        port: connection.imap_port,
        user: connection.imap_username,
        password,
        tls: connection.imap_use_ssl
      });

      // Fetch new emails
      const newEmails = await imapService.fetchNewEmails(connection.last_uid);

      // Store in database
      const emailRepo = new EmailRepository(supabase);
      let maxUid = connection.last_uid;

      for (const email of newEmails) {
        await emailRepo.create({
          team_id: connection.team_id,
          from_address: email.from.value[0].address,
          subject: email.subject,
          body_text: email.text,
          body_html: email.html,
          received_at: email.date.toISOString()
        });

        maxUid = Math.max(maxUid, email.uid);
      }

      // Update last sync
      await supabase
        .from('team_email_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          last_uid: maxUid,
          last_error: null
        })
        .eq('id', connection.id);

      results.push({
        team_id: connection.team_id,
        synced: newEmails.length
      });

    } catch (error) {
      // Log error, continue with other connections
      await supabase
        .from('team_email_connections')
        .update({ last_error: error.message })
        .eq('id', connection.id);

      results.push({
        team_id: connection.team_id,
        error: error.message
      });
    }
  }

  return Response.json({
    success: true,
    results
  });
}
```

**Configuration Vercel Cron**:
```json
{
  "crons": [{
    "path": "/api/cron/sync-emails",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

### 4. UI Configuration

```typescript
// app/gestionnaire/settings/emails/page.tsx
'use client';

export default function EmailSettingsPage() {
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'other'>('gmail');

  const handleConnect = async (formData: FormData) => {
    const response = await fetch('/api/team/email-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_address: formData.get('email'),
        provider,
        imap_host: formData.get('imap_host'),
        imap_port: parseInt(formData.get('imap_port')),
        imap_username: formData.get('username'),
        imap_password: formData.get('password')
      })
    });

    if (response.ok) {
      toast.success('Email connecté avec succès !');
    }
  };

  return (
    <div>
      <h1>Connecter une boîte email</h1>

      <form onSubmit={handleConnect}>
        {/* Provider selector */}
        <Select value={provider} onValueChange={setProvider}>
          <option value="gmail">Gmail</option>
          <option value="outlook">Outlook</option>
          <option value="other">Autre provider</option>
        </Select>

        {/* Auto-filled config based on provider */}
        {provider === 'gmail' && (
          <>
            <Input name="email" placeholder="votre.email@gmail.com" />
            <Input type="hidden" name="imap_host" value="imap.gmail.com" />
            <Input type="hidden" name="imap_port" value="993" />
            <Input name="username" placeholder="votre.email@gmail.com" />
            <Input
              type="password"
              name="password"
              placeholder="Mot de passe d'application Gmail"
            />
            <Alert>
              <Info className="h-4 w-4" />
              Générez un mot de passe d'application Gmail :
              <a href="https://myaccount.google.com/apppasswords" target="_blank">
                Cliquez ici
              </a>
            </Alert>
          </>
        )}

        {provider === 'outlook' && (
          <>
            <Input name="email" placeholder="votre.email@outlook.com" />
            <Input type="hidden" name="imap_host" value="outlook.office365.com" />
            <Input type="hidden" name="imap_port" value="993" />
            <Input name="username" placeholder="votre.email@outlook.com" />
            <Input type="password" name="password" placeholder="Mot de passe" />
          </>
        )}

        {provider === 'other' && (
          <>
            <Input name="email" placeholder="Email" />
            <Input name="imap_host" placeholder="imap.example.com" />
            <Input name="imap_port" type="number" defaultValue={993} />
            <Input name="username" placeholder="Username" />
            <Input type="password" name="password" placeholder="Password" />
          </>
        )}

        <Button type="submit">Connecter</Button>
      </form>
    </div>
  );
}
```

---

## 📊 Comparaison 3 Approches

| Critère | A: Alias Google | B: OAuth Multi-Comptes | C: IMAP Multi-Comptes |
|---------|----------------|------------------------|----------------------|
| **COMPLEXITÉ** |
| Setup initial | 🟡 Moyenne | 🔴 Élevée | 🟢 Simple |
| Backend code | 🟢 Simple | 🔴 Complexe | 🟢 Simple |
| Multi-provider | ❌ Forward only | 🟢 Gmail+Outlook natif | 🟢 Tous providers IMAP |
| **COÛTS** |
| Infrastructure | 🔴 $12/mois | �� $0.32/mois | 🟢 $0.32/mois |
| Développement | 🟢 200h | 🔴 400h | 🟢 150h |
| **PERFORMANCE** |
| Latence réception | 🟢 < 5s (push) | 🟢 < 5s (push) | 🔴 2-5 min (polling) |
| Scalabilité | 🔴 30 équipes max | 🟢 Illimité | 🟢 Illimité |
| Quotas API | 🟢 Pas de risque | 🔴 Risque quotas | 🟡 Rate limiting IMAP |
| **UX UTILISATEUR** |
| Onboarding | 🔴 Forward manuel | 🟢 OAuth seamless | 🟡 Username/password |
| Sécurité credentials | 🟢 Aucun stocké | 🟢 OAuth tokens | 🟡 Password app stocké |
| Self-service | 🔴 Admin crée alias | 🟢 Self-service | 🟢 Self-service |
| **SÉCURITÉ** |
| Authentication | 🟢 Forward (safe) | 🟢 OAuth 2.0 | 🟡 App passwords |
| Permissions | 🟢 Read-only | 🟢 Scoped | 🔴 Full access |
| Révocation | 🟡 Désactiver alias | 🟢 User révoque OAuth | 🟢 Delete password |
| **FONCTIONNALITÉS** |
| Envoi emails | ❌ Non | ✅ Oui (OAuth) | ✅ Oui (SMTP) |
| Real-time | ✅ Oui (push) | ✅ Oui (push) | ❌ Non (polling) |
| Calendrier sync | ❌ Non | ✅ Oui | ❌ Non |

---

## 💰 Coûts Détaillés Approche IMAP

### Infrastructure

| Service | Usage | Coût Mensuel |
|---------|-------|--------------|
| Supabase Database | Encrypted passwords | $0 (inclus Pro) |
| Supabase Storage | Attachments | $0.32 |
| Vercel Cron | Polling every 5 min | $0 (inclus) |
| **TOTAL** | | **$0.32/mois** |

**💰 Coût annuel**: $3.84 (vs $148 avec Alias Google Workspace)

### Développement

| Phase | Heures |
|-------|--------|
| IMAP service implementation | 40h |
| Cron polling job | 20h |
| UI configuration | 30h |
| Database schema | 10h |
| Encryption/security | 20h |
| Testing | 30h |
| **TOTAL** | **150h** |

**vs 200h (Alias) et 400h (OAuth)**

---

## ⚖️ Avantages / Inconvénients IMAP

### ✅ Avantages

1. **Simplicité implémentation**
   - Librairie `imap` bien documentée
   - Pas d'APIs complexes (Gmail, Microsoft Graph)
   - Pas de webhooks à gérer

2. **Universel**
   - Fonctionne avec **TOUS** les providers email
   - Gmail, Outlook, Yahoo, OVH, custom IMAP
   - Pas limité à 2-3 providers

3. **Coût très faible**
   - $0.32/mois (pas de Google Workspace)
   - Économie: $144/an vs Alias

4. **Self-service complet**
   - User configure lui-même
   - Pas besoin admin SEIDO créé alias

5. **Développement rapide**
   - 150h vs 200h (Alias) vs 400h (OAuth)
   - Moins de code complexe

### ❌ Inconvénients

1. **Latence réception** 🔴
   - Polling every 5 minutes (vs push < 5s)
   - Email peut prendre 2-5 min pour apparaître
   - Pas de real-time

2. **Sécurité passwords**
   - Stockage password app (encrypted)
   - Moins sécurisé qu'OAuth 2.0
   - Risque si breach database

3. **Performance**
   - 10 connexions IMAP simultanées every 5 min
   - Consomme resources serveur
   - Scaling > 100 connexions = problème

4. **Rate limiting**
   - Gmail limite: 2500 IMAP requests/day/user
   - Outlook limite similaire
   - Risque blocage si polling trop fréquent

5. **Pas d'autres features**
   - Pas de calendrier sync
   - Pas d'envoi emails (besoin SMTP séparé)
   - Juste réception

---

## 🎯 Recommandation Finale

### Pour SEIDO (10 équipes, 200 emails/jour)

**CHOIX: Approche C (IMAP)** ✅✅✅

**Justification**:

1. ✅ **Plus simple que les 3 approches**
   - 150h dev (vs 200h Alias, 400h OAuth)
   - Pas de Google Workspace requis
   - Pas d'APIs complexes

2. ✅ **Coût ultra-faible**
   - $0.32/mois (économie $144/an vs Alias)
   - ROI immédiat

3. ✅ **Universel**
   - Fonctionne avec tous providers
   - Pas limité Gmail/Outlook

4. ✅ **Self-service**
   - User configure lui-même
   - Meilleure UX qu'Alias

5. ⚠️ **Latence acceptable** (2-5 min)
   - Pour gestion immobilière, pas critique
   - Emails urgents = téléphone anyway

6. ✅ **Scalable jusqu'à 50-100 équipes**
   - Au-delà, migrer vers OAuth push

### Comparaison Finale

| Approche | Dev | Coût/mois | Latency | Complexité | **Score** |
|----------|-----|-----------|---------|------------|-----------|
| A: Alias | 200h | $12.32 | < 5s | Moyenne | 🟡🟡🟡 |
| B: OAuth | 400h | $0.32 | < 5s | Élevée | 🟡🟡 |
| **C: IMAP** | **150h** | **$0.32** | 2-5 min | Simple | **🟢🟢🟢🟢** |

---

## 🚀 Plan d'Implémentation IMAP

### Phase 1: Backend (Semaine 1-2)

**Jour 1-3**: IMAP Service
- [ ] Installer librairie `imap` + `mailparser`
- [ ] Implémenter `ImapEmailService`
- [ ] Tests connexion Gmail/Outlook

**Jour 4-5**: Database
- [ ] Migration `team_email_connections`
- [ ] Encryption/decryption passwords
- [ ] Tests

**Jour 6-8**: Cron Polling
- [ ] Route `/api/cron/sync-emails`
- [ ] Logique fetch + store emails
- [ ] Error handling par connection

**Jour 9-10**: Tests
- [ ] Test 3 providers (Gmail, Outlook, custom)
- [ ] Test error cases
- [ ] Performance test (10 connexions simultanées)

### Phase 2: Frontend (Semaine 3)

**Jour 1-2**: UI Configuration
- [ ] Page `/gestionnaire/settings/emails`
- [ ] Formulaire connexion IMAP
- [ ] Presets Gmail/Outlook/Autre

**Jour 3-4**: UI Liste/Détail Emails
- [ ] Réutiliser composants guide initial
- [ ] Ajuster pour IMAP (pas de real-time)

**Jour 5**: Tests E2E
- [ ] Workflow complet onboarding
- [ ] Test 3 providers

### Phase 3: Production (Semaine 4)

**Jour 1-2**: Sécurité
- [ ] Audit encryption passwords
- [ ] Test RLS policies
- [ ] Scan vulnerabilities

**Jour 3-4**: Monitoring
- [ ] Logs cron job
- [ ] Alert si errors connexions
- [ ] Dashboard admin (connexions actives)

**Jour 5**: Déploiement
- [ ] Deploy production
- [ ] Configurer Vercel Cron
- [ ] Test avec 2-3 équipes beta

**Timeline totale**: **4 semaines** (vs 8 semaines Alias, 16 semaines OAuth)

---

## 📚 Ressources IMAP

**Libraries**:
- `imap` (npm): https://www.npmjs.com/package/imap
- `node-imap` (alternative): https://www.npmjs.com/package/node-imap
- `mailparser`: https://www.npmjs.com/package/mailparser (déjà dans guide)

**IMAP Servers Config**:
- Gmail: https://support.google.com/mail/answer/7126229
- Outlook: https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353
- App Passwords Gmail: https://myaccount.google.com/apppasswords

**Encryption**:
- Node crypto: https://nodejs.org/api/crypto.html
- `crypto-js` (alternative): https://www.npmjs.com/package/crypto-js

---

## ⚠️ Seules Limitations IMAP

1. **Pas de real-time**: Polling = latence 2-5 min
   - Mitigation: Polling every 2 min pour urgences

2. **Rate limiting providers**:
   - Gmail: 2500 IMAP/day → OK pour 10 équipes
   - Outlook: Similaire

3. **Scaling limit**: ~50-100 connexions IMAP concurrent
   - Au-delà: Migrer vers OAuth push

**Pour SEIDO (10 équipes)**: Aucun problème ✅

---

**Version**: 1.0
**Auteur**: Claude Code (Anthropic)
**Recommandation**: ⭐⭐⭐⭐⭐ IMAP pour SEIDO
**Statut**: 🚀 Prêt pour implémentation
