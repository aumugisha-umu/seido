import ReactPDF, { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'
import type { InterventionSummary } from './call-transcript-analyzer.service'

// ============================================================================
// Types
// ============================================================================

export interface CallReportData {
  teamName: string
  callerPhone: string | null
  callerName: string
  address: string
  summary: InterventionSummary
  transcript: string
  language: string
  durationSeconds: number | null
  channel: string
  callDate: string
  interventionId: string | null
  uploadedBy: string | null
}

export interface PdfGenerationResult {
  documentId: string
  storagePath: string
  signedUrl: string
}

// ============================================================================
// PDF Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6b7280',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    marginBottom: 6,
    backgroundColor: '#f3f4f6',
    padding: 6,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 130,
    fontFamily: 'Helvetica-Bold',
    color: '#4b5563',
  },
  value: {
    flex: 1,
    color: '#1f2937',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  transcript: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    fontSize: 9,
    lineHeight: 1.5,
    color: '#374151',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
})

const URGENCY_COLORS: Record<string, { bg: string; text: string }> = {
  basse: { bg: '#dcfce7', text: '#166534' },
  normale: { bg: '#dbeafe', text: '#1e40af' },
  haute: { bg: '#fef3c7', text: '#92400e' },
  urgente: { bg: '#fee2e2', text: '#991b1b' },
}

const URGENCY_LABELS: Record<string, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'URGENTE',
}

// ============================================================================
// PDF Component
// ============================================================================

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return 'N/A'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const formatChannel = (channel: string): string => {
  const labels: Record<string, string> = {
    phone: 'Appel telephonique',
    whatsapp_text: 'WhatsApp (texte)',
    whatsapp_voice: 'WhatsApp (vocal)',
    whatsapp_call: 'WhatsApp (appel)',
  }
  return labels[channel] ?? channel
}

const CallReportPDF = ({ data }: { data: CallReportData }) => {
  const urgencyStyle = URGENCY_COLORS[data.summary.urgency] ?? URGENCY_COLORS.normale

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SEIDO — Rapport d'appel IA</Text>
          <Text style={styles.headerSubtitle}>
            {data.teamName} — {new Date(data.callDate).toLocaleDateString('fr-BE', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resume</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Appelant :</Text>
            <Text style={styles.value}>{data.callerName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Telephone :</Text>
            <Text style={styles.value}>{data.callerPhone ?? 'Non identifie'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Adresse :</Text>
            <Text style={styles.value}>{data.summary.address}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Urgence :</Text>
            <Text
              style={[
                styles.urgencyBadge,
                { backgroundColor: urgencyStyle.bg, color: urgencyStyle.text },
              ]}
            >
              {URGENCY_LABELS[data.summary.urgency] ?? data.summary.urgency}
            </Text>
          </View>
          {data.summary.category && (
            <View style={styles.row}>
              <Text style={styles.label}>Categorie :</Text>
              <Text style={styles.value}>{data.summary.category}</Text>
            </View>
          )}
        </View>

        {/* Problem description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description du probleme</Text>
          <Text style={styles.value}>{data.summary.problem_description}</Text>
          {data.summary.additional_notes && (
            <Text style={[styles.value, { marginTop: 6, fontStyle: 'italic' }]}>
              Notes : {data.summary.additional_notes}
            </Text>
          )}
        </View>

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details de l'appel</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Canal :</Text>
            <Text style={styles.value}>{formatChannel(data.channel)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Duree :</Text>
            <Text style={styles.value}>{formatDuration(data.durationSeconds)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Langue detectee :</Text>
            <Text style={styles.value}>
              {data.language === 'fr' ? 'Francais' : data.language === 'nl' ? 'Neerlandais' : 'Anglais'}
            </Text>
          </View>
          {data.interventionId && (
            <View style={styles.row}>
              <Text style={styles.label}>Intervention :</Text>
              <Text style={styles.value}>{data.interventionId}</Text>
            </View>
          )}
        </View>

        {/* Full transcript */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transcription complete</Text>
          <Text style={styles.transcript}>{data.transcript}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Genere automatiquement par SEIDO AI Phone Assistant — {new Date().toISOString()}
        </Text>
      </Page>
    </Document>
  )
}

// ============================================================================
// Service
// ============================================================================

/**
 * Generates a PDF call report, uploads to Storage, creates intervention_documents entry.
 * Returns the document ID and signed URL.
 */
export const generateCallReportPDF = async (
  data: CallReportData,
  teamId: string,
  callId: string
): Promise<PdfGenerationResult> => {
  logger.info({ callId, teamId }, '📄 [PDF] Generating call report')

  // Generate PDF buffer
  const pdfBuffer = await ReactPDF.renderToBuffer(
    <CallReportPDF data={data} />
  )

  const supabase = createServiceRoleSupabaseClient()
  const storagePath = `${teamId}/ai-calls/${callId}.pdf`
  const filename = `rapport-appel-${callId.slice(0, 8)}.pdf`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      cacheControl: '86400',
      upsert: true,
    })

  if (uploadError) {
    logger.error({ uploadError, storagePath }, '❌ [PDF] Upload failed')
    throw new Error(`PDF upload failed: ${uploadError.message}`)
  }

  // Create intervention_documents entry if intervention exists
  let documentId = ''
  if (data.interventionId) {
    // uploaded_by is NOT NULL — use identified user or find a team manager as fallback
    let uploadedBy = data.uploadedBy
    if (!uploadedBy) {
      const { data: manager } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', teamId)
        .eq('role', 'gestionnaire')
        .limit(1)
        .maybeSingle()
      uploadedBy = manager?.user_id ?? null
    }

    if (!uploadedBy) {
      logger.warn('⚠️ [PDF] No uploaded_by user found — skipping intervention_documents entry')
    } else {
      const { data: doc, error: docError } = await supabase
        .from('intervention_documents')
        .insert({
          intervention_id: data.interventionId,
          team_id: teamId,
          document_type: 'rapport_appel_ia',
          storage_bucket: 'documents',
          storage_path: storagePath,
          filename,
          original_filename: filename,
          mime_type: 'application/pdf',
          file_size: pdfBuffer.byteLength,
          uploaded_by: uploadedBy,
        })
        .select('id')
        .single()

      if (docError) {
        logger.error({ docError }, '⚠️ [PDF] Failed to create intervention_documents entry')
      } else {
        documentId = doc.id
      }
    }
  }

  // Generate signed URL (1 hour)
  const { data: signedUrlData } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600)

  logger.info(
    { callId, storagePath, documentId },
    '✅ [PDF] Call report generated and uploaded'
  )

  return {
    documentId,
    storagePath,
    signedUrl: signedUrlData?.signedUrl ?? '',
  }
}
