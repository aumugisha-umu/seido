/**
 * Create SEIDO Admin User via Supabase Admin API
 *
 * ⚠️  RUN THIS AFTER ANY DATABASE RESET to recreate the admin account.
 *     SQL migrations cannot reliably create auth.users entries (GoTrue
 *     internal columns). This script uses the Admin API which works correctly.
 *
 * Nuclear cleanup mode: deletes ALL existing entries for the admin email
 * across auth.users, public.users, teams, team_members, and subscriptions
 * before recreating. This fixes "Database error querying schema" 500s
 * caused by orphaned/duplicate entries from prior creation attempts.
 *
 * Usage:  node scripts/create-admin-user.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const EMAIL = 'admin@seido-app.com'
const PASSWORD = 'S3!d0-Adm1n-Kx9$2026'
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'

async function nuclearCleanup() {
  console.log('--- Nuclear cleanup: removing ALL existing data for', EMAIL, '---\n')

  // 1. Find and delete ALL auth.users entries for this email
  //    listUsers can paginate — fetch up to 1000 to be safe
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const matchingAuthUsers = (authData?.users ?? []).filter(u => u.email === EMAIL)

  if (matchingAuthUsers.length > 0) {
    console.log(`Found ${matchingAuthUsers.length} auth.users entry(ies):`)
    for (const authUser of matchingAuthUsers) {
      console.log(`  Deleting auth user ${authUser.id} (created: ${authUser.created_at})`)
      const { error } = await supabase.auth.admin.deleteUser(authUser.id)
      if (error) {
        console.warn(`  Warning: failed to delete auth user ${authUser.id}: ${error.message}`)
      }
    }
  } else {
    console.log('No auth.users entries found.')
  }

  // 2. Find ALL public.users entries (except system user)
  const { data: publicUsers } = await supabase
    .from('users')
    .select('id, team_id, auth_user_id')
    .eq('email', EMAIL)
    .neq('id', SYSTEM_USER_ID)

  if (publicUsers && publicUsers.length > 0) {
    console.log(`\nFound ${publicUsers.length} public.users entry(ies):`)

    for (const pu of publicUsers) {
      console.log(`  Cleaning up user ${pu.id} (team: ${pu.team_id})`)

      // Delete team_members for this user
      const { count: tmCount } = await supabase
        .from('team_members')
        .delete({ count: 'exact' })
        .eq('user_id', pu.id)
      if (tmCount) console.log(`    Deleted ${tmCount} team_members row(s)`)

      // If this user has a team, clean up team-level data
      if (pu.team_id) {
        // Delete subscriptions for the team
        const { count: subCount } = await supabase
          .from('subscriptions')
          .delete({ count: 'exact' })
          .eq('team_id', pu.team_id)
        if (subCount) console.log(`    Deleted ${subCount} subscription(s)`)

        // Check if other users are on this team
        const { count: otherMembers } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', pu.team_id)

        if (otherMembers === 0) {
          // Safe to delete the team — no other members
          // Nullify created_by first to avoid FK constraint
          await supabase.from('teams').update({ created_by: null }).eq('id', pu.team_id)
          const { error: teamErr } = await supabase.from('teams').delete().eq('id', pu.team_id)
          if (teamErr) {
            console.log(`    Could not delete team ${pu.team_id}: ${teamErr.message}`)
          } else {
            console.log(`    Deleted team ${pu.team_id}`)
          }
        } else {
          console.log(`    Team ${pu.team_id} has ${otherMembers} other members, skipping team deletion`)
        }
      }

      // Delete the public.users row itself
      const { error: userErr } = await supabase.from('users').delete().eq('id', pu.id)
      if (userErr) {
        console.warn(`    Warning: failed to delete user ${pu.id}: ${userErr.message}`)
      } else {
        console.log(`    Deleted public.users row ${pu.id}`)
      }
    }
  } else {
    console.log('No public.users entries found.')
  }

  // 3. Brief pause for GoTrue to settle after deletions
  await new Promise(r => setTimeout(r, 1000))
  console.log('\nCleanup complete.\n')
}

async function createAdmin() {
  console.log('Creating admin user via Admin API...')
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: 'Admin',
      last_name: 'SEIDO',
      role: 'admin',
      organization: 'SEIDO',
      password_set: true
    }
  })

  if (createError) {
    console.error('Failed to create user:', createError.message)
    process.exit(1)
  }

  console.log(`Auth user created: ${newUser.user.id}\n`)
  return newUser.user
}

async function ensureProfile(authUser) {
  // Wait for handle_new_user_confirmed trigger
  console.log('Waiting for trigger to create profile...')
  await new Promise(r => setTimeout(r, 2000))

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, role, team_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (profile) {
    console.log('Profile created by trigger:', profile)

    if (profile.role !== 'admin') {
      await supabase.from('users').update({ role: 'admin' }).eq('id', profile.id)
      console.log('Role updated to admin.')
    }
    return profile
  }

  // Fallback: manual creation if trigger didn't fire
  console.log('Trigger did not fire. Creating profile manually...')
  const teamId = crypto.randomUUID()
  const userId = crypto.randomUUID()

  await supabase.from('teams').insert({ id: teamId, name: 'SEIDO' })
  await supabase.from('users').insert({
    id: userId, auth_user_id: authUser.id, email: EMAIL,
    name: 'Admin SEIDO', first_name: 'Admin', last_name: 'SEIDO',
    role: 'admin', team_id: teamId, password_set: true, is_active: true
  })
  await supabase.from('teams').update({ created_by: userId }).eq('id', teamId)
  await supabase.from('team_members').insert({ team_id: teamId, user_id: userId, role: 'admin' })
  await supabase.from('subscriptions').insert({
    team_id: teamId, status: 'trialing',
    trial_start: new Date().toISOString(),
    trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    billable_properties: 0, subscribed_lots: 0
  })
  console.log('Manual profile created:', { userId, teamId })
  return { id: userId, team_id: teamId }
}

async function verifyLogin() {
  if (!anonKey) {
    console.log('\nSkipping login verification (no ANON_KEY)')
    return false
  }

  console.log('\nVerifying login...')
  const testClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { error: loginError } = await testClient.auth.signInWithPassword({
    email: EMAIL, password: PASSWORD
  })

  if (loginError) {
    console.error(`Login FAILED: ${loginError.message}`)
    return false
  }

  console.log('Login OK!')
  return true
}

async function main() {
  console.log('=== SEIDO Admin User Setup (Nuclear Mode) ===\n')

  // Step 1: Nuclear cleanup — remove ALL existing data
  await nuclearCleanup()

  // Step 2: Create fresh auth user
  const authUser = await createAdmin()

  // Step 3: Ensure public profile exists
  await ensureProfile(authUser)

  // Step 4: Verify login works
  const loginOk = await verifyLogin()

  console.log('\n=== Done ===')
  console.log(`Email:    ${EMAIL}`)
  console.log(`Password: ${PASSWORD}`)
  if (!loginOk) {
    console.log('\n⚠ Login verification failed. Check Supabase logs for details.')
  }
  console.log('\nChange the password after first login!')
}

main().catch(console.error)
