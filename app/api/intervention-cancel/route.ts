import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/lib/database.types"

interface CancelRequest {
  interventionId: string
  cancellationReason: string
  internalComment?: string
}

export async function POST(request: NextRequest) {
  try {
    const { interventionId, cancellationReason, internalComment }: CancelRequest = 
      await request.json()

    console.log(`🚫 API: Cancelling intervention ${interventionId}`)

    // Validation des données avec logs de debug
    console.log('🔍 [API-CANCEL] Validation check:', {
      interventionId,
      cancellationReason,
      trimmed: cancellationReason?.trim(),
      length: cancellationReason?.trim()?.length
    })
    
    if (!interventionId || !cancellationReason?.trim()) {
      console.log('❌ [API-CANCEL] Validation failed:', {
        hasInterventionId: !!interventionId,
        hasCancellationReason: !!cancellationReason,
        trimmedLength: cancellationReason?.trim()?.length || 0
      })
      return NextResponse.json(
        { success: false, error: "ID d'intervention et motif d'annulation requis" },
        { status: 400 }
      )
    }

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

    console.log(`🚫 Cancelling intervention ${interventionId} by user ${authUser.id}`)

    // D'abord récupérer l'intervention de base sans relations
    const { data: intervention, error: fetchError } = await supabase
      .from("interventions")
      .select("*")
      .eq("id", interventionId)
      .single()

    if (fetchError) {
      console.error("❌ Error fetching intervention:", fetchError)
      return NextResponse.json(
        { success: false, error: `Erreur base de données: ${fetchError.message}` },
        { status: 500 }
      )
    }

    if (!intervention) {
      console.error("❌ Intervention not found with ID:", interventionId)
      return NextResponse.json(
        { success: false, error: "Intervention introuvable" },
        { status: 404 }
      )
    }

    console.log(`📋 Found intervention "${intervention.title}" with status: ${intervention.status}`)

    // Vérifier que l'intervention peut être annulée
    const cancellableStatuses = [
      "approuvee",
      "demande_de_devis", 
      "planification",
      "planifiee",
      "en_cours"
    ]

    if (!cancellableStatuses.includes(intervention.status)) {
      return NextResponse.json(
        { success: false, error: `Impossible d'annuler une intervention au statut "${intervention.status}"` },
        { status: 400 }
      )
    }

    // Mettre à jour le statut de l'intervention
    const { data: updatedIntervention, error: updateError } = await supabase
      .from("interventions")
      .update({
        status: "annulee",
        updated_at: new Date().toISOString(),
        // Optionnel: ajouter les commentaires dans un champ dédié ou logs
      })
      .eq("id", interventionId)
      .select()
      .single()

    if (updateError) {
      console.error("❌ Error updating intervention:", updateError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la mise à jour" },
        { status: 500 }
      )
    }

    console.log(`✅ Intervention status updated to: ${updatedIntervention.status}`)

    // Créer un log d'activité pour l'annulation
    const { error: logError } = await supabase
      .from("activity_logs")
      .insert({
        entity_type: "intervention",
        entity_id: interventionId,
        action: "cancelled",
        details: {
          previous_status: intervention.status,
          new_status: "annulee",
          cancellation_reason: cancellationReason,
          internal_comment: internalComment,
          cancelled_by: authUser.id,
          cancelled_at: new Date().toISOString()
        },
        user_id: authUser.id,
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.warn("⚠️ Error creating activity log:", logError)
      // Ne pas faire échouer la requête pour un problème de log
    }

    // Envoyer les notifications
    try {
      console.log("📧 Sending cancellation notifications...")
      const notificationService = new NotificationService()
      
      // Paramètres: intervention, statusFrom, statusTo, changedBy, reason
      await notificationService.notifyInterventionStatusChanged(
        updatedIntervention,
        intervention.status, // statusFrom (ancien statut)
        "annulee",          // statusTo (nouveau statut)
        authUser.id,        // changedBy
        cancellationReason  // reason
      )
      
      console.log("✅ Notifications sent successfully")
    } catch (notificationError) {
      console.error("❌ Error sending notifications:", notificationError)
      // Ne pas faire échouer la requête pour un problème de notification
    }

    return NextResponse.json({
      success: true,
      intervention: updatedIntervention,
      message: "Intervention annulée avec succès"
    })

  } catch (error) {
    console.error("❌ API Error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Erreur interne du serveur" 
      },
      { status: 500 }
    )
  }
}
