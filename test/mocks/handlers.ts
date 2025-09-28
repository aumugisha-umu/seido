import { http, HttpResponse } from 'msw'
import { mockUsers, mockInterventions, mockBuildings, mockLots } from './data'

export const handlers = [
  // Auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUsers.gestionnaire
    })
  }),

  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      id: mockUsers.gestionnaire.id,
      email: mockUsers.gestionnaire.email,
      user_metadata: {
        name: mockUsers.gestionnaire.name,
        role: mockUsers.gestionnaire.role
      }
    })
  }),

  // Users endpoints
  http.get('*/rest/v1/users', ({ request }) => {
    const url = new URL(request.url)
    const role = url.searchParams.get('role')

    if (role) {
      const filteredUsers = Object.values(mockUsers).filter(user => user.role === role)
      return HttpResponse.json(filteredUsers)
    }

    return HttpResponse.json(Object.values(mockUsers))
  }),

  // Interventions endpoints
  http.get('*/rest/v1/interventions', ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    const role = url.searchParams.get('role')

    let filteredInterventions = mockInterventions

    if (userId && role) {
      filteredInterventions = mockInterventions.filter(intervention => {
        switch (role) {
          case 'gestionnaire':
            return intervention.manager_id === userId
          case 'prestataire':
            return intervention.assigned_provider_id === userId
          case 'locataire':
            return intervention.tenant_id === userId
          case 'admin':
            return true
          default:
            return false
        }
      })
    }

    return HttpResponse.json(filteredInterventions)
  }),

  http.post('*/rest/v1/interventions', async ({ request }) => {
    const newIntervention = await request.json()
    const intervention = {
      id: `new-intervention-${Date.now()}`,
      reference: `INT-${Date.now()}`,
      status: 'nouvelle-demande',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...newIntervention
    }
    return HttpResponse.json(intervention, { status: 201 })
  }),

  http.patch('*/rest/v1/interventions/:id', async ({ request, params }) => {
    const updates = await request.json()
    const interventionId = params.id

    const existingIntervention = mockInterventions.find(i => i.id === interventionId)
    if (!existingIntervention) {
      return HttpResponse.json({ error: 'Intervention not found' }, { status: 404 })
    }

    const updatedIntervention = {
      ...existingIntervention,
      ...updates,
      updated_at: new Date().toISOString()
    }

    return HttpResponse.json(updatedIntervention)
  }),

  // Buildings endpoints
  http.get('*/rest/v1/buildings', ({ request }) => {
    const url = new URL(request.url)
    const managerId = url.searchParams.get('manager_id')

    let filteredBuildings = mockBuildings

    if (managerId) {
      filteredBuildings = mockBuildings.filter(building => building.manager_id === managerId)
    }

    return HttpResponse.json(filteredBuildings)
  }),

  // Lots endpoints
  http.get('*/rest/v1/lots', ({ request }) => {
    const url = new URL(request.url)
    const buildingId = url.searchParams.get('building_id')
    const tenantId = url.searchParams.get('tenant_id')

    let filteredLots = mockLots

    if (buildingId) {
      filteredLots = filteredLots.filter(lot => lot.building_id === buildingId)
    }

    if (tenantId) {
      filteredLots = filteredLots.filter(lot => lot.tenant_id === tenantId)
    }

    return HttpResponse.json(filteredLots)
  }),

  // Notifications endpoints
  http.get('*/rest/v1/notifications', ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')

    return HttpResponse.json([
      {
        id: 'notif-1',
        user_id: userId,
        type: 'intervention_created',
        title: 'Nouvelle intervention',
        message: 'Une nouvelle intervention a été créée',
        read: false,
        created_at: new Date().toISOString()
      }
    ])
  }),

  // Quotes endpoints
  http.get('*/rest/v1/quotes', ({ request }) => {
    const url = new URL(request.url)
    const interventionId = url.searchParams.get('intervention_id')
    const providerId = url.searchParams.get('provider_id')

    return HttpResponse.json([
      {
        id: 'quote-1',
        intervention_id: interventionId,
        provider_id: providerId,
        amount: 150.00,
        description: 'Réparation plomberie',
        status: 'en_attente',
        created_at: new Date().toISOString()
      }
    ])
  }),

  // Availabilities endpoints
  http.get('*/rest/v1/availabilities', ({ request }) => {
    const url = new URL(request.url)
    const providerId = url.searchParams.get('provider_id')

    return HttpResponse.json([
      {
        id: 'availability-1',
        provider_id: providerId,
        date: '2024-12-15',
        start_time: '09:00:00',
        end_time: '17:00:00',
        is_available: true,
        created_at: new Date().toISOString()
      }
    ])
  }),

  // Teams endpoints
  http.get('*/rest/v1/teams', () => {
    return HttpResponse.json([
      {
        id: 'team-1',
        name: 'Équipe Test',
        description: 'Équipe de test',
        created_by: mockUsers.admin.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
  }),

  // File upload endpoints
  http.post('*/storage/v1/object/:bucket/*', () => {
    return HttpResponse.json({
      Key: 'mock-file-key',
      Id: 'mock-file-id'
    })
  }),

  // Catch-all for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { error: `Unhandled ${request.method} request to ${request.url}` },
      { status: 404 }
    )
  })
]
