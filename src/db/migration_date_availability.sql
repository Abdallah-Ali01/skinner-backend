-- Migration: Create doctor_date_availability table for per-date scheduling
-- Instead of day_of_week (weekly recurring), this stores availability for specific dates.

CREATE TABLE IF NOT EXISTS doctor_date_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_syndicate_id_card VARCHAR(100) NOT NULL
        REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INT NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT dda_slot_duration_positive CHECK (slot_duration_minutes > 0 AND slot_duration_minutes <= 120)
);

-- Index for fast lookups by doctor + date range
CREATE INDEX IF NOT EXISTS idx_dda_doctor_date
    ON doctor_date_availability (medical_syndicate_id_card, available_date);
