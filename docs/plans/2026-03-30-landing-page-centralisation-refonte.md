# Landing Page — Refonte "Centralisation Intelligente"

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Aligner tout le messaging, le SEO et les visuels de la landing page sur le nouveau positionnement "centralisation intelligente des canaux entrants" (vs l'ancien concept "boucle de gestion").

**Architecture:** 3 commits — Copy+Structure (landing-page.tsx), SEO+FAQ (page.tsx + faq.ts), Vérification. Le gros du travail est du find-and-replace textuel dans un seul fichier.

**Tech Stack:** Next.js App Router, Tailwind CSS, Lucide icons

---

## Acceptance Criteria

- [ ] Zéro occurrence du mot "boucle" dans la landing page (`grep -rn "boucle" components/landing/landing-page.tsx` → 0)
- [ ] H1 contient "gestion locative" (keyword SEO primaire) de manière naturelle
- [ ] Meta description contient "Belgique" et mention de centralisation
- [ ] JSON-LD featureList mis à jour avec AI/multicanal
- [ ] 3 typos corrigées ("caote", "juqu'à", "traintant")
- [ ] Bug L980 `text-sm text-xs` fixé
- [ ] CTA intermédiaire présent après la section Features
- [ ] Diagramme 6 étapes : labels mis à jour + stagger animation
- [ ] `npm run lint` passe sans nouvelles erreurs

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Copy changes break mobile layout | Low | Medium | H2 raccourci (45 chars max), vérif visuelle |
| SEO ranking drop from H1 change | Low | High | Même keyword principal conservé dans title tag |
| Stagger timing trop subtil | Low | Low | Testable visuellement, ajustable |

---

## Commit 1 — Copy + Structure + Visual (landing-page.tsx)

**Toutes les modifications textuelles, le CTA intermédiaire, le fix CSS, et les labels du diagramme.**

**File:** `components/landing/landing-page.tsx`

### 1a. Hero — H1, Subtitle, Trust Badges (L121-168)

**H1 (L122-127):**
```
AVANT: La gestion locative / en toute sérénité
APRÈS: La gestion locative / simplifiée par l'IA
```
> Conserve l'émotion, intègre "IA" naturellement, garde "gestion locative" comme keyword. Pas de "belge" forcé dans le H1 — le targeting géo est dans le title tag et la meta description.

**Subtitle (L131-133) — corriger les 3 typos + aligner sur centralisation :**
```
AVANT:
Chaque demande déclenche des échanges qui n'en finissent pas.
SEIDO caote les échanges, organise et automatise, vous décidez en quelques clics.
Gagnez juqu'à 10h/personne/semaine, tout en traintant les demandes 24/7.

APRÈS:
WhatsApp, email, téléphone, SMS — chaque demande arrive par un canal différent.
SEIDO les centralise, les trie par l'IA, et vous présente uniquement ce qui demande votre décision.
Gagnez jusqu'à 10h par personne et par semaine, sans rien laisser passer.
```

**Trust badge #3 (L166):**
```
AVANT: Portail locataires et prestataires
APRÈS: WhatsApp, email, téléphone — centralisés
```

### 1b. Section Problème (L200-248)

**H2 problème (L201):**
```
AVANT: Le vrai coût des boucles mal gérées
APRÈS: Le vrai coût du chaos quotidien
```
> Court (32 chars), pas de "boucle", ancré dans le vécu. Pas 3 phrases en H2.

**H2 causes (L243):**
```
AVANT: Le même schéma, en boucle, chaque jour
APRÈS: Le même film, chaque matin
```

**Subtitle causes (L246):**
```
AVANT: Appel, email, WhatsApp — puis la recherche commence.
APRÈS: Un appel. Un email. Un WhatsApp. À vous de tout reconstituer.
```

### 1c. Section Features — 12 remplacements (L341-500)

| Ligne | Avant | Après |
|-------|-------|-------|
| 341 | Chaque étape de la boucle, court-circuitée | Tous vos canaux entrants. Une seule interface pour agir. |
| 344 | Recherche, transmission, attente, relance — SEIDO les élimine une par une. Voici comment. | WhatsApp, email, téléphone, SMS — SEIDO capte tout, classe tout, vous présente uniquement ce qui mérite votre attention. |
| 380 | chaque boucle se ferme en quelques clics | toutes vos demandes traitées depuis un seul écran |
| 390 | Chacun coupe sa part de la boucle | Chacun agit dans son propre espace |
| 408 | Coupe les étapes 3 à 5 : transmission, attente, relance. | Zéro appel. Zéro email. Le prestataire gère tout depuis son portail. |
| 442 | Coupe les étapes 1 et 6 : le déclencheur est structuré, plus de recommencement. | Le locataire signale via le portail. Fini les appels improvisés. |
| 457 | la boucle se ferme. Pas de "retour case départ" | demande traitée, tout le monde est notifié. Point final. |
| 461 | Plus de cycle : signaler → résolu, point final | Signalement structuré, traitement tracé, clôture confirmée. |
| 472 | Ce qui rend la coupure possible | Opérationnel dès le premier jour |
| 475 | Pas de formation. Pas de migration complexe. Vous coupez la boucle dès le premier jour. | Import CSV inclus. Zéro formation. Vos premiers dossiers traités dans les 24h. |
| 487 | La boucle se coupe dès demain. | Vos demandes centralisées dès demain. |
| 500 | La boucle n'attend plus votre bureau. | Vos décisions ne dépendent plus de votre bureau. |

### 1d. Roadmap, CTA final, Footer (L584-978)

| Ligne | Avant | Après |
|-------|-------|-------|
| 584 | Chaque étape raccourcit vos boucles. Jusqu'à ce qu'elles se ferment presque toutes seules. | Centraliser d'abord. Automatiser ensuite. Anticiper enfin. SEIDO grandit avec vous. |
| 608 | Chaque boucle traitée rend la suivante plus rapide. | Chaque demande traitée rend la suivante plus rapide. |
| 944 | Des boucles plus courtes. Des décisions plus rapides. Zéro engagement. | Moins de canaux à gérer. Des décisions plus rapides. Zéro engagement. |
| 978 | Moins de boucles. Plus de temps. | Tous vos canaux. Un seul endroit. |

### 1e. CTA intermédiaire (après L570, avant Roadmap)

Insérer entre `</section>` (L570) et la section Roadmap (L572) :

```tsx
{/* CTA intermédiaire — après démonstration de la solution */}
<FadeIn>
  <div className="text-center py-12">
    <Link href="/auth/signup">
      <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90 rounded-full transition-all hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
        Essayer gratuitement — 1 mois offert
      </Button>
    </Link>
    <p className="landing-caption text-white/40 mt-3">Sans carte bancaire · Vos vraies données</p>
  </div>
</FadeIn>
```
> Note: utilise `landing-caption` (pas `text-sm`) pour cohérence avec le reste de la page.

### 1f. Diagramme 6 étapes — update labels (L253-260)

Garder la structure du diagramme (desktop horizontal + mobile vertical). Mettre à jour les labels pour coller au messaging "chaos multicanal" :

```tsx
// AVANT
const loopSteps = [
  { icon: Phone, label: 'Déclencheur', sublabel: 'Appel / email / WhatsApp', ariaLabel: 'Appel ou email reçu' },
  { icon: Search, label: 'Recherche', sublabel: "Où est l'info ?", ariaLabel: "Recherche d'information" },
  { icon: Send, label: 'Transmission', sublabel: 'Vous transmettez', ariaLabel: 'Transmission du message' },
  { icon: Clock, label: 'Attente', sublabel: 'Silence radio', ariaLabel: 'Attente de réponse' },
  { icon: RefreshCw, label: 'Relance', sublabel: 'Vous relancez', ariaLabel: 'Relance manuelle' },
  { icon: RotateCcw, label: 'Recommence', sublabel: 'Retour case départ', ariaLabel: 'Retour au début' },
]

// APRÈS
const loopSteps = [
  { icon: Phone, label: 'Demande', sublabel: 'WhatsApp, email, appel', ariaLabel: 'Demande entrante multicanal' },
  { icon: Search, label: 'Recherche', sublabel: 'Quel bien ? Quel bail ?', ariaLabel: "Recherche d'information" },
  { icon: Send, label: 'Transmission', sublabel: 'Vous faites le relais', ariaLabel: 'Transmission manuelle' },
  { icon: Clock, label: 'Attente', sublabel: 'Silence radio', ariaLabel: 'Attente de réponse' },
  { icon: RefreshCw, label: 'Relance', sublabel: 'Vous relancez', ariaLabel: 'Relance manuelle' },
  { icon: RotateCcw, label: 'Encore', sublabel: 'Prochain canal...', ariaLabel: 'Recommencer sur un autre canal' },
]
```

Ajouter des FadeIn delays staggerés sur les steps pour un effet d'apparition séquentielle au scroll (au lieu de tout apparaître d'un coup). Wrapper chaque step dans un `FadeIn delay={i * 80}`.

