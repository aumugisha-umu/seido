# Guide d'Implémentation - Intégration Email SEIDO (IMAP/SMTP)

**Version**: 2.0
**Date**: 2025-11-04
**Statut**: 📋 Documentation Technique
**Approche**: IMAP/SMTP Multi-Comptes (Self-Service)
**Complexité**: 🟢 Moyenne (4 semaines)

---

## 🎯 Contexte Projet SEIDO

### Configuration Cible

| Paramètre | Valeur |
|-----------|--------|
| **Nombre d'équipes** | 10 équipes |
| **Volume emails** | 200 emails/jour (20/équipe/jour) |
| **Timeline** | **4 semaines** (implémentation complète) ✅ |
| **Priorité #1** | Réception + Envoi emails dans l'app |
| **Approche** | IMAP/SMTP Self-Service |
| **Prérequis** | ✅ Aucun (pas de souscription externe requise) |

### Coûts Estimés (Votre Configuration)

**Hypothèse**: 10 équipes × 20 emails/jour = 200 emails/jour = 6,000 emails/mois

| Service | Usage Mensuel | Coût |
|---------|---------------|------|
| **Supabase Database** | Credentials encrypted + emails | $0 (inclus Pro) |
| **Supabase Storage** | ~15GB attachments | **$0.32/mois** |
| Vercel Cron | Polling IMAP every 5 min | $0 (inclus) |
| **TOTAL INFRASTRUCTURE** | | **$0.32/mois** ✅ |

**💰 Économie vs Google Workspace**: $144/an (pas de souscription $12/mois requise)

**Note**: Chaque équipe connecte sa propre boîte email (Gmail, Outlook, etc.) avec username/password. Aucun service externe payant requis.

### Avantages Approche IMAP/SMTP

✅ **Coût ultra-faible**: $0.32/mois (vs $12.32 avec Google Workspace)
✅ **Universel**: Fonctionne avec Gmail, Outlook, Yahoo, OVH, tout provider IMAP/SMTP
✅ **Self-service**: User configure lui-même sa boîte email (2 minutes)
✅ **Bi-directionnel**: Réception (IMAP) + Envoi (SMTP)
✅ **Simplicité**: Pas de Google Cloud, pas d'OAuth complexe, pas de webhooks
✅ **Rapide**: 4 semaines vs 8 semaines (architecture plus simple)

⚠️ **Seul compromis**: Latence 2-5 minutes réception (polling vs push temps-réel)
→ Acceptable pour gestion immobilière (emails urgents = téléphone)

### Aucun Prérequis Externe

**vs Approche Google Workspace**:
- ❌ Pas de souscription Google Workspace Business Standard
- ❌ Pas de configuration Google Cloud Project
- ❌ Pas de Google Admin Console
- ❌ Pas de domain-wide delegation OAuth

**Démarrage immédiat**: Implémentation peut commencer dès aujourd'hui ✅

---

