-- =========================================
-- ONE-TIME FIX: Insert missing Clinical Summary Cards
-- for confirmed/completed appointments that were blocked
-- by the old duplicate check.
--
-- Run this ONCE on the VPS:
--   psql "$DATABASE_URL" -f fix_missing_cards.sql
-- =========================================

-- Step 1: Preview which appointments are missing their card
-- (Run this SELECT first to see what will be inserted)

SELECT
  a.appointment_id,
  a.patient_id,
  a.medical_syndicate_id_card,
  a.status AS appt_status,
  c.chat_id,
  p.age,
  p.gender,
  an.skin_disease_classification,
  an.analysis,
  an.skin_image_upload,
  an.created_at AS analysis_date
FROM appointment a
JOIN payment pay ON a.appointment_id = pay.appointment_id
JOIN chat c ON a.patient_id = c.patient_id
           AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
JOIN patient p ON a.patient_id = p.patient_id
JOIN analysis an ON a.analysis_id = an.analysis_id
WHERE a.status IN ('confirmed', 'completed')
  AND an.skin_image_upload IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_message cm
    WHERE cm.chat_id = c.chat_id
      AND cm.sender_role = 'system'
      AND cm.original_filename = 'skin_analysis.jpg'
      AND cm.message_text LIKE '%Appointment: ' || a.appointment_id::text || '%'
  )
ORDER BY a.date DESC;


-- Step 2: Insert the missing cards
-- (Uncomment the block below after verifying Step 1 output looks correct)

/*
INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, file_url, original_filename, sent_at)
SELECT
  gen_random_uuid(),
  c.chat_id,
  'system',
  'system',
  '📋 CLINICAL SUMMARY CARD' || E'\n' ||
  'Appointment: ' || a.appointment_id::text || E'\n' ||
  'Patient: ' ||
    COALESCE(INITCAP(p.gender), 'N/A') || ', ' || COALESCE(p.age::text, 'N/A') || E'\n' ||
  'AI Prediction: ' || COALESCE(an.skin_disease_classification, 'N/A') || E'\n' ||
  'Confidence: ' || COALESCE(
    (regexp_match(an.analysis, 'Confidence\s*:\s*([0-9.]+)', 'i'))[1],
    'N/A'
  ) || E'\n' ||
  'Analysis Date: ' || TO_CHAR(COALESCE(an.created_at, NOW()), 'Mon DD, YYYY') || E'\n' ||
  'Scan URL: ' || an.skin_image_upload,
  'image',
  an.skin_image_upload,
  'skin_analysis.jpg',
  COALESCE(pay.transaction_date, NOW())
FROM appointment a
JOIN payment pay ON a.appointment_id = pay.appointment_id
JOIN chat c ON a.patient_id = c.patient_id
           AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
JOIN patient p ON a.patient_id = p.patient_id
JOIN analysis an ON a.analysis_id = an.analysis_id
WHERE a.status IN ('confirmed', 'completed')
  AND an.skin_image_upload IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_message cm
    WHERE cm.chat_id = c.chat_id
      AND cm.sender_role = 'system'
      AND cm.original_filename = 'skin_analysis.jpg'
      AND cm.message_text LIKE '%Appointment: ' || a.appointment_id::text || '%'
  );
*/
