import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { Database } from "@/lib/database.types"

/**
 * POST /api/upload-avatar
 * Permet à un utilisateur authentifié d'uploader sa photo de profil
 * Stocke l'image dans Supabase Storage et met à jour l'avatar_url
 */
export async function POST(request: NextRequest) {
  try {
    // Initialiser le client Supabase
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
              // Ignorer les erreurs de cookies dans les API routes
            }
          },
        },
      }
    )

    // Vérification de l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

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

    console.log("📸 [UPLOAD-AVATAR] Processing upload for user:", authUser.email)

    // Récupérer l'utilisateur dans notre base de données
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, avatar_url")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !dbUser) {
      console.error("❌ [UPLOAD-AVATAR] User not found in database:", userError)
      return NextResponse.json({ 
        error: "Utilisateur non trouvé dans la base de données" 
      }, { status: 404 })
    }

    // Supprimer l'ancien avatar si il existe
    if (dbUser.avatar_url) {
      const oldFileName = dbUser.avatar_url.split('/').pop()
      if (oldFileName && oldFileName !== 'default-avatar.png') {
        console.log("🗑️ [UPLOAD-AVATAR] Removing old avatar:", oldFileName)
        await supabase.storage
          .from('avatars')
          .remove([`${dbUser.id}/${oldFileName}`])
      }
    }

    // Générer un nom de fichier unique
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${dbUser.id}/${fileName}`

    console.log("☁️ [UPLOAD-AVATAR] Uploading to Storage:", filePath)

    // Uploader vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error("❌ [UPLOAD-AVATAR] Storage upload error:", uploadError)
      return NextResponse.json({ 
        error: "Erreur lors de l'upload: " + uploadError.message 
      }, { status: 500 })
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    console.log("🔗 [UPLOAD-AVATAR] Generated public URL:", publicUrl)

    // Mettre à jour l'avatar_url dans la base de données
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', dbUser.id)

    if (updateError) {
      console.error("❌ [UPLOAD-AVATAR] Database update error:", updateError)
      
      // Nettoyer le fichier uploadé en cas d'erreur de BD
      await supabase.storage
        .from('avatars')
        .remove([filePath])
        
      return NextResponse.json({ 
        error: "Erreur lors de la mise à jour en base de données" 
      }, { status: 500 })
    }

    console.log("✅ [UPLOAD-AVATAR] Avatar updated successfully")

    // Retourner la nouvelle URL
    return NextResponse.json({ 
      message: "Photo de profil mise à jour avec succès",
      avatar_url: publicUrl
    }, { status: 200 })

  } catch (error) {
    console.error("❌ [UPLOAD-AVATAR] Unexpected error:", error)
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}

/**
 * DELETE /api/upload-avatar
 * Supprimer la photo de profil actuelle
 */
export async function DELETE(request: NextRequest) {
  try {
    // Initialiser le client Supabase
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
              // Ignorer les erreurs de cookies dans les API routes
            }
          },
        },
      }
    )

    // Vérification de l'authentification
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !authUser) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Récupérer l'utilisateur dans notre base de données
    const { data: dbUser, error: userError } = await supabase
      .from("users")
      .select("id, avatar_url")
      .eq("auth_user_id", authUser.id)
      .single()

    if (userError || !dbUser) {
      return NextResponse.json({ 
        error: "Utilisateur non trouvé" 
      }, { status: 404 })
    }

    // Supprimer le fichier du storage si il existe
    if (dbUser.avatar_url) {
      const fileName = dbUser.avatar_url.split('/').pop()
      if (fileName && fileName !== 'default-avatar.png') {
        console.log("🗑️ [DELETE-AVATAR] Removing avatar:", fileName)
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
      console.error("❌ [DELETE-AVATAR] Database update error:", updateError)
      return NextResponse.json({ 
        error: "Erreur lors de la suppression" 
      }, { status: 500 })
    }

    console.log("✅ [DELETE-AVATAR] Avatar removed successfully")

    return NextResponse.json({ 
      message: "Photo de profil supprimée avec succès"
    }, { status: 200 })

  } catch (error) {
    console.error("❌ [DELETE-AVATAR] Unexpected error:", error)
    return NextResponse.json({ 
      error: "Erreur interne du serveur" 
    }, { status: 500 })
  }
}
