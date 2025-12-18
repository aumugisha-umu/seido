# Catalogue des Cas Négatifs - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Objectif** : Documenter tous les scénarios d'erreur et cas limites à tester

---

## Introduction

Ce catalogue recense les **cas négatifs** (unhappy paths) pour garantir une couverture complète des tests. Chaque cas négatif documente :
- Le scénario d'erreur
- Les données de test à utiliser
- Le message d'erreur attendu
- Le comportement UX attendu

### Notation

| Tag | Description |
|-----|-------------|
| `@validation` | Erreur de validation de formulaire |
| `@auth` | Erreur d'authentification/autorisation |
| `@network` | Erreur réseau/API |
| `@business` | Erreur de règle métier |
| `@concurrency` | Erreur de concurrence/conflit |
| `@security` | Tentative d'accès non autorisé |
| `@boundary` | Test de valeur limite |

---

## 1. Authentification

### 1.1 Login

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-AUTH-001` | Email invalide format | `not-an-email` | "Format email invalide" | Toast destructive |
| `NEG-AUTH-002` | Email inexistant | `unknown@test.com` | "Email ou mot de passe incorrect" | Toast destructive |
| `NEG-AUTH-003` | Mot de passe incorrect | `gestionnaire@test-seido.fr` / `wrong` | "Email ou mot de passe incorrect" | Toast destructive |
| `NEG-AUTH-004` | Mot de passe vide | `gestionnaire@test-seido.fr` / `` | "Le mot de passe est requis" | Validation inline |
| `NEG-AUTH-005` | Email vide | `` / `TestSeido2024!` | "L'email est requis" | Validation inline |
| `NEG-AUTH-006` | Compte désactivé | `disabled@test-seido.fr` | "Ce compte a été désactivé" | Toast destructive |
| `NEG-AUTH-007` | Trop de tentatives | 5 échecs consécutifs | "Trop de tentatives, réessayez dans X minutes" | Toast + blocage |

#### Détails des Tests

<details>
<summary><strong>NEG-AUTH-001</strong> : Email invalide format @validation</summary>

**Préconditions** :
- Page login affichée

**Étapes** :
1. Entrer `not-an-email` dans le champ email
2. Entrer un mot de passe quelconque
3. Cliquer sur "Se connecter"

**Résultat attendu** :
- [ ] Validation côté client AVANT soumission
- [ ] Message sous le champ : "Format email invalide"
- [ ] Champ email en rouge (border `--destructive`)
- [ ] Bouton reste cliquable mais formulaire non soumis

**Variantes à tester** :
- `email@` (domain manquant)
- `@domain.com` (local part manquant)
- `email@domain` (TLD manquant)
- `email..double@domain.com` (double point)

</details>

<details>
<summary><strong>NEG-AUTH-007</strong> : Brute force protection @security</summary>

**Préconditions** :
- Compteur de tentatives = 0

**Étapes** :
1. Tenter 5 logins avec mot de passe incorrect
2. Tenter un 6ème login

**Résultat attendu** :
- [ ] Après 5 tentatives : message "Trop de tentatives"
- [ ] Bouton "Se connecter" désactivé
- [ ] Timer visible indiquant le temps restant
- [ ] Logs sécurité générés côté serveur

</details>

---

### 1.2 Magic Link

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-MAGIC-001` | Lien expiré | Lien > 24h | "Ce lien a expiré" | Page erreur + bouton "Renvoyer" |
| `NEG-MAGIC-002` | Lien déjà utilisé | Lien utilisé 2x | "Ce lien a déjà été utilisé" | Page erreur |
| `NEG-MAGIC-003` | Lien modifié | Token altéré | "Lien invalide" | Page erreur |
| `NEG-MAGIC-004` | Email inexistant | `unknown@domain.com` | "Si ce compte existe, un email a été envoyé" | Message neutre (sécurité) |

---

