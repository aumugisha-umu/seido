# Programming Modal FINAL - Checklist de Test

## ✅ Liste de Vérification Complète

### 1. Apparence Générale
- [ ] Modal s'ouvre correctement (max-w-5xl)
- [ ] Titre "Programmer l'intervention" avec icône Calendar visible
- [ ] Modal scrollable si contenu dépasse 90vh
- [ ] Fermeture avec X ou clic extérieur fonctionne

### 2. Carte Récapitulatif de l'Intervention
- [ ] Border-left coloré (bleu) visible
- [ ] Icône de type avec background coloré
- [ ] Titre de l'intervention affiché
- [ ] Location avec icône appropriée (Building2 ou MapPin)
- [ ] Badges catégorie + urgence affichés avec bonnes couleurs
- [ ] Description visible avec line-clamp-2

### 3. Section Assignations - Gestionnaires
- [ ] Titre "Gestionnaire(s) assigné(s)" visible
- [ ] ContactSection avec style purple
- [ ] Warning "Au moins 1 gestionnaire requis" si vide
- [ ] Bouton "+ Ajouter gestionnaire" visible
- [ ] Cartes gestionnaires affichées avec :
  - [ ] Avatar avec icône User
  - [ ] Nom du gestionnaire
  - [ ] Email du gestionnaire
  - [ ] Background purple-50

### 4. Section Assignations - Prestataires
- [ ] Titre "Prestataire(s) à contacter" visible
- [ ] ContactSection avec style green
- [ ] Message "Aucun prestataire" si vide
- [ ] Bouton "+ Ajouter prestataire" visible
- [ ] Cartes prestataires affichées avec :
  - [ ] Icône Wrench
  - [ ] Nom du prestataire
  - [ ] Email du prestataire
  - [ ] Background green-50

### 5. Méthode de Planification
- [ ] Titre "Méthode de planification" visible
- [ ] Badge "Requis" animé si aucune sélection
- [ ] Description "Choisissez comment organiser..." visible
- [ ] **3 cartes visibles en grid-cols-3** (Desktop)
  - [ ] Carte "Fixer le rendez-vous" (blue)
  - [ ] Carte "Proposer des disponibilités" (purple)
  - [ ] Carte "Laisser s'organiser" (emerald)
- [ ] Checkmark visible sur carte sélectionnée
- [ ] Border coloré sur carte sélectionnée

### 6. Message Preview (si aucune méthode sélectionnée)
- [ ] Zone avec border-dashed visible
- [ ] Message "Sélectionnez une méthode..." visible
- [ ] Note "(Les options de devis...)" visible

### 7. Contenu Conditionnel - Mode "Fixer"
Sélectionner "Fixer le rendez-vous" puis vérifier :
- [ ] DateTimePicker affiché dans zone blue-50
- [ ] Champ "Date du rendez-vous" visible
- [ ] Champ "Heure de début" visible
- [ ] Champ "Heure de fin (optionnelle)" visible
- [ ] Date picker fonctionne
- [ ] Time picker fonctionne
- [ ] minDate = aujourd'hui

### 8. Contenu Conditionnel - Mode "Proposer"
Sélectionner "Proposer des disponibilités" puis vérifier :
- [ ] Section dans zone purple-50 visible
- [ ] Bouton "+ Ajouter un créneau" visible
- [ ] Message "Aucun créneau proposé..." si vide
- [ ] Ajouter un créneau fonctionne
- [ ] Chaque créneau affiche :
  - [ ] Label "Créneau 1", "Créneau 2", etc.
  - [ ] DateTimePicker avec mode="timerange"
  - [ ] Champs Date, Début, Fin
  - [ ] Bouton supprimer (icône Trash2)
- [ ] Suppression d'un créneau fonctionne

### 9. Contenu Conditionnel - Mode "Organiser"
Sélectionner "Laisser s'organiser" puis vérifier :
- [ ] Zone emerald-50 avec Info icon visible
- [ ] Titre "Coordination autonome" visible
- [ ] Description explicative visible

### 10. Toggle Devis
**Pré-requis** : Sélectionner "Fixer" ou "Proposer" (PAS "Organiser")
- [ ] Separator visible avant toggle
- [ ] Zone amber-50 avec border visible
- [ ] Icône FileText visible
- [ ] Titre "Demander un devis" visible
- [ ] Description "Exiger un devis..." visible
- [ ] Switch component visible et cliquable
- [ ] Switch change d'état au clic

### 11. Instructions Générales
**Pré-requis** : Sélectionner n'importe quelle méthode
- [ ] Separator visible avant instructions
- [ ] Label "Instructions générales" visible
- [ ] Textarea affiché (4 lignes)
- [ ] Placeholder approprié visible
- [ ] Helper text "Ces informations seront partagées..." visible
- [ ] Saisie de texte fonctionne
- [ ] Textarea resize-none (pas redimensionnable)

