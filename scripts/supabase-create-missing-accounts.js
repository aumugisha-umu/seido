#!/usr/bin/env node

/**
 * Script de création des comptes manquants dans Supabase
 *
 * Ce script crée les comptes Admin et Gestionnaire manquants
 * et s'assure que leurs profils sont correctement configurés.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const { join } = require('path');

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅' : '❌');
  console.error('\n📝 Assurez-vous que votre fichier .env.local contient ces variables.');
  process.exit(1);
}

// Créer le client Supabase avec la clé service_role pour les opérations admin
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configuration des comptes à créer
const MISSING_ACCOUNTS = [
  {
    email: 'arthur@umumentum.com',
    password: 'Wxcvbn123',
    role: 'admin',
    fullName: 'Arthur (Admin)',
    phone: '+33600000001'
  },
  {
    email: 'arthur+gest@seido.pm',
    password: 'Wxcvbn123',
    role: 'gestionnaire',
    fullName: 'Arthur (Gestionnaire)',
    phone: '+33600000002'
  },
  {
    email: 'arthur+loc@seido.pm',
    password: 'Wxcvbn123',
    role: 'locataire',
    fullName: 'Arthur (Locataire)',
    phone: '+33600000003'
  }
];

/**
 * Vérifier si un utilisateur existe déjà
 */
async function checkUserExists(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error(`❌ Erreur lors de la vérification de ${email}:`, error);
      return { exists: false, error };
    }

    return { exists: !!data, user: data };
  } catch (error) {
    console.error(`❌ Exception lors de la vérification de ${email}:`, error);
    return { exists: false, error };
  }
}

/**
 * Créer un utilisateur dans Supabase Auth
 */
async function createAuthUser(account) {
  try {
    console.log(`\n📝 Création du compte Auth pour ${account.email}...`);

    // Créer l'utilisateur dans Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account._password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        full_name: account.fullName,
        role: account.role
      }
    });

    if (authError) {
      // Vérifier si l'utilisateur existe déjà dans Auth
      if (authError.message?.includes('already been registered')) {
        console.log(`ℹ️ L'utilisateur ${account.email} existe déjà dans Auth`);

        // Récupérer l'utilisateur existant
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`❌ Erreur lors de la récupération des utilisateurs:`, listError);
          return { success: false, error: listError };
        }

        const existingUser = users.find(u => u.email === account.email);
        if (existingUser) {
          console.log(`✅ Utilisateur Auth trouvé: ${existingUser.id}`);
          return { success: true, userId: existingUser.id, existing: true };
        }
      }

      console.error(`❌ Erreur lors de la création du compte Auth:`, authError);
      return { success: false, error: authError };
    }

    console.log(`✅ Compte Auth créé avec succès: ${authData.user.id}`);
    return { success: true, userId: authData.user.id, existing: false };
  } catch (error) {
    console.error(`❌ Exception lors de la création du compte Auth:`, error);
    return { success: false, error };
  }
}

/**
 * Créer ou mettre à jour le profil utilisateur
 */
async function createOrUpdateUserProfile(account, authUserId) {
  try {
    console.log(`\n📝 Configuration du profil pour ${account.email}...`);

    // Vérifier si le profil existe déjà
    const { data: existingProfile, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', account.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`❌ Erreur lors de la vérification du profil:`, checkError);
      return { success: false, error: checkError };
    }

    if (existingProfile) {
      // Mettre à jour le profil existant
      console.log(`ℹ️ Profil existant trouvé, mise à jour...`);

      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          auth_user_id: authUserId,
          role: account.role,
          name: account.fullName,
          phone: account.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Erreur lors de la mise à jour du profil:`, updateError);
        return { success: false, error: updateError };
      }

      console.log(`✅ Profil mis à jour avec succès`);
      return { success: true, profile: updatedProfile, updated: true };
    } else {
      // Créer un nouveau profil
      console.log(`ℹ️ Création d'un nouveau profil...`);

      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email: account.email,
          role: account.role,
          name: account.fullName,
          phone: account.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error(`❌ Erreur lors de la création du profil:`, createError);
        return { success: false, error: createError };
      }

      console.log(`✅ Profil créé avec succès`);
      return { success: true, profile: newProfile, updated: false };
    }
  } catch (error) {
    console.error(`❌ Exception lors de la gestion du profil:`, error);
    return { success: false, error };
  }
}

/**
 * Créer un compte complet (Auth + Profil)
 */
async function createCompleteAccount(account) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 Traitement du compte: ${account.email}`);
  console.log(`${'='.repeat(60)}`);

  // Étape 1: Créer l'utilisateur dans Auth
  const authResult = await createAuthUser(account);
  if (!authResult.success) {
    console.error(`❌ Échec de la création du compte Auth pour ${account.email}`);
    return { success: false, account, error: authResult.error };
  }

  // Étape 2: Créer ou mettre à jour le profil
  const profileResult = await createOrUpdateUserProfile(account, authResult._userId);
  if (!profileResult.success) {
    console.error(`❌ Échec de la création/mise à jour du profil pour ${account.email}`);
    return { success: false, account, error: profileResult.error };
  }

  console.log(`\n✅ Compte complètement configuré pour ${account.email}`);
  console.log(`   - Auth ID: ${authResult.userId}`);
  console.log(`   - Profil ID: ${profileResult.profile.id}`);
  console.log(`   - Rôle: ${profileResult.profile.role}`);

  return {
    success: true,
    account,
    authId: authResult._userId,
    profileId: profileResult.profile.id,
    authExisting: authResult.existing,
    profileUpdated: profileResult.updated
  };
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🔧 Script de création des comptes manquants SEIDO');
  console.log('='.repeat(60));
  console.log(`📍 URL Supabase: ${supabaseUrl}`);
  console.log(`🔑 Service Role Key: ${supabaseServiceRoleKey.substring(0, 20)}...`);
  console.log('='.repeat(60));

  const results = {
    created: [],
    updated: [],
    failed: [],
    skipped: []
  };

  for (const account of MISSING_ACCOUNTS) {
    const result = await createCompleteAccount(account);

    if (result.success) {
      if (result.authExisting && result.profileUpdated) {
        results.updated.push(result);
      } else {
        results.created.push(result);
      }
    } else {
      results.failed.push(result);
    }
  }

  // Afficher le résumé
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ DE L\'EXÉCUTION');
  console.log('='.repeat(60));

  if (results.created.length > 0) {
    console.log(`\n✅ Comptes créés (${results.created.length}):`);
    results.created.forEach(r => {
      console.log(`   - ${r.account.email} (${r.account.role})`);
    });
  }

  if (results.updated.length > 0) {
    console.log(`\n♻️ Comptes mis à jour (${results.updated.length}):`);
    results.updated.forEach(r => {
      console.log(`   - ${r.account.email} (${r.account.role})`);
    });
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Échecs (${results.failed.length}):`);
    results.failed.forEach(r => {
      console.log(`   - ${r.account.email}: ${r.error?.message || 'Erreur inconnue'}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Script terminé');

  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Exécuter le script
main().catch(error => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});