## 📖 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Technique IMAP/SMTP](#architecture-technique)
3. [Configuration Providers Email](#configuration-providers-email)
4. [Schéma Base de Données](#schéma-base-de-données)
5. [Implémentation Backend](#implémentation-backend)
6. [Intégration Frontend](#intégration-frontend)
7. [Sécurité & GDPR](#sécurité--gdpr)
8. [Roadmap d'Implémentation](#roadmap-dimplémentation)
9. [Gestion des Blockers](#gestion-des-blockers)
10. [Coûts & Scalabilité](#coûts--scalabilité)
11. [Checklist Pré-Production](#checklist-pré-production)
12. [Ressources & Documentation](#ressources--documentation)
13. [Support & Maintenance](#support--maintenance)

---

## 1. Vue d'Ensemble

### 1.1 Objectif

Permettre aux gestionnaires SEIDO de centraliser leurs emails de gestion immobilière dans l'application en connectant directement leur boîte email personnelle (Gmail, Outlook, etc.) via protocoles IMAP/SMTP.

### 1.2 Fonctionnalités Principales

#### Pour les Utilisateurs

**Réception Emails (IMAP)**:
- 📧 **Connexion directe**: Connecter Gmail, Outlook, Yahoo, OVH, ou tout provider IMAP
- 🔍 **Recherche full-text**: Recherche instantanée dans sujet + corps des emails
- 🏢 **Liaison bien**: Archiver un email en le liant à un immeuble/lot
- 🔧 **Création intervention**: Transformer un email en intervention (pré-rempli)
- ❌ **Filtrage**: Marquer les emails non pertinents au patrimoine
- 📎 **Pièces jointes**: Visualisation et téléchargement sécurisés

**Envoi Emails (SMTP)**:
- ✉️ **Répondre depuis SEIDO**: Répondre aux emails directement dans l'app
- 📤 **Envoi contextualisé**: Emails envoyés depuis compte user (authentification)
- 🔗 **Thread preservation**: Réponses liées au fil de conversation original
- 📝 **Templates**: Modèles pré-remplis (interventions, devis, etc.)

#### Architecture

```
┌──────────────────────┐
│ User Email Account   │
│ (Gmail/Outlook/...)  │
│ user@gmail.com       │
└──────┬───────────┬───┘
       │           │
       │ IMAP      │ SMTP
       │ (receive) │ (send)
       ▼           ▼
┌──────────────────────┐
│  SEIDO Backend       │
│                      │
│  ┌───────────────┐   │
│  │ Cron Job      │   │ ◄── Poll IMAP every 5 min
│  │ (Vercel)      │   │
│  └───────┬───────┘   │
│          │           │
│  ┌───────▼───────┐   │
│  │ IMAP Service  │   │ ◄── Fetch new emails
│  │ + Parser      │   │
│  └───────┬───────┘   │
│          │           │
│  ┌───────▼───────┐   │
│  │ Email Repo    │   │ ◄── Store in DB
│  └───────────────┘   │
│                      │
│  ┌───────────────┐   │
│  │ SMTP Service  │   │ ◄── Send replies
│  └───────────────┘   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   PostgreSQL         │ ◄── Supabase Database
│   + S3 Storage       │     (emails + attachments)
└──────────────────────┘
```

### 1.3 Workflow Utilisateur

#### Configuration Initiale (Self-Service - 2 minutes)

1. **User va dans Paramètres → Emails**
2. **Sélectionne provider** (Gmail, Outlook, ou Autre)
3. **Entre credentials IMAP/SMTP**:
   ```
   Gmail Example:
   - Email: gestionnaire@gmail.com
   - IMAP: imap.gmail.com:993 (auto-rempli)
   - SMTP: smtp.gmail.com:587 (auto-rempli)
   - Password: [Mot de passe d'application Gmail]
   ```
4. **Test connexion automatique** → ✅ Connecté
5. **Emails synchronisés** toutes les 5 minutes

#### Utilisation Quotidienne

**Réception**:
1. User reçoit email dans sa boîte Gmail/Outlook normale
2. Après 2-5 minutes, email apparaît dans SEIDO
3. Actions possibles:
   - Lire email
   - Répondre depuis SEIDO
   - Marquer comme "Non pertinent"
   - Lier à un bien
   - Créer intervention

**Envoi**:
1. Depuis détail email, cliquer "Répondre"
2. Composer réponse dans SEIDO
3. Email envoyé via SMTP depuis compte user
4. Destinataire reçoit email comme si envoyé depuis Gmail/Outlook

#### Traçabilité
- Email archivé dans base de données SEIDO
- Historique réponses conservé
- Accessible depuis fiche bien
- Retrouvable via recherche full-text

---

## 2. Architecture Technique IMAP/SMTP

### 2.1 Stack Technologique

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| **Email Reception** | IMAP (Polling) | Universel (Gmail, Outlook, Yahoo, OVH...) |
| **Email Sending** | SMTP | Standard envoi emails avec authentification |
| **Email Parsing** | `mailparser` + `imap` (npm) | RFC 2822 compliant, battle-tested |
| **Polling** | Vercel Cron (every 5 min) | Serverless, gratuit, reliable |
| **Database** | PostgreSQL (Supabase) | Full-text search, RLS policies, encrypted credentials |
| **File Storage** | Supabase Storage (S3) | Attachments scalables, CDN-ready |
| **Backend** | Repository Pattern + Services | Cohérent avec architecture SEIDO |
| **Frontend** | Server Components + shadcn/ui | Performance, SEO-friendly |

### 2.2 Choix Architecturaux

#### IMAP Polling vs Push Notifications

**✅ Choix: IMAP Polling (Cron every 5 min)**

| Critère | IMAP Polling (Choisi) | Push (Gmail API) |
|---------|----------------------|------------------|
| **Latence** | 2-5 minutes 🟡 | < 5 secondes |
| **Complexité** | 🟢 Simple | 🔴 Élevée |
| **Universalité** | ✅ Tous providers | ❌ Gmail uniquement |
| **Coût infra** | 🟢 $0.32/mois | 🔴 $12/mois (Workspace) |
| **Dev time** | 🟢 4 semaines | 🔴 8 semaines |
| **Scalabilité** | 🟡 50-100 équipes | ✅ 1000+ équipes |
| **Self-service** | ✅ User configure | ❌ Admin crée alias |

**Justification pour SEIDO**:
- 🟢 **Latence acceptable**: Gestion immobilière n'est pas temps-réel
- 🟢 **Coût ultra-faible**: Économie $144/an vs Google Workspace
- 🟢 **Simplicité**: Pas de Google Cloud, OAuth, webhooks
- 🟢 **Universel**: Outlook, Gmail, Yahoo, OVH, tout IMAP fonctionne

**Configuration Cron** (vercel.json):
```json
{
  "crons": [{
    "path": "/api/cron/sync-emails",
    "schedule": "*/5 * * * *"  // Every 5 minutes
  }]
}
```

#### Stockage Credentials

**⚠️ SÉCURITÉ CRITIQUE**: Encryption AES-256 obligatoire

```typescript
// lib/services/encryption.service.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY; // 32 bytes (256 bits)
const IV_LENGTH = 16;

export function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
}

export function decryptPassword(encrypted: string): string {
  const [ivHex, encryptedHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### Stockage Attachments

**✅ Choix: Supabase Storage (S3-backed)** (inchangé)

```
Structure:
email-attachments/
  {team_id}/
    {email_id}/
      {attachment_id}_{filename}

Exemple:
email-attachments/
  abc-123-team/
    e5f6g7h8-email-id/
      photo-fuite.jpg
      devis-plomberie.pdf
```

**Avantages**:
- ✅ Isolation par team (RLS policies)
- ✅ CDN automatique (cache global)
- ✅ Coût: $0.021/GB/mois
- ✅ Scan virus optionnel (ClamAV integration)

### 2.3 Flux de Données Détaillé

#### Flux Réception (IMAP)

```typescript
// ======================================
// CRON JOB - Every 5 minutes
// ======================================

// STEP 1: Get all active email connections
const { data: connections } = await supabase
  .from('team_email_connections')
  .select('*')
  .eq('is_active', true);

// STEP 2: For each connection, poll IMAP
for (const connection of connections) {
  // Decrypt password
  const password = decryptPassword(connection.imap_password_encrypted);

  // Connect IMAP
  const imap = new Imap({
    user: connection.imap_username,
    password,
    host: connection.imap_host,
    port: connection.imap_port,
    tls: connection.imap_use_ssl
  });

  imap.connect();

  // STEP 3: Search new emails (UID > last_uid)
  imap.openBox('INBOX', false, () => {
    const searchCriteria = [['UID', `${connection.last_uid + 1}:*`]];

    imap.search(searchCriteria, (err, uids) => {
      const fetch = imap.fetch(uids, { bodies: '', struct: true });

      // STEP 4: Parse each email
      fetch.on('message', async (msg) => {
        msg.on('body', async (stream) => {
          const parsed = await simpleParser(stream);

          // STEP 5: Store in database
          await emailRepo.create({
            team_id: connection.team_id,
            email_connection_id: connection.id,
            from_address: parsed.from.value[0].address,
            from_name: parsed.from.value[0].name,
            to_addresses: parsed.to.value.map(t => t.address),
            subject: parsed.subject,
            body_text: parsed.text,
            body_html: parsed.html,
            received_at: parsed.date || new Date()
          });

          // STEP 6: Store attachments
          for (const attachment of parsed.attachments || []) {
            await storeAttachment(emailId, attachment);
          }
        });
      });

      // STEP 7: Update last_uid
      await supabase
        .from('team_email_connections')
        .update({ last_uid: Math.max(...uids), last_sync_at: new Date() })
        .eq('id', connection.id);
    });
  });
}
```

#### Flux Envoi (SMTP)

```typescript
// ======================================
// USER CLIQUE "RÉPONDRE" DANS SEIDO
// ======================================

// STEP 1: User compose réponse
POST /api/emails/send
{
  "team_id": "abc-123",
  "reply_to_email_id": "original-email-id",
  "to": ["client@example.com"],
  "subject": "Re: Fuite plomberie",
  "body_html": "<p>Bonjour,...</p>",
  "body_text": "Bonjour,..."
}

// STEP 2: Get team SMTP config
const { data: connection } = await supabase
  .from('team_email_connections')
  .select('*')
  .eq('team_id', teamId)
  .single();

// Decrypt SMTP password
const smtpPassword = decryptPassword(connection.smtp_password_encrypted);

// STEP 3: Send email via SMTP
const transporter = nodemailer.createTransport({
  host: connection.smtp_host,         // smtp.gmail.com
  port: connection.smtp_port,         // 587
  secure: connection.smtp_use_tls,    // true
  auth: {
    user: connection.smtp_username,   // gestionnaire@gmail.com
    pass: smtpPassword                 // Decrypted password
  }
});

await transporter.sendMail({
  from: connection.email_address,     // gestionnaire@gmail.com
  to: ['client@example.com'],
  subject: 'Re: Fuite plomberie',
  text: body_text,
  html: body_html,
  inReplyTo: originalEmail.message_id, // Thread preservation
  references: originalEmail.references
});

// STEP 4: Store sent email in database
await emailRepo.create({
  team_id: teamId,
  direction: 'sent',                   // vs 'received'
  from_address: connection.email_address,
  to_addresses: ['client@example.com'],
  subject: 'Re: Fuite plomberie',
  body_text,
  body_html,
  in_reply_to: originalEmail.id,
  sent_at: new Date()
});
```

---

## 3. Configuration Providers Email

### 3.1 Vue d'Ensemble

**Aucune souscription externe requise** ✅

Contrairement à l'approche Google Workspace, l'approche IMAP/SMTP permet aux users de connecter directement leur boîte email existante (Gmail personnelle, Outlook, etc.) sans frais supplémentaires.

**Providers supportés** (tout provider IMAP/SMTP):
- ✅ **Gmail** (gratuit, personnel ou professionnel)
- ✅ **Outlook/Office 365** (gratuit ou Business)
- ✅ **Yahoo Mail**
- ✅ **OVH Mail**
- ✅ **Custom IMAP/SMTP** (tout serveur compatible)

---

### 3.2 Configuration Gmail (Recommandé)

#### Étape 1: Générer Mot de Passe d'Application

**⚠️ Important**: Gmail ne permet plus les connexions avec mot de passe principal. Vous DEVEZ utiliser un "App Password".

**Procédure**:

1. **Activer 2FA sur compte Gmail** (prérequis):
   - Aller sur https://myaccount.google.com/security
   - Section "Se connecter à Google"
   - Activer "Validation en deux étapes"

2. **Générer App Password**:
   - Aller sur https://myaccount.google.com/apppasswords
   - Sélectionner app: **Mail**
   - Sélectionner appareil: **Autre (nom personnalisé)** → "SEIDO"
   - Cliquer "Générer"
   - **Copier le password** (16 caractères sans espaces)
   - Exemple: `abcd efgh ijkl mnop` → Copier `abcdefghijklmnop`

#### Étape 2: Configuration IMAP/SMTP

**Paramètres Gmail**:

| Paramètre | Valeur |
|-----------|--------|
| **Email Address** | votre.email@gmail.com |
| **IMAP Host** | imap.gmail.com |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS ✅ |
| **SMTP Host** | smtp.gmail.com |
| **SMTP Port** | 587 |
| **SMTP Encryption** | STARTTLS ✅ |
| **Username** | votre.email@gmail.com |
| **Password** | [App Password généré] |

**Exemple Configuration UI SEIDO**:
```typescript
// Auto-rempli si user sélectionne "Gmail"
{
  email_address: "gestionnaire@gmail.com",
  provider: "gmail",
  imap_host: "imap.gmail.com",
  imap_port: 993,
  imap_use_ssl: true,
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_use_tls: true,
  imap_username: "gestionnaire@gmail.com",
  smtp_username: "gestionnaire@gmail.com",
  password: "abcdefghijklmnop" // App Password
}
```

**Documentation officielle**: https://support.google.com/mail/answer/7126229

---

### 3.3 Configuration Outlook/Office 365

#### Outlook.com (Gratuit)

**Paramètres Outlook.com**:

| Paramètre | Valeur |
|-----------|--------|
| **Email Address** | votre.email@outlook.com |
| **IMAP Host** | outlook.office365.com |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS ✅ |
| **SMTP Host** | smtp.office365.com |
| **SMTP Port** | 587 |
| **SMTP Encryption** | STARTTLS ✅ |
| **Username** | votre.email@outlook.com |
| **Password** | [Mot de passe Outlook] |

**⚠️ Note**: Outlook.com autorise connexion avec password principal (pas d'app password requis).

#### Office 365 Business

**Paramètres identiques** mais avec adresse email entreprise:
- Email: `prenom.nom@entreprise.com`
- Serveurs: Identiques (outlook.office365.com / smtp.office365.com)

**Documentation officielle**: https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353

---

### 3.4 Configuration Yahoo Mail

**Étape 1: Générer App Password** (similaire Gmail):
1. Aller sur https://login.yahoo.com/account/security
2. Activer "Two-Step Verification"
3. Section "App passwords" → Generate
4. Sélectionner "Other App" → "SEIDO"
5. Copier password généré

**Paramètres Yahoo**:

| Paramètre | Valeur |
|-----------|--------|
| **Email Address** | votre.email@yahoo.com |
| **IMAP Host** | imap.mail.yahoo.com |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS ✅ |
| **SMTP Host** | smtp.mail.yahoo.com |
| **SMTP Port** | 587 |
| **SMTP Encryption** | STARTTLS ✅ |
| **Username** | votre.email@yahoo.com |
| **Password** | [App Password] |

---

### 3.5 Configuration OVH Mail

**Paramètres OVH**:

| Paramètre | Valeur |
|-----------|--------|
| **Email Address** | contact@votredomaine.com |
| **IMAP Host** | ssl0.ovh.net |
| **IMAP Port** | 993 |
| **IMAP Encryption** | SSL/TLS ✅ |
| **SMTP Host** | ssl0.ovh.net |
| **SMTP Port** | 587 |
| **SMTP Encryption** | STARTTLS ✅ |
| **Username** | contact@votredomaine.com |
| **Password** | [Mot de passe email OVH] |

**Documentation OVH**: https://docs.ovh.com/fr/emails/generalites-sur-les-emails-mutualises/

---

### 3.6 Configuration Custom IMAP/SMTP

Pour tout autre provider, user doit connaître:

1. **Serveur IMAP**:
   - Hostname (ex: `mail.provider.com`)
   - Port (généralement 993 ou 143)
   - Encryption (SSL/TLS recommandé)

2. **Serveur SMTP**:
   - Hostname (ex: `smtp.provider.com`)
   - Port (généralement 587, 465, ou 25)
   - Encryption (STARTTLS ou SSL/TLS)

3. **Credentials**:
   - Username (souvent = adresse email)
   - Password

**Où trouver ces infos ?**
- Documentation provider email
- Support technique provider
- Google: "provider name IMAP SMTP settings"

---

### 3.7 Test Connexion Automatique

**Lors de la configuration dans SEIDO**, backend teste automatiquement la connexion:

```typescript
// app/api/team/email-connection/test/route.ts
export async function POST(request: Request) {
  const { imap_host, imap_port, imap_username, imap_password, smtp_host, smtp_port } = await request.json();

  try {
    // Test IMAP
    const imapTest = await testImapConnection({
      host: imap_host,
      port: imap_port,
      user: imap_username,
      password: imap_password
    });

    // Test SMTP
    const smtpTest = await testSmtpConnection({
      host: smtp_host,
      port: smtp_port,
      auth: { user: imap_username, pass: imap_password }
    });

    return Response.json({
      success: true,
      imap: imapTest,
      smtp: smtpTest
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
```

**Feedback user**:
- ✅ **Connexion réussie**: "Votre email a été connecté avec succès !"
- ❌ **Échec IMAP**: "Impossible de se connecter au serveur IMAP. Vérifiez vos paramètres."
- ❌ **Échec SMTP**: "Impossible de se connecter au serveur SMTP. Vérifiez vos paramètres."

---

### 3.8 Variables d'Environnement

**Fichier `.env.local`**:
```bash
# Encryption Key (GÉNÉRER avec: openssl rand -hex 32)
EMAIL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Vercel Cron Secret (pour sécuriser /api/cron/sync-emails)
CRON_SECRET=votre_secret_aleatoire_genere

# Supabase (déjà existant)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**⚠️ CRITIQUE**:
- `EMAIL_ENCRYPTION_KEY` doit être généré aléatoirement (32 bytes = 64 caractères hex)
- Ne JAMAIS commit ces clés dans Git
- Stocker dans Vercel Environment Variables (production)

---

## 4. Schéma Base de Données

### 4.1 Migration SQL Complète

**Fichier**: `supabase/migrations/20251104000000_email_integration.sql`

```sql
-- ============================================================
-- SEIDO Email Integration Schema
-- Version: 1.0
-- Date: 2025-11-04
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For trigram search

-- ============================================================
-- Table 1: emails
-- Stores received emails with full metadata
-- ============================================================

CREATE TABLE emails (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Team association (multi-tenant isolation)
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Gmail metadata
  gmail_message_id VARCHAR(255) NOT NULL UNIQUE,
  gmail_thread_id VARCHAR(255) NOT NULL,
  gmail_history_id BIGINT NOT NULL,

  -- Email headers
  from_address VARCHAR(500) NOT NULL,
  from_name VARCHAR(255),
  to_addresses TEXT[] NOT NULL, -- PostgreSQL array
  cc_addresses TEXT[],
  bcc_addresses TEXT[],
  subject VARCHAR(1000) NOT NULL,

  -- Email body
  body_text TEXT, -- Plain text version (for search)
  body_html TEXT, -- HTML version (for display)
  snippet VARCHAR(500), -- First 500 chars (preview)

  -- Metadata
  received_at TIMESTAMPTZ NOT NULL,
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INT DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,

  -- User actions
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  is_property_related BOOLEAN DEFAULT TRUE, -- Can be marked as "not related"

  -- Associations
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,

  -- Audit trail
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES users(id),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),

  -- Full-text search vector (auto-generated)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('french', coalesce(subject, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(from_name, '') || ' ' || coalesce(from_address, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(body_text, '')), 'C')
  ) STORED
);

-- ============================================================
-- Table 2: email_attachments
-- Stores attachment metadata (files in Supabase Storage)
-- ============================================================

CREATE TABLE email_attachments (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- File metadata
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL, -- Bytes

  -- Storage location
  storage_bucket VARCHAR(100) DEFAULT 'email-attachments',
  storage_path VARCHAR(1000) NOT NULL, -- team_id/email_id/attachment_id_filename

  -- Gmail metadata
  gmail_attachment_id VARCHAR(255) NOT NULL,

  -- Security
  virus_scan_status VARCHAR(50), -- 'pending', 'clean', 'infected', 'error'
  virus_scan_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id)
);

-- ============================================================
-- Table 3: team_email_aliases
-- Maps email aliases to teams
-- ============================================================

CREATE TABLE team_email_aliases (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign key
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Alias configuration
  alias_email VARCHAR(255) NOT NULL UNIQUE, -- e.g., team1@seido-app.com
  is_active BOOLEAN DEFAULT TRUE,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES users(id),

  -- Usage stats
  email_count BIGINT DEFAULT 0,
  last_email_received_at TIMESTAMPTZ
);

-- ============================================================
-- Table 4: gmail_watch_state
-- Stores Gmail watch state (for push notifications)
-- ============================================================

CREATE TABLE gmail_watch_state (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Gmail account
  user_email VARCHAR(255) NOT NULL UNIQUE, -- gestionnaires@seido-app.com

  -- Watch state
  history_id BIGINT NOT NULL, -- Last processed historyId
  watch_expiration TIMESTAMPTZ NOT NULL, -- Must renew before this (7 days)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  renewed_count INT DEFAULT 0,
  last_renewed_at TIMESTAMPTZ
);

-- ============================================================
-- Indexes for Performance
-- ============================================================

-- emails table
CREATE INDEX idx_emails_team_id ON emails(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_team_id_received_at ON emails(team_id, received_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_emails_gmail_message_id ON emails(gmail_message_id);
CREATE INDEX idx_emails_gmail_thread_id ON emails(gmail_thread_id);
CREATE INDEX idx_emails_received_at ON emails(received_at DESC);
CREATE INDEX idx_emails_is_read ON emails(team_id, is_read) WHERE is_read = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_emails_is_archived ON emails(team_id, is_archived) WHERE is_archived = FALSE AND deleted_at IS NULL;
CREATE INDEX idx_emails_building_id ON emails(building_id) WHERE building_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_emails_lot_id ON emails(lot_id) WHERE lot_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_emails_intervention_id ON emails(intervention_id) WHERE intervention_id IS NOT NULL AND deleted_at IS NULL;

-- Full-text search index (GIN)
CREATE INDEX idx_emails_search_vector ON emails USING GIN(search_vector);

-- Trigram search for subject (for fuzzy matching)
CREATE INDEX idx_emails_subject_trgm ON emails USING GIN(subject gin_trgm_ops) WHERE deleted_at IS NULL;

-- email_attachments table
CREATE INDEX idx_email_attachments_email_id ON email_attachments(email_id);
CREATE INDEX idx_email_attachments_team_id ON email_attachments(team_id) WHERE deleted_at IS NULL;

-- team_email_aliases table
CREATE INDEX idx_team_email_aliases_team_id ON team_email_aliases(team_id) WHERE is_active = TRUE;
CREATE INDEX idx_team_email_aliases_alias_email ON team_email_aliases(alias_email) WHERE is_active = TRUE;

-- ============================================================
-- Row Level Security (RLS) Policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_watch_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies: emails
-- ============================================================

-- Team members can view emails from their teams
CREATE POLICY "team_members_view_emails"
ON emails
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND left_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Team managers can update emails (mark as read, archive, etc.)
CREATE POLICY "team_managers_update_emails"
ON emails
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestionnaire')
    AND left_at IS NULL
  )
);

-- Service role can insert emails (webhook)
CREATE POLICY "service_insert_emails"
ON emails
FOR INSERT
WITH CHECK (true); -- Service role bypasses RLS

-- Team managers can soft delete emails
CREATE POLICY "team_managers_delete_emails"
ON emails
FOR UPDATE
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'gestionnaire')
    AND left_at IS NULL
  )
);

-- ============================================================
-- RLS Policies: email_attachments
-- ============================================================

-- Team members can view attachments from their teams
CREATE POLICY "team_members_view_attachments"
ON email_attachments
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND left_at IS NULL
  )
  AND deleted_at IS NULL
);

-- Service role can insert attachments (webhook)
CREATE POLICY "service_insert_attachments"
ON email_attachments
FOR INSERT
WITH CHECK (true);

-- ============================================================
-- RLS Policies: team_email_aliases
-- ============================================================

-- Team members can view their team's aliases
CREATE POLICY "team_members_view_aliases"
ON team_email_aliases
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid()
    AND left_at IS NULL
  )
);

-- Admins can manage all aliases
CREATE POLICY "admins_manage_aliases"
ON team_email_aliases
FOR ALL
USING (is_admin());

-- ============================================================
-- RLS Policies: gmail_watch_state
-- ============================================================

-- Only admins can view/update watch state
CREATE POLICY "admins_manage_watch_state"
ON gmail_watch_state
FOR ALL
USING (is_admin());

-- Service role can update watch state (cron job)
CREATE POLICY "service_update_watch_state"
ON gmail_watch_state
FOR UPDATE
WITH CHECK (true);

-- ============================================================
-- Helper Functions
-- ============================================================

-- Update email count when new email is inserted
CREATE OR REPLACE FUNCTION update_alias_email_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE team_email_aliases
  SET
    email_count = email_count + 1,
    last_email_received_at = NEW.received_at
  WHERE team_id = NEW.team_id
  AND is_active = TRUE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alias_email_count
AFTER INSERT ON emails
FOR EACH ROW
EXECUTE FUNCTION update_alias_email_count();

-- Update attachment count on email
CREATE OR REPLACE FUNCTION update_email_attachment_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE emails
  SET
    has_attachments = TRUE,
    attachment_count = attachment_count + 1,
    total_size_bytes = total_size_bytes + NEW.file_size
  WHERE id = NEW.email_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_attachment_count
AFTER INSERT ON email_attachments
FOR EACH ROW
EXECUTE FUNCTION update_email_attachment_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_emails_updated_at
BEFORE UPDATE ON emails
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_gmail_watch_state_updated_at
BEFORE UPDATE ON gmail_watch_state
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Comments for Documentation
-- ============================================================

COMMENT ON TABLE emails IS 'Stores all received emails with full metadata and search capabilities';
COMMENT ON TABLE email_attachments IS 'Stores attachment metadata (actual files in Supabase Storage)';
COMMENT ON TABLE team_email_aliases IS 'Maps email aliases (team1@seido-app.com) to teams';
COMMENT ON TABLE gmail_watch_state IS 'Tracks Gmail watch state for push notifications';

COMMENT ON COLUMN emails.search_vector IS 'Auto-generated tsvector for full-text search (French)';
COMMENT ON COLUMN emails.is_property_related IS 'User can mark email as not related to property management';
COMMENT ON COLUMN email_attachments.virus_scan_status IS 'Optional virus scanning status (ClamAV integration)';
```

### 4.2 TypeScript Types

**Générer types Supabase**:
```bash
npm run supabase:types
```

**Types attendus** (lib/database.types.ts):
```typescript
export interface Database {
  public: {
    Tables: {
      emails: {
        Row: {
          id: string;
          team_id: string;
          gmail_message_id: string;
          gmail_thread_id: string;
          gmail_history_id: number;
          from_address: string;
          from_name: string | null;
          to_addresses: string[];
          cc_addresses: string[] | null;
          subject: string;
          body_text: string | null;
          body_html: string | null;
          snippet: string | null;
          received_at: string;
          has_attachments: boolean;
          attachment_count: number;
          total_size_bytes: number;
          is_read: boolean;
          is_starred: boolean;
          is_archived: boolean;
          is_property_related: boolean;
          building_id: string | null;
          lot_id: string | null;
          intervention_id: string | null;
          read_at: string | null;
          read_by: string | null;
          archived_at: string | null;
          archived_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          gmail_message_id: string;
          gmail_thread_id: string;
          gmail_history_id: number;
          from_address: string;
          from_name?: string | null;
          to_addresses: string[];
          cc_addresses?: string[] | null;
          subject: string;
          body_text?: string | null;
          body_html?: string | null;
          snippet?: string | null;
          received_at: string;
          has_attachments?: boolean;
          attachment_count?: number;
          total_size_bytes?: number;
          is_read?: boolean;
          is_starred?: boolean;
          is_archived?: boolean;
          is_property_related?: boolean;
          building_id?: string | null;
          lot_id?: string | null;
          intervention_id?: string | null;
          // ... autres champs optionnels
        };
        Update: {
          // Tous les champs optionnels
          is_read?: boolean;
          is_archived?: boolean;
          building_id?: string | null;
          // ... etc
        };
      };
      email_attachments: {
        // ... définitions similaires
      };
      team_email_aliases: {
        // ... définitions similaires
      };
      gmail_watch_state: {
        // ... définitions similaires
      };
    };
  };
}
```

---

## 5. Implémentation Backend

### 5.1 Repository Pattern

**Fichier**: `lib/services/repositories/email.repository.ts`

```typescript
import { BaseRepository } from '../core/base-repository';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { validateRequired, createSuccessResponse, createErrorResponse, handleError } from '../core/error-handler';

// Type aliases pour lisibilité
type Email = Database['public']['Tables']['emails']['Row'];
type EmailInsert = Database['public']['Tables']['emails']['Insert'];
type EmailUpdate = Database['public']['Tables']['emails']['Update'];

export interface EmailFilters {
  isRead?: boolean;
  isArchived?: boolean;
  isStarred?: boolean;
  isPropertyRelated?: boolean;
  buildingId?: string;
  lotId?: string;
  interventionId?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface EmailPagination {
  limit?: number;
  offset?: number;
  orderBy?: 'received_at' | 'subject' | 'from_address';
  orderDirection?: 'asc' | 'desc';
}

export class EmailRepository extends BaseRepository<Email, EmailInsert, EmailUpdate> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'emails');
  }

  /**
   * Validate email data before insert/update
   */
  protected async validate(data: EmailInsert | EmailUpdate): Promise<void> {
    if ('gmail_message_id' in data) {
      validateRequired(
        { gmail_message_id: data.gmail_message_id },
        ['gmail_message_id']
      );
    }

    if ('team_id' in data) {
      validateRequired({ team_id: data.team_id }, ['team_id']);
    }
  }

  /**
   * Find emails by team with filters and pagination
   */
  async findByTeam(
    teamId: string,
    filters: EmailFilters = {},
    pagination: EmailPagination = {}
  ) {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          email_attachments (
            id,
            filename,
            mime_type,
            file_size,
            storage_path
          ),
          building:buildings (
            id,
            name,
            address
          ),
          lot:lots (
            id,
            reference,
            building_id
          )
        `, { count: 'exact' })
        .eq('team_id', teamId)
        .is('deleted_at', null);

      // Apply filters
      if (filters.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters.isArchived !== undefined) {
        query = query.eq('is_archived', filters.isArchived);
      }

      if (filters.isStarred !== undefined) {
        query = query.eq('is_starred', filters.isStarred);
      }

      if (filters.isPropertyRelated !== undefined) {
        query = query.eq('is_property_related', filters.isPropertyRelated);
      }

      if (filters.buildingId) {
        query = query.eq('building_id', filters.buildingId);
      }

      if (filters.lotId) {
        query = query.eq('lot_id', filters.lotId);
      }

      if (filters.interventionId) {
        query = query.eq('intervention_id', filters.interventionId);
      }

      if (filters.searchQuery) {
        // Full-text search using tsvector
        query = query.textSearch('search_vector', filters.searchQuery, {
          type: 'websearch',
          config: 'french'
        });
      }

      if (filters.dateFrom) {
        query = query.gte('received_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('received_at', filters.dateTo);
      }

      // Apply ordering
      const orderBy = pagination.orderBy || 'received_at';
      const orderDirection = pagination.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (pagination.limit) {
        query = query.limit(pagination.limit);
      }

      if (pagination.offset) {
        const limit = pagination.limit || 20;
        query = query.range(pagination.offset, pagination.offset + limit - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        return createErrorResponse(handleError(error, 'emails:findByTeam'));
      }

      return createSuccessResponse({
        data: data as Email[],
        count: count || 0
      });
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emails:findByTeam'));
    }
  }

  /**
   * Find email by Gmail message ID (for deduplication)
   */
  async findByGmailMessageId(gmailMessageId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('gmail_message_id', gmailMessageId)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        return createErrorResponse(handleError(error, 'emails:findByGmailMessageId'));
      }

      return createSuccessResponse(data as Email | null);
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emails:findByGmailMessageId'));
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string, userId: string) {
    return await this.update(emailId, {
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: userId
    });
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(emailId: string) {
    return await this.update(emailId, {
      is_read: false,
      read_at: null,
      read_by: null
    });
  }

  /**
   * Toggle star status
   */
  async toggleStar(emailId: string, isStarred: boolean) {
    return await this.update(emailId, { is_starred: isStarred });
  }

  /**
   * Archive email
   */
  async archive(emailId: string, userId: string) {
    return await this.update(emailId, {
      is_archived: true,
      archived_at: new Date().toISOString(),
      archived_by: userId
    });
  }

  /**
   * Unarchive email
   */
  async unarchive(emailId: string) {
    return await this.update(emailId, {
      is_archived: false,
      archived_at: null,
      archived_by: null
    });
  }

  /**
   * Mark email as not property-related
   */
  async markAsNotPropertyRelated(emailId: string) {
    return await this.update(emailId, { is_property_related: false });
  }

  /**
   * Link email to building
   */
  async linkToBuilding(emailId: string, buildingId: string) {
    return await this.update(emailId, { building_id: buildingId });
  }

  /**
   * Link email to lot
   */
  async linkToLot(emailId: string, lotId: string) {
    return await this.update(emailId, { lot_id: lotId });
  }

  /**
   * Link email to intervention
   */
  async linkToIntervention(emailId: string, interventionId: string) {
    return await this.update(emailId, { intervention_id: interventionId });
  }

  /**
   * Get unread count for team
   */
  async getUnreadCount(teamId: string) {
    try {
      const { count, error } = await this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('is_read', false)
        .is('deleted_at', null);

      if (error) {
        return createErrorResponse(handleError(error, 'emails:getUnreadCount'));
      }

      return createSuccessResponse(count || 0);
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emails:getUnreadCount'));
    }
  }

  /**
   * Get email thread (all emails with same gmail_thread_id)
   */
  async findThread(gmailThreadId: string, teamId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('gmail_thread_id', gmailThreadId)
        .eq('team_id', teamId)
        .is('deleted_at', null)
        .order('received_at', { ascending: true });

      if (error) {
        return createErrorResponse(handleError(error, 'emails:findThread'));
      }

      return createSuccessResponse(data as Email[]);
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emails:findThread'));
    }
  }

  /**
   * Soft delete email
   */
  async softDelete(emailId: string, userId: string) {
    return await this.update(emailId, {
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    });
  }
}
```

### 5.2 Email Service

**Fichier**: `lib/services/domain/email.service.ts`

```typescript
import { EmailRepository } from '../repositories/email.repository';
import { EmailAttachmentRepository } from '../repositories/email-attachment.repository';
import { TeamEmailAliasRepository } from '../repositories/team-email-alias.repository';
import { google } from 'googleapis';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '../core/supabase-client';
import { createSuccessResponse, createErrorResponse, handleError } from '../core/error-handler';

export interface ProcessEmailResult {
  emailId: string;
  teamId: string;
  attachmentCount: number;
}

export class EmailService {
  private emailRepo: EmailRepository;
  private attachmentRepo: EmailAttachmentRepository;
  private aliasRepo: TeamEmailAliasRepository;
  private gmailClient: any;

  constructor(
    supabase: SupabaseClient,
    gmailClient: any
  ) {
    this.emailRepo = new EmailRepository(supabase);
    this.attachmentRepo = new EmailAttachmentRepository(supabase);
    this.aliasRepo = new TeamEmailAliasRepository(supabase);
    this.gmailClient = gmailClient;
  }

  /**
   * Process Gmail push notification
   */
  async processEmailNotification(historyId: string) {
    try {
      // 1. Get last processed historyId from database
      const lastHistoryId = await this.getLastProcessedHistoryId();

      // 2. Fetch history changes from Gmail
      const gmail = google.gmail({ version: 'v1', auth: this.gmailClient });
      const history = await gmail.users.history.list({
        userId: 'gestionnaires@seido-app.com',
        startHistoryId: lastHistoryId.toString(),
        historyTypes: ['messageAdded']
      });

      if (!history.data.history) {
        console.log('No new messages in history');
        return createSuccessResponse({ processed: 0 });
      }

      // 3. Process each new message
      const results: ProcessEmailResult[] = [];
      for (const record of history.data.history) {
        if (record.messagesAdded) {
          for (const messageAdded of record.messagesAdded) {
            const result = await this.processGmailMessage(messageAdded.message!.id!);
            if (result.success && result.data) {
              results.push(result.data);
            }
          }
        }
      }

      // 4. Update last processed historyId
      await this.updateLastProcessedHistoryId(historyId);

      return createSuccessResponse({
        processed: results.length,
        emails: results
      });
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emailService:processNotification'));
    }
  }

  /**
   * Fetch and store Gmail message
   */
  async processGmailMessage(messageId: string) {
    try {
      // 1. Check if already processed (deduplication)
      const existing = await this.emailRepo.findByGmailMessageId(messageId);
      if (existing.success && existing.data) {
        console.log(`Email ${messageId} already processed`);
        return createSuccessResponse(null);
      }

      // 2. Fetch full message from Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.gmailClient });
      const message = await gmail.users.messages.get({
        userId: 'gestionnaires@seido-app.com',
        id: messageId,
        format: 'raw'
      });

      // 3. Parse email using mailparser
      const rawEmail = Buffer.from(message.data.raw!, 'base64').toString('utf-8');
      const parsed = await simpleParser(rawEmail);

      // 4. Detect team from recipient addresses
      const teamId = await this.detectTeamFromEmail(parsed);
      if (!teamId) {
        console.error('Could not detect team for email', messageId);
        return createErrorResponse(new Error('Team not found for email'));
      }

      // 5. Store email in database
      const emailResult = await this.emailRepo.create({
        team_id: teamId,
        gmail_message_id: messageId,
        gmail_thread_id: message.data.threadId!,
        gmail_history_id: parseInt(message.data.historyId!),
        from_address: parsed.from!.value[0].address!,
        from_name: parsed.from!.value[0].name || null,
        to_addresses: parsed.to!.value.map(t => t.address!),
        cc_addresses: parsed.cc?.value.map(t => t.address!) || null,
        subject: parsed.subject || '(No Subject)',
        body_text: parsed.text || null,
        body_html: parsed.html || null,
        snippet: parsed.text ? parsed.text.substring(0, 500) : null,
        received_at: parsed.date?.toISOString() || new Date().toISOString(),
        has_attachments: (parsed.attachments?.length || 0) > 0,
        attachment_count: parsed.attachments?.length || 0
      });

      if (!emailResult.success || !emailResult.data) {
        return createErrorResponse(emailResult.error!);
      }

      const email = emailResult.data;

      // 6. Process attachments
      let attachmentCount = 0;
      if (parsed.attachments && parsed.attachments.length > 0) {
        attachmentCount = await this.storeAttachments(
          email.id,
          teamId,
          parsed.attachments
        );
      }

      // 7. Send real-time notification to team managers
      await this.notifyTeamOfNewEmail(teamId, email);

      return createSuccessResponse({
        emailId: email.id,
        teamId,
        attachmentCount
      } as ProcessEmailResult);
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emailService:processMessage'));
    }
  }

  /**
   * Detect team from recipient email addresses
   */
  private async detectTeamFromEmail(parsed: ParsedMail): Promise<string | null> {
    try {
      // Collect all recipient addresses (to, cc, bcc)
      const allRecipients: string[] = [
        ...(parsed.to?.value.map(t => t.address!) || []),
        ...(parsed.cc?.value.map(t => t.address!) || []),
        ...(parsed.bcc?.value.map(t => t.address!) || [])
      ];

      // Find matching team alias
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase
        .from('team_email_aliases')
        .select('team_id')
        .in('alias_email', allRecipients)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('No active alias found for recipients:', allRecipients);
        return null;
      }

      return data.team_id;
    } catch (error) {
      console.error('Error detecting team:', error);
      return null;
    }
  }

  /**
   * Store attachments in Supabase Storage
   */
  private async storeAttachments(
    emailId: string,
    teamId: string,
    attachments: Attachment[]
  ): Promise<number> {
    let count = 0;

    const supabase = await createServerSupabaseClient();

    for (const attachment of attachments) {
      try {
        // Generate unique filename
        const attachmentId = crypto.randomUUID();
        const sanitizedFilename = attachment.filename!.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${teamId}/${emailId}/${attachmentId}_${sanitizedFilename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('email-attachments')
          .upload(storagePath, attachment.content, {
            contentType: attachment.contentType,
            upsert: false
          });

        if (uploadError) {
          console.error('Failed to upload attachment:', uploadError);
          continue;
        }

        // Store metadata in database
        const attachmentResult = await this.attachmentRepo.create({
          email_id: emailId,
          team_id: teamId,
          filename: sanitizedFilename,
          original_filename: attachment.filename!,
          mime_type: attachment.contentType,
          file_size: attachment.size,
          storage_path: storagePath,
          gmail_attachment_id: attachment.contentId || attachmentId
        });

        if (attachmentResult.success) {
          count++;
        }
      } catch (error) {
        console.error('Error storing attachment:', error);
      }
    }

    return count;
  }

  /**
   * Send real-time notification to team managers
   */
  private async notifyTeamOfNewEmail(teamId: string, email: any) {
    // This would trigger a real-time notification
    // Supabase real-time will automatically notify subscribed clients
    console.log(`New email for team ${teamId}: ${email.subject}`);
  }

  /**
   * Get last processed Gmail historyId
   */
  private async getLastProcessedHistoryId(): Promise<number> {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from('gmail_watch_state')
      .select('history_id')
      .eq('user_email', 'gestionnaires@seido-app.com')
      .single();

    return data?.history_id || 0;
  }

  /**
   * Update last processed Gmail historyId
   */
  private async updateLastProcessedHistoryId(historyId: string) {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('gmail_watch_state')
      .update({ history_id: parseInt(historyId) })
      .eq('user_email', 'gestionnaires@seido-app.com');
  }

  /**
   * Create intervention from email
   */
  async createInterventionFromEmail(
    emailId: string,
    userId: string,
    interventionData: {
      buildingId?: string;
      lotId?: string;
      description?: string;
    }
  ) {
    try {
      // 1. Get email details
      const emailResult = await this.emailRepo.findById(emailId);
      if (!emailResult.success || !emailResult.data) {
        return createErrorResponse(new Error('Email not found'));
      }

      const email = emailResult.data;

      // 2. Create intervention with InterventionService
      // (Implementation depends on existing InterventionService)
      const interventionService = new InterventionService(/* ... */);
      const intervention = await interventionService.create({
        team_id: email.team_id,
        building_id: interventionData.buildingId || email.building_id,
        lot_id: interventionData.lotId || email.lot_id,
        title: email.subject,
        description: interventionData.description || email.body_text || email.snippet,
        status: 'demande',
        created_by: userId
      });

      // 3. Link email to intervention
      await this.emailRepo.linkToIntervention(emailId, intervention.id);

      return createSuccessResponse(intervention);
    } catch (error) {
      return createErrorResponse(handleError(error as Error, 'emailService:createIntervention'));
    }
  }
}

// Factory function to create EmailService
export async function createServerEmailService() {
  const supabase = await createServerSupabaseClient();
  const gmailClient = await getGmailClient(); // Implemented in next section
  return new EmailService(supabase, gmailClient);
}
```

### 5.3 Gmail Client Configuration

**Fichier**: `lib/services/core/gmail-client.ts`

```typescript
import { google } from 'googleapis';
import { createServerSupabaseClient } from './supabase-client';

/**
 * Get authenticated Gmail client
 */
export async function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Get refresh token from database (encrypted)
  const refreshToken = await getStoredRefreshToken();

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  // Auto-refresh access token when expired
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await storeRefreshToken(tokens.refresh_token);
    }
  });

  return oauth2Client;
}

/**
 * Get stored refresh token from database
 */
async function getStoredRefreshToken(): Promise<string> {
  // For MVP, use environment variable
  // In production, store encrypted in database
  const token = process.env.GOOGLE_REFRESH_TOKEN;

  if (!token) {
    throw new Error('Google refresh token not configured');
  }

  return token;
}

/**
 * Store refresh token in database (encrypted)
 */
async function storeRefreshToken(refreshToken: string) {
  // TODO: Implement encrypted storage in database
  console.log('Refresh token updated (implement encrypted storage)');
}

/**
 * Setup Gmail watch (push notifications)
 */
export async function setupGmailWatch() {
  try {
    const gmail = google.gmail({ version: 'v1', auth: await getGmailClient() });

    const res = await gmail.users.watch({
      userId: 'gestionnaires@seido-app.com',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
        labelFilterBehavior: 'INCLUDE'
      }
    });

    // Store watch state in database
    const supabase = await createServerSupabaseClient();
    await supabase
      .from('gmail_watch_state')
      .upsert({
        user_email: 'gestionnaires@seido-app.com',
        history_id: parseInt(res.data.historyId!),
        watch_expiration: new Date(parseInt(res.data.expiration!)).toISOString(),
        renewed_count: 0,
        last_renewed_at: new Date().toISOString()
      });

    console.log('Gmail watch setup successful, expires:', new Date(parseInt(res.data.expiration!)));
    return res.data;
  } catch (error) {
    console.error('Failed to setup Gmail watch:', error);
    throw error;
  }
}

/**
 * Renew Gmail watch (must be called before expiration)
 */
export async function renewGmailWatch() {
  try {
    const supabase = await createServerSupabaseClient();

    // Get current watch state
    const { data: watchState } = await supabase
      .from('gmail_watch_state')
      .select('*')
      .eq('user_email', 'gestionnaires@seido-app.com')
      .single();

    if (!watchState) {
      console.log('No watch state found, setting up new watch');
      return await setupGmailWatch();
    }

    // Check if renewal needed (< 2 days left)
    const expiresAt = new Date(watchState.watch_expiration);
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    if (expiresAt > twoDaysFromNow) {
      console.log('Watch still valid, no renewal needed');
      return;
    }

    // Renew watch
    const gmail = google.gmail({ version: 'v1', auth: await getGmailClient() });
    const res = await gmail.users.watch({
      userId: 'gestionnaires@seido-app.com',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: process.env.GOOGLE_PUBSUB_TOPIC,
        labelFilterBehavior: 'INCLUDE'
      }
    });

    // Update watch state
    await supabase
      .from('gmail_watch_state')
      .update({
        history_id: parseInt(res.data.historyId!),
        watch_expiration: new Date(parseInt(res.data.expiration!)).toISOString(),
        renewed_count: watchState.renewed_count + 1,
        last_renewed_at: new Date().toISOString()
      })
      .eq('user_email', 'gestionnaires@seido-app.com');

    console.log('Gmail watch renewed successfully');
    return res.data;
  } catch (error) {
    console.error('Failed to renew Gmail watch:', error);
    throw error;
  }
}
```

### 5.4 API Routes

**Fichier**: `app/api/webhooks/gmail/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { createServerEmailService } from '@/lib/services/domain/email.service';
import crypto from 'crypto';

/**
 * Gmail Push Notification Webhook
 * Receives notifications from Google Cloud Pub/Sub
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook authenticity
    const body = await request.text();
    const signature = request.headers.get('x-goog-signature');

    if (!verifyPubSubSignature(signature, body)) {
      console.error('Invalid Pub/Sub signature');
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Parse Pub/Sub message
    const pubsubMessage = JSON.parse(body);
    const messageData = JSON.parse(
      Buffer.from(pubsubMessage.message.data, 'base64').toString('utf-8')
    );

    console.log('Received Gmail notification:', messageData);

    // 3. Process email notification
    const emailService = await createServerEmailService();
    const result = await emailService.processEmailNotification(messageData.historyId);

    if (!result.success) {
      console.error('Failed to process email notification:', result.error);
      return new Response('Processing failed', { status: 500 });
    }

    console.log(`Processed ${result.data.processed} emails`);

    // 4. Acknowledge receipt (required by Pub/Sub)
    return Response.json({
      success: true,
      processed: result.data.processed
    });
  } catch (error) {
    console.error('Gmail webhook error:', error);
    return new Response('Internal Error', { status: 500 });
  }
}

/**
 * Verify Google Cloud Pub/Sub signature
 * See: https://cloud.google.com/pubsub/docs/push#verify_push_requests
 */
function verifyPubSubSignature(signature: string | null, payload: string): boolean {
  // For MVP, skip verification in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    // TODO: Implement proper signature verification
    // This requires Google Cloud's public key
    // See documentation link above

    // For now, basic validation
    return signature.length > 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}
```

**Fichier**: `app/api/emails/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { getServerAuthContext } from '@/lib/server-context';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';

/**
 * GET /api/emails
 * List emails for current team with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire');
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const isRead = searchParams.get('isRead');
    const isArchived = searchParams.get('isArchived');
    const searchQuery = searchParams.get('q');
    const buildingId = searchParams.get('buildingId');

    // Build filters
    const filters: any = {};
    if (isRead !== null) filters.isRead = isRead === 'true';
    if (isArchived !== null) filters.isArchived = isArchived === 'true';
    if (searchQuery) filters.searchQuery = searchQuery;
    if (buildingId) filters.buildingId = buildingId;

    // Fetch emails
    const supabase = await createServerSupabaseClient();
    const emailRepo = new EmailRepository(supabase);

    const result = await emailRepo.findByTeam(team.id, filters, {
      limit,
      offset: (page - 1) * limit,
      orderBy: 'received_at',
      orderDirection: 'desc'
    });

    if (!result.success) {
      return Response.json({ error: result.error?.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      data: result.data.data,
      pagination: {
        page,
        limit,
        total: result.data.count,
        totalPages: Math.ceil(result.data.count / limit)
      }
    });
  } catch (error) {
    console.error('GET /api/emails error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Fichier**: `app/api/emails/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { getServerAuthContext } from '@/lib/server-context';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';

/**
 * GET /api/emails/[id]
 * Get email details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire');
    const supabase = await createServerSupabaseClient();
    const emailRepo = new EmailRepository(supabase);

    const result = await emailRepo.findById(params.id);

    if (!result.success || !result.data) {
      return Response.json({ error: 'Email not found' }, { status: 404 });
    }

    // Verify email belongs to user's team
    if (result.data.team_id !== team.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return Response.json({ success: true, data: result.data });
  } catch (error) {
    console.error('GET /api/emails/[id] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/emails/[id]
 * Update email (mark as read, archive, link to building, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, profile, team } = await getServerAuthContext('gestionnaire');
    const body = await request.json();
    const supabase = await createServerSupabaseClient();
    const emailRepo = new EmailRepository(supabase);

    // Handle specific actions
    if (body.action === 'mark_read') {
      await emailRepo.markAsRead(params.id, profile.id);
    } else if (body.action === 'mark_unread') {
      await emailRepo.markAsUnread(params.id);
    } else if (body.action === 'archive') {
      await emailRepo.archive(params.id, profile.id);
    } else if (body.action === 'unarchive') {
      await emailRepo.unarchive(params.id);
    } else if (body.action === 'toggle_star') {
      await emailRepo.toggleStar(params.id, body.isStarred);
    } else if (body.action === 'link_building') {
      await emailRepo.linkToBuilding(params.id, body.buildingId);
    } else if (body.action === 'mark_not_property_related') {
      await emailRepo.markAsNotPropertyRelated(params.id);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/emails/[id] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Fichier**: `app/api/cron/renew-gmail-watch/route.ts`

```typescript
import { renewGmailWatch } from '@/lib/services/core/gmail-client';

/**
 * Cron job to renew Gmail watch
 * Runs daily at 3 AM (configured in vercel.json)
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel Cron sends this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('Running Gmail watch renewal cron job');
    await renewGmailWatch();

    return Response.json({ success: true, renewed: true });
  } catch (error) {
    console.error('Gmail watch renewal failed:', error);
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

**Configuration Vercel Cron** (`vercel.json`):
```json
{
  "crons": [{
    "path": "/api/cron/renew-gmail-watch",
    "schedule": "0 3 * * *"
  }]
}
```

---

## 6. Intégration Frontend

### 6.1 Navigation - Ajout Email

**Fichier**: `components/layouts/gestionnaire-sidebar.tsx`

```typescript
// Ajouter dans la section navigation
import { Mail, Inbox, Archive, Star } from 'lucide-react';

// Dans le composant
<SidebarMenuItem>
  <SidebarMenuButton asChild>
    <Link href="/gestionnaire/mail">
      <Mail className="mr-2 h-4 w-4" />
      Emails
      {unreadCount > 0 && (
        <SidebarMenuBadge className="bg-blue-600 text-white">
          {unreadCount}
        </SidebarMenuBadge>
      )}
    </Link>
  </SidebarMenuButton>

  {/* Sub-menu */}
  <SidebarMenuSub>
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild>
        <Link href="/gestionnaire/mail?filter=inbox">
          <Inbox className="mr-2 h-3 w-3" />
          Boîte de réception
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>

    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild>
        <Link href="/gestionnaire/mail?filter=starred">
          <Star className="mr-2 h-3 w-3" />
          Messages suivis
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>

    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild>
        <Link href="/gestionnaire/mail?filter=archived">
          <Archive className="mr-2 h-3 w-3" />
          Archives
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  </SidebarMenuSub>
</SidebarMenuItem>
```

### 6.2 Page Liste Emails

**Fichier**: `app/gestionnaire/mail/page.tsx`

```typescript
import { getServerAuthContext } from '@/lib/server-context';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailListClient } from './email-list-client';

export default async function EmailsPage({
  searchParams
}: {
  searchParams: { filter?: string; page?: string; q?: string }
}) {
  const { user, profile, team } = await getServerAuthContext('gestionnaire');
  const supabase = await createServerSupabaseClient();
  const emailRepo = new EmailRepository(supabase);

  // Build filters
  const filters: any = {};
  if (searchParams.filter === 'inbox') {
    filters.isArchived = false;
  } else if (searchParams.filter === 'starred') {
    filters.isStarred = true;
  } else if (searchParams.filter === 'archived') {
    filters.isArchived = true;
  }

  if (searchParams.q) {
    filters.searchQuery = searchParams.q;
  }

  // Fetch emails
  const page = parseInt(searchParams.page || '1');
  const result = await emailRepo.findByTeam(team.id, filters, {
    limit: 50,
    offset: (page - 1) * 50
  });

  // Get unread count
  const unreadResult = await emailRepo.getUnreadCount(team.id);
  const unreadCount = unreadResult.success ? unreadResult.data : 0;

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold">Emails</h1>
        <p className="text-sm text-gray-600">
          {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
        </p>
      </header>

      <EmailListClient
        initialEmails={result.success ? result.data.data : []}
        totalCount={result.success ? result.data.count : 0}
        currentPage={page}
        teamId={team.id}
      />
    </div>
  );
}
```

**Fichier**: `app/gestionnaire/mail/email-list-client.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Mail, Star, Archive, Building, Wrench, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface Email {
  id: string;
  from_address: string;
  from_name: string | null;
  subject: string;
  snippet: string | null;
  received_at: string;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  attachment_count: number;
}

interface EmailListClientProps {
  initialEmails: Email[];
  totalCount: number;
  currentPage: number;
  teamId: string;
}

export function EmailListClient({
  initialEmails,
  totalCount,
  currentPage,
  teamId
}: EmailListClientProps) {
  const [emails, setEmails] = useState(initialEmails);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggleSelect = (emailId: string) => {
    setSelectedIds(prev =>
      prev.includes(emailId)
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleToggleStar = async (emailId: string, isStarred: boolean) => {
    await fetch(`/api/emails/${emailId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_star', isStarred: !isStarred })
    });

    setEmails(prev =>
      prev.map(email =>
        email.id === emailId ? { ...email, is_starred: !isStarred } : email
      )
    );
  };

  const handleMarkAsRead = async (emailId: string) => {
    await fetch(`/api/emails/${emailId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read' })
    });

    setEmails(prev =>
      prev.map(email =>
        email.id === emailId ? { ...email, is_read: true } : email
      )
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Bulk actions toolbar */}
      {selectedIds.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </span>
            <Button variant="outline" size="sm">
              <Archive className="mr-2 h-4 w-4" />
              Archiver
            </Button>
            <Button variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {emails.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Aucun email</h3>
              <p className="mt-2 text-sm text-gray-600">
                Les emails transférés à votre alias apparaîtront ici
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {emails.map(email => (
              <div
                key={email.id}
                className={`flex items-start gap-4 px-6 py-4 hover:bg-gray-50 ${
                  !email.is_read ? 'bg-blue-50' : ''
                }`}
              >
                {/* Checkbox */}
                <Checkbox
                  checked={selectedIds.includes(email.id)}
                  onCheckedChange={() => handleToggleSelect(email.id)}
                  className="mt-1"
                />

                {/* Star */}
                <button
                  onClick={() => handleToggleStar(email.id, email.is_starred)}
                  className="mt-1"
                >
                  <Star
                    className={`h-5 w-5 ${
                      email.is_starred
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-400'
                    }`}
                  />
                </button>

                {/* Email content */}
                <Link
                  href={`/gestionnaire/mail/${email.id}`}
                  className="flex-1 min-w-0"
                  onClick={() => !email.is_read && handleMarkAsRead(email.id)}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        !email.is_read ? 'font-semibold' : 'font-normal'
                      }`}
                    >
                      {email.from_name || email.from_address}
                    </p>
                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDistanceToNow(new Date(email.received_at), {
                        addSuffix: true,
                        locale: fr
                      })}
                    </span>
                  </div>

                  <p
                    className={`mt-1 truncate text-sm ${
                      !email.is_read ? 'font-medium' : 'text-gray-700'
                    }`}
                  >
                    {email.subject}
                  </p>

                  <p className="mt-1 truncate text-sm text-gray-600">
                    {email.snippet}
                  </p>

                  {email.has_attachments && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3" />
                      <span>{email.attachment_count} pièce{email.attachment_count > 1 ? 's' : ''} jointe{email.attachment_count > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > 50 && (
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {(currentPage - 1) * 50 + 1} - {Math.min(currentPage * 50, totalCount)} sur {totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                asChild
              >
                <Link href={`?page=${currentPage - 1}`}>Précédent</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage * 50 >= totalCount}
                asChild
              >
                <Link href={`?page=${currentPage + 1}`}>Suivant</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 6.3 Page Détail Email

**Fichier**: `app/gestionnaire/mail/[id]/page.tsx`

```typescript
import { getServerAuthContext } from '@/lib/server-context';
import { EmailRepository } from '@/lib/services/repositories/email.repository';
import { createServerSupabaseClient } from '@/lib/services/core/supabase-client';
import { EmailDetailClient } from './email-detail-client';
import { notFound } from 'next/navigation';

export default async function EmailDetailPage({
  params
}: {
  params: { id: string }
}) {
  const { user, profile, team } = await getServerAuthContext('gestionnaire');
  const supabase = await createServerSupabaseClient();
  const emailRepo = new EmailRepository(supabase);

  const result = await emailRepo.findById(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const email = result.data;

  // Verify email belongs to user's team
  if (email.team_id !== team.id) {
    notFound();
  }

  // Mark as read if not already
  if (!email.is_read) {
    await emailRepo.markAsRead(email.id, profile.id);
  }

  return <EmailDetailClient email={email} teamId={team.id} />;
}
```

**Fichier**: `app/gestionnaire/mail/[id]/email-detail-client.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Archive, Star, Trash2, Building, Wrench, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Email {
  id: string;
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  subject: string;
  body_html: string | null;
  body_text: string | null;
  received_at: string;
  is_starred: boolean;
  is_archived: boolean;
  is_property_related: boolean;
  building_id: string | null;
  email_attachments: {
    id: string;
    filename: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
  }[];
}

export function EmailDetailClient({
  email: initialEmail,
  teamId
}: {
  email: Email;
  teamId: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [showLinkBuildingModal, setShowLinkBuildingModal] = useState(false);
  const [showCreateInterventionModal, setShowCreateInterventionModal] = useState(false);

  const handleToggleStar = async () => {
    await fetch(`/api/emails/${email.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_star', isStarred: !email.is_starred })
    });

    setEmail(prev => ({ ...prev, is_starred: !prev.is_starred }));
  };

  const handleArchive = async () => {
    await fetch(`/api/emails/${email.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'archive' })
    });

    router.push('/gestionnaire/mail');
  };

  const handleMarkNotPropertyRelated = async () => {
    if (confirm('Marquer cet email comme non lié au patrimoine ?')) {
      await fetch(`/api/emails/${email.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_not_property_related' })
      });

      router.push('/gestionnaire/mail');
    }
  };

  const downloadAttachment = async (attachmentId: string, filename: string) => {
    // TODO: Implement Supabase Storage signed URL download
    console.log('Download attachment:', attachmentId);
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/gestionnaire/mail"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Retour à la boîte de réception
          </Link>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToggleStar}>
              <Star
                className={`h-4 w-4 ${
                  email.is_starred ? 'fill-yellow-400 text-yellow-400' : ''
                }`}
              />
            </Button>
            <Button variant="outline" size="sm" onClick={handleArchive}>
              <Archive className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleMarkNotPropertyRelated}>
              <X className="h-4 w-4" />
              Non pertinent
            </Button>
          </div>
        </div>
      </header>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Subject */}
        <h1 className="text-2xl font-bold">{email.subject}</h1>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">De:</span> {email.from_name || email.from_address}
          </div>
          <div>
            <span className="font-medium">À:</span> {email.to_addresses.join(', ')}
          </div>
          <div>
            {format(new Date(email.received_at), 'PPPp', { locale: fr })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2">
          <Button onClick={() => setShowLinkBuildingModal(true)}>
            <Building className="mr-2 h-4 w-4" />
            Lier à un bien
          </Button>
          <Button onClick={() => setShowCreateInterventionModal(true)}>
            <Wrench className="mr-2 h-4 w-4" />
            Créer une intervention
          </Button>
        </div>

        {/* Body */}
        <div className="mt-8 rounded-lg border border-gray-200 p-6">
          {email.body_html ? (
            <iframe
              srcDoc={email.body_html}
              className="h-96 w-full"
              sandbox="allow-same-origin"
              title="Email content"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {email.body_text}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {email.email_attachments && email.email_attachments.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium">Pièces jointes ({email.email_attachments.length})</h3>
            <div className="mt-4 grid gap-2">
              {email.email_attachments.map(attachment => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{attachment.filename}</p>
                    <p className="text-xs text-gray-600">
                      {(attachment.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadAttachment(attachment.id, attachment.filename)}
                  >
                    Télécharger
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={showLinkBuildingModal} onOpenChange={setShowLinkBuildingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lier l'email à un bien</DialogTitle>
          </DialogHeader>
          {/* TODO: Add building selector */}
          <p>Sélecteur de bien à implémenter</p>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateInterventionModal} onOpenChange={setShowCreateInterventionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une intervention depuis l'email</DialogTitle>
          </DialogHeader>
          {/* TODO: Add intervention form */}
          <p>Formulaire d'intervention à implémenter</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## 7. Sécurité & GDPR

### 7.1 Conformité RGPD

**Principes appliqués**:

1. **Minimisation des données**: Seuls les emails transférés sont stockés
2. **Finalité**: Usage limité à la gestion immobilière
3. **Durée de conservation**: 2 ans (auto-suppression)
4. **Droits utilisateurs**:
   - Droit d'accès (export emails)
   - Droit à l'effacement (soft delete)
   - Droit de rectification (édition associations)

**Politique de rétention** (implémentation):

```typescript
// app/api/cron/cleanup-old-emails/route.ts
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = await createServerSupabaseClient();
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Soft delete emails older than 2 years
  const { data, error } = await supabase
    .from('emails')
    .update({ deleted_at: new Date().toISOString() })
    .lt('received_at', twoYearsAgo.toISOString())
    .is('deleted_at', null);

  return Response.json({
    success: !error,
    deleted: data?.length || 0
  });
}
```

**Configuration Vercel Cron** (ajouter à vercel.json):
```json
{
  "crons": [
    {
      "path": "/api/cron/renew-gmail-watch",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/cleanup-old-emails",
      "schedule": "0 4 1 * *"
    }
  ]
}
```

### 7.2 Sécurité des Données

**Encryption at rest**:
- ✅ Base de données: AES-256 (Supabase default)
- ✅ Storage: S3 server-side encryption
- ✅ Refresh token: Encryption recommandée (à implémenter)

**Encryption in transit**:
- ✅ HTTPS/TLS 1.3 pour toutes les communications
- ✅ Gmail API utilise TLS 1.3
- ✅ Webhook endpoint HTTPS uniquement

**RLS Policies**:
```sql
-- Garantir l'isolation multi-tenant
CREATE POLICY "team_members_view_emails"
ON emails FOR SELECT USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid() AND left_at IS NULL
  )
);
```

**Sanitization HTML**:
```typescript
// Utiliser DOMPurify pour affichage HTML emails
import DOMPurify from 'isomorphic-dompurify';

const sanitizedHtml = DOMPurify.sanitize(email.body_html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target']
});
```

### 7.3 Scan Virus (Optionnel)

**Intégration ClamAV** (recommandé pour production):

```typescript
// lib/services/virus-scanner.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function scanFile(filePath: string): Promise<{
  isClean: boolean;
  threat?: string;
}> {
  try {
    const { stdout } = await execAsync(`clamscan ${filePath}`);

    if (stdout.includes('FOUND')) {
      return {
        isClean: false,
        threat: stdout.split(':')[1].trim()
      };
    }

    return { isClean: true };
  } catch (error) {
    console.error('Virus scan failed:', error);
    return { isClean: false, threat: 'Scan failed' };
  }
}
```

**Alternative**: VirusTotal API (cloud-based)

---

## 8. Roadmap d'Implémentation

> **🎯 Priorité #1**: Réception emails dans l'app (Phases 0-2)
> **📊 Configuration**: 10 équipes, 200 emails/jour
> **⏱️ Timeline totale**: 8 semaines + 3-5 jours prérequis

---

### Phase 0: Prérequis Google Workspace (AVANT toute implémentation) - 3-5 jours

**⚠️ CRITIQUE**: Cette phase DOIT être complétée avant Phase 1

#### Jour 1: Souscription Google Workspace
- [ ] **Souscrire à Google Workspace Business Standard**
  - URL: https://workspace.google.com/intl/fr/pricing/
  - Plan: Business Standard ($12/utilisateur/mois)
  - Domaine: seido.pm (vérification propriété requise)
  - Utilisateur principal: gestionnaires@seido-app.com
- [ ] **Vérifier propriété domaine seido.pm**
  - Via TXT record DNS ou fichier HTML
  - Délai validation: 24-48h généralement

#### Jour 2-3: Configuration compte principal
- [ ] **Créer utilisateur gestionnaires@seido-app.com**
  - Via Google Admin Console (admin.google.com)
  - Rôle: Super Admin (REQUIS)
  - Mot de passe fort + 2FA activé
- [ ] **Tester accès Admin Console**
  - Vérifier permissions Super Admin
  - Accéder à section "User email aliases"

#### Jour 4: Création alias test
- [ ] **Créer premier alias manuellement**: test@seido-app.com
  - Admin Console → Users → gestionnaires@seido-app.com → User email aliases
  - Délai activation: quelques minutes à 24h
- [ ] **Tester réception email**
  - Envoyer email depuis compte externe → test@seido-app.com
  - Vérifier réception dans gestionnaires@seido-app.com (via Gmail web)

#### Jour 5: Validation finale
- [ ] **Créer 2-3 alias supplémentaires** (team1@, team2@, team3@seido-app.com)
- [ ] **Documenter credentials**
  - Email: gestionnaires@seido-app.com
  - Mot de passe: (stocker dans 1Password/Vault)
  - Recovery email configuré
- [ ] **Validation go/no-go** pour Phase 1 technique

**Livrables**:
- ✅ Google Workspace actif
- ✅ Compte gestionnaires@seido-app.com avec Super Admin
- ✅ 3+ alias testés et fonctionnels
- ✅ Domaine seido.pm vérifié

**⚠️ Blockers potentiels**:
- Vérification domaine > 48h → Contacter support Google
- Alias non activés après 24h → Vérifier paramètres Workspace
- Pas accès Super Admin → Vérifier propriétaire compte Workspace

---

### Phase 1: Infrastructure (Semaine 1-2) - 10 jours

**Objectif**: Configuration Google Cloud + Base de données
**Prérequis**: Phase 0 COMPLÉTÉE ✅

#### Jour 1-2: Google Cloud Setup
- [ ] Créer Google Cloud Project "seido-production"
- [ ] Activer APIs (Gmail, Admin SDK, Pub/Sub)
- [ ] Configurer OAuth 2.0 credentials
- [ ] ~~Créer compte Google Workspace~~ (déjà fait Phase 0)
- [ ] Activer domain-wide delegation pour gestionnaires@seido-app.com

#### Jour 3-4: Pub/Sub Configuration
- [ ] Créer Pub/Sub topic "gmail-notifications"
- [ ] Configurer push subscription
- [ ] Tester webhook endpoint localement (ngrok)
- [ ] Vérifier réception notifications

#### Jour 5-7: Database Schema
- [ ] Créer migration Supabase (4 tables)
- [ ] Appliquer migration sur staging
- [ ] Générer TypeScript types
- [ ] Tester RLS policies manuellement
- [ ] Créer bucket Supabase Storage "email-attachments"

#### Jour 8-10: OAuth Flow
- [ ] Implémenter route `/api/auth/google/callback`
- [ ] Tester flow OAuth complet
- [ ] Stocker refresh token (encrypted)
- [ ] Configurer Gmail watch initial
- [ ] Vérifier watch renewal (manuel)

**Livrables**:
- ✅ Google Cloud configuré
- ✅ Base de données prête
- ✅ OAuth fonctionnel
- ✅ Webhook endpoint déployé

---

### Phase 2: Backend Services (Semaine 3-4) - 10 jours

**Objectif**: Repositories + Services + API Routes

#### Jour 1-3: Repositories
- [ ] `EmailRepository` (create, findByTeam, filters, search)
- [ ] `EmailAttachmentRepository` (create, findByEmail)
- [ ] `TeamEmailAliasRepository` (create, findByTeam)
- [ ] Tests unitaires (80% coverage)

#### Jour 4-6: EmailService
- [ ] `processEmailNotification()` (webhook handler)
- [ ] `processGmailMessage()` (parse + store)
- [ ] `detectTeamFromEmail()` (alias matching)
- [ ] `storeAttachments()` (Supabase Storage)
- [ ] Tests unitaires

#### Jour 7-8: API Routes
- [ ] `POST /api/webhooks/gmail` (Pub/Sub handler)
- [ ] `GET /api/emails` (list with filters)
- [ ] `GET /api/emails/[id]` (detail)
- [ ] `PATCH /api/emails/[id]` (actions)
- [ ] Tests E2E (Playwright)

#### Jour 9-10: Cron Jobs
- [ ] `GET /api/cron/renew-gmail-watch` (daily renewal)
- [ ] `GET /api/cron/cleanup-old-emails` (monthly cleanup)
- [ ] Configurer Vercel Cron (vercel.json)
- [ ] Tester manuellement

**Livrables**:
- ✅ Repositories fonctionnels
- ✅ EmailService complet
- ✅ API routes testées
- ✅ Cron jobs configurés

---

### Phase 3: Frontend UI (Semaine 5-6) - 10 jours

**Objectif**: Interface utilisateur gestionnaire

#### Jour 1-2: Navigation
- [ ] Ajouter menu "Emails" dans sidebar
- [ ] Badge nombre non lus (real-time)
- [ ] Sous-menu (Inbox, Starred, Archived)

#### Jour 3-5: Liste Emails
- [ ] Page `/gestionnaire/mail`
- [ ] Composant `EmailListClient`
- [ ] Filtres (read/unread, starred, archived)
- [ ] Recherche full-text
- [ ] Pagination
- [ ] Bulk actions (archive, delete)

#### Jour 6-8: Détail Email
- [ ] Page `/gestionnaire/mail/[id]`
- [ ] Composant `EmailDetailClient`
- [ ] Affichage HTML sécurisé (iframe sandbox)
- [ ] Liste pièces jointes
- [ ] Actions (star, archive, delete)

#### Jour 9-10: Modals Actions
- [ ] Modal "Lier à un bien" (building selector)
- [ ] Modal "Créer intervention" (pre-filled form)
- [ ] Toast notifications
- [ ] Tests E2E workflow complet

**Livrables**:
- ✅ UI liste emails fonctionnelle
- ✅ UI détail email complète
- ✅ Actions utilisateur testées

---

### Phase 4: Gestion Aliases (Semaine 7) - 5 jours

**Objectif**: Admin UI pour créer/gérer aliases

#### Jour 1-2: Admin API
- [ ] `POST /api/admin/email-aliases` (create alias)
- [ ] `GET /api/admin/email-aliases` (list all)
- [ ] `DELETE /api/admin/email-aliases/[id]` (deactivate)
- [ ] Integration Google Workspace Admin API

#### Jour 3-4: Admin UI
- [ ] Page `/admin/email-aliases`
- [ ] Formulaire création alias
- [ ] Liste aliases par équipe
- [ ] Statistiques (email count, last received)

#### Jour 5: Tests
- [ ] Tests E2E workflow admin
- [ ] Vérifier isolation multi-tenant

**Livrables**:
- ✅ Admin peut créer aliases
- ✅ Aliases automatiquement liés aux équipes

---

### Phase 5: Polish & Testing (Semaine 8) - 5 jours

**Objectif**: Finitions + Tests complets

#### Jour 1-2: Fonctionnalités Additionnelles
- [ ] Export email en PDF
- [ ] Notification real-time (toast)
- [ ] Attachments download (signed URLs)
- [ ] Email threading (conversations)

#### Jour 3: Performance
- [ ] Load testing (1000 emails concurrent)
- [ ] Optimize queries (indexes)
- [ ] Cache unread count (Redis)

#### Jour 4: Security Audit
- [ ] Revue RLS policies
- [ ] Test isolation multi-tenant
- [ ] Scan vulnerabilités (OWASP)
- [ ] Vérifier encryption at rest/transit

#### Jour 5: Documentation
- [ ] Guide utilisateur (gestionnaires)
- [ ] Guide admin (création aliases)
- [ ] Documentation technique (maintenance)

**Livrables**:
- ✅ Application production-ready
- ✅ Tests > 80% coverage
- ✅ Documentation complète

---

### Phase 6: Production Deploy (1 jour)

**Checklist**:
- [ ] Variables d'environnement Vercel (encrypted)
- [ ] Migration database production
- [ ] Créer bucket Storage production
- [ ] Configurer Pub/Sub production
- [ ] Tester OAuth flow production
- [ ] Configurer Gmail watch production
- [ ] Monitoring (Sentry, Vercel Analytics)
- [ ] Déploiement progressif (beta users)

**Go-Live**:
- [ ] 10 équipes beta (1 semaine monitoring)
- [ ] Rollout complet si succès

---

## 9. Gestion des Blockers

### 9.1 Blocker: Permissions Google Workspace

**Symptôme**: Erreur "403 Forbidden" lors création alias

**Diagnostic**:
1. Vérifier accès Super Admin Google Workspace
2. Vérifier domain-wide delegation configurée
3. Vérifier scopes OAuth corrects

**Solution**:
```typescript
// Vérifier scopes requis
const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user'
];

// Si erreur persiste, utiliser création manuelle temporaire
// Admin Console → Users → gestionnaires@seido-app.com → User email aliases
```

### 9.2 Blocker: Quota Gmail API

**Symptôme**: Erreur "429 Too Many Requests"

**Diagnostic**:
- Quotas: https://console.cloud.google.com/apis/api/gmail.googleapis.com/quotas
- Vérifier usage actuel vs limites

**Solution**:
1. **Court terme**: Implémenter exponential backoff
   ```typescript
   async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.code === 429 && i < maxRetries - 1) {
           await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **Long terme**: Demander augmentation quota (Google Cloud Console)

### 9.3 Blocker: Watch Expiration

**Symptôme**: Emails non reçus après 7 jours

**Diagnostic**:
- Vérifier table `gmail_watch_state`
- Check `watch_expiration < NOW()`

**Solution**:
```sql
-- Vérifier expiration
SELECT
  user_email,
  watch_expiration,
  watch_expiration < NOW() AS is_expired
FROM gmail_watch_state;

-- Si expiré, relancer manuellement
-- Ensuite vérifier cron job fonctionne
```

### 9.4 Blocker: Attachments Trop Gros

**Symptôme**: Timeout lors upload > 25MB

**Diagnostic**:
- Gmail limite pièces jointes à 25MB
- Supabase Storage limite à 5GB (config)

**Solution**:
```typescript
// Filtrer attachments > 25MB
const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024; // 25MB

for (const attachment of parsed.attachments) {
  if (attachment.size > MAX_ATTACHMENT_SIZE) {
    console.warn(`Attachment too large: ${attachment.filename} (${attachment.size} bytes)`);
    // Store metadata with flag "too_large"
    continue;
  }

  // Normal storage
  await storeAttachment(attachment);
}
```

### 9.5 Blocker: HTML Email Rendering XSS

**Symptôme**: Scripts malicieux dans body HTML

**Diagnostic**:
- Tester avec email contenant `<script>alert('XSS')</script>`

**Solution**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

// Sanitize HTML avant affichage
const sanitizedHtml = DOMPurify.sanitize(email.body_html, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th'],
  ALLOWED_ATTR: ['href', 'target', 'style'],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):)/i
});

// Afficher dans iframe sandboxed
<iframe
  srcDoc={sanitizedHtml}
  sandbox="allow-same-origin"
  className="w-full h-96"
/>
```

---

## 10. Coûts & Scalabilité

### 10.1 Estimation Coûts SEIDO

**Configuration actuelle**: 10 équipes × 20 emails/jour = **200 emails/jour = 6,000 emails/mois**

#### Coûts Mensuels Détaillés

| Service | Usage SEIDO | Prix Unitaire | Coût Mensuel |
|---------|-------------|---------------|--------------|
| **Google Workspace Business Standard** | 1 utilisateur (gestionnaires@) | $12/utilisateur | **$12.00** |
| Gmail API | Gratuit | $0 | **$0** |
| Google Cloud Pub/Sub | 6K messages/mois | Gratuit < 10GB | **$0** |
| **Supabase Database** | ~72K emails/an | Inclus Pro Plan | **$0** |
| **Supabase Storage** | ~15GB attachments¹ | $0.021/GB | **$0.32** |
| Supabase Bandwidth | ~5GB download/mois | Inclus Pro Plan | **$0** |
| **TOTAL INFRASTRUCTURE** | | | **$12.32/mois** |

**¹ Hypothèse attachments**: 50% des emails ont 1 pièce jointe de 500KB moyenne

**💰 Coût annuel**: ~$148
**💰 Coût par équipe/mois**: $1.23
**💰 Coût par email traité**: $0.002 (2/10ème de centime)

#### Projection Scalabilité (Croissance SEIDO)

| Métrique | Actuel (10 équipes) | 50 Équipes | 100 Équipes | 500 Équipes |
|----------|---------------------|------------|-------------|-------------|
| **Emails/jour** | 200 | 1,000 | 2,000 | 10,000 |
| **Emails/mois** | 6K | 30K | 60K | 300K |
| **Database rows/an** | 72K | 360K | 720K | 3.6M |
| **Storage attachments** | 15GB | 75GB | 150GB | 750GB |
| **Coût Workspace²** | $12 | $12 | $12 | $12 |
| **Coût Storage** | $0.32 | $1.58 | $3.15 | $15.75 |
| **TOTAL/mois** | **$12.32** | **$13.58** | **$15.15** | **$27.75** |
| **Coût/équipe/mois** | $1.23 | $0.27 | $0.15 | $0.06 |

**² Google Workspace**: 1 seul compte requis (gestionnaires@seido-app.com) car aliases illimités (max 30/compte)

**📊 Conclusion Scalabilité**:
- ✅ **Architecture serverless**: Scaling automatique sans coût fixe
- ✅ **Coût marginal décroissant**: Division par 20 du coût/équipe (10 → 500 équipes)
- ✅ **Pas de refonte nécessaire**: Architecture supporte 1000+ équipes sans modification
- ⚠️ **Seul coût fixe**: Google Workspace $12/mois (obligatoire pour aliases)

#### Comparaison Alternative Mailgun/SendGrid (Reception emails)

| Critère | Gmail API (SEIDO) | Mailgun Inbound | SendGrid Inbound |
|---------|-------------------|-----------------|------------------|
| **Coût base** | $12/mois | $35/mois | $19.95/mois |
| **Emails inclus** | Illimité | 10K/mois | 100/jour |
| **Coût au-delà** | $0 | $0.50/1K | $0.0003/email |
| **Alias management** | Gratuit (30 max) | API calls payantes | Webhook payants |
| **Setup complexity** | Moyenne | Faible | Faible |
| **Vendor lock-in** | Google Workspace | Mailgun | SendGrid |

**💡 Recommandation**: Gmail API reste plus économique pour SEIDO car:
- Pas de limite emails (vs 10K Mailgun, 100/jour SendGrid)
- Alias gratuits (vs API calls facturées)
- Coût fixe connu ($12/mois) vs coût variable imprévisible

### 10.2 Performance Targets

| Métrique | Target | Mesure |
|----------|--------|--------|
| Email reception latency | < 5s | Webhook → DB insert |
| Email list load time | < 1s | 50 emails avec attachments |
| Email detail load time | < 500ms | Avec HTML rendering |
| Search query time | < 300ms | Full-text search (1M rows) |
| Unread count query | < 100ms | Real-time badge update |

### 10.3 Scaling Strategy

**Horizontal Scaling**:
- ✅ Serverless functions (auto-scale)
- ✅ Database: Supabase handles 10M+ connections
- ✅ Storage: S3 unlimited capacity

**Vertical Scaling** (si nécessaire):
- Database partitioning par `team_id` (sharding)
- Read replicas pour queries lourdes
- Redis cache pour unread counts

**Monitoring**:
```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function trackEmailProcessing(duration: number, emailCount: number) {
  Sentry.captureMessage('Email batch processed', {
    level: 'info',
    extra: {
      duration,
      emailCount,
      avgDuration: duration / emailCount
    }
  });

  // Alert if > 10s processing
  if (duration > 10000) {
    Sentry.captureMessage('Slow email processing', { level: 'warning' });
  }
}
```

---

## 11. Checklist Pré-Production

### 11.1 Configuration

- [ ] **Google Cloud Project**
  - [ ] Project ID: seido-production
  - [ ] Gmail API activée
  - [ ] Admin SDK API activée
  - [ ] Pub/Sub API activée
  - [ ] OAuth credentials créées
  - [ ] Pub/Sub topic créé
  - [ ] Push subscription configurée

- [ ] **Google Workspace**
  - [ ] Compte gestionnaires@seido-app.com créé
  - [ ] Domain-wide delegation activée
  - [ ] Scopes OAuth approuvés
  - [ ] Test alias créé (test@seido-app.com)

- [ ] **Supabase**
  - [ ] Migration appliquée (4 tables)
  - [ ] RLS policies activées
  - [ ] Bucket "email-attachments" créé
  - [ ] Storage policies configurées
  - [ ] TypeScript types générés

- [ ] **Variables d'Environnement**
  - [ ] NEXT_PUBLIC_GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] GOOGLE_REDIRECT_URI
  - [ ] GOOGLE_REFRESH_TOKEN
  - [ ] GOOGLE_PUBSUB_TOPIC
  - [ ] CRON_SECRET (Vercel)

### 11.2 Tests Fonctionnels

- [ ] **Email Reception**
  - [ ] Envoyer email → test@seido-app.com
  - [ ] Vérifier réception webhook (< 5s)
  - [ ] Vérifier stockage DB correct
  - [ ] Vérifier attachments stockés
  - [ ] Vérifier détection team

- [ ] **Email Actions**
  - [ ] Marquer lu/non-lu
  - [ ] Toggle star
  - [ ] Archiver/désarchiver
  - [ ] Lier à bien
  - [ ] Créer intervention
  - [ ] Marquer non pertinent

- [ ] **Recherche & Filtres**
  - [ ] Recherche full-text (French)
  - [ ] Filtre lu/non-lu
  - [ ] Filtre starred
  - [ ] Filtre par bien
  - [ ] Pagination

- [ ] **Permissions**
  - [ ] Team A ne voit pas emails Team B
  - [ ] Gestionnaire peut tout voir
  - [ ] Locataire ne voit rien (pas accès mail)

### 11.3 Tests Performance

- [ ] **Load Testing**
  - [ ] 100 emails concurrent (< 30s traitement)
  - [ ] 1000 emails dans DB (query < 1s)
  - [ ] 10 attachments 5MB chacun (< 10s upload)

- [ ] **Monitoring**
  - [ ] Sentry configuré (errors tracking)
  - [ ] Vercel Analytics (performance)
  - [ ] Gmail watch renewal logs
  - [ ] Database slow query logs

### 11.4 Sécurité

- [ ] **OWASP Checklist**
  - [ ] Injection SQL: RLS policies testées
  - [ ] XSS: HTML sanitization (DOMPurify)
  - [ ] CSRF: Next.js default protection
  - [ ] Sensitive data: Refresh token encrypted
  - [ ] File upload: Size limits (25MB)

- [ ] **GDPR**
  - [ ] Politique rétention 2 ans configurée
  - [ ] Cron cleanup testé
  - [ ] Export emails implémenté
  - [ ] Soft delete fonctionnel

### 11.5 Documentation

- [ ] **Guides Utilisateur**
  - [ ] Comment transférer emails
  - [ ] Comment lier à un bien
  - [ ] Comment créer intervention
  - [ ] FAQ troubleshooting

- [ ] **Guides Admin**
  - [ ] Comment créer alias pour équipe
  - [ ] Comment surveiller quotas Gmail
  - [ ] Comment renouveler watch si expiré
  - [ ] Procédure incident (emails manquants)

- [ ] **Documentation Technique**
  - [ ] Architecture overview (ce document)
  - [ ] Runbook maintenance
  - [ ] Monitoring dashboards
  - [ ] Disaster recovery plan

---

## 12. Ressources & Documentation

### 12.1 Documentation Officielle

**Google APIs**:
- [Gmail API - Push Notifications](https://developers.google.com/gmail/api/guides/push)
- [Gmail API - OAuth Server-Side](https://developers.google.com/gmail/api/auth/web-server)
- [Google Workspace Admin SDK - User Aliases](https://developers.google.com/workspace/admin/directory/v1/guides/manage-user-aliases)
- [Cloud Pub/Sub - Push Subscriptions](https://cloud.google.com/pubsub/docs/push)
- [Cloud Pub/Sub - Verify Push Requests](https://cloud.google.com/pubsub/docs/push#verify_push_requests)

**Next.js**:
- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

**Supabase**:
- [Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Full-Text Search](https://supabase.com/docs/guides/database/full-text-search)

**Libraries**:
- [mailparser (npm)](https://www.npmjs.com/package/mailparser)
- [googleapis (npm)](https://www.npmjs.com/package/googleapis)
- [DOMPurify (npm)](https://www.npmjs.com/package/isomorphic-dompurify)

### 12.2 Exemples de Code

**Gmail API Client Setup**:
```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://seido.pm/api/auth/google/callback'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
```

**Email Parsing**:
```typescript
import { simpleParser } from 'mailparser';

const rawEmail = Buffer.from(gmailMessage.raw, 'base64').toString();
const parsed = await simpleParser(rawEmail);

console.log(parsed.from);        // { value: [{ address, name }] }
console.log(parsed.subject);     // "Subject line"
console.log(parsed.text);        // Plain text body
console.log(parsed.html);        // HTML body
console.log(parsed.attachments); // [{ filename, content, contentType }]
```

**Full-Text Search Query**:
```sql
-- PostgreSQL tsvector search
SELECT * FROM emails
WHERE search_vector @@ websearch_to_tsquery('french', 'fuite plomberie')
ORDER BY ts_rank(search_vector, websearch_to_tsquery('french', 'fuite plomberie')) DESC
LIMIT 20;
```

### 12.3 Outils Recommandés

**Développement**:
- [ngrok](https://ngrok.com/) - Tester webhooks localement
- [Postman](https://www.postman.com/) - Tester Gmail API
- [Supabase Studio](https://supabase.com/docs/guides/cli) - Gérer base de données

**Monitoring**:
- [Sentry](https://sentry.io/) - Error tracking
- [Vercel Analytics](https://vercel.com/analytics) - Performance monitoring
- [Google Cloud Console](https://console.cloud.google.com/) - Quotas & logs

**Testing**:
- [Playwright](https://playwright.dev/) - E2E tests
- [Vitest](https://vitest.dev/) - Unit tests
- [MailHog](https://github.com/mailhog/MailHog) - Email testing (dev)

---

## 13. Support & Maintenance

### 13.1 Contacts

**Équipe SEIDO**:
- **Tech Lead**: [Nom] - tech@seido-app.com
- **DevOps**: [Nom] - devops@seido-app.com
- **Support**: support@seido-app.com

**Google Cloud Support**:
- Console: https://console.cloud.google.com/support
- Quotas: https://console.cloud.google.com/apis/api/gmail.googleapis.com/quotas

### 13.2 Runbook Incidents

**Incident: Emails non reçus**

1. **Vérifier Gmail watch**:
   ```sql
   SELECT * FROM gmail_watch_state WHERE user_email = 'gestionnaires@seido-app.com';
   ```

2. **Si expiré, renouveler**:
   ```bash
   curl -X GET https://seido.pm/api/cron/renew-gmail-watch \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

3. **Vérifier Pub/Sub logs**:
   - Console → Pub/Sub → Subscriptions → seido-gmail-webhook
   - Vérifier "Delivery attempts" et "Errors"

4. **Tester manuellement**:
   ```bash
   gcloud pubsub topics publish gmail-notifications \
     --message='{"emailAddress":"gestionnaires@seido-app.com","historyId":"123"}' \
     --project=seido-production
   ```

**Incident: Quota dépassé**

1. **Vérifier quotas**:
   - Console → APIs & Services → Gmail API → Quotas

2. **Solutions temporaires**:
   - Activer exponential backoff
   - Réduire fréquence fetch

3. **Solution permanente**:
   - Demander augmentation quota (formulaire Google Cloud)

---

## Conclusion

Ce guide fournit une feuille de route complète pour l'implémentation de l'intégration email SEIDO. L'architecture proposée est:

✅ **Scalable**: Supporte 10,000+ équipes sans modification (actuellement 10 équipes)
✅ **Sécurisée**: Encryption, RLS policies, GDPR-compliant
✅ **Performante**: < 5s latency, full-text search, caching
✅ **Maintenable**: Repository Pattern, tests > 80%, documentation
✅ **Cost-effective**: $12.32/mois pour 10 équipes ($1.23/équipe/mois)

---

## 🚀 Prochaines Étapes IMMEDIATES (Configuration SEIDO)

### Étape 0: Prérequis Google Workspace (À FAIRE EN PREMIER) ⏱️ 3-5 jours

**🔴 CRITIQUE**: Sans cela, l'implémentation technique ne peut pas commencer.

#### Actions Immédiates

1. **Aujourd'hui**:
   - [ ] Souscrire à Google Workspace Business Standard
   - [ ] URL: https://workspace.google.com/intl/fr/pricing/
   - [ ] Coût: $12/mois (obligatoire pour aliases)
   - [ ] Domaine: seido.pm

2. **Demain (après vérification domaine)**:
   - [ ] Créer utilisateur `gestionnaires@seido-app.com`
   - [ ] Activer rôle Super Admin
   - [ ] Configurer 2FA pour sécurité

3. **Jour 3-4**:
   - [ ] Créer 3 alias test manuellement:
     - `test@seido-app.com`
     - `team1@seido-app.com`
     - `team2@seido-app.com`
   - [ ] Tester réception emails

4. **Jour 5 - Validation Go/No-Go**:
   - [ ] Confirmer tous les alias fonctionnent
   - [ ] Documenter credentials (1Password)
   - [ ] ✅ PRÊT pour Phase 1 technique

**⚠️ Si blocage**: Contacter support Google Workspace

---

### Timeline Complète Projet

```
PHASE 0 (Prérequis)
├─ Jour 1-5: Google Workspace setup ⚠️ CRITIQUE
│
PHASE 1-2 (Priorité #1: Réception Emails) 🎯
├─ Semaine 1-2: Infrastructure (Google Cloud + Database)
├─ Semaine 3-4: Backend (Repositories + Services + Webhook)
│   └─ 🎉 MILESTONE: Emails reçus et stockés dans DB
│
PHASE 3 (UI Basique)
├─ Semaine 5-6: Interface liste + détail emails
│   └─ 🎉 MILESTONE: Utilisateurs voient emails dans app
│
PHASE 4-5 (Features Avancées)
├─ Semaine 7: Gestion aliases admin
├─ Semaine 8: Polish + tests complets
    └─ 🎉 GO LIVE Production
```

**📊 Durée totale**: 3-5 jours (prérequis) + 8 semaines (dev) = **~9 semaines**

---

### Budget Projet

| Poste | Coût |
|-------|------|
| **Google Workspace** (mensuel) | $12/mois |
| **Supabase Storage** (mensuel) | $0.32/mois |
| **Développement** (estimé 320h × taux horaire) | Variable |
| **Total Infrastructure/an** | ~$148/an |

**ROI Attendu**:
- ⏱️ Gain temps gestionnaires: ~2h/semaine/équipe = 20h/semaine totales
- 📧 Centralisation emails = moins d'oublis interventions
- 🔍 Recherche historique emails = meilleure traçabilité

---

### Questions Fréquentes (FAQ)

**Q: Peut-on commencer l'implémentation sans Google Workspace ?**
❌ Non. Les alias emails nécessitent Google Workspace Business Standard minimum.

**Q: Combien de temps avant de voir les premiers emails dans l'app ?**
⏱️ ~4 semaines après début Phase 1 (si Phase 0 complétée).

**Q: Peut-on utiliser un autre provider email (Microsoft 365) ?**
⚠️ Oui mais nécessite refonte architecture (Microsoft Graph API). Gmail API recommandé.

**Q: Que se passe-t-il si on dépasse 30 alias (limite Google) ?**
💡 Créer 2ème compte `gestionnaires2@seido-app.com` ($12/mois additionnel) = 60 alias totaux.

**Q: Les emails sont-ils chiffrés ?**
✅ Oui. AES-256 at rest (Supabase), TLS 1.3 in transit.

---

### Support Projet

**Documentation**:
- 📄 Ce guide complet (13 sections)
- 🔗 Liens officiels: [Section 12](#12-ressources--documentation)
- ✅ Checklist pré-prod: [Section 11](#11-checklist-pré-production)

**Contacts**:
- Questions architecture: Consulter sections 2-5
- Questions coûts: Consulter section 10.1
- Blockers: Consulter section 9

**Prochaine Action**: Souscrire Google Workspace Business Standard (lien ci-dessus) 👆

---

**Document Version**: 1.1 (Adapté configuration SEIDO)
**Dernière mise à jour**: 2025-11-04
**Configuration**: 10 équipes, 200 emails/jour
**Auteur**: Claude Code (Anthropic)
**Statut**: 📋 Ready for Phase 0 (Google Workspace Setup)
