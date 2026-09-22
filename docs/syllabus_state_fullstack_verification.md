# NEXORA Full-Stack Syllabus State Synchronization & Pre-Activation Verification

**Document Version**: 1.0.0  
**Implementation Date**: September 2026  
**Scope**: Master Prompt 02R-A Specification  
**Status**: Verified & Synchronized across Database, Backend Services, REST APIs, and Frontend Web Client

---

## 1. Executive Architecture Summary

Prior to Master Prompt 02R-A, uploading a syllabus created a state divergence across the application:
- **Syllabus Page**: Displayed uploaded file and version metadata.
- **Materials Page**: Displayed the syllabus alongside study materials with an inappropriate `ready for curriculum intelligence (0%)` progress bar and pulsating spinner.
- **Home, Learn, Subjects, Practice, Labs**: Reported that "No active syllabus has been added yet," collapsing into State A (Zero Syllabus).

Master Prompt 02R-A establishes a strict, canonical **4-State Lifecycle Machine** across the entire full-stack architecture:

```
+-----------------------------------------------------------------------------------------------+
|                                CANONICAL 4-STATE MACHINE                                      |
+-----------------------------------------------------------------------------------------------+
|                                                                                               |
|   [State A: No Syllabus]                                                                      |
|       * has_syllabus: false                                                                   |
|       * upload_status: null                                                                   |
|       * curriculum_status: 'none'                                                             |
|       * is_curriculum_active: false                                                           |
|       --> All pages render honest onboarding CTAs to upload a primary syllabus.              |
|                                                                                               |
|                                 | (Student uploads primary syllabus)                          |
|                                 v                                                             |
|                                                                                               |
|   [State B: Uploaded / Pre-Activation] <--- AUTHORITATIVE CURRENT WORKING STATE               |
|       * has_syllabus: true                                                                    |
|       * upload_status: 'verified' (storage object verified on disk)                           |
|       * processing_status: 'not_started'                                                      |
|       * curriculum_status: 'not_built'                                                        |
|       * is_curriculum_active: false                                                           |
|       * Document.processing_stage: 'uploaded', progress_percent: 100, role: 'syllabus'       |
|       --> Syllabus Hub: displays active version & verified status.                            |
|       --> Materials Page: classified as "Primary Syllabus", no fake 0% intelligence spinners. |
|       --> Home Page: banner displays "Syllabus uploaded. Curriculum not activated yet."       |
|       --> Subjects, Practice, Labs: honest pre-activation state pointing to Syllabus Hub.    |
|                                                                                               |
|                                 | (Future Prompt 03R: Curriculum extraction & draft review)  |
|                                 v                                                             |
|                                                                                               |
|   [State C: Review Required / Draft]                                                          |
|       * has_syllabus: true                                                                    |
|       * curriculum_status: 'review_required' | 'draft'                                        |
|       * is_curriculum_active: false                                                           |
|       --> Pending user or admin confirmation before activation.                               |
|                                                                                               |
|                                 | (Activation triggered & confirmed)                          |
|                                 v                                                             |
|                                                                                               |
|   [State D: Curriculum Active]                                                                |
|       * has_syllabus: true                                                                    |
|       * curriculum_status: 'active'                                                           |
|       * is_curriculum_active: true                                                            |
|       --> Subjects, modules, practice sets, and labs calibrated to student curriculum.        |
|                                                                                               |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Migration Changes

### PostgreSQL Migration (`supabase/migrations/20260922010000_syllabus_state_synchronization.sql`)
1. Added columns to `syllabus_versions`:
   - `upload_status VARCHAR(50) DEFAULT 'uploaded'`
   - `processing_status VARCHAR(50) DEFAULT 'not_started'`
   - `curriculum_status VARCHAR(50) DEFAULT 'not_built'`
2. Added performance index: `idx_syllabus_versions_state ON syllabus_versions (syllabus_id, is_active, curriculum_status)`
3. Cleaned up legacy documents where `processing_stage` was set to premature values (`ready_for_curriculum_intelligence`, `extracting_modules`, `generating_units`).

### SQLite Development Alignment (`backend/app/main.py`)
- Automated PRAGMA table inspection on startup.
- Self-healing table migrations ensuring `profiles.education_level` is properly nullable.
- Synchronized `syllabus_versions` status columns and backfilled legacy records.
- Standardized `Document.processing_stage = 'uploaded'` and `progress_percent = 100` for all primary syllabus documents.

---

## 3. Backend Services & REST APIs

### 1. `SyllabusStateResolver.resolve_state(db, user_id, target_context_id)`
Located at `backend/app/services/syllabus/state_resolver.py`.
- Computes single source of truth directly from PostgreSQL/SQLite tables.
- Validates physical file existence on disk (`os.path.exists(target_version.storage_path)`).
- Resolves truthful `upload_status`, `processing_status`, and `curriculum_status`.
- Prevents inference or hallucination of curriculum activation.

### 2. Canonical State Endpoint: `GET /api/v1/syllabi/state`
- Query Params: `academic_context_id` (optional).
- Response Schema: `SyllabusCanonicalStateResponse`
```json
{
  "has_syllabus": true,
  "syllabus_id": "97ca0229-3a13-41c3-b413-5f0535805fc4",
  "current_version_id": "81f14841-3b7c-4869-923f-e170c1a84f3c",
  "academic_context_id": "ctx-undergraduate",
  "upload_status": "verified",
  "processing_status": "not_started",
  "curriculum_status": "not_built",
  "is_curriculum_active": false,
  "title": "Universal Computer Science Syllabus",
  "active_version_number": 1,
  "source_filename": "cs_syllabus.pdf",
  "file_size_bytes": 102450,
  "document_role": "syllabus",
  "updated_at": "2026-09-22T08:00:00Z"
}
```
- Alias Route Registered: `GET /api/v1/syllabus/state`.

### 3. Workspace Overview Alignment: `GET /api/v1/workspace`
- Injects canonical `syllabus_state` directly into the overview payload.
- Suppresses default or fake subjects whenever `is_curriculum_active == False`.

---

## 4. Frontend Shared Context & UI Synchronizations

### 1. `SyllabusContext` (`frontend/src/context/SyllabusContext.tsx`)
- Provides shared global state hook `useSyllabus()`.
- Implements race-condition protection using monotonic request ID references (`latestReqIdRef`).
- Provides `refreshSyllabusState()` called immediately after upload, activation, archive, or deletion.

### 2. Page Harmonization Across the Stack
| Page | State A (No Syllabus) | State B (Uploaded / Pre-Activation) |
| :--- | :--- | :--- |
| **Syllabus Hub** | Empty upload dropzone | Active syllabus card, version history, verified status badge |
| **Materials** | Empty materials card | Listed under "Primary Syllabus" section with "Verified Syllabus" badge; zero fake progress bars |
| **Home** | "No syllabus uploaded" action banner | Informational banner: "Syllabus uploaded. Curriculum not activated yet. View Syllabus Hub" |
| **My Learning** | "No active syllabus available" empty state | "Syllabus uploaded. Curriculum not activated yet. View Syllabus Hub" |
| **Subjects** | "No syllabus uploaded" empty state | "Syllabus uploaded. Curriculum not activated yet. View Syllabus Hub" |
| **Practice** | "No practice available yet" empty state | "Syllabus uploaded. Practice not ready yet. View Syllabus Hub" |
| **Labs** | "No curriculum-linked labs available" empty state | "Syllabus uploaded. Labs not ready yet. View Syllabus Hub" |

---

## 5. Automated Verification Results

- **Unit & Integration Test Suite**: `backend/tests/test_syllabus_state_synchronization.py` (10/10 Passed)
- **Lifecycle & Storage Test Suite**: `backend/tests/test_syllabus_upload_and_lifecycle.py` (27/27 Passed)
- **Full Backend Regression Suite**: `backend/tests/` (135/135 Passed)
- **Frontend TypeScript & Production Build**: `npm run build` (Passed, 0 errors)
