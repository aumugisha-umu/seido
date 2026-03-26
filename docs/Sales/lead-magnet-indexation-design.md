# Lead Magnet — Calculateur d'Indexation de Loyer

**Date :** 2026-03-23
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
| Section landing | composant dans `app/(marketing)/page.tsx` | MVP |
| CTA hero | bouton scroll → `#indexation` | MVP |
| API capture email | `app/api/lead-magnet/route.ts` | MVP |
| Lettre type PDF | template Resend ou react-pdf | MVP |
| Article blog SEO | `blog/articles/calculer-indexation-loyer-belgique.md` | MVP |
| Outil portfolio multi-biens | formulaire dédié | Phase 2 |

### Pas de complexité inutile

- Pas de nouvelle table complexe — juste `leads` (email, type, metadata, source)
- Pas de Supabase côté client — calcul 100% client-side (déterministe)
- Pas d'API externe pour les indices — JSON statique + script mensuel

---

## Champs du formulaire

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Type de bail | Radio : Habitation / Commercial | Oui | Si commercial → masquer PEB |
| Région | Select : Bruxelles / Wallonie / Flandre | Oui | |
| Certificat PEB | Select : A, B, C, D, E, F, G, Inconnu | Oui (habitation) | Flandre : A+ à F (pas de G) |
| Loyer de base (hors charges) | Number (€) | Oui | |
| Date de signature du bail | Date picker | Oui | |
| Date de début du bail | Date picker | Oui | Peut différer de la signature |

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

---

## Backend

### Table `leads`

```sql
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  type text not null,        -- 'lettre_indexation' | 'rapport_portfolio'
  metadata jsonb,            -- données du calcul, nb biens, région...
  source text,               -- 'landing_indexation'
  created_at timestamptz default now()
);
```

Pas de RLS (accès service role uniquement). Pas de lien `users`.

### API Route `POST /api/lead-magnet`

```typescript
Body: {
  email: string
  type: 'lettre_indexation' | 'rapport_portfolio'
  calcul: { loyer, region, peb, nouveauLoyer, formule... }
  nombreBiens?: number
}

→ 1. Insert dans `leads` (service role)
→ 2. Envoi email via Resend :
     - lettre_indexation : lettre type PDF pré-remplie
     - rapport_portfolio : email "SEIDO propose cette fonctionnalité" (lead qualifier)
→ 3. Return { success: true }
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
- FAQ en schema.org pour rich snippets

---

## Phase 2 (post-MVP)

- Outil portfolio multi-biens (saisie ou CSV upload)
- Rapport PDF consolidé pour tout le portefeuille
- Rappels automatiques par email aux dates d'anniversaire
- Intégration avec les biens SEIDO existants (pour les utilisateurs connectés)

---

## Sources légales

- **Bruxelles :** Ordonnance du 14 octobre 2022, Code bruxellois du Logement art. 224
- **Wallonie :** Décret du 19 octobre 2022, modifiant le Décret du 15 mars 2018 art. 26
- **Flandre :** Decreet van 10 maart 2023, Vlaams Woninghuurdecreet art. 34
- **Commercial :** Code civil, Article 1728bis
- **Indices santé :** Statbel / SPF Economie
