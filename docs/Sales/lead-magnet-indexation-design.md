# Lead Magnet — Calculateur d'Indexation de Loyer

**Date :** 2026-03-23
**Révisé :** 2026-03-26 (review technique + juridique + RGPD)
**Status :** Design validé, implémentation à planifier
**Estimation :** ~4-5 jours de dev (MVP)

---

## Concept

Calculateur gratuit d'indexation de loyer sur la landing page SEIDO, ciblant les gestionnaires immobiliers belges. Prend en compte les 3 régions, les corrections PEB, et les derniers indices santé.

**Différenciateur vs Smovin :** outil pro (multi-biens en phase 2), explication contextuelle détaillée, lettre type pré-remplie.

**Conversion benchmarks :** outils interactifs ~8.3% vs PDF 1.5-3% en B2B SaaS.

---

## Architecture

### Approche hybride (option C)

1. **Section landing page** — Calculateur mono-bail sur `/#indexation` avec CTA dans le hero qui scroll vers la section
2. **Article blog SEO** — `blog/articles/calculer-indexation-loyer-belgique.md` (~1500 mots) renvoyant vers `/#indexation`
3. **Capture email** — Résultat gratuit sans email. Email requis pour la lettre type ou le rapport portfolio

### Fichiers à créer

| Livrable | Fichier | Priorité |
|----------|---------|----------|
| Données indices santé | `lib/indexation/health-indices.json` | MVP |
| Logique de calcul | `lib/indexation/calculate.ts` | MVP |
| Script MAJ auto indices | `scripts/update-health-indices.ts` | MVP |
| Section landing | `components/landing/sections/indexation-section.tsx` (importé par `landing-page.tsx`) | MVP |
| CTA hero | bouton scroll → `#indexation` | MVP |
| API capture email | `app/api/lead-magnet/route.ts` | MVP |
| Lettre type PDF | template Resend ou react-pdf | MVP |
| Article blog SEO | `blog/articles/calculer-indexation-loyer-belgique.md` | MVP |
| Outil portfolio multi-biens | formulaire dédié | Phase 2 |

### Pas de complexité inutile

- Pas de nouvelle table complexe — juste `indexation_leads` (email, type, metadata, source, consent)
- Pas de Supabase côté client — calcul 100% client-side (déterministe)
- Pas d'API externe pour les indices — JSON statique + script mensuel

---

## Champs du formulaire

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Type de bail | Radio : Habitation / Commercial | Oui | Si commercial → masquer PEB + bail non enregistré |
| Région | Select : Bruxelles / Wallonie / Flandre | Oui | |
| Certificat PEB | Select : A, B, C, D, E, F, G, Inconnu | Oui (habitation) | Flandre : A+ à F (pas de G) |
| Loyer de base (hors charges) | Number (€) | Oui | Tooltip: "Montant du loyer de base, hors provisions pour charges et frais" |
| Date de signature du bail | Date picker | Oui | |
| Date de début du bail | Date picker | Oui | Peut différer de la signature |
| Bail non enregistré | Checkbox | Non (habitation) | Si coché → warning bloquant (Wallonie: aucune indexation; Bruxelles: perte du droit) |

**Note edge cases :**
- Si le bail prévoit un autre indice (IPC, ABEX) ou une clause dérogatoire → afficher note : "Ce simulateur utilise l'indice santé. Si votre bail prévoit un autre indice ou une dérogation, ce calcul ne s'applique pas."
- Baux commerciaux : seule la formule standard s'applique, l'indexation doit être prévue au contrat

---

## Résultat affiché (gratuit, sans email)

### Résultat principal

```
Votre nouveau loyer : 921 €/mois (+8,4%)

Détail du calcul
─────────────────────────────────
Formule : (850 × 128,94) / 113,12
Indice de départ : 113,12 (fév. 2021)
Nouvel indice : 128,94 (mars 2026)
Correction PEB D (Bruxelles) : aucune
─────────────────────────────────
```

### Explication contextuelle (accordion dépliable)

Toggle "Comment ce calcul est-il effectué ?" qui affiche :

1. **La formule** — en langage simple
2. **Vos indices** — valeurs utilisées avec explication de pourquoi ces mois
3. **Correction PEB** — règle spécifique au cas (région + PEB + date du bail)
4. **Calcul détaillé** — étape par étape avec les chiffres
5. **Base légale** — référence au décret/ordonnance applicable

Le contenu s'adapte dynamiquement aux inputs :
- PEB A/B/C → "Aucune correction"
- PEB E Bruxelles, bail avant oct. 2022 → facteur correctif + explication
- PEB D Wallonie → explication du reset loyer adapté
- Bail commercial → "Non soumis aux restrictions PEB"
- Bail non enregistré Wallonie/Bruxelles → **Warning**

