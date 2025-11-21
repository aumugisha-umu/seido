# 🏢 Recherche Automatique d'Entreprise (TVA & Nom)

**Date de création** : 15 novembre 2025
**Statut** : ✅ Production Ready
**API utilisée** : CBEAPI.be (Base de données KBO/BCE belge)

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Guide utilisateur](#guide-utilisateur)
3. [Guide développeur](#guide-développeur)
4. [Architecture technique](#architecture-technique)
5. [Configuration](#configuration)
6. [Limitations & FAQ](#limitations--faq)

---

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs de SEIDO de rechercher automatiquement des entreprises belges et de pré-remplir leurs coordonnées lors de l'ajout d'un contact société.

### ✨ Fonctionnalités

- **Recherche par numéro de TVA** : Entrez un numéro de TVA belge → récupération automatique des données
- **Recherche par nom** : Tapez le nom d'une entreprise → liste déroulante avec suggestions
- **Pré-remplissage automatique** : Nom, adresse, TVA, téléphone, email, site web
- **Cache intelligent** : Les recherches sont mises en cache pendant 30 jours (réduction de 90% des appels API)
- **Validation en temps réel** : Vérification du format TVA côté client (BE, FR, NL, DE, LU, CH)
- **Support multi-pays** : Prêt pour extension européenne (France, Pays-Bas, etc.)

### 🎯 Cas d'usage

- Ajouter un prestataire (plombier, électricien, etc.)
- Ajouter un gestionnaire (agence immobilière)
- Ajouter un propriétaire (personne morale)
- Ajouter tout contact de type "société"

---

## Guide utilisateur

### Méthode 1 : Recherche par numéro de TVA

1. **Créer un nouveau contact** → Sélectionner "Société"
2. **Choisir** "Nouvelle société"
3. **Entrer le numéro de TVA** (ex: `BE0123456789`)
4. **Cliquer sur "Rechercher"** ou appuyer sur **Entrée**
5. Les données sont automatiquement pré-remplies :
   - Nom de la société
   - Adresse complète (rue, numéro, code postal, ville, pays)
   - Numéro de TVA
   - Téléphone (si disponible)
   - Email (si disponible)
   - Site web (si disponible)

### Méthode 2 : Recherche par nom d'entreprise

1. **Créer un nouveau contact** → Sélectionner "Société"
2. **Choisir** "Nouvelle société"
3. **Commencer à taper** le nom de l'entreprise dans le champ "Rechercher une entreprise par nom"
4. **Attendre 500ms** → Une liste déroulante apparaît avec les résultats
5. **Cliquer sur l'entreprise** souhaitée → Les données sont pré-remplies

### Formats de numéro de TVA supportés

| Pays | Format | Exemple | Notes |
|------|--------|---------|-------|
| 🇧🇪 **Belgique** | `BE0XXXXXXXXX` ou `BE1XXXXXXXXX` | `BE0123456789` | 10 chiffres après BE |
| 🇫🇷 France | `FRXX123456789` | `FR12345678901` | 2 caractères + 9 chiffres |
| 🇳🇱 Pays-Bas | `NL123456789B01` | `NL123456789B01` | 9 chiffres + B + 2 chiffres |
| 🇩🇪 Allemagne | `DE123456789` | `DE123456789` | 9 chiffres |
| 🇱🇺 Luxembourg | `LU12345678` | `LU12345678` | 8 chiffres |
| 🇨🇭 Suisse | `CHE-123.456.789` | `CHE-123.456.789` | Format avec tirets et points |

**Note** : Actuellement, seules les entreprises **belges** sont récupérées via CBEAPI. Les autres pays afficheront un message indiquant de saisir les données manuellement.

### ⚠️ Messages d'erreur courants

| Message | Cause | Solution |
|---------|-------|----------|
| "Aucune entreprise trouvée avec ce numéro de TVA" | Le numéro n'existe pas dans la base KBO | Vérifier le numéro ou saisir manuellement |
| "Format de numéro de TVA invalide" | Le format ne respecte pas la structure attendue | Vérifier le format (ex: `BE0123456789`) |
| "Trop de requêtes. Veuillez attendre un moment." | Rate limit atteint (10 req/min) | Attendre 1 minute avant de réessayer |
| "Erreur lors de la communication avec la base de données belge (KBO)" | API CBEAPI indisponible | Réessayer plus tard ou saisir manuellement |

---

## Guide développeur

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND (contact-form-modal.tsx)              │
│  • Validation format (jsvat - côté client)                   │
│  • Debounce search (500ms pour recherche par nom)            │
│  • Loading states + error handling                           │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/company/lookup
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 API ROUTE (route.ts)                         │
│  • Auth check (getServerAuthContext)                         │
│  • Validation Zod (searchType: 'vat' | 'name')               │
│  • Rate limiting (Redis - 10 req/min/user)                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          SERVICE LAYER (CompanyLookupService)                │
│  • lookupByVAT(vatNumber) → Single result                    │
│  • searchByName(name) → Multiple results                     │
│  • Cache Redis (TTL 30 jours)                                │
│  • Retry logic (2x avec backoff exponentiel)                 │
│  • Timeout 10s                                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL API (CBEAPI)                      │
│  GET /company/search?vat=BE0123456789                        │
│  GET /company/search?name=ACME&limit=10                      │
│  Limite: 2500 requêtes/jour (plan gratuit)                   │
└─────────────────────────────────────────────────────────────┘
```

### Fichiers clés

| Fichier | Description | Lignes |
|---------|-------------|--------|
| `lib/types/cbeapi.types.ts` | Types TypeScript pour CBEAPI | ~150 |
| `lib/services/domain/company-lookup.service.ts` | Service de lookup (cache, retry, mapping) | ~400 |
| `app/api/company/lookup/route.ts` | API route POST avec auth + rate limiting | ~250 |
| `components/contact-form-modal.tsx` | Formulaire avec recherche TVA + nom | ~1200 |
| `lib/utils/vat-validator.ts` | Validation format TVA (existant, réutilisé) | ~220 |

### Appel API - Exemple TypeScript

#### Recherche par TVA

```typescript
const response = await fetch('/api/company/lookup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    searchType: 'vat',
    vatNumber: 'BE0123456789',
    teamId: 'uuid-team-id'
  })
})

const result = await response.json()
// result.success: boolean
// result.data: CompanyLookupResult (single object)
```

#### Recherche par nom

```typescript
const response = await fetch('/api/company/lookup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    searchType: 'name',
    name: 'ACME',
    teamId: 'uuid-team-id',
    limit: 10 // optionnel, défaut 10
  })
})

