/**
 * Script de validation du flow d'authentification complet
 * Test manuel de l'authentification Supabase avec les vraies données
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yfmybfmflghwvylqjfbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXliZm1mbGdod3Z5bHFqZmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MjY2NDEsImV4cCI6MjA3MjUwMjY0MX0.KTAafQ40joj5nKbrHFl9XMNeqdlmXofiFmxpwtJRhZk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test users
const TEST_USERS = [
  { email: 'arthur@umumentum.com', password: 'password123', role: 'gestionnaire' },
  { email: 'arthur+prest@seido.pm', password: 'password123', role: 'prestataire' },
  { email: 'arthur+loc@seido.pm', password: 'password123', role: 'locataire' }
];

async function testUserLogin(user) {
  console.log(`\n${colors.cyan}Testing login for ${user.role}:${colors.reset} ${user.email}`);

  try {
    // Test de connexion
    console.log(`  ${colors.blue}→ Attempting login...${colors.reset}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    if (error) {
      console.log(`  ${colors.red}✗ Login failed: ${error.message}${colors.reset}`);
      return false;
    }

    console.log(`  ${colors.green}✓ Login successful${colors.reset}`);
    console.log(`    - User ID: ${data.user.id}`);
    console.log(`    - Email: ${data.user.email}`);
    console.log(`    - Session: ${data.session ? 'Active' : 'None'}`);

    // Récupération du profil
    console.log(`  ${colors.blue}→ Fetching user profile...${colors.reset}`);
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError) {
      console.log(`  ${colors.red}✗ Profile fetch failed: ${profileError.message}${colors.reset}`);
    } else if (profile) {
      console.log(`  ${colors.green}✓ Profile found${colors.reset}`);
      console.log(`    - Role: ${profile.role}`);
      console.log(`    - Name: ${profile.name}`);
      console.log(`    - Team ID: ${profile.team_id || 'None'}`);
      console.log(`    - Created: ${new Date(profile.created_at).toLocaleDateString()}`);
    } else {
      console.log(`  ${colors.yellow}⚠ No profile found${colors.reset}`);
    }

    // Test de la session
    console.log(`  ${colors.blue}→ Verifying session...${colors.reset}`);
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      console.log(`  ${colors.green}✓ Session is valid${colors.reset}`);
      console.log(`    - Expires: ${new Date(sessionData.session.expires_at * 1000).toLocaleString()}`);
    }

    // Déconnexion
    console.log(`  ${colors.blue}→ Logging out...${colors.reset}`);
    await supabase.auth.signOut();
    console.log(`  ${colors.green}✓ Logged out successfully${colors.reset}`);

    return true;
  } catch (err) {
    console.log(`  ${colors.red}✗ Unexpected error: ${err.message}${colors.reset}`);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log(`\n${colors.cyan}Testing API Login Endpoint${colors.reset}`);

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'arthur@umumentum.com',
        password: 'password123'
      })
    });

    if (response.ok) {
      const _data = await response.json();
      console.log(`  ${colors.green}✓ API login successful${colors.reset}`);
      console.log(`    - User: ${data.user.email}`);
      console.log(`    - Role: ${data.user.role}`);
      console.log(`    - Cookies set: ${response.headers.get('set-cookie') ? 'Yes' : 'No'}`);
    } else {
      console.log(`  ${colors.red}✗ API login failed: ${response.status}${colors.reset}`);
      const _error = await response.text();
      console.log(`    ${error}`);
    }
  } catch (err) {
    console.log(`  ${colors.red}✗ API call failed: ${err.message}${colors.reset}`);
  }
}

async function testDashboardAccess() {
  console.log(`\n${colors.cyan}Testing Dashboard Access${colors.reset}`);

  const endpoints = [
    '/gestionnaire/dashboard',
    '/prestataire/dashboard',
    '/locataire/dashboard'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET',
        redirect: 'manual'
      });

      if (response.status === 307 || response.status === 302) {
        console.log(`  ${colors.yellow}→ ${endpoint}: Redirects to login (expected)${colors.reset}`);
      } else if (response.ok) {
        console.log(`  ${colors.green}✓ ${endpoint}: Accessible${colors.reset}`);
      } else {
        console.log(`  ${colors.red}✗ ${endpoint}: Error ${response.status}${colors.reset}`);
      }
    } catch (err) {
      console.log(`  ${colors.red}✗ ${endpoint}: Failed - ${err.message}${colors.reset}`);
    }
  }
}

async function main() {
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}    SEIDO Authentication Validation Tests${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}`);

  // Test de connexion pour chaque utilisateur
  for (const user of TEST_USERS) {
    await testUserLogin(user);
  }

  // Test de l'endpoint API
  await testAPIEndpoint();

  // Test d'accès aux dashboards
  await testDashboardAccess();

  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}    All tests completed!${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);
}

// Exécuter les tests
main().catch(console.error);