const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const validateUuid = (uuid) => typeof uuid === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(uuid);

exports.getPendingCases = async (doctorId) => {
  const result = await pool.query(`
    SELECT
      a.appointment_id,
      a.analysis_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      an.skin_image_upload,
      an.skin_disease_classification,
      an.analysis,
      an.treatment_suggestion,
      an.doctor_recommendation,
      an.created_at AS analysis_date,
      c.chat_id, c.status AS chat_status,
      (
        SELECT COUNT(*)::integer
        FROM chat_message cm2
        WHERE cm2.chat_id = c.chat_id
          AND cm2.sender_role = 'patient'
          AND cm2.is_read = FALSE
      ) AS unread_count,
      pay.payment_status
    FROM appointment a
    JOIN patient p ON a.patient_id = p.patient_id
    JOIN analysis an ON a.analysis_id = an.analysis_id
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    LEFT JOIN chat c ON a.patient_id = c.patient_id
      AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
    WHERE a.medical_syndicate_id_card = $1
      AND pay.payment_status = 'paid'
      AND a.date > NOW()
      AND a.status != 'cancelled'
    ORDER BY a.date ASC
  `, [doctorId]);

  const followUpDays = parseInt(process.env.CHAT_FOLLOWUP_DAYS || "7", 10);
  const mappedRows = result.rows.map((row) => {
    if (row.appointment_date) {
      const apptDate = new Date(row.appointment_date);
      const endsAt = new Date(apptDate.getTime() + followUpDays * 24 * 60 * 60 * 1000);
      const remainingSeconds = Math.max(0, Math.floor((endsAt - new Date()) / 1000));
      
      row.follow_up_ends_at = endsAt.toISOString();
      row.remaining_seconds = remainingSeconds;
      row.chat_status = remainingSeconds > 0 ? 'active' : 'locked';
    } else {
      row.follow_up_ends_at = null;
      row.remaining_seconds = null;
    }
    return row;
  });

  return {
    success: true,
    count: mappedRows.length,
    data: mappedRows
  };
};

exports.getReviewedCases = async (doctorId) => {
  const result = await pool.query(`
    SELECT
      r.report_id,
      r.diagnosis AS report_diagnosis,
      r.prescription AS report_prescription,
      r.notes AS report_notes,
      COALESCE(r.created_at, a.date) AS date,
      a.appointment_id,
      a.analysis_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      an.skin_image_upload,
      an.skin_disease_classification,
      an.analysis,
      an.treatment_suggestion,
      an.doctor_recommendation,
      an.created_at AS analysis_date,
      d.name AS doctor_name,
      c.chat_id, c.status AS chat_status,
      (
        SELECT COUNT(*)::integer
        FROM chat_message cm2
        WHERE cm2.chat_id = c.chat_id
          AND cm2.sender_role = 'patient'
          AND cm2.is_read = FALSE
      ) AS unread_count
    FROM appointment a
    JOIN patient p ON a.patient_id = p.patient_id
    JOIN analysis an ON a.analysis_id = an.analysis_id
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    JOIN doctor d ON a.medical_syndicate_id_card = d.medical_syndicate_id_card
    LEFT JOIN chat c ON a.patient_id = c.patient_id
      AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
    LEFT JOIN report r ON a.appointment_id = r.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND pay.payment_status = 'paid'
      AND a.date <= NOW()
      AND a.status != 'cancelled'
    ORDER BY a.date DESC
  `, [doctorId]);

  const followUpDays = parseInt(process.env.CHAT_FOLLOWUP_DAYS || "7", 10);
  const mappedRows = result.rows.map((row) => {
    if (row.appointment_date) {
      const apptDate = new Date(row.appointment_date);
      const endsAt = new Date(apptDate.getTime() + followUpDays * 24 * 60 * 60 * 1000);
      const remainingSeconds = Math.max(0, Math.floor((endsAt - new Date()) / 1000));
      
      row.follow_up_ends_at = endsAt.toISOString();
      row.remaining_seconds = remainingSeconds;
      row.chat_status = remainingSeconds > 0 ? 'active' : 'locked';
    } else {
      row.follow_up_ends_at = null;
      row.remaining_seconds = null;
    }
    return row;
  });

  return {
    success: true,
    count: mappedRows.length,
    data: mappedRows
  };
};

