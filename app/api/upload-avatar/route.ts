import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'

/**
 * POST /api/upload-avatar
 * Permet à un utilisateur authentifié d'uploader sa photo de profil
 * Stocke l'image dans Supabase Storage et met à jour l'avatar_url
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ AUTH: createServerClient pattern → getApiAuthContext (27 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, authUser, userProfile: dbUser } = authResult.data

    // Récupérer le fichier depuis FormData
    const formData = await request.formData()
    const file = formData.get('avatar') as File
    
    if (!file) {
      return NextResponse.json({ 
        error: "Aucun fichier fourni" 
      }, { status: 400 })
    }

    // Validation du fichier
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "Le fichier est trop volumineux (maximum 5MB)" 
      }, { status: 400 })
    }
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Type de fichier non supporté (JPG, PNG, WebP uniquement)"
      }, { status: 400 })
    }

    logger.info({ user: authUser.email }, "📸 [UPLOAD-AVATAR] Processing upload for user:")

    // Supprimer l'ancien avatar si il existe
    if (dbUser.avatar_url) {
      const oldFileName = dbUser.avatar_url.split('/').pop()
      if (oldFileName && oldFileName !== 'default-avatar.png') {
        logger.info({ oldFileName: oldFileName }, "🗑️ [UPLOAD-AVATAR] Removing old avatar:")
        await supabase.storage
          .from('avatars')
          .remove([`${dbUser.id}/${oldFileName}`])
      }
    }

    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${dbUser.id}/${fileName}`

    logger.info({ filePath: filePath }, "☁️ [UPLOAD-AVATAR] Uploading to Storage:")

    // Uploader vers Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      logger.error({ error: uploadError }, "❌ [UPLOAD-AVATAR] Storage upload error:")
      return NextResponse.json({ 
        error: "Erreur lors de l'upload: " + uploadError.message 
      }, { status: 500 })
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    logger.info({ publicUrl: publicUrl }, "🔗 [UPLOAD-AVATAR] Generated public URL:")

    // Mettre à jour l'avatar_url dans la base de données
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', dbUser.id)

    if (updateError) {
      logger.error({ error: updateError }, "❌ [UPLOAD-AVATAR] Database update error:")
      
      // Nettoyer le fichier uploadé en cas d'erreur de BD
      await supabase.storage
        .from('avatars')
        .remove([filePath])
        
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour en base de données" 
      }, { status: 500 })
    }

    logger.info({}, "✅ [UPLOAD-AVATAR] Avatar updated successfully")

    // Retourner la nouvelle URL
    return NextResponse.json({ 
      message: "Photo de profil mise à jour avec succès",
      avatar_url: publicUrl
    }, { status: 200 })

  } catch (error) {
    logger.error({ error: error }, "❌ [UPLOAD-AVATAR] Unexpected error:")
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}

/**
 * DELETE /api/upload-avatar
 * Supprimer la photo de profil actuelle
 */
export async function DELETE() {
  try {
    // ✅ AUTH: createServerClient pattern → getApiAuthContext (27 lignes → 3 lignes)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { supabase, userProfile: dbUser } = authResult.data

    // Supprimer le fichier du storage si il existe
    if (dbUser.avatar_url) {
      const fileName = dbUser.avatar_url.split('/').pop()
      if (fileName && fileName !== 'default-avatar.png') {
        logger.info({ fileName: fileName }, "🗑️ [DELETE-AVATAR] Removing avatar:")
        await supabase.storage
          .from('avatars')
          .remove([`${dbUser.id}/${fileName}`])
      }
    }

    // Remettre à null dans la base de données
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: null })
      .eq('id', dbUser.id)

    if (updateError) {
      logger.error({ error: updateError }, "❌ [DELETE-AVATAR] Database update error:")
      return NextResponse.json({ 
        error: "Erreur lors de la suppression" 
      }, { status: 500 })
    }

    logger.info({}, "✅ [DELETE-AVATAR] Avatar removed successfully")

    return NextResponse.json({ 
      message: "Photo de profil supprimée avec succès"
    }, { status: 200 })

  } catch (error) {
    logger.error({ error: error }, "❌ [DELETE-AVATAR] Unexpected error:")
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}
