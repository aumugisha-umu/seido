/**
 * ❓ FAQ Data - SEIDO Landing Page
 *
 * Questions fréquentes pour rassurer les prospects
 * Utilisées dans la section FAQ avec accordion
 */

export interface FAQItem {
  id: number
  question: string
  answer: string
  category?: 'general' | 'pricing' | 'security' | 'technical'
}

export const faq: FAQItem[] = [
  {
    id: 1,
    question: "SEIDO est-il conforme au RGPD ?",
    answer: "SEIDO est conforme au RGPD à 100%, sous le cadre de l'Autorité de Protection des Données belge (APD). Toutes les données sont hébergées exclusivement en Europe, sur les serveurs Supabase à Frankfurt (Allemagne), et ne quittent jamais l'Union Européenne. Le chiffrement AES-256 protège chaque transmission et chaque fichier stocké. En tant que gestionnaire, vous gardez le contrôle total sur vos données : exportation complète en CSV, suppression sur demande, et accès à tout moment conformément aux articles 15 à 20 du RGPD. Les données de vos locataires et prestataires sont strictement cloisonnées par rôle — chacun ne voit que ce qui le concerne. Aucune donnée n'est partagée avec des tiers ni utilisée à des fins publicitaires. Notre DPO est joignable à privacy@seido-app.com pour toute demande relative à la vie privée. SEIDO respecte également les réglementations régionales belges (Bruxelles, Wallonie, Flandre) en matière de bail et d'indexation des loyers.",
    category: 'security'
  },
  {
    id: 2,
    question: "Puis-je importer mes données existantes ?",
    answer: "Absolument ! SEIDO supporte l'import CSV/Excel en un clic pour vos biens, lots et contacts. Notre équipe vous accompagne gratuitement pendant toute la phase de migration (généralement 1-2 heures). Nous proposons également une migration assistée pour les gestionnaires avec plus de 100 lots. Aucune perte de données, aucun temps d'arrêt.",
    category: 'technical'
  },
  {
    id: 3,
    question: "Combien de temps faut-il pour déployer SEIDO ?",
    answer: "Un gestionnaire configure SEIDO en 30 minutes : création du compte (2 minutes), ajout des biens via import CSV ou saisie manuelle (10 minutes), invitation de l'équipe et des prestataires par email (5 minutes), et activation des portails locataire et prestataire (3 minutes). La plupart des gestionnaires traitent leur première intervention dans les 24 heures suivant l'inscription. Contrairement aux ERP immobiliers classiques qui nécessitent des semaines de paramétrage, SEIDO est conçu pour être opérationnel le jour même. Pas besoin de formation complexe : l'interface est intuitive et chaque action est guidée. Notre support est disponible 7 jours sur 7 par email et chat pour vous accompagner. Pour les agences de plus de 100 lots, nous proposons un service de migration assistée gratuit avec l'abonnement annuel, incluant le nettoyage et la vérification de vos données existantes.",
    category: 'general'
  },
  {
    id: 4,
    question: "Que se passe-t-il si j'annule mon abonnement ?",
    answer: "Aucun engagement, aucune pénalité. Vous pouvez annuler à tout moment en 1 clic depuis votre compte. Vos données restent accessibles pendant 90 jours après l'annulation (période de grâce). Vous recevez un export complet de vos données au format CSV. Si vous changez d'avis, la réactivation est instantanée. Zéro friction.",
    category: 'pricing'
  },
  {
    id: 5,
    question: "SEIDO fonctionne-t-il sur mobile ?",
    answer: "Oui, parfaitement ! L'application est 100% responsive et optimisée pour iOS et Android. Vos prestataires et locataires peuvent tout faire depuis leur smartphone : créer une demande, ajouter des photos, suivre l'avancement, communiquer en temps réel. Pas besoin d'installer quoi que ce soit, tout fonctionne dans le navigateur web mobile.",
    category: 'technical'
  },
  {
    id: 6,
    question: "Proposez-vous une démo personnalisée ?",
    answer: "Oui ! Réservez une démo privée de 30 minutes avec notre équipe. Nous adaptons la présentation à votre situation : nombre de lots, types de biens, problématiques spécifiques. Vous verrez SEIDO en action avec des cas d'usage réels. Contactez-nous à demo@seido-app.com ou utilisez le calendrier sur notre page contact.",
    category: 'general'
  },
  {
    id: 7,
    question: "Y a-t-il des frais cachés ?",
    answer: "Zéro frais caché, zéro surprise. Le prix affiché est le prix final : 5 EUR par bien par mois, ou 50 EUR par bien par an (soit 2 mois offerts). Il n'y a pas de frais de setup, pas de frais par utilisateur, et pas de frais par intervention. Tous les modules sont inclus dès le départ : notifications push illimitées, stockage de documents illimité, portails locataire et prestataire, gestion des devis, planification des interventions, et support 7 jours sur 7. Pour les petits propriétaires avec 1 à 2 biens, SEIDO est entièrement gratuit à vie. L'essai gratuit d'un mois est disponible sans carte bancaire et sans engagement. Si vous décidez de ne pas continuer, vos données restent exportables pendant 90 jours. Nous croyons qu'un prix transparent renforce la confiance — c'est pourquoi nous affichons tout, sans astérisque ni conditions cachées.",
    category: 'pricing'
  },
  {
    id: 8,
    question: "Puis-je inviter mes prestataires et locataires gratuitement ?",
    answer: "Oui, complètement gratuit ! Invitez autant de prestataires et locataires que vous voulez, sans frais supplémentaires. Vous payez uniquement pour vos biens gérés. Vos prestataires et locataires créent leur compte gratuitement et accèdent uniquement aux interventions qui les concernent. Win-win.",
    category: 'pricing'
  },
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
  }
]

// Grouper les FAQ par catégorie pour affichage optionnel
export const faqByCategory = {
  general: faq.filter(f => f.category === 'general'),
  pricing: faq.filter(f => f.category === 'pricing'),
  security: faq.filter(f => f.category === 'security'),
  technical: faq.filter(f => f.category === 'technical')
}
