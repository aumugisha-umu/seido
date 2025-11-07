/* eslint-disable react/no-unescaped-entities */
'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  CheckCircle2,
  Building2,
  Users,
  Calendar,
  Clock,
  MessageSquare,
  FileText,
  Paperclip,
  ArrowLeft,
} from 'lucide-react'

export interface InterventionConfirmationData {
  logement: {
    type: string
    name: string
    building?: string
    address?: string
    floor?: string
    tenant?: string
  }
  intervention: {
    title: string
    description: string
    category: string
    urgency: string
    room?: string
  }
  contacts: Array<{
    id: string
    name: string
    email?: string
    phone?: string
    role: string
    speciality?: string
    isCurrentUser?: boolean
  }>
  scheduling?: {
    type: 'immediate' | 'slots' | 'flexible'
    slots?: Array<{
      date: string
      startTime: string
      endTime: string
    }>
  }
  instructions?: {
    type: 'global' | 'per_provider'
    globalMessage?: string
  }
  files?: Array<{
    id: string
    name: string
    size: string
    type?: string
  }>
  expectsQuote?: boolean
}

interface InterventionConfirmationSummaryProps {
  data: InterventionConfirmationData
  onBack: () => void
  onConfirm: () => void
  currentStep?: number
  totalSteps?: number
  isLoading?: boolean
  showFooter?: boolean
}

export function InterventionConfirmationSummary({
  data,
  onBack,
  onConfirm,
  currentStep,
  totalSteps,
  isLoading = false,
  showFooter = true,
}: InterventionConfirmationSummaryProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-sm">
        <CardContent className="p-0">
           {/* Sections compactes horizontales */}
          <div className="space-y-3">
            {/* Logement - 1 ligne */}
            <div className="border rounded p-2.5 bg-gray-50">
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-gray-600">Type:</span>{' '}
                    <strong>{data.logement.name}</strong>
                  </div>
                  {data.logement.building && (
                    <div>
                      <span className="text-gray-600">Immeuble:</span>{' '}
                      <strong>{data.logement.building}</strong>
                    </div>
                  )}
                  {data.logement.floor !== undefined && (
                    <div>
                      <span className="text-gray-600">Étage:</span>{' '}
                      <strong>{data.logement.floor}</strong>
                    </div>
                  )}
                  {data.logement.tenant && (
                    <div>
                      <span className="text-gray-600">Locataire:</span>{' '}
                      <strong>{data.logement.tenant}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Description - Accordion */}
            <Accordion type="single" collapsible defaultValue="description">
              <AccordionItem value="description" className="border rounded">
                <AccordionTrigger className="px-2.5 py-2 text-xs hover:no-underline">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold">Description intervention</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-2.5 pb-2">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-gray-600">Titre</dt>
                      <dd className="font-medium mt-0.5">{data.intervention.title}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Catégorie</dt>
                      <dd className="mt-0.5">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {data.intervention.category}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-600">Urgence</dt>
                      <dd className="mt-0.5">
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0 bg-orange-100 text-orange-800"
                        >
                          {data.intervention.urgency}
                        </Badge>
                      </dd>
                    </div>
                    {data.intervention.room && (
                      <div>
                        <dt className="text-gray-600">Pièce</dt>
                        <dd className="font-medium mt-0.5">{data.intervention.room}</dd>
                      </div>
                    )}
                    <div className="col-span-full">
                      <dt className="text-gray-600">Description complète</dt>
                      <dd className="text-gray-700 mt-0.5 leading-relaxed">
                        {data.intervention.description}
                      </dd>
                    </div>
                  </dl>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Contacts - 1 ligne */}
            {data.contacts.length > 0 && (
              <div className="border rounded p-2.5 bg-gray-50">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    {data.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-center gap-1.5">
                        <span className="text-gray-600">{contact.role}:</span>
                        <strong>{contact.name}</strong>
                        {contact.isCurrentUser && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0 bg-blue-100 text-blue-800"
                          >
                            Vous
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Planification - 1 ligne */}
            {data.scheduling?.type === 'slots' && data.scheduling.slots && (
              <div className="border rounded p-2.5 bg-purple-50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {data.scheduling.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-purple-600" />
                        <span className="font-medium">{slot.date}</span>
                        <span className="text-gray-600">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Files - Compact list */}
            {data.files && data.files.length > 0 && (
              <div className="border rounded p-2.5">
                <div className="flex items-start gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold mb-1">
                      Fichiers joints ({data.files.length})
                    </div>
                    <div className="space-y-1">
                      {data.files.map((file) => (
                        <div key={file.id} className="flex justify-between text-xs">
                          <span className="text-gray-700 truncate flex-1">{file.name}</span>
                          <span className="text-gray-500 ml-2 text-[10px]">{file.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            {data.instructions?.globalMessage && (
              <div className="border rounded p-2.5 bg-blue-50 border-l-4 border-l-blue-600">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs font-semibold mb-1">Instructions globales</div>
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {data.instructions.globalMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* Footer compact */}
        {showFooter && (
          <CardFooter className="flex justify-between border-t bg-gray-50 px-6 py-3">
            <Button variant="outline" size="sm" onClick={onBack} disabled={isLoading}>
              <ArrowLeft className="h-3 w-3 mr-1.5" />
              Retour
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              size="sm"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                'Création en cours...'
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  Créer l'intervention
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
