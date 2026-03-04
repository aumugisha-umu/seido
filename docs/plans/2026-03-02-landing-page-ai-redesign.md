# Landing Page AI Enhancement — Copy & Specifications

**Date** : 2026-03-02
**Statut** : Design valide, pret pour implementation
**Ref** : `docs/AI/ai-phone-assistant-plan.md` Section 15 (plan technique v3.5)
**User Story** : US-016
**Approche** : Enhancement subtil (10 micro-modifications + 1 nouvelle section) — PAS un redesign

---

## Table des matieres

1. [Philosophie et regles](#1--philosophie-et-regles)
2. [Inventaire des modifications](#2--inventaire-des-modifications)
3. [Copy exacte par zone](#3--copy-exacte-par-zone)
4. [Nouvelle section IA (4 cartes)](#4--nouvelle-section-ia-4-cartes)
5. [FAQ (3 ajouts)](#5--faq-3-ajouts)
6. [SEO technique](#6--seo-technique)
7. [Fichiers impactes](#7--fichiers-impactes)

---

## 1 — Philosophie et regles

### Pourquoi un enhancement et pas un redesign

La landing page actuelle (`components/landing/landing-page.tsx`, ~896 lignes) est de qualite :
- Structure claire et bien cadencee (hero → pain → features → pricing → FAQ → CTA)
- Ton professionnel, pas vendeur
- Dark glassmorphism coherent avec l'app
- SEO deja positionne sur "gestion locative belgique"

L'objectif est d'**integrer l'assistant IA dans ce qui existe** — pas de reconstruire.

### Regle copy stricte

| Regle | Detail |
|-------|--------|
| **2 mentions nominatives max** | "Assistant IA" nomme exactement 2 fois : section features IA + FAQ. |
| **Langage fonctionnel partout ailleurs** | "l'assistant prend la demande", "disponible 24h/24", "un numero qui repond". |
| **Zero superlatif** | Pas de "revolutionnaire", "unique", "inegalable". |
| **Ton** | Factuel, calme, competent. Modele : Linear, Notion. |
| **IA = aide, pas replacement** | "Vous validez", "rien ne se passe sans vous", "vous gardez le controle". |

### Positionnement concurrentiel

Aucun concurrent belge (Smovin, Sogis, Yourent, Rentio, Up2rent, Rentila, ImmoPad) ne propose d'assistant telephonique IA en mars 2026. C'est une opportunite de **creation de categorie** : le marche ne compare pas encore — il decouvre. D'ou le ton calme : pas besoin de crier quand on est seul sur le creneau.

---

## 2 — Inventaire des modifications

### Vue d'ensemble (10 micro-modifications + 1 nouvelle section)

| # | Zone actuelle | Type | Effort |
|---|--------------|------|--------|
| 1 | Hero sous-titre | Modification texte | XS |
| 2 | Hero (au-dessus du H1) | Ajout pill/badge | XS |
| 3 | Pain point #1 (stat 40%) | Ajout micro-phrase | XS |
| 4 | Card gestionnaire (bullets) | Ajout 4e bullet | XS |
| 5 | Portail locataire (tagline) | Modification texte | XS |
| 6 | 5e carte fonctionnalites | Remplacement carte | S |
| 7 | **Nouvelle section IA** | **Ajout section complete** | **M** |
| 8 | Vision / Roadmap | Modification texte | XS |
| 9 | Pricing (au-dessus des cards) | Ajout bandeau | S |
| 10 | FAQ | Ajout 3 items | S |
| 11 | CTA final | Modification texte | XS |

**Effort total estime : ~3 jours**

### Positionnement de la nouvelle section

```
[Sections existantes conservees integralement]

1. Hero (+ pill + sous-titre modifie)
2. Pain points (+ micro-phrase sur #1)
3. Pain causes (3 cartes)
4. Features principales (gestionnaire + prestataire + locataire) (+ bullet gestionnaire + tagline locataire)
5. Features techniques (4 cartes) (+ 5e carte remplacee)
6. ★ NOUVELLE SECTION IA — "Un numero qui repond en votre nom" (4 cartes)
7. Data import (inchange)
8. Vision / Roadmap (+ texte enrichi IA)
9. Pricing (+ bandeau IA au-dessus)
10. Contact (inchange)
11. FAQ (+ 3 questions)
12. Blog (inchange)
13. CTA final (+ texte modifie)
14. Footer (inchange)
```

---

## 3 — Copy exacte par zone

### Modif #1 — Hero sous-titre

**Actuel :**
> "Un seul outil pour vos biens, vos interventions, vos locataires informes, vos prestataires coordonnes, et vos documents en ordre."

**Nouveau :**
> "Un seul outil pour vos biens, vos interventions, vos locataires informes — meme a 23h —, vos prestataires coordonnes, et vos documents en ordre."

**Changement :** Ajout de "— meme a 23h —" apres "informes". Insere l'idee de disponibilite permanente sans nommer l'IA. Le tiret cadratin cree une pause qui attire l'attention.

---

### Modif #2 — Pill Hero

**Ajout :** Badge/pill au-dessus du titre H1 principal.

```
[Assistant 24h/24 inclus]
```

**Implementation :** `<span>` avec classes Tailwind `inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary border border-primary/20`. Animation subtle `animate-fade-in` au chargement.

---

### Modif #3 — Pain point #1

**Contexte :** Premier chiffre "40%" dans la section pain points (cout cache du desordre).

**Ajout :** Micro-phrase sous le texte existant du premier pain point :

> "L'assistant note tout, a votre place."

**Note :** Ne pas modifier le texte existant. Ajouter cette phrase en dessous, en style `text-muted-foreground text-sm italic`.

---

### Modif #4 — Card gestionnaire, 4e bullet

**Contexte :** La carte gestionnaire a 3 bullets actuellement. Ajouter un 4e :

> "Appels hors-heures → L'assistant prend la demande. Vous validez le matin."

**Note :** Le mot "assistant" ici est en minuscule, pas "Assistant IA". C'est du langage fonctionnel.

---

### Modif #5 — Portail locataire tagline

**Actuel :** (a verifier dans le code, probablement "Un portail simple et accessible" ou equivalent)

**Nouveau :**
> "Ils n'ont plus besoin de vous appeler."

**Note :** Implique l'existence d'une alternative (l'assistant) sans le nommer. Le visiteur comprend apres avoir vu la section IA plus bas.

---

### Modif #6 — 5e carte fonctionnalites

**Actuel :** La 4e/5e carte dans la grille des fonctionnalites techniques (Quick setup, Proof, Mobile, Email). La carte "Import rapide" ou equivalent est remplacee.

**Nouveau :**

| Champ | Valeur |
|-------|--------|
| **Icone** | `Moon` (Lucide) |
| **Titre** | Disponible quand vous ne l'etes pas |
| **Texte** | Les demandes arrivent meme la nuit et le week-end. L'assistant prend le relais quand le bureau est ferme. |

**Note :** La fonctionnalite d'import de donnees est conservee dans la section Data import existante — on ne perd rien.

---

### Modif #8 — Vision / Roadmap

**Actuel :** 2 cartes roadmap (Admin T3 2026, Finance T4 2026).

**Nouveau texte introductif au-dessus des cartes :**
> "On a commence par le plus douloureux : les interventions, les prestataires, le suivi. L'assistant s'occupe deja de la partie la plus repetitive — prendre les appels, noter la demande, creer l'intervention. La suite ? Administration des baux et suivi financier arrivent courant 2026."

**Note :** Le mot "assistant" apparait ici en minuscule — langage fonctionnel, pas un nom de produit.

---

### Modif #9 — Bandeau pricing IA

**Ajout :** Un bandeau/banner au-dessus de la section pricing existante.

```
┌────────────────────────────────────────────────────────┐
│  Ajouter l'assistant IA                               │
│  A partir de 49€/mois · 100 minutes incluses          │
│  Telephone + WhatsApp                                  │
│                                        [En savoir plus]│
└────────────────────────────────────────────────────────┘
```

**Design :** Fond `bg-primary/5` avec bordure `border border-primary/20`. Pas de gradient flashy. Le CTA "En savoir plus" pointe vers la page settings IA (ou ancre vers la section IA si on est non-connecte).

**Note :** C'est la **premiere des 2 mentions nominatives** de "assistant IA" sur la page.

---

### Modif #11 — CTA final

**Actuel :** "Et si lundi prochain etait different ?"

**Nouveau :**
> "Moins d'appels. Plus de visibilite. Zero engagement."

**Sous-texte :** Conserver le CTA existant ("Commencer gratuitement").

---

## 4 — Nouvelle section IA (4 cartes)

### Titre de section

> "Un numero qui repond en votre nom"

### Sous-titre

> (pas de sous-titre — le titre est suffisamment explicite)

### Grille 2×2 (desktop) / 1 colonne (mobile)

**Carte 1 :**
| Champ | Valeur |
|-------|--------|
| Icone | `AudioLines` (Lucide) |
| Titre | Voix naturelle, ton professionnel |
| Texte | L'assistant repond par telephone avec une voix naturelle, en francais, neerlandais ou anglais. Le locataire decrit son probleme comme il le ferait avec vous. |

**Carte 2 :**
| Champ | Valeur |
|-------|--------|
| Icone | `MessageCircle` (Lucide) |
| Titre | Appels et WhatsApp, meme numero |
| Texte | Un seul numero belge (+32). Le locataire choisit d'appeler ou d'ecrire sur WhatsApp. L'assistant comprend les deux. |

**Carte 3 :**
| Champ | Valeur |
|-------|--------|
| Icone | `FileText` (Lucide) |
| Titre | Cree l'intervention automatiquement |
| Texte | L'assistant identifie le locataire, le bien concerne, et la nature du probleme. Vous retrouvez une demande structuree dans SEIDO le lendemain matin. |

**Carte 4 :**
| Champ | Valeur |
|-------|--------|
| Icone | `Clock` (Lucide) |
| Titre | Disponible 24h/24, y compris le week-end |
| Texte | Les urgences n'attendent pas lundi. L'assistant prend les demandes a toute heure. Vous gardez le controle : rien ne se passe sans votre validation. |

### Design

- Meme style que les cartes fonctionnalites existantes (glassmorphism, icone en haut, titre bold, texte muted)
- Animation `FadeIn` avec stagger (existant dans le codebase)
- Grille responsive : `grid grid-cols-1 md:grid-cols-2 gap-6`
- Background section : leger gradient ou bg distinct pour marquer la nouveaute sans casser le rythme

### Note

C'est dans le titre de cette section que "assistant IA" n'apparait PAS — le titre dit "un numero qui repond", pas "notre assistant IA". La **2e mention nominative** est dans la FAQ (question 9 : "Comment fonctionne l'assistant IA ?").

---

## 5 — FAQ (3 ajouts)

### Question 9 (id: 9, category: 'technical')

**Question :** "Comment fonctionne l'assistant IA ?"

**Reponse :** "Votre locataire appelle ou envoie un message WhatsApp sur votre numero dedie. L'assistant identifie le locataire, note le probleme et cree une demande d'intervention dans SEIDO. Vous retrouvez un resume structure dans votre tableau de bord. Rien ne se passe sans votre validation."

### Question 10 (id: 10, category: 'general')

**Question :** "Mes locataires savent-ils qu'ils parlent a une IA ?"

**Reponse :** "Oui, l'assistant se presente clairement des le debut de l'appel. La transparence est un choix de conception, pas une obligation legale contournee. Les locataires le savent et l'adoptent — ils preferent une reponse immediate a un repondeur."

### Question 11 (id: 11, category: 'pricing')

**Question :** "L'assistant IA est-il inclus dans SEIDO ou en option ?"

**Reponse :** "L'assistant est un module complementaire, a partir de 49 EUR/mois (100 minutes incluses). SEIDO fonctionne parfaitement sans. L'assistant s'active en un clic depuis vos parametres quand vous etes pret."

### Implementation

Ajouter dans `data/faq.ts` :

```typescript
{
  id: 9,
  question: "Comment fonctionne l'assistant IA ?",
  answer: "Votre locataire appelle ou envoie un message WhatsApp sur votre numero dedie. L'assistant identifie le locataire, note le probleme et cree une demande d'intervention dans SEIDO. Vous retrouvez un resume structure dans votre tableau de bord. Rien ne se passe sans votre validation.",
  category: 'technical'
},
{
  id: 10,
  question: "Mes locataires savent-ils qu'ils parlent a une IA ?",
  answer: "Oui, l'assistant se presente clairement des le debut de l'appel. La transparence est un choix de conception, pas une obligation legale contournee. Les locataires le savent et l'adoptent — ils preferent une reponse immediate a un repondeur.",
  category: 'general'
},
{
  id: 11,
  question: "L'assistant IA est-il inclus dans SEIDO ou en option ?",
  answer: "L'assistant est un module complementaire, a partir de 49 EUR/mois (100 minutes incluses). SEIDO fonctionne parfaitement sans. L'assistant s'active en un clic depuis vos parametres quand vous etes pret.",
  category: 'pricing'
}
```

---

## 6 — SEO technique

### Meta tags (modifications minimales)

| Element | Action | Detail |
|---------|--------|--------|
| **Title tag** | Inchange | "SEIDO — Gestion Locative Simplifiee \| Belgique" — on ajoutera "avec IA" quand le module sera en production |
| **Meta description** | Enrichir | Ajouter "Assistant IA integre. Disponible 24/7." en fin de description existante |
| **OG tags** | Inchanges | Pas de nouvelle image OG pour un enhancement |

### Schema markup JSON-LD (ajout aux offers existants)

Ajouter 3 offers dans le JSON-LD `SoftwareApplication` existant :

```json
{
  "@type": "Offer",
  "name": "Assistant IA Solo",
  "price": "49.00",
  "priceCurrency": "EUR",
  "billingIncrement": "P1M",
  "description": "100 minutes incluses, telephone + WhatsApp"
},
{
  "@type": "Offer",
  "name": "Assistant IA Equipe",
  "price": "99.00",
  "priceCurrency": "EUR",
  "billingIncrement": "P1M",
  "description": "250 minutes incluses, telephone + WhatsApp"
},
{
  "@type": "Offer",
  "name": "Assistant IA Agence",
  "price": "149.00",
  "priceCurrency": "EUR",
  "billingIncrement": "P1M",
  "description": "500 minutes incluses, telephone + WhatsApp"
}
```

### Keywords (via contenu, pas meta-keyword)

Les keywords cibles sont integres naturellement dans le contenu :
- "assistant IA" (2 occurrences nominatives)
- "disponible 24h/24" (dans section IA + carte 5)
- "telephone + WhatsApp" (dans section IA + bandeau pricing)
- "gestion locative" (deja present dans le contenu existant)
- "interventions automatiques" (dans carte 3 de la section IA)

---

## 7 — Fichiers impactes

| Fichier | Modifications | Lignes estimees |
|---------|-------------|-----------------|
| `components/landing/landing-page.tsx` | 10 micro-modifs texte + nouvelle section IA (4 cartes) | +80, ~20 modifiees |
| `data/faq.ts` | 3 nouveaux items (ids 9, 10, 11) | +30 |
| `app/page.tsx` | 3 offers IA dans JSON-LD existant | +20 |
| `app/layout.tsx` | Enrichir meta description | +5 mots |

### Ce qui ne change PAS

- `components/pricing-cards.tsx` — pas de restructuration, le bandeau IA est dans landing-page.tsx
- Structure de navigation — pas de nouvelle route
- Ordre des sections existantes — tout reste en place
- Hero H1 — "La gestion locative en toute serenite" reste le H1
- Video background — conservee
- Dark glassmorphism — conserve
- Animations existantes — conservees

---

### Checklist implementation

- [ ] Modifier hero sous-titre (ajout "— meme a 23h —")
- [ ] Ajouter pill "Assistant 24h/24 inclus"
- [ ] Ajouter micro-phrase pain point #1
- [ ] Ajouter 4e bullet carte gestionnaire
- [ ] Modifier tagline portail locataire
- [ ] Remplacer 5e carte fonctionnalites
- [ ] Creer section "Un numero qui repond en votre nom" (4 cartes)
- [ ] Modifier texte Vision
- [ ] Ajouter bandeau pricing IA
- [ ] Ajouter 3 FAQ dans `data/faq.ts`
- [ ] Modifier texte CTA final
- [ ] Ajouter 3 offers dans JSON-LD (`app/page.tsx`)
- [ ] Enrichir meta description (`app/layout.tsx`)
- [ ] Lint passe
- [ ] Responsive mobile OK

---

*Document cree le 2 mars 2026*
*Source : Brainstorming SEO strategist + SEO copywriter + plan technique v3.5*
*Approche validee : enhancement subtil (10 micro-modifications + 1 section), PAS un redesign*
