# NEXORA — Syllabus-First Architectural Rebaseline & Legacy Migration Plan

**Document ID**: `NEXORA-ARCH-00R-MIGRATION`  
**Target Branch**: `feature/syllabus-first-architecture`  
**Date**: September 2026  
**Status**: APPROVED ARCHITECTURAL REBASELINE & MIGRATION PLAN  
**Preceding Specifications**: Master Prompts 01–06, 06R (Retained Infrastructure); 05, 06R-2 (Superseded Curriculum Assumptions)

---

## Executive Summary

NEXORA is shifting from a **pre-seeded, static course website architecture** to an authentic **Syllabus-First, Material-Grounded, User-Specific, RAG-Powered Learning Architecture**.

Under the legacy model (Prompts 05–06R-2), the platform automatically populated global, pre-authored curriculum records on database initialization (`CurriculumSeedService.seed_if_empty`), substituting default Computer Science Engineering (CSE) and "Binary Search" content when user-specific academic context was missing or unpopulated.

Under the **Syllabus-First Architecture (Prompt 00R)**, the student's uploaded syllabus is the **exclusive authoritative source** for that student's academic workspace:
```
STUDENT PROFILE
      ↓
ACADEMIC CONTEXT (Level / Board / Institution / Year)
      ↓
UPLOAD SYLLABUS (PDF / DOCX / Image / Text)
      ↓
UNDERSTAND SYLLABUS (Structure / Units / Hours / Course Codes)
      ↓
EXTRACT CURRICULUM (Subjects → Modules/Units → Topics/Chapters → Concepts)
      ↓
STUDENT REVIEW & VALIDATION
      ↓
ACTIVATE CURRICULUM
      ↓
AUTHORIZED KNOWLEDGE WORKSPACE (Grounded in Syllabus)
      ↓
SECONDARY MATERIALS INGESTION (Textbooks, Notes, Question Papers mapped to active units)
      ↓
RETRIEVAL AUGMENTED GENERATION (RAG) + LOCAL AI TUTORING
```

### Absolute Architectural Rule
> **NO SYLLABUS, NO GENERATED CURRICULUM.**  
> Before a student uploads, reviews, and activates a syllabus for their active academic context:
> - The workspace must show a clean, honest empty state: *"No syllabus has been added yet. Upload your syllabus to build your learning workspace."*
> - The system must **never** display default prebuilt subjects, default modules, default lessons, default practice questions, default concept simulations, or fallback to Binary Search.
> - An empty workspace is strictly required and vastly superior to fabricated or irrelevant academic content.

---

## A. Current Architecture Summary

The existing NEXORA platform consists of:
1. **Frontend**: React 18, TypeScript, Vite, TailwindCSS (Vanilla token classes), React Router 6, Lucide Icons, KaTeX Math rendering, custom UI component library (`Card`, `Button`, `Badge`, `EmptyState`, `Callout`, `VisualContainer`).
2. **Backend**: Python 3.14 / FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2 schemas, SQLite (`nexora.db`) for local testing/development with dynamic PRAGMA schema synchronization, PostgreSQL / Supabase target with Row Level Security (RLS).
3. **Authentication & Identity**: Dual Supabase Auth + JWT fallback with Google OAuth and Email/Password; auto-sync to `profiles` table; comprehensive learning preferences and language settings (Tamil, Telugu, Hindi, English).
4. **Academic Workspace & Context**: `AcademicContextResolver` resolving `(education_level, grade_level, curriculum_id, board_type)`; composite partition indexing `(user_id, academic_level)`.
5. **Materials Ingestion Subsystem**: Asynchronous multi-format document ingestion pipeline (`Document` and `DocumentChunk` models, SHA-256 deduplication, chunking, status polling).

---

## B. Current Academic-Data Flow & Failure Modes

