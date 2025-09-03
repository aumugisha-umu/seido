"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { X, Building2 } from "lucide-react"

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (contactData: ContactFormData) => void
  defaultType?: string
}

interface ContactFormData {
  type: string
  name: string
  email: string
  phone: string
  address: string
  notes: string
}

const contactTypes = [
  { value: "locataire", label: "Locataire" },
  { value: "prestataire", label: "Prestataire" },
  { value: "syndic", label: "Syndic" },
  { value: "notaire", label: "Notaire" },
  { value: "assurance", label: "Assurance" },
  { value: "autre", label: "Autre" },
]

const getContactTitle = (type: string) => {
  switch (type) {
    case "locataire":
      return { title: "Créer un locataire", subtitle: "Personne qui occupe le logement" }
    case "prestataire":
      return { title: "Créer un prestataire", subtitle: "Entreprise ou artisan pour les interventions" }
    case "syndic":
      return { title: "Créer un syndic", subtitle: "Gestionnaire de la copropriété" }
    case "notaire":
      return { title: "Créer un notaire", subtitle: "Professionnel du droit immobilier" }
    case "assurance":
      return { title: "Créer une assurance", subtitle: "Compagnie d'assurance du bien" }
    default:
      return { title: "Créer un contact", subtitle: "Nouveau contact pour votre bien" }
  }
}

const ContactFormModal = ({ isOpen, onClose, onSubmit, defaultType = "locataire" }: ContactFormModalProps) => {
  const [formData, setFormData] = useState<ContactFormData>({
    type: defaultType,
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    onSubmit(formData)

    // Reset form
    setFormData({
      type: defaultType,
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    })

    onClose()
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      type: defaultType,
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    })
    onClose()
  }

  const { title, subtitle } = getContactTitle(formData.type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-gray-900">{title}</DialogTitle>
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              </div>
            </div>
            
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium text-gray-700">
              Type de contact <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contactTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Nom complet <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Nom et prénom ou raison sociale"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="06 12 34 56 78"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full"
            />
          </div>

          

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
              Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="Notes et remarques"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full min-h-[80px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} className="px-6 bg-transparent">
              Annuler
            </Button>
            <Button
              type="submit"
              className="px-6 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!formData.name.trim()}
            >
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { ContactFormModal }
export default ContactFormModal
