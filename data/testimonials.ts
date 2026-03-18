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
    quote: "On traitait 15 interventions/jour à la main. Avec SEIDO, c'est 15 minutes le matin et c'est bouclé.",
    author: "Sophie D.",
    role: "Gestionnaire, 120 lots",
    company: "Agence Dubois Immobilier",
    rating: 5
  },
  {
    id: 2,
    quote: "Je vois l'adresse, le problème, les photos. Je propose un créneau direct au locataire. Plus besoin d'appeler le gestionnaire.",
    author: "Marc L.",
    role: "Plombier indépendant",
    company: "ML Plomberie",
    rating: 5
  },
  {
    id: 3,
    quote: "Avant j'appelais 3 fois pour savoir où en était ma fuite. Maintenant je suis le statut comme un colis.",
    author: "Laura M.",
    role: "Locataire",
    company: "Résidence Les Érables",
    rating: 5
  },
  {
    id: 4,
    quote: "280 lots, 2 collaborateurs. Avant SEIDO, on était débordés. Aujourd'hui on envisage de prendre 50 lots de plus.",
    author: "Jean-François R.",
    role: "Directeur d'agence",
    company: "Patrimoine & Gestion",
    rating: 5
  },
  {
    id: 5,
    quote: "Le dimanche, seules les vraies urgences passent. Mon week-end est redevenu un week-end.",
    author: "Émilie D.",
    role: "Gestionnaire indépendante",
    company: "ED Gestion",
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
