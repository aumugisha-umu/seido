
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixUserTeam() {
    const email = 'arthur.umugisha@gmail.com'
    console.log(`Checking team for user: ${email}`)

    // 1. Get user
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, team_id, email')
        .eq('email', email)

    if (userError) {
        console.error('Error fetching user:', userError)
        return
    }

    if (!users || users.length === 0) {
        console.error('User not found in users table')
        // Try to find in auth.users? No, we need public.users
        return
    }

    const user = users[0]
    console.log('User found:', user)

    if (user.team_id) {
        console.log(`User already has team_id: ${user.team_id}`)
        return
    }

    // 2. Get a team
    const { data: teams, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .limit(1)

    if (teamError) {
        console.error('Error fetching teams:', teamError)
        return
    }

    let teamId
    if (!teams || teams.length === 0) {
        console.log('No teams found. Creating one...')
        const { data: newTeam, error: createError } = await supabase
            .from('teams')
            .insert({ name: 'Default Team' })
            .select()
            .single()

        if (createError) {
            console.error('Error creating team:', createError)
            return
        }
        teamId = newTeam.id
        console.log('Created new team:', newTeam)
    } else {
        teamId = teams[0].id
        console.log('Using existing team:', teams[0])
    }

    // 3. Update user
    const { error: updateError } = await supabase
        .from('users')
        .update({ team_id: teamId })
        .eq('id', user.id)

    if (updateError) {
        console.error('Error updating user team:', updateError)
    } else {
        console.log(`Successfully updated user ${user.id} with team_id ${teamId}`)
    }
}

fixUserTeam()
