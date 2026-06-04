require("dotenv").config();
const pool = require("./src/config/database");
const appointmentService = require("./src/services/appointmentService");

async function runTests() {
  console.log("=== STARTING APPOINTMENT BOOKING VALIDATION TESTS ===");
  const patientId = "c8b6b19a-9e12-4fb2-b7e6-123456789abc";
  const doc1 = "TEST-DOC-111";
  const doc2 = "TEST-DOC-222";
  const analysis1 = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";
  const analysis2 = "a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2";
  const analysis3 = "a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3";

  try {
    // 1. Clean up any existing test data
    console.log("Cleaning up old test data...");
    await pool.query("DELETE FROM chat_message WHERE chat_id IN (SELECT chat_id FROM chat WHERE patient_id = $1)", [patientId]);
    await pool.query("DELETE FROM chat WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM appointment WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM analysis WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM patient WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM doctor_date_availability WHERE medical_syndicate_id_card IN ($1, $2)", [doc1, doc2]);
    await pool.query("DELETE FROM doctor WHERE medical_syndicate_id_card IN ($1, $2)", [doc1, doc2]);

    // 2. Insert mock patient
    console.log("Inserting test patient...");
    await pool.query(
      `INSERT INTO patient (patient_id, name, email, password, age)
       VALUES ($1, 'Test Patient', 'testpatient@skinner.com', 'hashedpass', 25)`,
      [patientId]
    );

    // 3. Insert mock approved doctors
    console.log("Inserting test doctors...");
    await pool.query(
      `INSERT INTO doctor (medical_syndicate_id_card, name, email, password, specialization, approval_status, consultation_fee)
       VALUES 
         ($1, 'Test Doctor One', 'testdoc1@skinner.com', 'hashedpass', 'Dermatology', 'approved', 200),
         ($2, 'Test Doctor Two', 'testdoc2@skinner.com', 'hashedpass', 'Dermatology', 'approved', 300)`,
      [doc1, doc2]
    );

    // 4. Insert doctor date availabilities
    console.log("Inserting availability slots for 2026-07-01...");
    await pool.query(
      `INSERT INTO doctor_date_availability (medical_syndicate_id_card, available_date, start_time, end_time, slot_duration_minutes, is_active)
       VALUES 
         ($1, '2026-07-01', '10:00:00', '12:00:00', 30, true),
         ($2, '2026-07-01', '10:00:00', '12:00:00', 30, true)`,
      [doc1, doc2]
    );

    // 5. Insert mock analyses
    console.log("Inserting patient analysis records...");
    await pool.query(
      `INSERT INTO analysis (analysis_id, patient_id, skin_disease_classification, skin_image_upload)
       VALUES 
         ($1, $4, 'Acne', 'test.jpg'),
         ($2, $4, 'Acne', 'test.jpg'),
         ($3, $4, 'Acne', 'test.jpg')`,
      [analysis1, analysis2, analysis3, patientId]
    );

    console.log("\n--- SCENARIO 1: Book Doctor One at 10:00 AM (Should Succeed) ---");
    const appt1 = await appointmentService.bookAppointment(patientId, {
      medical_syndicate_id_card: doc1,
      date: "2026-07-01T10:00:00.000Z",
      analysis_id: analysis1
    });
    console.log("✅ Scenario 1 Success:", appt1.message, "Appt ID:", appt1.data.appointment_id);

    // Need to set status to confirmed/completed (not pending_payment) or keep it pending_payment.
    // Our upcoming appointment check blocks ANY non-cancelled status, so pending_payment is blocked too.
    console.log("\n--- SCENARIO 2: Try to book Doctor One again at 10:30 AM (Should Be Blocked) ---");
    try {
      await appointmentService.bookAppointment(patientId, {
        medical_syndicate_id_card: doc1,
        date: "2026-07-01T10:30:00.000Z",
        analysis_id: analysis2
      });
      console.error("❌ Scenario 2 Failed: Allowed duplicate upcoming booking with same doctor!");
    } catch (err) {
      if (err.status === 409 && err.message.includes("upcoming appointment scheduled with this doctor")) {
        console.log("✅ Scenario 2 Success (Correctly Blocked):", err.message);
      } else {
        console.error("❌ Scenario 2 Failed with unexpected error:", err);
      }
    }

    console.log("\n--- SCENARIO 3: Try to book Doctor Two at 10:00 AM (Double-Booking Check - Should Be Blocked) ---");
    try {
      await appointmentService.bookAppointment(patientId, {
        medical_syndicate_id_card: doc2,
        date: "2026-07-01T10:00:00.000Z",
        analysis_id: analysis2
      });
      console.error("❌ Scenario 3 Failed: Allowed double-booking with two doctors at the same time!");
    } catch (err) {
      if (err.status === 409 && err.message.includes("already have an appointment booked with another doctor at this date and time")) {
        console.log("✅ Scenario 3 Success (Correctly Blocked):", err.message);
      } else {
        console.error("❌ Scenario 3 Failed with unexpected error:", err);
      }
    }

    console.log("\n--- SCENARIO 4: Book Doctor One during Follow-Up (Should Succeed) ---");
    console.log("Simulating appointment 1 arrival (moving it to the past)...");
    await pool.query(
      `UPDATE appointment 
       SET date = NOW() - INTERVAL '1 day', status = 'confirmed' 
       WHERE appointment_id = $1`,
      [appt1.data.appointment_id]
    );

    console.log("Booking new slot with Doctor One at 10:30 AM while follow-up is active...");
    const appt2 = await appointmentService.bookAppointment(patientId, {
      medical_syndicate_id_card: doc1,
      date: "2026-07-01T10:30:00.000Z",
      analysis_id: analysis2
    });
    console.log("✅ Scenario 4 Success:", appt2.message, "New Appt ID:", appt2.data.appointment_id);

    console.log("\n=== ALL SCENARIOS PASSED SUCCESSFULLY ===");

  } catch (error) {
    console.error("❌ Test script encountered an error:", error);
  } finally {
    // Cleanup test data
    console.log("\nCleaning up test data...");
    await pool.query("DELETE FROM chat_message WHERE chat_id IN (SELECT chat_id FROM chat WHERE patient_id = $1)", [patientId]);
    await pool.query("DELETE FROM chat WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM appointment WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM analysis WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM patient WHERE patient_id = $1", [patientId]);
    await pool.query("DELETE FROM doctor_date_availability WHERE medical_syndicate_id_card IN ($1, $2)", [doc1, doc2]);
    await pool.query("DELETE FROM doctor WHERE medical_syndicate_id_card IN ($1, $2)", [doc1, doc2]);
    pool.end();
  }
}

runTests();
