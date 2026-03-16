-- =========================================
-- SKINNER FINAL DATABASE SCHEMA
-- =========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- ADMIN
-- =========================================
CREATE TABLE IF NOT EXISTS admin (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

-- =========================================
-- DOCTOR
-- approval_status: pending | approved | rejected
-- medical_syndicate_id_card = doctor unique textual identifier
-- syndicate_card_image = uploaded doctor card image path
-- =========================================
CREATE TABLE IF NOT EXISTS doctor (
    medical_syndicate_id_card VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    gender VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    national_id VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    rate NUMERIC(3,2),
    year_of_experience INT,
    specialization VARCHAR(255) NOT NULL,
    clinic_address TEXT,
    admin_id UUID REFERENCES admin(admin_id) ON DELETE SET NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    syndicate_card_image TEXT,
    CONSTRAINT doctor_approval_status_check
        CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- =========================================
-- PATIENT
-- report_id / chat_id kept for compatibility with original schema
-- current logic mainly depends on chat_analysis.patient_id
-- =========================================
CREATE TABLE IF NOT EXISTS patient (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    gender VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    age INT,
    address TEXT,
    scan_image TEXT,
    patient_history TEXT,
    medical_syndicate_id_card VARCHAR(100) REFERENCES doctor(medical_syndicate_id_card) ON DELETE SET NULL,
    report_id UUID,
    chat_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- CHAT_ANALYSIS
-- one patient can have many analyses
-- chat_id acts as analysis/case id
-- =========================================
CREATE TABLE IF NOT EXISTS chat_analysis (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    analysis TEXT,
    skin_image_upload TEXT,
    treatment_suggestion TEXT,
    skin_disease_classification TEXT,
    doctor_recommendation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- APPOINTMENT
-- one chat/analysis can be booked only once
-- status: pending_payment | confirmed | cancelled | completed
-- =========================================
CREATE TABLE IF NOT EXISTS appointment (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
    medical_syndicate_id_card VARCHAR(100) NOT NULL REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES chat_analysis(chat_id) ON DELETE CASCADE,
    CONSTRAINT unique_appointment_chat_id UNIQUE (chat_id),
    CONSTRAINT appointment_status_check
        CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'completed'))
);

-- =========================================
-- PAYMENT
-- safe demo version
-- one payment per appointment
-- payment_status: paid | failed | pending
-- =========================================
CREATE TABLE IF NOT EXISTS payment (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL,
    card_holder_name VARCHAR(255) NOT NULL,
    card_last4 VARCHAR(4) NOT NULL,
    transaction_reference VARCHAR(255) UNIQUE NOT NULL,
    transaction_date TIMESTAMP DEFAULT NOW(),
    payment_status VARCHAR(50) NOT NULL DEFAULT 'paid',
    amount NUMERIC(10,2) NOT NULL,
    otp_verified BOOLEAN DEFAULT FALSE,
    CONSTRAINT payment_status_check
        CHECK (payment_status IN ('paid', 'failed', 'pending'))
);

-- =========================================
-- REPORT
-- one report per chat/case
-- =========================================
CREATE TABLE IF NOT EXISTS report (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_name VARCHAR(255) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    date TIMESTAMP DEFAULT NOW(),
    diagnosis TEXT NOT NULL,
    medical_syndicate_id_card VARCHAR(100) NOT NULL REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE,
    chat_id UUID NOT NULL UNIQUE REFERENCES chat_analysis(chat_id) ON DELETE CASCADE
);

-- =========================================
-- CHAT_MESSAGE
-- real messages between patient and doctor
-- after paid appointment only (enforced in backend)
-- =========================================
CREATE TABLE IF NOT EXISTS chat_message (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat_analysis(chat_id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chat_message_sender_role_check
        CHECK (sender_role IN ('patient', 'doctor'))
);

-- =========================================
-- PASSWORD_RESET
-- OTP-based password reset
-- =========================================
CREATE TABLE IF NOT EXISTS password_reset (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    reset_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT password_reset_role_check
        CHECK (role IN ('patient', 'doctor', 'admin'))
);

-- =========================================
-- OPTIONAL FOREIGN KEYS
-- kept to preserve original schema compatibility
-- =========================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'patient_report_id_fk'
    ) THEN
        ALTER TABLE patient
        ADD CONSTRAINT patient_report_id_fk
        FOREIGN KEY (report_id) REFERENCES report(report_id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'patient_chat_id_fk'
    ) THEN
        ALTER TABLE patient
        ADD CONSTRAINT patient_chat_id_fk
        FOREIGN KEY (chat_id) REFERENCES chat_analysis(chat_id) ON DELETE SET NULL;
    END IF;
END $$;

-- =========================================
-- INDEXES
-- =========================================

CREATE INDEX IF NOT EXISTS idx_admin_email
ON admin(email);

CREATE INDEX IF NOT EXISTS idx_doctor_email
ON doctor(email);

CREATE INDEX IF NOT EXISTS idx_doctor_approval_status
ON doctor(approval_status);

CREATE INDEX IF NOT EXISTS idx_patient_email
ON patient(email);

CREATE INDEX IF NOT EXISTS idx_chat_analysis_patient_id
ON chat_analysis(patient_id);

CREATE INDEX IF NOT EXISTS idx_chat_analysis_created_at
ON chat_analysis(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_patient_id
ON appointment(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointment_doctor_id
ON appointment(medical_syndicate_id_card);

CREATE INDEX IF NOT EXISTS idx_appointment_date
ON appointment(date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_appointment_id
ON payment(appointment_id);

CREATE INDEX IF NOT EXISTS idx_payment_status
ON payment(payment_status);

CREATE INDEX IF NOT EXISTS idx_report_chat_id
ON report(chat_id);

CREATE INDEX IF NOT EXISTS idx_report_doctor_id
ON report(medical_syndicate_id_card);

CREATE INDEX IF NOT EXISTS idx_chat_message_chat_id
ON chat_message(chat_id);

CREATE INDEX IF NOT EXISTS idx_chat_message_sent_at
ON chat_message(sent_at ASC);

CREATE INDEX IF NOT EXISTS idx_password_reset_email_role
ON password_reset(email, role);

CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at
ON password_reset(expires_at);