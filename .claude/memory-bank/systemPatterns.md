# SEIDO System Patterns & Architecture

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 App Router                    │
├─────────────────────────────────────────────────────────────┤
│  Server Components (default)  │  Client Components (minimal) │
│  - Page data loading          │  - Interactive forms         │
│  - Auth via getServerAuth()   │  - Real-time updates         │
├─────────────────────────────────────────────────────────────┤
│                    Domain Services (31)                      │
│  intervention, notification, email, gmail-oauth, etc.       │
├─────────────────────────────────────────────────────────────┤
│                    Repositories (21)                         │
│  intervention, notification, user, building, email-link...  │
├─────────────────────────────────────────────────────────────┤
│                    Supabase (PostgreSQL + RLS)               │
│  38 tables | 77 fonctions | 209 indexes | 47 triggers       │
└─────────────────────────────────────────────────────────────┘
```

## Patterns Critiques à Respecter

### 1. Server Authentication (OBLIGATOIRE)

Toutes les pages Server Components DOIVENT utiliser `getServerAuthContext()` :

```typescript
// ✅ CORRECT - Pattern centralisé
import { getServerAuthContext } from '@/lib/server-context'

export default async function Page() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  // team.id est TOUJOURS disponible ici
}

// ❌ INTERDIT - Auth manuelle
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
// ... 10+ lignes de code dupliqué
```

> 📚 Source: lib/server-context.ts - 21 pages migrées vers ce pattern

### 2. Repository Pattern (OBLIGATOIRE)

JAMAIS d'appels Supabase directs dans les composants ou services :

```typescript
// ✅ CORRECT - Via Repository
const repository = new InterventionRepository(supabase)
const interventions = await repository.findAll()

// ❌ INTERDIT - Appel direct Supabase
const { data } = await supabase.from('interventions').select('*')
```

> 📚 Source: lib/services/README.md - 21 repositories implémentés (incl. email-link)

### 3. Notification Architecture

Flux obligatoire pour les notifications multi-canal :

```
Server Action → Domain Service → Repository → Supabase
                    ↓                ↓
             Push Notifications   Email (Resend)
```

**16 Server Actions disponibles** (`app/actions/notification-actions.ts`) :
- `createInterventionNotification`, `notifyInterventionStatusChange`
- `createBuildingNotification`, `notifyBuildingUpdated`, `notifyBuildingDeleted`
- `createLotNotification`, `notifyLotUpdated`, `notifyLotDeleted`
- `createContactNotification`
- `markNotificationAsRead`, `markAllNotificationsAsRead`
- `createCustomNotification`, `notifyDocumentUploaded`
- `notifyContractExpiring`, `checkExpiringContracts`, `createContractNotification`

```typescript
// Exemple d'utilisation
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

> 📚 Source: app/actions/notification-actions.ts (1249 lignes)

### 4. Real-time (Single Channel)

Un seul canal WebSocket par utilisateur via RealtimeProvider :

```typescript
// ✅ CORRECT - Hooks v2 via RealtimeProvider
import { useRealtimeNotificationsV2 } from '@/hooks/use-realtime-notifications-v2'

// Tables écoutées: notifications, conversation_messages,
// interventions, intervention_quotes, intervention_time_slots, emails
```

> 📚 Source: contexts/realtime-context.tsx

### 5. Intervention Status Flow

```
demande → approuvee/rejetee → demande_de_devis → planification →
planifiee → en_cours → cloturee_par_prestataire →
cloturee_par_locataire → cloturee_par_gestionnaire
```

### 6. Entity Creation Pattern

```typescript
// ✅ RECOMMENDED - Server Action avec redirect()
export async function createEntityAction(data, options) {
  const result = await service.create(data)
  revalidateTag('entities')
  if (options?.redirectTo) redirect(options.redirectTo)
  return result
}

// Alternative - API Route + toast + router.push (pour FormData/uploads)
```

### 7. Push Notifications (PWA)

Flux de notification push via Service Worker :

```
Server Action → sendPushToNotificationRecipients()
                    ↓
lib/send-push-notification.ts (sendPushNotificationToUsers)
                    ↓
Table push_subscriptions → web-push library → Service Worker
```

**Fichiers clés :**
- `lib/push-notification-manager.ts` - Client subscription management
- `lib/send-push-notification.ts` - Server push sending
- `app/api/push/subscribe/route.ts` - API subscription
- `app/api/push/unsubscribe/route.ts` - API unsubscription

**Règle de filtrage :** Push uniquement aux destinataires `is_personal: true` pour éviter notification fatigue.

> 📚 Source: app/actions/notification-actions.ts, lib/send-push-notification.ts

### 8. Email Reply Sync

