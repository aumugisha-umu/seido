/**
 * Lead Magnet API Route
 * POST /api/lead-magnet
 *
 * Captures email from the rent indexation calculator on the landing page.
 * Sends a pre-filled indexation letter or portfolio lead qualifier email.
 *
 * Security:
 * - Rate limited (public tier: 100 req/60s per IP)
 * - Zod validation on all fields
 * - Honeypot field for bot detection
 * - Service role Supabase client (no RLS on indexation_leads)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limit'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { resend, EMAIL_CONFIG } from '@/lib/email/resend-client'
import { renderEmail } from '@/emails/utils/render'
import { IndexationLetterEmail } from '@/emails/templates/lead-magnet/indexation-letter'
import { getBaseLegale } from '@/lib/indexation'
import type { Region } from '@/lib/indexation'
import React from 'react'

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const leadMagnetSchema = z.object({
  email: z.string().email('Email invalide').max(255),
  type: z.enum(['lettre_indexation', 'rapport_portfolio']),
  calcul: z.object({
    loyer: z.number().min(1, 'Le loyer doit être positif').max(100000),
    region: z.enum(['bruxelles', 'wallonie', 'flandre']),
    peb: z.enum(['A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'inconnu']).nullable().optional(),
    nouveauLoyer: z.number().min(0),
    pourcentage: z.number(),
    formule: z.string().max(500),
  }),
  nombreBiens: z.number().int().min(1).max(10000).optional(),
  honeypot: z.string().max(0, 'Invalid submission').optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement est requis' }),
  }),
})

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // --- Rate limiting ---
    const clientId = getClientIdentifier(request)
    const { success: rateLimitOk } = await rateLimiters.public.limit(clientId)

    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.' },
        { status: 429 }
      )
    }

    // --- Parse & validate ---
    const body = await request.json()
    const parsed = leadMagnetSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { email, type, calcul, nombreBiens, honeypot, consent } = parsed.data

    // --- Honeypot check (silent rejection) ---
    if (honeypot && honeypot.length > 0) {
      // Bot detected — return success without doing anything
      return NextResponse.json({ success: true })
    }

    // --- Get client IP for RGPD audit ---
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? null

    // --- Insert lead ---
    const supabase = createServiceRoleSupabaseClient()
    const { error: insertError } = await supabase
      .from('indexation_leads')
      .insert({
        email,
        type,
        metadata: {
          calcul,
          nombreBiens: nombreBiens ?? null,
        },
        source: 'landing_indexation',
        consent_given: consent,
        ip_address: ip,
      })

    if (insertError) {
      logger.error({ error: insertError }, 'Failed to insert indexation lead')
      // Don't block email sending if DB insert fails
    }

    // --- Send email ---
    try {
      if (type === 'lettre_indexation') {
        const baseLegale = getBaseLegale(calcul.region as Region, 'habitation')
        const { html, text } = await renderEmail(
          React.createElement(IndexationLetterEmail, {
            recipientEmail: email,
            calcul,
            baseLegale,
          })
        )
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: email,
          subject: `Votre lettre d'indexation de loyer — ${calcul.nouveauLoyer.toFixed(2)} €/mois`,
          html,
          text,
        })
      } else {
        // rapport_portfolio: lead qualifier email
        await resend.emails.send({
          from: EMAIL_CONFIG.from,
          to: email,
          subject: 'Indexation de portefeuille — SEIDO',
          html: buildPortfolioLeadHtml(email, nombreBiens),
        })
      }
    } catch (emailError) {
      logger.error({ error: emailError instanceof Error ? emailError.message : String(emailError) }, 'Failed to send lead magnet email')
      // Still return success — lead is captured even if email fails
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Lead magnet route error')
    return NextResponse.json(
      { error: 'Une erreur est survenue. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildPortfolioLeadHtml(recipientEmail: string, nombreBiens?: number): string {
  const safeEmail = escapeHtml(recipientEmail)
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #1a1a2e; font-size: 24px;">Indexation de portefeuille</h1>
      <p>Bonjour,</p>
      <p>Merci pour votre int&eacute;r&ecirc;t pour le calcul d&apos;indexation de portefeuille${nombreBiens ? ` (${nombreBiens} biens)` : ''}.</p>
      <p>SEIDO propose un outil professionnel de gestion locative qui inclut le calcul automatique d&apos;indexation pour tout votre portefeuille.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://www.seido-app.com/auth/register" style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Essayer SEIDO gratuitement
        </a>
      </div>
      <p style="font-size: 13px; color: #666;">
        Essai gratuit de 30 jours, sans engagement. G&eacute;rez vos biens, interventions et indexations en un seul endroit.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <p style="font-size: 13px; color: #999;">
        Envoy&eacute; &agrave; ${safeEmail} via <a href="https://www.seido-app.com" style="color: #6366f1;">SEIDO</a>
      </p>
    </div>
  `
}
