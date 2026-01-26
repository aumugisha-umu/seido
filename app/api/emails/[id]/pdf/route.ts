import { NextRequest, NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { EmailRepository } from '@/lib/services/repositories/email.repository'
import { renderEmailToPdfHtml } from '@/lib/templates/email-pdf-template'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { logger } from '@/lib/logger'

/**
 * GET /api/emails/[id]/pdf
 *
 * Génère un PDF à partir d'un email et le stocke temporairement dans Supabase Storage.
 * Le PDF peut ensuite être attaché à une intervention.
 *
 * Returns:
 * - pdfPath: chemin du fichier dans le bucket temp-email-pdfs
 * - filename: nom suggéré pour le fichier
 * - pdfUrl: URL signée pour télécharger le PDF (valide 1h)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    // 1. Auth check - seuls les gestionnaires peuvent générer des PDFs d'emails
    const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
    if (!authResult.success) {
      return authResult.error
    }

    const { supabase, userProfile } = authResult.data
    const { id: emailId } = await params

    logger.info({ emailId, userId: userProfile?.id }, '📄 [EMAIL-PDF] Starting PDF generation')

    // 2. Récupérer les données complètes de l'email
    const emailRepo = new EmailRepository(supabase)
    const emailResult = await emailRepo.findById(emailId)

    if (!emailResult.success || !emailResult.data) {
      logger.error({ emailId }, '❌ [EMAIL-PDF] Email not found')
      return NextResponse.json({
        success: false,
        error: 'Email non trouvé'
      }, { status: 404 })
    }

    const email = emailResult.data

    // Récupérer les pièces jointes pour les lister dans le PDF
    const attachments = await emailRepo.getAttachments(emailId)

    // 3. Générer le HTML du PDF
    const html = renderEmailToPdfHtml({
      subject: email.subject,
      from_address: email.from_address,
      to_addresses: email.to_addresses || [],
      cc_addresses: email.cc_addresses || undefined,
      received_at: email.received_at,
      sent_at: email.sent_at,
      body_html: email.body_html,
      body_text: email.body_text,
      attachments: attachments?.map(a => ({
        filename: a.filename,
        size_bytes: a.size_bytes
      })),
      direction: email.direction
    })

    // 4. Générer le PDF avec Puppeteer
    let pdfBuffer: Buffer

    try {
      // Dynamic import de Puppeteer (évite les erreurs si non disponible)
      const puppeteer = await import('puppeteer')

      // ✅ SECURITY: Add explicit timeouts to prevent indefinite blocking
      const browser = await puppeteer.default.launch({
        headless: true,
        timeout: 15000, // 15s browser launch timeout
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      })

      let page: Awaited<ReturnType<typeof browser.newPage>> | null = null

      try {
        page = await browser.newPage()
        page.setDefaultTimeout(10000) // 10s default for all page operations

        // Optimisation: désactiver les ressources non nécessaires
        await page.setRequestInterception(true)
        page.on('request', (req) => {
          const resourceType = req.resourceType()
          if (['image', 'font', 'media'].includes(resourceType)) {
            // Permettre les images inline (data:) mais bloquer les externes
            if (resourceType === 'image' && req.url().startsWith('data:')) {
              req.continue()
            } else if (resourceType === 'image') {
              req.abort()
            } else {
              req.abort()
            }
          } else {
            req.continue()
          }
        })

        await page.setContent(html, { waitUntil: 'domcontentloaded' })

        // ✅ PDF generation with explicit timeout using Promise.race
        const pdfPromise = page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            bottom: '20mm',
            left: '15mm',
            right: '15mm'
          }
        })

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF generation timeout (8s)')), 8000)
        )

        pdfBuffer = Buffer.from(await Promise.race([pdfPromise, timeoutPromise]))

      } finally {
        // ✅ CRITICAL: Always close browser to prevent resource leaks
        await browser.close()
      }

      logger.info({
        emailId,
        pdfSizeKb: Math.round(pdfBuffer.length / 1024),
        generationTimeMs: Date.now() - startTime
      }, '✅ [EMAIL-PDF] PDF generated with Puppeteer')

    } catch (puppeteerError) {
      logger.error({
        error: puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError),
        emailId
      }, '⚠️ [EMAIL-PDF] Puppeteer failed, using fallback HTML-only approach')

      // Fallback: retourner les données sans PDF
      // Le frontend pourra utiliser une autre méthode (ex: window.print())
      return NextResponse.json({
        success: true,
        fallback: true,
        message: 'PDF generation not available, using email data directly',
        emailData: {
          id: email.id,
          subject: email.subject,
          from_address: email.from_address,
          body_text: email.body_text,
          body_html: email.body_html,
          received_at: email.received_at,
          sent_at: email.sent_at,
          direction: email.direction
        }
      })
    }

    // 5. Uploader vers Supabase Storage (bucket temp-email-pdfs)
    // ✅ OPTIMIZED: Skip bucket check - migration SQL guarantees bucket exists
    // If bucket doesn't exist, the upload will fail with a clear error
    const serviceClient = createServiceRoleSupabaseClient()
    const timestamp = Date.now()
    const safeSubject = (email.subject || 'sans-objet')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
    const filename = `email-${emailId.substring(0, 8)}-${timestamp}.pdf`
    const displayFilename = `Email - ${safeSubject}.pdf`

    // Uploader le PDF (bucket should be created by migration, with fallback creation)
    let uploadData: { path: string } | null = null
    let uploadError = null

    // First attempt: try to upload directly
    const firstAttempt = await serviceClient.storage
      .from('temp-email-pdfs')
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600', // 1h cache
        upsert: false
      })

    uploadData = firstAttempt.data
    uploadError = firstAttempt.error

    // If bucket doesn't exist, create it and retry (fallback for dev/staging environments)
    if (uploadError && uploadError.message?.includes('Bucket not found')) {
      logger.info({}, '📦 [EMAIL-PDF] Bucket not found, creating temp-email-pdfs bucket...')

      const { error: createError } = await serviceClient.storage.createBucket('temp-email-pdfs', {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024 // 10MB
      })

      if (createError && !createError.message?.includes('already exists')) {
        logger.error({ error: createError }, '❌ [EMAIL-PDF] Failed to create bucket')
        throw createError
      }

      // Retry upload after bucket creation
      const retryAttempt = await serviceClient.storage
        .from('temp-email-pdfs')
        .upload(filename, pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        })

      uploadData = retryAttempt.data
      uploadError = retryAttempt.error

      if (!uploadError) {
        logger.info({}, '✅ [EMAIL-PDF] Bucket created and upload succeeded')
      }
    }

    if (uploadError) {
      logger.error({ error: uploadError }, '❌ [EMAIL-PDF] Upload failed')
      throw uploadError
    }

    // Générer une URL signée (valide 1h)
    const { data: signedUrlData } = await serviceClient.storage
      .from('temp-email-pdfs')
      .createSignedUrl(filename, 3600) // 1h

    logger.info({
      emailId,
      filename,
      path: uploadData.path,
      totalTimeMs: Date.now() - startTime
    }, '✅ [EMAIL-PDF] PDF uploaded to storage')

    return NextResponse.json({
      success: true,
      pdfPath: filename,
      filename: displayFilename,
      pdfUrl: signedUrlData?.signedUrl || null,
      emailId: email.id,
      emailSubject: email.subject
    })

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, '❌ [EMAIL-PDF] Unexpected error')

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la génération du PDF'
    }, { status: 500 })
  }
}
