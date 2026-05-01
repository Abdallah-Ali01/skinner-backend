# 🩺 Dermatology Chatbot API

A bilingual (Arabic/English) dermatology assistant chatbot built with FastAPI and powered by Cohere's LLM. The chatbot answers skin-related questions, detects the user's language automatically, and strictly limits responses to dermatology topics only.

---

## 📌 Features

- 💬 Conversational chatbot with multi-turn chat history support
- 🌍 Bilingual support — Arabic and English (auto-detected)
- 🔒 Strictly limited to dermatology and skin-related questions
- ⚡ Powered by Cohere (`command-a-03-2025`) LLM
- 🚀 Built with FastAPI

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | FastAPI |
| LLM | Cohere (`command-a-03-2025`) |
| Language | Python 3.10+ |
| Server | Uvicorn |

---

## 📁 Project Structure

```
├── src/
│   ├── main.py                  # App entry point, service initialization
│   ├── config.py                # Settings and environment variables
│   ├── api/
│   │   ├── routes.py            # API endpoints
│   │   └── schemes.py           # Request/Response models
│   ├── services/
│   │   ├── llm_service.py       # Cohere LLM provider
│   │   └── chat_service.py      # Core chatbot logic
│   ├── prompts/
│   │   └── system_prompt.py     # System prompt for the LLM
│   └── utils/
│       └── helpers.py           # Chat history formatter
├── requirements.txt
├── .env                         # Environment variables (not committed)
└── README.md
```

---

## ⚙️ Setup & Installation

### 1. Clone the repository

```bash
git clone https://github.com/SaraaElsayed/Dermatology-Chatbot
cd Dermatology-Chatbot
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Create a `.env` file

```env
COHERE_API_KEY=your_cohere_api_key_here
GENERATION_MODEL_ID=command-a-03-2025
```

### 5. Run the server

```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`

---

## 📡 API Endpoints

### `GET /api/v1/health`
Check if the service is running.

**Response:**
```json
{
  "status": "ok",
  "message": "Dermatology API is running",
  "chat_service_ready": true
}
```

---

### `POST /api/v1/chat`
Send a message to the dermatology chatbot.

**Request Body:**
```json
{
  "query": "What causes acne?",
  "chat_history": []
}
```

**With chat history (multi-turn):**
```json
{
  "query": "How do I treat it?",
  "chat_history": [
    { "role": "user", "content": "What causes acne?" },
    { "role": "assistant", "content": "Acne is caused by..." }
  ]
}
```

