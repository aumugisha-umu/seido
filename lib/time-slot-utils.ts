/**
 * Time Slot Analysis Utilities
 * 
 * Helper functions to analyze intervention time slots and determine
 * the appropriate actions and UI states based on slot status.
 */

export interface TimeSlot {
    id: string
    slot_date: string
    start_time: string
    end_time: string
    status?: string
    proposed_by?: string
}

export interface TimeSlotAnalysis {
    hasPendingSlots: boolean      // Provider-created slots awaiting manager action
    hasRequestedSlots: boolean    // Manager-proposed slots awaiting provider confirmation
    hasConfirmedSlots: boolean    // Confirmed slots
    hasAcceptedSlots: boolean     // Accepted slots
    totalSlots: number
    pendingSlots: TimeSlot[]
    requestedSlots: TimeSlot[]
}

/**
 * Analyzes time slots to determine their current state
 * 
 * @param timeSlots - Array of time slots to analyze
 * @param userId - Optional user ID to filter slots by proposer
 * @returns Analysis object with slot status information
 */
export function analyzeTimeSlots(
    timeSlots: TimeSlot[] = [],
    _userId?: string // Reserved for future filtering by proposer
): TimeSlotAnalysis {
    const pendingSlots = timeSlots.filter(s => s.status === 'pending')
    const requestedSlots = timeSlots.filter(s => s.status === 'requested')
    const confirmedSlots = timeSlots.filter(s => s.status === 'confirmed')
    const acceptedSlots = timeSlots.filter(s => s.status === 'accepted')

    return {
        hasPendingSlots: pendingSlots.length > 0,
        hasRequestedSlots: requestedSlots.length > 0,
        hasConfirmedSlots: confirmedSlots.length > 0,
        hasAcceptedSlots: acceptedSlots.length > 0,
        totalSlots: timeSlots.length,
        pendingSlots,
        requestedSlots
    }
}

/**
 * Determines the appropriate action button for a prestataire based on time slot status
 * 
 * @param analysis - Time slot analysis result
 * @returns Action key to display
 */
export function getProviderActionForTimeSlots(analysis: TimeSlotAnalysis):
    'confirm_availabilities' | 'modify_availabilities' | 'add_availabilities' {

    if (analysis.hasRequestedSlots) {
        // Manager has proposed slots, provider needs to confirm
        return 'confirm_availabilities'
    } else if (analysis.hasPendingSlots) {
        // Provider has created slots, can modify them
        return 'modify_availabilities'
    } else {
        // No slots yet, can add
        return 'add_availabilities'
    }
}

/**
 * Gets the label for the provider action button
 * 
 * @param actionKey - Action key from getProviderActionForTimeSlots
 * @returns Button label text
 */
export function getProviderActionLabel(
    actionKey: 'confirm_availabilities' | 'modify_availabilities' | 'add_availabilities'
): string {
    const labels = {
        confirm_availabilities: 'Confirmer disponibilités',
        modify_availabilities: 'Modifier la planification',
        add_availabilities: 'Ajouter mes disponibilités'
    }

    return labels[actionKey]
}
