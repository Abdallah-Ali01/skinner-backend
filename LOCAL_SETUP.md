# 💻 SKINNER Backend & Database Local Setup Guide

This guide provides step-by-step instructions to set up and run the **PostgreSQL Database** and the **Backend Services** (Node.js Express + Python FastAPI Microservices) locally.

---

## 📋 Prerequisites

Ensure you have the following installed on your local machine:
1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher, running locally)
3. **Python** (v3.10 or higher, for the AI and Chatbot microservices)
4. **PostgreSQL client** (like `psql` command-line utility, or GUI tools like pgAdmin 4 or DBeaver)

---

## 🗄️ Step 1: Local PostgreSQL Database Setup

### 1. Create a Local Database
Open your PostgreSQL shell (`psql`) or database GUI manager and run the following command to create a new database:
```sql
CREATE DATABASE skinner;
```

### 2. Initialize the Database Schema & Migrations
The database schema must be initialized by running the SQL scripts located in the `src/db/` directory. They **MUST** be run in the following sequence to build the tables and constraints correctly:

1. **`src/db/schema.sql`** (Core schema containing main tables)
2. **`src/db/migration_date_availability.sql`** (Per-date scheduling availability table)
3. **`src/db/migration_availability_fixes.sql`** (Availability table constraints)
4. **`src/db/chatbot_migration.sql`** (Chatbot history tables)

#### Option A: Initialize via Command Line (`psql`)
Open a terminal in the root of the backend directory and run:
```bash
# Replace 'postgres' with your database username if different
psql -U postgres -d skinner -f src/db/schema.sql
psql -U postgres -d skinner -f src/db/migration_date_availability.sql
psql -U postgres -d skinner -f src/db/migration_availability_fixes.sql
psql -U postgres -d skinner -f src/db/chatbot_migration.sql
```

#### Option B: Initialize via GUI (pgAdmin / DBeaver)
1. Connect to your local PostgreSQL server.
2. Select the `skinner` database.
3. Open the **Query Tool** or SQL editor.
4. Copy, paste, and run the contents of the four files in the exact order listed above.

---

## ⚡ Step 2: Node.js Express Backend Setup

### 1. Configure Environment Variables
In the root directory of the backend project (`skinner_backend/`), duplicate the `.env.example` file and rename it to `.env`:
```bash
cp .env.example .env
```

Open `.env` and set the following parameters:
```env
PORT=5000

# Database URL pointing to your local PostgreSQL database
# Use 'localhost' as host to ensure SSL is disabled locally
DATABASE_URL=postgresql://postgres:your_local_db_password@localhost:5432/skinner

# JWT signing secret (use any long random string for local development)
JWT_SECRET=local_development_secret_key_12345

# Local service endpoints
AI_SERVICE_URL=http://localhost:8000
CHATBOT_SERVICE_URL=http://localhost:8001
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# SMTP config for NodeMailer (Optional - required only for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
```

### 2. Install Dependencies & Start the Server
Run the following commands in the root backend directory:
```bash
# Install NPM packages
npm install

# Start the server in development mode (runs server.js via nodemon)
npm run dev
```

On success, you will see:
```text
Database schema check: 'age' column in 'doctor' table verified/added.
Database schema check: 'is_read' column in 'chat_message' table verified/added.
Server is running on port 5000
```

---

## 🧠 Step 3: AI Skin Disease Service Setup (FastAPI)

The AI Skin Disease Classifier runs as a separate Python FastAPI service using a TensorFlow model.

### 1. Set Up Python Virtual Environment
Navigate to the `ai/` directory and configure the environment:
```bash
cd ai

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (Command Prompt):
venv\Scripts\activate.bat
# On Windows (PowerShell):
venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate
```

### 2. Install Requirements
```bash
pip install -r requirements.txt
```

### 3. Run the Service
Start the AI Classifier server:
```bash
python api.py
```
*(The service loads the TensorFlow model `my_model.keras` and starts on `http://localhost:8000`)*

---

## 🤖 Step 4: Chatbot RAG Service Setup (FastAPI)

The Chatbot assistant uses Cohere's LLM API.

### 1. Set Up Python Virtual Environment
Navigate to the `chat-bot/` directory and configure the environment:
```bash
cd chat-bot

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (Command Prompt):
venv\Scripts\activate.bat
# On Windows (PowerShell):
venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate
```

### 2. Install Requirements
```bash
pip install -r src/requirements.txt
```

### 3. Configure Chatbot Environment Variables
Duplicate `.env.example` in `chat-bot/` and rename it to `.env`:
```bash
cp .env.example .env
```
Open `.env` and fill in your Cohere API key:
```env
COHERE_API_KEY=your_actual_cohere_api_key_here
GENERATION_MODEL_ID=command-a-03-2025
```

### 4. Run the Chatbot Service
Run the service on port **`8001`** to avoid conflicts with the AI service:
```bash
uvicorn src.main:app --host 127.0.0.1 --port 8001 --reload
```

---

## 🔍 Step 5: Verification & Health Checks

Verify your local backend setup using these health checks:

| Service | Test URL / Action | Expected Result |
|---|---|---|
| **Database Connection** | Run `node test-db.js` in root directory | Queries and logs database records without errors |
| **Express Backend** | Open `http://localhost:5000/api-docs` | Displays the Swagger API documentation UI |
| **AI Classifier Service** | Open `http://localhost:8000/` | Returns `{"status":"ok", "message":"Skin Disease Classifier API is running."}` |
| **Chatbot Service** | Open `http://localhost:8001/api/v1/health` | Returns `{"status":"ok", "message":"Dermatology API is running", "chat_service_ready":true}` |