### 1.3 Permissions & Accès

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-PERM-001` | Gestionnaire accède admin | `/admin/dashboard` | Redirect `/unauthorized` | Page 403 |
| `NEG-PERM-002` | Locataire accède gestionnaire | `/gestionnaire/dashboard` | Redirect `/unauthorized` | Page 403 |
| `NEG-PERM-003` | Prestataire accède biens | `/gestionnaire/biens` | Redirect `/unauthorized` | Page 403 |
| `NEG-PERM-004` | Propriétaire tente création | Action non autorisée | "Action non autorisée" | Toast + blocage |
| `NEG-PERM-005` | Accès bien autre équipe | `/gestionnaire/biens/immeubles/[autre-team-id]` | Page 404 ou 403 | Masquer existence |

#### Détails des Tests

<details>
<summary><strong>NEG-PERM-005</strong> : Isolation multi-tenant @security</summary>

**Préconditions** :
- Utilisateur A (Team Alpha) connecté
- Immeuble B appartient à Team Beta

**Étapes** :
1. Accéder directement à `/gestionnaire/biens/immeubles/[immeuble-B-id]`

**Résultat attendu** :
- [ ] Page 404 (PAS 403 pour masquer l'existence)
- [ ] Aucune donnée de l'immeuble B affichée
- [ ] Log sécurité enregistré
- [ ] RLS Supabase bloque la requête

**Variantes** :
- Même test avec lots
- Même test avec interventions
- Test via API directe (curl/Postman)

</details>

---

## 2. Gestion des Biens

### 2.1 Création Immeuble

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-BLDG-001` | Nom vide | `` | "Le nom est requis" | Validation inline |
| `NEG-BLDG-002` | Nom trop court | `AB` | "Minimum 3 caractères" | Validation inline |
| `NEG-BLDG-003` | Nom trop long | 256 caractères | "Maximum 255 caractères" | Validation inline |
| `NEG-BLDG-004` | Adresse invalide | Adresse inexistante | "Adresse non reconnue" | Toast warning |
| `NEG-BLDG-005` | Code postal invalide | `123` ou `ABCDE` | "Code postal invalide" | Validation inline |
| `NEG-BLDG-006` | Doublon nom + adresse | Immeuble existant | "Un immeuble existe déjà à cette adresse" | Toast destructive |
| `NEG-BLDG-007` | Caractères spéciaux | `<script>alert()</script>` | Sanitization, pas d'erreur | Enregistrement nettoyé |

#### Détails des Tests

<details>
<summary><strong>NEG-BLDG-007</strong> : XSS Prevention @security</summary>

**Préconditions** :
- Formulaire création immeuble

**Données de test** :
```javascript
// Nom de l'immeuble
<script>alert('XSS')</script>

// Adresse
"><img src=x onerror=alert('XSS')>

// Notes
javascript:alert('XSS')
```

**Résultat attendu** :
- [ ] Données sanitizées côté serveur
- [ ] Pas d'exécution de script
- [ ] Enregistrement créé avec texte nettoyé
- [ ] Affichage sûr (encoding HTML)

</details>

---

### 2.2 Création Lot

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-LOT-001` | Référence vide | `` | "La référence est requise" | Validation inline |
| `NEG-LOT-002` | Référence doublon | Référence existante même immeuble | "Cette référence existe déjà" | Validation inline |
| `NEG-LOT-003` | Catégorie invalide | Enum non valide | "Catégorie invalide" | N/A (select) |
| `NEG-LOT-004` | Surface négative | `-50` | "La surface doit être positive" | Validation inline |
| `NEG-LOT-005` | Surface zéro | `0` | "La surface doit être supérieure à 0" | Validation inline |
| `NEG-LOT-006` | Étage non numérique | `Premier` | "L'étage doit être un nombre" | Validation inline |
| `NEG-LOT-007` | Immeuble inexistant | UUID invalide | "Immeuble non trouvé" | Redirect liste |

---

### 2.3 Import Excel/CSV

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-IMP-001` | Fichier vide | Excel 0 lignes | "Le fichier est vide" | Toast + blocage |
| `NEG-IMP-002` | Format incorrect | `.txt` ou `.pdf` | "Format non supporté (xlsx, csv)" | Toast destructive |
| `NEG-IMP-003` | Colonnes manquantes | Excel sans "Nom" | "Colonne 'Nom' requise" | Erreur mapping |
| `NEG-IMP-004` | Taille excessive | Fichier > 10 MB | "Fichier trop volumineux (max 10 MB)" | Toast + blocage |
| `NEG-IMP-005` | Lignes invalides | 50% erreurs | "25/50 lignes en erreur" | Rapport détaillé |
| `NEG-IMP-006` | Encodage incorrect | CSV ISO-8859-1 | Caractères corrompus détectés | Warning + option |
| `NEG-IMP-007` | Doublons internes | 2 lignes identiques | "Doublons détectés (lignes 5, 12)" | Warning |

#### Détails des Tests

<details>
<summary><strong>NEG-IMP-005</strong> : Rapport d'erreurs d'import @validation</summary>

