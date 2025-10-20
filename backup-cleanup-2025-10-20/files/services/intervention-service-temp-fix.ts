// TEMPORARY FIX - Version without selected_slot_id until migration is applied

    // ============================================================================
    // STEP 3: Update intervention SCHEDULED DATE ONLY (selected_slot_id doesn't exist yet)
    // ============================================================================
    logger.info('🔄 [STEP 3] Updating intervention scheduled_date...')

    // Construct proper timestamp from slot_date (DATE) and start_time (TIME)
    // slot.slot_date is like "2025-10-20" and slot.start_time is like "14:30:00"
    const scheduledTimestamp = `${slot.slot_date}T${slot.start_time}`

    logger.info('📅 [STEP 3] Constructing timestamp:', {
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      constructed_timestamp: scheduledTimestamp
    })

    let dateUpdateSuccess = false
    const { error: dateUpdateError } = await supabase
      .from('interventions')
      .update({
        scheduled_date: scheduledTimestamp
        // REMOVED: selected_slot_id: slotId  -- Column doesn't exist yet!
      })
      .eq('id', id)

    if (dateUpdateError) {
      // Extract ALL error properties explicitly for Pino serialization
      const extractedError = {
        err_message: dateUpdateError.message || null,
        err_code: dateUpdateError.code || null,
        err_details: dateUpdateError.details || null,
        err_hint: dateUpdateError.hint || null
      }

      // Extract any additional properties dynamically
      if (dateUpdateError && typeof dateUpdateError === 'object') {
        Object.keys(dateUpdateError).forEach(key => {
          if (!['message', 'code', 'details', 'hint'].includes(key)) {
            extractedError[`err_${key}`] = dateUpdateError[key]
          }
        })
      }

      logger.error('❌ [STEP 3] Failed to update intervention date (slot already updated ✅):', {
        interventionId: id,
        attempted_update: {
          scheduled_date: scheduledTimestamp
        },
        slot_date: slot.slot_date,
        slot_start_time: slot.start_time,
        constructed_timestamp: scheduledTimestamp,
        ...extractedError
      })
      // Continue anyway - slot is already updated which is the most important
    } else {
      dateUpdateSuccess = true
      logger.info('✅ [STEP 3] Intervention scheduled_date updated')
    }