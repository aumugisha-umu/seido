# Guide d'Intégration Email SEIDO - Approche IMAP/SMTP

**Version**: 2.0
**Date**: 2025-11-04
**Approche**: IMAP/SMTP Multi-Comptes
**Timeline**: 4 semaines
**Coût Infrastructure**: $0.32/mois

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Architecture Technique](#2-architecture-technique)
3. [Configuration Providers](#3-configuration-providers)
4. [Schéma Base de Données](#4-schéma-base-de-données)
5. [Implémentation Backend](#5-implémentation-backend)
6. [Implémentation Frontend](#6-implémentation-frontend)
7. [Sécurité & RGPD](#7-sécurité--rgpd)
8. [Roadmap 4 Semaines](#8-roadmap-4-semaines)
9. [Points Bloquants](#9-points-bloquants)
10. [Analyse Coûts](#10-analyse-coûts)
11. [Checklist Pré-Production](#11-checklist-pré-production)
12. [Ressources](#12-ressources)

---

## 1. Vue d'Ensemble

### 🎯 Objectif

Permettre aux équipes SEIDO de **connecter leurs propres boîtes email** (Gmail, Outlook, Yahoo, OVH, etc.) pour :
- ✉️ **Recevoir** les emails clients dans l'application (IMAP polling)
- 📤 **Envoyer** des réponses depuis l'application (SMTP)
- 🏢 Associer emails à des bâtiments/lots
- 🔧 Créer interventions depuis emails

### 🔄 Flux Complet (Bi-directionnel)

```
┌─────────────────────────────────────────────────────────────┐
│  Email Client (Gmail/Outlook/etc.)                          │
│  ├─ Envoie: fuite@appartement-paris.com                    │
│  └─ Reçoit: Réponse depuis SEIDO                           │
└─────────────────────────────────────────────────────────────┘
              │ IMAP              ▲ SMTP
              │ (Polling 5min)    │ (Envoi immédiat)
              ▼                   │
┌─────────────────────────────────────────────────────────────┐
│  SEIDO Backend                                              │
│  ├─ Vercel Cron (*/5 * * * *)                              │
│  │   └─ IMAP Service → Récupère nouveaux emails            │
│  │       └─ EmailRepository.createEmail()                  │
│  │           └─ PostgreSQL (table emails)                  │
│  │                                                           │
│  └─ API Route /api/emails/send                             │
│      └─ SMTP Service → Envoie via Nodemailer              │
│          └─ EmailRepository.updateEmailStatus()            │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  Frontend Gestionnaire                                      │
│  ├─ /gestionnaire/emails (Liste emails)                    │
│  ├─ /gestionnaire/emails/[id] (Détail + Répondre)         │
│  └─ /gestionnaire/settings/emails (Configuration compte)   │
└─────────────────────────────────────────────────────────────┘
```

### ✅ Avantages IMAP/SMTP

| Critère | IMAP/SMTP | OAuth Gmail API | Alias Google Workspace |
|---------|-----------|-----------------|------------------------|
| **Dev Time** | 4 semaines (150h) | 16 semaines (400h) | 8 semaines (200h) |
| **Coût** | $0.32/mois | $0.32/mois | $12.32/mois |
| **Providers** | Tous (Gmail, Outlook, Yahoo, OVH, etc.) | Gmail + Microsoft seulement | Forwarding seulement |
| **Self-service** | ✅ Oui | ✅ Oui | ❌ Admin doit créer alias |
| **Latence** | 2-5 min (polling) | < 5s (webhooks) | < 5s (webhooks) |
| **Envoi emails** | ✅ SMTP natif | ✅ Gmail API | ❌ Non supporté |
| **Complexité** | 🟢 Simple | 🔴 Élevée | 🟡 Moyenne |

### 📊 Contexte SEIDO

- **10 équipes** (gestionnaires immobiliers)
- **~200 emails/jour** (~20 par équipe)
- **Priorité**: Réception + Envoi
- **Budget dev**: 150h (4 semaines)
- **Infrastructure**: Supabase (PostgreSQL + Storage)

---

## 2. Architecture Technique

### 2.1 Stack Technologique

```typescript
// Backend
- Next.js 15 App Router (API Routes + Cron)
- Vercel Cron Jobs (polling IMAP toutes les 5 min)
- node-imap (IMAP client) - 3M downloads/semaine
- nodemailer (SMTP client) - 25M downloads/semaine
- mailparser (RFC 2822 parsing) - 10M downloads/semaine
- crypto (Node.js native - AES-256 encryption)

// Database
- Supabase PostgreSQL (tables + RLS policies)
- Supabase Storage (attachments < 5MB)

// Frontend
- React 19 + TypeScript
- Repository Pattern (EmailRepository, EmailConnectionRepository)
- shadcn/ui components
```

### 2.2 Service de Chiffrement (AES-256)

**CRITIQUE**: Les mots de passe IMAP/SMTP doivent être chiffrés en base de données.

```typescript
// lib/services/domain/encryption.service.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY!; // 32 bytes (généré une fois)
const IV_LENGTH = 16;

export class EncryptionService {
  /**
   * Chiffre un mot de passe avec AES-256-CBC
   */
  static encryptPassword(password: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Format: IV:EncryptedPassword
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Déchiffre un mot de passe
   */
  static decryptPassword(encryptedPassword: string): string {
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY, 'hex'),
      iv
    );

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Génération de la clé (UNE FOIS, à stocker dans .env)
// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Ajouter à .env.local:
// EMAIL_ENCRYPTION_KEY=64_caracteres_hexadecimaux_generes
```

### 2.3 Flux IMAP (Réception Emails)

```typescript
// app/api/cron/sync-emails/route.ts
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';

export async function GET(request: Request) {
  // 1. Récupérer toutes les connexions actives
  const supabase = await createServerSupabaseClient();
  const { data: connections } = await supabase
    .from('team_email_connections')
    .select('*')
    .eq('is_active', true);

  for (const connection of connections) {
    // 2. Déchiffrer le mot de passe IMAP
    const imapPassword = EncryptionService.decryptPassword(
      connection.imap_password_encrypted
    );

    // 3. Connexion IMAP
    const imap = new Imap({
      user: connection.imap_username,
      password: imapPassword,
      host: connection.imap_host,
      port: connection.imap_port,
      tls: connection.imap_use_ssl,
      tlsOptions: { rejectUnauthorized: false }
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) throw err;

        // 4. Chercher emails avec UID > last_uid
        const searchCriteria = ['ALL', ['UID', `${connection.last_uid + 1}:*`]];
        const fetchOptions = {
          bodies: '',
          struct: true,
          markSeen: false
        };

        imap.search(searchCriteria, (err, uids) => {
          if (err || !uids.length) return imap.end();

          const fetch = imap.fetch(uids, fetchOptions);

          fetch.on('message', (msg, seqno) => {
            msg.on('body', async (stream, info) => {
              // 5. Parser l'email avec mailparser
              const parsed = await simpleParser(stream);

              // 6. Stocker en base de données
              const emailData = {
                team_id: connection.team_id,
                email_connection_id: connection.id,
                direction: 'received',
                message_id: parsed.messageId,
                from_address: parsed.from.text,
                to_addresses: parsed.to.text.split(','),
                subject: parsed.subject,
                body_text: parsed.text,
                body_html: parsed.html,
                received_at: parsed.date
              };

              await supabase.from('emails').insert(emailData);

              // 7. Gérer les pièces jointes
              if (parsed.attachments?.length > 0) {
                for (const attachment of parsed.attachments) {
                  // Upload vers Supabase Storage
                  const { data: uploadData } = await supabase.storage
                    .from('email-attachments')
                    .upload(
                      `${connection.team_id}/${Date.now()}_${attachment.filename}`,
                      attachment.content
                    );

                  // Enregistrer métadonnées
                  await supabase.from('email_attachments').insert({
                    email_id: emailData.id,
                    filename: attachment.filename,
                    content_type: attachment.contentType,
                    size_bytes: attachment.size,
                    storage_path: uploadData.path
                  });
                }
              }
            });
          });

          fetch.once('end', () => {
            // 8. Mettre à jour last_uid
            const maxUid = Math.max(...uids);
            supabase
              .from('team_email_connections')
              .update({
                last_uid: maxUid,
                last_sync_at: new Date().toISOString()
              })
              .eq('id', connection.id);

            imap.end();
          });
        });
      });
    });

    imap.connect();
  }

  return Response.json({ success: true });
}
```

**Configuration Vercel Cron** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 2.4 Flux SMTP (Envoi Emails)

```typescript
// app/api/emails/send/route.ts
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  const { emailConnectionId, to, subject, body, inReplyToEmailId } = await request.json();

  // 1. Récupérer la connexion email
  const supabase = await createServerSupabaseClient();
  const { data: connection } = await supabase
    .from('team_email_connections')
    .select('*')
    .eq('id', emailConnectionId)
    .single();

  // 2. Déchiffrer le mot de passe SMTP
  const smtpPassword = EncryptionService.decryptPassword(
    connection.smtp_password_encrypted
  );

  // 3. Créer le transporteur Nodemailer
  const transporter = nodemailer.createTransport({
    host: connection.smtp_host,
    port: connection.smtp_port,
    secure: connection.smtp_use_tls,
    auth: {
      user: connection.smtp_username,
      pass: smtpPassword
    }
  });

  // 4. Récupérer l'email original (si réponse)
  let originalEmail = null;
  if (inReplyToEmailId) {
    const { data } = await supabase
      .from('emails')
      .select('message_id, references')
      .eq('id', inReplyToEmailId)
      .single();
    originalEmail = data;
  }

  // 5. Envoyer l'email
  const mailOptions = {
    from: connection.email_address,
    to,
    subject,
    text: body,
    html: `<p>${body.replace(/\n/g, '<br>')}</p>`,

    // Headers pour threading (conversations)
    ...(originalEmail && {
      inReplyTo: originalEmail.message_id,
      references: originalEmail.references || originalEmail.message_id
    })
  };

  const info = await transporter.sendMail(mailOptions);

  // 6. Enregistrer l'email envoyé
  const { data: sentEmail } = await supabase
    .from('emails')
    .insert({
      team_id: connection.team_id,
      email_connection_id: connection.id,
      direction: 'sent',
      message_id: info.messageId,
      from_address: connection.email_address,
      to_addresses: Array.isArray(to) ? to : [to],
      subject,
      body_text: body,
      body_html: mailOptions.html,
      sent_at: new Date().toISOString(),
      in_reply_to: inReplyToEmailId
    })
    .select()
    .single();

  return Response.json({ success: true, emailId: sentEmail.id });
}
```

---

## 3. Configuration Providers

### 3.1 Gmail

**Prérequis**: Activer la validation en 2 étapes (2FA)

#### Générer un Mot de Passe d'Application

1. **Accéder aux paramètres Google** :
   - URL : https://myaccount.google.com/security
   - Activer "Validation en 2 étapes" si pas déjà fait

2. **Créer un mot de passe d'application** :
   - URL : https://myaccount.google.com/apppasswords
   - Nom de l'application : "SEIDO Email Integration"
   - Copier le mot de passe généré (16 caractères, sans espaces)

#### Configuration IMAP/SMTP

```typescript
// Configuration Gmail
const gmailConfig = {
  provider: 'gmail',

  // IMAP (Réception)
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  imap_use_ssl: true,
  imap_username: 'votre.email@gmail.com',
  imap_password: 'abcd efgh ijkl mnop', // Mot de passe d'application

  // SMTP (Envoi)
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_username: 'votre.email@gmail.com',
  smtp_password: 'abcd efgh ijkl mnop' // Même mot de passe
};
```

**Limites Gmail** :
- **500 emails/jour** (envoi SMTP)
- **2.5 Go** d'emails stockés (quota gratuit)

---

### 3.2 Outlook.com / Hotmail

**Prérequis**: Activer la validation en 2 étapes

#### Générer un Mot de Passe d'Application

1. **Accéder aux paramètres Microsoft** :
   - URL : https://account.microsoft.com/security
   - Activer "Vérification en deux étapes"

2. **Créer un mot de passe d'application** :
   - URL : https://account.live.com/proofs/AppPassword
   - Nom : "SEIDO Email"
   - Copier le mot de passe généré

#### Configuration IMAP/SMTP

```typescript
// Configuration Outlook.com
const outlookConfig = {
  provider: 'outlook',

  // IMAP (Réception)
  imap_host: 'outlook.office365.com',
  imap_port: 993,
  imap_use_ssl: true,
  imap_username: 'votre.email@outlook.com',
  imap_password: 'mot_de_passe_application',

  // SMTP (Envoi)
  smtp_host: 'smtp.office365.com',
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_username: 'votre.email@outlook.com',
  smtp_password: 'mot_de_passe_application'
};
```

**Limites Outlook** :
- **300 emails/jour** (envoi SMTP)
- **15 Go** d'emails stockés (quota gratuit)

---

### 3.3 Yahoo Mail

**Prérequis**: Activer la validation en 2 étapes

#### Générer un Mot de Passe d'Application

1. **Accéder aux paramètres Yahoo** :
   - URL : https://login.yahoo.com/account/security
   - Activer "Vérification en deux étapes"

2. **Créer un mot de passe d'application** :
   - URL : https://login.yahoo.com/account/security/app-passwords
   - Nom : "SEIDO"
   - Copier le mot de passe généré

#### Configuration IMAP/SMTP

```typescript
// Configuration Yahoo Mail
const yahooConfig = {
  provider: 'yahoo',

  // IMAP (Réception)
  imap_host: 'imap.mail.yahoo.com',
  imap_port: 993,
  imap_use_ssl: true,
  imap_username: 'votre.email@yahoo.com',
  imap_password: 'mot_de_passe_application',

  // SMTP (Envoi)
  smtp_host: 'smtp.mail.yahoo.com',
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_username: 'votre.email@yahoo.com',
  smtp_password: 'mot_de_passe_application'
};
```

**Limites Yahoo** :
- **500 emails/jour** (envoi SMTP)
- **1 To** d'emails stockés (quota gratuit)

---

### 3.4 OVH / Hébergeurs Personnalisés

**Prérequis**: Accès au webmail ou panel d'administration

#### Trouver les Paramètres IMAP/SMTP

1. **Consulter la documentation OVH** :
   - URL : https://docs.ovh.com/fr/emails/generalites-sur-les-emails-mutualises/
   - Exemple domaine : `exemple.com`

2. **Paramètres typiques** :
   - IMAP : `ssl0.ovh.net` ou `mail.exemple.com`
   - SMTP : `ssl0.ovh.net` ou `mail.exemple.com`
   - Port IMAP : 993 (SSL) ou 143 (STARTTLS)
   - Port SMTP : 465 (SSL) ou 587 (STARTTLS)

#### Configuration IMAP/SMTP

```typescript
// Configuration OVH
const ovhConfig = {
  provider: 'ovh',

  // IMAP (Réception)
  imap_host: 'ssl0.ovh.net', // ou mail.votre-domaine.com
  imap_port: 993,
  imap_use_ssl: true,
  imap_username: 'contact@votre-domaine.com',
  imap_password: 'votre_mot_de_passe_email',

  // SMTP (Envoi)
  smtp_host: 'ssl0.ovh.net',
  smtp_port: 587,
  smtp_use_tls: true,
  smtp_username: 'contact@votre-domaine.com',
  smtp_password: 'votre_mot_de_passe_email'
};
```

**Limites OVH** :
- Variable selon l'offre (généralement 100-200 emails/heure)
- Quota stockage selon formule (5-50 Go)

---

### 3.5 Tester la Connexion

```typescript
// lib/services/domain/email-connection-test.service.ts
import Imap from 'node-imap';
import nodemailer from 'nodemailer';

export class EmailConnectionTestService {
  /**
   * Teste la connexion IMAP
   */
  static async testImapConnection(config: ImapConfig): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const imap = new Imap({
        user: config.imap_username,
        password: config.imap_password,
        host: config.imap_host,
        port: config.imap_port,
        tls: config.imap_use_ssl,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 10000,
        authTimeout: 5000
      });

      imap.once('ready', () => {
        imap.end();
        resolve({ success: true });
      });

      imap.once('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      imap.connect();
    });
  }

  /**
   * Teste la connexion SMTP
   */
  static async testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_use_tls,
        auth: {
          user: config.smtp_username,
          pass: config.smtp_password
        }
      });

      await transporter.verify();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
```

---

## 4. Schéma Base de Données

### 4.1 Table `team_email_connections`

**Stocke les identifiants IMAP/SMTP chiffrés par équipe**

```sql
-- supabase/migrations/20251104000001_create_email_tables.sql

CREATE TABLE team_email_connections (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Informations générales
  provider VARCHAR(50) NOT NULL, -- 'gmail' | 'outlook' | 'yahoo' | 'ovh' | 'custom'
  email_address VARCHAR(255) NOT NULL,

  -- Configuration IMAP (Réception)
  imap_host VARCHAR(255) NOT NULL,
  imap_port INT NOT NULL DEFAULT 993,
  imap_use_ssl BOOLEAN DEFAULT TRUE,
  imap_username VARCHAR(255) NOT NULL,
  imap_password_encrypted TEXT NOT NULL, -- AES-256 encrypted

  -- Configuration SMTP (Envoi)
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INT NOT NULL DEFAULT 587,
  smtp_use_tls BOOLEAN DEFAULT TRUE,
  smtp_username VARCHAR(255) NOT NULL,
  smtp_password_encrypted TEXT NOT NULL, -- AES-256 encrypted

  -- État de synchronisation
  last_uid BIGINT DEFAULT 0, -- Dernier UID IMAP récupéré
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  last_error TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT unique_email_per_team UNIQUE (team_id, email_address)
);

-- Index pour performances
CREATE INDEX idx_team_email_connections_team_id ON team_email_connections(team_id);
CREATE INDEX idx_team_email_connections_is_active ON team_email_connections(is_active) WHERE is_active = TRUE;

-- Trigger pour updated_at
CREATE TRIGGER update_team_email_connections_updated_at
  BEFORE UPDATE ON team_email_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE team_email_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their email connections"
  ON team_email_connections FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can insert email connections"
  ON team_email_connections FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "Team managers can update their email connections"
  ON team_email_connections FOR UPDATE
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can delete their email connections"
  ON team_email_connections FOR DELETE
  USING (is_team_manager(team_id));
```

### 4.2 Table `emails`

**Stocke les emails reçus et envoyés**

```sql
CREATE TYPE email_direction AS ENUM ('received', 'sent');
CREATE TYPE email_status AS ENUM ('unread', 'read', 'archived', 'deleted');

CREATE TABLE emails (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email_connection_id UUID REFERENCES team_email_connections(id) ON DELETE SET NULL,

  -- Métadonnées email
  direction email_direction NOT NULL,
  status email_status DEFAULT 'unread',

  -- En-têtes RFC 2822
  message_id VARCHAR(500), -- Message-ID header
  in_reply_to UUID REFERENCES emails(id), -- Thread parent
  references TEXT, -- References header (threading)

  -- Expéditeur / Destinataires
  from_address VARCHAR(500) NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  bcc_addresses TEXT[],

  -- Contenu
  subject VARCHAR(1000) NOT NULL,
  body_text TEXT,
  body_html TEXT,

  -- Relations SEIDO
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,

  -- Dates
  received_at TIMESTAMPTZ, -- Pour emails reçus
  sent_at TIMESTAMPTZ, -- Pour emails envoyés
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Recherche plein texte (français)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(from_address, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(body_text, '')), 'C')
  ) STORED
);

-- Index pour performances
CREATE INDEX idx_emails_team_id ON emails(team_id);
CREATE INDEX idx_emails_direction ON emails(direction);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_in_reply_to ON emails(in_reply_to) WHERE in_reply_to IS NOT NULL;
CREATE INDEX idx_emails_building_id ON emails(building_id) WHERE building_id IS NOT NULL;
CREATE INDEX idx_emails_lot_id ON emails(lot_id) WHERE lot_id IS NOT NULL;
CREATE INDEX idx_emails_intervention_id ON emails(intervention_id) WHERE intervention_id IS NOT NULL;

-- Index de recherche plein texte
CREATE INDEX idx_emails_search_vector ON emails USING GIN(search_vector);

-- RLS Policies
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their emails"
  ON emails FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can insert emails"
  ON emails FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "Team managers can update their emails"
  ON emails FOR UPDATE
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can delete their emails"
  ON emails FOR DELETE
  USING (is_team_manager(team_id));
```

### 4.3 Table `email_attachments`

**Stocke les pièces jointes (métadonnées + lien vers Supabase Storage)**

```sql
CREATE TABLE email_attachments (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,

  -- Métadonnées fichier
  filename VARCHAR(500) NOT NULL,
  content_type VARCHAR(200),
  size_bytes INT NOT NULL,

  -- Stockage Supabase
  storage_path TEXT NOT NULL, -- Chemin dans le bucket 'email-attachments'

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);

-- RLS Policies (hérite de la table emails)
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view attachments of their emails"
  ON email_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM emails
      WHERE emails.id = email_attachments.email_id
        AND is_team_manager(emails.team_id)
    )
  );
```

### 4.4 Table `email_blacklist`

**Gère les expéditeurs blacklistés par équipe**

**Fonctionnalité** : Permet aux équipes de marquer des emails comme "non pertinents" avec deux options :
1. **Soft delete** : Masquer cet email uniquement (champ `deleted_at` dans `emails`)
2. **Blacklist** : Bloquer tous les futurs emails de cet expéditeur (table `email_blacklist`)

```sql
-- Migration: 20251105000002_create_email_blacklist.sql

-- Ajouter le champ deleted_at à la table emails pour soft delete
ALTER TABLE emails ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index pour filtrer les emails non supprimés
CREATE INDEX idx_emails_deleted_at ON emails(deleted_at) WHERE deleted_at IS NULL;

-- Table de blacklist des expéditeurs
CREATE TABLE email_blacklist (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Expéditeur blacklisté
  sender_email VARCHAR(500) NOT NULL,  -- Email exact à bloquer
  sender_domain VARCHAR(255),          -- Domaine à bloquer (optionnel, pour bloquer @example.com)

  -- Métadonnées
  reason TEXT,                         -- Raison du blocage (optionnel)
  blocked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Qui a bloqué
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT unique_blacklist_per_team UNIQUE (team_id, sender_email)
);

-- Index pour performances (vérification rapide lors de la synchronisation IMAP)
CREATE INDEX idx_email_blacklist_team_id ON email_blacklist(team_id);
CREATE INDEX idx_email_blacklist_sender_email ON email_blacklist(sender_email);
CREATE INDEX idx_email_blacklist_sender_domain ON email_blacklist(sender_domain) WHERE sender_domain IS NOT NULL;

-- RLS Policies
ALTER TABLE email_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their blacklist"
  ON email_blacklist FOR SELECT
  USING (is_team_manager(team_id));

CREATE POLICY "Team managers can insert blacklist entries"
  ON email_blacklist FOR INSERT
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "Team managers can delete blacklist entries"
  ON email_blacklist FOR DELETE
  USING (is_team_manager(team_id));

-- Fonction pour vérifier si un expéditeur est blacklisté
CREATE OR REPLACE FUNCTION is_sender_blacklisted(
  p_team_id UUID,
  p_sender_email VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_sender_domain VARCHAR;
BEGIN
  -- Extraire le domaine de l'email (tout après @)
  v_sender_domain := SUBSTRING(p_sender_email FROM '@(.*)$');

  -- Vérifier si l'email exact est blacklisté
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE team_id = p_team_id
      AND sender_email = p_sender_email
  ) THEN
    RETURN TRUE;
  END IF;

  -- Vérifier si le domaine est blacklisté
  IF EXISTS (
    SELECT 1 FROM email_blacklist
    WHERE team_id = p_team_id
      AND sender_domain = v_sender_domain
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

**Workflow Blacklist** :

1. **Marquer un email comme non pertinent (Soft Delete)** :
   ```sql
   UPDATE emails
   SET deleted_at = NOW()
   WHERE id = '...';
   ```

2. **Blacklister un expéditeur (Hard Block)** :
   ```sql
   -- Soft delete l'email actuel
   UPDATE emails SET deleted_at = NOW() WHERE id = '...';

   -- Ajouter à la blacklist
   INSERT INTO email_blacklist (team_id, sender_email, reason, blocked_by_user_id)
   VALUES (
     'team_uuid',
     'spam@example.com',
     'Emails promotionnels non sollicités',
     'user_uuid'
   );
   ```

3. **Lors de la synchronisation IMAP, ignorer les emails blacklistés** :
   ```typescript
   // Dans ImapService.fetchNewEmails()
   const isBlacklisted = await supabase
     .rpc('is_sender_blacklisted', {
       p_team_id: connection.team_id,
       p_sender_email: parsed.from
     })

   if (isBlacklisted) {
     // Ne pas insérer cet email en base de données
     continue;
   }
   ```

### 4.5 Migrations TypeScript Types

Après application des migrations (tables + blacklist), générer les types TypeScript :

```bash
npm run supabase:types
```

**Types générés** (`lib/database.types.ts`) :

```typescript
export type EmailDirection = 'received' | 'sent';
export type EmailStatus = 'unread' | 'read' | 'archived' | 'deleted';

export interface TeamEmailConnection {
  id: string;
  team_id: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'ovh' | 'custom';
  email_address: string;

  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
  imap_password_encrypted: string;

  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_username: string;
  smtp_password_encrypted: string;

  last_uid: number;
  last_sync_at: string | null;
  is_active: boolean;
  last_error: string | null;

  created_at: string;
  updated_at: string;
}

export interface Email {
  id: string;
  team_id: string;
  email_connection_id: string | null;

  direction: EmailDirection;
  status: EmailStatus;

  message_id: string | null;
  in_reply_to: string | null;
  references: string | null;

  from_address: string;
  to_addresses: string[];
  cc_addresses: string[] | null;
  bcc_addresses: string[] | null;

  subject: string;
  body_text: string | null;
  body_html: string | null;

  building_id: string | null;
  lot_id: string | null;
  intervention_id: string | null;

  received_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  filename: string;
  content_type: string | null;
  size_bytes: number;
  storage_path: string;
  created_at: string;
}

export interface EmailBlacklist {
  id: string;
  team_id: string;
  sender_email: string;
  sender_domain: string | null;
  reason: string | null;
  blocked_by_user_id: string | null;
  created_at: string;
}
```

**Note**: Le champ `deleted_at` est ajouté à l'interface `Email` existante après génération des types.

---

## 5. Implémentation Backend

### 5.1 Repository Pattern

#### EmailConnectionRepository

```typescript
// lib/services/repositories/email-connection.repository.ts
import { BaseRepository } from '../core/base-repository';
import { TeamEmailConnection } from '@/lib/database.types';
import { EncryptionService } from '../domain/encryption.service';

export interface CreateEmailConnectionDTO {
  team_id: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'ovh' | 'custom';
  email_address: string;

  imap_host: string;
  imap_port: number;
  imap_use_ssl: boolean;
  imap_username: string;
  imap_password: string; // Plain text (will be encrypted)

  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_username: string;
  smtp_password: string; // Plain text (will be encrypted)
}

export class EmailConnectionRepository extends BaseRepository<TeamEmailConnection> {
  constructor(supabaseClient: SupabaseClient) {
    super(supabaseClient, 'team_email_connections');
  }

  /**
   * Crée une nouvelle connexion email (avec chiffrement automatique)
   */
  async createConnection(dto: CreateEmailConnectionDTO): Promise<TeamEmailConnection> {
    const encrypted = {
      ...dto,
      imap_password_encrypted: EncryptionService.encryptPassword(dto.imap_password),
      smtp_password_encrypted: EncryptionService.encryptPassword(dto.smtp_password),
    };

    // Supprimer les mots de passe en clair
    const { imap_password, smtp_password, ...safeData } = encrypted;

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(safeData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Récupère toutes les connexions actives (pour le cron job)
   */
  async getActiveConnections(): Promise<TeamEmailConnection[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }

  /**
   * Récupère les connexions d'une équipe
   */
  async getConnectionsByTeam(teamId: string): Promise<TeamEmailConnection[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Met à jour le last_uid après synchronisation
   */
  async updateLastUid(connectionId: string, lastUid: number): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        last_uid: lastUid,
        last_sync_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', connectionId);

    if (error) throw error;
  }

  /**
   * Enregistre une erreur de synchronisation
   */
  async recordError(connectionId: string, errorMessage: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({
        last_error: errorMessage,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (error) throw error;
  }
}
```

#### EmailRepository

```typescript
// lib/services/repositories/email.repository.ts
import { BaseRepository } from '../core/base-repository';
import { Email, EmailAttachment } from '@/lib/database.types';

export interface CreateEmailDTO {
  team_id: string;
  email_connection_id?: string;
  direction: 'received' | 'sent';

  message_id?: string;
  in_reply_to?: string;
  references?: string;

  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];

  subject: string;
  body_text?: string;
  body_html?: string;

  received_at?: string;
  sent_at?: string;
}

export class EmailRepository extends BaseRepository<Email> {
  constructor(supabaseClient: SupabaseClient) {
    super(supabaseClient, 'emails');
  }

  /**
   * Crée un nouvel email
   */
  async createEmail(dto: CreateEmailDTO): Promise<Email> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Récupère les emails d'une équipe (avec pagination)
   */
  async getEmailsByTeam(
    teamId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: 'unread' | 'read' | 'archived';
      direction?: 'received' | 'sent';
    }
  ): Promise<Email[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .order('received_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.direction) {
      query = query.eq('direction', options.direction);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Recherche plein texte
   */
  async searchEmails(teamId: string, query: string): Promise<Email[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .textSearch('search_vector', query, {
        type: 'websearch',
        config: 'french'
      })
      .order('received_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Marque un email comme lu
   */
  async markAsRead(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ status: 'read' })
      .eq('id', emailId);

    if (error) throw error;
  }

  /**
   * Associe un email à un bâtiment
   */
  async linkToBuilding(emailId: string, buildingId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ building_id: buildingId })
      .eq('id', emailId);

    if (error) throw error;
  }

  /**
   * Récupère les pièces jointes d'un email
   */
  async getAttachments(emailId: string): Promise<EmailAttachment[]> {
    const { data, error } = await this.supabase
      .from('email_attachments')
      .select('*')
      .eq('email_id', emailId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Soft delete un email (marqué comme supprimé mais reste en DB)
   */
  async softDeleteEmail(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', emailId);

    if (error) throw error;
  }

  /**
   * Restaurer un email soft-deleted
   */
  async restoreEmail(emailId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .update({ deleted_at: null })
      .eq('id', emailId);

    if (error) throw error;
  }
}
```

#### EmailBlacklistRepository

```typescript
// lib/services/repositories/email-blacklist.repository.ts
import { BaseRepository } from '../core/base-repository';
import { EmailBlacklist } from '@/lib/database.types';

export interface CreateBlacklistEntryDTO {
  team_id: string;
  sender_email: string;
  sender_domain?: string;
  reason?: string;
  blocked_by_user_id: string;
}

export class EmailBlacklistRepository extends BaseRepository<EmailBlacklist> {
  constructor(supabaseClient: SupabaseClient) {
    super(supabaseClient, 'email_blacklist');
  }

  /**
   * Ajoute un expéditeur à la blacklist
   */
  async addToBlacklist(dto: CreateBlacklistEntryDTO): Promise<EmailBlacklist> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(dto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Vérifie si un expéditeur est blacklisté
   */
  async isBlacklisted(teamId: string, senderEmail: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('is_sender_blacklisted', {
        p_team_id: teamId,
        p_sender_email: senderEmail
      });

    if (error) throw error;
    return data || false;
  }

  /**
   * Récupère toute la blacklist d'une équipe
   */
  async getTeamBlacklist(teamId: string): Promise<EmailBlacklist[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Retire un expéditeur de la blacklist
   */
  async removeFromBlacklist(blacklistId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', blacklistId);

    if (error) throw error;
  }

  /**
   * Retire un expéditeur de la blacklist par email
   */
  async removeByEmail(teamId: string, senderEmail: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('team_id', teamId)
      .eq('sender_email', senderEmail);

    if (error) throw error;
  }
}
```

### 5.2 IMAP Service

```typescript
// lib/services/domain/imap.service.ts
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { EncryptionService } from './encryption.service';
import { TeamEmailConnection } from '@/lib/database.types';

export interface ParsedEmail {
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  date: Date;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
}

export class ImapService {
  /**
   * Récupère les nouveaux emails depuis un compte IMAP
   */
  static async fetchNewEmails(
    connection: TeamEmailConnection
  ): Promise<ParsedEmail[]> {
    return new Promise((resolve, reject) => {
      const password = EncryptionService.decryptPassword(
        connection.imap_password_encrypted
      );

      const imap = new Imap({
        user: connection.imap_username,
        password,
        host: connection.imap_host,
        port: connection.imap_port,
        tls: connection.imap_use_ssl,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 10000
      });

      const emails: ParsedEmail[] = [];

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            imap.end();
            return reject(err);
          }

          // Chercher emails avec UID > last_uid
          const searchCriteria = ['ALL', ['UID', `${connection.last_uid + 1}:*`]];

          imap.search(searchCriteria, (err, uids) => {
            if (err || !uids || uids.length === 0) {
              imap.end();
              return resolve(emails);
            }

            const fetch = imap.fetch(uids, {
              bodies: '',
              struct: true,
              markSeen: false
            });

            fetch.on('message', (msg, seqno) => {
              msg.on('body', async (stream, info) => {
                try {
                  const parsed = await simpleParser(stream);

                  emails.push({
                    messageId: parsed.messageId || `${Date.now()}-${seqno}`,
                    from: parsed.from?.text || '',
                    to: parsed.to?.text.split(',').map(t => t.trim()) || [],
                    subject: parsed.subject || '(Pas de sujet)',
                    text: parsed.text || '',
                    html: parsed.html || '',
                    date: parsed.date || new Date(),
                    attachments: parsed.attachments?.map(att => ({
                      filename: att.filename || 'unnamed',
                      contentType: att.contentType,
                      size: att.size,
                      content: att.content
                    })) || []
                  });
                } catch (parseError) {
                  console.error('Error parsing email:', parseError);
                }
              });
            });

            fetch.once('error', (err) => {
              imap.end();
              reject(err);
            });

            fetch.once('end', () => {
              imap.end();
              resolve(emails);
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(err);
      });

      imap.connect();
    });
  }
}
```

### 5.3 SMTP Service

```typescript
// lib/services/domain/smtp.service.ts
import nodemailer from 'nodemailer';
import { EncryptionService } from './encryption.service';
import { TeamEmailConnection } from '@/lib/database.types';

export interface SendEmailDTO {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string; // Message-ID de l'email original
  references?: string; // Pour threading
}

export class SmtpService {
  /**
   * Envoie un email via SMTP
   */
  static async sendEmail(
    connection: TeamEmailConnection,
    emailData: SendEmailDTO
  ): Promise<{ messageId: string }> {
    const password = EncryptionService.decryptPassword(
      connection.smtp_password_encrypted
    );

    const transporter = nodemailer.createTransport({
      host: connection.smtp_host,
      port: connection.smtp_port,
      secure: connection.smtp_use_tls,
      auth: {
        user: connection.smtp_username,
        pass: password
      }
    });

    const info = await transporter.sendMail({
      from: connection.email_address,
      to: emailData.to,
      cc: emailData.cc,
      bcc: emailData.bcc,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html || `<p>${emailData.text.replace(/\n/g, '<br>')}</p>`,
      inReplyTo: emailData.inReplyTo,
      references: emailData.references
    });

    return { messageId: info.messageId };
  }
}
```

### 5.4 API Routes

#### Cron Job (Synchronisation IMAP)

```typescript
// app/api/cron/sync-emails/route.ts
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { ImapService } from '@/lib/services/domain/imap.service';

export async function GET(request: Request) {
  try {
    // Vérifier le token Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();
    const emailConnectionRepo = new EmailConnectionRepository(supabase);
    const emailRepo = new EmailRepository(supabase);

    // Récupérer toutes les connexions actives
    const connections = await emailConnectionRepo.getActiveConnections();

    const results = [];

    for (const connection of connections) {
      try {
        // Récupérer les nouveaux emails
        const parsedEmails = await ImapService.fetchNewEmails(connection);

        for (const parsed of parsedEmails) {
          // Insérer l'email en base
          const email = await emailRepo.createEmail({
            team_id: connection.team_id,
            email_connection_id: connection.id,
            direction: 'received',
            message_id: parsed.messageId,
            from_address: parsed.from,
            to_addresses: parsed.to,
            subject: parsed.subject,
            body_text: parsed.text,
            body_html: parsed.html,
            received_at: parsed.date.toISOString()
          });

          // Gérer les pièces jointes
          if (parsed.attachments.length > 0) {
            for (const attachment of parsed.attachments) {
              // Upload vers Supabase Storage
              const filePath = `${connection.team_id}/${email.id}/${attachment.filename}`;
              const { error: uploadError } = await supabase.storage
                .from('email-attachments')
                .upload(filePath, attachment.content, {
                  contentType: attachment.contentType
                });

              if (!uploadError) {
                // Enregistrer métadonnées
                await supabase.from('email_attachments').insert({
                  email_id: email.id,
                  filename: attachment.filename,
                  content_type: attachment.contentType,
                  size_bytes: attachment.size,
                  storage_path: filePath
                });
              }
            }
          }
        }

        // Mettre à jour last_uid (si emails récupérés)
        if (parsedEmails.length > 0) {
          const maxUid = connection.last_uid + parsedEmails.length;
          await emailConnectionRepo.updateLastUid(connection.id, maxUid);
        }

        results.push({
          connectionId: connection.id,
          emailAddress: connection.email_address,
          emailsReceived: parsedEmails.length,
          success: true
        });
      } catch (error: any) {
        // Enregistrer l'erreur
        await emailConnectionRepo.recordError(connection.id, error.message);

        results.push({
          connectionId: connection.id,
          emailAddress: connection.email_address,
          error: error.message,
          success: false
        });
      }
    }

    return Response.json({
      success: true,
      connectionsProcessed: connections.length,
      results
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Configuration Vercel Cron** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-emails",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Variable d'environnement** (`.env.local`):
```bash
CRON_SECRET=votre_secret_genere_aleatoirement
```

#### Envoi d'Email

```typescript
// app/api/emails/send/route.ts
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { SmtpService } from '@/lib/services/domain/smtp.service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailConnectionId, to, subject, text, inReplyToEmailId } = body;

    const supabase = await createServerSupabaseClient();
    const emailConnectionRepo = new EmailConnectionRepository(supabase);
    const emailRepo = new EmailRepository(supabase);

    // Récupérer la connexion email
    const connection = await emailConnectionRepo.findById(emailConnectionId);
    if (!connection) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Récupérer l'email original (si réponse)
    let inReplyTo: string | undefined;
    let references: string | undefined;

    if (inReplyToEmailId) {
      const originalEmail = await emailRepo.findById(inReplyToEmailId);
      if (originalEmail) {
        inReplyTo = originalEmail.message_id || undefined;
        references = originalEmail.references || originalEmail.message_id || undefined;
      }
    }

    // Envoyer l'email via SMTP
    const { messageId } = await SmtpService.sendEmail(connection, {
      to,
      subject,
      text,
      inReplyTo,
      references
    });

    // Enregistrer l'email envoyé
    const sentEmail = await emailRepo.createEmail({
      team_id: connection.team_id,
      email_connection_id: connection.id,
      direction: 'sent',
      message_id: messageId,
      from_address: connection.email_address,
      to_addresses: Array.isArray(to) ? to : [to],
      subject,
      body_text: text,
      sent_at: new Date().toISOString(),
      in_reply_to: inReplyToEmailId
    });

    return Response.json({
      success: true,
      emailId: sentEmail.id,
      messageId
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### Test de Connexion

```typescript
// app/api/team/email-connection/test/route.ts
import { EmailConnectionTestService } from '@/lib/services/domain/email-connection-test.service';

export async function POST(request: Request) {
  try {
    const config = await request.json();

    // Tester IMAP
    const imapResult = await EmailConnectionTestService.testImapConnection({
      imap_host: config.imap_host,
      imap_port: config.imap_port,
      imap_use_ssl: config.imap_use_ssl,
      imap_username: config.imap_username,
      imap_password: config.imap_password
    });

    // Tester SMTP
    const smtpResult = await EmailConnectionTestService.testSmtpConnection({
      smtp_host: config.smtp_host,
      smtp_port: config.smtp_port,
      smtp_use_tls: config.smtp_use_tls,
      smtp_username: config.smtp_username,
      smtp_password: config.smtp_password
    });

    return Response.json({
      imap: imapResult,
      smtp: smtpResult,
      success: imapResult.success && smtpResult.success
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### API Routes Blacklist

```typescript
// app/api/emails/blacklist/route.ts
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { getServerAuthContext } from '@/lib/server-context';

/**
 * GET /api/emails/blacklist - Récupère la blacklist de l'équipe
 */
export async function GET(request: Request) {
  try {
    const { team, supabase } = await getServerAuthContext('gestionnaire');
    const blacklistRepo = new EmailBlacklistRepository(supabase);

    const blacklist = await blacklistRepo.getTeamBlacklist(team.id);

    return Response.json({ blacklist });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/emails/blacklist - Ajoute un expéditeur à la blacklist
 */
export async function POST(request: Request) {
  try {
    const { team, profile, supabase } = await getServerAuthContext('gestionnaire');
    const body = await request.json();
    const { emailId, senderEmail, reason, blockDomain } = body;

    const blacklistRepo = new EmailBlacklistRepository(supabase);
    const emailRepo = new EmailRepository(supabase);

    // Soft delete l'email actuel
    await emailRepo.softDeleteEmail(emailId);

    // Extraire le domaine si demandé
    let senderDomain: string | undefined;
    if (blockDomain) {
      const domainMatch = senderEmail.match(/@(.+)$/);
      senderDomain = domainMatch ? domainMatch[1] : undefined;
    }

    // Ajouter à la blacklist
    const blacklistEntry = await blacklistRepo.addToBlacklist({
      team_id: team.id,
      sender_email: senderEmail,
      sender_domain: senderDomain,
      reason,
      blocked_by_user_id: profile.id
    });

    return Response.json({
      success: true,
      blacklistEntry
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

```typescript
// app/api/emails/blacklist/[id]/route.ts
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailBlacklistRepository } from '@/lib/services/repositories/email-blacklist.repository';
import { getServerAuthContext } from '@/lib/server-context';

/**
 * DELETE /api/emails/blacklist/[id] - Retire un expéditeur de la blacklist
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await getServerAuthContext('gestionnaire');
    const blacklistRepo = new EmailBlacklistRepository(supabase);

    await blacklistRepo.removeFromBlacklist(params.id);

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

```typescript
// app/api/emails/[id]/soft-delete/route.ts
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { getServerAuthContext } from '@/lib/server-context';

/**
 * POST /api/emails/[id]/soft-delete - Soft delete un email
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await getServerAuthContext('gestionnaire');
    const emailRepo = new EmailRepository(supabase);

    await emailRepo.softDeleteEmail(params.id);

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/emails/[id]/soft-delete - Restaure un email soft-deleted
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { supabase } = await getServerAuthContext('gestionnaire');
    const emailRepo = new EmailRepository(supabase);

    await emailRepo.restoreEmail(params.id);

    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Modification du Cron IMAP pour blacklist

Mettre à jour le cron job pour ignorer les emails blacklistés :

```typescript
// app/api/cron/sync-emails/route.ts (ajout de la vérification blacklist)

// Dans la boucle de traitement des emails
for (const parsed of parsedEmails) {
  // Vérifier si l'expéditeur est blacklisté
  const isBlacklisted = await blacklistRepo.isBlacklisted(
    connection.team_id,
    parsed.from
  );

  if (isBlacklisted) {
    console.log(`Skipping blacklisted sender: ${parsed.from}`);
    continue; // Ne pas enregistrer cet email
  }

  // Insérer l'email en base (code existant)
  const email = await emailRepo.createEmail({
    // ... (code existant)
  });
}
```

---

## 6. Implémentation Frontend

### 6.1 Page de Configuration Email

```typescript
// app/gestionnaire/settings/emails/page.tsx
import { getServerAuthContext } from '@/lib/server-context';
import { EmailConnectionRepository } from '@/lib/services/repositories/email-connection.repository';
import { EmailConnectionsList } from './email-connections-list';
import { AddEmailConnectionButton } from './add-email-connection-button';

export default async function EmailSettingsPage() {
  const { team, supabase } = await getServerAuthContext('gestionnaire');

  const emailConnectionRepo = new EmailConnectionRepository(supabase);
  const connections = await emailConnectionRepo.getConnectionsByTeam(team.id);

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuration Email</h1>
        <p className="text-gray-600 mt-2">
          Connectez vos boîtes email pour recevoir et envoyer des emails depuis SEIDO.
        </p>
      </div>

      <EmailConnectionsList connections={connections} />

      <div className="mt-6">
        <AddEmailConnectionButton teamId={team.id} />
      </div>
    </div>
  );
}
```

### 6.2 Modal de Configuration

```typescript
// app/gestionnaire/settings/emails/add-email-connection-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PROVIDER_CONFIGS = {
  gmail: {
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_use_tls: true
  },
  outlook: {
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_use_tls: true
  },
  yahoo: {
    imap_host: 'imap.mail.yahoo.com',
    imap_port: 993,
    imap_use_ssl: true,
    smtp_host: 'smtp.mail.yahoo.com',
    smtp_port: 587,
    smtp_use_tls: true
  }
};

export function AddEmailConnectionModal({ isOpen, onClose, teamId }: Props) {
  const [provider, setProvider] = useState<keyof typeof PROVIDER_CONFIGS>('gmail');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const config = {
      ...PROVIDER_CONFIGS[provider],
      imap_username: emailAddress,
      imap_password: password,
      smtp_username: emailAddress,
      smtp_password: password
    };

    const response = await fetch('/api/team/email-connection/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await response.json();
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = async () => {
    if (!testResult?.success) {
      alert('Veuillez d\'abord tester la connexion avec succès');
      return;
    }

    const response = await fetch('/api/team/email-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: teamId,
        provider,
        email_address: emailAddress,
        ...PROVIDER_CONFIGS[provider],
        imap_username: emailAddress,
        imap_password: password,
        smtp_username: emailAddress,
        smtp_password: password
      })
    });

    if (response.ok) {
      onClose();
      window.location.reload(); // Recharger la liste
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connecter une boîte email</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Provider */}
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook / Office 365</SelectItem>
                <SelectItem value="yahoo">Yahoo Mail</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Address */}
          <div>
            <Label>Adresse Email</Label>
            <Input
              type="email"
              placeholder="votre.email@gmail.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
            />
          </div>

          {/* Password (App Password) */}
          <div>
            <Label>Mot de Passe d'Application</Label>
            <Input
              type="password"
              placeholder="abcd efgh ijkl mnop"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              {provider === 'gmail' && (
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Générer un mot de passe d'application Gmail →
                </a>
              )}
              {provider === 'outlook' && (
                <a
                  href="https://account.live.com/proofs/AppPassword"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Générer un mot de passe d'application Outlook →
                </a>
              )}
              {provider === 'yahoo' && (
                <a
                  href="https://login.yahoo.com/account/security/app-passwords"
                  target="_blank"
                  className="text-blue-600 hover:underline"
                >
                  Générer un mot de passe d'application Yahoo →
                </a>
              )}
            </p>
          </div>

          {/* Test Button */}
          <Button
            onClick={handleTestConnection}
            disabled={!emailAddress || !password || testing}
            variant="outline"
            className="w-full"
          >
            {testing ? 'Test en cours...' : 'Tester la connexion'}
          </Button>

          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              {testResult.success ? (
                <p className="text-green-700">✅ Connexion réussie (IMAP + SMTP)</p>
              ) : (
                <div className="text-red-700">
                  <p className="font-semibold">❌ Erreur de connexion</p>
                  {testResult.imap?.error && <p className="text-sm">IMAP: {testResult.imap.error}</p>}
                  {testResult.smtp?.error && <p className="text-sm">SMTP: {testResult.smtp.error}</p>}
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={!testResult?.success}
              className="flex-1"
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.3 Liste des Emails

```typescript
// app/gestionnaire/emails/page.tsx
import { getServerAuthContext } from '@/lib/server-context';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { EmailList } from './email-list';

export default async function EmailsPage() {
  const { team, supabase } = await getServerAuthContext('gestionnaire');

  const emailRepo = new EmailRepository(supabase);
  const emails = await emailRepo.getEmailsByTeam(team.id, {
    limit: 50,
    status: 'unread'
  });

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Emails</h1>
      <EmailList emails={emails} />
    </div>
  );
}
```

### 6.4 Détail Email + Répondre

```typescript
// app/gestionnaire/emails/[id]/page.tsx
import { getServerAuthContext } from '@/lib/server-context';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { EmailDetail } from './email-detail';
import { ReplyButton } from './reply-button';

export default async function EmailDetailPage({ params }: { params: { id: string } }) {
  const { team, supabase } = await getServerAuthContext('gestionnaire');

  const emailRepo = new EmailRepository(supabase);
  const email = await emailRepo.findById(params.id);

  if (!email || email.team_id !== team.id) {
    return <div>Email non trouvé</div>;
  }

  // Marquer comme lu
  await emailRepo.markAsRead(email.id);

  // Récupérer les pièces jointes
  const attachments = await emailRepo.getAttachments(email.id);

  return (
    <div className="container max-w-4xl py-8">
      <EmailDetail email={email} attachments={attachments} />
      <div className="mt-6">
        <ReplyButton email={email} />
      </div>
    </div>
  );
}
```

---

## 7. Sécurité & RGPD

### 7.1 Chiffrement des Mots de Passe

✅ **AES-256-CBC** pour `imap_password_encrypted` et `smtp_password_encrypted`
✅ **Clé secrète** (`EMAIL_ENCRYPTION_KEY`) stockée dans variables d'environnement Vercel
✅ **Jamais stockés en clair** dans la base de données

### 7.2 Authentification Vercel Cron

```typescript
// Vérification token dans /api/cron/sync-emails/route.ts
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 7.3 RLS Policies

✅ **Multi-tenant isolation** : Chaque équipe ne voit que ses propres emails
✅ **Helper functions** : `is_team_manager(team_id)` pour contrôle d'accès
✅ **Cascade DELETE** : Suppression d'une équipe supprime ses emails

### 7.4 RGPD

**Données personnelles stockées** :
- Adresses email expéditeur/destinataire
- Contenu des emails (body_text, body_html)
- Pièces jointes

**Conformité** :
1. **Consentement** : L'équipe connecte volontairement son email
2. **Droit d'accès** : Visualisation via interface SEIDO
3. **Droit de suppression** : Bouton "Supprimer la connexion email"
4. **Droit à l'oubli** : Suppression CASCADE des emails si équipe supprimée
5. **Chiffrement** : Mots de passe chiffrés AES-256
6. **Limitation de conservation** : Politique de rétention à définir (ex: 90 jours)

**Politique de rétention recommandée** :

```sql
-- Migration pour auto-suppression après 90 jours
-- supabase/migrations/20251104000002_email_retention_policy.sql

CREATE OR REPLACE FUNCTION delete_old_emails() RETURNS void AS $$
BEGIN
  DELETE FROM emails
  WHERE received_at < NOW() - INTERVAL '90 days'
    AND status = 'archived';
END;
$$ LANGUAGE plpgsql;

-- Cron Supabase (extension pg_cron)
SELECT cron.schedule(
  'delete-old-emails',
  '0 2 * * *', -- Tous les jours à 2h du matin
  $$SELECT delete_old_emails()$$
);
```

---

## 8. Roadmap 4 Semaines

### Semaine 1 : Backend Foundation

**Tâches** :
- [ ] Migration base de données (tables `team_email_connections`, `emails`, `email_attachments`)
- [ ] Générer types TypeScript (`npm run supabase:types`)
- [ ] Implémenter `EncryptionService` (AES-256)
- [ ] Implémenter `EmailConnectionRepository`
- [ ] Implémenter `EmailRepository`
- [ ] Implémenter `EmailConnectionTestService`

**Livrables** :
- ✅ Schéma DB appliqué en production
- ✅ Services de chiffrement opérationnels
- ✅ Repositories testés (unit tests)

**Estimation** : 40h

---

### Semaine 2 : IMAP/SMTP Services + API

**Tâches** :
- [ ] Installer dépendances (`node-imap`, `nodemailer`, `mailparser`)
- [ ] Implémenter `ImapService.fetchNewEmails()`
- [ ] Implémenter `SmtpService.sendEmail()`
- [ ] Créer API route `/api/cron/sync-emails` (Vercel Cron)
- [ ] Créer API route `/api/emails/send`
- [ ] Créer API route `/api/team/email-connection` (CRUD)
- [ ] Créer API route `/api/team/email-connection/test`
- [ ] Configurer `vercel.json` (cron job toutes les 5 min)

**Livrables** :
- ✅ Polling IMAP fonctionnel (récupération emails)
- ✅ Envoi SMTP opérationnel
- ✅ Cron job testé en staging

**Estimation** : 40h

---

### Semaine 3 : Frontend UI

**Tâches** :
- [ ] Page `/gestionnaire/settings/emails` (liste connexions)
- [ ] Modal `AddEmailConnectionModal` (avec provider preset)
- [ ] Test connexion en temps réel (bouton "Tester")
- [ ] Page `/gestionnaire/emails` (liste emails reçus)
- [ ] Page `/gestionnaire/emails/[id]` (détail + répondre)
- [ ] Modal `ReplyEmailModal` (composer réponse)
- [ ] Composant `EmailAttachments` (affichage + download)
- [ ] Actions : Marquer comme lu, Archiver, Lier à bâtiment/lot
- [ ] Recherche plein texte (barre de recherche)

**Livrables** :
- ✅ Interface complète pour configuration email
- ✅ Inbox SEIDO avec emails reçus
- ✅ Envoi de réponses depuis l'app

**Estimation** : 50h

---

### Semaine 4 : Tests + Production

**Tâches** :
- [ ] Tests unitaires (Repositories, Services)
- [ ] Tests E2E (configuration email, réception, envoi)
- [ ] Tests avec vrais comptes Gmail/Outlook/Yahoo
- [ ] Documentation utilisateur (guide configuration)
- [ ] Migration production Supabase
- [ ] Configuration variables env Vercel (`EMAIL_ENCRYPTION_KEY`, `CRON_SECRET`)
- [ ] Déploiement Vercel avec Cron
- [ ] Monitoring (logs Vercel, alertes erreurs)
- [ ] Formation équipe pilote (1-2 gestionnaires)

**Livrables** :
- ✅ Feature déployée en production
- ✅ Documentation complète
- ✅ 1-2 équipes pilotes connectées

**Estimation** : 20h

---

**Total** : **150h** (4 semaines × 37.5h/semaine)

---

## 9. Points Bloquants

### 9.1 Latence IMAP (2-5 minutes)

**Problème** : Le polling toutes les 5 minutes introduit un délai de réception.

**Solutions** :
- **Acceptable** : Pour 200 emails/jour, la latence est tolérable
- **Amélioration future** : Migrer vers webhooks (Gmail API + Pub/Sub) pour temps réel

### 9.2 Limites Envoi SMTP

**Problème** :
- Gmail : 500 emails/jour
- Outlook : 300 emails/jour

**Solutions** :
- **Court terme** : Largement suffisant pour 10 équipes (20 emails/jour chacune)
- **Long terme** : Si scaling, utiliser Resend ou SendGrid pour envoi

### 9.3 Gestion Erreurs IMAP

**Problème** : Connexions IMAP peuvent échouer (credentials invalides, serveur down).

**Solution** :
- Champ `last_error` dans `team_email_connections`
- Désactiver auto la connexion après 3 échecs consécutifs
- Notifier l'équipe par email (via Resend)

### 9.4 Stockage Pièces Jointes

**Problème** : Supabase Storage gratuit limité à 1 Go.

**Solution** :
- **Phase 1** : Limite 5 MB par pièce jointe
- **Phase 2** : Policy de suppression après 90 jours
- **Long terme** : Upgrade Supabase Pro ($25/mois = 100 Go)

---

## 10. Analyse Coûts

### 10.1 Infrastructure Mensuelle

| Service | Plan | Coût |
|---------|------|------|
| **Supabase** | Pro | $25/mois |
| - PostgreSQL | Inclus | $0 |
| - Storage (100 Go) | Inclus | $0 |
| **Vercel** | Pro | $20/mois |
| - Cron Jobs | Inclus | $0 |
| - API Routes | Inclus | $0 |
| **TOTAL** | | **$45/mois** |

**Note** : Si déjà sur Supabase/Vercel Pro, **coût additionnel = $0** ✅

### 10.2 Développement

| Phase | Heures | Coût (100€/h) |
|-------|--------|---------------|
| Semaine 1 (Backend) | 40h | 4 000€ |
| Semaine 2 (API) | 40h | 4 000€ |
| Semaine 3 (Frontend) | 50h | 5 000€ |
| Semaine 4 (Tests + Prod) | 20h | 2 000€ |
| **TOTAL** | **150h** | **15 000€** |

**ROI Calculé** :
- Économie vs Google Workspace : $12/mois ($144/an)
- Amortissement : 15 000€ / 144€ = **104 ans** ❌

**MAIS** :
- **Valeur ajoutée** : Gestion emails centralisée dans SEIDO
- **Gain productivité** : Création interventions depuis emails
- **Scalabilité** : Support illimité d'équipes (vs 30 alias max Google)

---

## 11. Checklist Pré-Production

### Backend
- [ ] Migration DB appliquée (`team_email_connections`, `emails`, `email_attachments`)
- [ ] RLS policies testées (isolation multi-tenant)
- [ ] Types TypeScript générés (`npm run supabase:types`)
- [ ] `EncryptionService` testé avec AES-256
- [ ] `ImapService` testé avec Gmail, Outlook, Yahoo
- [ ] `SmtpService` testé avec envoi réel
- [ ] API routes créées et testées
- [ ] Vercel Cron configuré (`vercel.json`)

### Frontend
- [ ] Page configuration email (`/gestionnaire/settings/emails`)
- [ ] Modal ajout connexion avec presets providers
- [ ] Test connexion en temps réel (bouton "Tester")
- [ ] Page liste emails (`/gestionnaire/emails`)
- [ ] Page détail email + répondre
- [ ] Recherche plein texte opérationnelle
- [ ] Actions : Marquer lu, Archiver, Lier bâtiment/lot

### Sécurité
- [ ] `EMAIL_ENCRYPTION_KEY` généré et stocké dans Vercel env
- [ ] `CRON_SECRET` généré et configuré
- [ ] Mots de passe jamais loggés (ni console, ni Sentry)
- [ ] RLS policies validées par admin Supabase
- [ ] Politique RGPD rédigée (conservation 90 jours)

### Tests
- [ ] Tests unitaires (Repositories, Services) > 80% coverage
- [ ] Tests E2E (configuration, réception, envoi)
- [ ] Tests avec comptes réels (Gmail, Outlook, Yahoo)
- [ ] Tests de charge (simulation 200 emails/jour)

### Documentation
- [ ] Guide utilisateur (configuration email avec screenshots)
- [ ] Documentation API (Swagger ou README)
- [ ] Runbook ops (que faire si cron job échoue ?)
- [ ] Formation équipe pilote réalisée

### Production
- [ ] Migration Supabase production exécutée
- [ ] Variables env Vercel configurées
- [ ] Cron job activé et monitoré
- [ ] Alertes Vercel configurées (erreurs cron)
- [ ] Logs centralisés (Vercel Logs ou Sentry)
- [ ] 1-2 équipes pilotes connectées et validées

---

## 12. Ressources

### Documentation Officielle

**IMAP/SMTP** :
- [RFC 3501 - IMAP Protocol](https://datatracker.ietf.org/doc/html/rfc3501)
- [RFC 5321 - SMTP Protocol](https://datatracker.ietf.org/doc/html/rfc5321)
- [RFC 2822 - Email Message Format](https://datatracker.ietf.org/doc/html/rfc2822)

**Libraries** :
- [node-imap](https://github.com/mscdex/node-imap) - Client IMAP pour Node.js
- [Nodemailer](https://nodemailer.com/) - Client SMTP pour Node.js
- [mailparser](https://nodemailer.com/extras/mailparser/) - Parser RFC 2822

**Providers** :
- [Gmail IMAP/SMTP Settings](https://support.google.com/mail/answer/7126229)
- [Outlook IMAP/SMTP Settings](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353)
- [Yahoo IMAP/SMTP Settings](https://help.yahoo.com/kb/SLN4075.html)
- [OVH Email Settings](https://docs.ovh.com/fr/emails/generalites-sur-les-emails-mutualises/)

### Sécurité

- [OWASP - Email Security](https://cheatsheetseries.owasp.org/cheatsheets/Email_Security_Cheat_Sheet.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [AES Encryption Best Practices](https://www.npmjs.com/package/node-aes-gcm)

### Vercel Cron

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Expression Generator](https://crontab.guru/)

---

## 📝 Changelog

**Version 2.0** (2025-11-04) :
- Migration complète vers approche IMAP/SMTP
- Ajout support envoi emails (SMTP)
- Support Gmail, Outlook, Yahoo, OVH, custom
- Chiffrement AES-256 des credentials
- Timeline réduite à 4 semaines (150h)
- Coût infrastructure $0.32/mois (vs $12.32 Google Workspace)

**Version 1.0** (2025-11-03) :
- Approche initiale Google Workspace + Gmail API
- Push notifications via Pub/Sub
- Timeline 8 semaines (200h)

---

**Auteur** : Claude Code (Anthropic)
**Statut** : ✅ Prêt pour Implémentation
**Contact** : [Votre équipe dev SEIDO]

---

**🎯 Prochaine Étape** : Exécuter migration Semaine 1 (Backend Foundation)