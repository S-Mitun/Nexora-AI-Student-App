# NEXORA System Architecture

> **Tagline**: Learn it. See it. Try it. Apply it. Master it.  
> **Mission**: An AI-powered, experience-first learning companion that turns difficult concepts into interactive, visual, and experiential journeys.

---

## 1. Architectural Philosophy

NEXORA operates on the philosophy: **"SHOW ME, DON'T JUST TELL ME."**
It does not replace schools, colleges, textbooks, or teachers. Instead, students come to NEXORA with concepts they find difficult and move through an experiential journey:

```
DISCOVER → WHY? → UNDERSTAND → VISUALIZE → EXPERIMENT → APPLY → ASK → PRACTICE → REFLECT → MASTER
```

---

## 2. High-Level System Architecture

```
                     +-----------------------------------+
                     |              STUDENT              |
                     +-----------------+-----------------+
                                       |
                                       v
                     +-----------------------------------+
                     |       NEXORA FRONTEND (Vite)      |
                     |  React 18, TypeScript, Tailwind   |
                     |  Design System, Responsive Nav    |
                     +-----------------+-----------------+
                                       |
                            HTTPS / JSON REST API
                                       |
                                       v
                     +-----------------------------------+
                     |      API LAYER (FastAPI v1)       |
                     |  CORS, Security, Global Handlers  |
                     |  Dependency Injection, OpenApi    |
                     +-----------------+-----------------+
                                       |
                                       v
                     +-----------------------------------+
                     |        APPLICATION SERVICES       |
                     +-----------------+-----------------+
                                       |
      +-----------------+--------------+-----------------+---------------+
      |                 |                                |               |
      v                 v                                v               v
+------------+   +--------------+                 +------------+   +------------+
|  Learning  |   | AI Provider  |                 | Document   |   | Document   |
|   Engine   |   | Abstraction  |                 | Harmonize  |   |   Export   |
|  (Concept, |   | (Gemini/OAI/ |                 |  Service   |   |  Service   |
|  Modules)  |   |    Mock)     |                 |  Boundary  |   |  Boundary  |
+------------+   +--------------+                 +------------+   +------------+
      |                 |                                |               |
      +-----------------+--------------+-----------------+---------------+
                                       |
                                       v
                     +-----------------------------------+
                     |            DATA LAYER             |
                     |  PostgreSQL / Supabase (RLS)      |
                     |  SQLAlchemy 2.0 ORM Mappings      |
                     |  Vector Store (Chroma / pgvector) |
                     +-----------------------------------+
```

---

## 3. Core Engine Extension Points

The complete learning system is architected around specialized modular engines that integrate seamlessly into this foundation:

| Engine | Role | Foundation Extension Point |
|---|---|---|
| **Learning Engine** | Subject, Topic, Concept, and Module hierarchy | `app/services/learning/` & `app/models/learning.py` |
| **Concept Engine** | Why it matters, simple & technical explanations | `app/services/learning/concept_service.py` |
| **AI Provider** | Replaceable LLM & embedding abstraction | `app/services/ai/base.py` & `app/services/ai/factory.py` |
| **Vector Store** | Replaceable vector database abstraction | `app/services/vector/base.py` |
| **Harmonization** | Multi-format material ingestion (PDF, DOCX, TXT) | `app/services/harmonization/service.py` |
| **Document Export** | Student journey report & PDF generation | `app/services/export/service.py` |
| **RAG Engine** | Retrieval-Augmented Generation for student inquiries | `app/api/v1/routes/chat.py` & `app/services/ai/` |
| **Simulation / Labs** | Visual simulations & virtual lab environments | `frontend/src/pages/LabsPage.tsx` |
| **Mind Map Engine** | Visual concept relationship trees | `frontend/src/pages/MindMapPage.tsx` |
| **Progress & Mastery** | Spaced repetition and student reflection tracking | `app/models/progress.py` & `frontend/src/pages/ProgressPage.tsx` |

---

## 4. Multi-Stage Roadmap Integration

This repository implements **MASTER PROMPT 01 (Foundation & Architecture)**. All subsequent prompts build directly upon these contracts:

1. **Master Prompt 01**: Foundation, Architecture, Project Structure & Development Framework *(Current)*
2. **Master Prompt 02**: UI/UX Design System & Micro-interactions
3. **Master Prompt 03**: Supabase Authentication + JWT + User Profiles
4. **Master Prompt 04**: Interest & Hobby Personalization Engine
5. **Master Prompt 05**: Learning Module Engine
6. **Master Prompt 06**: RAG + LLM Chatbot + Ingestion
7. **Master Prompt 07**: AI Notes + Summary + Personal PDF Generator
8. **Master Prompt 08**: Quiz + Adaptive Assessment
9. **Master Prompt 09**: Personal Notes + Learning Journal
10. **Master Prompt 10**: Virtual Laboratory Engine
11. **Master Prompt 11**: Interactive Simulation Engine
12. **Master Prompt 12**: CNN + Autoencoder Visualization Labs
13. **Master Prompt 13**: Old vs New Technology / Decision Lab
14. **Master Prompt 14**: Real-World Scenario Engine
15. **Master Prompt 15**: Multilingual Learning (English, Tamil, Telugu)
16. **Master Prompt 16**: AI Tutor + Teach-Back + Misconception Detection
17. **Master Prompt 17**: Fun Break / Engagement Engine
18. **Master Prompt 18**: Progress + Mastery + Spaced Repetition
19. **Master Prompt 19**: AI Study Planner
20. **Master Prompt 20**: Agentic Learning System
21. **Master Prompt 21**: Primary-School Visual Learning Environment
22. **Master Prompt 22**: College-Level Advanced Technical Labs
23. **Master Prompt 23**: Knowledge Graph + Prerequisite Engine
24. **Master Prompt 24**: Advanced Hybrid RAG + Reranking + Query Rewriting
25. **Master Prompt 25**: Offline/Low-Bandwidth + Accessibility + Security + Final Integration

---

## 5. Security & Isolation

- **Zero Secret Exposure**: Server-side credentials (`SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`) are kept isolated in the backend and never passed to the frontend bundle.
- **Client Security**: Frontend interacts strictly through standard CORS-protected REST APIs and verified Supabase public client keys.
- **User Data Isolation**: Every document, note, chat session, and progress record has an explicit `user_id` foreign key mapped to the authenticated user profile.
