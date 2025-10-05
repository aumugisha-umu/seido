/**
 * 🧹 GLOBAL TEARDOWN - Nettoyage après tous les tests
 */

export default async function globalTeardown() {
  console.log('\n🧹 Global Teardown\n')

  // Nettoyer les ressources globales si nécessaire
  console.log('✅ Global teardown complete\n')
}