### CTA capture email (sous le résultat)

Deux cartes côte à côte :
- **"Recevoir la lettre d'indexation"** — email seul → envoi lettre type PDF pré-remplie
- **"Calculer pour tout mon portefeuille"** — email + nombre de biens → lead qualifier (phase 2 : vrai outil)

**Consentement RGPD (obligatoire sous chaque CTA) :**
- Checkbox : "J'accepte de recevoir la lettre type par email. [Politique de confidentialité](/confidentialite)"
- Base légale : consentement (art. 6.1.a RGPD) — email transactionnel unique, pas de newsletter
- Pas de double opt-in requis (envoi unique, pas d'abonnement récurrent)

---

## Règles de calcul par région

### Formule de base (toutes régions)

```
nouveau_loyer = (loyer_base × nouvel_indice) / indice_depart
```

### Indice de départ

| Région | Référence |
|--------|-----------|
| Bruxelles | Mois précédant la **signature** |
| Wallonie | Mois précédant la **signature** |
| Flandre (bail post-2018) | Mois précédant le **début du bail** |
| Flandre (bail pré-2019) | Mois précédant la **signature** |

### Bruxelles — Facteurs correctifs (depuis 14 oct. 2023)

Conditions : bail signé **avant** le 14 oct. 2022 + PEB E, F ou G.

**PEB A, B, C, D** → Indexation complète (100%)

**PEB E** → Facteur correctif par mois d'anniversaire :

| Mois anniversaire | Facteur |
|---|---|
| Oct. (14-31) | 0.949447646 |
| Novembre | 0.945356473 |
| Décembre | 0.951977401 |
| Janvier | 0.951950895 |
| Février | 0.961757813 |
| Mars | 0.967996216 |
| Avril | 0.965766823 |
| Mai | 0.971941594 |
| Juin | 0.972124068 |
| Juillet | 0.976119286 |
| Août | 0.977109655 |
| Septembre | 0.980049682 |
| Oct. (1-13) | 0.989805521 |

**PEB F, G** → Facteur correctif par mois d'anniversaire :

| Mois anniversaire | Facteur |
|---|---|
| Oct. (14-31) | 0.898895293 |
| Novembre | 0.890712946 |
| Décembre | 0.903954802 |
| Janvier | 0.903901791 |
| Février | 0.923515625 |
| Mars | 0.935992433 |
| Avril | 0.931533646 |
| Mai | 0.943883189 |
| Juin | 0.944248135 |
| Juillet | 0.952238571 |
| Août | 0.954219311 |
| Septembre | 0.960099363 |
| Oct. (1-13) | 0.979611041 |

Formule : `nouveau_loyer = (loyer × nouvel_indice / indice_départ) × facteur_correctif`

Base légale : Code bruxellois du Logement, art. 224 (Ordonnance du 14 octobre 2022)

### Wallonie — Loyer de base adapté (depuis 1 nov. 2023)

**PEB A, B, C** → Formule standard, aucune restriction

**PEB D, E, F, G, inconnu** → Mécanisme en 2 phases :

**Phase 1 — Restriction (1 nov. 2022 → 31 oct. 2023) :**

| PEB | Indexation autorisée |
|-----|---------------------|
| A, B, C | 100% |
| D | 75% de la hausse calculée |
| E | 50% de la hausse calculée |
| F, G | 0% (bloquée) |
| Inconnu | 0% (bloquée) |

Calcul partiel : `hausse_autorisée = (loyer_indexé_complet - loyer_actuel) × 75%` [pour D]

**Phase 2 — Reset (depuis 1 nov. 2023) :**

```
nouveau_loyer = (loyer_adapté × nouvel_indice) / indice_adapté
```

- **loyer_adapté** = loyer résultant de la restriction (Phase 1)
- **indice_adapté** = indice santé du mois précédant l'anniversaire tombé pendant la restriction
- Le gap d'indexation de la période de restriction n'est jamais récupéré

Bail non enregistré = **aucune indexation possible** (depuis sept. 2018)

Base légale : Décret wallon du 15 mars 2018, art. 26 (modifié par Décret du 19 octobre 2022)

### Flandre — Facteur correctif permanent (depuis 1 oct. 2023)

Conditions : bail commencé **avant** le 1 oct. 2022 + EPC D, E, F ou absent.

**Pas de label G en Flandre** (échelle A+ → F)

**EPC A+, A, B, C** → Indexation complète

**EPC D** :

Anniversaire jan.-sept. :
```
CF = 0.50 × (indice_2022 + indice_2023) / indice_2023
```

Anniversaire oct.-déc. :
```
CF = 0.50 × (indice_2021 + indice_2022) / indice_2022
```

**EPC E, F, absent** :

Anniversaire jan.-sept. :
```
CF = indice_2022 / indice_2023
```

Anniversaire oct.-déc. :
```
CF = indice_2021 / indice_2022
```

Variables :
- `indice_2022` = indice santé du mois précédant l'anniversaire en 2022
- `indice_2023` = indice santé du mois précédant l'anniversaire en 2023
- `indice_2021` = indice santé du mois précédant l'anniversaire en 2021

Le facteur est **permanent** et **fixe** (calculé une fois, appliqué chaque année) jusqu'à obtention d'un meilleur EPC ou nouveau bail.

Base légale : Vlaams Woninghuurdecreet, art. 34 (Decreet van 10 maart 2023)

### Baux commerciaux (toutes régions)

- Formule standard sans correction PEB
- Doit être **prévu dans le contrat**
- Rétroactivité : 12 mois (vs 3 mois pour habitation)
- Base légale : Code civil, Article 1728bis

---

## Données : Indices santé

### Fichier `health-indices.json`

```json
{
  "2010-01": 112.34,
  "2010-02": 112.56,
  ...
  "2026-03": 128.94
}
```

Clé = `YYYY-MM`, valeur = indice santé base 2013.

Conversion entre bases :
- Base 2013 → Base 2025 : × 0.7376
- Base 2004 → Base 2013 : × 0.8280

### Script `update-health-indices.ts`

Fetch mensuel des derniers indices depuis Statbel (SPF Economie). Met à jour le JSON automatiquement. Peut être déclenché par cron ou manuellement.

**Source de données :**
- **Primaire :** Statbel — `https://statbel.fgov.be/fr/themes/prix-la-consommation/indice-sante` (CSV/Excel, pas de JSON API)
- **Alternative :** NBB.Stat — `https://stat.nbb.be/` (SDMX REST API, plus stable pour l'automatisation)
- **Format attendu :** CSV (colonnes: date, indice santé lissé). Parser les lignes, extraire la dernière valeur.

**Comportement en cas d'échec :**
1. Si fetch échoue → conserver le fichier `health-indices.json` existant (ne pas écraser)
2. Logger un warning avec la date et l'erreur
3. Le script retourne un exit code non-zero pour alerter en CI

**Rebase indices :**
- La transition base 2013 → base 2025 est en cours (2025-2026). Les coefficients de raccordement seront publiés par Statbel.
- Le script doit gérer la coexistence des deux bases et normaliser vers base 2013 tant que la transition n'est pas complète.

**Critères d'acceptation — Tests unitaires obligatoires :**
- Test avec un exemple officiel connu (ex: indice santé mars 2024 = valeur publiée par Statbel) pour détecter les erreurs de retranscription
- Test des conversions entre bases (2004 → 2013 → 2025) avec valeurs vérifiables
- Test du calcul complet (formule × facteur correctif) avec un cas réel documenté par région

---

## Backend

### Table `indexation_leads`

```sql
create table indexation_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  type text not null check (type in ('lettre_indexation', 'rapport_portfolio')),
  metadata jsonb,            -- données du calcul, nb biens, région...
  source text default 'landing_indexation',
  consent_given boolean not null default false,
  ip_address text,           -- pour audit RGPD
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 months'  -- rétention RGPD
);

-- Index pour nettoyage périodique
create index idx_indexation_leads_expires on indexation_leads(expires_at);
```

Pas de RLS (accès service role uniquement). Pas de lien `users`.
Nettoyage automatique : cron mensuel `DELETE FROM indexation_leads WHERE expires_at < now()`.

### Sécurité & Validation API

**Rate limiting :** Utiliser `rateLimiters.public` existant (100 req/60s par IP) via `lib/rate-limit.ts` + `getClientIdentifier()`.

**Validation Zod :**
```typescript
const leadMagnetSchema = z.object({
  email: z.string().email().max(255),
  type: z.enum(['lettre_indexation', 'rapport_portfolio']),
  calcul: z.object({
    loyer: z.number().min(1).max(100000),
    region: z.enum(['bruxelles', 'wallonie', 'flandre']),
    peb: z.enum(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'inconnu']).optional(),
    nouveauLoyer: z.number().min(0),
    pourcentage: z.number(),
    formule: z.string().max(500),
  }),
  nombreBiens: z.number().int().min(1).max(10000).optional(),
  honeypot: z.string().max(0).optional(),  // champ invisible anti-bot
  consent: z.literal(true),                // consentement obligatoire
})
```

**Anti-spam :** Champ `honeypot` (input invisible). Si rempli → rejet silencieux (200 OK, pas d'insert).

### API Route `POST /api/lead-magnet`

```typescript
→ 0. Rate limit check (rateLimiters.public)
→ 1. Zod validation (reject 400 si invalide)
→ 2. Honeypot check (reject silencieux si rempli)
→ 3. Insert dans `indexation_leads` (service role, via createServiceRoleSupabaseClient)
→ 4. Envoi email via Resend (EMAIL_CONFIG.from) :
     - lettre_indexation : lettre type PDF pré-remplie
     - rapport_portfolio : email "SEIDO propose cette fonctionnalité" (lead qualifier)
→ 5. Return { success: true }
```

---

## Article Blog SEO

**Fichier :** `blog/articles/calculer-indexation-loyer-belgique.md`

### Structure (~1500 mots)

```
H1: Comment calculer l'indexation de votre loyer en Belgique (2026)
   intro + CTA ancre → /#indexation

H2: Qu'est-ce que l'indexation des loyers ?

H2: La formule de calcul

H2: L'indice de départ selon votre région
   H3: Bruxelles et Wallonie
   H3: Flandre

H2: L'impact du certificat PEB sur l'indexation
   H3: Bruxelles — facteurs correctifs
   H3: Wallonie — loyer de base adapté
   H3: Flandre — facteur correctif permanent
   Tableau récapitulatif 3 régions

H2: Cas particuliers
   Baux commerciaux, baux non enregistrés, rétroactivité

H2: Calculez votre indexation gratuitement
   CTA → /#indexation

H2: Questions fréquentes (FAQ — schema.org)
   6 questions avec réponses
```

### SEO targets

- Principal : "indexation loyer Belgique 2026"
- Secondaires : "calcul indexation loyer PEB", "facteur correctif PEB Bruxelles", "indexation loyer Wallonie", "indexation loyer Flandre"
- FAQ en schema.org (`FAQPage` JSON-LD dans `components/seo/json-ld.tsx` — pattern existant dans `app/page.tsx`)

**Maintenance annuelle SEO :**
- H1 contient l'année ("2026") → mettre à jour en janvier de chaque année
- Mettre à jour l'article blog (titre, intro, exemples chiffrés)
- Vérifier que les coefficients PEB n'ont pas changé (ordonnances/décrets)
- TODO reminder : créer un reminder SEIDO interne pour chaque janvier

---

## Phase 2 (post-MVP)

- Outil portfolio multi-biens (saisie ou CSV upload)
- Rapport PDF consolidé pour tout le portefeuille
- Rappels automatiques par email aux dates d'anniversaire
- Intégration avec les biens SEIDO existants (pour les utilisateurs connectés)

---

## Sources légales

| Source | Référence | Moniteur Belge |
|--------|-----------|----------------|
| **Bruxelles** | Ordonnance du 14 octobre 2022, Code bruxellois du Logement art. 224 | MB 21/10/2022 |
| **Wallonie** | Décret du 19 octobre 2022, modifiant le Décret du 15 mars 2018 art. 26 | MB 28/10/2022 |
| **Flandre** | Decreet van 10 maart 2023, Vlaams Woninghuurdecreet art. 34 | BS 31/03/2023 |
| **Commercial** | Code civil, Article 1728bis | — |
| **Indices santé** | Statbel / SPF Economie | `https://statbel.fgov.be/fr/themes/prix-la-consommation/indice-sante` |

**Dernière vérification des coefficients :** 2026-03-23
**Prochaine vérification prévue :** 2026-10-01 (ou dès publication d'un nouveau décret/ordonnance)

**Disclaimer (à afficher dans l'UI) :**
> Cet outil fournit une estimation indicative de l'indexation de votre loyer sur base de la législation en vigueur. Il ne constitue pas un conseil juridique. Pour toute situation particulière, consultez un professionnel du droit immobilier.

---

## Résumé des corrections post-review (2026-03-26)

| # | Point review | Action |
|---|-------------|--------|
| 1 | Chemin `app/(marketing)/` inexistant | → `components/landing/sections/indexation-section.tsx` |
| 2 | Table `leads` trop générique | → `indexation_leads` |
| 3 | Pas de rate limiting / Zod / anti-spam | → Section Sécurité & Validation ajoutée |
| 4 | RGPD manquant | → Consentement checkbox, lien `/confidentialite`, rétention 24 mois |
| 5 | Bail non enregistré non capturable | → Checkbox ajoutée au formulaire |
| 6 | Loyer "hors charges" ambigu | → Tooltip explicatif ajouté |
| 7 | Sources légales sans traçabilité | → Dates Moniteur Belge, vérification, disclaimer |
| 8 | Script Statbel sans robustesse | → URL, format, fallback, tests unitaires obligatoires |
| 9 | SEO année en dur sans process | → Maintenance annuelle documentée |
