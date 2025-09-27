/**
 * Script pour créer des utilisateurs de test avec le format standardisé arthur+XXX@seido.pm
 * Utilise le mot de passe standardisé Wxcvbn123
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yfmybfmflghwvylqjfbc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjkyNjY0MSwiZXhwIjoyMDcyNTAyNjQxfQ.2dHiCvpvynIr8voT-yIQ6Ls9uHNupJn3XwT_dpFp9qg';

// Use service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configuration des comptes de test standardisés
const TEST_ACCOUNTS = [
  { role: 'gestionnaire', suffix: '000', name: 'Test Gestionnaire 000' },
  { role: 'prestataire', suffix: '001', name: 'Test Prestataire 001' },
  { role: 'locataire', suffix: '002', name: 'Test Locataire 002' },
  { role: 'admin', suffix: '003', name: 'Test Admin 003' }
];

const STANDARD_PASSWORD = 'Wxcvbn123';

async function createTestUser(role, suffix, name) {
  const testUser = {
    email: `arthur+${suffix}@seido.pm`,
    password: STANDARD_PASSWORD,
    role: role,
    name: name
  };

  console.log(`\n--- Creating ${role} account ---`);
  console.log(`Email: ${testUser.email}`);
  console.log(`Password: ${testUser.password}`);
  console.log(`Role: ${testUser.role}`);

  try {
    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error checking existing users:', listError.message);
      return false;
    }

    const existingUser = existingUsers.users.find(u => u.email === testUser.email);
    if (existingUser) {
      console.log(`⚠️  User ${testUser.email} already exists, skipping creation`);
      return true;
    }

    // 1. Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creating auth user:', authError.message);
      return false;
    }

    console.log('✓ Auth user created:', authUser.user.id);

    // 2. Create profile in users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email: testUser.email,
        name: testUser.name,
        role: testUser.role
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError.message);
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return false;
    }

    console.log('✓ User profile created:', profile.id);

    // 3. Test login with the new user
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password
    });

    if (loginError) {
      console.error('Error testing login:', loginError.message);
      return false;
    } else {
      console.log('✓ Login successful!');
      console.log('  Session:', loginData.session ? 'Active' : 'None');
      await supabase.auth.signOut();
    }

    console.log(`✅ ${role} account created successfully!`);
    return true;

  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

async function updateExistingUserPassword() {
  const email = 'arthur@umumentum.com';
  const newPassword = STANDARD_PASSWORD;

  console.log(`\nUpdating password for ${email}...`);

  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError.message);
      return;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
      console.error(`User not found: ${email}`);
      return;
    }

    // Update password
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });

    if (error) {
      console.error('Error updating password:', error.message);
    } else {
      console.log(`✓ Password updated for ${email}`);
      console.log(`  New password: ${newPassword}`);

      // Test login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: email,
        password: newPassword
      });

      if (loginError) {
        console.error('Login test failed:', loginError.message);
      } else {
        console.log('✓ Login successful with new password!');
        await supabase.auth.signOut();
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

async function createAllTestAccounts() {
  console.log('=== Creating all standard test accounts ===\n');
  
  let successCount = 0;
  let totalCount = TEST_ACCOUNTS.length;
  
  for (const account of TEST_ACCOUNTS) {
    const success = await createTestUser(account.role, account.suffix, account.name);
    if (success) successCount++;
  }
  
  console.log('\n=== Summary ===');
  console.log(`✅ Successfully created/verified: ${successCount}/${totalCount} accounts`);
  
  if (successCount === totalCount) {
    console.log('\n✅ All test accounts are ready!');
  } else {
    console.log('\n⚠️  Some accounts failed to create. Check the logs above.');
  }
  
  console.log('\nTest accounts summary:');
  TEST_ACCOUNTS.forEach(account => {
    console.log(`  ${account.role}: arthur+${account.suffix}@seido.pm (${STANDARD_PASSWORD})`);
  });
}

async function main() {
  console.log('=== Supabase User Management ===\n');

  // Create all standard test accounts
  await createAllTestAccounts();

  // Update existing user password
  await updateExistingUserPassword();
}

main().catch(console.error);