import { Users, Mail, Phone, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface AssignedContactsCardProps {
  contacts: Array<{
    id: number
    name: string
    role: string
    speciality?: string
    email: string
    phone: string
    isCurrentUser?: boolean
  }>
}

export function AssignedContactsCard({ contacts }: AssignedContactsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Personnes assignées ({contacts.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {contact.name}
                    {contact.isCurrentUser && <span className="text-blue-600 ml-2">(Vous)</span>}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="secondary">{contact.role}</Badge>
                    {contact.speciality && (
                      <Badge variant="outline" className="text-xs">
                        {contact.speciality}
                      </Badge>
                    )}
                  </div>
                </div>
                {contact.role === "Gestionnaire" && !contact.isCurrentUser && (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{contact.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
