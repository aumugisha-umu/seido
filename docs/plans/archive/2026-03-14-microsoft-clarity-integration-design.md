# Design: Microsoft Clarity Integration (remplace Contentsquare)

**Date**: 2026-03-14
**Status**: Validated
**Scope**: Supprimer Contentsquare, installer Microsoft Clarity avec custom tags B2B SaaS

---

## Contexte

SEIDO utilise Contentsquare (`t.contentsquare.net`) pour l'analytics comportemental, mais le produit n'etait pas utilise. On le remplace par Microsoft Clarity (gratuit, illimite) avec une configuration adaptee au SaaS B2B immobilier belge.

**Project IDs Clarity :**
- Dev : `uga8cs3xrq`
- Prod : `ug9t6psqrw`

---

## Architecture

### Env Variable

```
NEXT_PUBLIC_CLARITY_PROJECT_ID=uga8cs3xrq   # dev
NEXT_PUBLIC_CLARITY_PROJECT_ID=ug9t6psqrw   # prod (Vercel)
```

### Dependance npm

```bash
npm install @microsoft/clarity
```

### Fichiers a modifier

| Action | Fichier | Description |
|--------|---------|-------------|
| Supprimer | `app/layout.tsx` | Script Contentsquare |
| Reecrire | `components/analytics-provider.tsx` | Init Clarity + consent GDPR |
| Reecrire | `hooks/use-analytics-identify.ts` | identify + custom tags via Clarity API |
| Simplifier | `hooks/use-analytics-tracking.ts` | SPA tracking auto avec Clarity npm, hook potentiellement inutile |
| Modifier | `next.config.js` | CSP : contentsquare → clarity.ms + c.bing.com |
| Modifier | `.env.local` | Ajouter NEXT_PUBLIC_CLARITY_PROJECT_ID |
| Modifier | `.env.example` | Documenter la variable |

---

## Initialisation + Consent GDPR

```typescript
// analytics-provider.tsx
// 1. cookieConsent === 'accepted' → Clarity.init(projectId)
// 2. clarity("consent") — signal GDPR obligatoire pour EEA/Belgique
// 3. Si refus → Clarity ne s'initialise jamais
```

Sans `clarity("consent")`, Clarity ne collecte RIEN pour les visiteurs EU (depuis oct 2025).

---

## Custom Tags (apres auth)

| Tag | Valeurs | Raison |
|-----|---------|--------|
| `user_role` | gestionnaire / prestataire / locataire / admin | Segmenter replays par role |
| `subscription_status` | trialing / active / past_due / paused / read_only | Correler friction avec billing |
| `subscription_plan` | starter / pro / enterprise | Comparer comportement par plan |
| `properties_count` | nombre | Power users vs nouveaux |
| `team_size` | nombre | Friction grosses equipes |
| `onboarding_completed` | true / false | Isoler sessions onboarding |

**Identify** : `clarity("identify", hashedUserId)` — jamais de PII.

---

## Smart Events (config dashboard Clarity, zero code)

| Event | Declencheur | Insight |
|-------|-------------|---------|
| Rage clicks | Auto-detecte | UI cassee ou confuse |
| Dead clicks | Auto-detecte | Boutons non-reactifs |
| Billing page viewed | URL `/settings/billing` | Intent upgrade |
| Intervention created | URL `/nouveau` | Adoption workflow core |
| Onboarding checklist | URL `/dashboard` | Premier usage |

---

## Heatmaps

Automatiques sur toutes les pages (landing + app). Generees des qu'il y a du trafic. Aucune config code.

---

## CSP Headers (next.config.js)

| Directive | Supprimer | Ajouter |
|-----------|-----------|---------|
| `script-src` | `*.contentsquare.net *.contentsquare.com` | `*.clarity.ms` |
| `connect-src` | `*.contentsquare.net *.contentsquare.com` | `*.clarity.ms c.bing.com` |
| `img-src` | — | `*.clarity.ms` |
| `font-src` | — | `data:` (si absent) |

Memes changements dans `Content-Security-Policy-Report-Only` (bloc production).

---

## Cleanup Contentsquare

- `app/layout.tsx` : supprimer `<Script src="https://t.contentsquare.net/...">`
- `window._uxa` : supprimer toutes declarations de type et appels
- CSP : supprimer domaines contentsquare
- Aucun package npm a desinstaller (script externe)
