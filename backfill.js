require("dotenv").config();
const pool = require("./src/config/database");
const { v4: uuidv4 } = require("uuid");

async function backfill() {
  console.log("Starting backfill for Clinical Summary Cards in existing chats...");
  try {
    // Find all confirmed appointments with a chat that don't have the system scan message
    const appointmentsResult = await pool.query(`
      SELECT 
        a.appointment_id, 
        a.patient_id, 
        a.medical_syndicate_id_card,
        c.chat_id
      FROM appointment a
      JOIN chat c ON a.patient_id = c.patient_id 
        AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
      WHERE a.status = 'confirmed'
    `);

    console.log(`Found ${appointmentsResult.rows.length} confirmed appointments. Checking for missing summary cards...`);

    for (const appt of appointmentsResult.rows) {
      // Check if a system summary message already exists for this chat
      const existing = await pool.query(
        `SELECT 1 FROM chat_message 
         WHERE chat_id = $1 
           AND sender_role = 'system' 
           AND original_filename = 'skin_analysis.jpg' 
         LIMIT 1`,
        [appt.chat_id]
      );

      if (existing.rows.length === 0) {
        console.log(`Chat ${appt.chat_id} is missing a summary card. Fetching patient & analysis info...`);
        
        const detailsResult = await pool.query(
          `SELECT 
             p.age, p.gender, 
             an.skin_image_upload, an.analysis, an.skin_disease_classification, an.created_at
           FROM appointment a
           JOIN patient p ON a.patient_id = p.patient_id
           JOIN analysis an ON a.analysis_id = an.analysis_id
           WHERE a.appointment_id = $1`,
          [appt.appointment_id]
        );

        if (detailsResult.rows.length > 0) {
          const details = detailsResult.rows[0];
          const imageUpload = details.skin_image_upload;

          if (imageUpload) {
            const patientAge = details.age || "N/A";
            const patientGender = details.gender ? (details.gender.charAt(0).toUpperCase() + details.gender.slice(1)) : "N/A";
            const classification = details.skin_disease_classification || "N/A";

            let confidencePercent = "N/A";
            let severity = "Low";
            const match = /Confidence\s*:\s*([0-9.]+)/i.exec(details.analysis || "");
            if (match) {
              const confFloat = parseFloat(match[1]);
              const pct = Math.round(confFloat <= 1 ? confFloat * 100 : confFloat);
              confidencePercent = `${pct}%`;
              if (pct >= 85) severity = "High";
              else if (pct >= 60) severity = "Medium";
            }

            const autoText = `📋 CLINICAL SUMMARY CARD\n` +
              `Patient: ${patientGender}, ${patientAge}\n` +
              `AI Prediction: ${classification}\n` +
              `Confidence: ${confidencePercent}\n` +
              `Severity: ${severity}\n` +
              `Analysis Date: ${new Date(details.created_at || Date.now()).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' })}\n` +
              `Scan URL: ${imageUpload}`;

            const autoMessageId = uuidv4();
            await pool.query(
              `INSERT INTO chat_message 
               (message_id, chat_id, sender_role, sender_id, message_text, message_type, file_url, original_filename, sent_at)
               VALUES ($1, $2, 'system', $3, $4, 'image', $5, 'skin_analysis.jpg', NOW())`,
              [
                autoMessageId,
                appt.chat_id,
                'system',
                appt.medical_syndicate_id_card,
                autoText,
                imageUpload
              ]
            );
            console.log(`Successfully backfilled summary card for Chat ${appt.chat_id}!`);
          }
        }
      } else {
        console.log(`Chat ${appt.chat_id} already has a summary card.`);
      }
    }
    console.log("Backfill complete!");
  } catch (err) {
    console.error("Backfill failed:", err.message);
  } finally {
    process.exit();
  }
}

backfill();
