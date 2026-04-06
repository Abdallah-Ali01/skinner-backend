-- =========================================
-- SKINNER MIGRATION FIX
-- Clear orphaned chat_message data, then add FK
-- =========================================

-- Existing chat_message rows reference old chat_analysis IDs.
-- Since the new chat table is empty, these messages are orphaned.
-- Clear them so the FK constraint can be added.
TRUNCATE TABLE chat_message;

-- Now add the FK to the new chat table
ALTER TABLE chat_message ADD CONSTRAINT chat_message_chat_id_fkey
    FOREIGN KEY (chat_id) REFERENCES chat(chat_id) ON DELETE CASCADE;

-- Allow NULL message_text (for file-only messages)
ALTER TABLE chat_message ALTER COLUMN message_text DROP NOT NULL;

-- Clean up report: drop chat_id, fix FKs
ALTER TABLE report DROP COLUMN IF EXISTS chat_id;

ALTER TABLE report DROP CONSTRAINT IF EXISTS report_appointment_id_fkey;
ALTER TABLE report ADD CONSTRAINT report_appointment_id_fkey
    FOREIGN KEY (appointment_id) REFERENCES appointment(appointment_id) ON DELETE CASCADE;

ALTER TABLE report DROP CONSTRAINT IF EXISTS report_patient_id_fkey;
ALTER TABLE report ADD CONSTRAINT report_patient_id_fkey
    FOREIGN KEY (patient_id) REFERENCES patient(patient_id) ON DELETE CASCADE;

ALTER TABLE report DROP CONSTRAINT IF EXISTS report_medical_syndicate_id_card_fkey;
ALTER TABLE report ADD CONSTRAINT report_medical_syndicate_id_card_fkey
    FOREIGN KEY (medical_syndicate_id_card) REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE;

ALTER TABLE report ADD CONSTRAINT unique_report_appointment UNIQUE (appointment_id);

-- Fix admin_role to NOT NULL
ALTER TABLE admin ALTER COLUMN admin_role SET NOT NULL;

-- Fix password_reset.reset_code to NOT NULL
ALTER TABLE password_reset ALTER COLUMN reset_code SET NOT NULL;

-- New indexes
CREATE INDEX IF NOT EXISTS idx_chat_appointment_id ON chat(appointment_id);
CREATE INDEX IF NOT EXISTS idx_chat_patient_id ON chat(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_doctor_id ON chat(medical_syndicate_id_card);
CREATE INDEX IF NOT EXISTS idx_appointment_analysis_id ON appointment(analysis_id);
CREATE INDEX IF NOT EXISTS idx_report_appointment_id ON report(appointment_id);
