require("dotenv").config();
const pool = require("./src/config/database");

async function cleanup() {
  console.log("Starting report cleanup in database...");
  try {
    // 1. Set prescription = NULL, notes = NULL in report table
    console.log("Setting prescription and notes to NULL in report table...");
    const reportRes = await pool.query("UPDATE report SET prescription = NULL, notes = NULL");
    console.log(`Updated ${reportRes.rowCount} report records.`);

    // 2. Query all report submitted/updated messages in chat_message table
    console.log("Querying report notification messages from chat_message...");
    const msgRes = await pool.query(
      `SELECT message_id, message_text FROM chat_message 
       WHERE sender_role = 'system' 
         AND (message_text LIKE '📋 Report submitted%' OR message_text LIKE '📋 Report updated%')`
    );
    console.log(`Found ${msgRes.rows.length} messages to inspect.`);

    let updatedCount = 0;
    for (const row of msgRes.rows) {
      const { message_id, message_text } = row;
      
      const prefix = message_text.startsWith("📋 Report updated") ? "📋 Report updated:\n\n" : "📋 Report submitted:\n\n";
      
      const diagnosisIndex = message_text.indexOf("Diagnosis: ");
      if (diagnosisIndex !== -1) {
        let diagnosisPart = message_text.slice(diagnosisIndex + "Diagnosis: ".length).trim();
        
        const presIndex = diagnosisPart.indexOf("\nPrescription:");
        if (presIndex !== -1) {
          diagnosisPart = diagnosisPart.slice(0, presIndex).trim();
        }
        
        const newText = `${prefix}${diagnosisPart}`;
        if (newText !== message_text) {
          await pool.query(
            "UPDATE chat_message SET message_text = $1 WHERE message_id = $2",
            [newText, message_id]
          );
          updatedCount++;
        }
      }
    }
    console.log(`Cleaned up ${updatedCount} chat message texts.`);
    console.log("Cleanup complete!");
  } catch (err) {
    console.error("Cleanup failed:", err.message);
  } finally {
    process.exit();
  }
}

cleanup();
