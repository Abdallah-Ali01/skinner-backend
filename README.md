# SKINNER Backend

AI-powered skin disease detection platform backend.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- TensorFlow
- FastAPI
- WebSocket
- JWT Authentication
- Swagger API Documentation

---

## System Flow

Patient uploads skin image

Patient → Upload Image  
→ AI Model analyzes image  
→ Result stored in database  
→ Patient can book doctor appointment

---

## Main Features

- Authentication (Patient / Doctor / Admin)
- AI Skin Disease Detection
- Doctor Appointment Booking
- Online Payment
- Real-time Chat (WebSocket)
- Admin Approval System
- Password Reset via Email
- Swagger API Documentation

---

## Project Structure
skinner-backend
├── ai/                 # AI Service (FastAPI + TensorFlow)
├── src/
│   ├── config/         # App configuration & Swagger
│   ├── controllers/    # API Request Handlers
│   ├── db/             # Database Connection (MongoDB/PostgreSQL)
│   ├── middlewares/    # Auth & Error Handlers
│   ├── routes/         # API Route Definitions
│   ├── services/       # Business Logic Layer
│   ├── socket/         # Real-time Chat Logic
│   ├── uploads/        # Static Files (Images)
│   ├── utils/          # Helper Functions
│   └── app.js          # Express Config
├── server.js           # Entry Point
├── test-socket.js      # Testing script for WebSockets
└── .env.example        # Environment Template

---

## API Documentation

Swagger UI available at:
/api-docs

---

## Installation

Clone the repository
git clone https://github.com/Abdallah-AI01/skinner-backend

Install dependencies
npm install

Run the server
npm run dev

---

## Environment Variables

Create `.env` file based on `.env.example`

---

## Database

Run `schema.sql` to initialize the database.

---

## Contributors

- Abdallah Tako
- Mahmoud Samir
