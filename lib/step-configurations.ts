import { Building, MapPin, Users, Check, Home, Building2, FileText, User, Wrench } from "lucide-react"
import { StepConfig } from "@/components/ui/step-progress-header"

export const buildingSteps: StepConfig[] = [
  {
    icon: Building,
    label: "Informations",
    description: "Détails du bâtiment"
  },
  {
    icon: MapPin,
    label: "Lots",
    description: "Configuration des lots"
  },
  {
    icon: Users,
    label: "Contacts",
    description: "Assignation des contacts"
  },
  {
    icon: Check,
    label: "Confirmation",
    description: "Récapitulatif final"
  }
]

export const lotSteps: StepConfig[] = [
  {
    icon: Building2,
    label: "Bâtiment",
    description: "Association au bâtiment"
  },
  {
    icon: Home,
    label: "Lot",
    description: "Détails du lot"
  },
  {
    icon: Users,
    label: "Contacts",
    description: "Locataires et contacts"
  },
  {
    icon: Check,
    label: "Validation",
    description: "Finalisation"
  }
]

export const interventionSteps: StepConfig[] = [
  {
    icon: Home,
    label: "Bien",
    description: "Choisir le bien concerné"
  },
  {
    icon: FileText,
    label: "Demande",
    description: "Décrire le problème"
  },
  {
    icon: Users,
    label: "Contacts",
    description: "AssignationPlanification"
  },
  {
    icon: Check,
    label: "Confirmation",
    description: "Demande envoyée"
  }
]
