const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const aiService = require("./aiService");

exports.uploadAndAnalyze = async (req) => {
  if (!req.file) {
    throw new Error("No image uploaded");
  }

  const { patient_id } = req.body;

  if (!patient_id) {
    throw new Error("patient_id is required");
  }

  const patientCheck = await pool.query(
    `SELECT * FROM patient WHERE patient_id = $1`,
    [patient_id]
  );

  if (patientCheck.rows.length === 0) {
    throw new Error("Patient not found");
  }

  const imagePath = req.file.path;
  const imageUrl = `/uploads/skin-images/${req.file.filename}`;

  const aiResult = await aiService.predictImage(imagePath);

  const chatId = uuidv4();

  const analysisText = `Predicted class: ${aiResult.predicted_class}, Confidence: ${aiResult.confidence}`;
  const treatmentSuggestion = JSON.stringify(aiResult.top_k);
  const classification = aiResult.predicted_class;

  await pool.query(
    `
    INSERT INTO chat_analysis
    (chat_id, patient_id, analysis, skin_image_upload, treatment_suggestion, skin_disease_classification, doctor_recommendation, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      chatId,
      patient_id,
      analysisText,
      imageUrl,
      treatmentSuggestion,
      classification,
      "Consult a dermatologist",
      new Date()
    ]
  );

  await pool.query(
    `
    UPDATE patient
    SET scan_image = $1, updated_at = $2
    WHERE patient_id = $3
    `,
    [imageUrl, new Date(), patient_id]
  );

  return {
    success: true,
    message: "Image analyzed successfully",
    data: {
      chat_id: chatId,
      image_url: imageUrl,
      predicted_class: aiResult.predicted_class,
      confidence: aiResult.confidence,
      top_k: aiResult.top_k
    }
  };
};

exports.getAnalysisById = async (chatId) => {
  const result = await pool.query(
    `
    SELECT *
    FROM chat_analysis
    WHERE chat_id = $1
    `,
    [chatId]
  );

  if (result.rows.length === 0) {
    throw new Error("Analysis not found");
  }

  return {
    success: true,
    data: result.rows[0]
  };
};

exports.getPatientHistory = async (patientId) => {
  const result = await pool.query(
    `
    SELECT
      c.chat_id,
      c.patient_id,
      c.skin_image_upload,
      c.skin_disease_classification,
      c.analysis,
      c.treatment_suggestion,
      c.doctor_recommendation,
      c.created_at
    FROM chat_analysis c
    WHERE c.patient_id = $1
    ORDER BY c.created_at DESC
    `,
    [patientId]
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};