**Préconditions** :
- Fichier Excel avec 50 lignes dont 25 invalides

**Données de test** :
```csv
Nom,Adresse,Code Postal,Ville
"Immeuble OK","123 Rue Valid","75001","Paris"
"","Adresse sans nom","75002","Paris"          // Erreur: nom vide
"Immeuble 2","","75003","Paris"                // Erreur: adresse vide
"Immeuble 3","456 Rue","ABC","Paris"           // Erreur: CP invalide
```

**Résultat attendu** :
- [ ] Étape validation affiche résumé
- [ ] Liste des erreurs par ligne
- [ ] Option "Ignorer les erreurs et continuer"
- [ ] Option "Télécharger rapport d'erreurs"
- [ ] Seules les lignes valides importées si confirmé

</details>

---

## 3. Gestion des Contacts

### 3.1 Création Contact

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-CONT-001` | Email invalide | `not-an-email` | "Format email invalide" | Validation inline |
| `NEG-CONT-002` | Téléphone invalide | `123` | "Numéro de téléphone invalide" | Validation inline |
| `NEG-CONT-003` | Nom vide | `` | "Le nom est requis" | Validation inline |
| `NEG-CONT-004` | Email doublon | Email existant | "Un contact avec cet email existe déjà" | Toast warning |
| `NEG-CONT-005` | Type invalide | Enum non valide | "Type de contact invalide" | N/A (select) |

#### Formats de Téléphone à Tester

```
Valides:
+33612345678
0612345678
06 12 34 56 78
06.12.34.56.78

Invalides:
123           // Trop court
+33abc        // Non numérique
06123456789000 // Trop long
```

---

## 4. Interventions

### 4.1 Création Intervention

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-INT-001` | Titre vide | `` | "Le titre est requis" | Validation inline |
| `NEG-INT-002` | Titre trop long | 500 caractères | "Maximum 255 caractères" | Validation inline |
| `NEG-INT-003` | Lot non sélectionné | Aucun lot | "Veuillez sélectionner un lot" | Validation inline |
| `NEG-INT-004` | Catégorie non sélectionnée | Aucune catégorie | "Veuillez sélectionner une catégorie" | Validation inline |
| `NEG-INT-005` | Description trop longue | 10000 caractères | "Maximum 5000 caractères" | Validation inline |
| `NEG-INT-006` | Lot inaccessible | Lot autre équipe | "Lot non trouvé" | Erreur 404 |
| `NEG-INT-007` | Photo invalide | Fichier .exe | "Format non supporté (jpg, png, pdf)" | Toast destructive |
| `NEG-INT-008` | Photo trop lourde | Image > 5 MB | "Image trop volumineuse (max 5 MB)" | Toast destructive |

---

### 4.2 Transitions d'État (Machine à États)

| ID | Cas Négatif | État Actuel | Action | Message Attendu |
|----|-------------|-------------|--------|-----------------|
| `NEG-STATE-001` | Approuver sans droit | `demande` | Locataire approuve | "Action non autorisée" |
| `NEG-STATE-002` | Rejeter sans motif | `demande` | Rejeter (motif vide) | "Le motif de rejet est requis" |
| `NEG-STATE-003` | Double approbation | `approuvee` | Re-approuver | "Intervention déjà approuvée" |
| `NEG-STATE-004` | Clôturer sans travaux | `planifiee` | Clôturer | "L'intervention n'est pas terminée" |
| `NEG-STATE-005` | Transition invalide | `rejetee` | Planifier | "Transition non autorisée" |
| `NEG-STATE-006` | Annuler intervention clôturée | `cloturee_*` | Annuler | "Intervention déjà clôturée" |

#### Matrice des Transitions Valides

```
demande → approuvee | rejetee | annulee
approuvee → demande_de_devis | annulee
demande_de_devis → planification | annulee
planification → planifiee | annulee
planifiee → en_cours | annulee
en_cours → cloturee_par_prestataire | annulee
cloturee_par_prestataire → cloturee_par_locataire | cloturee_par_gestionnaire
cloturee_par_locataire → cloturee_par_gestionnaire
cloturee_par_gestionnaire → (final)
rejetee → (final)
annulee → (final)
```

#### Détails des Tests

<details>
<summary><strong>NEG-STATE-005</strong> : Transition invalide @business</summary>

**Préconditions** :
- Intervention en statut `rejetee`
- Utilisateur = Gestionnaire

**Étapes** :
1. Tenter d'accéder à l'action "Planifier"

