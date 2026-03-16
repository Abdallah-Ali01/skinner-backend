exports.bookAppointment = async (data) => {
  const {
    patient_id,
    medical_syndicate_id_card,
    doctor_name,
    total_cost,
    date,
    chat_id
  } = data;

  if (
    !patient_id ||
    !medical_syndicate_id_card ||
    !doctor_name ||
    !total_cost ||
    !date ||
    !chat_id
  ) {
    throw new Error("Missing required fields");
  }

  const patientCheck = await pool.query(
    `SELECT * FROM patient WHERE patient_id = $1`,
    [patient_id]
  );

  if (patientCheck.rows.length === 0) {
    throw new Error("Patient not found");
  }

  const doctorCheck = await pool.query(
    `SELECT * FROM doctor WHERE medical_syndicate_id_card = $1`,
    [medical_syndicate_id_card]
  );

  if (doctorCheck.rows.length === 0) {
    throw new Error("Doctor not found");
  }

  const analysisCheck = await pool.query(
    `SELECT * FROM chat_analysis WHERE chat_id = $1 AND patient_id = $2`,
    [chat_id, patient_id]
  );

  if (analysisCheck.rows.length === 0) {
    throw new Error("Analysis not found for this patient");
  }

  const existingAppointmentForChat = await pool.query(
    `SELECT * FROM appointment WHERE chat_id = $1`,
    [chat_id]
  );

  if (existingAppointmentForChat.rows.length > 0) {
    throw new Error("This analysis is already booked with a doctor");
  }

  const appointmentId = uuidv4();

  await pool.query(
    `
    INSERT INTO appointment
    (
      appointment_id,
      patient_id,
      doctor_name,
      total_cost,
      date,
      status,
      medical_syndicate_id_card,
      chat_id
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `,
    [
      appointmentId,
      patient_id,
      doctor_name,
      total_cost,
      date,
      "pending_payment",
      medical_syndicate_id_card,
      chat_id
    ]
  );

  return {
    success: true,
    message: "Appointment booked successfully",
    data: {
      appointment_id: appointmentId,
      patient_id,
      medical_syndicate_id_card,
      doctor_name,
      total_cost,
      date,
      status: "pending_payment",
      chat_id
    }
  };
};