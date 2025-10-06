"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Users, Search, Mail, Phone, MapPin, Edit, UserPlus, Send, AlertCircle } from "lucide-react"
import { contactService, determineAssignmentType } from "@/lib/database-service"
import { ContactFormModal } from "@/components/contact-form-modal"
import { DeleteConfirmModal } from "@/components/delete-confirm-modal"
import { logger, logError } from '@/lib/logger'

interface LotContactsListProps {
  lotId: string
  buildingId?: string
  contacts?: unknown[]
  onContactsUpdate?: (contacts: unknown[]) => void
}

export const LotContactsList = ({ _lotId, buildingId, contacts: propContacts = [], onContactsUpdate }: LotContactsListProps) => {
  const [contacts, setContacts] = useState<unknown[]>(propContacts)
  const [filteredContacts, setFilteredContacts] = useState<unknown[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<any>(null)
  const [deleteContact, setDeleteContact] = useState<any>(null)

  // Helper function to check if ID looks like a UUID
  const isValidUUID = (_id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }

  // Update local contacts when props change
  useEffect(() => {
    console.log("🔄 LotContactsList contacts updated:", propContacts.length)
    setContacts(propContacts)
    setFilteredContacts(propContacts)
  }, [propContacts])

  // Separate useCallback to prevent infinite loops
  const loadLotContacts = useCallback(async () => {
    if (!_lotId) return
    
    const timeoutId = setTimeout(() => {
      console.warn("⏰ Request timeout for lot contacts")
      setError("Temps d'attente dépassé lors du chargement des contacts")
      setLoading(false)
    }, 10000) // 10 seconds timeout
    
    try {
      setLoading(true)
      setError(null)
      console.log("📞 Loading contacts for lot:", _lotId)
      
      // Adapter pour nouvelle architecture - récupérer les locataires pour ce lot
      const lotContacts = await contactService.getLotContactsByType(_lotId, 'tenant')
      console.log("✅ Lot contacts loaded:", lotContacts?.length || 0)
      
      clearTimeout(timeoutId)
      setContacts(lotContacts || [])
      setFilteredContacts(lotContacts || [])
      
    } catch (error) {
      console.error("❌ Error loading lot contacts:", error)
      clearTimeout(timeoutId)
      
      // Gestion plus fine des erreurs
      if (error instanceof Error) {
        if (error.message.includes('building_contacts')) {
          setError("Aucun contact n'est encore associé à ce lot. Les contacts doivent d'abord être associés au bâtiment.")
        } else if (error.message.includes('Not Found')) {
          setError("Lot non trouvé. Vérifiez que le lot existe.")
        } else {
          setError("Erreur lors du chargement des contacts: " + error.message)
        }
      } else {
        setError("Erreur inconnue lors du chargement des contacts")
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [lotId])

  // Filter contacts based on search term
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


  const handleContactSubmit = async (_contactData: unknown) => {
    try {
      if (selectedContact) {
        // Update existing contact
        await contactService.update(selectedContact.id, contactData)
        console.log("✅ Contact updated")
      } else {
        // Create new contact
        await contactService.create({
          ...contactData,
          team_id: contacts[0]?.team?.id // Use the same team as other contacts
        })
        console.log("✅ Contact created")
      }
      
      // Reload contacts
      if (onContactsUpdate) {
        // If parent provides update callback, reload contacts at parent level
        const updatedContacts = await contactService.getLotContacts(_lotId)
        onContactsUpdate(updatedContacts || [])
      } else {
        // Fallback to local loading
        await loadLotContacts()
      }
      
      setIsContactModalOpen(false)
      setSelectedContact(null)
      
    } catch (error) {
      console.error("❌ Error saving contact:", error)
      setError("Erreur lors de la sauvegarde du contact")
    }
  }

  const handleDeleteContact = async () => {
    if (!deleteContact) return
    
    try {
      await contactService.delete(deleteContact.id)
      
      // Reload contacts
      if (onContactsUpdate) {
        // If parent provides update callback, reload contacts at parent level
        const updatedContacts = await contactService.getLotContacts(_lotId)
        onContactsUpdate(updatedContacts || [])
      } else {
        // Fallback to local loading
        await loadLotContacts()
      }
      
      setDeleteContact(null)
      console.log("✅ Contact deleted")
    } catch (error) {
      console.error("❌ Error deleting contact:", error)
      setError("Erreur lors de la suppression du contact")
    }
  }

  const getContactTypeLabel = (_type: string) => {
    const labels: { [key: string]: string } = {
      tenant: "Locataire",
      owner: "Propriétaire", 
      provider: "Prestataire",
      manager: "Gestionnaire",
      syndic: "Syndic",
      notary: "Notaire",
      insurance: "Assurance",
      other: "Autre"
    }
    return labels[type] || type
  }

  const getSpecialityLabel = (_speciality: string) => {
    const labels: { [key: string]: string } = {
      plumbing: "Plomberie",
      electricity: "Électricité",
      heating: "Chauffage",
      painting: "Peinture",
      cleaning: "Ménage",
      maintenance: "Maintenance",
      security: "Sécurité",
      other: "Autre"
    }
    return labels[speciality] || speciality
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>Contacts du lot</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>Contacts du lot</span>
              <Badge variant="secondary">{contacts.length}</Badge>
            </div>
            <Button 
              onClick={() => {
                setSelectedContact(null)
                setIsContactModalOpen(true)
              }}
              size="sm"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Ajouter un contact
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && !error.includes("Mode démonstration") && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {contacts.length > 0 && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher un contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            {error && error.includes("Mode démonstration") ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mode Démonstration</h3>
                <p className="text-gray-600 mb-4">
                  Cette page affiche des données fictives. Pour voir les contacts réels associés à ce lot :
                </p>
                <div className="space-y-2 text-sm text-gray-500 mb-6">
                  <p>• Créez d'abord un bâtiment réel depuis le tableau de bord</p>
                  <p>• Ajoutez des lots à ce bâtiment</p>
                  <p>• Associez des contacts au bâtiment</p>
                </div>
                <Button 
                  onClick={() => window.location.href = '/gestionnaire/dashboard'}
                  variant="outline"
                >
                  Aller au tableau de bord
                </Button>
              </div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{contact.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getContactTypeLabel(determineAssignmentType(contact))}
                        </Badge>
                        {contact.speciality && (
                          <Badge variant="secondary" className="text-xs">
                            {getSpecialityLabel(contact.speciality)}
                          </Badge>
                        )}
                        {!contact.is_active && (
                          <Badge variant="destructive" className="text-xs">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center space-x-4">
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
                        {contact.company && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                        {contact.address && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs">{contact.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`mailto:${contact.email}`, '_blank')}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedContact(contact)
                        setIsContactModalOpen(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <DeleteConfirmModal
                      itemName={contact.name}
                      itemType="contact"
                      onConfirm={async () => {
                        setDeleteContact(contact)
                        await handleDeleteContact()
                      }}
                    />
                  </div>
                </div>
              ))
            ) : contacts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contact</h3>
                <p className="text-gray-600 mb-4">
                  Aucun contact n'est associé à ce lot pour le moment.
                </p>
                <Button 
                  onClick={() => {
                    setSelectedContact(null)
                    setIsContactModalOpen(true)
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Ajouter le premier contact
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Aucun contact ne correspond à votre recherche.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contact Form Modal - Using proper props based on ContactFormModalProps */}
      {isContactModalOpen && (
        <ContactFormModal
          isOpen={isContactModalOpen}
          onClose={() => {
            setIsContactModalOpen(false)
            setSelectedContact(null)
          }}
          onSubmit={handleContactSubmit}
          defaultType={selectedContact ? determineAssignmentType(selectedContact) : undefined}
        />
      )}

    </>
  )
}
