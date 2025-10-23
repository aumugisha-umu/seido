// Test d'import Supabase pour debug

console.log('Testing Supabase imports...')

try {
  const supabaseJs = require('@supabase/supabase-js')
  console.log('✅ @supabase/supabase-js imported successfully')
  console.log('Available exports:', Object.keys(supabaseJs))
} catch (error) {
  console.error('❌ Failed to import @supabase/supabase-js:', error.message)
}

try {
  const supabaseSsr = require('@supabase/ssr')
  console.log('✅ @supabase/ssr imported successfully')
  console.log('Available exports:', Object.keys(supabaseSsr))
} catch (error) {
  console.error('❌ Failed to import @supabase/ssr:', error.message)
}

// Check module resolution paths
const Module = require('module')
console.log('\nModule paths:')
console.log(Module._nodeModulePaths(process.cwd()).slice(0, 5))