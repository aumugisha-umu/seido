"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Building2, Users, Search, Mail, Phone, MapPin, Edit, UserPlus, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"

export default function ContactsPage() {
  const router = useRouter()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  const contacts: any[] = []

  const handleContactSubmit = (contactData: any) => {
    console.log("[v0] Contact created:", contactData)
    setIsContactModalOpen(false)
  }

  const handleDeleteContact = (contactId: number) => {
    console.log("[v0] Deleting contact:", contactId)
    // Ici on ajouterait la logique de suppression
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard/gestionnaire")}
                className="flex items-center space-x-2"
              >
                <Building2 className="h-5 w-5" />
                <span>← Retour au dashboard</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Contacts</h1>
              <p className="text-gray-600">Gérez vos locataires, prestataires et autres contacts</p>
            </div>
            <Button onClick={() => setIsContactModalOpen(true)} className="flex items-center space-x-2">
              <UserPlus className="h-4 w-4" />
              <span>Nouveau contact</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Rechercher un contact par nom, email, téléphone..." className="pl-10" />
              </div>
              <Button variant="outline">Filtrer par type</Button>
            </div>
          </CardContent>
        </Card>

        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Contacts ({contacts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-lg">
                        {contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-medium text-gray-900">{contact.name}</h3>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                          {contact.type}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span>{contact.email}</span>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                      {contact.address && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{contact.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" className="flex items-center space-x-1 bg-transparent">
                      <Edit className="h-3 w-3" />
                      <span>Modifier</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center space-x-1 bg-transparent">
                      <Send className="h-3 w-3" />
                      <span>Inviter</span>
                    </Button>
                    <DeleteConfirmModal
                      itemName={contact.name}
                      itemType="le contact"
                      onConfirm={() => handleDeleteContact(contact.id)}
                    />
                  </div>
                </div>
              ))}

              {contacts.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contact</h3>
                  <p className="text-gray-600 mb-4">Commencez par ajouter votre premier contact</p>
                  <Button onClick={() => setIsContactModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un contact
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSubmit={handleContactSubmit}
        defaultType="locataire"
      />
    </div>
  )
}
