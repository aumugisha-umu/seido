/**
 * Script de vérification directe des comptes Supabase
 * Test avec l'API Supabase directement
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase (utilise les vraies clés du .env.local)
const SUPABASE_URL = 'https://yfmybfmflghwvylqjfbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk';

// Comptes à tester
const TEST_ACCOUNTS = [
  { email: 'arthur@umumentum.com', name: 'Arthur (Gestionnaire)', expectedRole: 'gestionnaire' },
  { email: 'arthur+prest@seido.pm', name: 'Arthur (Prestataire)', expectedRole: 'prestataire' },
  { email: 'arthur+loc@seido.pm', name: 'Arthur (Locataire)', expectedRole: 'locataire' },
  { email: 'arthur+admin@seido.pm', name: 'Arthur (Admin)', expectedRole: 'admin' }
];

const PASSWORD = 'Wxcvbn123';

// Couleurs console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAccount(supabase, email, password, expectedRole) {
  log(`\nTest du compte: ${email}`, 'cyan');

  try {
    // Test d'authentification
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      log(`  ❌ Échec authentification: ${authError.message}`, 'red');
      return { success: false, error: authError.message };
    }

    log(`  ✅ Authentification réussie!`, 'green');
    log(`     User ID: ${authData.user.id}`, 'blue');
    log(`     Email: ${authData.user.email}`, 'blue');

    // Vérifier le profil dans la table users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (profileError) {
      log(`  ⚠️  Profil non trouvé dans la table users`, 'yellow');
      log(`     Erreur: ${profileError.message}`, 'yellow');

      // Essayer avec l'email directement
      const { data: profileByEmail, error: emailError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (profileByEmail) {
        log(`  ✅ Profil trouvé par email!`, 'green');
        log(`     Role: ${profileByEmail.role}`, 'blue');
        log(`     ID: ${profileByEmail.id}`, 'blue');

        if (profileByEmail.role !== expectedRole) {
          log(`  ⚠️  Role inattendu: attendu '${expectedRole}', obtenu '${profileByEmail.role}'`, 'yellow');
        }

        return { success: true, profile: profileByEmail };
      }
    } else {
      log(`  ✅ Profil trouvé!`, 'green');
      log(`     Role: ${profile.role}`, 'blue');
      log(`     ID: ${profile.id}`, 'blue');
      log(`     Nom: ${profile.name}`, 'blue');

      if (profile.role !== expectedRole) {
        log(`  ⚠️  Role inattendu: attendu '${expectedRole}', obtenu '${profile.role}'`, 'yellow');
      }

      return { success: true, profile };
    }

    // Déconnexion
    await supabase.auth.signOut();

    return { success: true };

  } catch (error) {
    log(`  ❌ Erreur inattendue: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  console.clear();
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║    VÉRIFICATION DIRECTE DES COMPTES SUPABASE             ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  // Créer le client Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  log('\nConfiguration:', 'yellow');
  log(`  URL: ${SUPABASE_URL}`, 'blue');
  log(`  Mot de passe testé: ${PASSWORD}`, 'blue');

  const results = [];

  // Tester chaque compte
  for (const account of TEST_ACCOUNTS) {
    const result = await testAccount(supabase, account.email, PASSWORD, account.expectedRole);
    results.push({
      ...account,
      ...result
    });
  }

  // Résumé
  log('\n' + '='.repeat(60), 'cyan');
  log('RÉSUMÉ DES TESTS', 'bright');
  log('='.repeat(60), 'cyan');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  log(`\n✅ Comptes fonctionnels: ${successful}/${results.length}`, successful === results.length ? 'green' : 'yellow');

  if (failed > 0) {
    log(`\n❌ Comptes en échec:`, 'red');
    results.filter(r => !r.success).forEach(r => {
      log(`   • ${r.email}: ${r.error}`, 'red');
    });
  }

  // Suggestions
  if (failed > 0) {
    log('\n💡 SUGGESTIONS:', 'magenta');
    log('   1. Vérifier que ces comptes existent dans Supabase Auth', 'reset');
    log('   2. Vérifier que le mot de passe est correct', 'reset');
    log('   3. Les créer si nécessaire via le dashboard Supabase', 'reset');
    log('\n   Pour créer les comptes manquants:', 'yellow');
    log('   • Aller sur: https://supabase.com/dashboard/project/yfmybfmflghwvylqjfbc/auth/users', 'reset');
    log('   • Cliquer sur "Invite" ou "Add user"', 'reset');
    log('   • Utiliser le mot de passe: Wxcvbn123', 'reset');
  }
}

main().catch(error => {
  log(`\n❌ Erreur fatale: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});