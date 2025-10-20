/**
 * Test direct de connexion Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yfmybfmflghwvylqjfbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPasswords() {
  const passwords = ['Wxcvbn123'];
  const email = 'arthur@umumentum.com';

  console.log(`Testing passwords for ${email}:\n`);

  for (const pwd of passwords) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pwd
      });

      if (!error && data.user) {
        console.log(`✓ SUCCESS with password: "${pwd}"`);
        console.log(`  User ID: ${data.user.id}`);
        console.log(`  Email: ${data.user.email}`);

        // Get profile
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (profile) {
          console.log(`  Profile found - Role: ${profile.role}, Name: ${profile.name}`);
        }

        await supabase.auth.signOut();
        return pwd; // Return the working password
      } else {
        console.log(`✗ Failed with password: "${pwd}" - ${error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.log(`✗ Error with password: "${pwd}" - ${err.message}`);
    }
  }

  console.log('\nNo working password found. You may need to reset the password.');
  return null;
}

async function resetPassword(email) {
  console.log(`\nAttempting to send password reset email to ${email}...`);

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'http://localhost:3000/auth/set-password',
  });

  if (error) {
    console.log(`Error: ${error.message}`);
  } else {
    console.log('Password reset email sent successfully!');
    console.log('Check your email and follow the link to reset your password.');
  }
}

async function listAuthUsers() {
  // This requires service role key
  const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjkyNjY0MSwiZXhwIjoyMDcyNTAyNjQxfQ.2dHiCvpvynIr8voT-yIQ6Ls9uHNupJn3XwT_dpFp9qg';

  const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('\nFetching users from database...');

  const { data: users, error } = await adminSupabase
    .from('users')
    .select('email, role, name, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.log(`Error fetching users: ${error.message}`);
  } else if (users && users.length > 0) {
    console.log(`Found ${users.length} users:\n`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.name}`);
    });
  } else {
    console.log('No users found in database.');
  }
}

async function main() {
  // First, list available users
  await listAuthUsers();

  // Test passwords
  const workingPassword = await testPasswords();

  if (!workingPassword) {
    // Offer to reset password if none work
    console.log('\nWould you like to reset the password? Check the code for instructions.');
    // Uncomment the line below to send reset email:
    // await resetPassword('arthur@umumentum.com');
  }
}

main().catch(console.error);