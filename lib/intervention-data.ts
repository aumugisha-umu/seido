export const PROBLEM_TYPES = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
  { value: "autre", label: "Autre" },
]

export const URGENCY_LEVELS = [
  {
    value: "basse",
    label: "Basse - Quelques semaines à plusieurs mois",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "normale",
    label: "Normale - Dans la semaine",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "haute",
    label: "Haute - Dans les 24h",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "urgente",
    label: "Urgente - Immédiatement",
    color: "bg-red-100 text-red-800",
  },
]