**Résultat attendu** :
- [ ] Bouton "Planifier" NON VISIBLE dans l'UI
- [ ] Si appel API direct : 400 Bad Request
- [ ] Message : "Transition non autorisée de 'rejetee' vers 'planifiee'"
- [ ] Intervention reste en statut `rejetee`

</details>

---

### 4.3 Devis

#### 4.3.1 Validation des Données

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-DEVIS-001` | Montant négatif | `-100` | "Le montant doit être positif" | Validation inline |
| `NEG-DEVIS-002` | Montant zéro | `0` | "Le montant doit être supérieur à 0" | Validation inline |
| `NEG-DEVIS-003` | Montant excessif | `10000000` | "Montant anormalement élevé, vérifiez" | Warning (pas bloquant) |
| `NEG-DEVIS-004` | TVA invalide | `25` | "Taux TVA non reconnu (0, 5.5, 10, 20)" | Validation inline |
| `NEG-DEVIS-005` | Délai négatif | `-5 jours` | "Le délai doit être positif" | Validation inline |
| `NEG-DEVIS-006` | Double soumission | 2ème devis même prestataire | "Vous avez déjà soumis un devis" | Toast warning |
| `NEG-DEVIS-007` | Devis expiré | Validation après date limite | "Ce devis a expiré" | Toast destructive |

#### 4.3.2 Workflow Acceptation/Rejet (NOUVEAU)

| ID | Cas Négatif | Scénario | Message Attendu | UX |
|----|-------------|----------|-----------------|-----|
| `NEG-DEVIS-010` | Accepter sans sélection | Gestionnaire clique "Accepter" sans choisir devis | "Veuillez sélectionner un devis" | Toast warning |
| `NEG-DEVIS-011` | Accepter devis déjà rejeté | Devis précédemment rejeté | "Ce devis a été rejeté" | Bouton désactivé |
| `NEG-DEVIS-012` | Rejeter sans motif | Gestionnaire rejette sans commentaire | "Le motif de rejet est requis" | Validation inline |
| `NEG-DEVIS-013` | Rejeter devis accepté | Devis déjà accepté | "Ce devis est déjà accepté" | Bouton masqué |
| `NEG-DEVIS-014` | Accepter 2 devis | Sélectionner et accepter 2 devis | "Un seul devis peut être accepté" | Radio au lieu de checkbox |
| `NEG-DEVIS-015` | Modifier devis accepté | Prestataire modifie après acceptation | "Devis verrouillé après acceptation" | Formulaire readonly |
| `NEG-DEVIS-016` | Supprimer devis accepté | Prestataire supprime devis accepté | "Impossible de supprimer un devis accepté" | Bouton masqué |

#### 4.3.3 Conflits Multi-Devis (NOUVEAU)

| ID | Cas Négatif | Scénario | Message Attendu | UX |
|----|-------------|----------|-----------------|-----|
| `NEG-DEVIS-020` | Conflit montants très différents | 3 devis : 100€, 500€, 5000€ | Warning "Écarts importants détectés" | Highlight du plus cher |
| `NEG-DEVIS-021` | Tous devis expirés | 3 devis tous expirés | "Aucun devis valide disponible" | Bouton "Relancer demande" |
| `NEG-DEVIS-022` | Devis unique sans comparaison | 1 seul devis reçu | "1 seul devis reçu - confirmer acceptation ?" | Dialog confirmation |
| `NEG-DEVIS-023` | Prestataire non disponible | Devis accepté mais prestataire indispo | "Le prestataire n'est plus disponible" | Contact prestataire |
| `NEG-DEVIS-024` | Modification après envoi gestionnaire | Prestataire modifie devis soumis | "Nouvelle version du devis - relecture requise" | Badge "Modifié" |

<details>
<summary><strong>NEG-DEVIS-020</strong> : Écarts importants entre devis @business</summary>

**Préconditions** :
- Intervention avec 3 devis reçus
- Montants : 100€, 500€, 5000€ (écart > 500%)

**Résultat attendu** :
- [ ] Warning visuel sur le devis le plus élevé
- [ ] Tooltip expliquant l'écart
- [ ] Option "Demander justification au prestataire"
- [ ] Log pour audit (possible erreur ou arnaque)

</details>

---

### 4.4 Planification

#### 4.4.1 Validation des Créneaux

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-PLAN-001` | Créneau passé | Date < aujourd'hui | "La date doit être future" | Validation inline |
| `NEG-PLAN-002` | Créneau trop proche | < 24h | "Le RDV doit être à plus de 24h" | Validation inline |
| `NEG-PLAN-003` | Durée invalide | 0 ou négatif | "La durée doit être positive" | Validation inline |
| `NEG-PLAN-004` | Chevauchement | Créneau déjà occupé | "Créneau indisponible" | Indication visuelle |
| `NEG-PLAN-005` | Créneau expiré | Confirmation après 48h | "Ce créneau a expiré" | Toast + nouveaux créneaux |

