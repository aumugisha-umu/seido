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
    answer: "Oui, à 100%. Toutes vos données sont hébergées en Europe (Supabase Frankfurt, Allemagne) et ne quittent jamais l'Union Européenne. Nous utilisons un chiffrement AES-256 pour la transmission et le stockage. Vous gardez le contrôle total : exportation, suppression et accès à vos données à tout moment. Notre DPO est disponible pour toute question à privacy@seido.pm.",
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
    answer: "Setup initial en 30 minutes chrono ! Créez votre compte (2 min), ajoutez vos biens (10 min), invitez vos équipes (5 min), et vous êtes prêt. La plupart de nos clients traitent leur première intervention dans les 24h. Pas besoin de formation complexe, l'interface est intuitive. Et notre support est disponible 7j/7 pour vous aider.",
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
    answer: "Oui ! Réservez une démo privée de 30 minutes avec notre équipe. Nous adaptons la présentation à votre situation : nombre de lots, types de biens, problématiques spécifiques. Vous verrez SEIDO en action avec des cas d'usage réels. Contactez-nous à demo@seido.pm ou utilisez le calendrier sur notre page contact.",
    category: 'general'
  },
  {
    id: 7,
    question: "Y a-t-il des frais cachés ?",
    answer: "Zéro frais caché. Le prix affiché est le prix final : 5€/bien/mois ou 50€/bien/an. Pas de frais de setup, pas de frais par utilisateur, pas de frais par intervention. Tous les modules sont inclus : notifications illimitées, stockage illimité, support 7j/7. L'essai gratuit de 14 jours ne demande même pas de carte bancaire.",
    category: 'pricing'
  },
  {
    id: 8,
    question: "Puis-je inviter mes prestataires et locataires gratuitement ?",
    answer: "Oui, complètement gratuit ! Invitez autant de prestataires et locataires que vous voulez, sans frais supplémentaires. Vous payez uniquement pour vos biens gérés. Vos prestataires et locataires créent leur compte gratuitement et accèdent uniquement aux interventions qui les concernent. Win-win.",
    category: 'pricing'
  }
]

// Grouper les FAQ par catégorie pour affichage optionnel
export const faqByCategory = {
  general: faq.filter(f => f.category === 'general'),
  pricing: faq.filter(f => f.category === 'pricing'),
  security: faq.filter(f => f.category === 'security'),
  technical: faq.filter(f => f.category === 'technical')
}