In the legacy architecture:
1. **Backend Startup Initialization**: `backend/app/main.py` lifespan invokes `CurriculumSeedService.seed_if_empty(session)`.
2. **Database Auto-Population**: `CurriculumSeedService` unconditionally inserts 5 global curricula (CBSE Primary, CBSE Secondary, CBSE Higher Secondary, ICSE, University Engineering) and ~15 prebuilt subjects (DSA, OS, DBMS, Networks, CBSE Science, Math, etc.) along with hardcoded topics, concepts, modules, lessons, and practice sets.
3. **Frontend Subject Display**: `SubjectsPage.tsx` and `HomePage.tsx` query `GET /api/v1/learning/subjects?education_level=...`. Because the database is pre-seeded, every student sees pre-fabricated subjects regardless of whether they uploaded a syllabus.
4. **Enrollment Coupling**: Students "enroll" in these global prebuilt subjects via `StudentSubject`.
5. **Learning Resolution**: Opening a subject loads pre-seeded topics and concepts. Clicking a concept loads pre-seeded modules and lessons.
6. **Concept Simulation & AI Fallbacks**: Calling `explore_concept` invokes `MockAIService`, which resolves against a static in-memory dictionary. If a concept is unknown, it defaults to `"binary search"`.

---

## C. Exact Default / Fallback Paths Discovered in Repository Audit

The comprehensive repository audit identified the following explicit default/fallback paths that must be removed:

| # | File Location | Line Numbers | Mechanism / Default Fallback Path |
|---|---|---|---|
| **1** | `backend/app/main.py` | L258–L264 | Startup lifespan unconditionally calls `CurriculumSeedService.seed_if_empty(session)`, inserting static subjects, topics, and concepts into the live database. |
| **2** | `backend/app/services/learning/curriculum_service.py` | L204–L1096 | `CurriculumSeedService.seed_if_empty()` contains 900 lines of hardcoded curricula, subjects, topics, concepts, modules, lessons, and practice sets. |
| **3** | `backend/app/api/v1/routes/learning.py` | L436, L474, L635, L707, L761 | Endpoints (`/modules`, `/lessons`, `/practice/sets`, `/practice/submit`) repeatedly trigger `CurriculumSeedService.seed_if_empty(db)` if tables are empty. |
| **4** | `backend/app/services/ai/mock.py` | L133–L135 | `MockAIProvider.generate_structured()`: `if not matched_key: matched_key = "binary search"`. Any unindexed concept query falls back to Binary Search. |
| **5** | `backend/app/services/learning/personalization_service.py` | L558–L567, L740–L747 | `get_recommended_topics()`: Injects hardcoded `concept="Binary Search"` for undergrad Gaming interest and as a standard default when fewer than 2 interest matches exist. |
| **6** | `frontend/src/pages/HomePage.tsx` | L73–L80 | `getExampleQueries()`: Fall-through default suggestions list includes hardcoded `{ label: 'Binary Search', domain: 'Computer Science' }`. |
| **7** | `frontend/src/pages/HomePage.tsx` | L128–L138 | `fetchWorkspaceData()`: Sets `lastLesson: 'Course Syllabus'`, causing "Continue Lesson" to navigate to `/learn?q=Course%20Syllabus`, triggering the `MockAIService` fallback to Binary Search. |
| **8** | `frontend/src/pages/HomePage.tsx` | L417 | Search bar input placeholder hardcodes `"Search concepts or topics (e.g. Doppler Effect, Binary Search, Deadlock)..."`. |
| **9** | `frontend/src/pages/LearnPage.tsx` | L71–L76, L214–L220, L504–L520 | Dedicated in-memory simulation state and stepper UI hardcoded specifically for Binary Search (`bsTarget`, `bsStep`, `bsHistory`, `bsArray`). |
| **10** | `frontend/src/pages/LabsPage.tsx` | L55–L64 | Static lab track `track-algorithms` hardcodes `activeLessonLink: '/learn?q=Binary%20Search'` and `activeLessonTitle: 'Binary Search Tree Visual Model'`. |
| **11** | `frontend/src/pages/PracticePage.tsx` | L54–L58 | Auto-selects `sets[0]` without checking if the practice set belongs to the student's active subject or enrolled syllabus. |
| **12** | `backend/app/api/v1/routes/learning.py` | L290–L350, L376–L430, L464–L525 | `get_concept_detail`, `get_module_detail`, `get_lesson_detail` query entities globally without validating active student context or parent hierarchy. |

---

## D. Binary Search Leakage Paths

Binary Search appeared in 5 distinct functional contexts:
1. **AI Provider Fallback**: Default return key in `MockAIProvider.generate_structured` when any concept query is unrecognized.
2. **Personalization Recommendation Fallback**: Injected as an arbitrary fallback topic in `PersonalizationService.get_recommended_topics`.
3. **Hardcoded Search & Suggestion Elements**: Present in `HomePage.tsx` example queries and input placeholders.
4. **Hardcoded Visual Stepper Simulation**: Dedicated React state in `LearnPage.tsx` designed specifically for an array-bisection animation.
5. **Static Lab Blueprint**: Hardcoded track in `LabsPage.tsx` (`track-algorithms`).

