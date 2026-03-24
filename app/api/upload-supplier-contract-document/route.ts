import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// Generate unique filename to avoid conflicts (preserves extension for MIME detection)
function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalFilename.split('.').pop() || ''
  const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.')
  // NFD normalization strips accents (é→e), regex removes remaining non-ASCII
  const sanitized = nameWithoutExt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)

  return `${timestamp}-${randomString}-${sanitized}.${extension}`
}

export async function POST(request: NextRequest) {
  try {
    // AUTH
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile } = authResult.data

    // Only gestionnaire and admin can upload supplier contract documents
    if (userProfile.role !== 'gestionnaire' && userProfile.role !== 'admin') {
      return NextResponse.json({
        error: 'Seuls les gestionnaires peuvent uploader des documents'
      }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplierContractId = formData.get('supplierContractId') as string
    const teamId = formData.get('teamId') as string

    if (!file || !supplierContractId || !teamId) {
      return NextResponse.json({
        error: 'file, supplierContractId et teamId sont requis'
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE / 1024 / 1024} Mo`
      }, { status: 413 })
    }

    // Verify the supplier contract belongs to the user's team (with team membership check via RLS)
    const { data: contract, error: contractError } = await supabase
      .from('supplier_contracts')
      .select(`
        id,
        team_id,
        team:team_id!inner(
          members:team_members!inner(user_id)
        )
      `)
      .eq('id', supplierContractId)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .single()

    if (contractError || !contract) {
      logger.error({ contractError, supplierContractId }, '❌ Supplier contract not found or access denied')
      return NextResponse.json({
        error: 'Contrat fournisseur non trouvé ou accès refusé'
      }, { status: 403 })
    }

    // Verify user is a member of the team
    const userHasAccess = contract.team.members.some(
      (member: { user_id: string }) => member.user_id === userProfile.id
    )

    if (!userHasAccess) {
      return NextResponse.json({
        error: 'Accès refusé à ce contrat'
      }, { status: 403 })
    }

    // Generate unique filename and storage path
    const uniqueFilename = generateUniqueFilename(file.name)
    const storagePath = `${teamId}/supplier/${supplierContractId}/${uniqueFilename}`

    // Use service role client for storage upload + DB insert (auth verified above)
    const serviceClient = createServiceRoleSupabaseClient()

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('contract-documents')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error({ error: uploadError }, '❌ Error uploading supplier contract document')
      return NextResponse.json({
        error: 'Erreur lors de l\'upload du fichier: ' + uploadError.message
      }, { status: 500 })
    }

    // Insert document metadata in DB
    const { data: document, error: docError } = await serviceClient
      .from('supplier_contract_documents')
      .insert({
        supplier_contract_id: supplierContractId,
        team_id: teamId,
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: uploadData.path,
        storage_bucket: 'contract-documents',
        uploaded_by: userProfile.id,
      })
      .select('id, original_filename, storage_path')
      .single()

    if (docError) {
      logger.error({ error: docError }, '❌ Error storing supplier contract document metadata')

      // Cleanup: delete uploaded file if DB insert fails
      try {
        await serviceClient.storage
          .from('contract-documents')
          .remove([uploadData.path])
      } catch (cleanupError) {
        logger.error({ error: cleanupError }, '⚠️ Error cleaning up uploaded file')
      }

      return NextResponse.json({
        error: 'Erreur lors de l\'enregistrement des métadonnées du document'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: document.id,
      filename: document.original_filename,
      storage_path: document.storage_path,
    })

  } catch (error) {
    logger.error({ error }, '❌ Error in upload-supplier-contract-document API')
    return NextResponse.json({
      error: 'Erreur interne du serveur'
    }, { status: 500 })
  }
}
