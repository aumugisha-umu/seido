# 📧 Système d'Emails SEIDO - Documentation

## Vue d'ensemble

Système d'emails transactionnels pour l'application SEIDO, utilisant **Resend** avec des **templates React** pour garantir une cohérence visuelle et une compatibilité maximale avec tous les clients email.

## 🎯 Technologies

- **Resend** : Service d'envoi d'emails transactionnels
- **React Email** : Templates email en React avec composants réutilisables
- **TypeScript** : Type safety pour tous les templates et props
- **Tailwind CSS** : Styling inline pour compatibilité clients email

## 📁 Structure

```
emails/
├── components/              # Composants réutilisables
│   ├── email-layout.tsx    # Layout de base (HTML, Body, Container)
│   ├── email-header.tsx    # En-tête avec logo SEIDO
│   ├── email-footer.tsx    # Pied de page légal + liens
│   └── email-button.tsx    # Bouton CTA responsive (44px min)
├── templates/              # Templates par catégorie
│   └── auth/              # Templates authentification
│       ├── welcome.tsx              # Bienvenue + confirmation email
│       ├── password-reset.tsx       # Réinitialisation mot de passe
│       ├── password-changed.tsx     # Confirmation changement
│       └── invitation.tsx           # Invitation application
└── utils/
    ├── render.ts           # Utilitaires de rendu HTML
    └── types.ts            # Types TypeScript

lib/email/
├── resend-client.ts        # Client Resend singleton
└── email-service.ts        # Service d'envoi centralisé
```

## 🚀 Configuration

### 1. Variables d'environnement

Ajouter dans `.env.local` :

```bash
# Resend API Key (obligatoire)
RESEND_API_KEY=re_xxxxxxxxxxxx

# Email d'envoi (domaine vérifié dans Resend)
RESEND_FROM_EMAIL="SEIDO <notifications@seido-app.com>"

# Email de support
SUPPORT_EMAIL=support@seido-app.com

# URL de l'application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Vérifier le domaine dans Resend

1. Se connecter à [Resend Dashboard](https://resend.com/domains)
2. Ajouter votre domaine (ex: `seido-app.com`)
3. Configurer les enregistrements DNS (SPF, DKIM, DMARC)
4. Attendre validation (~24h max)

## 📧 Templates Disponibles

### 1. Welcome Email (Confirmation d'inscription)

**Fichier** : `emails/templates/auth/welcome.tsx`
**Utilisation** : Envoyé lors de l'inscription d'un nouvel utilisateur

```typescript
import { emailService } from '@/lib/email/email-service'

await emailService.sendWelcomeEmail('user@example.com', {
  firstName: 'Marie',
  confirmationUrl: 'https://seido-app.com/auth/confirm?token=abc123',
  role: 'gestionnaire',
})
```

**Props** :
- `firstName` : Prénom de l'utilisateur
- `confirmationUrl` : Lien de confirmation d'email
- `role` : Rôle de l'utilisateur (`admin` | `gestionnaire` | `prestataire` | `locataire`)

---

### 2. Password Reset Email (Réinitialisation)

**Fichier** : `emails/templates/auth/password-reset.tsx`
**Utilisation** : Envoyé lors d'une demande de réinitialisation de mot de passe

```typescript
await emailService.sendPasswordResetEmail('user@example.com', {
  firstName: 'Pierre',
  resetUrl: 'https://seido-app.com/auth/update-password?token=xyz789',
  expiresIn: 60, // minutes
})
```

**Props** :
- `firstName` : Prénom de l'utilisateur
- `resetUrl` : Lien de réinitialisation sécurisé
- `expiresIn` : Durée de validité (défaut: 60 minutes)

---

### 3. Password Changed Email (Confirmation changement)

**Fichier** : `emails/templates/auth/password-changed.tsx`
**Utilisation** : Envoyé après un changement réussi de mot de passe

```typescript
await emailService.sendPasswordChangedEmail('user@example.com', {
  firstName: 'Sophie',
  changeDate: new Date(),
})
```

**Props** :
- `firstName` : Prénom de l'utilisateur
- `changeDate` : Date du changement

---

### 4. Invitation Email (Invitation équipe)

**Fichier** : `emails/templates/auth/invitation.tsx`
**Utilisation** : Envoyé lorsqu'un gestionnaire invite un contact

```typescript
await emailService.sendInvitationEmail('user@example.com', {
  firstName: 'Thomas',
  inviterName: 'Marie Dupont',
  teamName: 'Résidence Les Jardins',
  role: 'prestataire',
  invitationUrl: 'https://seido-app.com/auth/signup?invitation=abc123',
  expiresIn: 7, // jours
})
```

**Props** :
- `firstName` : Prénom de l'invité
- `inviterName` : Nom de la personne qui invite
- `teamName` : Nom de l'équipe
- `role` : Rôle attribué
- `invitationUrl` : Lien d'invitation avec token
- `expiresIn` : Durée de validité (défaut: 7 jours)

## 🔧 Utilisation du Service d'Email

### Import

```typescript
import { emailService } from '@/lib/email/email-service'
```

### Envoi d'un email

```typescript
const result = await emailService.sendWelcomeEmail('user@example.com', {
  firstName: 'Marie',
  confirmationUrl: 'https://seido-app.com/confirm',
  role: 'gestionnaire',
})

