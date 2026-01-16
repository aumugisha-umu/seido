import { Building, MapPin, Users, Check, Home, Building2, FileText, CheckCircle, User, Paperclip, CalendarCheck } from "lucide-react"
import { StepConfig } from "@/components/ui/step-progress-header"

export const buildingSteps: StepConfig[] = [
  {
    icon: Building,
    label: "Informations générales"
  },
  {
    icon: MapPin,
    label: "Lots"
  },
  {
    icon: Users,
    label: "Contacts"
  },
  {
    icon: Check,
    label: "Confirmation"
  }
]

export const lotSteps: StepConfig[] = [
  {
    icon: Building2,
    label: "Immeuble "
  },
  {
    icon: Home,
    label: "Lot"
  },
  {
    icon: Users,
    label: "Contacts"
  },
  {
    icon: Check,
    label: "Confirmation"
  }
]

export const interventionSteps: StepConfig[] = [
  {
    icon: Home,
    label: "Bien"
  },
  {
    icon: FileText,
    label: "Demande",
  },
  {
    icon: Users,
    label: "Contacts"
  },
  {
    icon: Check,
    label: "Confirmation"
  }
]

// Steps pour la création d'intervention par le locataire
export const tenantInterventionSteps: StepConfig[] = [
  {
    icon: Home,
    label: "Logement"
  },
  {
    icon: FileText,
    label: "Demande"
  },
  {
    icon: CheckCircle,
    label: "Confirmation"
  }
]

// Steps pour la création de contact
export const contactSteps: StepConfig[] = [
  {
    icon: User,
    label: "Type"
  },
  {
    icon: Building2,
    label: "Société"
  },
  {
    icon: Users,
    label: "Contact"
  },
  {
    icon: Check,
    label: "Confirmation"
  }
]

// Steps pour la création de contrat/bail (5 étapes - ajout Interventions)
export const contractSteps: StepConfig[] = [
  {
    icon: Home,
    label: "Lot"
  },
  {
    icon: FileText,
    label: "Détails et contacts"
  },
  {
    icon: Paperclip,
    label: "Documents"
  },
  {
    icon: CalendarCheck,
    label: "Interventions"
  },
  {
    icon: Check,
    label: "Confirmation"
  }
]
