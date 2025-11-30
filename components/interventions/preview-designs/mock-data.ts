import { addDays, addHours, format } from 'date-fns'

export const mockManagers = [
    { id: '1', name: 'Jean Dupont', email: 'jean.dupont@syndic.com', type: 'gestionnaire' as const, phone: '06 12 34 56 78' }
]

export const mockProviders = [
    { id: '2', name: 'Plomberie Express', email: 'contact@plomberie-express.fr', type: 'prestataire' as const }
]

export const mockTenants = [
    { id: '3', name: 'Sophie Martin', email: 'sophie.martin@email.com', type: 'locataire' as const },
    { id: '4', name: 'Marc Dubois', email: 'marc.dubois@email.com', type: 'locataire' as const }
]

export const mockQuotes = [
    {
        id: 'q1',
        intervention_id: 'i1',
        provider_id: '2',
        amount: 150.00,
        status: 'sent',
        created_at: new Date().toISOString(),
        provider: { id: '2', name: 'Plomberie Express', email: 'contact@plomberie-express.fr', role: 'prestataire' }
    },
    {
        id: 'q2',
        intervention_id: 'i1',
        provider_id: '3',
        amount: 0, // Pending quote
        status: 'pending',
        created_at: new Date().toISOString(),
        provider: { id: '5', name: 'Elec 2000', email: 'contact@elec2000.fr', role: 'prestataire' }
    }
]

const today = new Date()
const tomorrow = addDays(today, 1)

export const mockTimeSlots = [
    {
        id: 'ts1',
        intervention_id: 'i1',
        slot_date: format(tomorrow, 'yyyy-MM-dd'),
        start_time: '09:00:00',
        end_time: '11:00:00',
        status: 'pending',
        proposed_by: '2',
        proposed_by_user: { id: '2', name: 'Plomberie Express', role: 'prestataire' },
        responses: [
            { id: 'r1', time_slot_id: 'ts1', user_id: '3', response: 'accepted', user_role: 'locataire', user: { name: 'Sophie Martin' } },
            { id: 'r2', time_slot_id: 'ts1', user_id: '1', response: 'pending', user_role: 'gestionnaire', user: { name: 'Jean Dupont' } }
        ]
    },
    {
        id: 'ts2',
        intervention_id: 'i1',
        slot_date: format(tomorrow, 'yyyy-MM-dd'),
        start_time: '14:00:00',
        end_time: '16:00:00',
        status: 'pending',
        proposed_by: '2',
        proposed_by_user: { id: '2', name: 'Plomberie Express', role: 'prestataire' },
        responses: [
            { id: 'r3', time_slot_id: 'ts2', user_id: '3', response: 'rejected', notes: 'Pas disponible', user_role: 'locataire', user: { name: 'Sophie Martin' } }
        ]
    }
]

export const mockDescription = "Fuite d'eau importante dans la salle de bain, au niveau du robinet de la baignoire. L'eau coule en continu même lorsque le robinet est fermé."

export const mockInstructions = "Merci de contacter le locataire avant de venir pour confirmer sa présence. Le code d'entrée est 1234A."

export const mockComments = [
    { id: 'c1', author: 'Jean Dupont', content: 'J\'ai notifié le locataire de votre passage.', date: new Date().toISOString(), role: 'gestionnaire' },
    { id: 'c2', author: 'Plomberie Express', content: 'Bien reçu, je l\'appelle demain matin.', date: new Date().toISOString(), role: 'prestataire' }
]

export const mockTimelineEvents = [
    { id: 'e1', title: 'Demande créée', date: format(addDays(today, -2), 'yyyy-MM-dd'), status: 'completed' as const, description: 'La demande d\'intervention a été créée' },
    { id: 'e2', title: 'Approuvée', date: format(addDays(today, -1), 'yyyy-MM-dd'), status: 'completed' as const, description: 'La demande a été approuvée et peut être planifiée' },
    { id: 'e3', title: 'En planification', date: format(today, 'yyyy-MM-dd'), status: 'current' as const, description: 'L\'intervention est en cours de planification' }
]