exports.getCaseDetails = async (doctorId, appointmentId) => {

  const result = await pool.query(`
    SELECT
      a.appointment_id,
      a.analysis_id,
      a.patient_id,
      a.date AS appointment_date,
      a.status AS appointment_status,
      p.name AS patient_name,
      p.age,
      p.gender,
      p.email,
      p.phone,
      p.patient_history,
      an.skin_image_upload,
      an.skin_disease_classification,
      an.analysis,
      an.treatment_suggestion,
      an.doctor_recommendation,
      an.created_at AS analysis_date,
      c.chat_id, c.status AS chat_status,
      (
        SELECT COUNT(*)::integer
        FROM chat_message cm2
        WHERE cm2.chat_id = c.chat_id
          AND cm2.sender_role = 'patient'
          AND cm2.is_read = FALSE
      ) AS unread_count,
      pay.payment_status
    FROM appointment a
    JOIN patient p ON a.patient_id = p.patient_id
    JOIN analysis an ON a.analysis_id = an.analysis_id
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    LEFT JOIN chat c ON a.patient_id = c.patient_id
      AND a.medical_syndicate_id_card = c.medical_syndicate_id_card
    WHERE a.medical_syndicate_id_card = $1
      AND a.appointment_id = $2
      AND pay.payment_status = 'paid'
  `, [doctorId, appointmentId]);

  if (result.rows.length === 0) {
    const err = new Error("Case not found or not allowed");
    err.status = 404;
    throw err;
  }

  const row = result.rows[0];
  const followUpDays = parseInt(process.env.CHAT_FOLLOWUP_DAYS || "7", 10);
  if (row.appointment_date) {
    const apptDate = new Date(row.appointment_date);
    const endsAt = new Date(apptDate.getTime() + followUpDays * 24 * 60 * 60 * 1000);
    const remainingSeconds = Math.max(0, Math.floor((endsAt - new Date()) / 1000));
    
    row.follow_up_ends_at = endsAt.toISOString();
    row.remaining_seconds = remainingSeconds;
    row.chat_status = remainingSeconds > 0 ? 'active' : 'locked';
  } else {
    row.follow_up_ends_at = null;
    row.remaining_seconds = null;
  }

  return {
    success: true,
    data: row
  };
};

exports.reviewCase = async (doctorId, data) => {
  const {
    appointment_id,
    diagnosis
  } = data;

  const medical_syndicate_id_card = doctorId;

  // --- Input validation ---
  if (!appointment_id || !diagnosis) {
    const err = new Error("appointment_id and diagnosis are required");
    err.status = 400;
    throw err;
  }

  if (!validateUuid(appointment_id)) {
    const err = new Error("Invalid appointment_id format");
    err.status = 400;
    throw err;
  }

  const MAX_DIAGNOSIS_LENGTH = 5000;

  if (typeof diagnosis !== 'string' || diagnosis.trim().length === 0) {
    const err = new Error("diagnosis must be a non-empty string");
    err.status = 400;
    throw err;
  }
  if (diagnosis.length > MAX_DIAGNOSIS_LENGTH) {
    const err = new Error(`diagnosis must not exceed ${MAX_DIAGNOSIS_LENGTH} characters`);
    err.status = 400;
    throw err;
  }

  // --- Verify this is a paid appointment assigned to this doctor ---
  const caseResult = await pool.query(`
    SELECT
      a.appointment_id,
      a.analysis_id,
      a.patient_id
    FROM appointment a
    JOIN payment pay ON a.appointment_id = pay.appointment_id
    WHERE a.medical_syndicate_id_card = $1
      AND a.appointment_id = $2
      AND pay.payment_status = 'paid'
  `, [medical_syndicate_id_card, appointment_id]);

  if (caseResult.rows.length === 0) {
    const err = new Error("Case not found, not paid, or not assigned to this doctor");
    err.status = 404;
    throw err;
  }

  const existingReport = await pool.query(
    `SELECT 1 FROM report WHERE appointment_id = $1`,
    [appointment_id]
  );

  if (existingReport.rows.length > 0) {
    const err = new Error("This case has already been reviewed");
    err.status = 409;
    throw err;
  }

  // --- Use a transaction for all mutations ---
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const reportId = uuidv4();
    const caseData = caseResult.rows[0];

    await client.query(`
      INSERT INTO report
      (report_id, appointment_id, patient_id, medical_syndicate_id_card, diagnosis)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      reportId,
      appointment_id,
      caseData.patient_id,
      medical_syndicate_id_card,
      diagnosis.trim()
    ]);

    // Auto-message after report submission
    const chatResult = await client.query(
      `SELECT chat_id FROM chat WHERE patient_id = $1 AND medical_syndicate_id_card = $2`,
      [caseData.patient_id, medical_syndicate_id_card]
    );

    let chatId = null;
    let chatMessage = null;
    if (chatResult.rows.length > 0) {
      chatId = chatResult.rows[0].chat_id;

      // Send auto-generated report summary to chat
      const autoMessageId = uuidv4();
      const autoText = `📋 Report submitted:\n\n${diagnosis.trim()}`;

      await client.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'system', $3, $4, 'system', NOW())`,
        [autoMessageId, chatId, medical_syndicate_id_card, autoText]
      );

      chatMessage = {
        id: autoMessageId,
        message_id: autoMessageId,
        chat_id: chatId,
        sender_role: 'system',
        sender_id: medical_syndicate_id_card,
        message_text: autoText,
        message_type: 'system',
        sent_at: new Date().toISOString(),
        is_read: false
      };
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: "Case reviewed successfully and report created",
      data: {
        report_id: reportId,
        appointment_id,
        patient_id: caseData.patient_id,
        chat_id: chatId,
        chat_message: chatMessage
      }
    };
  } catch (err) {
    await client.query('ROLLBACK');

    // Handle race condition: unique constraint on report.appointment_id
    if (err.code === '23505') {
      const conflictErr = new Error("This case has already been reviewed");
      conflictErr.status = 409;
      throw conflictErr;
    }

    throw err;
  } finally {
    client.release();
  }
};

