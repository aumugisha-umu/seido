'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Send, Copy, Check } from "lucide-react"
import { toast } from "sonner"

interface EmailTemplate {
  id: string
  name: string
  description: string
  html: string
}

interface EmailPreviewClientProps {
  templates: EmailTemplate[]
  userEmail: string
}

export function EmailPreviewClient({ templates, userEmail }: EmailPreviewClientProps) {
  const [activeTab, setActiveTab] = useState(templates[0]?.id || '')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const handleCopyHtml = (template: EmailTemplate) => {
    navigator.clipboard.writeText(template.html)
    setCopiedId(template.id)
    toast.success(`HTML copié pour "${template.name}"`)

    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSendEmail = async (template: EmailTemplate) => {
    setSendingId(template.id)

    try {
      // TODO: Implémenter l'envoi réel via API route
      // const response = await fetch('/api/send-test-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     to: userEmail,
      //     html: template.html,
      //     subject: `[TEST] ${template.name}`,
      //   }),
      // })

      // Simulation pour l'instant
      await new Promise(resolve => setTimeout(resolve, 1500))

      toast.success(`Email "${template.name}" envoyé à ${userEmail}`, {
        description: 'Vérifiez votre boîte de réception',
      })
    } catch (error) {
      toast.error('Erreur lors de l\'envoi', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    } finally {
      setSendingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Templates Email
            </CardTitle>
            <CardDescription>
              {templates.length} templates disponibles
            </CardDescription>
          </div>
          <Badge variant="secondary">
            Mode Preview
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Liste des templates */}
          <TabsList className="grid w-full grid-cols-5 mb-6">
            {templates.map((template) => (
              <TabsTrigger key={template.id} value={template.id} className="text-xs">
                {template.name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Contenu de chaque template */}
          {templates.map((template) => (
            <TabsContent key={template.id} value={template.id} className="space-y-4">
              {/* Metadonnees du template */}
              <div className="bg-muted p-4 rounded-lg border">
                <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyHtml(template)}
                    disabled={copiedId === template.id}
                  >
                    {copiedId === template.id ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copier HTML
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleSendEmail(template)}
                    disabled={sendingId === template.id}
                  >
                    {sendingId === template.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Envoyer à mon email
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Preview du template dans un iframe isole */}
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Preview (rendu reel)
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {template.html.length} caractères
                  </Badge>
                </div>

                <iframe
                  srcDoc={template.html}
                  className="w-full border-0 h-email-preview"
                  title={`Preview: ${template.name}`}
                  sandbox="allow-same-origin"
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
