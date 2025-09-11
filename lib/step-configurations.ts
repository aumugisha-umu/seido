import { Building, MapPin, Users, Check, Home, Building2, FileText, User, Wrench } from "lucide-react"
import { StepConfig } from "@/components/ui/step-progress-header"

export const buildingSteps: StepConfig[] = [
  {
    icon: Building,
    label: "Informations générales",
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
    description: "Récapitulatif"
  }
]

export const lotSteps: StepConfig[] = [
  {
    icon: Building2,
    label: "Bâtiment",
    description: "Association à un bâtiment"
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
    label: "Confirmation",
    description: "Récapitulatif"
  }
]

export const interventionSteps: StepConfig[] = [
  {
    icon: Home,
    label: "Bien",
    description: "Choix du bien concerné"
  },
  {
    icon: FileText,
    label: "Demande",
    description: "Déscription du problème"
  },
  {
    icon: Users,
    label: "Contacts",
    description: "Assignation et Planification"
  },
  {
    icon: Check,
    label: "Confirmation",
    description: "Récapitulatif"
  }
]
