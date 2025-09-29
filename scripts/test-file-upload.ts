/**
 * Test script for file upload functionality
 * Run with: npx tsx scripts/test-file-upload.ts
 */

import { createClient } from '@supabase/supabase-js'
import { fileService } from '../lib/file-service'
import { getDatabaseUser } from '../lib/user-utils'
import type { Database } from '../lib/database.types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

// Create Supabase client
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

async function testFileUpload() {
  console.log('🧪 Starting file upload test...\n')

  try {
    // Step 1: Sign in as test user
    console.log('1️⃣ Signing in as test user...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'tenant@example.com', // Use an existing test user
      password: 'password123'
    })

    if (authError || !authData.user) {
      console.error('❌ Failed to sign in:', authError)
      return
    }
    console.log('✅ Signed in successfully\n')

    // Step 2: Get database user
    console.log('2️⃣ Getting database user...')
    const dbUser = await getDatabaseUser(supabase)

    if (!dbUser) {
      console.error('❌ Failed to get database user')
      return
    }
    console.log('✅ Database user found:', {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role
    })
    console.log('')

    // Step 3: Get an intervention to test with
    console.log('3️⃣ Finding test intervention...')
    const { data: interventions, error: intError } = await supabase
      .from('interventions')
      .select('id, reference, title')
      .limit(1)

    if (intError || !interventions || interventions.length === 0) {
      console.error('❌ No interventions found:', intError)
      return
    }

    const testIntervention = interventions[0]
    console.log('✅ Using intervention:', {
      id: testIntervention.id,
      reference: testIntervention.reference,
      title: testIntervention.title
    })
    console.log('')

    // Step 4: Create a test file
    console.log('4️⃣ Creating test file...')
    const testContent = `Test document uploaded at ${new Date().toISOString()}`
    const testFile = new File(
      [testContent],
      `test-document-${Date.now()}.txt`,
      { type: 'text/plain' }
    )
    console.log('✅ Test file created:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    })
    console.log('')

    // Step 5: Upload file using file service
    console.log('5️⃣ Uploading file to Supabase...')
    const uploadResult = await fileService.uploadInterventionDocument(
      supabase,
      testFile,
      {
        interventionId: testIntervention.id,
        uploadedBy: dbUser.id, // Use database user ID
        documentType: 'rapport',
        description: 'Test upload from script'
      }
    )

    console.log('✅ File uploaded successfully!')
    console.log('📄 Document details:', {
      id: uploadResult.documentRecord.id,
      filename: uploadResult.documentRecord.original_filename,
      storagePath: uploadResult.storagePath,
      uploadedBy: uploadResult.documentRecord.uploaded_by
    })
    console.log('')

    // Step 6: Verify document in database
    console.log('6️⃣ Verifying document in database...')
    const { data: savedDoc, error: docError } = await supabase
      .from('intervention_documents')
      .select('*')
      .eq('id', uploadResult.documentRecord.id)
      .single()

    if (docError || !savedDoc) {
      console.error('❌ Failed to verify document:', docError)
      return
    }

    console.log('✅ Document verified in database!')
    console.log('')

    // Step 7: Get signed URL for access
    console.log('7️⃣ Getting signed URL...')
    const signedUrl = await fileService.getSignedUrl(
      supabase,
      uploadResult.storagePath,
      3600 // 1 hour
    )

    console.log('✅ Signed URL generated:', signedUrl.substring(0, 100) + '...')
    console.log('')

    // Step 8: Clean up test file
    console.log('8️⃣ Cleaning up test file...')
    const deleted = await fileService.deleteInterventionDocument(
      supabase,
      uploadResult.documentRecord.id
    )

    if (deleted) {
      console.log('✅ Test file cleaned up successfully')
    } else {
      console.warn('⚠️ Could not clean up test file')
    }

    console.log('\n🎉 All tests passed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      })
    }
  } finally {
    // Sign out
    await supabase.auth.signOut()
    console.log('\n👋 Signed out')
  }
}

// Run the test
testFileUpload().catch(console.error)