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
- AI Chat Bot
- Doctor Appointment Booking
- Online Payment
- Real-time Chat (WebSocket)
- Admin Approval System
- Password Reset via Email
- Swagger API Documentation

---

##  Project Structure

```text
skinner-backend
├── ai/                # AI service (FastAPI + TensorFlow model)
├── chat-bot/          # AI Chat Bot service
│   ├── data/          # Chat Bot training data
│   └── src/           # Chat Bot source code
├── src/
│   ├── config/        # Database config & Swagger setup
│   ├── controllers/   # API controllers (handle requests)
│   ├── db/            # Database connection and helpers
│   ├── middlewares/   # Authentication & error middleware
│   ├── routes/        # API routes definitions
│   ├── services/      # Business logic layer
│   ├── socket/        # WebSocket real-time chat
│   ├── uploads/       # Uploaded images storage
│   └── utils/         # Utility/helper functions
├── server.js          # Application entry point
├── test-socket.js     # WebSocket testing script
├── package.json       # Project dependencies
├── .env.example       # Environment variables template
└── README.md          # Project documentation
```
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

| Name | Role |
|------|------|
| Abdallah Tako | Backend |
| Mahmoud Samir | Backend |
| Mariz Atef | AI |
| Eman Elsayed | Chat Bot |