### 12. Footer
- [ ] Border-top visible
- [ ] Bouton "Annuler" (outline) visible
- [ ] Bouton "Confirmer la planification" (primary) visible
- [ ] Icône Check visible sur bouton Confirmer
- [ ] Bouton Confirmer disabled si :
  - [ ] Aucune méthode sélectionnée
  - [ ] isFormValid = false
- [ ] Clic sur Annuler ferme le modal
- [ ] Clic sur Confirmer appelle onConfirm()

---

## 🎯 Tests de Workflow Complets

### Workflow 1 : Planification Directe avec Devis
1. [ ] Ouvrir le modal
2. [ ] Cliquer sur carte gestionnaire → Ajouter un gestionnaire
3. [ ] Cliquer sur carte prestataire → Ajouter un prestataire
4. [ ] Cliquer sur "Fixer le rendez-vous"
5. [ ] Vérifier que DateTimePicker apparaît
6. [ ] Vérifier que toggle devis apparaît
7. [ ] Activer le toggle devis
8. [ ] Vérifier que instructions apparaît
9. [ ] Saisir une date
10. [ ] Saisir une heure
11. [ ] Saisir des instructions
12. [ ] Cliquer sur Confirmer
13. [ ] Modal se ferme

### Workflow 2 : Proposition de Créneaux
1. [ ] Ouvrir le modal
2. [ ] Ajouter gestionnaires et prestataires
3. [ ] Cliquer sur "Proposer des disponibilités"
4. [ ] Cliquer sur "+ Ajouter un créneau"
5. [ ] Remplir date et horaires du créneau 1
6. [ ] Ajouter un 2ème créneau
7. [ ] Remplir créneau 2
8. [ ] Supprimer créneau 1
9. [ ] Vérifier que toggle devis est visible
10. [ ] Vérifier que instructions est visible
11. [ ] Confirmer

### Workflow 3 : Laisser S'organiser (pas de devis)
1. [ ] Ouvrir le modal
2. [ ] Ajouter gestionnaires et prestataires
3. [ ] Cliquer sur "Laisser s'organiser"
4. [ ] Vérifier message "Coordination autonome"
5. [ ] Vérifier que toggle devis n'est PAS visible
6. [ ] Vérifier que instructions EST visible
7. [ ] Saisir instructions
8. [ ] Confirmer

---

## 📱 Tests Responsive

### Desktop (≥ 1024px)
- [ ] Modal width = max-w-5xl
- [ ] Méthodes de planification en 3 colonnes
- [ ] ContactSection en 2 colonnes (gestionnaires | prestataires)
- [ ] Tout visible sans scroll excessif

### Tablet (768px - 1023px)
- [ ] Modal width adapté
- [ ] Méthodes de planification en 2-3 colonnes
- [ ] ContactSection en 1 colonne
- [ ] Scroll vertical si nécessaire

### Mobile (< 768px)
- [ ] Modal full-width
- [ ] Méthodes de planification en 1 colonne (stacked)
- [ ] ContactSection en 1 colonne
- [ ] Scroll vertical
- [ ] Boutons footer empilés

---

## 🐛 Tests de Cas Limites

### Données Vides
- [ ] Aucun gestionnaire → Warning visible
- [ ] Aucun prestataire → Message "Aucun prestataire"
- [ ] Aucune méthode sélectionnée → Message preview visible
- [ ] Aucune instruction → Textarea vide OK

### Interactions Multiples
- [ ] Changer de méthode (direct → proposer → organiser)
- [ ] Toggle devis disparaît/réapparaît selon méthode
- [ ] Ajouter puis supprimer des créneaux
- [ ] Annuler puis réouvrir → État réinitialisé

### Validation
- [ ] Confirmer disabled si aucune méthode
- [ ] Confirmer disabled si isFormValid = false
- [ ] Confirmer enabled si tout OK

---

## ✨ Points de Qualité UI/UX

### Visuels
- [ ] Icônes cohérentes (Lucide React)
- [ ] Couleurs respectent le design system
- [ ] Spacing uniforme (space-y-6, gap-3, p-4)
- [ ] Borders et shadows subtiles
- [ ] Animations smooth (transitions, hover states)

### Accessibilité
- [ ] Labels associés aux inputs
- [ ] Placeholder text descriptif
- [ ] Helper text pour contexte
- [ ] Focus visible sur éléments interactifs
- [ ] Contraste suffisant (WCAG AA)

### Performance
- [ ] Pas de re-renders inutiles
- [ ] Animations fluides
- [ ] Scroll performant
- [ ] Modal s'ouvre < 100ms

---

## 📝 Rapport de Test

**Date** : ___________
**Testeur** : ___________
**Version** : programming-modal-FINAL.tsx

**Résumé** :
- [ ] Tous les éléments visuels présents
- [ ] Tous les workflows fonctionnels
- [ ] Responsive OK
- [ ] Cas limites gérés
- [ ] Qualité UI/UX satisfaisante

**Bugs trouvés** : ___________________________________________

**Notes** : _______________________________________________
