import { Building, MapPin, Users, Check, Home, Building2, FileText, User, Wrench } from "lucide-react"
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
