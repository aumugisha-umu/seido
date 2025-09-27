/**
 * Test manuel simplifié de l'authentification
 * Test direct avec fetch sur l'API
 */

const BASE_URL = 'http://localhost:3001';

async function testAuth() {
  console.log('🚀 Test d\'authentification manuel\n');

  // Test avec le compte prestataire qui fonctionne
  const credentials = {
    email: 'arthur+prest@seido.pm',
    password: 'Wxcvbn123'
  };

  console.log(`📧 Email: ${credentials.email}`);
  console.log(`🔑 Mot de passe: ${credentials.password}\n`);

  try {
    console.log('➡️ Envoi de la requête de login...');

    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    console.log(`📍 Status: ${response.status}`);

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Login réussi!\n');
      console.log('👤 User:', {
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name
      });

      if (data.session) {
        console.log('\n🔐 Session créée:');
        console.log(`   - Access token: ${data.session.access_token.substring(0, 20)}...`);
        console.log(`   - Refresh token: ${data.session.refresh_token.substring(0, 20)}...`);
      }

      // Test d'accès au dashboard
      console.log('\n➡️ Test d\'accès au dashboard...');

      // Simuler les cookies
      const dashboardResponse = await fetch(`${BASE_URL}/dashboard/${data.user.role}`, {
        headers: {
          'Cookie': `sb-access-token=${data.session?.access_token}; sb-refresh-token=${data.session?.refresh_token}`
        },
        redirect: 'manual'
      });

      console.log(`📍 Dashboard status: ${dashboardResponse.status}`);

      if (dashboardResponse.status === 200) {
        console.log('✅ Accès au dashboard autorisé!');
      } else if (dashboardResponse.status === 302 || dashboardResponse.status === 307) {
        const location = dashboardResponse.headers.get('location');
        console.log(`⚠️ Redirection vers: ${location}`);
      } else {
        console.log('❌ Accès au dashboard refusé');
      }

    } else {
      console.log('❌ Login échoué:', data.error || data.message);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }

  console.log('\n✨ Test terminé');
}

// Vérifier que le serveur est prêt
async function waitForServer() {
  console.log('⏳ Attente du serveur...');

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(BASE_URL);
      if (response.ok || response.status === 307) {
        console.log('✅ Serveur prêt!\n');
        return true;
      }
    } catch (error) {
      // Server not ready
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('❌ Serveur non disponible');
  return false;
}

async function main() {
  const ready = await waitForServer();
  if (ready) {
    await testAuth();
  } else {
    console.log('❌ Impossible de tester - serveur non disponible');
  }
}

main();