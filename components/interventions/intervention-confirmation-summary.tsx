/* eslint-disable react/no-unescaped-entities */
'use client'

/**
 * Intervention Confirmation Summary - Variant 2: Visual Hierarchy Focus
 *
 * Features:
 * - Prominent urgency header with gradient background
 * - Strong visual hierarchy with section separators
 * - Two-column grid for property/contact info
 * - Colored accent sections for scheduling and instructions
 * - Large section icons for better scannability
 */

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  Building2,
  Users,
  Calendar,
  MessageSquare,
  FileText,
  Paperclip,
  ArrowLeft,
  AlertCircle,
  MapPin,
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
    message?: string
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

// Helper to get urgency color scheme
function getUrgencyColors(urgency: string) {
  switch (urgency.toLowerCase()) {
    case 'urgente':
    case 'haute':
      return {
        gradient: 'from-orange-50 to-orange-100',
        border: 'border-orange-500',
        badge: 'bg-orange-600 text-white',
        icon: 'text-orange-600'
      }
    case 'normale':
    case 'moyenne':
      return {
        gradient: 'from-blue-50 to-blue-100',
        border: 'border-blue-500',
        badge: 'bg-blue-600 text-white',
        icon: 'text-blue-600'
      }
    case 'basse':
      return {
        gradient: 'from-gray-50 to-gray-100',
        border: 'border-gray-400',
        badge: 'bg-gray-600 text-white',
        icon: 'text-gray-600'
      }
    default:
      return {
        gradient: 'from-blue-50 to-blue-100',
        border: 'border-blue-500',
        badge: 'bg-blue-600 text-white',
        icon: 'text-blue-600'
      }
  }
}

export function InterventionConfirmationSummary({
  data,
  onBack,
  onConfirm,
  isLoading = false,
  showFooter = true,
}: InterventionConfirmationSummaryProps) {
  const urgencyColors = getUrgencyColors(data.intervention.urgency)

  // Séparer les contacts par rôle
  const gestionnaires = data.contacts.filter(c => c.role.toLowerCase().includes('gestionnaire'))
  const prestataires = data.contacts.filter(c => c.role.toLowerCase().includes('prestataire'))
  const locataires = data.contacts.filter(c => c.role.toLowerCase().includes('locataire'))

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="overflow-hidden shadow-sm">
        {/* Prominent Urgency Header */}
        <CardHeader className={`bg-gradient-to-r ${urgencyColors.gradient} border-b-4 ${urgencyColors.border}`}>
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-8 h-8 ${urgencyColors.icon}`} />
            <div className="flex-1">
              <CardTitle className="text-xl">
                {data.intervention.urgency === 'urgente' || data.intervention.urgency === 'haute'
                  ? 'Intervention Urgente'
                  : 'Nouvelle Intervention'}
              </CardTitle>
              <CardDescription className="text-base font-medium text-gray-900 mt-1">
                {data.intervention.title}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Badge className={urgencyColors.badge}>
              Urgence: {data.intervention.urgency}
            </Badge>
            <Badge variant="secondary" className="bg-white/90 text-gray-800">
              {data.intervention.category}
            </Badge>
            {data.expectsQuote && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                Devis requis
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          {/* Property & Contact Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Property Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-base">Logement</h3>
              </div>
              <dl className="space-y-2 pl-10">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Type:</dt>
                  <dd className="font-medium">{data.logement.name}</dd>
                </div>
                {data.logement.building && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Immeuble:</dt>
                    <dd className="font-medium">{data.logement.building}</dd>
                  </div>
                )}
                {data.logement.floor !== undefined && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Étage:</dt>
                    <dd className="font-medium">{data.logement.floor}</dd>
                  </div>
                )}
                {data.logement.tenant && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Locataire:</dt>
                    <dd className="font-medium">{data.logement.tenant}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contacts Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-base">Participants</h3>
              </div>
              <dl className="space-y-2 pl-10">
                {gestionnaires.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-600 mb-1">Gestionnaire{gestionnaires.length > 1 ? 's' : ''}</dt>
                    {gestionnaires.map((contact) => (
                      <dd key={contact.id} className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{contact.name}</span>
                        {contact.isCurrentUser && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Vous</Badge>
                        )}
                      </dd>
                    ))}
                  </div>
                )}
                {prestataires.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-600 mb-1">Prestataire{prestataires.length > 1 ? 's' : ''}</dt>
                    {prestataires.map((contact) => (
                      <dd key={contact.id} className="font-medium mb-1">{contact.name}</dd>
                    ))}
                  </div>
                )}
                {locataires.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-600 mb-1">Locataire{locataires.length > 1 ? 's' : ''}</dt>
                    {locataires.map((contact) => (
                      <dd key={contact.id} className="font-medium mb-1">{contact.name}</dd>
                    ))}
                  </div>
                )}
              </dl>
            </div>
          </div>

          <Separator />

          {/* Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-base">Détails de l'intervention</h3>
            </div>
            <div className="space-y-2 pl-10">
              {data.intervention.room && (
                <div>
                  <dt className="text-sm text-gray-600 mb-1">Pièce concernée</dt>
                  <dd className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {data.intervention.room}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-600 mb-1">Description</dt>
                <dd className="text-sm text-gray-700 leading-relaxed">{data.intervention.description}</dd>
              </div>
            </div>
          </div>

          {/* Scheduling Section */}
          {data.scheduling && (data.scheduling.slots || data.scheduling.message) && (
            <>
              <Separator />
              <div className="bg-purple-50 -mx-6 px-6 py-4 border-l-4 border-purple-500">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-6 h-6 text-purple-600" />
                  <h3 className="font-semibold text-base">Planification</h3>
                </div>
                <div className="pl-8">
                  {data.scheduling.slots && data.scheduling.slots.length > 0 ? (
                    <div className="space-y-2">
                      {data.scheduling.slots.map((slot, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{slot.date}</span>
                          <span className="text-gray-600">
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : data.scheduling.message ? (
                    <p className="text-sm text-gray-700">{data.scheduling.message}</p>
                  ) : (
                    <p className="text-sm text-gray-700">Planning à définir</p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Files Section */}
          {data.files && data.files.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </div>
                  <h3 className="font-semibold text-base">Fichiers joints ({data.files.length})</h3>
                </div>
                <ul className="space-y-1 pl-10">
                  {data.files.map((file) => (
                    <li key={file.id} className="text-sm flex justify-between">
                      <span className="text-gray-700 truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{file.size}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Instructions Section */}
          {data.instructions?.globalMessage && (
            <>
              <Separator />
              <div className="bg-blue-50 -mx-6 px-6 py-4 border-l-4 border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-base">Instructions globales</h3>
                </div>
                <p className="text-sm text-gray-700 pl-8 leading-relaxed">
                  {data.instructions.globalMessage}
                </p>
              </div>
            </>
          )}
        </CardContent>

        {/* Footer Actions */}
        {showFooter && (
          <CardFooter className="flex justify-between bg-gray-50 border-t">
            <Button variant="outline" onClick={onBack} disabled={isLoading}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                'Création en cours...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
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
