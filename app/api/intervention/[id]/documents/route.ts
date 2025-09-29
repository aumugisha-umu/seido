import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

interface DocumentWithUser {
  id: string
  intervention_id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  storage_path: string
  storage_bucket: string | null
  document_type: string | null
  description: string | null
  uploaded_at: string | null
  uploaded_by: string | null
  is_validated: boolean | null
  validated_at: string | null
  validated_by: string | null
  created_at: string | null
  updated_at: string | null
  uploaded_by_user?: {
    id: string
    name: string
    email: string
    role: string
  }
  validated_by_user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

// Document type categories for filtering
const DOCUMENT_TYPE_CATEGORIES = {
  photos: ['photo_avant', 'photo_apres', 'photo_pendant'],
  reports: ['rapport', 'certificat'],
  quotes: ['devis'],
  invoices: ['facture'],
  plans: ['plan'],
  warranties: ['garantie'],
  other: ['autre']
}

/**
 * GET /api/intervention/[id]/documents
 * Retrieve all documents for a specific intervention
 *
 * Query parameters:
 * - type: Filter by document type (photos, reports, quotes, invoices, plans, warranties, other)
 * - page: Page number for pagination (default: 1)
 * - pageSize: Number of items per page (default: 10, max: 50)
 * - sortBy: Sort field (uploaded_at, filename, size) (default: uploaded_at)
 * - sortOrder: Sort order (asc, desc) (default: desc)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: interventionId } = await params

  console.log(`📋 [DOCUMENTS-API] Fetching documents for intervention: ${interventionId}`)

  try {
    // ⚠️ TEMPORAIRE: Utiliser Service Role client pour bypasser RLS
    console.log("⚠️ USING SERVICE ROLE CLIENT TO BYPASS RLS (TEMPORARY)")

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase Service Role configuration')
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, // Service Role bypasse tous les RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Initialize auth client pour récupérer l'utilisateur authentifié
    const cookieStore = await cookies()
    const authClient = createServerClient<Database>(
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

    // Get current auth user (via auth client, pas service client)
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser()
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

    // Verify that the user has access to this intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        team_id,
        status,
        title,
        team:team_id!inner(
          id,
          name,
          members:team_members!inner(
            user_id,
            role
          )
        )
      `)
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      console.error("❌ Intervention not found:", interventionError)
      return NextResponse.json({
        error: 'Intervention non trouvée'
      }, { status: 404 })
    }

    // Check if user is member of the team
    const userTeamMember = intervention.team.members.find(
      (member: any) => member.user_id === dbUser.id
    )

    if (!userTeamMember) {
      console.error("❌ User not member of intervention team")
      return NextResponse.json({
        error: 'Accès refusé à cette intervention'
      }, { status: 403 })
    }

    console.log("✅ User has access to intervention:", {
      interventionId,
      teamRole: userTeamMember.role
    })

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const documentTypeFilter = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '10')))
    const sortBy = searchParams.get('sortBy') || 'uploaded_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build the query
    let query = supabase
      .from('intervention_documents')
      .select(`
        *,
        uploaded_by_user:uploaded_by(id, name, email, role),
        validated_by_user:validated_by(id, name, email, role)
      `, { count: 'exact' })
      .eq('intervention_id', interventionId)

    // Apply document type filter
    if (documentTypeFilter && documentTypeFilter in DOCUMENT_TYPE_CATEGORIES) {
      const types = DOCUMENT_TYPE_CATEGORIES[documentTypeFilter as keyof typeof DOCUMENT_TYPE_CATEGORIES]
      query = query.in('document_type', types)
    }

    // Apply sorting
    const sortColumn = sortBy === 'size' ? 'file_size' :
                      sortBy === 'filename' ? 'original_filename' :
                      'uploaded_at'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    // Execute the query
    const { data: documents, error: documentsError, count } = await query

    if (documentsError) {
      console.error("❌ Error fetching documents:", documentsError)
      return NextResponse.json({
        error: 'Erreur lors de la récupération des documents'
      }, { status: 500 })
    }

    // Generate signed URLs for each document
    const documentsWithUrls = await Promise.all(
      (documents || []).map(async (doc: DocumentWithUser) => {
        let signedUrl = null
        let thumbnailUrl = null

        try {
          // Generate main signed URL (valid for 1 hour)
          const { data } = await supabase.storage
            .from(doc.storage_bucket || 'intervention-documents')
            .createSignedUrl(doc.storage_path, 3600)

          signedUrl = data?.signedUrl

          // For images, generate a thumbnail URL with transformation
          if (doc.mime_type.startsWith('image/')) {
            const { data: thumbData } = await supabase.storage
              .from(doc.storage_bucket || 'intervention-documents')
              .createSignedUrl(doc.storage_path, 3600, {
                transform: {
                  width: 200,
                  height: 200,
                  resize: 'cover'
                }
              })

            thumbnailUrl = thumbData?.signedUrl
          }
        } catch (urlError) {
          console.warn(`⚠️ Could not create signed URL for document ${doc.id}:`, urlError)
        }

        return {
          id: doc.id,
          intervention_id: doc.intervention_id,
          original_filename: doc.original_filename, // Hook expects this
          file_size: doc.file_size, // Hook expects this
          mime_type: doc.mime_type, // Hook expects this
          document_type: doc.document_type,
          uploaded_at: doc.uploaded_at || doc.created_at, // Hook expects this
          uploaded_by: doc.uploaded_by,
          uploaded_by_user: doc.uploaded_by_user ? {
            id: doc.uploaded_by_user.id,
            name: doc.uploaded_by_user.name,
            email: doc.uploaded_by_user.email,
            role: doc.uploaded_by_user.role
          } : null, // Hook expects this
          description: doc.description,
          signed_url: signedUrl, // Hook expects this
          thumbnail_url: thumbnailUrl,
          storage_path: doc.storage_path,
          storage_bucket: doc.storage_bucket,
          is_validated: doc.is_validated || false,
          validated_at: doc.validated_at,
          validated_by_user: doc.validated_by_user ? {
            id: doc.validated_by_user.id,
            name: doc.validated_by_user.name,
            email: doc.validated_by_user.email,
            role: doc.validated_by_user.role
          } : null,
          updated_at: doc.updated_at
        }
      })
    )

    // Group documents by type for easier frontend consumption
    const groupedDocuments = documentsWithUrls.reduce((acc, doc) => {
      const category = Object.entries(DOCUMENT_TYPE_CATEGORIES).find(([_, types]) =>
        types.includes(doc.documentType || 'autre')
      )?.[0] || 'other'

      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(doc)
      return acc
    }, {} as Record<string, typeof documentsWithUrls>)

    const elapsedTime = Date.now() - startTime
    console.log(`✅ [DOCUMENTS-API] Successfully fetched ${documentsWithUrls.length} documents in ${elapsedTime}ms`)
    console.log(`📊 Documents with signed URLs: ${documentsWithUrls.filter(d => d.signed_url).length}/${documentsWithUrls.length}`)

    // Hook expects totalCount and totalPages at root level
    return NextResponse.json({
      success: true,
      documents: documentsWithUrls,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      currentPage: page,
      groupedDocuments,
      intervention: {
        id: intervention.id,
        title: intervention.title,
        status: intervention.status
      },
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      },
      processingTime: elapsedTime
    })

  } catch (error) {
    const elapsedTime = Date.now() - startTime
    console.error(`❌ [DOCUMENTS-API] Error after ${elapsedTime}ms:`, error)

    return NextResponse.json({
      success: false,
      error: 'Une erreur inattendue s\'est produite',
      processingTime: elapsedTime
    }, { status: 500 })
  }
}