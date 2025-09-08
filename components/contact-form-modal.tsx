"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Building2, Mail } from "lucide-react"

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (contactData: ContactFormData) => void
  defaultType?: string
}

interface ContactFormData {
  type: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  speciality?: string
  notes: string
  inviteToApp: boolean
}

const contactTypes = [
  { value: "locataire", label: "Locataire" },
  { value: "prestataire", label: "Prestataire" },
  { value: "syndic", label: "Syndic" },
  { value: "notaire", label: "Notaire" },
  { value: "assurance", label: "Assurance" },
  { value: "gestionnaire", label: "Gestionnaire" },
  { value: "autre", label: "Autre" },
]

const specialityTypes = [
  { value: "plomberie", label: "Plomberie" },
  { value: "electricite", label: "Électricité" },
  { value: "chauffage", label: "Chauffage" },
  { value: "serrurerie", label: "Serrurerie" },
  { value: "peinture", label: "Peinture" },
  { value: "menage", label: "Ménage" },
  { value: "jardinage", label: "Jardinage" },
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
    case "gestionnaire":
      return { title: "Créer un gestionnaire", subtitle: "Responsable de la gestion des biens" }
    default:
      return { title: "Créer un contact", subtitle: "Nouveau contact pour votre bien" }
  }
}

const ContactFormModal = ({ isOpen, onClose, onSubmit, defaultType = "locataire" }: ContactFormModalProps) => {
  // Types de contacts qui doivent avoir la checkbox cochée par défaut
  const shouldInviteByDefault = (type: string) => {
    return ['gestionnaire', 'locataire', 'prestataire'].includes(type)
  }

  const [formData, setFormData] = useState<ContactFormData>({
    type: defaultType,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    speciality: "",
    notes: "",
    inviteToApp: shouldInviteByDefault(defaultType),
  })

  // Mettre à jour la checkbox quand le type change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      inviteToApp: shouldInviteByDefault(prev.type)
    }))
  }, [formData.type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation des champs requis
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      console.error('❌ Prénom et nom sont requis')
      return
    }
    
    if (!formData.email.trim()) {
      console.error('❌ Email est requis')
      return
    }
    
    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email.trim())) {
      console.error('❌ Format d\'email invalide')
      return
    }

    onSubmit(formData)

    // Reset form
    setFormData({
      type: defaultType,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      speciality: "",
      notes: "",
      inviteToApp: shouldInviteByDefault(defaultType),
    })

    onClose()
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      type: defaultType,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      speciality: "",
      notes: "",
      inviteToApp: shouldInviteByDefault(defaultType),
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
          <div className={formData.type === "prestataire" ? "grid grid-cols-2 gap-4" : "space-y-2"}>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium text-gray-700">
                Type de contact <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="w-full">
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

            {/* Champ Spécialité - À côté du type quand c'est un prestataire */}
            {formData.type === "prestataire" && (
              <div className="space-y-2">
                <Label htmlFor="speciality" className="text-sm font-medium text-gray-700">
                  Spécialité
                </Label>
                <Select 
                  value={formData.speciality || ""} 
                  onValueChange={(value) => setFormData({ ...formData, speciality: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une spécialité" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialityTypes.map((speciality) => (
                      <SelectItem key={speciality.value} value={speciality.value}>
                        {speciality.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Jean"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Dupont"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
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

          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Checkbox 
              id="inviteToApp" 
              checked={formData.inviteToApp}
              onCheckedChange={(checked) => setFormData({ ...formData, inviteToApp: !!checked })}
            />
            <div className="flex-1">
              <Label htmlFor="inviteToApp" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                Inviter ce contact à rejoindre l'application
              </Label>
              <p className="text-xs text-gray-500 mt-1">
                Un email d'invitation sera envoyé pour qu'il puisse accéder à ses informations et interventions
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel} className="px-6 bg-transparent">
              Annuler
            </Button>
            <Button
              type="submit"
              className="px-6 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={
                !formData.firstName.trim() || 
                !formData.lastName.trim() || 
                !formData.email.trim() ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
              }
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
