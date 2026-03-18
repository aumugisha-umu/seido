# Test connexion IMAP/SMTP multi-providers

Guide pour tester la fonctionnalite de connexion de boite mail avec de vrais comptes email.

## Setup (une seule fois)

### 1. Creer les comptes de test

| Provider | IMAP Host | Port | SMTP Host | Port |
|----------|-----------|------|-----------|------|
| Gmail | `imap.gmail.com` | 993 | `smtp.gmail.com` | 587 |
| Outlook | `outlook.office365.com` | 993 | `smtp.office365.com` | 587 |
| Yahoo | `imap.mail.yahoo.com` | 993 | `smtp.mail.yahoo.com` | 587 |

### 2. Generer un mot de passe d'application par provider

- **Gmail** : myaccount.google.com > Securite > Verification en 2 etapes > Mots de passe des applications
- **Outlook** : account.microsoft.com > Securite > Options avancees > Mots de passe d'application
- **Yahoo** : login.yahoo.com > Securite du compte > Generer un mot de passe d'application

### 3. Ajouter les credentials dans `.env.local`

```env
# Email test accounts (ne PAS commiter)
TEST_GMAIL_USER=ton.email@gmail.com
TEST_GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

TEST_OUTLOOK_USER=ton.email@outlook.com
TEST_OUTLOOK_APP_PASSWORD=xxxxxxxxxxxx

TEST_YAHOO_USER=ton.email@yahoo.com
TEST_YAHOO_APP_PASSWORD=xxxxxxxxxxxx
```

> Pas besoin de remplir les 3 — le script skip les providers sans credentials.

## Lancer le test

```bash
npx tsx scripts/test-email-providers.ts
```

### Output attendu

```
===========================================
  SEIDO - Email Provider Connection Test
===========================================

--- Gmail (test@gmail.com) ---
  IMAP: testing... OK (142 emails, 12 folders)
        Folders: INBOX, [Gmail], Drafts, Sent, Spam...
  SMTP: testing... OK

--- Outlook (test@outlook.com) ---
  IMAP: testing... OK (23 emails, 6 folders)
  SMTP: testing... OK

===========================================
  Summary
===========================================
  Provider    | IMAP  | SMTP
  ------------|-------|------
  Gmail       | OK    | OK
  Outlook     | OK    | OK
```

## Astuce : aliases Gmail

Un seul compte Gmail peut simuler plusieurs adresses :
- `ton.email+seido1@gmail.com`
- `ton.email+locataire@gmail.com`
- `ton.email+prestataire@gmail.com`

Tous arrivent dans la meme boite, mais SEIDO les voit comme des adresses differentes.

## Fichiers lies

| Fichier | Role |
|---------|------|
| `scripts/test-email-providers.ts` | Script CLI multi-providers |
| `scripts/test-sync.ts` | Script CLI sync complet (fetch emails) |
| `lib/services/domain/email-connection-test.service.ts` | Service reutilisable (IMAP + SMTP test) |
| `app/api/emails/connections/test/route.ts` | API test nouvelles credentials |
| `app/api/emails/connections/[id]/test/route.ts` | API test connexion existante en DB |

## Troubleshooting

| Erreur | Cause | Solution |
|--------|-------|----------|
| `Invalid credentials` | Mot de passe du compte au lieu de l'app password | Generer un mot de passe d'application |
| `AUTHENTICATIONFAILED` | 2FA pas activee | Activer la verification en 2 etapes d'abord |
| `Connection timed out` | Port bloque par firewall/VPN | Tester sans VPN, verifier port 993 ouvert |
| `Certificate error` | Proxy corporate interceptant TLS | `tlsOptions: { rejectUnauthorized: false }` (deja configure) |