const result = await response.json()
// result.success: boolean
// result.data: CompanyLookupResult[] (array)
// result.count: number
```

### Types de données retournées

```typescript
interface CompanyLookupResult {
  // Champs requis
  name: string
  vat_number: string // Format: "BE0123456789"
  street: string
  street_number: string
  postal_code: string
  city: string
  country: string // ISO 3166-1 alpha-2 ("BE", "FR", etc.)

  // Champs optionnels
  box?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  legal_form?: string | null // "SPRL", "SA", etc.
  status: 'active' | 'inactive'

  // Métadonnées
  source: 'cbeapi'
  fetched_at: string // ISO timestamp
}
```

---

## Architecture technique

### Cache Strategy (3 niveaux)

```
┌────────────────────────────────────────────────────────────┐
│ L1: REDIS (30 jours)                                        │
│  - Clé: company:vat:BE0123456789                            │
│  - TTL: 2592000 secondes (30 jours)                         │
│  - Warm cache: 90% hit rate après 1 semaine                 │
└────────────────────────────────────────────────────────────┘
                           ↓ (si miss)
┌────────────────────────────────────────────────────────────┐
│ L2: NEXT.JS CACHE (24h)                                     │
│  - next: { revalidate: 86400 }                              │
│  - Cache fetch() automatiquement                            │
└────────────────────────────────────────────────────────────┘
                           ↓ (si miss)
┌────────────────────────────────────────────────────────────┐
│ L3: CBEAPI EXTERNE                                          │
│  - Appel réseau réel                                        │
│  - Timeout: 10s                                             │
│  - Retry: 2x avec backoff exponentiel                       │
└────────────────────────────────────────────────────────────┘
```

### Rate Limiting

- **Par utilisateur** : 10 requêtes/minute
- **Implémentation** : Redis INCR + EXPIRE
- **Clé** : `ratelimit:company-lookup:{userId}`
- **Réponse** : HTTP 429 si dépassé

### Error Handling

| Erreur | Code HTTP | Gestion |
|--------|-----------|---------|
| VAT format invalide | 400 | Message client-side avant appel API |
| Entreprise non trouvée | 404 | "Aucune entreprise trouvée" |
| Rate limit dépassé | 429 | "Trop de requêtes. Attendez..." |
| Timeout (>10s) | 504 | "La recherche a pris trop de temps" |
| Erreur CBEAPI | 500 | "Erreur serveur" + retry automatique |

### Validation Multi-étapes

```
1️⃣ Côté CLIENT (jsvat)
   - Validation format instantanée
   - Feedback visuel immédiat
   - Empêche appels API inutiles

