export type UserRole = "admin" | "gestionnaire" | "prestataire" | "locataire"

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  gestionnaire: "Gestionnaire", 
  prestataire: "Prestataire",
  locataire: "Locataire",
}
