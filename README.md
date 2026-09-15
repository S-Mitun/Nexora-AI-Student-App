# Nexora-AI-Student-App

NEXORA is an AI-powered, experience-first learning companion designed to help students understand, visualize, experiment with, and apply what they are already learning. Instead of simply generating notes or answering questions, NEXORA turns a difficult concept into an interactive learning experience:

```
DISCOVER → WHY? → UNDERSTAND → VISUALIZE → EXPERIMENT → APPLY → ASK → PRACTICE → REFLECT → MASTER
```

> **Tagline**: Learn it. See it. Try it. Apply it. Master it.

---

## What NEXORA Is Not

* NOT a replacement for schools, colleges, or universities
* NOT a replacement for teachers or textbooks
* NOT a generic LMS or course marketplace
* NOT a generic PDF summarizer or shallow AI chatbot

Students continue their regular education through their educational institutions and textbooks. NEXORA helps them master concepts they find difficult through the principle: **"SHOW ME, DON'T JUST TELL ME."**

---

## Technology Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: Python 3.10+, FastAPI, Pydantic v2, Pydantic-Settings, SQLAlchemy 2.0.
- **Database Foundation**: PostgreSQL / Supabase ready, local SQLite fallback for offline development.
- **AI Abstraction**: Replaceable `AIProvider` interface supporting Gemini, OpenAI, and deterministic local mock providers.
- **Vector DB Abstraction**: Replaceable `VectorStore` interface prepared for ChromaDB and pgvector.

---

## Project Structure

```
Nexora-AI-Student-App/
├── .env.example                 # Root environment configuration template
├── README.md                    # Project identity, documentation, and setup
├── ARCHITECTURE.md              # Long-term 25-stage architectural roadmap
├── package.json                 # Monorepo/workspace orchestrator scripts
│
├── backend/                     # FastAPI Backend Foundation
│   ├── .env.example
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # FastAPI application entrypoint & middleware
│   │   ├── core/                # Config, logging, and security foundations
│   │   ├── db/                  # Database session & base model
│   │   ├── models/              # SQLAlchemy models (profiles, learning, chat, notes)
│   │   ├── schemas/             # Pydantic validation schemas
│   │   ├── services/            # AI, learning, harmonization, export abstractions
│   │   └── api/                 # API router & modular v1 routes (/health, /learning)
│   └── tests/                   # Pytest test suite
│
└── frontend/                    # React + Vite + Tailwind Frontend
    ├── .env.example
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── components/          # Reusable UI components & layouts
        ├── pages/               # Home, Learn, Materials, Chat, Labs, etc.
        ├── services/            # API client with health checking
        └── types/               # TypeScript domain interfaces
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Verify backend health at: `http://localhost:8000/health` or `http://localhost:8000/api/v1/health`.
API documentation is available at: `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend will be live at: `http://localhost:5173`.

### 3. Running Automated Tests

```bash
# Backend tests
cd backend
pytest -v

# Frontend build & type check
cd frontend
npm run build
```

---

## Development Philosophy

1. **Build Incrementally**: Clear architectural boundaries across all 25 development stages.
2. **No Fake Functionality**: Features are either fully implemented and verified or cleanly marked with future stage badges.
3. **Replaceable Abstractions**: AI providers, vector stores, and databases are decoupled behind clean interfaces.
4. **Security & Privacy**: Zero hard-coded credentials; strict separation between client-safe and server-only configurations.