exports.updateReport = async (doctorId, data) => {
  const {
    appointment_id,
    diagnosis
  } = data;

  const medical_syndicate_id_card = doctorId;

  // --- Input validation ---
  if (!appointment_id || !diagnosis) {
    const err = new Error("appointment_id and diagnosis are required");
    err.status = 400;
    throw err;
  }

  if (!validateUuid(appointment_id)) {
    const err = new Error("Invalid appointment_id format");
    err.status = 400;
    throw err;
  }

  const MAX_DIAGNOSIS_LENGTH = 5000;

  if (typeof diagnosis !== 'string' || diagnosis.trim().length === 0) {
    const err = new Error("diagnosis must be a non-empty string");
    err.status = 400;
    throw err;
  }
  if (diagnosis.length > MAX_DIAGNOSIS_LENGTH) {
    const err = new Error(`diagnosis must not exceed ${MAX_DIAGNOSIS_LENGTH} characters`);
    err.status = 400;
    throw err;
  }

  // --- Check if report exists and belongs to this doctor ---
  const reportCheck = await pool.query(
    `SELECT report_id, patient_id FROM report 
     WHERE appointment_id = $1 AND medical_syndicate_id_card = $2`,
    [appointment_id, medical_syndicate_id_card]
  );

  if (reportCheck.rows.length === 0) {
    const err = new Error("Report not found or not authorized to edit");
    err.status = 404;
    throw err;
  }

  const reportData = reportCheck.rows[0];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update report
    await client.query(
      `UPDATE report
       SET diagnosis = $1
       WHERE appointment_id = $2 AND medical_syndicate_id_card = $3`,
      [
        diagnosis.trim(),
        appointment_id,
        medical_syndicate_id_card
      ]
    );

    // Send auto-generated report update message to chat
    const chatResult = await client.query(
      `SELECT chat_id FROM chat WHERE patient_id = $1 AND medical_syndicate_id_card = $2`,
      [reportData.patient_id, medical_syndicate_id_card]
    );

    let chatId = null;
    let chatMessage = null;
    if (chatResult.rows.length > 0) {
      chatId = chatResult.rows[0].chat_id;
      const autoMessageId = uuidv4();
      const autoText = `📋 Report updated:\n\n${diagnosis.trim()}`;

      await client.query(
        `INSERT INTO chat_message (message_id, chat_id, sender_role, sender_id, message_text, message_type, sent_at)
         VALUES ($1, $2, 'system', $3, $4, 'system', NOW())`,
        [autoMessageId, chatId, medical_syndicate_id_card, autoText]
      );

      // Update chat updated_at timestamp to bubble up the conversation
      await client.query(
        `UPDATE chat SET updated_at = NOW() WHERE chat_id = $1`,
        [chatId]
      );

      chatMessage = {
        id: autoMessageId,
        message_id: autoMessageId,
        chat_id: chatId,
        sender_role: 'system',
        sender_id: medical_syndicate_id_card,
        message_text: autoText,
        message_type: 'system',
        sent_at: new Date().toISOString(),
        is_read: false
      };
    }

    await client.query('COMMIT');

    return {
      success: true,
      message: "Report updated successfully",
      data: {
        report_id: reportData.report_id,
        appointment_id,
        patient_id: reportData.patient_id,
        chat_id: chatId,
        chat_message: chatMessage
      }
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};