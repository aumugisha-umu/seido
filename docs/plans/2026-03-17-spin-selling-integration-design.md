# Design — Integration SPIN Selling dans le Sales Kit SEIDO

> **Date** : 2026-03-17
> **Statut** : Valide
> **Objectif** : Integrer la methodologie SPIN Selling (Neil Rackham) pour transformer l'approche commerciale de "presentation produit" a "investigation de valeur"

---

## Contexte

Le sales kit actuel utilise Challenger Sale, PAS et StoryBrand — tous centres sur le presentateur qui revele la douleur. SPIN Selling inverse la dynamique : le prospect articule ses propres problemes via un questionnement structure. Le gap principal : pas de guide de decouverte structuree, questions de qualification basiques (Situation only), pas d'Implication ni Need-payoff.

**Frictions identifiees** : Decouverte superficielle (besoins restent implicites) + Demo qui ne convertit pas (features sans ancrage emotionnel).

**Utilisateur** : Fondateur-vendeur, connait le produit, pas de formation commerciale formelle.

---

## Architecture des livrables

### Livrable 1 — `spin-playbook-seido.md` (document autonome)
- Arbre de questionnement SPIN principal (tronc commun "boucles")
- Logique de conversion besoin implicite → besoin explicite
- Regles de timing : quand proposer la solution
- Grille de scoring post-appel
- Plan de progression 6 semaines

### Livrable 2 — Fiches segment (dans le meme fichier)
- Gestionnaire independant (50-200 lots)
- Agence multi-collaborateurs (200+ lots)
- Syndic de copropriete
- Chaque fiche : questions I et N specifiques au segment

### Livrable 3 — Mise a jour docs existants
- `kit-prospection-agences.md` : refonte Phase 2 avec sequencement SPIN
- `sales-pitch-kit.md` : ajout section "Regles SPIN"

---

## Design detaille

### Arbre SPIN — Tronc commun

**S — Situation (2-3 questions, 1 min)**
Objectif : cartographier le contexte sans ennuyer.
- "Combien de lots gerez-vous aujourd'hui ?"
- "Comment circule l'information quand un locataire signale un probleme ?"
- "Vous travaillez seul ou en equipe ?"
Regle : preparer AVANT l'appel (LinkedIn, BCE).

**P — Probleme (3-4 questions, 2-3 min)**
Objectif : faire emerger des insatisfactions (besoins implicites).
- Boucle information : "Est-ce qu'il vous arrive de ne pas retrouver un devis ?"
- Boucle visibilite : "Quand vous envoyez un prestataire, comment savez-vous si c'est fait ?"
- Boucle communication : "Les locataires vous rappellent souvent pour demander ou en est leur demande ?"
- Boucle continuite : "Si vous etes absent, un collegue peut reprendre un dossier facilement ?"

**I — Implication (3-5 questions, 3-4 min)**
Objectif : transformer chaque besoin implicite en douleur quantifiee.
Enchainements par theme (devis perdu → delai → appels → perte proprietaire, etc.)

**N — Need-payoff (2-3 questions, 1-2 min)**
Objectif : faire dire au prospect LUI-MEME les benefices.
Regle : ne poser que si le besoin explicite correspondant a ete exprime.
Signal de transition : enthousiasme du prospect = besoin EXPLICITE = maintenant on peut pitcher.

### Fiches segment

Chaque fiche (~200 mots) liste les questions I et N supplementaires au tronc commun, calibrees sur les implications specifiques du segment.

### Grille de scoring post-appel

Tableau : questions S/P/I/N posees, besoins implicites/explicites identifies, taux de conversion, resultat (Avancee/Continuation/Refus), auto-diagnostic.

### Plan de progression 6 semaines

- Sem 1-2 : Focus questions Probleme (3+ par appel)
- Sem 3-4 : Focus questions Implication (2+ par appel)
- Sem 5-6 : Focus questions Need-payoff (1+ besoin explicite par appel)
- Sem 7+ : Integration complete, ratio Avancees > 50%