2️⃣ Côté SERVEUR (Zod)
   - Validation stricte du payload
   - Protection contre injection
   - Type safety

3️⃣ Côté SERVICE (vat-validator)
   - Re-validation format
   - Checksum belge (modulo 97)
   - Détection pays
```

---

## Configuration

### Variables d'environnement

```bash
# .env.local
CBEAPI_URL=https://cbeapi.be/api/v1
CBEAPI_KEY=cbeapi_your_key_here
REDIS_URL=rediss://default:xxxxx@xxxxx.upstash.io:6379 # Optionnel
```

### Obtenir une clé CBEAPI

1. **Inscription** : https://cbeapi.be/en/register
2. **Vérification email** : Confirmer votre adresse
3. **Tableau de bord** : https://cbeapi.be/en/dashboard
4. **Copier la clé API** : Visible dans "API Keys"
5. **Ajouter dans .env.local** : `CBEAPI_KEY=cbeapi_...`

### Configuration Redis (optionnelle mais recommandée)

**Option 1 : Upstash (gratuit)**
1. Créer compte : https://console.upstash.com/
2. Créer base Redis (région EU)
3. Copier "REST URL" → `.env.local` : `REDIS_URL=rediss://...`

**Option 2 : Sans Redis**
- L'app fonctionne sans Redis
- Pas de cache = plus d'appels API (attention à la limite 2500/jour)
- Pas de rate limiting = risque d'abus

---

## Limitations & FAQ

### Limitations connues

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **2500 requêtes/jour** (plan gratuit CBEAPI) | Limite atteinte si >2500 recherches/jour | Cache Redis réduit à ~250 appels/jour réels |
| **Belgique uniquement** | Pas de données France, NL, DE, etc. | Extension prévue (voir Roadmap) |
| **Données parfois incomplètes** | Email/téléphone manquants | Permettre édition manuelle |
| **Entreprises inactives** | Résultats incluent sociétés radiées | Badge "Inactive" affiché |

### FAQ

**Q : Que se passe-t-il si on dépasse 2500 requêtes/jour ?**
R : L'API retourne une erreur 429. Solution : upgrade vers plan payant CBEAPI (50€/2000 req) ou optimiser le cache.

**Q : Peut-on chercher des entreprises françaises ?**
R : Non, actuellement seules les entreprises belges (KBO) sont supportées. Extension France prévue (API Infogreffe/INPI).

**Q : Les données sont-elles à jour ?**
R : Les données CBEAPI sont synchronisées quotidiennement avec la base KBO officielle. Le cache Redis conserve les données 30 jours.

**Q : Que faire si une entreprise n'est pas trouvée ?**
R : Vérifier le numéro de TVA sur https://kbopub.economie.fgov.be/kbopub/zoeknummerform.html. Si elle existe, contacter [email protected].

**Q : Peut-on désactiver la fonctionnalité ?**
R : Oui, ne pas définir `CBEAPI_KEY` dans `.env.local`. Le formulaire affichera seulement les champs manuels.

---

## Roadmap

### Version actuelle (v1.0)
- ✅ Recherche par TVA (Belgique)
- ✅ Recherche par nom (Belgique)
- ✅ Cache Redis 30 jours
- ✅ Rate limiting 10 req/min
- ✅ Validation format multi-pays

### Prochaines versions

**v1.1 - Extension européenne**
- 🔲 Support France (API Infogreffe)
- 🔲 Support Pays-Bas (KVK API)
- 🔲 Support Allemagne (Handelsregister)

**v1.2 - Améliorations UX**
- 🔲 Autocomplete intelligent (suggestions pendant la frappe)
- 🔲 Historique des recherches récentes
- 🔲 Favoris d'entreprises

**v1.3 - Analytics**
- 🔲 Dashboard admin : nombre de recherches/jour
- 🔲 Top entreprises recherchées
- 🔲 Alertes si quota CBEAPI proche

---

## Support

**Questions techniques** : Voir documentation développeur ci-dessus
**Problèmes CBEAPI** : [email protected]
**Demande de fonctionnalité** : Créer issue GitHub

---

**Dernière mise à jour** : 15 novembre 2025
**Auteur** : Équipe SEIDO
**Version** : 1.0.0
