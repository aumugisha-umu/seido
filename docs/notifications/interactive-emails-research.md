# Recherche : Emails Interactifs pour SEIDO

> **Date** : 2026-01-22
> **Objectif** : Permettre aux utilisateurs d'agir directement depuis leurs emails
> **Cas d'usage principal** : Accepter/refuser des créneaux d'intervention sans friction

---

## Table des Matières

1. [Objectif Utilisateur](#1-objectif-utilisateur)
2. [Technologies Disponibles](#2-technologies-disponibles)
3. [Analyse Comparative](#3-analyse-comparative)
4. [Recommandation SEIDO](#4-recommandation-seido)
5. [Plan d'Implémentation](#5-plan-dimplémentation)
6. [Sources et Références](#6-sources-et-références)

---

## 1. Objectif Utilisateur

### Scénario Idéal

```
┌────────────────────────────────────────────────────────────────────┐
│                     EMAIL REÇU PAR LOCATAIRE                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Bonjour Jean,                                                      │
│                                                                     │
│  L'intervention "Fuite robinet cuisine" a été planifiée.           │
│  Voici les créneaux proposés :                                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📅 Lundi 25 janvier 2026                                     │   │
│  │    09:00 - 12:00                                             │   │
│  │    [ ✅ Accepter ]  [ ❌ Refuser ]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📅 Mardi 26 janvier 2026                                     │   │
│  │    14:00 - 17:00                                             │   │
│  │    [ ✅ Accepter ]  [ ❌ Refuser ]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 📅 Mercredi 27 janvier 2026                                  │   │
│  │    09:00 - 12:00                                             │   │
│  │    [ ✅ Accepter ]  [ ❌ Refuser ]                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ───────────────────────────────────────────────────────────────   │
│                                                                     │
│  💬 Avez-vous un commentaire ?                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ [                                                         ] │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                        [ Envoyer ]                                  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Actions Souhaitées

| Action | Comportement Idéal | Friction Minimale |
|--------|-------------------|-------------------|
| Accepter un créneau | 1 clic → créneau confirmé | Sans quitter l'email |
| Refuser un créneau | 1 clic → créneau refusé | Sans quitter l'email |
| Ajouter un commentaire | Saisir texte + bouton | Sans quitter l'email |
| Valider travaux | 1 clic → intervention validée | Sans quitter l'email |
| Contester travaux | 1 clic → ouvre formulaire | Avec magic link |

---

## 2. Technologies Disponibles

### 2.1 AMP for Email (Google)

**Description** : Format email permettant du contenu dynamique et interactif directement dans l'inbox.

**Capacités** :
- ✅ Formulaires dans l'email
- ✅ Boutons d'action
- ✅ Carousels d'images
- ✅ Accordéons
- ✅ Données temps réel (fetch API)
- ✅ Validation côté client

**Support Clients Email** (2026) :
| Client | Support AMP | Part de Marché |
|--------|-------------|----------------|
| Gmail | ✅ Complet | ~35% monde, 53% USA |
| Yahoo Mail | ✅ Complet | ~10% |
| Mail.ru | ✅ Complet | ~5% (Russie) |
| Outlook | ❌ Non | ~20% |
| Apple Mail | ❌ Non | ~15% |
| **Total supporté** | | **~40-50%** |

**Prérequis** :
- Sender whitelisting avec Google (obligatoire)
- Fallback HTML obligatoire
- Validation AMP obligatoire
- SPF + DKIM + DMARC

**Limitations** :
- Pas de support React Email natif
- Nécessite serveur pour recevoir les actions
- Complexité de maintenance (2 versions email)

### 2.2 Gmail Schema.org Actions

**Description** : Markup JSON-LD ajouté aux emails pour créer des boutons d'action natifs Gmail.

**Types d'Actions** :

#### ConfirmAction (One-Click)
```json
{
  "@context": "http://schema.org",
  "@type": "EmailMessage",
  "potentialAction": {
    "@type": "ConfirmAction",
    "name": "Accepter ce créneau",
    "handler": {
      "@type": "HttpActionHandler",
      "url": "https://app.seido.com/api/email-actions/confirm-slot?slotId=xxx&token=yyy"
    }
  }
}
```
- 1 clic = HTTP POST vers URL
- Bouton change d'apparence après clic
- Usage unique (ne peut être cliqué qu'une fois)

#### RsvpAction (Oui/Peut-être/Non)
```json
{
  "@context": "http://schema.org",
  "@type": "Event",
  "potentialAction": {
    "@type": "RsvpAction",
    "attendance": ["http://schema.org/RsvpAttendance/Yes", "http://schema.org/RsvpAttendance/No"]
  }
}
```
- Ajoute automatiquement au Google Calendar si accepté
- Popup native Gmail

#### ViewAction (Go-To)
```json
{
  "@context": "http://schema.org",
  "@type": "EmailMessage",
  "potentialAction": {
    "@type": "ViewAction",
    "url": "https://app.seido.com/intervention/xxx",
    "name": "Voir l'intervention"
  }
}
```
- Bouton qui redirige vers URL
- Peut être combiné avec magic link

**Prérequis** :
- **Registration Google obligatoire** : [developers.google.com/gmail/markup/registering-with-google](https://developers.google.com/gmail/markup/registering-with-google)
- Volume minimum : 100 emails/jour vers Gmail pendant quelques semaines
- Taux de spam très faible
- SPF + DKIM alignés avec domaine From
- Email statique et cohérent

**Process Registration** :
1. Configurer SPF/DKIM/DMARC
2. Envoyer 100+ emails/jour pendant 2-3 semaines
3. Envoyer email exemple à `schema.whitelisting+sample@gmail.com`
4. Remplir formulaire registration
5. Attendre ~1 semaine (prévoir plus)

### 2.3 Magic Links avec Paramètres d'Action

**Description** : URLs pré-authentifiées avec paramètres d'action inclus.

**Fonctionnement Actuel SEIDO** :
```
https://app.seido.com/auth/email-callback
  ?token_hash=xxxxx
  &next=/gestionnaire/interventions/abc123
```

**Extension Proposée** :
```
https://app.seido.com/auth/email-callback
  ?token_hash=xxxxx
  &next=/gestionnaire/interventions/abc123
  &action=confirm_slot
  &slot_id=slot-uuid
  &auto_execute=true
```

**Flow** :
1. User clique sur bouton email
2. Callback vérifie token OTP (Supabase)
3. Session créée
4. Redirect vers page intervention
5. Page détecte paramètres `action` et `auto_execute`
6. Action exécutée automatiquement avec toast confirmation
7. User voit résultat sans manipulation

**Avantages** :
- ✅ Fonctionne sur TOUS les clients email
- ✅ Infrastructure magic link déjà en place
- ✅ Sécurisé (token OTP Supabase)
- ✅ Pas de registration externe
- ✅ Fallback naturel vers interface complète

**Inconvénients** :
- ❌ Ouvre toujours l'application (1 page de plus)
- ❌ Dépend de la vitesse de chargement app
- ❌ Nécessite JavaScript côté client

### 2.4 Reply-to Email avec Parsing

**Description** : Utiliser les réponses email pour déclencher des actions.

**Format Proposé** :
```
Pour accepter le créneau 1, répondez avec : ACCEPTER 1
Pour refuser le créneau 1, répondez avec : REFUSER 1
Pour ajouter un commentaire, répondez directement à cet email.
```

**Avantages** :
- ✅ Fonctionne partout
- ✅ Pas de clic, juste écrire
- ✅ Infrastructure email reply sync déjà en place

**Inconvénients** :
- ❌ UX moins intuitive
- ❌ Risque d'erreurs de parsing
- ❌ Plus lent (sync email async)

---

## 3. Analyse Comparative

### Matrice de Décision

| Critère | AMP Email | Gmail Actions | Magic Links+ | Reply Parsing |
|---------|-----------|---------------|--------------|---------------|
| **Couverture clients** | ~40-50% | ~35% Gmail | 100% | 100% |
| **Friction utilisateur** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Complexité implémentation** | ⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Dépendances externes** | Google whitelist | Google registration | Aucune | Aucune |
| **Maintenance** | Haute | Moyenne | Faible | Moyenne |
| **Time to market** | 3-4 semaines | 2-3 semaines | 1 semaine | 1 semaine |
| **Fonctionne offline** | ❌ | ❌ | ❌ | ✅ |

### Compatibilité avec Stack SEIDO

| Technologie | Compatible React Email | Compatible Resend | Effort |
|-------------|------------------------|-------------------|--------|
| AMP Email | ❌ Non natif | ✅ Headers custom | Élevé |
| Gmail Actions | ✅ JSON-LD dans HTML | ✅ Headers custom | Moyen |
| Magic Links+ | ✅ Boutons standard | ✅ Natif | Faible |
| Reply Parsing | N/A | ✅ Webhook | Moyen |

---

## 4. Recommandation SEIDO

### Approche Simplifiée Retenue ✅

Après analyse, l'approche la plus pragmatique utilise l'**infrastructure déjà en place** :

```
┌─────────────────────────────────────────────────────────────────┐
│                    STRATÉGIE SIMPLIFIÉE                          │
└─────────────────────────────────────────────────────────────────┘

   TOUS CLIENTS (100% couverture)
   │
   ├── 🔗 BOUTONS MAGIC LINK
   │   └── Chaque bouton "Voir l'intervention", "Valider", etc.
   │       utilise un magic link qui :
   │       1. Authentifie automatiquement l'utilisateur
   │       2. Redirige vers l'intervention concernée
   │       3. L'utilisateur effectue l'action dans l'app
   │
   └── 📧 RÉPONSE EMAIL POUR COMMENTAIRES
       └── Déjà implémenté via email reply sync :
           1. L'utilisateur répond directement à l'email
           2. Le webhook Resend capture la réponse
           3. Le quote stripping extrait le nouveau contenu
           4. Le message est ajouté à la conversation
```

### Pourquoi cette approche ?

| Critère | Approche Simplifiée | Approche Complexe (AMP/Gmail Actions) |
|---------|---------------------|---------------------------------------|
| **Couverture** | 100% des clients | 35-50% seulement |
| **Effort** | ~2-3 jours | 2-4 semaines |
| **Maintenance** | Faible | Élevée |
| **Déjà implémenté** | ~90% | 0% |
| **Dépendances** | Aucune | Google registration |

### Phase 1 : Magic Links+ avec Auto-Execute (Priorité 1)

**Effort** : ~1 semaine
**Impact** : 100% des utilisateurs

**Modifications** :

1. **Générer URLs avec paramètres d'action** :
```typescript
// Dans email-notification.service.ts
const acceptSlotUrl = await generateMagicLinkWithAction({
  email: recipient.email,
  redirectTo: `/gestionnaire/interventions/${interventionId}`,
  action: 'confirm_slot',
  params: { slotId: slot.id }
})
```

2. **Modifier callback pour détecter actions** :
```typescript
// Dans app/auth/email-callback/route.ts
const action = searchParams.get('action')
const autoExecute = searchParams.get('auto_execute') === 'true'

if (action && autoExecute) {
  // Stocker action dans session storage pour exécution côté client
  // Ou exécuter directement si action simple
}
```

3. **Composant client pour auto-execute** :
```typescript
// Hook useAutoExecuteAction
useEffect(() => {
  const pendingAction = sessionStorage.getItem('pending_action')
  if (pendingAction) {
    const { action, params } = JSON.parse(pendingAction)
    executeAction(action, params)
    sessionStorage.removeItem('pending_action')
  }
}, [])
```

### Phase 2 : Gmail Schema.org Actions (Priorité 2)

**Effort** : ~2-3 semaines (incluant registration)
**Impact** : ~35% des utilisateurs (Gmail)

**Étapes** :

1. **Configurer SPF/DKIM/DMARC** ✅ (déjà fait via Resend)

2. **Atteindre volume minimum** :
   - Actuellement SEIDO envoie probablement déjà 100+ emails/jour
   - Maintenir pendant 2-3 semaines avec bon taux deliverability

3. **Créer endpoint pour actions** :
```typescript
// app/api/email-actions/confirm-slot/route.ts
export async function POST(request: Request) {
  // Validation token
  // Exécution action
  // Retour 200 OK
}
```

4. **Ajouter JSON-LD aux templates** :
```typescript
// emails/time-slots-proposed.tsx
<script type="application/ld+json">
{JSON.stringify({
  "@context": "http://schema.org",
  "@type": "EmailMessage",
  "potentialAction": slots.map(slot => ({
    "@type": "ConfirmAction",
    "name": `Accepter ${formatDate(slot.date)}`,
    "handler": {
      "@type": "HttpActionHandler",
      "url": `https://app.seido.com/api/email-actions/confirm-slot?slotId=${slot.id}&token=${actionToken}`
    }
  }))
})}
</script>
```

5. **Soumettre à Google** :
   - Envoyer email test à `schema.whitelisting+sample@gmail.com`
   - Remplir formulaire registration
   - Attendre validation

### Phase 3 : AMP for Email (Optionnel - Priorité 3)

**Effort** : ~3-4 semaines
**Impact** : ~40-50% des utilisateurs (Gmail, Yahoo, Mail.ru)

**Considérations** :
- Complexité significative (double template)
- Pas de support React Email natif
- ROI incertain vu couverture similaire à Gmail Actions
- **Recommandation** : Reporter sauf si besoin formulaires complexes

---

## 5. Plan d'Implémentation

### Phase 1 : Magic Links+ (Semaine 1)

#### Jour 1-2 : Modification Service Magic Link

**Fichier** : `lib/services/domain/magic-link.service.ts`

```typescript
interface MagicLinkWithActionParams {
  email: string
  redirectTo: string
  action?: string
  params?: Record<string, string>
  autoExecute?: boolean
}

export async function generateMagicLinkWithAction({
  email,
  redirectTo,
  action,
  params,
  autoExecute = true
}: MagicLinkWithActionParams): Promise<string> {
  // Générer magic link standard
  const baseLink = await generateNotificationMagicLink({ email, redirectTo })

  if (!action) return baseLink

  // Ajouter paramètres d'action
  const url = new URL(baseLink)
  url.searchParams.set('action', action)
  url.searchParams.set('auto_execute', autoExecute.toString())

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(`param_${key}`, value)
    })
  }

  return url.toString()
}
```

#### Jour 3-4 : Modification Callback Auth

**Fichier** : `app/auth/email-callback/route.ts`

```typescript
export async function GET(request: NextRequest) {
  // ... vérification OTP existante ...

  // Extraire action si présente
  const action = searchParams.get('action')
  const autoExecute = searchParams.get('auto_execute') === 'true'

  // Collecter paramètres d'action
  const actionParams: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key.startsWith('param_')) {
      actionParams[key.replace('param_', '')] = value
    }
  })

  // Construire URL redirect avec action
  let redirectUrl = next
  if (action && autoExecute) {
    const actionData = JSON.stringify({ action, params: actionParams })
    // Encoder en base64 pour éviter problèmes URL
    const encodedAction = Buffer.from(actionData).toString('base64')
    redirectUrl = `${next}?pending_action=${encodedAction}`
  }

  return NextResponse.redirect(redirectUrl)
}
```

#### Jour 5 : Hook Auto-Execute Client

**Fichier** : `hooks/use-auto-execute-action.ts`

```typescript
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

