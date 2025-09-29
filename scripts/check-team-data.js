require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
  console.log('🔍 Checking teams and team_members data...');

  // Check teams
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*');

  if (teamsError) {
    console.error('Error fetching teams:', teamsError);
  } else {
    console.log('\n📦 Teams in database:', teams?.length || 0);
    if (teams?.length > 0) {
      console.log('Teams:', teams);
    }
  }

  // Check team_members
  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select('*');

  if (membersError) {
    console.error('Error fetching team_members:', membersError);
  } else {
    console.log('\n👥 Team members in database:', members?.length || 0);
    if (members?.length > 0) {
      console.log('Team members:', members);
    }
  }

  // Check buildings with team_id
  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('id, name, team_id');

  if (buildingsError) {
    console.error('Error fetching buildings:', buildingsError);
  } else {
    console.log('\n🏢 Buildings in database:', buildings?.length || 0);
    if (buildings?.length > 0) {
      console.log('Buildings:', buildings);
    }
  }

  // Check users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name, auth_user_id, role');

  if (usersError) {
    console.error('Error fetching users:', usersError);
  } else {
    console.log('\n👤 Users in database:', users?.length || 0);
    if (users?.length > 0) {
      users.forEach(user => {
        console.log(`  - ${user.name}: ID=${user.id}, AuthID=${user.auth_user_id}, Role=${user.role}`);
      });
    }
  }

  // Check specific relationships
  console.log('\n🔗 Checking relationships...');

  // Get a gestionnaire user
  const { data: gestionnaire } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'gestionnaire')
    .limit(1)
    .single();

  if (gestionnaire) {
    console.log('\n📌 Testing with gestionnaire:', gestionnaire.name);
    console.log('  User ID:', gestionnaire.id);
    console.log('  Auth ID:', gestionnaire.auth_user_id);

    // Check if this user has team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('*')
      .eq('user_id', gestionnaire.id);

    console.log('  Memberships by user_id:', membership?.length || 0);
    if (membership?.length > 0) {
      console.log('    Team IDs:', membership.map(m => m.team_id));
    }

    // Check if buildings are associated with those teams
    if (membership?.length > 0) {
      const teamId = membership[0].team_id;
      const { data: teamBuildings } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('team_id', _teamId);

      console.log(`  Buildings for team ${teamId}:`, teamBuildings?.length || 0);
      if (teamBuildings?.length > 0) {
        teamBuildings.forEach(b => console.log(`    - ${b.name} (${b.id})`));
      }
    }
  }
}

checkData().catch(console.error);