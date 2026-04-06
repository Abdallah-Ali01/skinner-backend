const pool = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const aiService = require("./aiService");

exports.uploadAndAnalyze = async (req) => {
  if (!req.file) {
    const err = new Error("No image uploaded");
    err.status = 400;
    throw err;
  }

  const { patient_id } = req.body;

  if (!patient_id) {
    const err = new Error("patient_id is required");
    err.status = 400;
    throw err;
  }

  const patientCheck = await pool.query(
    `SELECT 1 FROM patient WHERE patient_id = $1`,
    [patient_id]
  );

  if (patientCheck.rows.length === 0) {
    const err = new Error("Patient not found");
    err.status = 404;
    throw err;
  }

  const imagePath = req.file.path;
  const imageUrl = `/uploads/skin-images/${req.file.filename}`;

  const aiResult = await aiService.predictImage(imagePath);

  const analysisId = uuidv4();

  const analysisText = `Predicted class: ${aiResult.predicted_class}, Confidence: ${aiResult.confidence}`;
  const treatmentSuggestion = JSON.stringify(aiResult.top_k);
  const classification = aiResult.predicted_class;

  await pool.query(
    `
    INSERT INTO analysis
    (analysis_id, patient_id, analysis, skin_image_upload, treatment_suggestion, skin_disease_classification, doctor_recommendation, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      analysisId,
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
      analysis_id: analysisId,
      image_url: imageUrl,
      predicted_class: aiResult.predicted_class,
      confidence: aiResult.confidence,
      top_k: aiResult.top_k
    }
  };
};

exports.getAnalysisById = async (analysisId) => {
  const result = await pool.query(
    `SELECT * FROM analysis WHERE analysis_id = $1`,
    [analysisId]
  );

  if (result.rows.length === 0) {
    const err = new Error("Analysis not found");
    err.status = 404;
    throw err;
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
      a.analysis_id,
      a.patient_id,
      a.skin_image_upload,
      a.skin_disease_classification,
      a.analysis,
      a.treatment_suggestion,
      a.doctor_recommendation,
      a.created_at
    FROM analysis a
    WHERE a.patient_id = $1
    ORDER BY a.created_at DESC
    `,
    [patientId]
  );

  return {
    success: true,
    count: result.rows.length,
    data: result.rows
  };
};