interface PendingAction {
  action: string
  params: Record<string, string>
}

export function useAutoExecuteAction(
  interventionId: string,
  actions: Record<string, (params: Record<string, string>) => Promise<void>>
) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isExecuting, setIsExecuting] = useState(false)

  useEffect(() => {
    const pendingAction = searchParams.get('pending_action')
    if (!pendingAction || isExecuting) return

    const executePendingAction = async () => {
      setIsExecuting(true)
      try {
        const decoded = Buffer.from(pendingAction, 'base64').toString()
        const { action, params } = JSON.parse(decoded) as PendingAction

        const actionHandler = actions[action]
        if (!actionHandler) {
          toast({
            title: 'Action inconnue',
            description: `L'action "${action}" n'est pas reconnue`,
            variant: 'destructive'
          })
          return
        }

        await actionHandler(params)

        toast({
          title: 'Action effectuée',
          description: 'Votre action a été enregistrée avec succès',
          variant: 'success'
        })

        // Nettoyer URL
        const cleanUrl = window.location.pathname
        router.replace(cleanUrl)

      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible d\'effectuer l\'action automatique',
          variant: 'destructive'
        })
      } finally {
        setIsExecuting(false)
      }
    }

    executePendingAction()
  }, [searchParams, actions, isExecuting, router])

  return { isExecuting }
}
```

#### Jour 6-7 : Intégration Templates Email

**Fichier** : `emails/time-slots-proposed.tsx`

```tsx
// Générer URLs avec action pour chaque créneau
const slotActions = slots.map(slot => ({
  slot,
  acceptUrl: magicLinks.get(`accept_${slot.id}`),
  rejectUrl: magicLinks.get(`reject_${slot.id}`)
}))

