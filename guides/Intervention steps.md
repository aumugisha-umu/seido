# Description des fonctionnalités

Gérer l'intégralité du cycle de vie des interventions de maintenance, de la création à la validation finale, avec des interfaces personnalisées pour les locataires, le gestionnaire et les prestataires de services. L'interface est optimisée pour plus de clarté, de flexibilité et une collaboration structurée.

**Modèle de statut**

Les statuts disponibles sont :

Demande - Rejetée/Approuvée - Demande de devis - Planification - Planifiée - En cours - Cloturée par prestataire - Cloturée par le locataire - Cloturée par le gestionnaire - Annulée

Dans la liste des interventions, les statuts sont regroupés dans les onglets suivants :

**Tout** : Toutes les interventions
- **Demandé** : Demande, Approuvée
- **Exécution** : Demande de devis, Planification, A venir,  En cours, Cloturée par prestataire
- **Clôturé** : Cloturée par le locataire - Cloturée par le gestionnaire / Annulée / Rejetée

Une indication claire de l'action attendue est affichée sur la card de l'intervention (par exemple, « En attente de l'approbation du gestionnaire » ou "en attente des disponibilités du locataire/prestataire").

**Phase 1 : Demande**

- « Demande » → Soumis par le locataire
- Fournit des informations claires
- Possibilité de téléchargement Fichiers
- Possibilité d'ajouter des disponibilités

- Approuvé / Refusé → Par le gestionnaire
- En cas de refus : archivage avec motif et notification au locataire
- En cas d'approbation
    - Enrichissement de l'information et passage à la phase 2
    - Reste en statut approuvé en attendant l'enrichissement et assignation de la tache

---

**Phase 2 : Planification et exécution (le processus démarre ici pour les interventions créées par le gestionnaire)**

- Demande de devis (facultatif) :
- Prestataire sélectionné
- Heure souhaitée indiquée
- E-mail envoyé au prestataire
- Le prestataire a accès à une interface minimale via Magic Link
- Discussion interne sur le devis/budget (masquée pour le locataire)
- Devis validé
- Planification :
- Prestataire sélectionné (si aucun devis n'a été demandé)
- E-mail envoyé au prestataire (si aucun devis n'a été demandé)
- Le prestataire a accès à une interface minimale via Magic Link (si aucun devis n'a été demandé)
- Chat actif avec le locataire
- Collecte des disponibilités via Doodle
- Date limite fixée par le locataire et le prestataire ; le gestionnaire reçoit une notification.

- « Planifié » :
- Notifications la veille et 1 heure avant l'intervention
- « En cours » :
- Travaux marqués comme commencés

---

**Phase 3 : Clôture**

- « Terminé » : Le prestataire marque comme terminé et soumet :
- Photos
- Notes finales
- Facture (masquée au locataire)

- « Confirmé par le locataire »
    - Peut consulter les informations ajoutée par le prestataire (a part la facture) et valider l'execution, ou contester en ajoutant des fichiers et commentaires.

- « Finalisé par le gestionnaire » : Le gestionnaire vérifie tout et confirme la clôture
- OU « Annulé » à n'importe quelle étape, avec justification