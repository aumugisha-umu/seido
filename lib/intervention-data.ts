export const PROBLEM_TYPES = [
  { value: "maintenance", label: "Maintenance générale" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "heating", label: "Chauffage" },
  { value: "locksmith", label: "Serrurerie" },
  { value: "painting", label: "Peinture" },
  { value: "other", label: "Autre" },
]

export const URGENCY_LEVELS = [
  {
    value: "low",
    label: "Bas - Quelques semaines à plusieurs mois",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "medium",
    label: "Moyenne - Dans la semaine",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "high",
    label: "Urgente - Dans les 24h",
    color: "bg-red-100 text-red-800",
  },
]
