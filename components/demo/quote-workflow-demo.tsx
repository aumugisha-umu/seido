"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, FileText, Users, Calendar } from "lucide-react"
import { useQuoteToast } from "@/hooks/use-quote-toast"

// Composant de démonstration du workflow complet des devis selon Design System SEIDO
export function QuoteWorkflowDemo() {
  const [currentStep, setCurrentStep] = useState(1)
  const quoteToast = useQuoteToast()

  const steps = [
    {
      id: 1,
      title: "Demande Approuvée",
      description: "Intervention approuvée par le gestionnaire",
      status: "completed",
      action: "Demander des devis"
    },
    {
      id: 2,
      title: "Demande de Devis",
      description: "Gestionnaire sollicite des prestataires",
      status: currentStep >= 2 ? "completed" : "pending",
      action: "Envoyer demandes"
    },
    {
      id: 3,
      title: "Soumission Devis",
      description: "Prestataires soumettent leurs propositions",
      status: currentStep >= 3 ? "completed" : "pending",
      action: "Soumettre devis"
    },
    {
      id: 4,
      title: "Validation",
      description: "Gestionnaire compare et valide un devis",
      status: currentStep >= 4 ? "completed" : "pending",
      action: "Approuver/Rejeter"
    },
    {
      id: 5,
      title: "Planification",
      description: "Intervention assignée et planifiée",
      status: currentStep >= 5 ? "completed" : "pending",
      action: "Planifier"
    }
  ]

  const handleStepAction = (stepId: number) => {
    switch (stepId) {
      case 2:
        quoteToast.quoteRequestSent(3, "Réparation plomberie urgente")
        setCurrentStep(3)
        break

      case 3:
        quoteToast.quoteSubmitted(380, "Réparation plomberie urgente")
        setCurrentStep(4)
        break

      case 4:
        quoteToast.quoteApproved("Plomberie Express", 380, "Réparation plomberie urgente")
        setTimeout(() => {
          quoteToast.quoteToPlanning("Réparation plomberie urgente", "Plomberie Express")
          setCurrentStep(5)
        }, 2000)
        break

      case 5:
        quoteToast.systemNotification(
          "Workflow terminé",
          "L'intervention est maintenant en phase de planification"
        )
        break

      default:
        break
    }
  }

  const resetDemo = () => {
    setCurrentStep(1)
    quoteToast.systemNotification(
      "Démonstration réinitialisée",
      "Vous pouvez recommencer le workflow"
    )
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 border-emerald-200 text-emerald-800"
      case "active":
        return "bg-sky-50 border-sky-200 text-sky-800"
      case "pending":
        return "bg-slate-50 border-slate-200 text-slate-600"
      default:
        return "bg-slate-50 border-slate-200 text-slate-600"
    }
  }

  const getStepIcon = (status: string, stepId: number) => {
    if (status === "completed") {
      return <CheckCircle className="w-5 h-5 text-emerald-600" />
    }

    switch (stepId) {
      case 1:
        return <CheckCircle className="w-5 h-5 text-slate-400" />
      case 2:
        return <Users className="w-5 h-5 text-slate-400" />
      case 3:
        return <FileText className="w-5 h-5 text-slate-400" />
      case 4:
        return <XCircle className="w-5 h-5 text-slate-400" />
      case 5:
        return <Calendar className="w-5 h-5 text-slate-400" />
      default:
        return <div className="w-5 h-5 bg-slate-300 rounded-full" />
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-slate-900">
          <FileText className="w-6 h-6 text-sky-600" />
          <span>Démonstration Workflow Devis - Design System SEIDO</span>
        </CardTitle>
        <p className="text-slate-600">
          Testez le workflow complet de gestion des devis avec toasts et notifications
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Intervention en cours */}
        <Card className="border-l-4 border-l-sky-500 bg-sky-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">INT-2025-001 - Réparation plomberie urgente</h4>
                <p className="text-sm text-slate-600">Bâtiment A • Lot 2B • Locataire: Marie Dupont</p>
              </div>
              <Badge className="bg-sky-100 text-sky-800 border-sky-200">
                En cours de traitement
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Steps du workflow */}
        <div className="space-y-4">
          {steps.map((step) => (
            <Card
              key={step.id}
              className={`transition-all duration-300 ${getStepColor(
                step.status === "pending" && currentStep === step.id ? "active" : step.status
              )}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step.status, step.id)}
                    <div>
                      <h4 className="font-medium text-sm">
                        Étape {step.id}: {step.title}
                      </h4>
                      <p className="text-xs text-slate-600">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {step.status === "completed" && (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                        Terminé
                      </Badge>
                    )}

                    {step.status === "pending" && currentStep === step.id && (
                      <Button
                        size="sm"
                        onClick={() => handleStepAction(step.id)}
                        className="bg-sky-600 hover:bg-sky-700 text-white"
                      >
                        {step.action}
                      </Button>
                    )}

                    {step.status === "pending" && currentStep !== step.id && (
                      <Badge variant="outline" className="text-xs">
                        En attente
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions de démonstration */}
        <div className="flex justify-center space-x-4 pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={resetDemo}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Réinitialiser Demo
          </Button>

          <Button
            onClick={() => quoteToast.systemNotification(
              "Notification test",
              "Ceci est un test des notifications selon le Design System SEIDO",
              "info"
            )}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            Tester Notification
          </Button>
        </div>

        {/* Légende */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h5 className="font-medium text-slate-900 mb-2">Fonctionnalités testées :</h5>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>✅ Dashboard Prestataire avec section Demandes de Devis</li>
            <li>✅ QuoteSubmissionForm optimisé avec validation temps réel</li>
            <li>✅ IntegratedQuotesCard avec actions approve/reject</li>
            <li>✅ QuoteValidationModal avec confirmation</li>
            <li>✅ Notifications temps réel pour tous les acteurs</li>
            <li>✅ Toast Success/Error avec Design System SEIDO</li>
            <li>✅ Couleurs cohérentes : sky (primary), emerald (success), amber (warning), red (error)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
