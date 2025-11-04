"use client"

import { Wrench, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface InterventionsEmptyStateProps {
  title?: string
  description?: string
  showCreateButton?: boolean
  createButtonText?: string
  createButtonAction?: () => void
}

export function InterventionsEmptyState({
  title = "Aucune intervention",
  description = "Créez votre première intervention pour commencer",
  showCreateButton = true,
  createButtonText = "Créer une intervention",
  createButtonAction
}: InterventionsEmptyStateProps) {
  const router = useRouter()
  
  const handleClick = () => {
    if (createButtonAction) {
      createButtonAction()
    } else {
      router.push("/gestionnaire/interventions/nouvelle-intervention")
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {title}
        </h3>
        <p className="text-slate-500 mb-6">
          {description}
        </p>
        {showCreateButton && (
          <div className="flex justify-center">
            <Button onClick={handleClick} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              {createButtonText}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