### 1g. Harmonisation visuelle

**Tech feature cards (L513):**
```
AVANT: border-white/5
APRÈS: border-white/8
```

**Roadmap card "Anticiper" tag (L610):**
```
AVANT: tagStyle: "bg-white/5 border-white/10 text-white/40"
APRÈS: tagStyle: "bg-violet-500/10 border-violet-500/20 text-violet-400"
```
> Violet = signal AI, cohérent avec le hero.

**NE PAS changer :**
- L356 `border-blue-500/30` — la card gestionnaire DOIT rester proéminente
- Logo alt text — garder `alt="SEIDO"` (pas de keyword stuffing)

### 1h. Fix bug existant (L980)

```
AVANT: <p className="text-sm leading-relaxed text-white/40 text-xs">
APRÈS: <p className="text-xs leading-relaxed text-white/40">
```
> `text-sm` + `text-xs` en double — supprimer `text-sm`.

---

## Commit 2 — SEO + FAQ (page.tsx, faq.ts)

### 2a. Meta description (app/page.tsx L10, L13, L23)

```
AVANT: SEIDO centralise toutes vos données, documents et interactions immobilières. Fermez vos boucles de gestion en quelques clics. Essai gratuit 1 mois.

APRÈS: Logiciel de gestion locative belge tout-en-un. Centralisez WhatsApp, email et appels locataires. Triage IA automatique. Essai gratuit 1 mois, sans carte.
```
Appliquer à `description`, `openGraph.description`, `twitter.description`.

