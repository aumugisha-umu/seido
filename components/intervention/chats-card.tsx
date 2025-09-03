import { MessageSquare, Users, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface Chat {
  id: number
  type: "group" | "individual"
  participants?: number
  name?: string
  role?: string
  lastMessage: string
  lastMessageTime: string
  lastMessageSender?: string
}

interface ChatsCardProps {
  chats: Chat[]
}

export function ChatsCard({ chats }: ChatsCardProps) {
  const groupChat = chats.find((chat) => chat.type === "group")
  const individualChats = chats.filter((chat) => chat.type === "individual")

  const getRoleColor = (role: string) => {
    switch (role) {
      case "Locataire":
        return "bg-green-100 text-green-800"
      case "Prestataire":
        return "bg-blue-100 text-blue-800"
      case "Gestionnaire":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-green-600" />
          <span>Chats en cours</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversation de groupe */}
        {groupChat && (
          <div className="border rounded-lg p-3 bg-green-50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-1">
                <Users className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-medium text-gray-900">Conversation de groupe</span>
                  <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-200">
                    {groupChat.participants} participants
                  </Badge>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-100 ml-2 bg-transparent"
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Ouvrir
              </Button>
            </div>
            <div className="ml-6 space-y-1">
              <p className="text-sm text-gray-700 leading-relaxed">
                Dernier message: "{groupChat.lastMessage}" - {groupChat.lastMessageSender}
              </p>
              <p className="text-xs text-green-600 font-medium">{groupChat.lastMessageTime}</p>
            </div>
          </div>
        )}

        {/* Conversations individuelles */}
        {individualChats.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm">Conversations individuelles</h4>
            {individualChats.map((chat) => (
              <div key={chat.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-1">
                    <User className="h-4 w-4 text-gray-600 mt-0.5" />
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-medium text-gray-900">{chat.name}</span>
                      {chat.role && (
                        <Badge variant="outline" className={`text-xs ${getRoleColor(chat.role)}`}>
                          {chat.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-purple-600 border-purple-200 hover:bg-purple-50 ml-2 bg-transparent"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Répondre
                  </Button>
                </div>
                <div className="ml-6 space-y-1">
                  <p className="text-sm text-gray-700 leading-relaxed">"{chat.lastMessage}"</p>
                  <p className="text-xs text-purple-600 font-medium">{chat.lastMessageTime}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