#### 4.4.2 Double Booking & Conflits (NOUVEAU)

| ID | Cas Négatif | Scénario | Message Attendu | UX |
|----|-------------|----------|-----------------|-----|
| `NEG-PLAN-010` | Double booking prestataire | Prestataire réservé 14h-16h, nouvelle intervention 15h | "Conflit : déjà réservé 14h-16h" | Créneaux conflictuels grisés |
| `NEG-PLAN-011` | Double booking lot | Lot avec intervention 10h-12h, nouvelle 11h | "Une intervention est déjà prévue sur ce lot" | Warning + confirmation |
| `NEG-PLAN-012` | Modification créneau confirmé | Gestionnaire modifie après confirmation locataire | "Créneau déjà confirmé - notification de changement ?" | Dialog confirmation |
| `NEG-PLAN-013` | Annulation tardive | Annulation < 4h avant RDV | "Annulation tardive - des frais peuvent s'appliquer" | Warning |
| `NEG-PLAN-014` | Confirmation par mauvais utilisateur | Locataire B confirme créneau locataire A | "Vous n'êtes pas autorisé à confirmer ce créneau" | 403 Forbidden |
| `NEG-PLAN-015` | Créneau hors horaires | Dimanche 23h | "Créneau hors des horaires ouvrables" | Créneaux masqués ou warning |
| `NEG-PLAN-016` | Prestataire désassigné | Prestataire retiré après proposition créneaux | "Le prestataire a été retiré de l'intervention" | Toast + relancer |
| `NEG-PLAN-017` | Multi-confirmation | Locataire clique 2x sur "Confirmer" | Une seule confirmation enregistrée | Bouton disabled après clic |

#### 4.4.3 Créneaux Proposés (NOUVEAU)

| ID | Cas Négatif | Scénario | Message Attendu | UX |
|----|-------------|----------|-----------------|-----|
| `NEG-PLAN-020` | Aucun créneau proposé | Prestataire ne propose rien | "En attente des disponibilités du prestataire" | Relance auto après 48h |
| `NEG-PLAN-021` | Créneaux tous refusés | Locataire refuse tous les créneaux | "Aucun créneau ne convient ?" + proposition autres | Bouton "Proposer d'autres dates" |
| `NEG-PLAN-022` | Créneaux invalides | Prestataire propose dates passées | "Les créneaux proposés sont invalides" | Validation côté serveur |
| `NEG-PLAN-023` | Trop de créneaux | Prestataire propose 20 créneaux | "Maximum 5 créneaux proposés" | Limite côté UI |

<details>
<summary><strong>NEG-PLAN-010</strong> : Double booking prestataire @concurrency</summary>

**Préconditions** :
- Prestataire "Marc" a une intervention 14h-16h le 20/12
- Gestionnaire crée une nouvelle intervention pour Marc

**Étapes** :
1. Sélectionner Marc comme prestataire
2. Proposer créneau 15h-17h le 20/12

**Résultat attendu** :
- [ ] Calendrier affiche le créneau 14h-16h en grisé
- [ ] Message tooltip : "Marc - Intervention #123 (14h-16h)"
- [ ] Si créneau sélectionné quand même : warning bloquant
- [ ] Option "Voir le planning complet du prestataire"

</details>

---

### 4.5 Upload de Fichiers (NOUVEAU)

> **Contexte** : Tests d'upload pour photos interventions, documents biens, pièces jointes

