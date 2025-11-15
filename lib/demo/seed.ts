/**
 * Seed Data Generator - Génère toutes les données de démonstration
 * Dataset large: 40-50 biens, 150-200 lots, 100+ interventions
 * 80% Belgique + 20% pays frontaliers
 */

import { faker } from '@faker-js/faker'
import { DemoDataStore } from './store/demo-data-store'
import * as factories from './factories'

/**
 * Générer le dataset complet de démonstration
 */
export function generateDemoData(store: DemoDataStore) {
  console.log('🌱 Generating demo data...')

  // 1. Créer l'équipe principale
  const team = factories.createTeam({
    id: 'demo-team-001',
    name: 'Immobilière Benelux SPRL',
    description: 'Société de gestion immobilière basée à Bruxelles'
  })

  // 2. Créer les utilisateurs
  const gestionnaires = [
    factories.createUser('gestionnaire', {
      id: 'demo-gest-001',
      first_name: 'Jean',
      last_name: 'Dupont',
      name: 'Jean Dupont',
      email: 'jean.dupont@seido-demo.be',
      team_id: team.id
    }),
    factories.createUser('gestionnaire', {
      id: 'demo-gest-002',
      first_name: 'Sophie',
      last_name: 'Van der Linden',
      name: 'Sophie Van der Linden',
      email: 'sophie.vanderlinden@seido-demo.be',
      team_id: team.id
    }),
    factories.createUser('gestionnaire', {
      id: 'demo-gest-003',
      first_name: 'Marc',
      last_name: 'Janssens',
      name: 'Marc Janssens',
      email: 'marc.janssens@seido-demo.be',
      team_id: team.id
    })
  ]

  const locataires = [
    factories.createUser('locataire', {
      id: 'demo-loc-001',
      first_name: 'Marie',
      last_name: 'Dubois',
      name: 'Marie Dubois',
      email: 'marie.dubois@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-002',
      first_name: 'Pierre',
      last_name: 'Lambert',
      name: 'Pierre Lambert',
      email: 'pierre.lambert@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-003',
      first_name: 'Isabelle',
      last_name: 'Martin',
      name: 'Isabelle Martin',
      email: 'isabelle.martin@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-004',
      first_name: 'Luc',
      last_name: 'Peeters',
      name: 'Luc Peeters',
      email: 'luc.peeters@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-005',
      first_name: 'Anne',
      last_name: 'Willems',
      name: 'Anne Willems',
      email: 'anne.willems@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-006',
      first_name: 'Tom',
      last_name: 'De Smet',
      name: 'Tom De Smet',
      email: 'tom.desmet@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-007',
      first_name: 'Emma',
      last_name: 'Claes',
      name: 'Emma Claes',
      email: 'emma.claes@example.com',
      team_id: team.id
    }),
    factories.createUser('locataire', {
      id: 'demo-loc-008',
      first_name: 'Koen',
      last_name: 'Wouters',
      name: 'Koen Wouters',
      email: 'koen.wouters@example.com',
      team_id: team.id
    })
  ]

  const prestataires = [
    factories.createUser('prestataire', {
      id: 'demo-prest-001',
      name: 'Plomberie Bruxelloise SPRL',
      email: 'contact@plomberie-bruxelloise.be',
      company: 'Plomberie Bruxelloise SPRL',
      provider_category: 'plombier',
      team_id: team.id
    }),
    factories.createUser('prestataire', {
      id: 'demo-prest-002',
      name: 'Électricité Liégeoise SA',
      email: 'info@elec-liege.be',
      company: 'Électricité Liégeoise SA',
      provider_category: 'electricien',
      team_id: team.id
    }),
    factories.createUser('prestataire', {
      id: 'demo-prest-003',
      name: 'Chauffage Expert Anvers',
      email: 'service@chauffage-expert.be',
      company: 'Chauffage Expert Anvers',
      provider_category: 'chauffagiste',
      team_id: team.id
    }),
    factories.createUser('prestataire', {
      id: 'demo-prest-004',
      name: 'Menuiserie Wallonne SPRL',
      email: 'contact@menuiserie-wallonne.be',
      company: 'Menuiserie Wallonne SPRL',
      provider_category: 'menuisier',
      team_id: team.id
    }),
    factories.createUser('prestataire', {
      id: 'demo-prest-005',
      name: 'Peinture & Décoration Gand',
      email: 'info@peinture-gand.be',
      company: 'Peinture & Décoration Gand',
      provider_category: 'peintre',
      team_id: team.id
    })
  ]

  const admin = factories.createUser('admin', {
    id: 'demo-admin-001',
    first_name: 'Admin',
    last_name: 'SEIDO',
    name: 'Admin SEIDO',
    email: 'admin@seido-demo.be',
    team_id: team.id
  })

  const allUsers = [...gestionnaires, ...locataires, ...prestataires, admin]

  // 3. Créer les team_members
  const teamMembers = allUsers.map(user =>
    factories.createTeamMember(team.id, user.id, user.role as any)
  )

  // 4. Créer les immeubles (12 total: 10 BE + 2 frontaliers)
  const buildings = []
  for (let i = 0; i < 12; i++) {
    buildings.push(factories.createBuilding(team.id))
  }

  // 5. Créer les lots (24-36 total) + lot_contacts
  const lots = []
  const lotContacts = []
  let lotIndex = 0

  buildings.forEach(building => {
    const lotsPerBuilding = faker.number.int({ min: 2, max: 3 })

    for (let i = 0; i < lotsPerBuilding; i++) {
      const reference = `${i + 1}${faker.helpers.arrayElement(['A', 'B', 'C', 'D'])}`
      const lot = factories.createLot(building.id, team.id, reference)
      lots.push(lot)

      // 70% des lots sont occupés
      if (faker.datatype.boolean(0.7) && lotIndex < locataires.length) {
        const tenant = locataires[lotIndex % locataires.length]
        lotContacts.push(factories.createLotContact(lot.id, tenant.id, true))
        lotIndex++
      }
    }
  })

  console.log(`✅ Generated ${buildings.length} buildings, ${lots.length} lots`)

  // 6. Créer les interventions (120 total) + assignments
  const interventions = []
  const interventionAssignments = []
  const quotes = []

  // Distribution des statuts
  const statusDistribution = [
    ...Array(18).fill('demande'),                           // 15%
    ...Array(12).fill('approuvee'),                         // 10%
    ...Array(14).fill('demande_de_devis'),                  // 12%
    ...Array(10).fill('planification'),                     // 8%
    ...Array(12).fill('planifiee'),                         // 10%
    ...Array(18).fill('en_cours'),                          // 15%
    ...Array(30).fill('cloturee_par_gestionnaire'),         // 25%
    ...Array(6).fill('annulee')                             // 5%
  ]

  for (let i = 0; i < 120; i++) {
    // Sélectionner un lot aléatoire
    const lot = faker.helpers.arrayElement(lots)

    // Trouver le locataire de ce lot (s'il y en a un)
    const lotContact = lotContacts.find(lc => lc.lot_id === lot.id)
    const tenant = lotContact
      ? allUsers.find(u => u.id === lotContact.user_id)
      : faker.helpers.arrayElement(locataires)

    const gestionnaire = faker.helpers.arrayElement(gestionnaires)
    const prestataire = faker.helpers.arrayElement(prestataires)

    const status = statusDistribution[i % statusDistribution.length]

    const intervention = factories.createIntervention(
      lot.id,
      lot.building_id,
      team.id,
      tenant?.id || locataires[0].id,
      { status }
    )

    interventions.push(intervention)

    // Créer les assignments
    interventionAssignments.push(
      factories.createInterventionAssignment(intervention.id, tenant?.id || locataires[0].id, 'locataire', true),
      factories.createInterventionAssignment(intervention.id, gestionnaire.id, 'gestionnaire', true),
      factories.createInterventionAssignment(intervention.id, prestataire.id, 'prestataire', false)
    )

    // Créer un devis pour les interventions aux statuts avancés
    if (['demande_de_devis', 'planifiee', 'en_cours', 'cloturee_par_gestionnaire'].includes(status)) {
      quotes.push(factories.createQuote(intervention.id, prestataire.id, team.id))
    }
  }

  console.log(`✅ Generated ${interventions.length} interventions, ${quotes.length} quotes`)

  // 7. Créer des building_contacts (gestionnaires assignés aux immeubles)
  const buildingContacts = []
  buildings.forEach((building, index) => {
    // Chaque immeuble a un gestionnaire principal
    const gestionnaire = gestionnaires[index % gestionnaires.length]
    buildingContacts.push(factories.createBuildingContact(building.id, gestionnaire.id, 'gestionnaire'))
  })

  // 8. Créer les companies (prestataires)
  const companies = prestataires.map(prest =>
    factories.createCompany({
      id: `company-${prest.id}`,
      team_id: team.id,
      name: prest.company || prest.name,
      email: prest.email,
      phone: prest.phone,
      specialties: [prest.provider_category]
    })
  )

  // 9. Créer les company_members
  const companyMembers = prestataires.map((prest, index) =>
    factories.createCompanyMember(companies[index].id, prest.id, 'owner')
  )

  // 10. Créer des time_slots pour les interventions planifiées
  const timeSlots = []
  interventions.forEach(intervention => {
    if (['planification', 'planifiee', 'en_cours', 'cloturee_par_gestionnaire'].includes(intervention.status)) {
      // 1 à 3 créneaux proposés
      const slotCount = faker.number.int({ min: 1, max: 3 })
      for (let i = 0; i < slotCount; i++) {
        const startDate = faker.date.future({ years: 0.1 })
        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // +2h

        const status = i === 0 && intervention.status !== 'planification' ? 'accepted' :
                      i === 1 ? 'rejected' : 'proposed'

        timeSlots.push(
          factories.createTimeSlot(
            intervention.id,
            startDate.toISOString(),
            endDate.toISOString(),
            status,
            gestionnaires[0].id
          )
        )
      }
    }
  })

  // 11. Créer des conversation threads + messages
  const conversationThreads = []
  const conversationMessages = []

  interventions.forEach((intervention, index) => {
    // 30% des interventions ont des conversations
    if (faker.datatype.boolean(0.3)) {
      const thread = factories.createConversationThread(intervention.id, team.id)
      conversationThreads.push(thread)

      // 3 à 10 messages par thread
      const messageCount = faker.number.int({ min: 3, max: 10 })
      const participants = interventionAssignments
        .filter((a: any) => a.intervention_id === intervention.id)
        .map((a: any) => a.user_id)

      for (let i = 0; i < messageCount; i++) {
        const sender = allUsers.find(u => u.id === participants[i % participants.length])
        if (sender) {
          conversationMessages.push(
            factories.createConversationMessage(
              thread.id,
              sender.id,
              faker.lorem.sentence({ min: 5, max: 20 })
            )
          )
        }
      }
    }
  })

  // 12. Créer des comments sur les interventions
  const interventionComments = []
  interventions.forEach(intervention => {
    // 40% des interventions ont des commentaires
    if (faker.datatype.boolean(0.4)) {
      const commentCount = faker.number.int({ min: 1, max: 5 })
      const participants = interventionAssignments
        .filter((a: any) => a.intervention_id === intervention.id)
        .map((a: any) => a.user_id)

      for (let i = 0; i < commentCount; i++) {
        const commenter = allUsers.find(u => u.id === participants[i % participants.length])
        if (commenter) {
          interventionComments.push(
            factories.createInterventionComment(
              intervention.id,
              commenter.id,
              faker.lorem.sentences({ min: 1, max: 3 }),
              faker.datatype.boolean(0.2) // 20% commentaires internes
            )
          )
        }
      }
    }
  })

  // 13. Créer des notifications variées (50+ notifications)
  const notifications = []

  // Notifications pour chaque utilisateur
  allUsers.forEach(user => {
    const notifCount = faker.number.int({ min: 3, max: 8 })
    for (let i = 0; i < notifCount; i++) {
      const types = ['intervention', 'message', 'document', 'system'] as const
      const type = faker.helpers.arrayElement(types)

      let title = ''
      let content = ''

      switch (type) {
        case 'intervention':
          title = 'Nouvelle intervention'
          content = 'Une nouvelle intervention a été créée dans votre immeuble.'
          break
        case 'message':
          title = 'Nouveau message'
          content = 'Vous avez reçu un nouveau message.'
          break
        case 'document':
          title = 'Nouveau document'
          content = 'Un nouveau document a été ajouté.'
          break
        case 'system':
          title = 'Mise à jour système'
          content = 'Le système a été mis à jour.'
          break
      }

      notifications.push(
        factories.createNotification(
          user.id,
          team.id,
          type,
          title,
          content,
          faker.datatype.boolean(0.6) // 60% déjà lus
        )
      )
    }
  })

  // Quelques notifications d'équipe
  for (let i = 0; i < 10; i++) {
    notifications.push(
      factories.createNotification(
        null, // notification d'équipe (pas d'user_id)
        team.id,
        'team',
        'Annonce importante',
        'Une annonce importante pour toute l\'équipe.',
        false
      )
    )
  }

  // 14. Créer des activity logs (100+ logs)
  const activityLogs = []

  // Logs pour les interventions
  interventions.forEach(intervention => {
    const assignment = interventionAssignments.find((a: any) => a.intervention_id === intervention.id)
    const userId = assignment?.user_id || gestionnaires[0].id

    // Log de création
    activityLogs.push(
      factories.createActivityLog({
        team_id: team.id,
        user_id: userId,
        entity_type: 'intervention',
        entity_id: intervention.id,
        action: 'created',
        details: { status: 'demande' }
      })
    )

    // Logs de changements de statut
    if (intervention.status !== 'demande') {
      const statusChanges = ['approuvee', 'planifiee', 'en_cours']
      statusChanges.forEach(status => {
        if (intervention.status === status ||
            (intervention.status === 'cloturee_par_gestionnaire' && statusChanges.indexOf(status) >= 0)) {
          activityLogs.push(
            factories.createActivityLog({
              team_id: team.id,
              user_id: gestionnaires[0].id,
              entity_type: 'intervention',
              entity_id: intervention.id,
              action: 'status_changed',
              details: { from: statusChanges[statusChanges.indexOf(status) - 1] || 'demande', to: status }
            })
          )
        }
      })
    }
  })

  // Logs pour les buildings
  buildings.forEach((building, index) => {
    if (index < 20) { // Logs pour 20 premiers immeubles
      activityLogs.push(
        factories.createActivityLog({
          team_id: team.id,
          user_id: gestionnaires[index % gestionnaires.length].id,
          entity_type: 'building',
          entity_id: building.id,
          action: 'created',
          details: { name: building.name }
        })
      )
    }
  })

  // Logs pour les lots
  lots.forEach((lot, index) => {
    if (index < 30) { // Logs pour 30 premiers lots
      activityLogs.push(
        factories.createActivityLog({
          team_id: team.id,
          user_id: gestionnaires[index % gestionnaires.length].id,
          entity_type: 'lot',
          entity_id: lot.id,
          action: 'created',
          details: { reference: lot.reference }
        })
      )
    }
  })

  // 15. Créer des invitations (10 invitations en attente)
  const userInvitations = []
  for (let i = 0; i < 10; i++) {
    const role = faker.helpers.arrayElement(['locataire', 'prestataire', 'gestionnaire'] as const)
    const email = faker.internet.email()
    const status = faker.helpers.arrayElement(['pending', 'pending', 'pending', 'accepted', 'rejected'] as const) // 60% pending

    userInvitations.push(
      factories.createUserInvitation({
        team_id: team.id,
        email,
        role,
        invited_by: gestionnaires[0].id,
        status
      })
    )
  }

  // 16. Insérer toutes les données dans le store
  store.seed({
    teams: [team],
    users: allUsers,
    team_members: teamMembers,
    buildings,
    lots,
    lot_contacts: lotContacts,
    building_contacts: buildingContacts,
    interventions,
    intervention_assignments: interventionAssignments,
    intervention_quotes: quotes,
    intervention_comments: interventionComments,
    intervention_time_slots: timeSlots,
    notifications,
    activity_logs: activityLogs,
    conversation_threads: conversationThreads,
    conversation_messages: conversationMessages,
    companies,
    company_members: companyMembers,
    user_invitations: userInvitations
  })

  console.log('✅ Demo data generated successfully!')
  console.log(`   📊 DATASET COMPLET:`)
  console.log(`   - ${allUsers.length} users (${gestionnaires.length} gestionnaires, ${locataires.length} locataires, ${prestataires.length} prestataires)`)
  console.log(`   - ${buildings.length} buildings`)
  console.log(`   - ${lots.length} lots`)
  console.log(`   - ${interventions.length} interventions`)
  console.log(`   - ${quotes.length} quotes`)
  console.log(`   - ${timeSlots.length} time slots`)
  console.log(`   - ${conversationThreads.length} conversation threads`)
  console.log(`   - ${conversationMessages.length} messages`)
  console.log(`   - ${interventionComments.length} comments`)
  console.log(`   - ${notifications.length} notifications`)
  console.log(`   - ${activityLogs.length} activity logs`)
  console.log(`   - ${companies.length} companies`)
  console.log(`   - ${userInvitations.length} invitations`)

  return {
    team,
    users: allUsers,
    buildings,
    lots,
    interventions
  }
}