if (result.success) {
  console.log('Email envoyé :', result.emailId)
} else {
  console.error('Erreur :', result.error)
}
```

### Retry automatique

Le service intègre un système de retry automatique (3 tentatives avec délai exponentiel) pour gérer les erreurs temporaires de Resend.

## 🎨 Créer un Nouveau Template

### 1. Créer le fichier template

```typescript
// emails/templates/category/my-template.tsx
import * as React from 'react'
import { Section, Text, Heading } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'

interface MyTemplateProps {
  firstName: string
  actionUrl: string
}

export const MyTemplate = ({ firstName, actionUrl }: MyTemplateProps) => {
  return (
    <EmailLayout preview="Preview text shown in inbox">
      <EmailHeader title="Section Title" />

      <Section className="bg-white px-8 py-8">
        <Heading className="text-gray-900 text-3xl font-bold mb-6 mt-0">
          Bonjour {firstName} !
        </Heading>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Votre message ici...
        </Text>

        <EmailButton href={actionUrl}>
          Appel à l'action
        </EmailButton>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

export default MyTemplate
```

### 2. Ajouter les types

```typescript
// emails/utils/types.ts
export interface MyTemplateProps extends BaseEmailProps {
  actionUrl: string
}
```

### 3. Ajouter la méthode au service

```typescript
// lib/email/email-service.ts
async sendMyEmail(to: string, props: MyTemplateProps): Promise<EmailSendResult> {
  const { default: MyTemplate } = await import('@/emails/templates/category/my-template')
  const { html, text } = renderEmail(MyTemplate(props))

  return sendEmailWithRetry({
    to,
    subject: 'Votre sujet',
    html,
    text,
    tags: [
      { name: 'category', value: 'category-name' },
      { name: 'type', value: 'template-type' },
    ],
  })
}
```

## 🧪 Tests & Validation

### Prévisualisation des templates

Utiliser React Email CLI pour prévisualiser :

```bash
npx react-email dev
```

Accéder à http://localhost:3000 pour voir tous les templates.

### Tests manuels

1. **Signup** : S'inscrire → vérifier email de bienvenue
2. **Reset password** : Demander reset → vérifier email reset
3. **Change password** : Changer password → vérifier email confirmation
4. **Invitation** : Inviter contact → vérifier email invitation

### Compatibilité clients email

Templates testés sur :
- ✅ Gmail (web + mobile)
- ✅ Outlook (web + desktop)
- ✅ Apple Mail (macOS + iOS)
- ✅ Yahoo Mail
- ✅ Thunderbird

## 📊 Monitoring

### Logs

Tous les envois d'emails sont loggés dans la console :

```
✅ [EMAIL-SENT] { to: 'user@example.com', subject: '...', emailId: 're_xxx' }
❌ [EMAIL-FAILED] { to: 'user@example.com', subject: '...', error: '...' }
```

### Dashboard Resend

Accéder au [Dashboard Resend](https://resend.com/emails) pour :
- Voir les emails envoyés
- Taux de délivrabilité
- Bounces et plaintes
- Statistiques par tag

## 🔐 Sécurité

### Best Practices

1. ✅ **Ne jamais** inclure de données sensibles dans les emails
2. ✅ **Toujours** utiliser HTTPS pour les liens
3. ✅ **Expiration** des liens temporaires (reset, invitation)
4. ✅ **Alertes** en cas d'activité suspecte (changement password non autorisé)

### Rate Limiting

Resend applique des limites :
- Plan gratuit : 100 emails/jour
- Plan Pro : 50 000+ emails/mois

## 🐛 Debugging

### Email non reçu ?

1. **Vérifier logs** : Console serveur pour erreurs
2. **Vérifier spam** : L'email peut être en spam
3. **Vérifier Dashboard Resend** : Voir status de delivery
4. **Vérifier domaine** : Domaine vérifié dans Resend ?
5. **Vérifier API key** : `RESEND_API_KEY` valide ?

### Styling cassé ?

1. **Utiliser inline styles** : Fallback pour `style={{ ... }}`
2. **Tester avec React Email CLI** : `npx react-email dev`
3. **Tester multi-clients** : Gmail, Outlook, Apple Mail

## 📝 Prochaines étapes

- [ ] Ajouter templates intervention (approval, rejection, etc.)
- [ ] Ajouter templates quote (request, approval, etc.)
- [ ] Support multi-langue (i18n)
- [ ] Templates PDF pour factures/devis
- [ ] Notifications temps réel (push + email)

---

**Dernière mise à jour** : 2 octobre 2025
**Maintenu par** : Équipe SEIDO
