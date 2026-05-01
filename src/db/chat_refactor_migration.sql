-- =========================================
-- CHAT REFACTOR MIGRATION
-- From per-appointment chats → persistent 1-to-1 doctor-patient channels
-- =========================================

-- 1. Add status column (active = can send, locked = read-only)
ALTER TABLE chat ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active';
ALTER TABLE chat ADD CONSTRAINT chat_status_check CHECK (status IN ('active', 'locked'));

-- 2. Add updated_at column
ALTER TABLE chat ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 3. Drop the 1-to-1 appointment constraint (chat now spans multiple appointments)
ALTER TABLE chat DROP CONSTRAINT IF EXISTS chat_appointment_id_key;

-- 4. appointment_id becomes nullable (stores the latest active appointment)
ALTER TABLE chat ALTER COLUMN appointment_id DROP NOT NULL;

-- 5. Enforce one chat per doctor-patient pair
--    If you have existing duplicate chats for the same pair, deduplicate first:
--    This keeps the newest chat and deletes older duplicates.
DELETE FROM chat a USING chat b
WHERE a.patient_id = b.patient_id
  AND a.medical_syndicate_id_card = b.medical_syndicate_id_card
  AND a.created_at < b.created_at;

ALTER TABLE chat ADD CONSTRAINT unique_patient_doctor_chat
    UNIQUE (patient_id, medical_syndicate_id_card);

-- 6. Add 'system' to message_type for auto-generated report messages
--    (Drop old constraint if exists, then add updated one)
ALTER TABLE chat_message DROP CONSTRAINT IF EXISTS chat_message_type_check;
ALTER TABLE chat_message ADD CONSTRAINT chat_message_type_check
    CHECK (message_type IN ('text', 'image', 'file', 'system'));

-- 7. Update indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_chat_patient_doctor ON chat(patient_id, medical_syndicate_id_card);