*Design Principle*: Binary Search is a legitimate academic concept for computer science students whose uploaded syllabus contains it. However, it must **never** be hardcoded, injected as a default, or displayed to students in other domains (e.g. Primary, Secondary, Biology, Mechanical Engineering, Physics).

---

## E. Existing Database Tables Inventory

| Table Name | Primary Key | Foreign Keys | Purpose in Legacy Architecture | Role in Syllabus-First Architecture |
|---|---|---|---|---|
| `profiles` | `id` (UUID) | None | Stores user profile, education tier, board, language, preferences. | **RETAIN & EXTEND**: Retain user identity, add pointer to active syllabus version. |
| `curricula` | `id` (UUID) | None | Global boards (CBSE, ICSE, University Engg). | **MIGRATE**: Rebrand as system reference templates or replace with user-specific `curricula`. |
| `subjects` | `id` (UUID) | `curriculum_id` | Pre-seeded global subjects (DSA, OS, Science). | **REFACTOR**: Must be scoped to user's active syllabus version (`syllabus_id`, `user_id`). |
| `topics` | `id` (UUID) | `subject_id` | Pre-seeded subject topics. | **REFACTOR**: Generated dynamically from syllabus units/chapters. |
| `concepts` | `id` (UUID) | `topic_id` | Pre-seeded granular concepts. | **REFACTOR**: Extracted dynamically from syllabus topics and user materials. |
| `learning_modules` | `id` (UUID) | `concept_id` | Pre-seeded theory/blueprint modules. | **REFACTOR**: Scoped to syllabus units and extracted lessons. |
| `lessons` | `id` (UUID) | `module_id` | Pre-seeded text lessons. | **REFACTOR**: Generated from verified materials mapped to syllabus units. |
| `student_subjects` | `id` (UUID) | `user_id`, `subject_id` | Tracks enrolled subjects per user & level. | **REFACTOR**: Must reference subjects generated from student's active syllabus. |
| `documents` | `id` (UUID) | `user_id`, `curriculum_id`, `subject_id` | Uploaded PDFs/docs with async processing stage. | **RETAIN & EXTEND**: Add `document_role` (`primary_syllabus` vs `secondary_material`). |
| `document_chunks` | `id` (UUID) | `document_id` | Text chunks with token counts & vector IDs. | **RETAIN & ENHANCE**: Core retrieval units for contextual RAG. |
| `user_progress` | `id` (UUID) | `user_id`, `concept_id`, `subject_id` | Tracks concept mastery and time spent. | **RETAIN**: Scoped to user's verified syllabus concepts. |
| `quiz_attempts` | `id` (UUID) | `user_id`, `concept_id`, `subject_id` | Tracks practice check scores. | **RETAIN**: Scoped to user's active syllabus. |
| `notes` | `id` (UUID) | `user_id`, `concept_id`, `subject_id` | Student-authored study notes. | **RETAIN**: User-owned content linked to syllabus concepts. |
| `learning_activity_logs`| `id` (UUID) | `user_id` | Immutable event audit trail. | **RETAIN & EXPAND**: Add syllabus lifecycle events (`syllabus_uploaded`, `syllabus_activated`). |
| `practice_sets` | `id` (UUID) | `subject_id`, `concept_id` | Question collections. | **REFACTOR**: Authored/generated strictly for syllabus-verified concepts. |
| `practice_questions` | `id` (UUID) | `practice_set_id` | Individual MCQ items with explanations. | **REFACTOR**: Grounded in syllabus learning objectives. |
| `chat_threads` / `messages` | `id` (UUID) | `user_id`, `concept_id` | AI tutoring conversations. | **RETAIN**: Grounded in active syllabus context. |

---

## F. Existing Useful Infrastructure (Must Be Preserved)

The following components represent high-value engineering that **must NOT be discarded**:
1. **Authentication & Identity System**:
   - Supabase Auth + JWT fallback, Google OAuth, session token management.
   - User profile management, password updates, provider linking in `AuthContext.tsx` and `backend/app/core/security.py`.
