'use client'

import { Calendar, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AvailabilityCalendarProps {
  scheduledDate: string
  scheduledTime: string
  isModificationMode: boolean
  onModify: () => void
  onReject: () => void
}

export function AvailabilityCalendar({
  scheduledDate,
  scheduledTime,
  isModificationMode,
  onModify,
  onReject,
}: AvailabilityCalendarProps) {
  if (isModificationMode) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-green-600" />
          <span>Intervention programmee</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">
                {new Date(scheduledDate).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-green-700">a {scheduledTime}</p>
            </div>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onModify}
            className="flex-1 px-3"
          >
            <Calendar className="h-3 w-3 mr-2" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            className="flex-1 px-3"
          >
            <XCircle className="h-3 w-3 mr-2" />
            Rejeter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
