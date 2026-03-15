# SEIDO AI Assistant — Analyse Pricing & Proposition de Modele

**Date** : 2026-03-15
**Statut** : Proposition — en attente de validation
**Auteur** : Analyse automatisee (Claude) + recherche marche
**Documents sources** : `ai-phone-assistant-plan.md` (v3.6), `ai-whatsapp-agent-plan.md` (v1.0), `Sales/sales-pitch-kit.md`, `Sales/sales-deck-seido.md`

---

## Table des matieres

1. [Resume executif](#1--resume-executif)
2. [Audit des modeles actuels](#2--audit-des-modeles-actuels)
3. [Benchmark marche 2025-2026](#3--benchmark-marche-2025-2026)
4. [Analyse des problemes du modele actuel](#4--analyse-des-problemes-du-modele-actuel)
5. [Modele de pricing propose](#5--modele-de-pricing-propose)
6. [Economie unitaire du modele propose](#6--economie-unitaire-du-modele-propose)
7. [Alignement avec le sales kit](#7--alignement-avec-le-sales-kit)
8. [Implementation Stripe](#8--implementation-stripe)
9. [Scenarios et projections](#9--scenarios-et-projections)
10. [Recommandation finale](#10--recommandation-finale)

---

## 1 — Resume executif

### Constat

Les deux modeles de pricing actuels (telephone a la minute, WhatsApp a la conversation) souffrent de trois problemes fondamentaux :

1. **Heritage vocal** : Le pricing est calibre sur un service de messagerie vocale IA (~€0.10/min de cout), alors que le pivot WhatsApp text-only coute ~€0.001/conversation — soit **100x moins cher**
2. **Deconnexion avec le marche** : Les leaders SaaS (Intercom, Zendesk, Tidio) facturent €0.50-2.00 par resolution/conversation IA. SEIDO facture €0.065-0.245/conversation (en decomposant les packs), ce qui est **sous-evalue** par rapport au marche
3. **Deconnexion avec la valeur** : Chaque conversation IA cree une intervention et economise ~15-30 min au gestionnaire (valeur €11-22 au cout horaire belge de 45€/h). Le pricing ne reflte pas cette valeur

### Proposition

Passer a un modele **hybride a 3 paliers** base sur les **conversations** (pas les minutes), avec des prix alignes sur la valeur delivree et le marche, et une option de facturation par lot pour les grands comptes.

---

## 2 — Audit des modeles actuels

### 2.1 Plan Telephone (ai-phone-assistant-plan.md v3.6)

| Pack | Prix/mois | Minutes incluses | Cout reel/min | Marge brute |
|------|-----------|-----------------|---------------|-------------|
| Solo | 49 EUR | 100 min | ~€0.104 | 77% |
| Equipe | 99 EUR | 250 min | ~€0.104 | 73% |
| Agence | 149 EUR | 500 min | ~€0.104 | 64% |

**Cout variable detaille (vocal) :**
- ElevenLabs Conversational AI : $0.10/min
- ElevenLabs LLM pass-through (Haiku 4.5) : $0.0075/min
- Telnyx inbound (Belgique) : ~$0.005/min
- Anthropic Haiku 4.5 (post-traitement) : ~$0.0015/appel
- **Total : ~$0.114/min (~€0.104/min)**

**Cout fixe plateforme :** ElevenLabs Pro $99/mo (~€91)

**Top-ups :** €0.30-0.50/min selon le pack

**Observations :**
- Pricing calque sur les services de messagerie vocale IA (Bland AI, Vapi, Smith.ai)
- Coherent pour un service vocal, mais **non transposable** a un service texte
- L'unite "minute" n'a pas de sens pour une conversation WhatsApp texte

### 2.2 Plan WhatsApp (ai-whatsapp-agent-plan.md v1.0)

| Pack | Prix/mois | Conversations incluses | Cout reel/conv | Marge brute |
|------|-----------|----------------------|----------------|-------------|
| Solo | 49 EUR | 200 conv | ~€0.001 | ~97% |
| Equipe | 79 EUR | 500 conv | ~€0.001 | ~98% |
| Agence | 129 EUR | 1500 conv | ~€0.001 | ~98% |

**Cout variable detaille (texte WhatsApp) :**
- Claude Haiku 4.5 : ~$0.001/conversation (~500 tokens in + ~200 tokens out × 5 messages)
- Meta WhatsApp service messages : $0.00 (customer-initiated = gratuit)
- Supabase storage + DB : ~$0.0001
- **Total : ~$0.001/conversation (~€0.001)**

**Cout fixe plateforme :** Telnyx numero $1/mo seulement (pas d'ElevenLabs)

**Top-ups :** €0.30/conversation supplementaire

**Observations :**
- Le prix a ete legerement reduit vs le plan telephone (49/79/129 au lieu de 49/99/149) mais reste dans le meme ordre de grandeur
- La marge de 97-98% est exceptionnelle mais **non defensible** si un concurrent entre sur le marche
- €0.30/conversation en overage sur un cout de €0.001 = markup de **300x** — difficilement justifiable

---

## 3 — Benchmark marche 2025-2026

### 3.1 AI Chatbot/Assistant SaaS — Pricing par resolution/conversation

| Plateforme | Modele | Prix/resolution | Plateforme base |
|------------|--------|-----------------|-----------------|
| **Intercom Fin** | Per resolution | **$0.99/resolution** | $29-139/seat/mois |
| **Zendesk AI Agents** | Per resolution | **$1.50** (engage) / **$2.00** (PAYG) | $115-169/agent/mois |
| **Tidio Lyro** | Per conversation | **~$0.50/conversation** | $29-349/mois |
| **Freshdesk Freddy** | Per session | **$0.10/session** (1000 = $100) | $49/agent/mois |
| **Crescendo.ai** | Per resolution | **$1.25/resolution** | Custom |
| **Ada AI** | Custom | Non public (~$70K/an median) | Enterprise only |

> **Fourchette marche : $0.10 - $2.00 par conversation/resolution IA**
> **Median : ~$0.75-1.00/conversation**

### 3.2 PropTech AI — Pricing specifique immobilier

| Plateforme | Modele | Prix | AI incluse ? |
|------------|--------|------|-------------|
| **AppFolio** (Lisa AI, Realm-X) | Per-unit/month | $1.49-5.00/unit/mois | Bundlee dans le plan |
| **Buildium** (Lumina AI) | Tiered monthly | $62-400/mois | AI dans le plan Premium ($400/mo) |
| **EliseAI** | Per-unit/month | Custom (enterprise) | AI = le produit |
| **NAITIVE** | Flat monthly | $299-599/mois | AI phone agent standalone |
| **VoiceFleet** | Flat monthly | A partir de $99/mois | AI voice pour PM |

> **Tendance PropTech : AI bundlee dans le plan (per-unit) ou flat monthly**
> Pas d'exemples de per-conversation en PropTech — **opportunite de differenciation**

### 3.3 Voice AI — Pricing a la minute (reference)

| Plateforme | Prix/min | Notes |
|------------|----------|-------|
| **Bland AI** | $0.09/min + $0.015/appel | Enterprise: $150K+/an |
| **Vapi** | $0.05/min base (total $0.10-0.33/min) | TTS+STT+LLM separes |
| **Retell AI** | $0.07+/min ; chat $0.002/msg | Le plus transparent |
| **Air AI** | $0.11-0.32/min + licence $25-100K | 10K+ appels/mois min |
| **Smith.ai** | ~$97.50/mois + $3.75/appel overage | AI + humain hybride |

### 3.4 Meta WhatsApp Business API — Couts 2025-2026

Changement majeur **1er juillet 2025** : passage du per-conversation au per-message.

| Type de message | Cout (Europe) | Applicable SEIDO ? |
|-----------------|---------------|---------------------|
| **Service messages** | **GRATUIT** | **Oui — 100% des cas** |
| Utility templates | ~$0.005-0.03 | Post-MVP (rappels RDV) |
| Marketing templates | ~$0.06-0.22 | Non pertinent |

> Pour le use case SEIDO (conversations initiees par le locataire), **le cout WhatsApp Meta est nul**.

### 3.5 Tendances cles 2025-2026

1. **Modele hybride dominant** : 41% des entreprises SaaS (vs 27% en 2024) — abonnement + usage
2. **Per-resolution en forte croissance** : de 5% a ~20-25% prevu d'ici 2028
3. **Couts d'inference AI en baisse de 78%** en 2025 — pression sur les prix
4. **SMB = predictabilite** : les petits clients preferent des packs fixes aux prix a l'usage
5. **73% des entreprises** testent encore leurs modeles de pricing AI — le marche n'est pas fige

---

## 4 — Analyse des problemes du modele actuel

### Probleme 1 : Heritage du modele vocal

Le plan WhatsApp a copie la structure du plan telephone (3 tiers, memes fourchettes de prix), mais les couts sous-jacents sont radicalement differents :

| | Plan Telephone | Plan WhatsApp | Ratio |
|---|---|---|---|
| Cout/interaction | €0.104/min | €0.001/conv | **104x** |
| Cout fixe plateforme | €91/mo (ElevenLabs) | ~€1/mo (Telnyx numero) | **91x** |
| Break-even | 2 equipes | <1 equipe | — |

Le plan WhatsApp porte encore le "prix psychologique" du vocal sans en avoir les couts. C'est une aubaine a court terme (marges 97%), mais un risque a moyen terme.

### Probleme 2 : Deconnexion avec la valeur delivree

Chaque conversation IA genere une **intervention SEIDO** qui economise au gestionnaire :
- **15-30 min** de prise de demande (appel + saisie manuelle)
- Valeur : **€11-22** (au cout horaire belge de 45€/h)

Le plan actuel facture entre **€0.065/conv** (Agence 1500 conv a 129€) et **€0.245/conv** (Solo 200 conv a 49€). C'est **10-100x en dessous** de la valeur percue.

Le marche (Intercom, Zendesk) facture **€0.50-2.00/resolution** pour des taches bien moins specifiques. SEIDO a un avantage : chaque conversation produit un **resultat concret et mesurable** (une intervention creee).

### Probleme 3 : Pricing non aligne avec le sales kit

Le sales kit positionne SEIDO comme un outil qui fait economiser **31 000€/an** (ROI 7.2x) sur un abonnement de 5 000€/an (100 lots).

L'add-on AI a 49-129€/mois ajoute 588-1548€/an au cout total. Mais le pitch ne cadre pas l'AI en termes de ROI additionnel. Combien de conversations IA = combien d'heures economisees ?

**Calcul :** Si un gestionnaire de 100 lots recoit ~50 demandes d'intervention/mois, et que l'IA en traite 70% (35 conversations), a 20 min economisees/conversation :
- Temps economise : 35 × 20 min = **~12h/mois**
- Valeur : 12h × 45€/h = **540€/mois**
- Si le pack coute 49€/mois → **ROI 11x sur l'add-on IA seul**

Ce ROI devrait etre au coeur du pitch, pas enterre dans un calcul de minutes.

### Probleme 4 : Confusion minutes vs conversations

Le plan telephone utilise des "minutes", le plan WhatsApp des "conversations", mais le self-service design montre toujours des jauges en minutes. Un locataire qui envoie un WhatsApp texte consomme-t-il 1 minute ? 3 minutes ? C'est confus.

### Probleme 5 : Top-up a €0.30/conversation (markup 300x)

Sur le plan WhatsApp, le top-up a €0.30/conversation sur un cout de €0.001 est un markup de 300x. Si un client fait le calcul (ou si un concurrent communique sur les couts reels de l'API Claude), c'est un risque reputationnel.

---

## 5 — Modele de pricing propose

### 5.1 Principes directeurs

1. **Value-based** : Prix ancre sur la valeur delivree (temps economise), pas sur les couts
2. **Predictable** : Packs fixes pour la cible SMB (gestionnaires independants, petites agences)
3. **Aligne marche** : Dans la fourchette €0.25-1.00/conversation (sous Intercom/Zendesk, au-dessus de Freshdesk)
4. **Scalable** : Option per-lot pour grands comptes (aligne avec le modele SEIDO de base)
5. **Simple** : Une seule unite — la **conversation** (pas minutes, pas messages)

### 5.2 Definition d'une "conversation"

> **1 conversation = 1 echange complet avec un locataire aboutissant a un resultat**
> (intervention creee, information transmise, ou demande classee)

- Inclut tous les messages echanges dans une session (typiquement 5-10 messages)
- Inclut les photos/medias envoyes par le locataire
- Inclut l'extraction structuree et la creation d'intervention
- Une session qui expire sans resultat (abandon apres 1-2 messages) = **non comptabilisee**

### 5.3 Grille tarifaire proposee — Modele A : "Packs conversations" (recommande)

| Pack | Prix/mois | Conversations incluses | Overage | Cible | Prix effectif/conv |
|------|-----------|----------------------|---------|-------|-------------------|
| **Starter** | 29 EUR | 50 conversations | 0,75 EUR/conv | Independant 1-30 lots | 0,58 EUR |
| **Pro** | 59 EUR | 150 conversations | 0,50 EUR/conv | Petite agence 30-100 lots | 0,39 EUR |
| **Business** | 119 EUR | 500 conversations | 0,35 EUR/conv | Agence structuree 100+ lots | 0,24 EUR |
| **Enterprise** | Sur devis | Illimite | — | 500+ lots, syndics | Negocie |

**Inclus dans tous les packs :**
- 1 numero WhatsApp belge (+32) dedie
- Conversations 24h/24, 7j/7
- Transcription + resume structure
- Creation automatique d'interventions dans SEIDO
- Rapport PDF telecharge
- Instructions personnalisees (500 caracteres)
- Dashboard usage en temps reel

**Top-up (recharge) :** Blocs de 50 conversations au tarif d'overage du pack.

**Prerequis :** Plan SEIDO payant actif (pas disponible sur le free tier).

### 5.4 Justification des prix

| Element | Justification |
|---------|---------------|
| **29€ entree** | Point d'entree sous la barre psychologique des 30€. Plus accessible que l'ancien 49€. Permet aux petits gestionnaires de tester. |
| **50 conversations Starter** | Un gestionnaire de 20 lots recoit ~10-20 demandes/mois. 50 couvre le flux normal avec marge. |
| **59€ Pro / 150 conv** | 100 lots ≈ 30-50 demandes/mois. 150 conversations laissent de la marge pour les pics. Prix median du marche. |
| **119€ Business / 500 conv** | 200+ lots ≈ 100-150 demandes/mois. Volume eleve justifie un prix degressif. |
| **Overage 0.35-0.75€** | Aligne avec la fourchette basse du marche ($0.50-2.00). L'overage coute 350-750x le cout reel, mais reste **10-30x inferieur a la valeur delivree** (€11-22/conversation en temps economise). |

### 5.5 Modele alternatif B : "Per-lot AI" (grands comptes)

Pour les clients avec des portefeuilles importants, option de facturation alignee sur le modele SEIDO de base :

| Taille | Prix/lot/mois | Inclus | Equivalent pour 100 lots |
|--------|--------------|--------|--------------------------|
| 50-200 lots | +1,50 EUR/lot/mois | Conversations illimitees | 150 EUR/mois |
| 200-500 lots | +1,00 EUR/lot/mois | Conversations illimitees | 200 EUR/mois (200 lots) |
| 500+ lots | +0,75 EUR/lot/mois | Conversations illimitees | 375 EUR/mois (500 lots) |

**Avantages :**
- Alignement parfait avec le pricing SEIDO de base (€5/lot/mois + €1.50/lot/mois IA = €6.50/lot/mois)
- Predictabilite totale pour le client
- Pas de comptage de conversations — experience premium
- Simplifie le pitch : "IA incluse pour €1.50/lot/mois de plus"

**Quand proposer le modele B :**
- Client avec 100+ lots qui hesite sur les quotas
- Negociation annuelle (€1.50 × 100 lots × 12 mois = 1 800€/an)
- Syndics avec flux imprevisible

### 5.6 Comparaison ancien vs nouveau

| Metrique | Ancien (WhatsApp plan) | Nouveau (Modele A) | Amelioration |
|----------|------------------------|--------------------|--------------|
| Entry price | 49 EUR/mois | 29 EUR/mois | **-41% — plus accessible** |
| Prix effectif/conv (entry) | 0,245 EUR | 0,58 EUR | **+137% — mieux aligne valeur** |
| Marge brute (entry) | 97% | 98% | Equivalente |
| Overage | 0,30 EUR/conv | 0,75 EUR/conv (Starter) | **+150% — aligne marche** |
| Conversations incluses (entry) | 200 | 50 | Plus realiste |
| Ancrage marche | Sous le marche | Dans la fourchette basse | **Positionne vs Intercom/Zendesk** |

---

## 6 — Economie unitaire du modele propose

### 6.1 Cout variable par conversation (WhatsApp text-only)

| Poste | Cout | Source |
|-------|------|--------|
| Claude Haiku 4.5 (conversation ~5 msgs) | ~$0.001 | ~500 tokens in + ~200 tokens out × 5 |
| Claude Haiku 4.5 (extraction structuree) | ~$0.0005 | ~300 tokens extraction |
| Meta WhatsApp service messages | $0.00 | Customer-initiated = gratuit |
| Supabase (storage + DB writes) | ~$0.0001 | Negligeable |
| **Total cout variable** | **~$0.0016/conv** | **~€0.0015/conv** |

### 6.2 Marge brute par pack

| Pack | Revenue/mois | Cout variable (100% usage) | Cout fixe (numero) | **Cout total** | **Marge brute** |
|------|-------------|---------------------------|---------------------|----------------|-----------------|
| **Starter** (50 conv) | €29 | €0.08 | €0.92 | **€1.00** | **€28.00 (97%)** |
| **Pro** (150 conv) | €59 | €0.23 | €0.92 | **€1.15** | **€57.85 (98%)** |
| **Business** (500 conv) | €119 | €0.75 | €0.92 | **€1.67** | **€117.33 (99%)** |

### 6.3 Marge sur l'overage

| Pack | Prix overage/conv | Cout reel/conv | Marge unitaire |
|------|-------------------|----------------|----------------|
| Starter | €0.75 | €0.0015 | **€0.75 (>99%)** |
| Pro | €0.50 | €0.0015 | **€0.50 (>99%)** |
| Business | €0.35 | €0.0015 | **€0.35 (>99%)** |

> **Note :** Les marges sont exceptionnelles car le WhatsApp text-only via Claude API a un cout quasi-nul. La valeur facturee est **value-based** (basee sur le temps economise), pas cost-plus.

### 6.4 Break-even plateforme

| Cout fixe | Montant | Amorti par |
|-----------|---------|-----------|
| Telnyx numeros | ~€1/numero/mois | Inclus dans chaque pack |
| Supabase (marginal) | ~€0 (deja paye) | Absorbe par SEIDO |
| Vercel (marginal) | ~€0 (deja paye) | Absorbe par SEIDO |
| **Total fixe** | **~€1/equipe/mois** | **Break-even : 1 equipe** |

> **Pas de cout fixe ElevenLabs** dans le modele WhatsApp-only (pivot majeur).
> Le break-even est **immediat** des le premier client.

---

## 7 — Alignement avec le sales kit

### 7.1 Integration dans le pitch

Le sales kit (pitch kit + sales deck) utilise le framework **"10h → 1h"** et **ROI 7.2x**. L'add-on IA doit s'inscrire dans ce recit.

**Proposition de framing :**

> "SEIDO, c'est le squelette — tout centralise. Les reflexes — tout automatise. Et maintenant, le cerveau — l'IA qui premache le travail.
>
> Avec l'assistant IA WhatsApp, vos locataires signalent un probleme en 2 minutes par WhatsApp — avec photos. L'IA collecte toutes les informations, cree l'intervention dans SEIDO, et vous notifie avec un resume complet. Vous n'avez qu'a valider.
>
> Chaque demande traitee par l'IA, c'est 20 minutes de gagnees. Sur 35 demandes par mois, ca fait 12 heures. En valeur, c'est 540 euros par mois — pour un add-on a 59 euros."

### 7.2 ROI specifique a l'add-on IA

| Taille | Demandes/mois (estimees) | Traitees par IA (70%) | Temps economise | Valeur (45€/h) | Cout add-on | **ROI** |
|--------|--------------------------|----------------------|-----------------|----------------|-------------|---------|
| 30 lots | ~15 | ~10 | ~3h | ~€135/mois | €29 (Starter) | **4.7x** |
| 100 lots | ~50 | ~35 | ~12h | ~€540/mois | €59 (Pro) | **9.2x** |
| 200 lots | ~100 | ~70 | ~23h | ~€1 035/mois | €119 (Business) | **8.7x** |

### 7.3 Slide tarifs mise a jour (Slide 11 du sales deck)

Ajouter une ligne dans le tableau "Tout inclus" :

```
| Add-on | Assistant IA WhatsApp | +29 EUR/mois | 50 conversations IA incluses |
```

Et dans les exemples concrets :

| Portefeuille | SEIDO annuel | + IA annuel | Total | Economie IA/an |
|--------------|-------------|-------------|-------|----------------|
| 50 lots | 2 500 EUR | 348 EUR (Starter) | 2 848 EUR | ~1 620 EUR |
| 100 lots | 5 000 EUR | 708 EUR (Pro) | 5 708 EUR | ~6 480 EUR |
| 200 lots | 10 000 EUR | 1 428 EUR (Business) | 11 428 EUR | ~12 420 EUR |

### 7.4 Objections specifiques a l'IA

| Objection | Reponse |
|-----------|---------|
| "L'IA ne comprendra pas mes locataires" | "L'assistant est entraine specifiquement pour la prise de demandes d'intervention. Il parle francais, neerlandais et anglais, et il suit un script valide par des gestionnaires terrain." |
| "C'est quoi une conversation ?" | "Un echange complet avec un locataire : il decrit son probleme, envoie des photos si necessaire, et l'IA cree l'intervention dans SEIDO. Typiquement 5-10 messages en 3 minutes." |
| "Et si le locataire n'utilise pas WhatsApp ?" | "91% des Belges utilisent WhatsApp. Et le locataire peut toujours creer sa demande via le portail SEIDO." |
| "C'est pas cher pour de l'IA ?" | "L'IA travaille pour vous 24h/24. A 59€/mois pour 150 conversations, c'est moins de 40 centimes par demande traitee. Un appel telephonique vous coute 15 minutes — 11€ en temps." |
| "Et si je depasse mon quota ?" | "Vous etes prevenu a 80% et 100%. L'overage est transparent : 50 centimes par conversation supplementaire. Ou passez au pack superieur." |

---

## 8 — Implementation Stripe

### 8.1 Architecture recommandee

```
Stripe Product : "Assistant IA WhatsApp"
  ├── Price "Starter"   : 2900 cents/mo (recurring, flat)
  ├── Price "Pro"       : 5900 cents/mo (recurring, flat)
  └── Price "Business"  : 11900 cents/mo (recurring, flat)

Billing Meter : "ai_conversations"
  └── Usage reporte pour tracking (alertes + dashboard), PAS pour facturation metered

Top-up / Overage : One-time invoice items
  ├── Starter overage  : 75 cents/conversation (lot de 25 = 18,75 EUR)
  ├── Pro overage      : 50 cents/conversation (lot de 50 = 25 EUR)
  └── Business overage : 35 cents/conversation (lot de 50 = 17,50 EUR)
```

### 8.2 Changements vs l'ancien modele

| Element | Ancien | Nouveau | Changement |
|---------|--------|---------|------------|
| Product name | "Assistant IA Multi-Canal" | "Assistant IA WhatsApp" | Clarifie le canal |
| Meter event | `ai_voice_minutes` | `ai_conversations` | Unite coherente |
| Nombre de tiers | 3 (Solo/Equipe/Agence) | 3+1 (Starter/Pro/Business/Enterprise) | +1 tier enterprise |
| Meter value | `Math.ceil(durationSeconds / 60)` | `1` (par conversation terminee) | Plus simple |
| Alertes | 80% + 100% | 80% + 100% | Identique |

### 8.3 Definition "conversation terminee" (meter event trigger)

Une conversation est comptabilisee quand :
- Le locataire a fourni suffisamment d'informations pour creer une intervention (minimum : nom + adresse + description), **OU**
- La session a atteint l'etape 3 (confirmation) du script

**Non comptabilisee :**
- Session abandonnee apres 1-2 messages (pas d'information utile)
- Session technique echouee (erreur API, timeout serveur)

---

## 9 — Scenarios et projections

### 9.1 Projections de revenus (Modele A — Packs conversations)

| Equipes | Mix | Revenue/mois | Cout/mois | **Profit/mois** | **Marge nette** |
|---------|-----|-------------|-----------|-----------------|-----------------|
| 5 | 3 Starter + 2 Pro | €205 | ~€5 (numeros) | **~€200** | 98% |
| 10 | 4 Starter + 4 Pro + 2 Business | €590 | ~€10 | **~€580** | 98% |
| 25 | 8 Starter + 12 Pro + 5 Business | €1 535 | ~€25 | **~€1 510** | 98% |
| 50 | 15 Starter + 25 Pro + 10 Business | €3 105 | ~€50 | **~€3 055** | 98% |
| 100 | 25 Starter + 50 Pro + 25 Business | €6 650 | ~€100 | **~€6 550** | 98% |

> **Comparaison avec l'ancien modele :**
> A 10 equipes, l'ancien generait ~€479/mois de profit (avec le cout ElevenLabs Pro).
> Le nouveau genere ~€580/mois — **+21%** — sans cout fixe ElevenLabs.

### 9.2 Revenue avec overage (scenario realiste)

En supposant que 30% des clients depassent leur quota de 20% :

| Equipes | Revenue packs | Revenue overage (estime) | **Revenue total** |
|---------|--------------|--------------------------|-------------------|
| 10 | €590 | ~€45 | **€635** |
| 25 | €1 535 | ~€115 | **€1 650** |
| 50 | €3 105 | ~€230 | **€3 335** |

### 9.3 Comparaison des modeles (10 equipes, mix identique)

| Modele | Revenue/mois | Cout/mois | Profit/mois | Marge |
|--------|-------------|-----------|-------------|-------|
| Ancien (telephone) | €890 | €411 | €479 | 54% |
| Ancien (WhatsApp) | €790 | ~€10 | €780 | 99% |
| **Nouveau (propose)** | €590 + overage | ~€10 | **€580+** | **98%** |

> Le modele propose genere moins de revenue brut que l'ancien WhatsApp (€590 vs €790 a 10 equipes), mais avec un **entry price plus bas** (29€ vs 49€) qui devrait augmenter le taux de conversion. L'objectif est d'avoir **plus de clients** a un prix plus juste.

---

## 10 — Recommandation finale

### Modele recommande : Modele A (Packs conversations) avec option B pour grands comptes

| Decision | Choix | Raison |
|----------|-------|--------|
| **Unite** | Conversation (pas minute) | Coherent avec le canal WhatsApp, intuitif |
| **Entry price** | 29 EUR/mois | Sous la barre des 30€, maximise l'adoption |
| **Nombre de tiers** | 3 + Enterprise | Couvre independants → agences → syndics |
| **Overage** | 0.35-0.75 EUR/conv | Aligne fourchette basse du marche ($0.50-2.00) |
| **Modele B** | Per-lot (+1.50€/lot/mois) | Pour negociations grands comptes |
| **Break-even** | 1 equipe | Pas de cout fixe plateforme (pas d'ElevenLabs) |
| **Marge cible** | >95% | Possible grace au cout quasi-nul du WhatsApp text |

### Actions suivantes

1. **Valider** les prix proposes avec 2-3 gestionnaires pilotes (beta pricing)
2. **Mettre a jour** le sales deck (Slide 11) et le pitch kit avec le ROI de l'add-on IA
3. **Implementer** les produits Stripe (Product + 3 Prices + Meter)
4. **Adapter** le self-service design (page parametres) pour refléter les nouveaux packs
5. **Creer** une page de pricing dediee a l'IA sur le site marketing

### Risques identifies

| Risque | Probabilite | Mitigation |
|--------|-------------|-----------|
| Prix trop bas vs la valeur | Moyenne | Monitorer le taux d'adoption et ajuster a la hausse apres 6 mois |
| Concurrent avec prix plus bas | Faible (pas de concurrent PropTech WhatsApp AI en Belgique) | First-mover advantage + integration SEIDO = moat |
| Surconsommation (abus) | Faible | Conversations non abouties non comptabilisees + quota |
| Cout Claude API augmente | Faible (tendance baissiere) | Marge > 95% absorbe toute hausse raisonnable |

---

**Derniere mise a jour** : 2026-03-15
**Basee sur** : ai-phone-assistant-plan.md (v3.6), ai-whatsapp-agent-plan.md (v1.0), sales-pitch-kit.md, sales-deck-seido.md, benchmark marche mars 2026