2. **User Preferences & Personalization Engine**:
   - Language preferences (`en`, `ta`, `te`, `hi`), learning style preferences (`visual`, `practical`, `step_by_step`), interests categorization in `personalization_service.py`.
3. **Database Security & RLS**:
   - Multi-tenant tenant isolation policies (`auth.uid() = user_id`) across tables in `supabase/migrations/`.
4. **Document Ingestion Pipeline**:
   - Async background ingestion in `DocumentIngestionService` (`backend/app/services/ingestion/service.py`), file validation, disk streaming, SHA-256 deduplication.
5. **Context Engine Isolation**:
   - Level-aware isolation patterns implemented in Prompt 06R (`academic_level`, `canonical_context_id`, `context_fingerprint`).
6. **Student Notes & Activity Auditing**:
   - Full CRUD notes API (`backend/app/api/v1/routes/notes.py`) and activity audit logger (`backend/app/api/v1/routes/workspace.py`).
7. **Frontend Design System & UI Components**:
   - Complete custom tokenized UI library (`Card`, `Button`, `Badge`, `Callout`, `EmptyState`, `SkeletonCard`, `Topbar`, `Sidebar`, `MobileNav`).

---

## G. Components That Must Be Refactored

1. **`CurriculumSeedService` (`backend/app/services/learning/curriculum_service.py`)**:
   - Remove automatic execution from `main.py` lifespan and route handlers.
   - Separate seed data into optional development fixtures or reference curriculum templates, completely isolated from runtime student workspaces.
2. **`HomePage.tsx`**:
   - Transform "My Enrolled Subjects" into "Your Syllabus & Curriculum".
   - If no syllabus is active: render primary call-to-action to upload syllabus.
   - Remove hardcoded search suggestions and placeholder texts.
3. **`SubjectsPage.tsx`**:
   - If no active syllabus exists: display honest empty state with "Upload Syllabus" action.
   - Display subjects extracted from the student's active syllabus rather than global system curriculum.
4. **`LearnPage.tsx`**:
   - Remove hardcoded Binary Search simulation state and steppers.
   - If concept has no simulation, display clean explanation + note-taking + practice, with honest badge *"Theoretical Analysis"*.
5. **`PracticePage.tsx`**:
   - Scope practice sets strictly to active syllabus subjects. Display *"Practice not yet calibrated for this unit"* when ungenerated.
6. **`LabsPage.tsx`**:
   - Dynamically filter lab tracks to match subjects extracted from the active syllabus.
7. **`backend/app/services/ai/mock.py`**:
   - Remove `matched_key = "binary search"` fallback. Return 404 or un-simulated structured decomposition when a concept is not explicitly indexed.

---

## H. Components That Can Remain As-Is

1. `backend/app/api/v1/routes/auth.py` and `backend/app/core/security.py`
2. `backend/app/api/v1/routes/profile.py` and `frontend/src/pages/ProfilePage.tsx`
3. `backend/app/api/v1/routes/notes.py` and `frontend/src/pages/NotesPage.tsx`
4. `frontend/src/context/AuthContext.tsx`
5. `frontend/src/components/layout/` (`Sidebar.tsx`, `Topbar.tsx`, `MobileNav.tsx`)
6. `backend/app/services/vector/base.py` (Vector store interface)

---

## I. Components That Should Be Deprecated / Quarantined

1. **`CurriculumSeedService.seed_if_empty` runtime invocation**: Deprecate runtime auto-seeding. Quarantine existing seed records as read-only reference templates.
2. **Client-side `studentActivityService` `localStorage` operations**: Deprecate unpartitioned local activity stores.
3. **Hardcoded CSE Recommendation Fallbacks**: Deprecate static topic injections in `PersonalizationService.get_recommended_topics`.

---

## J. Proposed Syllabus-First Target Data Model

```
USER (profiles)
  ↓
ACADEMIC_CONTEXT (user_id, academic_level, board_type, institution, program)
  ↓
SYLLABI (id, user_id, context_id, title, course_code, institution, status)
  ↓
SYLLABUS_VERSIONS (id, syllabus_id, version_number, raw_document_id, extraction_status, is_active)
  ↓
CURRICULA (user_id, syllabus_version_id, name, total_credits, academic_year)
  ↓
SUBJECTS (id, curriculum_id, syllabus_version_id, user_id, name, code, credits, order_index)
  ↓
MODULES / UNITS (id, subject_id, unit_number, title, description, prescribed_hours, order_index)
  ↓
TOPICS / CHAPTERS (id, module_id, title, description, order_index)
  ↓
CONCEPTS (id, topic_id, name, slug, summary, learning_outcome, order_index)
  ↓
LESSONS (id, module_id, topic_id, title, content, content_source, order_index)
```

