-- Migration: Disable legacy assignment notification trigger
-- Date: 2025-11-22
-- Reason: The trigger creates duplicate notifications with old format "Nouvelle assignation: INT-XXX"
--         The new NotificationService (email system) handles all notifications properly

-- Drop the trigger that automatically creates notifications on intervention_assignments INSERT
DROP TRIGGER IF EXISTS assignments_notify ON intervention_assignments;

-- Drop the associated function
DROP FUNCTION IF EXISTS notify_intervention_assignment();

-- Note: The new system handles intervention notifications via:
-- 1. NotificationService.notifyInterventionCreated() - for initial creation
-- 2. NotificationService.notifyInterventionAssignment() - for manual assignments
-- Both use the modern format: "Nouvelle intervention - Building X - Lot Y"