Synchronisation des réponses email vers les conversations :

```
Webhook → /api/webhooks/resend-inbound
                    ↓
email-reply.service.ts (parseReplyToAddress, validateHmac)
                    ↓
email-to-conversation.service.ts (syncEmailReplyToConversation)
                    ↓
Table conversation_messages (source: 'email')
```

**Format Reply-To :** `reply+int_{intervention_id}_{hmac_hash}@reply.seido-app.com`

> 📚 Source: app/api/webhooks/resend-inbound/route.ts, lib/services/domain/email-reply.service.ts

### 9. Magic Links (Auto-Login Email)

Authentification automatique via email CTA :

```
email-notification.service.ts
        ↓
magic-link.service.ts (generateMagicLinksBatch)
        ↓
/auth/email-callback?token_hash=xxx&next=/path
        ↓
supabase.auth.verifyOtp() + redirect(next)
```

**Sécurité :**
- Tokens cryptographiquement sécurisés (Supabase Auth)
- Protection open-redirect via `validateNextParameter()`
- Fallback URL si génération échoue

> 📚 Source: lib/services/domain/magic-link.service.ts, app/auth/email-callback/route.ts

### 10. Module Facade Pattern (Refactoring Large Files)

Pattern utilisé pour découper les gros fichiers (>500 lignes) en modules maintenables avec rétrocompatibilité :

```
lib/services/domain/
├── email-notification.service.ts    ← Facade (re-export) - backward compat
├── email-notification.factory.ts    ← Factory (webpack-safe)
└── email-notification/              ← Module principal
    ├── index.ts                     ← Re-exports centralisés
    ├── types.ts                     ← Interfaces partagées
    ├── constants.ts                 ← Configuration
    ├── helpers.ts                   ← Utilitaires purs
    ├── action-link-generators.ts    ← Générateurs magic links
    ├── data-enricher.ts             ← Data fetching consolidé
    ├── email-sender.ts              ← Batch sending + retry
    ├── email-notification.service.ts ← Orchestrateur slim
    └── builders/                    ← Email builders par type
        ├── index.ts
        ├── intervention-created.builder.ts
        ├── intervention-scheduled.builder.ts
        └── ...
```

**Principes :**
1. **Facade de compatibilité** : L'ancien chemin d'import reste fonctionnel
2. **Single Responsibility** : Chaque fichier < 500 lignes, un seul concern
3. **Dependency Injection** : Repositories injectés via constructeur
4. **Builder Pattern** : Un builder par type d'email

**Exemple d'import (backward compat):**
```typescript
// ✅ Les deux imports fonctionnent identiquement
import { EmailNotificationService } from '@/lib/services/domain/email-notification.service'
import { EmailNotificationService } from '@/lib/services/domain/email-notification'
```

> 📚 Source: lib/services/domain/email-notification/ (15 fichiers, ~2,600 lignes total)

## Anti-Patterns (NE JAMAIS FAIRE)

| ❌ Anti-Pattern | ✅ Alternative |
|-----------------|----------------|
| Appels Supabase directs | Passer par Repository |
| Client Components par défaut | Server Components par défaut |
| Auth manuelle | `getServerAuthContext()` |
| Channels realtime multiples | RealtimeProvider unique |
| `npm run build` automatique | Demander à l'utilisateur |
| Singleton notification legacy | Server Actions |

## Conventions de Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Components | kebab-case | `intervention-card.tsx` |
| Hooks | camelCase + use | `useAuth.ts` |
| Services | kebab-case + .service | `notification.service.ts` |
| Repositories | kebab-case + .repository | `user.repository.ts` |
| API Routes | kebab-case | `/api/intervention-quotes` |
| Server Actions | kebab-case + -actions | `notification-actions.ts` |

## Structure des Dossiers

```
app/[role]/          # Routes par rôle (admin, gestionnaire, prestataire, locataire)
components/          # 369 composants
hooks/               # 58 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase, base repository, error handler
  repositories/      # 21 repositories (accès données)
  domain/            # 31 services (logique métier)
contexts/            # 3 React contexts (auth, team, realtime)
tests/               # Infrastructure E2E
```

## Services Email (Nouveaux 2026-01)

**Services ajoutés pour Gmail OAuth et conversation threading :**
- `gmail-oauth.service.ts` - Authentification Gmail OAuth
- `email-notification.factory.ts` - Factory pour emails transactionnels
- `email-reply.service.ts` - Traitement des réponses email
- `email-to-conversation.service.ts` - Sync emails → conversations
- `email-link.repository.ts` - Tracking liens emails

---
*Dernière mise à jour: 2026-01-23*
*Références: lib/services/README.md, lib/server-context.ts*
