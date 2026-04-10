-- =========================================
-- FIX: Remove wrong UNIQUE constraints on doctor_availability
-- Only the composite (doctor + day) should be unique
-- =========================================

-- Drop the individual UNIQUE constraints (they were created by mistake)
ALTER TABLE doctor_availability DROP CONSTRAINT IF EXISTS doctor_availability_medical_syndicate_id_card_key;
ALTER TABLE doctor_availability DROP CONSTRAINT IF EXISTS doctor_availability_day_of_week_key;

-- The composite constraint "unique_doctor_day" is correct and stays
-- UNIQUE(medical_syndicate_id_card, day_of_week)

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_availability_doctor ON doctor_availability(medical_syndicate_id_card);
CREATE INDEX IF NOT EXISTS idx_availability_day ON doctor_availability(day_of_week);
