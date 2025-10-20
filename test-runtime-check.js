// Check if the issue is with build/runtime vs development
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function checkRuntimeIssue() {
  console.log('🔍 Checking for runtime issues...\n')

  // Check if .next directory exists and its size
  try {
    const { stdout: nextDirInfo } = await execAsync('dir .next /s | findstr "File(s)"')
    console.log('📁 .next directory info:')
    console.log(nextDirInfo)
  } catch (error) {
    console.log('❌ .next directory not found or empty')
  }

  // Check environment variables
  console.log('\n🔧 Environment variables check:')
  console.log('NODE_ENV:', process.env.NODE_ENV)
  console.log('NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  // Check if there are any build cache issues
  console.log('\n🗑️ Cleaning build cache...')
  try {
    await execAsync('rmdir /s /q .next 2>nul')
    console.log('✅ Build cache cleaned')
  } catch {
    console.log('ℹ️ No build cache to clean')
  }

  console.log('\n✅ Runtime check complete')
  console.log('Recommendation: Run "npm run build && npm run start" to test production build')
}

checkRuntimeIssue().catch(console.error)