#### 4.5.1 Validation de Format

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-UPLOAD-001` | Format non supporté | `fichier.exe` | "Format non supporté (jpg, png, pdf)" | Toast destructive |
| `NEG-UPLOAD-002` | Extension falsifiée | `virus.jpg` (renommé de .exe) | "Le contenu ne correspond pas à l'extension" | Validation MIME |
| `NEG-UPLOAD-003` | Fichier corrompu | Image tronquée | "Le fichier est corrompu ou illisible" | Toast destructive |
| `NEG-UPLOAD-004` | PDF avec scripts | PDF malicieux | "Le fichier contient des éléments non autorisés" | Sanitization |
| `NEG-UPLOAD-005` | SVG avec JavaScript | `<svg><script>alert()</script></svg>` | "Fichier SVG non autorisé ou sanitizé" | Sanitization |
| `NEG-UPLOAD-006` | Archive ZIP | `archive.zip` | "Archives non supportées" | Toast destructive |

#### 4.5.2 Validation de Taille

| ID | Cas Négatif | Données de Test | Message Attendu | UX |
|----|-------------|-----------------|-----------------|-----|
| `NEG-UPLOAD-010` | Fichier trop volumineux | Image 15 MB (max 5 MB) | "Fichier trop volumineux (max 5 MB)" | Barre de progression interrompue |
| `NEG-UPLOAD-011` | Image résolution excessive | 10000x10000 pixels | "Résolution trop élevée (max 4000x4000)" | Warning ou resize auto |
| `NEG-UPLOAD-012` | Fichier vide | 0 bytes | "Le fichier est vide" | Toast warning |
| `NEG-UPLOAD-013` | Quota dépassé | 100 MB total pour intervention | "Quota de stockage dépassé (100 MB max)" | Toast + option upgrade |
| `NEG-UPLOAD-014` | Trop de fichiers | 11ème fichier (max 10) | "Maximum 10 fichiers par intervention" | Bouton désactivé |

#### 4.5.3 Erreurs de Transfert

| ID | Cas Négatif | Scénario | Message Attendu | UX |
|----|-------------|----------|-----------------|-----|
| `NEG-UPLOAD-020` | Perte de connexion | Upload interrompu à 50% | "Upload interrompu - Réessayer ?" | Bouton retry |
| `NEG-UPLOAD-021` | Timeout serveur | Upload > 30s | "Le serveur ne répond pas" | Toast + retry |
| `NEG-UPLOAD-022` | Upload simultanés | 10 fichiers en parallèle | "Envoi en cours (3/10)..." | Queue avec progression |
| `NEG-UPLOAD-023` | Fermeture onglet | Utilisateur ferme pendant upload | Warning "Upload en cours, quitter ?" | Dialog confirmation |
| `NEG-UPLOAD-024` | Storage full | Bucket Supabase plein | "Espace de stockage insuffisant" | Contact admin |

#### 4.5.4 Cas de Sécurité Upload

| ID | Cas Négatif | Scénario | Comportement Attendu |
|----|-------------|----------|----------------------|
| `NEG-UPLOAD-030` | Path traversal | Filename `../../etc/passwd` | Nettoyage du filename |
| `NEG-UPLOAD-031` | Null byte injection | `image.php%00.jpg` | Rejet du filename |
| `NEG-UPLOAD-032` | Double extension | `file.php.jpg` | Vérification extension finale |
| `NEG-UPLOAD-033` | Polyglot file | JPEG valide + PHP payload | Pas d'exécution serveur |
| `NEG-UPLOAD-034` | EXIF data | Image avec GPS/metadata sensibles | Strip des EXIF optionnel |

<details>
<summary><strong>NEG-UPLOAD-002</strong> : Extension falsifiée @security</summary>

**Préconditions** :
- Fichier `malware.exe` renommé en `photo.jpg`

**Étapes** :
1. Tenter d'uploader `photo.jpg`
2. Serveur vérifie le magic number / MIME type réel

**Résultat attendu** :
- [ ] Validation MIME côté serveur (pas juste extension)
- [ ] Message : "Le contenu du fichier ne correspond pas à son extension"
- [ ] Fichier rejeté, non stocké
- [ ] Log sécurité enregistré
- [ ] Aucune exécution du fichier

**Vérification technique** :
```javascript
// Vérification magic bytes
const magicNumbers = {
  'jpg': [0xFF, 0xD8, 0xFF],
  'png': [0x89, 0x50, 0x4E, 0x47],
  'pdf': [0x25, 0x50, 0x44, 0x46]
}
```

</details>

---

## 5. Erreurs Réseau & API

### 5.1 Erreurs HTTP

| ID | Cas Négatif | Code HTTP | Message Utilisateur | UX |
|----|-------------|-----------|---------------------|-----|
| `NEG-NET-001` | Timeout | 504 | "Le serveur met trop de temps à répondre" | Toast + bouton retry |
| `NEG-NET-002` | Serveur indisponible | 503 | "Service temporairement indisponible" | Page maintenance |
| `NEG-NET-003` | Non autorisé | 401 | Redirect login | Session expirée |
| `NEG-NET-004` | Interdit | 403 | "Vous n'avez pas accès à cette ressource" | Page 403 |
| `NEG-NET-005` | Non trouvé | 404 | "Page non trouvée" | Page 404 |
| `NEG-NET-006` | Erreur serveur | 500 | "Une erreur est survenue" | Toast + ID erreur |
| `NEG-NET-007` | Offline | - | "Vous êtes hors ligne" | Banner persistant |

#### Détails des Tests

<details>
<summary><strong>NEG-NET-007</strong> : Mode Offline @network</summary>

**Préconditions** :
- Utilisateur connecté
- Application chargée

**Étapes** :
1. Désactiver le réseau (DevTools > Network > Offline)
2. Tenter une action (navigation, soumission)

**Résultat attendu** :
- [ ] Banner "Vous êtes hors ligne" apparaît
- [ ] Actions de lecture fonctionnent (cache PWA)
- [ ] Actions d'écriture mises en queue
- [ ] Synchronisation à la reconnexion

</details>

---

### 5.2 Erreurs de Validation Serveur

| ID | Cas Négatif | Contexte | Message Attendu | UX |
|----|-------------|----------|-----------------|-----|
| `NEG-VAL-001` | Données obsolètes | Modification concurrente | "Les données ont été modifiées" | Dialog conflit |
| `NEG-VAL-002` | Référence brisée | FK supprimée | "L'élément référencé n'existe plus" | Toast + refresh |
| `NEG-VAL-003` | Quota dépassé | Limite stockage | "Quota de stockage atteint" | Toast + upgrade |

---

## 6. Cas Limites (Boundary Tests)

### 6.1 Limites de Caractères

| Champ | Min | Max | Test Min | Test Max | Test Overflow |
|-------|-----|-----|----------|----------|---------------|
| Nom immeuble | 3 | 255 | `AB` | 255 chars | 256 chars |
| Référence lot | 1 | 50 | `` | 50 chars | 51 chars |
| Titre intervention | 5 | 255 | `Test` | 255 chars | 256 chars |
| Description | 0 | 5000 | `` | 5000 chars | 5001 chars |
| Motif rejet | 10 | 500 | 9 chars | 500 chars | 501 chars |

### 6.2 Limites Numériques

| Champ | Min | Max | Test Min-1 | Test Max+1 |
|-------|-----|-----|------------|------------|
| Surface lot | 1 | 9999 | 0 | 10000 |
| Étage | -5 | 99 | -6 | 100 |
| Montant devis | 0.01 | 999999.99 | 0 | 1000000 |
| TVA | 0 | 20 | -1 | 21 |

### 6.3 Limites de Volume

| Ressource | Limite | Test à Limite | Test Au-delà |
|-----------|--------|---------------|--------------|
| Fichiers par intervention | 10 | 10 fichiers | 11ème fichier |
| Taille fichier | 5 MB | 4.99 MB | 5.01 MB |
| Lots par immeuble | 1000 | 1000 lots | 1001 lots |
| Interventions ouvertes | 500 | 500 | 501 |

---

## 7. Cas de Concurrence

### 7.1 Édition Simultanée

| ID | Cas Négatif | Scénario | Résolution Attendue |
|----|-------------|----------|---------------------|
| `NEG-CONC-001` | Modification intervention | User A et B éditent | Dernier sauvegarde gagne + warning |
| `NEG-CONC-002` | Validation devis | 2 gestionnaires valident | Premier gagne, second reçoit erreur |
| `NEG-CONC-003` | Suppression pendant édition | User A édite, User B supprime | User A reçoit erreur 404 |

#### Détails des Tests

<details>
<summary><strong>NEG-CONC-001</strong> : Optimistic Locking @concurrency</summary>

**Préconditions** :
- Intervention I-001 existante
- 2 navigateurs (ou onglets) connectés

**Étapes** :
1. User A ouvre intervention I-001
2. User B ouvre intervention I-001
3. User A modifie le titre et sauvegarde
4. User B modifie la description et sauvegarde

**Résultat attendu** :
- [ ] User A : Sauvegarde réussie
- [ ] User B : Dialog "Cette intervention a été modifiée"
- [ ] Options : "Voir les changements", "Forcer ma version", "Annuler"
- [ ] Si "Voir les changements" : Diff visuel
- [ ] `updated_at` utilisé pour détecter le conflit

</details>

---

## 8. Cas de Sécurité

### 8.1 Injection

| ID | Cas Négatif | Payload | Comportement Attendu |
|----|-------------|---------|----------------------|
| `NEG-SEC-001` | SQL Injection | `'; DROP TABLE users; --` | Échappement, pas d'exécution |
| `NEG-SEC-002` | XSS Reflected | `<script>alert(1)</script>` | Encodage HTML |
| `NEG-SEC-003` | XSS Stored | `<img onerror=alert(1)>` | Sanitization |
| `NEG-SEC-004` | Path Traversal | `../../etc/passwd` | Rejet du path |
| `NEG-SEC-005` | Command Injection | `; cat /etc/passwd` | Échappement |

