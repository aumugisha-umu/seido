import { NextResponse } from 'next/server'
import type { Database } from '@/lib/database.types'
import { emailService } from '@/lib/email/email-service'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import { logger } from '@/lib/logger'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { getServiceRoleClient, isServiceRoleAvailable } from '@/lib/api-service-role-helper'
import { inviteUserSchema, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
import { createServerActionCompanyRepository } from '@/lib/services/repositories/company.repository'

export async function POST(request: Request) {
  try {
    // ✅ AUTH: 22 lignes → 3 lignes! (ancien pattern getServerSession → getApiAuthContext)
    const authResult = await getApiAuthContext()
    if (!authResult.success) return authResult.error

    const { userProfile: currentUserProfile } = authResult.data

    // Vérifier si le service d'invitation est disponible
    if (!isServiceRoleAvailable()) {
      return NextResponse.json(
        { error: 'Service d\'invitation non configuré - SUPABASE_SERVICE_ROLE_KEY manquant' },
        { status: 503 }
      )
    }

    const supabaseAdmin = getServiceRoleClient()
    const body = await request.json()

    // ✅ ZOD VALIDATION
    const validation = validateRequest(inviteUserSchema, body)
    if (!validation.success) {
      logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [INVITE-USER] Validation failed')
      return NextResponse.json({
        success: false,
        error: 'Données invalides',
        details: formatZodErrors(validation.errors)
      }, { status: 400 })
    }

    const validatedData = validation.data
    const {
      email,
      firstName,
      lastName,
      role = 'gestionnaire',
      providerCategory, // ✅ FIX: Extraire providerCategory envoyé par le service
      teamId,
      phone,
      notes, // ✅ AJOUT: Notes sur le contact
      speciality, // ✅ AJOUT: Spécialité pour les prestataires
      customRoleDescription, // ✅ AJOUT: Description personnalisée pour le rôle "autre"
      shouldInviteToApp = false,  // ✅ NOUVELLE LOGIQUE SIMPLE
      // Champs société
      contactType,
      companyMode,
      companyId: providedCompanyId,
      companyName,
      vatNumber,
      street,
      streetNumber,
      postalCode,
      city,
      country
    } = validatedData

    // ✅ Normaliser l'email : convertir chaînes vides en null (pour usage dans toutes les étapes)
    const normalizedEmail = email?.trim() || null

    logger.info({
      email,
      firstName,
      lastName,
      role,
      providerCategory, // ✅ LOG: Afficher le providerCategory reçu
      speciality,
      shouldInviteToApp,
      teamId,
      contactType,
      companyMode
    }, '📧 [INVITE-USER-SIMPLE] Creating contact:')

    // ✅ FIX: Si providerCategory est déjà fourni par le service, l'utiliser directement
    // Sinon, mapper depuis le role (legacy support)
    let validUserRole: Database['public']['Enums']['user_role']
    let finalProviderCategory: Database['public']['Enums']['provider_category'] | null = null

    if (providerCategory) {
      // ✅ NOUVEAU FLUX: Service envoie déjà role + providerCategory
      validUserRole = role as Database['public']['Enums']['user_role']
      finalProviderCategory = providerCategory as Database['public']['Enums']['provider_category']
      logger.info({ validUserRole, finalProviderCategory }, "✅ [ROLE-DIRECT] Using provided role and category")
    } else {
      // ✅ LEGACY FLUX: Mapper depuis le type frontend (backward compatibility)
      const mapContactTypeToRoleAndCategory = (_contactType: string) => {
        const mapping: Record<string, {
          role: Database['public']['Enums']['user_role'],
          provider_category: Database['public']['Enums']['provider_category'] | null
        }> = {
          'gestionnaire': { role: 'gestionnaire', provider_category: null },
          'locataire': { role: 'locataire', provider_category: null },
          'prestataire': { role: 'prestataire', provider_category: 'prestataire' },
          'proprietaire': { role: 'proprietaire', provider_category: null },
          'autre': { role: 'prestataire', provider_category: 'autre' }
        }

        return mapping[_contactType] || { role: 'gestionnaire', provider_category: null }
      }

      const mapped = mapContactTypeToRoleAndCategory(role)
      validUserRole = mapped.role
      finalProviderCategory = mapped.provider_category
      logger.info({ role, validUserRole, finalProviderCategory }, "🔄 [ROLE-MAPPING] Contact type mapped to user role and category")
    }

    let userProfile
    let invitationResult = null
    let authUserId: string | null = null
    let finalCompanyId: string | null = null

    // Construire le nom du contact selon le type (utilisé pour user.name et activity logs)
    let contactName: string
    if (contactType === 'company') {
      // Pour société: utiliser nom/prénom si fournis, sinon nom de société
      if (firstName?.trim() || lastName?.trim()) {
        contactName = `${firstName || ''} ${lastName || ''}`.trim()
      } else {
        contactName = companyName || 'Contact société'
      }
    } else {
      // Pour personne physique
      contactName = `${firstName || ''} ${lastName || ''}`.trim()
    }

    // ============================================================================
    // ÉTAPE 0 (SI SOCIÉTÉ): Créer ou récupérer la société
    // ============================================================================
    if (contactType === 'company') {
      logger.info({ companyMode }, '🏢 [STEP-0] Processing company contact...')

      if (companyMode === 'existing') {
        // Mode: Société existante
        if (!providedCompanyId) {
          logger.error({}, '❌ [STEP-0] Missing companyId for existing company')
          return NextResponse.json(
            { error: 'ID de société requis pour lier à une société existante' },
            { status: 400 }
          )
        }

        // ✅ SÉCURITÉ: Vérifier que la société appartient bien à l'équipe de l'utilisateur
        const { data: companyCheck, error: companyCheckError } = await supabaseAdmin
          .from('companies')
          .select('id')
          .eq('id', providedCompanyId)
          .eq('team_id', teamId)
          .maybeSingle()

        if (companyCheckError) {
          logger.error({ error: companyCheckError }, '❌ [STEP-0] Error checking company ownership')
          return NextResponse.json(
            { error: 'Erreur lors de la vérification de la société' },
            { status: 500 }
          )
        }

        if (!companyCheck) {
          logger.warn({ companyId: providedCompanyId, teamId }, '⚠️ [STEP-0] Company does not belong to team - potential IDOR attack')
          return NextResponse.json(
            { error: 'Société non trouvée dans votre équipe' },
            { status: 403 }
          )
        }

        finalCompanyId = providedCompanyId
        logger.info({ companyId: finalCompanyId }, '✅ [STEP-0] Using existing company (ownership verified)')

      } else {
        // Mode: Nouvelle société
        logger.info({ companyName, vatNumber }, '🆕 [STEP-0] Creating new company...')

        if (!companyName || !vatNumber || !street || !streetNumber || !postalCode || !city || !country) {
          logger.error({}, '❌ [STEP-0] Missing required fields for company creation')
          return NextResponse.json(
            { error: 'Tous les champs de la société sont requis (nom, TVA, adresse complète)' },
            { status: 400 }
          )
        }

        try {
          const companyRepository = await createServerActionCompanyRepository()

          // Vérifier si le numéro de TVA existe déjà dans cette équipe
          const existingCompanyResult = await companyRepository.findByVatNumber(vatNumber, teamId)

          if (existingCompanyResult.success && existingCompanyResult.data) {
            logger.warn({ vatNumber }, '⚠️ [STEP-0] Company with this VAT number already exists in team')
            return NextResponse.json(
              { error: `Une société avec le numéro de TVA ${vatNumber} existe déjà dans votre équipe` },
              { status: 409 }
            )
          }

          // Créer la nouvelle société
          const companyResult = await companyRepository.createWithAddress({
            name: companyName,
            vat_number: vatNumber,
            email: normalizedEmail, // Email du contact (peut être null)
            team_id: teamId,
            street,
            street_number: streetNumber,
            postal_code: postalCode,
            city,
            country,
            is_active: true
          })

          if (!companyResult.success || !companyResult.data) {
            logger.error({ error: companyResult.error }, '❌ [STEP-0] Failed to create company')
            return NextResponse.json(
              { error: 'Erreur lors de la création de la société: ' + (companyResult.error?.message || 'Unknown error') },
              { status: 500 }
            )
          }

          finalCompanyId = companyResult.data.id
          logger.info({ companyId: finalCompanyId }, '✅ [STEP-0] Company created successfully')

        } catch (companyError) {
          logger.error({ error: companyError }, '❌ [STEP-0] Exception during company creation')
          return NextResponse.json(
            { error: 'Erreur lors de la création de la société: ' + (companyError instanceof Error ? companyError.message : String(companyError)) },
            { status: 500 }
          )
        }
      }
    }

    // ============================================================================
    // ÉTAPE 1 (COMMUNE): Créer le profil utilisateur SANS auth (SUPPORT MULTI-ÉQUIPES)
    // ============================================================================
    logger.info({}, '👤 [STEP-1] Creating user profile (multi-team support)...')

    try {

      // ✅ MULTI-ÉQUIPES: Vérifier si l'utilisateur existe dans L'ÉQUIPE COURANTE uniquement
      // Ne vérifier que si email est fourni (pas de vérification d'unicité si email est null)
      let existingUserInCurrentTeam = null
      if (normalizedEmail) {
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('team_id', teamId) // ✅ Vérifier dans l'équipe courante uniquement
          .is('deleted_at', null) // ✅ FIX: Utiliser .is() pour vérifier NULL sur colonne timestamp
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          logger.error({ error: checkError }, '❌ [STEP-1] Error checking existing user in current team:')
          throw new Error('Failed to check existing user: ' + checkError?.message)
        }

        existingUserInCurrentTeam = existingUser
      }

      // ✅ CAS 1: Utilisateur existe déjà dans l'équipe courante → ERREUR
      if (existingUserInCurrentTeam) {
        logger.warn({ user: existingUserInCurrentTeam.id, teamId }, '⚠️ [STEP-1] User already exists in current team - blocking')
        return NextResponse.json(
          { error: 'Un contact avec cet email existe déjà dans votre équipe.' },
          { status: 409 } // Conflict
        )
      }

      // ✅ CAS 2: Utilisateur n'existe pas dans l'équipe courante → CRÉER nouvelle entrée
      // (même si l'email existe dans une autre équipe, on crée une nouvelle entrée public.users)
      logger.info({}, '📝 [STEP-1] Creating new user profile for this team...')

      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: null, // Sera lié après si invitation
          email: normalizedEmail, // Peut être null si invitation désactivée
          name: contactName,
          first_name: firstName || null,
          last_name: lastName || null,
          role: validUserRole,
          provider_category: finalProviderCategory,
          speciality: speciality || null,
          custom_role_description: customRoleDescription || null, // Description pour le rôle "autre"
          phone: phone || null,
          notes: notes || null,
          team_id: teamId,
          is_active: true,
          password_set: false,
          // Champs société
          is_company: contactType === 'company',
          company_id: finalCompanyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError || !newUser) {
        logger.error({ error: createError }, '❌ [STEP-1] User profile creation failed:')
        throw new Error('Failed to create user profile: ' + (createError?.message || 'Unknown error'))
      }

      userProfile = newUser
      authUserId = newUser.auth_user_id // Sera null sauf si l'email existe dans autre équipe avec auth
      logger.info({ user: userProfile.id, teamId }, '✅ [STEP-1] User profile created for team:')

    } catch (userError) {
      logger.error({ error: userError }, '❌ [STEP-1] Failed to create user profile:')
      return NextResponse.json(
        { error: 'Erreur lors de la création du profil utilisateur: ' + (userError instanceof Error ? userError.message : String(userError)) },
        { status: 500 }
      )
    }

    // ============================================================================
    // ÉTAPE 2 (COMMUNE): Ajouter à l'équipe (OBLIGATOIRE pour tous)
    // ============================================================================
    logger.info({}, '👥 [STEP-2] Adding user to team (common step)...')
    try {
      // Utiliser supabaseAdmin pour bypasser RLS lors de l'ajout à l'équipe
      const { data: teamMember, error: teamError } = await supabaseAdmin
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userProfile.id,
          role: validUserRole as Database['public']['Enums']['team_member_role']
          // created_at est auto-généré par Supabase (timestamp default now())
        })
        .select()
        .single()

      if (teamError) {
        // Si erreur critique, ne pas continuer
        logger.error({ user: teamError }, '❌ [STEP-2] Failed to add user to team:')
        return NextResponse.json(
          { error: 'Erreur lors de l\'ajout du membre à l\'équipe: ' + (teamError?.message || 'Unknown error') },
          { status: 500 }
        )
      }

      logger.info({ user: teamId }, '✅ [STEP-2] User added to team:')
    } catch (teamError) {
      logger.error({ user: teamError }, '❌ [STEP-2] Failed to add user to team:')
      return NextResponse.json(
        { error: 'Erreur lors de l\'ajout du membre à l\'équipe: ' + (teamError instanceof Error ? teamError.message : String(teamError)) },
        { status: 500 }
      )
    }

    // ============================================================================
    // ÉTAPE 3 (SI INVITATION): Créer auth + Générer lien officiel + Enregistrer invitation
    // ============================================================================
    if (shouldInviteToApp) {
      logger.info({}, '📧 [STEP-3-INVITE] Processing invitation flow with official Supabase link...')

      try {
        // SOUS-ÉTAPE 0: Vérifier si un auth user existe déjà pour cet email (support multi-équipes)
        // ✅ OPTIMISATION: Au lieu de charger TOUS les auth users avec listUsers(),
        // on vérifie public.users où auth_user_id IS NOT NULL (requête indexée O(1))
        logger.info({ email: normalizedEmail }, '🔍 [STEP-3-INVITE-0] Checking if auth user already exists (multi-team support)...')
        const { data: existingUserWithAuth } = await supabaseAdmin
          .from('users')
          .select('id, auth_user_id')
          .eq('email', normalizedEmail)
          .not('auth_user_id', 'is', null)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle()

        const existingAuthUser = existingUserWithAuth ? { id: existingUserWithAuth.auth_user_id } : null

        let hashedToken: string
        let invitationUrl: string
        let isNewAuthUser: boolean

        if (!existingAuthUser) {
          // ========================================================================
          // CAS A: AUTH N'EXISTE PAS - CRÉER NOUVEAU AUTH USER
          // ========================================================================
          logger.info({}, '📝 [STEP-3-INVITE-1A] Auth user does not exist, creating new one via invite link...')
          isNewAuthUser = true

          const { data: inviteLink, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'invite',
            email: normalizedEmail!, // Non-null assertion car garanti par validation Zod
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
              data: {
                // ✅ Metadata pour l'auth user (équivalent à user_metadata de createUser)
                full_name: contactName,
                first_name: firstName || null,
                last_name: lastName || null,
                display_name: contactName,
                role: validUserRole,
                provider_category: finalProviderCategory,
                team_id: teamId,
                password_set: false  // ✅ CRITIQUE: Indique que l'utilisateur doit définir son mot de passe
              }
            }
          })

          if (inviteError || !inviteLink?.properties?.action_link) {
            logger.error({ inviteError: inviteError }, '❌ [STEP-3-INVITE-1A] Failed to generate invite link:')
            throw new Error('Failed to generate invitation link: ' + inviteError?.message)
          }

          authUserId = inviteLink.user.id
          hashedToken = inviteLink.properties.hashed_token
          invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`
          logger.info({ authUserId }, '✅ [STEP-3-INVITE-1A] New auth user created + invite link generated')

        } else {
          // ========================================================================
          // CAS B: AUTH EXISTE (AUTRE ÉQUIPE) - RÉUTILISER AUTH EXISTANT
          // ========================================================================
          logger.info({ authUserId: existingAuthUser.id }, '♻️ [STEP-3-INVITE-1B] Auth user already exists (other team), reusing and generating magic link...')
          isNewAuthUser = false
          authUserId = existingAuthUser.id

          // Générer magic link (pas invite car auth existe déjà)
          const { data: magicLink, error: magicError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'magiclink',
            email: normalizedEmail!,
            options: {
              redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?team_id=${teamId}`
            }
          })

          if (magicError || !magicLink) {
            logger.error({ magicError }, '❌ [STEP-3-INVITE-1B] Failed to generate magic link:')
            throw new Error('Failed to generate magic link: ' + magicError?.message)
          }

          hashedToken = magicLink.properties.hashed_token
          invitationUrl = `${EMAIL_CONFIG.appUrl}/auth/confirm?token_hash=${hashedToken}&type=invite`
          logger.info({}, '✅ [STEP-3-INVITE-1B] Magic link generated for existing auth user')
        }

        // SOUS-ÉTAPE 2: Lier l'auth au profil (utiliser Service Role pour bypasser RLS)
        logger.info({}, '🔗 [STEP-3-INVITE-2] Linking auth to profile with Service Role...')
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from('users')
          .update({ auth_user_id: authUserId })
          .eq('id', userProfile.id)
          .select()
          .single()

        if (updateError || !updatedUser) {
          logger.error({ updateError: updateError }, '❌ [STEP-3-INVITE-2] Failed to link auth to profile:')
          // Cleanup : Supprimer l'auth créé SEULEMENT si on vient de le créer
          if (isNewAuthUser && authUserId) {
            await supabaseAdmin.auth.admin.deleteUser(authUserId)
          }
          throw new Error('Failed to link auth to profile: ' + (updateError?.message || 'No user returned'))
        }

        logger.info({}, '✅ [STEP-3-INVITE-2] Auth linked to profile via Service Role')

        // SOUS-ÉTAPE 3: Créer l'enregistrement d'invitation dans user_invitations
        // Note: normalizedEmail ne peut pas être null ici car la validation Zod garantit que email est requis si shouldInviteToApp === true
        logger.info({}, '📋 [STEP-3-INVITE-3] Creating invitation record in user_invitations...')
        const { data: invitationRecord, error: invitationError } = await supabaseAdmin
          .from('user_invitations')
          .insert({
            email: normalizedEmail!, // Non-null assertion car garanti par validation Zod
            first_name: firstName,
            last_name: lastName,
            role: validUserRole,
            provider_category: finalProviderCategory,
            team_id: teamId,
            invited_by: currentUserProfile.id,
            invitation_token: hashedToken,  // ✅ Token Supabase complet (VARCHAR 255)
            user_id: userProfile.id,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (invitationError) {
          logger.error({ invitationError: invitationError }, '⚠️ [STEP-3-INVITE-3] Failed to create invitation record:')
          // Non bloquant
        } else {
          logger.info({ invitationRecord: invitationRecord.id }, '✅ [STEP-3-INVITE-3] Invitation record created:')
        }

        // SOUS-ÉTAPE 4: Envoyer l'email via Resend
        // Note: normalizedEmail ne peut pas être null ici car la validation Zod garantit que email est requis si shouldInviteToApp === true
        logger.info({}, '📨 [STEP-3-INVITE-4] Sending invitation email via Resend...')
        const emailResult = await emailService.sendInvitationEmail(normalizedEmail!, {
          firstName,
          inviterName: `${currentUserProfile.first_name || currentUserProfile.name || 'Un membre'}`,
          teamName: teamId,
          role: validUserRole,
          invitationUrl, // ✅ Lien officiel Supabase
          expiresIn: 7,
        })

        if (!emailResult.success) {
          logger.warn({ emailResult: emailResult.error }, '⚠️ [STEP-3-INVITE-4] Failed to send email via Resend:')
          invitationResult = {
            success: false,
            invitationSent: false,
            magicLink: invitationUrl,
            error: emailResult.error,
            message: 'Auth et profil créés mais email non envoyé',
            isNewAuthUser
          }
        } else {
          logger.info({ emailResult: emailResult.emailId, isNewAuthUser }, '✅ [STEP-3-INVITE-4] Invitation email sent successfully via Resend:')
          invitationResult = {
            success: true,
            invitationSent: true,
            magicLink: invitationUrl,
            message: isNewAuthUser 
              ? 'Invitation envoyée avec succès' 
              : 'Contact ajouté à votre équipe (compte existant réutilisé)',
            isNewAuthUser
          }
        }

      } catch (inviteError) {
        logger.error({ inviteError: inviteError }, '❌ [STEP-3-INVITE] Invitation flow failed:')
        return NextResponse.json(
          { error: 'Erreur lors de la création de l\'invitation: ' + (inviteError instanceof Error ? inviteError.message : String(inviteError)) },
          { status: 500 }
        )
      }
    } else {
      logger.info({}, '⏭️ [STEP-3] No invitation requested')
      invitationResult = {
        success: true,
        invitationSent: false,
        message: 'Contact créé sans invitation'
      }
    }

    // ============================================================================
    // ÉTAPE 4 (COMMUNE): Logging de l'activité (avec Service Role pour bypasser RLS)
    // ============================================================================
      try {
        await supabaseAdmin.from('activity_logs').insert({
          team_id: teamId,
          user_id: currentUserProfile.id,
          action_type: shouldInviteToApp ? 'invite' : 'create',
          entity_type: 'contact',
          entity_id: userProfile.id,
          entity_name: contactName,
          description: `Contact ${shouldInviteToApp ? 'créé et invité' : 'créé'}: ${contactName}${speciality ? ` (${speciality})` : ''}`,
          status: 'success',
          metadata: { email, speciality, shouldInviteToApp }
        })
        logger.info({}, '✅ [STEP-4] Activity logged successfully')
      } catch (logError) {
        logger.error({ logError: logError }, '⚠️ [STEP-4] Failed to log activity:')
        // Non bloquant
      }

    logger.info({}, '🎉 [INVITE-USER-SIMPLE] Process completed successfully')

      return NextResponse.json({
        success: true,
      message: shouldInviteToApp ? 
        'Contact créé et invitation envoyée avec succès' : 
        'Contact créé avec succès',
      contact: userProfile,
      invitation: invitationResult
    })

  } catch (error) {
    logger.error({ error: error }, '❌ [INVITE-USER-SIMPLE] Unexpected error:')
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
