"use client"

import { useRouter } from "next/navigation"
import { GestionnaireFAB } from "@/components/ui/fab"

export function GestionnaireFABWrapper() {
  const router = useRouter()
  return (
    <GestionnaireFAB
      onCreateIntervention={() => router.push('/gestionnaire/operations/nouvelle-intervention')}
      onCreateReminder={() => router.push('/gestionnaire/operations/nouveau-rappel')}
      onCreateContract={() => router.push('/gestionnaire/contrats/nouveau')}
      onCreateBuilding={() => router.push('/gestionnaire/biens/immeubles/nouveau')}
      onCreateLot={() => router.push('/gestionnaire/biens/lots/nouveau')}
      onCreateContact={() => router.push('/gestionnaire/contacts/nouveau')}
    />
  )
}