### 8.2 Authentification

| ID | Cas Négatif | Scénario | Comportement Attendu |
|----|-------------|----------|----------------------|
| `NEG-SEC-006` | Session hijacking | Cookie volé | Validation IP/User-Agent |
| `NEG-SEC-007` | JWT expiry bypass | Token expiré modifié | Rejet du token |
| `NEG-SEC-008` | Privilege escalation | Modifier role dans request | Validation côté serveur |

### 8.3 CSRF & Headers

| ID | Cas Négatif | Scénario | Comportement Attendu |
|----|-------------|----------|----------------------|
| `NEG-SEC-009` | CSRF sans token | Request depuis autre domaine | Rejet 403 |
| `NEG-SEC-010` | Missing CSP | Script externe | CSP bloque |
| `NEG-SEC-011` | Clickjacking | iframe malveillante | X-Frame-Options bloque |

---

## 9. Notifications (12 cas)

### 9.1 Real-time Connection

| ID | Cas Négatif | Scénario | Comportement Attendu |
|----|-------------|----------|----------------------|
| `NEG-NOTIF-001` | WebSocket bloqué | Firewall bloque WS | Fallback polling ou message d'erreur |
| `NEG-NOTIF-002` | Realtime non activé | Table sans replication | Log warning, pas de crash |
| `NEG-NOTIF-003` | Connexion perdue | Network offline | Status "disconnected", auto-reconnect |
| `NEG-NOTIF-004` | Max reconnect atteint | 5 tentatives échouées | Log "Max attempts", pas de boucle |

