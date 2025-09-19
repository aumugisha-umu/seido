"use client"

import { useState } from "react"
import { Plus, X, Mail, User, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ExternalQuoteRequestModalProps {
  isOpen: boolean
  onClose: () => void
  intervention: any | null
  onSubmit: (data: {
    providerEmails: string[]
    deadline: string
    additionalNotes: string
    individualMessages: Record<string, string>
  }) => void
  isLoading: boolean
  error: string | null
}

export const ExternalQuoteRequestModal = ({
  isOpen,
  onClose,
  intervention,
  onSubmit,
  isLoading,
  error
}: ExternalQuoteRequestModalProps) => {
  const [providerEmails, setProviderEmails] = useState<string[]>([''])
  const [deadline, setDeadline] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [individualMessages, setIndividualMessages] = useState<Record<string, string>>({})

  // Set default deadline (7 days from now)
  useState(() => {
    if (!deadline) {
      const defaultDeadline = new Date()
      defaultDeadline.setDate(defaultDeadline.getDate() + 7)
      setDeadline(defaultDeadline.toISOString().split('T')[0])
    }
  })

  const addEmailField = () => {
    setProviderEmails([...providerEmails, ''])
  }

  const removeEmailField = (index: number) => {
    const newEmails = providerEmails.filter((_, i) => i !== index)
    setProviderEmails(newEmails)

    // Remove individual message for removed email
    const email = providerEmails[index]
    if (email && individualMessages[email]) {
      const newMessages = { ...individualMessages }
      delete newMessages[email]
      setIndividualMessages(newMessages)
    }
  }

  const updateEmail = (index: number, email: string) => {
    const newEmails = [...providerEmails]
    const oldEmail = newEmails[index]
    newEmails[index] = email
    setProviderEmails(newEmails)

    // Update individual message key if email changed
    if (oldEmail && oldEmail !== email && individualMessages[oldEmail]) {
      const newMessages = { ...individualMessages }
      newMessages[email] = newMessages[oldEmail]
      delete newMessages[oldEmail]
      setIndividualMessages(newMessages)
    }
  }

  const updateIndividualMessage = (email: string, message: string) => {
    setIndividualMessages({
      ...individualMessages,
      [email]: message
    })
  }

  const handleSubmit = () => {
    const validEmails = providerEmails.filter(email =>
      email.trim() && email.includes('@')
    )

    if (validEmails.length === 0) {
      return
    }

    onSubmit({
      providerEmails: validEmails,
      deadline,
      additionalNotes,
      individualMessages
    })
  }

  const validEmails = providerEmails.filter(email =>
    email.trim() && email.includes('@')
  )

  if (!intervention) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-slate-900">
            Inviter des prestataires externes
          </DialogTitle>
          <p className="text-slate-600">
            Invitez des prestataires qui n'ont pas encore de compte en envoyant des liens d'accès sécurisés
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Résumé de l'intervention */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-2">
              {intervention.title}
            </h3>
            <p className="text-sm text-slate-600">{intervention.description}</p>
          </div>

          {/* Adresses email des prestataires */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-900">
                Adresses email des prestataires
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {providerEmails.map((email, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      placeholder="prestataire@exemple.com"
                      className="w-full"
                    />
                  </div>
                  {providerEmails.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmailField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Configuration générale */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date limite */}
            <div className="space-y-3">
              <Label htmlFor="deadline" className="text-sm font-medium text-slate-900">
                Date limite pour le devis
              </Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Nombre de prestataires valides */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-slate-900">
                Prestataires sélectionnés
              </Label>
              <div className="flex items-center gap-2 text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">
                <Mail className="h-4 w-4" />
                <span>{validEmails.length} adresse(s) email valide(s)</span>
              </div>
            </div>
          </div>

          {/* Instructions générales */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-900">
              Instructions générales
            </Label>
            <Textarea
              id="notes"
              placeholder="Instructions communes à tous les prestataires..."
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-slate-500">
              Ces informations seront envoyées à tous les prestataires
            </p>
          </div>

          {/* Messages individualisés */}
          {validEmails.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-slate-900">
                Messages individualisés (optionnel)
              </Label>
              <p className="text-xs text-slate-500 -mt-2">
                Personnalisez le message pour chaque prestataire
              </p>

              <div className="space-y-4">
                {validEmails.map((email) => (
                  <Card key={email}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-4 w-4 text-slate-500" />
                        <span className="font-medium text-sm">{email}</span>
                      </div>
                      <Textarea
                        value={individualMessages[email] || additionalNotes}
                        onChange={(e) => updateIndividualMessage(email, e.target.value)}
                        placeholder={`Message spécifique pour ${email}...`}
                        rows={3}
                        className="resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Informations importantes */}
          <Alert>
            <MessageSquare className="h-4 w-4" />
            <AlertDescription>
              <strong>Comment ça fonctionne :</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Chaque prestataire recevra un email avec un lien sécurisé</li>
                <li>Le lien permet d'accéder aux détails de l'intervention sans compte</li>
                <li>Pour soumettre un devis, ils devront créer un compte</li>
                <li>Les liens expirent automatiquement après 7 jours</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={validEmails.length === 0 || isLoading}
            className="min-w-[160px]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Envoi...</span>
              </div>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer {validEmails.length} invitation(s)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}