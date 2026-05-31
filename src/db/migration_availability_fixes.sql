-- Migration: Availability system fixes
-- 1. Add unique constraint to prevent duplicate date-specific slots
--    (same doctor + date + start_time should never have two rows)

-- First, remove any existing duplicates (keep the latest one)
DELETE FROM doctor_date_availability a
USING doctor_date_availability b
WHERE a.medical_syndicate_id_card = b.medical_syndicate_id_card
  AND a.available_date = b.available_date
  AND a.start_time = b.start_time
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE doctor_date_availability
ADD CONSTRAINT unique_doctor_date_slot
UNIQUE (medical_syndicate_id_card, available_date, start_time);
