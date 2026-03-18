# Landing Page Redesign — Design Doc

**Date**: 2026-03-10
**Status**: Validated (brainstorming complete)
**Objective**: Refonte structure + contenu landing page SEIDO, inspirée des bonnes pratiques Rooftop/Rentio/Smovin

---

## Contexte

Analyse concurrentielle de 3 landing pages PropTech :
- **Rooftop** (getrooftop.io/fr) — Shared inbox, social proof massive (10 testimonials, logos Century 21, Capterra 4.5)
- **Rentio** (rentio.be/fr-be) — Platform complète gestion locative BE, 40+ logos clients, walkthrough 8 étapes
- **Smovin** (smovin.app/fr-be) — Concurrent direct BE

Persona cible : Gestionnaire immobilier (Julien Vandenberghe, 42 ans, 280 lots, 5-8 outils, frustrations centrées sur les interruptions et le manque de centralisation).

---

## Décisions Validées

### 1. Hero Section — REWRITE

**Headline** :
> "Chaque intervention pilotée. Chaque acteur connecté. Zéro appel inutile."

**Sous-titre** (garder) :
> "Vos interventions centralisées, vos locataires informés, vos prestataires autonomes. Gagnez jusqu'à 10h/semaine."

**CTAs** (garder) :
- "Essayer gratuitement" (primaire)
- "Voir SEIDO en action" (secondaire, ouvre démo)

**Trust badges** (garder) : Import CSV, Zéro formation, App locataires & prestataires

**Ajout** : Screenshot dashboard gestionnaire à droite (desktop), en dessous (mobile)

### 2. Social Proof Band — NOUVEAU

Insérer entre hero et pain points. Une ligne compacte :
> "**500+ lots gérés** · **2 400+ interventions traitées** · **98% de satisfaction**"

