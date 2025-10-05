import { NextRequest, NextResponse } from 'next/server'
import { interventionService, userService } from '@/lib/database-service'
import { notificationService } from '@/lib/notification-service'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'

export async function POST(request: NextRequest) {
  console.log("✅ intervention-quote-validate API route called")

  try {
    // Initialize Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({
        success: false,
        error: 'Non autorisé'
      }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      quoteId,
      action, // 'approve' or 'reject'
      comments,
      rejectionReason
    } = body

    if (!quoteId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'quoteId et action (approve/reject) sont requis'
      }, { status: 400 })
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Le motif de rejet est requis'
      }, { status: 400 })
    }

    console.log(`📝 ${action === 'approve' ? 'Approving' : 'Rejecting'} quote:`, quoteId)

    // Get current user from database
    const user = await userService.findByAuthUserId(authUser.id)
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utilisateur non trouvé'
      }, { status: 404 })
    }

    // Check if user is gestionnaire
    if (user.role !== 'gestionnaire') {
      return NextResponse.json({
        success: false,
        error: 'Seuls les gestionnaires peuvent valider les devis'
      }, { status: 403 })
    }

    // Get quote details with intervention and provider info
    const { data: quote, error: quoteError } = await supabase
      .from('intervention_quotes')
      .select(`
        *,
        intervention:intervention_id(
          id,
          title,
          description,
          status,
          team_id,
          lot:lot_id(id, reference, building:building_id(name, address))
        ),
        provider:provider_id(id, name, email, phone, provider_category)
      `)
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      console.error("❌ Quote not found:", quoteError)
      return NextResponse.json({
        success: false,
        error: 'Devis non trouvé'
      }, { status: 404 })
    }

    // Check if quote is still pending
    if (quote.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Ce devis a déjà été traité (statut: ${quote.status})`
      }, { status: 400 })
    }

    // Check if user belongs to intervention team
    if (quote.intervention.team_id && user.team_id !== quote.intervention.team_id) {
      return NextResponse.json({
        success: false,
        error: 'Vous n\'êtes pas autorisé à traiter ce devis'
      }, { status: 403 })
    }

    // Quote validation checks could be added here if needed

    console.log(`🔄 Updating quote status to '${action === 'approve' ? 'approved' : 'rejected'}'...`)

    // Prepare update data
    const updateData: unknown = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      updated_at: new Date().toISOString()
    }

    if (action === 'approve' && comments?.trim()) {
      updateData.review_comments = comments.trim()
    } else if (action === 'reject' && rejectionReason?.trim()) {
      updateData.rejection_reason = rejectionReason.trim()
    }

    // Update quote status
    const { data: updatedQuote, error: updateError } = await supabase
      .from('intervention_quotes')
      .update(updateData)
      .eq('id', quoteId)
      .select(`
        *,
        provider:provider_id(id, name, email, phone, provider_category)
      `)
      .single()

    if (updateError) {
      console.error("❌ Error updating quote:", updateError)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la mise à jour du devis'
      }, { status: 500 })
    }

    console.log(`✅ Quote ${action === 'approve' ? 'approved' : 'rejected'} successfully`)

    // If quote is approved, update intervention status and reject other pending quotes
    if (action === 'approve') {
      console.log("🔄 Updating intervention status to 'planifiee'...")

      // Update intervention status
      await interventionService.update(quote.intervention_id, {
        status: 'planifiee' as Database['public']['Enums']['intervention_status'],
        selected_quote_id: quoteId,
        final_cost: quote.total_amount,
        updated_at: new Date().toISOString()
      })

      // Automatically reject other pending quotes for this intervention
      console.log("🔄 Rejecting other pending quotes for this intervention...")

      const { data: otherQuotes } = await supabase
        .from('intervention_quotes')
        .select('id, provider:provider_id(id, name, email)')
        .eq('intervention_id', quote.intervention_id)
        .eq('status', 'pending')
        .neq('id', quoteId)

      if (otherQuotes && otherQuotes.length > 0) {
        const rejectPromises = otherQuotes.map(async (otherQuote) => {
          // Update quote status
          await supabase
            .from('intervention_quotes')
            .update({
              status: 'rejected',
              reviewed_at: new Date().toISOString(),
              reviewed_by: user.id,
              rejection_reason: 'Un autre devis a été sélectionné pour cette intervention',
              updated_at: new Date().toISOString()
            })
            .eq('id', otherQuote.id)

          // Notify provider of rejection
          try {
            await notificationService.createNotification({
              userId: otherQuote.provider.id,
              teamId: quote.intervention.team_id,
              createdBy: user.id,
              type: 'intervention',
              priority: 'normal',
              title: 'Devis non retenu',
              message: `Votre devis pour l'intervention "${quote.intervention.title}" n'a pas été retenu. Un autre prestataire a été sélectionné.`,
              isPersonal: true,
              metadata: {
                interventionId: quote.intervention_id,
                interventionTitle: quote.intervention.title,
                quoteId: otherQuote.id,
                rejectionReason: 'Un autre devis a été sélectionné pour cette intervention'
              },
              relatedEntityType: 'intervention',
              relatedEntityId: quote.intervention_id
            })
          } catch (notifError) {
            console.warn(`⚠️ Could not send rejection notification to provider ${otherQuote.provider.id}:`, notifError)
          }
        })

        await Promise.all(rejectPromises)
        console.log(`✅ Rejected ${otherQuotes.length} other pending quote(s)`)
      }
    }

    // Send notification to provider about quote validation
    try {
      const notificationData = {
        userId: quote.provider.id,
        teamId: quote.intervention.team_id,
        createdBy: user.id,
        type: 'intervention' as const,
        priority: action === 'approve' ? 'high' : 'normal' as const,
        title: action === 'approve' ? 'Devis approuvé !' : 'Devis rejeté',
        message: action === 'approve'
          ? `Félicitations ! Votre devis de ${quote.total_amount.toFixed(2)}€ pour l'intervention "${quote.intervention.title}" a été approuvé.`
          : `Votre devis pour l'intervention "${quote.intervention.title}" a été rejeté. Motif: ${rejectionReason}`,
        isPersonal: true,
        metadata: {
          interventionId: quote.intervention_id,
          interventionTitle: quote.intervention.title,
          quoteId: quoteId,
          quoteAmount: quote.total_amount,
          validationAction: action,
          ...(action === 'approve' && { actionRequired: 'intervention_planning' }),
          ...(action === 'reject' && { rejectionReason })
        },
        relatedEntityType: 'intervention' as const,
        relatedEntityId: quote.intervention_id
      }

      await notificationService.createNotification(notificationData)
      console.log(`📧 Quote validation notification sent to provider`)
    } catch (notifError) {
      console.warn("⚠️ Could not send quote validation notification:", notifError)
      // Don't fail the validation for notification errors
    }

    // Send status change notifications if intervention status changed
    if (action === 'approve') {
      try {
        await notificationService.notifyInterventionStatusChanged(
          quote.intervention,
          'demande_de_devis',
          'planifiee',
          user.id
        )
        console.log("📧 Intervention status change notifications sent")
      } catch (notifError) {
        console.warn("⚠️ Could not send status change notifications:", notifError)
      }
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: updatedQuote.id,
        status: updatedQuote.status,
        reviewed_at: updatedQuote.reviewed_at,
        reviewed_by: updatedQuote.reviewed_by,
        review_comments: updatedQuote.review_comments,
        rejection_reason: updatedQuote.rejection_reason
      },
      intervention: action === 'approve' ? {
        id: quote.intervention.id,
        status: 'planifiee',
        selected_quote_id: quoteId,
        final_cost: quote.total_amount
      } : undefined,
      message: action === 'approve'
        ? `Devis de ${quote.provider.name} approuvé avec succès`
        : `Devis de ${quote.provider.name} rejeté`
    })

  } catch (error) {
    console.error("❌ Error in intervention-quote-validate API:", error)
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })

    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la validation du devis'
    }, { status: 500 })
  }
}
