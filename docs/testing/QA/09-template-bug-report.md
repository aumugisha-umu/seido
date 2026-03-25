# Template Rapport de Bug - SEIDO

> **Usage** : Copier ce template pour chaque bug identifié
> **Format** : Un fichier par bug OU tableau centralisé

---

## Template Bug Individuel

```markdown
# BUG-[NUMERO] : [Titre Court]

## Informations Générales

| Champ | Valeur |
|-------|--------|
| **ID** | BUG-XXX |
| **Date** | YYYY-MM-DD |
| **Testeur** | [Nom] |
| **Sévérité** | 🔴 Critical / 🟠 Major / 🟡 Minor / 🟢 Trivial |
| **Catégorie** | Fonctionnel / UI / Performance / Sécurité / Accessibilité |
| **Statut** | Nouveau / Assigné / En cours / Résolu / Vérifié / Fermé |
| **Assigné à** | [Développeur] |

## Environnement

| Champ | Valeur |
|-------|--------|
| **URL** | https://... |
| **Navigateur** | Chrome 120 / Firefox 121 / Safari 17 |
| **OS** | Windows 11 / macOS 14 / iOS 17 / Android 14 |
| **Viewport** | 1920x1080 / 768x1024 / 375x812 |
| **Rôle testé** | Gestionnaire / Prestataire / Locataire / Admin |
| **Compte test** | test@example.com |

## Description

### Comportement Observé
[Description détaillée du bug]

### Comportement Attendu
[Ce qui devrait se passer]

## Étapes de Reproduction

1. Aller à [URL]
2. Se connecter avec [compte]
3. Cliquer sur [élément]
4. Observer [problème]

## Preuves

### Screenshot(s)
[Insérer screenshot ou lien]

### Vidéo (optionnel)
[Lien vers enregistrement]

### Console Logs
```
[Erreurs console si applicable]
```

### Network (optionnel)
[Requêtes échouées si applicable]

## Informations Additionnelles

### Fréquence
- [ ] Systématique (100%)
- [ ] Fréquent (>50%)
- [ ] Intermittent (<50%)
- [ ] Rare (<10%)

### Workaround
[Solution de contournement si trouvée]

### Lié à
[Autres bugs ou tickets liés]

## Historique

| Date | Action | Par |
|------|--------|-----|
| YYYY-MM-DD | Créé | [Testeur] |
| YYYY-MM-DD | Assigné | [Manager] |
| YYYY-MM-DD | Résolu | [Dev] |
| YYYY-MM-DD | Vérifié | [QA] |
```

---

## Niveaux de Sévérité

| Niveau | Icône | Description | Exemples |
|--------|-------|-------------|----------|
| **Critical** | 🔴 | Bloque l'utilisation, perte de données, sécurité | Crash app, données corrompues, faille auth |
| **Major** | 🟠 | Fonctionnalité principale non utilisable | Création intervention KO, upload échoue |
| **Minor** | 🟡 | Fonctionnalité secondaire ou workaround existe | Filtre ne marche pas, UI décalée |
| **Trivial** | 🟢 | Cosmétique, typo, amélioration | Faute orthographe, couleur légèrement différente |

---

## Catégories de Bugs

| Catégorie | Description | Exemples |
|-----------|-------------|----------|
| **Fonctionnel** | Feature ne marche pas | Bouton ne répond pas, données incorrectes |
| **UI/UX** | Problème visuel ou ergonomique | Couleur incorrecte, layout cassé, non responsive |
| **Performance** | Lenteur, timeout | Page > 5s, action bloquée |
| **Sécurité** | Vulnérabilité | Accès non autorisé, données exposées |
| **Accessibilité** | Non-conformité WCAG | Pas de label, contraste insuffisant |
| **Compatibilité** | Problème navigateur/device | Fonctionne Chrome, pas Safari |

---

## Exemple de Bug Rempli

