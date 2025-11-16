/**
 * 💬 Testimonials Data - SEIDO Landing Page
 *
 * Témoignages clients pour social proof
 * Utilisés dans la section testimonials avec carousel
 */

export interface Testimonial {
  id: number
  quote: string
  author: string
  role: string
  company: string
  rating: number
  avatar?: string
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    quote: "SEIDO nous a fait gagner 40% de temps sur la gestion des interventions. Plus besoin de jongler entre 10 outils différents. Tout est centralisé, les locataires sont plus satisfaits et notre équipe est plus productive. Un must-have pour tout gestionnaire sérieux !",
    author: "Sophie Dubois",
    role: "Gestionnaire Immobilière",
    company: "Immobilière du Centre - Bruxelles",
    rating: 5
  },
  {
    id: 2,
    quote: "En tant que prestataire, je reçois les demandes directement dans l'app, je peux consulter l'historique complet et communiquer en temps réel. Plus de SMS perdus, plus d'appels manqués. Mon planning est optimisé et mes clients sont contents. SEIDO a simplifié ma vie professionnelle.",
    author: "Marc Lejeune",
    role: "Plombier Indépendant",
    company: "Lejeune Plomberie - Liège",
    rating: 5
  },
  {
    id: 3,
    quote: "Avant SEIDO, je devais appeler 3 fois pour savoir où en était ma demande. Maintenant je vois tout en temps réel sur mon téléphone. Je sais quand le technicien passe, je peux lui poser des questions directement. C'est rassurant et professionnel. Enfin une vraie transparence !",
    author: "Laura Martinez",
    role: "Locataire",
    company: "Résidence Les Érables - Namur",
    rating: 5
  },
  {
    id: 4,
    quote: "Nous gérons 280 lots avec SEIDO. L'économie de temps est colossale : 1h30 par intervention en moyenne. Sur un mois, ça représente des dizaines d'heures récupérées. Et nos locataires apprécient la transparence. Le ROI est évident, je recommande sans hésitation.",
    author: "Jean-François Renard",
    role: "Directeur",
    company: "Gestion Plus - Charleroi",
    rating: 5
  },
  {
    id: 5,
    quote: "Le système de notifications intelligentes est un game-changer. Plus besoin de relancer manuellement les prestataires ou les locataires. SEIDO le fait automatiquement. J'ai divisé mon stress par deux et je peux enfin me concentrer sur la stratégie plutôt que l'opérationnel.",
    author: "Émilie Dubois",
    role: "Gestionnaire de Patrimoine",
    company: "Patrimoine Invest - Mons",
    rating: 5
  }
]

export const companiesLogos = [
  // Liste des logos partenaires/clients à afficher en grayscale
  // À compléter avec les vrais logos quand disponibles
  { name: "Immobilière du Centre", logo: "/images/partners/placeholder-1.svg" },
  { name: "Gestion Plus", logo: "/images/partners/placeholder-2.svg" },
  { name: "Patrimoine Invest", logo: "/images/partners/placeholder-3.svg" },
  { name: "Lejeune Plomberie", logo: "/images/partners/placeholder-4.svg" },
  { name: "Résidence Les Érables", logo: "/images/partners/placeholder-5.svg" },
  { name: "Partenaire 6", logo: "/images/partners/placeholder-6.svg" }
]