### New Database Entities Specification

#### 1. Table `syllabi`
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key $\rightarrow$ `profiles.id`, indexed)
- `academic_level`: String (e.g. `class_6_10`, `class_11_12`, `undergraduate`, `postgraduate`)
- `institution`: String (e.g. "Anna University", "Delhi Public School")
- `program_degree`: String (e.g. "B.Tech Computer Science", "Class 10 CBSE")
- `academic_year`: String (e.g. "2025–2026", "Regulation 2021")
- `title`: String
- `status`: String (`uploaded`, `processing`, `extracted`, `confirmed`, `archived`)
- `created_at`, `updated_at`: Timestamps

#### 2. Table `syllabus_versions`
- `id`: UUID (Primary Key)
- `syllabus_id`: UUID (Foreign Key $\rightarrow$ `syllabi.id`, CASCADE)
- `version_number`: Integer (default 1)
- `document_id`: UUID (Foreign Key $\rightarrow$ `documents.id`, SET NULL)
- `raw_extracted_json`: JSON (Structured output of AI syllabus parser)
- `is_active`: Boolean (default True)
- `activated_at`: Timestamp (nullable)

#### 3. Enhancement to `documents`
- `document_role`: String (`primary_syllabus`, `reference_book`, `lecture_notes`, `question_paper`, `assignment`, `unclassified`)
- `syllabus_id`: UUID (Foreign Key $\rightarrow$ `syllabi.id`, nullable)
- `mapped_subject_ids`: JSON (List of subject IDs this document supports)
- `mapped_unit_ids`: JSON (List of module/unit IDs this document supports)

#### 4. Enhancement to `subjects`, `topics`, `concepts`, `learning_modules`, `lessons`
- Add `user_id`: UUID (Foreign Key $\rightarrow$ `profiles.id`, nullable for legacy reference templates)
- Add `syllabus_version_id`: UUID (Foreign Key $\rightarrow$ `syllabus_versions.id`, nullable)
- Add `content_source`: String (`syllabus_extracted`, `user_material`, `verified_authored`, `system_reference`)
- Compound index: `ix_subjects_user_syllabus` on `(user_id, syllabus_version_id)`

---

## K. Migration Strategy (Step-by-Step)

```
PHASE 0: AUDIT & SPECIFICATION (Current Task - Complete)
    ↓
PHASE 1: DATABASE SCHEMA MIGRATION
    - Add syllabi & syllabus_versions tables
    - Add document_role and syllabus_version_id foreign keys
    - Add user_id and content_source to curriculum hierarchy tables
    - Write RLS policies ensuring students only see their active syllabus curriculum
    ↓
PHASE 2: DETACH RUNTIME PRE-SEEDING
    - Disable CurriculumSeedService.seed_if_empty on application startup
    - Quarantine legacy starter records as read-only reference templates (is_system = True, user_id = NULL)
    ↓
PHASE 3: SYLLABUS UPLOAD & EXTRACTION ENGINE
    - Create POST /api/v1/syllabus/upload endpoint
    - Implement structured syllabus extractor (extracts course title, subjects, units, topics)
    - Store parsed draft in syllabus_versions.raw_extracted_json
    ↓
PHASE 4: SYLLABUS REVIEW & CONFIRMATION API
    - GET /api/v1/syllabus/draft: Student inspects extracted curriculum
    - POST /api/v1/syllabus/activate: Materializes confirmed JSON into subjects, modules, topics
    ↓
PHASE 5: FRONTEND WORKSPACE ADAPTATION
    - Update HomePage, SubjectsPage, LearnPage to check for active syllabus
    - Render "Upload Syllabus" empty states when no syllabus is active
    - Render extracted subjects and modules when active
    ↓
PHASE 6: SECONDARY MATERIAL MAPPING
    - Update MaterialsPage to allow tagging uploaded books/notes to active syllabus units
    - Connect DocumentChunks to specific syllabus subject_id and module_id
```

---

## L. Data-Loss Risks & Mitigations

