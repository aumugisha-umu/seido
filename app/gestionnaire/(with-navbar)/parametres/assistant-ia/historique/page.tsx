import Link from 'next/link'
import { getServerAuthContext } from '@/lib/server-context'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Phone, Clock, ArrowLeft, Download, ExternalLink } from 'lucide-react'

// --- Helpers ---

function maskPhone(phone: string | null): string {
  if (!phone || phone.length < 6) return phone ?? 'Inconnu'
  return phone.slice(0, 4) + ' *** ' + phone.slice(-2)
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '\u2014'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function languageFlag(lang: string): string {
  switch (lang) {
    case 'fr': return '\uD83C\uDDEB\uD83C\uDDF7'
    case 'nl': return '\uD83C\uDDF3\uD83C\uDDF1'
    case 'en': return '\uD83C\uDDEC\uD83C\uDDE7'
    default: return '\uD83C\uDF10'
  }
}

function urgencyConfig(urgency: string | undefined): { label: string; className: string } {
  switch (urgency) {
    case 'basse': return { label: 'Basse', className: 'bg-green-100 text-green-800 border-green-200' }
    case 'normale': return { label: 'Normale', className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'haute': return { label: 'Haute', className: 'bg-orange-100 text-orange-800 border-orange-200' }
    case 'urgente': return { label: 'Urgente', className: 'bg-red-100 text-red-800 border-red-200' }
    default: return { label: 'Inconnue', className: 'bg-muted text-muted-foreground' }
  }
}

function statusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case 'completed': return { label: 'Termine', className: 'bg-green-100 text-green-800 border-green-200' }
    case 'in_progress': return { label: 'En cours', className: 'bg-blue-100 text-blue-800 border-blue-200' }
    case 'failed': return { label: 'Echoue', className: 'bg-red-100 text-red-800 border-red-200' }
    case 'missed': return { label: 'Manque', className: 'bg-muted text-muted-foreground' }
    default: return { label: status, className: 'bg-muted text-muted-foreground' }
  }
}

// --- Types ---

interface StructuredSummary {
  problem_description?: string
  urgency?: string
  caller_name?: string
  address?: string
  category?: string
  [key: string]: unknown
}

// --- Page ---

export default async function HistoriqueAppelsPage() {
  const { team } = await getServerAuthContext('gestionnaire')

  const supabase = createServiceRoleSupabaseClient()
  const { data: calls } = await supabase
    .from('ai_phone_calls')
    .select('id, created_at, caller_phone, duration_seconds, language, call_status, transcript, structured_summary, intervention_id, pdf_document_id')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Generate signed URLs for PDF documents
  const pdfUrls: Record<string, string> = {}
  if (calls) {
    const pdfCalls = calls.filter((c) => c.pdf_document_id)
    if (pdfCalls.length > 0) {
      const { data: docs } = await supabase
        .from('intervention_documents')
        .select('id, storage_path')
        .in('id', pdfCalls.map((c) => c.pdf_document_id!))

      if (docs) {
        const paths = docs.map((d) => d.storage_path)
        const { data: signedData } = await supabase.storage
          .from('documents')
          .createSignedUrls(paths, 3600)

        if (signedData) {
          for (const doc of docs) {
            const signed = signedData.find((s) => s.path === doc.storage_path)
            if (signed?.signedUrl) {
              pdfUrls[doc.id] = signed.signedUrl
            }
          }
        }
      }
    }
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/gestionnaire/parametres/assistant-ia" aria-label="Retour aux parametres assistant IA">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Historique des appels</h1>
          <p className="text-sm text-muted-foreground">
            {calls?.length ?? 0} appel{(calls?.length ?? 0) !== 1 ? 's' : ''} enregistre{(calls?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {(!calls || calls.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Phone className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">Aucun appel enregistre pour le moment</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Les appels traites par l&apos;assistant IA apparaitront ici.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Call list */}
      {calls && calls.length > 0 && (
        <div className="flex flex-col gap-4">
          {calls.map((call) => {
            const summary = call.structured_summary as StructuredSummary | null
            const urgency = urgencyConfig(summary?.urgency)
            const status = statusConfig(call.call_status)
            const pdfUrl = call.pdf_document_id ? pdfUrls[call.pdf_document_id] : null

            return (
              <Card key={call.id} className="p-4 md:p-6">
                <CardHeader className="p-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: date, phone, language */}
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{maskPhone(call.caller_phone)}</span>
                        <span className="text-base" title={call.language} aria-label={`Langue: ${call.language}`}>
                          {languageFlag(call.language)}
                        </span>
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <time dateTime={call.created_at}>
                          {new Date(call.created_at).toLocaleDateString('fr-BE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </time>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDuration(call.duration_seconds)}
                        </span>
                      </div>
                    </div>

                    {/* Right: badges */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Badge variant="outline" className={status.className}>
                        {status.label}
                      </Badge>
                      {summary?.urgency && (
                        <Badge variant="outline" className={urgency.className}>
                          {urgency.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Summary excerpt */}
                {summary?.problem_description && (
                  <CardContent className="px-0 pb-0 pt-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {summary.problem_description}
                    </p>
                  </CardContent>
                )}

                {/* Actions */}
                {(call.intervention_id || pdfUrl) && (
                  <CardContent className="flex flex-wrap items-center gap-2 px-0 pb-0 pt-3">
                    {call.intervention_id && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/gestionnaire/operations/interventions/${call.intervention_id}`}>
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Voir l&apos;intervention
                        </Link>
                      </Button>
                    )}
                    {pdfUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" download>
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Telecharger PDF
                        </a>
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
