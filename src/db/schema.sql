-- =========================================
-- SKINNER DATABASE SCHEMA (matches live Neon DB)
-- =========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================
-- ADMIN
-- =========================================
CREATE TABLE IF NOT EXISTS admin (
    admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    admin_role VARCHAR(20) NOT NULL DEFAULT 'admin',
    CONSTRAINT admin_role_check
        CHECK (admin_role IN ('super_admin', 'admin'))
);

-- =========================================
-- ADMIN INVITE CODE
-- =========================================
CREATE TABLE IF NOT EXISTS admin_invite_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code VARCHAR(50) UNIQUE NOT NULL,
    created_by_admin_id UUID NOT NULL REFERENCES admin(admin_id) ON DELETE CASCADE,
    used_by_admin_id UUID REFERENCES admin(admin_id) ON DELETE SET NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- DOCTOR
-- =========================================
CREATE TABLE IF NOT EXISTS doctor (
    medical_syndicate_id_card VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    gender VARCHAR(20),
    email VARCHAR(255) UNIQUE NOT NULL,
    national_id VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    rate NUMERIC(3,2) CHECK (rate >= 0 AND rate <= 5),
    year_of_experience INT,
    specialization VARCHAR(255) NOT NULL,
    clinic_address TEXT,
    admin_id UUID REFERENCES admin(admin_id) ON DELETE SET NULL,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    syndicate_card_image TEXT,
    consultation_fee NUMERIC DEFAULT 0,
    CONSTRAINT doctor_approval_status_check
        CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

-- =========================================
-- PATIENT
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- ANALYSIS (AI skin disease scan result)
-- =========================================
CREATE TABLE IF NOT EXISTS analysis (
    analysis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- links patient + doctor + analysis
-- one analysis = one appointment
-- =========================================
CREATE TABLE IF NOT EXISTS appointment (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    doctor_name VARCHAR(255) NOT NULL,
    total_cost NUMERIC(10,2) NOT NULL,
    date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
    medical_syndicate_id_card VARCHAR(100) NOT NULL REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE,
    analysis_id UUID NOT NULL REFERENCES analysis(analysis_id) ON DELETE CASCADE,
    CONSTRAINT unique_appointment_analysis UNIQUE (analysis_id),
    CONSTRAINT appointment_status_check
        CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'completed'))
);

-- =========================================
-- PAYMENT
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
-- CHAT (real messaging, created after payment)
-- =========================================
CREATE TABLE IF NOT EXISTS chat (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    medical_syndicate_id_card VARCHAR(100) NOT NULL REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================
-- CHAT_MESSAGE
-- =========================================
CREATE TABLE IF NOT EXISTS chat_message (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat(chat_id) ON DELETE CASCADE,
    sender_role VARCHAR(20) NOT NULL,
    sender_id VARCHAR(100) NOT NULL,
    message_text TEXT,
    message_type VARCHAR(10) DEFAULT 'text',
    file_url TEXT,
    original_filename TEXT,
    sent_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chat_message_sender_role_check
        CHECK (sender_role IN ('patient', 'doctor'))
);

-- =========================================
-- REPORT (doctor's diagnosis)
-- =========================================
CREATE TABLE IF NOT EXISTS report (
    report_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    medical_syndicate_id_card VARCHAR(100) NOT NULL REFERENCES doctor(medical_syndicate_id_card) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    prescription TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- PASSWORD_RESET
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