Chiffres issus de `stats-section.tsx` (pas des vrais clients pour l'instant).

### 3. Pain Points — GARDER TEL QUEL

Section "Le vrai coût d'une gestion locative sans outil adapté" + 3 scenarios. Excellent, ne pas toucher.

### 4. Walkthrough 4 Étapes — NOUVEAU (remplace feature list)

Flux narratif intervention, chaque étape = texte + screenshot :

| Étape | Titre | Description | Screenshot |
|-------|-------|-------------|------------|
| 1 | Le locataire signale | "Votre locataire prend une photo, décrit le problème, envoie. Vous recevez une demande structurée, pas un SMS flou." | Formulaire locataire mobile |
| 2 | Vous pilotez en 30 secondes | "Affectez un prestataire, validez un devis, planifiez un créneau. Depuis votre bureau ou votre canapé." | Dashboard gestionnaire |
| 3 | Le prestataire agit en autonomie | "Il voit l'adresse, le contact, le problème. Il propose un créneau, upload ses photos. Zéro allers-retours." | Vue prestataire mobile |
| 4 | Tout le monde est informé | "Locataire notifié, gestionnaire informé, historique complet. Preuve béton en cas de litige." | Timeline intervention |

### 5. Témoignages — RÉACTIVER

Réactiver `TestimonialsSection` avec 5 témoignages réécrits :

1. **Sophie D.** (Gestionnaire, 120 lots) : "On traitait 15 interventions/jour à la main. Avec SEIDO, c'est 15 minutes le matin et c'est bouclé."
2. **Marc L.** (Plombier indépendant) : "Je vois l'adresse, le problème, les photos. Je propose un créneau direct au locataire. Plus besoin d'appeler le gestionnaire."
3. **Laura M.** (Locataire) : "Avant j'appelais 3 fois pour savoir où en était ma fuite. Maintenant je suis le statut comme un colis."
4. **Jean-François R.** (Directeur agence) : "280 lots, 2 collaborateurs. Avant SEIDO, on était débordés. Aujourd'hui on envisage de prendre 50 lots de plus."
5. **Émilie D.** (Gestionnaire indépendante) : "Le dimanche, seules les vraies urgences passent. Mon week-end est redevenu un week-end."

### 6. Portails — MICRO-AJUSTEMENTS

**Portail Prestataire** sous-titre : "Ils bossent. Vous êtes informé. **Sans un seul appel.**"
**Portail Locataire** : Garder tel quel.

### 7. Tech Features — MICRO-AJUSTEMENT

"Connectez vos emails" → **"Vos emails au bon endroit"**

### 8. Import Section — GARDER

### 9. Roadmap Vision — GARDER

### 10. Pricing — MICRO-AJUSTEMENT

Titre : **"Un mois pour voir la différence. Sans carte bancaire."**

### 11. CTA Final — AJUSTEMENTS

- Sous-titre : **"Plus de visibilité. Moins d'appels. Zéro engagement."**
- Button : **"Démarrer mon mois gratuit"**

### 12. SEO Meta — REWRITE

- **Title** : "Gestion Locative Tout-en-Un — Gagnez 10h/semaine | SEIDO"
- **Description** : "Logiciel de gestion locative tout-en-un pour gestionnaires immobiliers. Interventions pilotées, portail locataire, portail prestataire. Essai gratuit 1 mois — sans carte bancaire."
- **OG** : Aligner avec nouvelles meta

---

## Fichiers à Modifier

| Fichier | Modifications |
|---------|--------------|
| `app/page.tsx` | Meta title, description, OG, Twitter cards |
| `components/landing/landing-page.tsx` | Hero headline, social proof band, walkthrough section, réactiver témoignages, micro-ajustements copy |
| `data/testimonials.ts` | Réécrire les 5 témoignages |

## Assets Requis

Screenshots de l'app (4) à placer dans `public/images/screenshots/` :
- `walkthrough-1-locataire.webp` — Formulaire locataire mobile
- `walkthrough-2-dashboard.webp` — Dashboard gestionnaire
- `walkthrough-3-prestataire.webp` — Vue prestataire mobile
- `walkthrough-4-timeline.webp` — Timeline intervention

Images existantes disponibles :
- `public/images/dashboard-hero.png` — Utilisable pour hero + walkthrough étape 2
- `public/images/mobile-portals.png` — Utilisable pour walkthrough étapes 1/3
- `public/images/mockup_desktop.webp` — Mockup desktop existant

---

## Analyse Concurrentielle (Résumé)

### Rooftop — Forces
- 10 testimonials avec noms/rôles/entreprises
- Logos clients reconnus (Century 21, Leonidas)
- Badge Capterra 4.5/5
- Walkthrough 4 étapes avec screenshots

### Rooftop — Faiblesses vs SEIDO
- Pas de pricing transparent
- Pas de FAQ
- Pas de problem-first storytelling
- Pas de portails dédiés par rôle

### Rentio — Forces
- 40+ logos clients
- Walkthrough 8 étapes couvrant tout le cycle locatif
- Intégrations spécifiques BE (MyRent, Keypoint, garantie locative)
- "+78% croissance" répété comme trust signal

### Rentio — Faiblesses vs SEIDO
- Pricing opaque (derrière "Demander une démo")
- Trop dense, page très longue
- Copy plus descriptif que émotionnel

### Rentio — Forces
- **40+ logos clients** — Trust signal massif (Dewaele, ERA, etc.)
- **Walkthrough 8 étapes** couvrant tout le cycle locatif
- **"3 étapes pour démarrer"** — Dé-risque l'engagement
- **Intégrations BE spécifiques** (MyRent, Keypoint, Exact Online)
- **"+78% croissance"** répété comme social proof

### Rentio — Faiblesses vs SEIDO
- Pricing opaque (derrière "Demander une démo")
- Page très dense et longue
- Copy descriptif plutôt qu'émotionnel
- Pas de FAQ

### Smovin — Forces
- **SEO content massif** — Pages piliers (bail locatif, charges, indexation, simulateur rendement)
- **Positionnement "automatisation"** — Mot-clé récurrent et puissant
- **Connexion bancaire automatique** — Vérification paiements auto
- **Avis Capterra positifs** — Interface intuitive

### Smovin — Faiblesses vs SEIDO
- Perçu comme cher (~600€/an pour un immeuble)
- Cible plutôt investisseurs individuels que gestionnaires pro
- Site full SPA (mauvais pour SEO crawling)
- Pas de portails prestataire/locataire dédiés

---

## Ajouts issus de l'analyse Rentio/Smovin (Phase 2)

### A. Mini "3 étapes pour démarrer" (inspiré Rentio)
Ajouter dans la section Pricing, après le slider :
> "1. Créez votre compte (2 min) → 2. Importez vos biens (CSV ou on s'en occupe) → 3. Invitez vos locataires et prestataires"

### B. Mot "automatiquement" dans walkthrough étape 4 (inspiré Smovin)
Étape 4 devient :
> "Locataire notifié, gestionnaire informé, historique complet — **automatiquement**. Preuve béton en cas de litige."

### C. Emplacement préparé pour logos clients (inspiré Rentio)
Dans le social proof band, prévoir un container caché pour logos clients futurs.
Code : `{/* TODO: Ajouter logos clients quand disponibles */}`

### D. Mention intégrations futures plus explicite (inspiré Rentio)
Roadmap "Pilotage Financier" desc enrichie :
> "Réconciliation bancaire auto. Impayés détectés. Régularisation des charges en 3 clics. **Connexion comptable (Exact Online, etc.).** Vos soirées Excel, c'est fini."