```markdown
# BUG-001 : Bouton "Créer intervention" ne répond pas sur mobile

## Informations Générales

| Champ | Valeur |
|-------|--------|
| **ID** | BUG-001 |
| **Date** | 2025-12-15 |
| **Testeur** | Marie QA |
| **Sévérité** | 🟠 Major |
| **Catégorie** | Fonctionnel |
| **Statut** | Nouveau |
| **Assigné à** | - |

## Environnement

| Champ | Valeur |
|-------|--------|
| **URL** | https://preview.seido-app.com/gestionnaire/interventions/nouvelle-intervention |
| **Navigateur** | Safari 17 |
| **OS** | iOS 17.2 |
| **Viewport** | 375x812 (iPhone 14) |
| **Rôle testé** | Gestionnaire |
| **Compte test** | gestionnaire@test.seido-app.com |

## Description

### Comportement Observé
Le bouton "Créer l'intervention" en bas du formulaire ne réagit pas au tap sur iPhone.
Le formulaire est correctement rempli (validation OK), mais le tap n'entraîne aucune action.

### Comportement Attendu
Le bouton devrait déclencher la création de l'intervention et rediriger vers la page de détail.

## Étapes de Reproduction

1. Se connecter en tant que gestionnaire sur iPhone Safari
2. Aller à Interventions > Nouvelle intervention
3. Remplir tous les champs obligatoires
4. Scroller jusqu'au bouton "Créer l'intervention"
5. Taper sur le bouton
6. Observer : rien ne se passe

## Preuves

### Screenshot
[screenshot-bug-001.png]

### Console Logs
```
Aucune erreur dans la console
```

## Informations Additionnelles

### Fréquence
- [x] Systématique (100%)

### Workaround
Utiliser Chrome sur mobile fonctionne.

### Lié à
- Possiblement lié à BUG-003 (autres boutons Safari)

## Historique

| Date | Action | Par |
|------|--------|-----|
| 2025-12-15 | Créé | Marie QA |
```

---

## Tableau Centralisé de Suivi

Pour un suivi global, utiliser ce format :

| ID | Titre | Sévérité | Catégorie | Page | Status | Assigné |
|----|-------|----------|-----------|------|--------|---------|
| BUG-001 | Bouton ne répond pas Safari iOS | 🟠 Major | Fonctionnel | Nouvelle intervention | Nouveau | - |
| BUG-002 | Contraste texte insuffisant | 🟡 Minor | Accessibilité | Dashboard | Résolu | Pierre |
| BUG-003 | LCP > 5s sur liste interventions | 🟠 Major | Performance | Liste interventions | En cours | Jean |

---

## Statistiques Session QA

À remplir en fin de session :

| Métrique | Valeur |
|----------|--------|
| **Date session** | YYYY-MM-DD |
| **Durée** | X heures |
| **Pages testées** | X / 65 |
| **Bugs Critical** | X |
| **Bugs Major** | X |
| **Bugs Minor** | X |
| **Bugs Trivial** | X |
| **Total Bugs** | X |
| **Testeur** | [Nom] |

---

## Checklist Avant Soumission Bug

Avant de soumettre un bug, vérifier :

- [ ] Titre clair et descriptif
- [ ] Sévérité correctement évaluée
- [ ] Catégorie assignée
- [ ] Étapes de reproduction détaillées
- [ ] Screenshot ou vidéo attaché
- [ ] Environnement complet (browser, OS, viewport)
- [ ] Console logs vérifiés
- [ ] Comportement attendu décrit
- [ ] Pas de doublon avec bug existant
- [ ] Reproductible (testé 2+ fois)

---

## Fichiers à Créer

Pour une session QA, créer :

```
docs/testing/QA/bugs/
├── session-YYYY-MM-DD/
│   ├── BUG-001-titre-court.md
│   ├── BUG-002-titre-court.md
│   ├── screenshots/
│   │   ├── bug-001-screenshot.png
│   │   └── bug-002-screenshot.png
│   └── session-summary.md
```

---

**Template Version** : 1.0
**Dernière mise à jour** : 2025-12-15