| Risk | Potential Impact | Architectural Mitigation |
|---|---|---|
| **Accidental Deletion of User Accounts** | Students lose auth credentials and profiles. | **Strict Table Retention**: The `profiles` table is strictly preserved. No `DROP TABLE profiles` or destructive alterations will occur. |
| **Loss of Student Study Notes** | Students lose authored notes. | **Foreign Key Preservation**: `notes` table foreign keys (`concept_id`, `subject_id`) are preserved with `ON DELETE SET NULL` or retained in legacy scope. |
| **Broken Test Suites** | 68 existing tests expecting seeded subjects fail. | **Isolated Test Fixtures**: Seed logic is moved into an explicit `pytest` fixture (`seed_legacy_reference_curriculum`) so existing tests pass without affecting live application runtime. |
| **Orphaned Document Chunks** | Uploaded materials lose vector association. | **Document Model Retention**: `documents` and `document_chunks` tables remain completely intact. |

---

## M. Existing Tests Affected & Adaptation Plan

1. **`test_curriculum_engine.py`**:
   - *Impact*: Tests query global pre-seeded subjects (`data-structures-algorithms`).
   - *Adaptation*: Utilize explicit test fixture `seed_test_curriculum` to inject test-scoped curriculum records.
2. **`test_academic_identity_and_workspace.py`**:
   - *Impact*: Enrolls in CBSE science from legacy seed.
   - *Adaptation*: Supply an active syllabus fixture before enrollment checks.
3. **`test_master_prompt_06.py` and `test_context_isolation_hardened.py`**:
   - *Impact*: Validates context isolation on legacy tables.
   - *Adaptation*: Test isolation on user-scoped syllabus tables.

---

## N. New Tests Required for Syllabus-First Validation

1. **`test_no_syllabus_empty_workspace`**:
   - Fresh user logs in $\rightarrow$ `/workspace` returns `active_syllabus: null`, `subjects: []`, `enrolled_subjects: []`.
   - Verified that NO default subjects, NO CSE modules, and NO Binary Search appear.
2. **`test_syllabus_upload_and_draft_extraction`**:
   - Student uploads syllabus PDF $\rightarrow$ parses course name, 4 units, and topics.
   - Verifies status is `extracted` with editable draft JSON.
3. **`test_syllabus_activation_creates_user_curriculum`**:
   - Student activates draft $\rightarrow$ creates database `Subject`, `LearningModule`, and `Topic` records tagged with `user_id` and `syllabus_version_id`.
   - Subjects now appear in `/workspace/subjects`.
4. **`test_workspace_subject_module_hierarchy`**:
   - Selecting a syllabus-generated subject loads only modules belonging to that specific subject.
   - Cross-subject or cross-syllabus module tampering returns `404 Not Found`.
5. **`test_cross_student_syllabus_isolation`**:
   - Student A uploads Mechanical Engineering syllabus.
   - Student B uploads Computer Science syllabus.
   - Student A's workspace contains 0 CS subjects; Student B's workspace contains 0 Mechanical subjects.
6. **`test_secondary_material_mapping_to_syllabus`**:
   - Student uploads textbook PDF and tags it to Unit 2.
   - Verifies document chunks link to active Unit 2 and do not alter syllabus structure.

---

## O. Recommended Implementation Order

1. **Phase 1 (Database)**: Implement migration `20260921000000_syllabus_first_foundation.sql` adding `syllabi`, `syllabus_versions`, and scoping columns.
2. **Phase 2 (Runtime Cleanse)**: Remove `CurriculumSeedService.seed_if_empty` from `main.py` lifespan; isolate seed logic into test-only fixtures.
3. **Phase 3 (Service Layer)**: Implement `SyllabusService` (ingest syllabus, parse structure, activate curriculum).
4. **Phase 4 (API Endpoints)**: Implement `/api/v1/syllabus` endpoints (`upload`, `draft`, `activate`, `current`).
5. **Phase 5 (Frontend Rebaseline)**: Update `HomePage.tsx`, `SubjectsPage.tsx`, `LearnPage.tsx`, `PracticePage.tsx` with honest empty states and syllabus activation workflows.
6. **Phase 6 (Verification & Regression)**: Run full pytest suite and verify 0 default fallbacks exist.

---

## Conclusion & Architectural Confirmation

The migration plan establishes the foundation for NEXORA to operate as a **genuine syllabus-first learning companion**. No implementation modifications have been made during this planning task. Execution will proceed upon approval of this specification.
