"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Users, Search, Mail, Phone, MapPin, Edit, UserPlus, Send, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { ContactFormModal } from "@/components/contact-form-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { useAuth } from "@/hooks/use-auth"
import { contactService, teamService } from "@/lib/database-service"

export default function ContactsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [filteredContacts, setFilteredContacts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userTeam, setUserTeam] = useState<any>(null)

  // Récupérer les contacts au montage du composant
  useEffect(() => {
    if (user?.id) {
      loadContacts()
    }
  }, [user?.id])

  // Filtrer les contacts selon le terme de recherche
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredContacts(contacts)
    } else {
      const filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.speciality?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredContacts(filtered)
    }
  }, [contacts, searchTerm])

  const loadContacts = async () => {
    if (!user?.id) {
      setError("Utilisateur non connecté")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log("📞 Loading contacts for user:", user.id)
      
      // 1. Récupérer l'équipe de l'utilisateur
      const userTeams = await teamService.getUserTeams(user.id)
      if (!userTeams || userTeams.length === 0) {
        console.log("⚠️ No team found for user")
        setContacts([])
        setFilteredContacts([])
        setLoading(false)
        return
      }
      
      const team = userTeams[0]
      setUserTeam(team)
      console.log("🏢 Found team:", team.id, team.name)
      
      // 2. Récupérer les contacts de l'équipe
      const teamContacts = await contactService.getTeamContacts(team.id)
      console.log("✅ Contacts loaded:", teamContacts.length)
      
      setContacts(teamContacts)
      setFilteredContacts(teamContacts)
      
    } catch (error) {
      console.error("❌ Error loading contacts:", error)
      setError("Erreur lors du chargement des contacts")
    } finally {
      setLoading(false)
    }
  }

  const handleContactSubmit = async (contactData: any) => {
    try {
      console.log("📞 Creating contact:", contactData)
      
      // Ajouter le team_id au contact
      const contactWithTeam = {
        ...contactData,
        team_id: userTeam?.id
      }
      
      const newContact = await contactService.create(contactWithTeam)
      console.log("✅ Contact created:", newContact)
      
      // Recharger la liste des contacts
      await loadContacts()
      setIsContactModalOpen(false)
      
    } catch (error) {
      console.error("❌ Error creating contact:", error)
      setError("Erreur lors de la création du contact")
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    try {
      console.log("🗑️ Deleting contact:", contactId)
      await contactService.delete(contactId)
      
      // Recharger la liste des contacts
      await loadContacts()
      
    } catch (error) {
      console.error("❌ Error deleting contact:", error)
      setError("Erreur lors de la suppression du contact")
    }
  }

  const getSpecialityLabel = (speciality: string) => {
    const specialities = {
      'plomberie': 'Plomberie',
      'electricite': 'Électricité',
      'chauffage': 'Chauffage',
      'serrurerie': 'Serrurerie',
      'peinture': 'Peinture',
      'menage': 'Ménage',
      'jardinage': 'Jardinage',
      'autre': 'Autre'
    }
    return specialities[speciality as keyof typeof specialities] || speciality
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
                onClick={() => router.push("/gestionnaire/dashboard")}
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
                <Input 
                  placeholder="Rechercher un contact par nom, email, téléphone..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">Filtrer par type</Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Contacts List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Contacts ({loading ? '...' : filteredContacts.length})</span>
              {userTeam && (
                <Badge variant="outline" className="ml-2">
                  Équipe : {userTeam.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {contacts.length === 0 ? "Aucun contact" : "Aucun contact trouvé"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {contacts.length === 0 
                    ? "Commencez par ajouter vos premiers contacts."
                    : "Essayez de modifier votre recherche."}
                </p>
                {contacts.length === 0 && (
                  <Button onClick={() => setIsContactModalOpen(true)} className="mt-2">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Ajouter un contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-lg">
                          {contact.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-medium text-gray-900">{contact.name}</h3>
                          {contact.company && (
                            <Badge variant="secondary" className="bg-gray-100 text-gray-800 text-xs">
                              {contact.company}
                            </Badge>
                          )}
                          {contact.speciality && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                              {getSpecialityLabel(contact.speciality)}
                            </Badge>
                          )}
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
                        {contact.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            <span>{contact.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Contacter
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-600 hover:text-gray-700"
                        onClick={() => {
                          // TODO: Implémenter la modification
                          console.log('Modifier contact:', contact.id)
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <DeleteConfirmModal
                        onConfirm={() => handleDeleteContact(contact.id)}
                        itemName={contact.name}
                        itemType="le contact"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
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