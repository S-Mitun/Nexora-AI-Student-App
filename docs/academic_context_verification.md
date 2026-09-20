# NEXORA Academic Context Engine & Level Isolation Verification

## Executive Summary
This document provides the authoritative architectural specification and verification record for the NEXORA Academic Intelligence Core & Level-Aware Workspace (Prompt 06R Hardened Repair).

NEXORA operates as a **personalized academic workspace**. Every data point presented to a student—enrolled subjects, active topics, learning activity logs, progress percentages, concept recommendations, and practice questions—is deterministically partitioned by `(user_id, academic_level)` and derived strictly from authenticated student profile settings and authoritative curriculum records.

---

## 1. Architectural Principles & Data Flow

```
Student Profile (education_level, grade_level, curriculum_id, board_type)
      ↓
Academic Identity Resolution
      ↓
Authoritative Academic Context (canonical_level, context_id, context_fingerprint)
      ↓
Partitioned Academic Workspace: (user_id, academic_level)
      ├── Enrolled Subjects (StudentSubject scoped to target level)
      ├── Activity Feed (AcademicActivityLog scoped to target level)
      ├── Academic Progress (UserProgress & QuizAttempt scoped to target level)
      └── Practice & Concept Content (Curriculum scoped to target level)
```

### Hard Architectural Rule: No Context, No Contextual Data
- If a user has not configured an academic level, or if data is missing for that level, the platform displays an **honest empty state**.
- The system **never** substitutes default Undergraduate Computer Science Engineering (CSE) data, mock datasets, or synthetic activity when a student is in Primary (`class_1_5`), Secondary (`class_6_10`), Higher Secondary (`class_11_12`), or Post-Graduate levels.
- Client-side code **never** uses fallbacks like `|| 'undergraduate'`.

---

## 2. Root Causes Identified and Repaired

| Failure Mode | Identified Root Cause | Architectural Correction |
|---|---|---|
| **Recent Activity & Progress Bleed** | Frontend (`HomePage.tsx`, `ProgressPage.tsx`) was reading unpartitioned client `localStorage` keys (`nexora_student_activities`, `nexora_active_course`) that retained data across level switches and logins. | Decoupled UI from `localStorage`. Replaced with level-partitioned backend endpoints: `GET /api/v1/workspace/activity` and `GET /api/v1/workspace/progress`. Added `clearActivities()` on profile level change. |
| **Enrolled Subjects Persisting on Level Switch** | The database entity `StudentSubject` lacked an `academic_level` column. SQL queries only filtered by `user_id`, causing Undergraduate subjects to remain present when switching to Class 8. | Added `academic_level` column with composite index `ix_student_subjects_user_level` on `(user_id, academic_level)` in `backend/app/models/learning.py` and `supabase/migrations/20260920000000_student_subject_level_isolation.sql`. |
| **Global CSE Curriculum Fallback** | Frontend pages (`SubjectsPage.tsx`, `NotesPage.tsx`, `PracticePage.tsx`, `LabsPage.tsx`, `MindMapPage.tsx`) had client-side fallbacks: `academicContext?.academic_level \|\| 'undergraduate'`. | Removed all `\|\| 'undergraduate'` fallbacks. All pages now enforce strict level guarding and honest `EmptyState` components. |
| **Level String Normalization Bug** | `curriculum_service.py` performed `.replace("-", " ")` but not `.replace("_", " ")`. Canonical `class_1_5` failed to match `["primary", "class 1 5"]`, falling through to SQL `ILIKE '%class_1_5%'` which failed against `'primary'`. | Normalized all level tokens to standard representations (`class_1_5`, `class_6_10`, `class_11_12`, `undergraduate`, `postgraduate`) handling both dashes and underscores uniformly across backend and frontend. |
| **Un-scoped / Auto-Provisioned Email Collisions** | Dev/test JWT tokens generated duplicate emails (`student_{user_id[:8]}@nexora.dev`), causing unique constraint crashes when testing multi-user isolation. | Sanitized user email derivation using full user identifier: `student_{user_id.replace('-', '_')}@nexora.dev`. |

---

## 3. Database Schema & Migration Details

### Table: `student_subjects`
- **Columns**:
  - `id`: UUID string (Primary Key)
  - `user_id`: UUID string (Foreign Key to `profiles.id`, indexed)
  - `subject_id`: UUID string (Foreign Key to `subjects.id`, indexed)
  - `academic_level`: String(50), nullable=True (Composite indexed)
  - `enrollment_source`: String(50), default="user_enrolled"
  - `is_active`: Boolean, default=True
  - `enrolled_at`: DateTime
- **Indexes**:
  - `ix_student_subjects_user_level` on `(user_id, academic_level)`
- **RLS Policies**:
  - `student_subjects_select_policy`: Users can view their own enrolled subjects matching active level.
  - `student_subjects_insert_policy`: Users can insert enrollment for themselves.
  - `student_subjects_delete_policy`: Users can remove their own enrollments.

---

## 4. Context Model & Deterministic Fingerprints

Every resolved academic context delivers:
```json
{
  "user_id": "...",
  "academic_level": "class_6_10",
  "education_category": "middle",
  "grade_level": "Class 8",
  "curriculum_id": "cur-00000000-0000-0000-0000-000000000002",
  "board_authority": "CBSE",
  "context_id": "ctx:class_6_10:cbse",
  "context_fingerprint": "a4f8...b12",
  "enrolled_subject_ids": ["..."],
  "available_material_ids": ["..."],
  "resolved_at": "2026-09-20T08:15:00Z"
}
```
- `context_id`: Deterministically generated as `ctx:{canonical_level}:{authority}`.
- `context_fingerprint`: SHA-256 hash of `(user_id, canonical_level, curriculum_id, grade_level, domain)`. Any change immediately invalidates frontend caches and flushes active workspace state.

---

## 5. Verification Test Suite Results

### Automated Backend Test Suite (Pytest)
Total tests: **68 passed in 6.04s** (100% pass rate)

Key test files:
- `backend/tests/test_context_isolation_hardened.py`:
  - `test_level_switch_activity_and_progress_isolation`: PASSED
  - `test_cross_student_academic_workspace_isolation`: PASSED
  - `test_primary_level_normalization_and_curriculum_retrieval`: PASSED
- `backend/tests/test_academic_identity_and_workspace.py`:
  - `test_curriculum_and_education_level_subjects_isolation`: PASSED
  - `test_academic_profile_fields_and_completeness`: PASSED
  - `test_subject_enrollment_and_workspace`: PASSED
  - `test_student_workspace_isolation`: PASSED
- `backend/tests/test_master_prompt_06.py`:
  - `test_academic_context_resolution_class_1_5`: PASSED
  - `test_academic_context_resolution_class_6_10`: PASSED
  - `test_academic_context_resolution_undergraduate`: PASSED
  - `test_level_change_workspace_isolation`: PASSED
  - `test_multi_user_context_isolation`: PASSED
  - `test_knowledge_source_and_academic_answer_contract`: PASSED
  - `test_api_get_workspace_context`: PASSED

### Frontend Build & Typecheck (TypeScript & Vite)
- Command: `npm run build`
- Result: **Exit Code 0, 0 TypeScript errors, 1,919 modules transformed into production bundle**.

---

## 6. Readiness Declaration
NEXORA's Academic Intelligence Core and Level Isolation foundation is fully repaired, hardened, verified, and ready for Prompt 07 and future agentic RAG workflows.