### 9.2 Badge Count

| ID | Cas Négatif | Scénario | Comportement Attendu |
|----|-------------|----------|----------------------|
| `NEG-NOTIF-005` | Count négatif | Race condition mark read | Count min = 0, jamais négatif |
| `NEG-NOTIF-006` | Count incohérent multi-tab | Mark read tab 1 | Sync correcte tab 2 |
| `NEG-NOTIF-007` | Overflow count | 999+ notifications | Affiche "99+" ou "999+" |

### 9.3 Actions Notifications

| ID | Cas Négatif | Scénario | Comportement Attendu |
|----|-------------|----------|----------------------|
| `NEG-NOTIF-008` | Mark read offline | Clic sans réseau | Optimistic UI, sync au retour |
| `NEG-NOTIF-009` | Mark read notif supprimée | Notif delete pendant action | Ignore silencieusement |
| `NEG-NOTIF-010` | Navigation vers ressource supprimée | Intervention deleted | Message "Ressource non trouvée" |
| `NEG-NOTIF-011` | Double click mark read | 2 clics rapides | Idempotent, une seule action |
| `NEG-NOTIF-012` | Mark all sans notifications | Liste vide | Bouton désactivé ou no-op |

---

## Checklist de Validation

### Avant Release

- [ ] **100% des cas P0** testés et passants
- [ ] **90% des cas P1** testés
- [ ] **Aucun cas sécurité** en échec
- [ ] **Cas de concurrence** vérifiés en staging

### Par Sprint

- [ ] Nouveaux cas négatifs documentés pour features ajoutées
- [ ] Régression sur cas existants
- [ ] Review des cas de boundary pour nouvelles limites

---

## Références

- **OWASP Testing Guide** : https://owasp.org/www-project-web-security-testing-guide/
- **Glossaire SEIDO** : `12-glossaire.md`
- **Données de test** : `11-donnees-test.md`
- **Matrice de couverture** : `13-matrice-couverture.md`

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (~100 cas) |
| 1.1 | 2025-12-18 | Ajout devis workflow (12 cas), double booking (12 cas), upload sécurité (20 cas) |
| **1.2** | **2025-12-18** | **Ajout Notifications (12 cas)** |

---

**Mainteneur** : Claude Code
**Total cas négatifs documentés** : ~157
