# Plan d'Enrichissement — Agents Immobiliers Bruxelles

**Date:** 2026-03-27
**Objectif:** Enrichir les 1960 agents IPI pour campagne cold calling SEIDO
**Option:** C — Full Intelligence

---

## Données de base (IPI)

- 1960 agents, 1294 entreprises uniques
- Coeur de cible: 306 courtier+syndic titulaires + 131 syndics titulaires = **437 priorité haute**
- 830 agents avec site web listé

---

## 4 Axes d'Enrichissement (parallèles)

### Axe 1: Site Web Analysis (830 agents)
- **HTTP check**: site actif ? redirect ? 404 ?
- **Extraction contenu**: services proposés (gestion locative, syndic, vente, location)
- **Détection équipe**: page "équipe"/"team", nombre de personnes mentionnées
- **Détection outils/logiciels**: mentions de logiciels (Sweepbright, Whise, Smovin, Apsynet, etc.)
- **Portfolio indicators**: mentions de nombre de lots/biens gérés
- **Output**: `_enrichment_websites.json`

### Axe 2: Google Business / Reviews
- **Google Maps search**: par nom entreprise + adresse
- **Extraction**: note Google, nombre d'avis, résumé des thèmes négatifs
- **Pain point detection**: mots-clés dans les avis (délai, communication, réactivité, syndic)
- **Output**: `_enrichment_google.json`

### Axe 3: BCE / KBO (Banque-Carrefour des Entreprises)
- **Lookup par nom entreprise**: numéro d'entreprise, forme juridique, date création
- **Code NACE**: activité principale déclarée
- **Taille légale**: micro/petite/moyenne (si disponible via données publiques)
- **Adresse siège social**: cross-validation avec adresse IPI
- **Output**: `_enrichment_bce.json`

### Axe 4: Immoweb + Présence en ligne
- **Recherche Immoweb**: nombre d'annonces actives par agence
- **Type de biens**: vente vs location, résidentiel vs commercial
- **Zone géographique couverte**: communes des annonces
- **Estimation taille portfolio**: nb annonces × facteur ~3-5 = lots estimés
- **Output**: `_enrichment_immoweb.json`

---

## Phase finale: Merge & Scoring

Combiner les 4 axes + données IPI en un fichier de scoring:

| Score | Critère | Points |
|-------|---------|--------|
| Statut IPI | Courtier+Syndic titulaire = 30pts, Syndic titulaire = 25pts, Courtier titulaire = 15pts, Stagiaire = 5pts | 0-30 |
| Taille estimée | 80-500 lots = 25pts, 500+ = 15pts, <80 = 5pts | 0-25 |
| Pain points détectés | Avis négatifs communication/délai = 15pts | 0-15 |
| Présence web | Site actif + annonces Immoweb = 10pts | 0-10 |
| Contactabilité | Tel + Email + Site = 10pts | 0-10 |
| Ancienneté BCE | >5 ans = 10pts (stable, budget) | 0-10 |

**Score max: 100** → Tier A (70+), Tier B (40-69), Tier C (<40)

---

## Output final

`docs/sales/PROSPECTS_QUALIFIES_BRUXELLES.md` — top prospects triés par score, avec:
- Fiche résumé par prospect (1 paragraphe)
- Pain points détectés
- Angle d'attaque SPIN suggéré
- Informations de contact