### 2b. JSON-LD featureList (app/page.tsx L98-106)

```tsx
featureList: [
  'Centralisation multicanal (WhatsApp, email, téléphone, SMS)',
  'Triage IA automatique des demandes locataires',
  'Gestion interventions 9 statuts avec workflow complet',
  'Portail locataire self-service',
  'Portail prestataire avec devis et planification',
  'Assistant IA vocal et WhatsApp',
  'Gestion documents et emails connectés',
  'Conforme RGPD — Hébergement EU (Frankfurt)',
],
```

### 2c. NE PAS modifier

- `datePublished` des reviews — garder le hardcodé plutôt que fabriquer des dates variables (risque pénalité Google)
- Logo alt text — garder `alt="SEIDO"`

### 2d. FAQ — 2 nouvelles questions (data/faq.ts)

Ajouter après l'entrée id:8 :

```tsx
{
  id: 9,
  question: "SEIDO centralise quels canaux de communication ?",
  answer: "SEIDO capte les demandes entrantes quel que soit leur canal d'origine : email, WhatsApp, SMS, appel téléphonique ou signalement direct via le portail locataire. L'IA de SEIDO classe automatiquement chaque demande, l'associe au bon bien, et vous présente uniquement celles qui nécessitent votre décision. Les demandes de suivi (statut, documents) sont traitées directement par le portail sans intervention de votre part.",
  category: 'general'
},
{
  id: 10,
  question: "En quoi l'IA de SEIDO est-elle différente d'un chatbot ?",
  answer: "Un chatbot répond à des questions prédéfinies. L'IA de SEIDO fait du triage intelligent : elle identifie la nature de chaque demande entrante (urgence, information, signalement de sinistre, demande de document), l'associe au bien et au locataire concernés, et décide si la demande mérite votre attention ou si elle peut être traitée automatiquement. C'est la différence entre un filtre anti-spam et un assistant qui comprend le contexte de votre portefeuille.",
  category: 'general'
},
```

---

## Commit 3 — Vérification finale

1. `grep -rn "boucle" components/landing/landing-page.tsx` → 0 résultats
2. `grep -rn "boucle" app/page.tsx` → 0 résultats
3. `npm run lint` → no new errors
4. Vérifier visuellement : hero, problème, features, roadmap, CTA, footer
5. Vérifier mobile (responsive)

---

## Ce qui a été RETIRÉ du plan initial (post-review)

| Retiré | Raison |
|--------|--------|
| Animation chaos Story 9 (refonte complète) | Over-engineered (L/XL scope). Labels update + stagger suffisent. |
| Logo alt keyword-stuffing | SEO spam signal — garder `alt="SEIDO"` |
| Review dates fabricées | Risque pénalité Google structured data |
| Border gestionnaire /30→/10 | Réduit la proéminence de la card la plus importante |
| 10 commits séparés | Mergé en 3 commits significatifs |
| Second IntersectionObserver | Réutiliser FadeIn existant avec delay stagger |

---

## Sizing Summary

| Commit | Contenu | Size |
|--------|---------|------|
| 1 | Copy (18 remplacements) + CTA + labels diagramme + visual fixes + bug fix | S-M |
| 2 | SEO meta + JSON-LD + 2 FAQ | S |
| 3 | Vérification grep + lint + visuel | XS |
