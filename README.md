SKINNER — AI Skin Disease Detection Backend
SKINNER is an AI-powered skin disease detection platform that allows patients to upload skin images, receive AI analysis, and consult dermatologists.

The system integrates:

AI-based skin disease classification

Patient–doctor consultation workflow

Appointment booking and payment

Real-time chat between patient and doctor

Admin approval system for doctors

The backend is built using Node.js + Express + PostgreSQL, and integrates with a FastAPI AI model service.

System Architecture
========================
React Frontend
      │
      │ REST API
      ▼
Node.js / Express Backend
      │
      │ AI request
      ▼
FastAPI AI Service (TensorFlow Model)

      │
      ▼
PostgreSQL Database
==============================
Tech Stack
Backend

Node.js

Express.js

Database

PostgreSQL

AI Service

Python

FastAPI

TensorFlow

EfficientNet model

Security

JWT Authentication

bcrypt password hashing

Helmet

CORS protection

Documentation

Swagger (OpenAPI)

File Upload

Multer

Features
Patient

Register / Login

Upload skin image

AI disease prediction

View analysis history

Book doctor appointment

Pay for consultation

Chat with doctor after payment

Reset password via email OTP

Doctor

Register with syndicate card image

Wait for admin approval

View paid patient cases

Review AI analysis

Send diagnosis

Generate medical report

Admin

Approve / reject doctors

View all reports

Manage platform doctors

Folder Structure
src
│
├── config
│   ├── database.js
│   └── swagger.js
│
├── controllers
│   ├── authController.js
│   ├── analysisController.js
│   ├── doctorController.js
│   ├── appointmentController.js
│   ├── paymentController.js
│   ├── chatController.js
│   └── adminController.js
│
├── services
│   ├── authService.js
│   ├── analysisService.js
│   ├── appointmentService.js
│   ├── paymentService.js
│   ├── chatService.js
│   ├── adminService.js
│   ├── uploadService.js
│   └── doctorCardUploadService.js
│
├── routes
│   ├── authRoutes.js
│   ├── analysisRoutes.js
│   ├── doctorRoutes.js
│   ├── appointmentRoutes.js
│   ├── paymentRoutes.js
│   ├── chatRoutes.js
│   └── adminRoutes.js
│
├── middlewares
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   └── errorMiddleware.js
│
├── uploads
│   ├── skin-images
│   └── doctor-cards
│
└── app.js
Database Schema

Main tables:

ADMIN
DOCTOR
PATIENT
CHAT_ANALYSIS
CHAT_MESSAGES
APPOINTMENT
PAYMENT
REPORT
PASSWORD_RESET

Relationships include:

Patient → AI Analysis

Patient → Appointment → Doctor

Appointment → Payment

Appointment → Chat

Doctor → Report

Admin → Doctor approval

Environment Variables

Create .env file:

PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=skinner

JWT_SECRET=super_secret_key

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com

ADMIN_AUTH_CODE=SKINNER_ADMIN_2026

AI_SERVICE_URL=http://127.0.0.1:8000
Installation

Clone the repository:

git clone https://github.com/your-repo/skinner-backend.git
cd skinner-backend

Install dependencies:

npm install
Running the Backend

Start development server:

npm run dev

or

node server.js

Server runs on:

http://localhost:5000
API Documentation

Swagger documentation is available at:

http://localhost:5000/api-docs

Swagger includes:

request body examples

authentication

file upload endpoints

role-based endpoints

AI Service Setup

The AI model runs separately using FastAPI.

Install dependencies
pip install fastapi uvicorn tensorflow pillow numpy python-multipart
Run AI server
uvicorn api:app --reload --port 8000

AI endpoint:

POST /predict

Input:

skin image

Output:

{
  "predicted_class": "HFMD",
  "confidence": 0.99,
  "top_k": [...]
}
Image Uploads

Images are stored locally:

src/uploads/

Folders:

skin-images
doctor-cards

Images are accessible via:

http://localhost:5000/uploads/skin-images/filename.jpg
http://localhost:5000/uploads/doctor-cards/filename.jpg
Authentication

JWT-based authentication.

Header:

Authorization: Bearer TOKEN

Roles:

patient
doctor
admin
Role-based middleware protects routes.

Security Features
Password hashing using bcrypt
JWT authentication
Role-based access control
Helmet security headers
CORS configuration
OTP password reset


Example API Flow
=========================================
Patient uploads skin image
POST /api/analysis/upload-and-analyze
↓
AI predicts disease
↓
Patient books doctor
POST /api/appointment/book
↓
Patient pays consultation
POST /api/payment/pay
↓
Chat opens with doctor
↓
Doctor reviews case
POST /api/doctor/review-case
↓
Report generated
================================================
Future Improvements
Cloud storage for images (AWS S3)
Docker containerizatio
WebSocket real-time chat
Payment gateway integration
AI model improvements
Doctor rating system
Authors
SKINNER Backend developed as part of a graduation project.

Backend Developer:
Node.js / Express
PostgreSQL
AI Integration

License
This project is for educational and research purposes.

Important Notes
This system is not intended to replace medical diagnosis.
AI predictions are used as assistance only and must be verified by a certified doctor.