import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

/**
 * GET /api/intervention-document/[id]
 * Get details of a specific document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  console.log(`📄 [DOCUMENT-API] Fetching document: ${documentId}`)

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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get database user from auth user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error("❌ Database user not found:", userError)
      return NextResponse.json({
        error: 'Profil utilisateur non trouvé'
      }, { status: 404 })
    }

    // Get document with intervention details
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        uploaded_by_user:uploaded_by(id, name, email, role),
        validated_by_user:validated_by(id, name, email, role),
        intervention:intervention_id(
          id,
          team_id,
          title,
          status,
          team:team_id!inner(
            members:team_members!inner(user_id, role)
          )
        )
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error("❌ Document not found:", docError)
      return NextResponse.json({
        error: 'Document non trouvé'
      }, { status: 404 })
    }

    // Check if user is member of the team
    const userHasAccess = document.intervention.team.members.some(
      (member: any) => member.user_id === dbUser.id
    )

    if (!userHasAccess) {
      console.error("❌ User not member of intervention team")
      return NextResponse.json({
        error: 'Accès refusé à ce document'
      }, { status: 403 })
    }

    // Generate signed URL for the document
    let signedUrl = null
    let thumbnailUrl = null

    try {
      const { data } = await supabase.storage
        .from(document.storage_bucket || 'intervention-documents')
        .createSignedUrl(document.storage_path, 3600) // 1 hour

      signedUrl = data?.signedUrl

      // For images, generate a thumbnail URL
      if (document.mime_type.startsWith('image/')) {
        const { data: thumbData } = await supabase.storage
          .from(document.storage_bucket || 'intervention-documents')
          .createSignedUrl(document.storage_path, 3600, {
            transform: {
              width: 200,
              height: 200,
              resize: 'cover'
            }
          })

        thumbnailUrl = thumbData?.signedUrl
      }
    } catch (urlError) {
      console.warn("⚠️ Could not create signed URL:", urlError)
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        interventionId: document.intervention_id,
        filename: document.original_filename,
        size: document.file_size,
        type: document.mime_type,
        documentType: document.document_type,
        uploadedAt: document.uploaded_at || document.created_at,
        uploadedBy: document.uploaded_by_user ? {
          id: document.uploaded_by_user.id,
          name: document.uploaded_by_user.name,
          email: document.uploaded_by_user.email,
          role: document.uploaded_by_user.role
        } : null,
        description: document.description,
        signedUrl,
        thumbnailUrl,
        isValidated: document.is_validated || false,
        validatedAt: document.validated_at,
        validatedBy: document.validated_by_user ? {
          id: document.validated_by_user.id,
          name: document.validated_by_user.name,
          email: document.validated_by_user.email,
          role: document.validated_by_user.role
        } : null
      },
      intervention: {
        id: document.intervention.id,
        title: document.intervention.title,
        status: document.intervention.status
      }
    })

  } catch (error) {
    console.error("❌ [DOCUMENT-API] Error:", error)
    return NextResponse.json({
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/intervention-document/[id]
 * Delete a document from an intervention
 *
 * Only the uploader or team managers can delete documents
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: documentId } = await params

  console.log(`🗑️ [DOCUMENT-API] Deleting document: ${documentId}`)

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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get database user from auth user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error("❌ Database user not found:", userError)
      return NextResponse.json({
        error: 'Profil utilisateur non trouvé'
      }, { status: 404 })
    }

    console.log("👤 User authenticated:", {
      dbId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    })

    // Get document with intervention details
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        intervention:intervention_id(
          id,
          team_id,
          status,
          team:team_id!inner(
            members:team_members!inner(user_id, role)
          )
        )
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error("❌ Document not found:", docError)
      return NextResponse.json({
        error: 'Document non trouvé'
      }, { status: 404 })
    }

    // Check if user can delete the document
    const userTeamMember = document.intervention.team.members.find(
      (member: any) => member.user_id === dbUser.id
    )

    if (!userTeamMember) {
      console.error("❌ User not member of intervention team")
      return NextResponse.json({
        error: 'Accès refusé à ce document'
      }, { status: 403 })
    }

    // Only allow deletion if:
    // 1. User is the uploader
    // 2. User is a manager/admin in the team
    // 3. User has admin role
    const canDelete =
      document.uploaded_by === dbUser.id ||
      userTeamMember.role === 'manager' ||
      userTeamMember.role === 'admin' ||
      dbUser.role === 'admin' ||
      dbUser.role === 'gestionnaire'

    if (!canDelete) {
      console.error("❌ User does not have permission to delete this document")
      return NextResponse.json({
        error: 'Vous n\'avez pas la permission de supprimer ce document'
      }, { status: 403 })
    }

    // Check if intervention is in a state where documents can be deleted
    const nonDeletableStatuses = ['termine', 'annule', 'paye']
    if (nonDeletableStatuses.includes(document.intervention.status)) {
      console.error("❌ Cannot delete document from completed/cancelled intervention")
      return NextResponse.json({
        error: `Les documents ne peuvent pas être supprimés pour une intervention ${document.intervention.status}`
      }, { status: 400 })
    }

    console.log("🗑️ Deleting document from storage:", document.storage_path)

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from(document.storage_bucket || 'intervention-documents')
      .remove([document.storage_path])

    if (storageError) {
      console.error("❌ Error deleting file from storage:", storageError)
      // Continue with metadata deletion even if storage deletion fails
      // The file might already be deleted or inaccessible
    }

    // Delete document metadata from database
    const { error: deleteError } = await supabase
      .from('intervention_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error("❌ Error deleting document metadata:", deleteError)
      return NextResponse.json({
        error: 'Erreur lors de la suppression du document'
      }, { status: 500 })
    }

    // Check if intervention still has other documents
    const { count } = await supabase
      .from('intervention_documents')
      .select('*', { count: 'exact', head: true })
      .eq('intervention_id', document.intervention_id)

    // Update intervention has_attachments flag if no more documents
    if (count === 0) {
      await supabase
        .from('interventions')
        .update({ has_attachments: false })
        .eq('id', document.intervention_id)
    }

    // Log the deletion activity
    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: dbUser.id,
          action: 'document.deleted',
          entity_type: 'intervention_document',
          entity_id: documentId,
          details: {
            interventionId: document.intervention_id,
            filename: document.original_filename,
            documentType: document.document_type,
            deletedBy: dbUser.email
          }
        })
    } catch (logError) {
      console.warn("⚠️ Could not log deletion activity:", logError)
    }

    const elapsedTime = Date.now() - startTime
    console.log(`✅ [DOCUMENT-API] Document deleted successfully in ${elapsedTime}ms`)

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès',
      processingTime: elapsedTime
    })

  } catch (error) {
    const elapsedTime = Date.now() - startTime
    console.error(`❌ [DOCUMENT-API] Error after ${elapsedTime}ms:`, error)

    return NextResponse.json({
      success: false,
      error: 'Une erreur inattendue s\'est produite lors de la suppression',
      processingTime: elapsedTime
    }, { status: 500 })
  }
}

/**
 * PATCH /api/intervention-document/[id]
 * Update document metadata (description, validation status)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  console.log(`📝 [DOCUMENT-API] Updating document: ${documentId}`)

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
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore cookie setting errors in API routes
            }
          },
        },
      }
    )

    // Get current auth user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      console.error("❌ Auth error:", authError)
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Get database user from auth user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error("❌ Database user not found:", userError)
      return NextResponse.json({
        error: 'Profil utilisateur non trouvé'
      }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { description, isValidated } = body

    // Get document with intervention details
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select(`
        *,
        intervention:intervention_id(
          id,
          team_id,
          team:team_id!inner(
            members:team_members!inner(user_id, role)
          )
        )
      `)
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.error("❌ Document not found:", docError)
      return NextResponse.json({
        error: 'Document non trouvé'
      }, { status: 404 })
    }

    // Check if user is member of the team
    const userTeamMember = document.intervention.team.members.find(
      (member: any) => member.user_id === dbUser.id
    )

    if (!userTeamMember) {
      console.error("❌ User not member of intervention team")
      return NextResponse.json({
        error: 'Accès refusé à ce document'
      }, { status: 403 })
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (description !== undefined) {
      updates.description = description
    }

    // Validation can only be done by managers/admins
    if (isValidated !== undefined) {
      const canValidate =
        userTeamMember.role === 'manager' ||
        userTeamMember.role === 'admin' ||
        dbUser.role === 'admin' ||
        dbUser.role === 'gestionnaire'

      if (!canValidate) {
        return NextResponse.json({
          error: 'Seuls les gestionnaires peuvent valider les documents'
        }, { status: 403 })
      }

      updates.is_validated = isValidated
      if (isValidated) {
        updates.validated_at = new Date().toISOString()
        updates.validated_by = dbUser.id
      } else {
        updates.validated_at = null
        updates.validated_by = null
      }
    }

    // Update document
    const { data: updatedDoc, error: updateError } = await supabase
      .from('intervention_documents')
      .update(updates)
      .eq('id', documentId)
      .select(`
        *,
        uploaded_by_user:uploaded_by(id, name, email, role),
        validated_by_user:validated_by(id, name, email, role)
      `)
      .single()

    if (updateError) {
      console.error("❌ Error updating document:", updateError)
      return NextResponse.json({
        error: 'Erreur lors de la mise à jour du document'
      }, { status: 500 })
    }

    console.log("✅ Document updated successfully")

    return NextResponse.json({
      success: true,
      document: {
        id: updatedDoc.id,
        filename: updatedDoc.original_filename,
        description: updatedDoc.description,
        isValidated: updatedDoc.is_validated || false,
        validatedAt: updatedDoc.validated_at,
        validatedBy: updatedDoc.validated_by_user ? {
          name: updatedDoc.validated_by_user.name,
          email: updatedDoc.validated_by_user.email
        } : null
      },
      message: 'Document mis à jour avec succès'
    })

  } catch (error) {
    console.error("❌ [DOCUMENT-API] Error:", error)
    return NextResponse.json({
      success: false,
      error: 'Une erreur inattendue s\'est produite'
    }, { status: 500 })
  }
}