// Dans le template
{slotActions.map(({ slot, acceptUrl, rejectUrl }) => (
  <Section key={slot.id} style={slotCardStyle}>
    <Text style={slotDateStyle}>
      📅 {formatDate(slot.proposed_date)}
    </Text>
    <Text style={slotTimeStyle}>
      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
    </Text>
    <Row>
      <Column>
        <Button href={acceptUrl} style={acceptButtonStyle}>
          ✅ Accepter
        </Button>
      </Column>
      <Column>
        <Button href={rejectUrl} style={rejectButtonStyle}>
          ❌ Refuser
        </Button>
      </Column>
    </Row>
  </Section>
))}
```

### Phase 2 : Gmail Actions (Semaines 2-4)

#### Semaine 2 : Préparation

- [ ] Vérifier volume emails quotidien vers Gmail
- [ ] Vérifier SPF/DKIM/DMARC configuration
- [ ] Créer endpoint actions sécurisé
- [ ] Générer tokens action (séparés des magic links)

#### Semaine 3 : Implémentation

- [ ] Ajouter JSON-LD aux templates email
- [ ] Tester avec email personnel Gmail
- [ ] Documenter tous les scénarios

#### Semaine 4 : Registration

- [ ] Envoyer email test à Google
- [ ] Remplir formulaire registration
- [ ] Attendre et suivre validation

---

## 6. Sources et Références

### Documentation Officielle

- [Google AMP for Email](https://developers.google.com/gmail/ampemail)
- [Gmail Schema.org Actions](https://developers.google.com/gmail/markup/actions/actions-overview)
- [Gmail Sender Registration](https://developers.google.com/gmail/markup/registering-with-google)
- [Schema.org EmailMessage](https://schema.org/EmailMessage)

### Articles de Référence

- [What is AMP Email: Examples, Use Cases, and Benefits (2026)](https://www.mailmodo.com/guides/amp-for-email/) - Mailmodo
- [Gmail Inbox Actions can improve your transactional emails](https://postmarkapp.com/guides/improve-your-transactional-emails-with-gmail-inbox-actions) - Postmark
- [12 Transactional Emails Best Practices to Follow in 2025](https://mailtrap.io/blog/transactional-emails-best-practices/) - Mailtrap
- [Magic Link Security: Best Practices & Advanced Techniques](https://guptadeepak.com/mastering-magic-link-security-a-deep-dive-for-developers/)
- [Email UX and Design Best Practices](https://www.emailonacid.com/blog/article/email-development/nail-your-email-ux-and-design-with-these-tips-for-best-practices/) - Email on Acid

### UX Best Practices

- CTA minimum 44x44px
- 1 action principale par email
- Fallback obligatoire
- Timeout magic links : 15-30 minutes recommandé
- Emails transactionnels : 8 secondes temps de lecture moyen

---

## Annexe : Exemples de Code

### A. Structure JSON-LD Gmail Actions

```json
{
  "@context": "http://schema.org",
  "@type": "EmailMessage",
  "description": "Proposition de créneaux pour intervention",
  "potentialAction": [
    {
      "@type": "ConfirmAction",
      "name": "Accepter Lundi 25/01 9h-12h",
      "handler": {
        "@type": "HttpActionHandler",
        "url": "https://app.seido.com/api/email-actions/slot?action=accept&slotId=abc123&token=xyz789",
        "method": "HttpRequestMethod/POST"
      }
    },
    {
      "@type": "ViewAction",
      "name": "Voir tous les créneaux",
      "url": "https://app.seido.com/auth/email-callback?token_hash=xxx&next=/interventions/123"
    }
  ],
  "publisher": {
    "@type": "Organization",
    "name": "SEIDO",
    "url": "https://app.seido.com"
  }
}
```

### B. Endpoint Action Sécurisé

```typescript
// app/api/email-actions/slot/route.ts
import { createServiceRoleSupabaseClient } from '@/lib/services'
import { verifyActionToken } from '@/lib/services/domain/email-action-token.service'

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const slotId = searchParams.get('slotId')
  const token = searchParams.get('token')

  // Vérifier token (HMAC avec expiration)
  const tokenValid = await verifyActionToken(token, { slotId, action })
  if (!tokenValid) {
    return new Response('Invalid or expired token', { status: 401 })
  }

  // Exécuter action
  const supabase = createServiceRoleSupabaseClient()

  if (action === 'accept') {
    await supabase
      .from('intervention_time_slots')
      .update({ status: 'confirmed_by_tenant' })
      .eq('id', slotId)
  } else if (action === 'reject') {
    await supabase
      .from('intervention_time_slots')
      .update({ status: 'rejected_by_tenant' })
      .eq('id', slotId)
  }

  // Gmail attend 200 OK
  return new Response('OK', { status: 200 })
}
```

---

*Document créé le 2026-01-22*
*Dernière mise à jour : 2026-01-22*
