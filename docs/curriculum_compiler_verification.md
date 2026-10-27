# NEXORA — MASTER PROMPT 04R: CURRICULUM COMPILER & CANONICAL DRAFT VERIFICATION

**Document Version:** 1.0.0  
**Phase:** 04R — Syllabus Curriculum Compiler & Canonical Draft  
**Target Syllabus:** `Algorithm_Design_Techniques___3rd_Semester.pdf` (User A: `d52061f5-0fc1-497f-bbba-7142519eab0d`)  
**Status:** FULLY COMPILED & VERIFIED (State C: `review_required`, `is_curriculum_active = False`)

---

## 1. Executive Summary

Master Prompt 04R transforms the evidence-backed structured extraction from 03R into a canonical, normalized curriculum **DRAFT** without premature curriculum activation.

### Key Milestones Achieved:
1. **Compilation Engine (`SyllabusCurriculumCompilerEngine`)**:
   - Converts raw 03R extracted units and topics into canonical Subject $\to$ Module $\to$ Lesson Candidate hierarchies.
   - Cleans OCR noise, duplicate page wraps, and repetitive syllabus headers while preserving 100% of academic meaning and terminology (`Unit`, `Module`, `Lab Component`).
   - Normalizes intra-unit duplicate lines while preserving cross-unit recurring subjects/topics with distinct IDs.
   - Attaches learning outcomes with explicit scoping (`course`, `subject`, `module`) and origin (`explicit` vs `inferred`).
   - Inactive State Invariant: **Strictly maintains `is_curriculum_active = False`** and `curriculum_status = "review_required"` (State C).
   - Zero runtime database pollution: `subjects`, `learning_modules`, `lessons`, and `practice_sets` remain untainted by draft entities.
2. **Schema & Database Migrations**:
   - Migration `20260923000000_curriculum_compiler_and_canonical_draft.sql` applied to Supabase and SQLite.
   - New table: `syllabus_draft_prerequisites` with RLS policies isolating users.
   - New draft compilation fields: `compilation_status`, `compilation_version`, `compilation_error`, `compiled_at`.
   - New module metadata: `original_label`, `sequence_order`.
   - Candidate fields on topics: `is_lesson_candidate`, `lesson_candidate_title`.
   - Outcome fields: `scope_level` (`scope`), `origin`.
3. **API & Endpoints**:
   - `POST /api/v1/syllabi/{syllabus_id}/versions/{version_id}/compile`: Compiles or re-compiles the draft idempotently.
   - `GET /api/v1/syllabi/drafts/{draft_id}` & `GET /api/v1/curriculum-drafts/{draft_id}`: Fetches the canonical compiled draft with all modules, candidates, outcomes, and prerequisites.
   - Strict multi-tenant isolation: 404/403 enforced on cross-user or mismatched context requests.
4. **Frontend Integration**:
   - `SyllabusPage.tsx`: Interactive modal with "Compile / Re-compile Draft" button, draft metrics summary bar (Subjects, Modules, Candidates, Outcomes, Prerequisites), lesson candidate badges, amber review tags, outcome scope/origin badges, dedicated prerequisites flow section, and disabled "Activate Curriculum (Coming in Prompt 05R)" button with lock icon.
   - `LearnPage.tsx`: Empty state messaging precisely aligned to Section 29 requirements: *"Curriculum draft is ready for review. Activate the curriculum to begin learning."*
   - `HomePage.tsx` & `SubjectsPage.tsx`: Verified zero draft leakage.
5. **Quality Assurance**:
   - **31 / 31** automated specification tests in `test_curriculum_compiler_and_draft.py` **PASSED** (100%).
   - **170 / 170** comprehensive backend tests **PASSED** (0 failures).
   - `frontend` production build (`npm run build`) succeeded with 0 TypeScript/Vite errors.

---

## 2. Canonical Hierarchy & Database Model

```
Syllabus (syllabi)
  └── SyllabusVersion (syllabus_versions) [status: uploaded, curriculum_status: review_required, is_active: false]
        └── SyllabusCurriculumDraft (syllabus_curriculum_drafts) [compilation_status: compiled, v: 2]
              ├── SyllabusDraftSubject (syllabus_draft_subjects) [name: "Algorithm Design Techniques 3rd Semester"]
              │     ├── SyllabusDraftModule (syllabus_draft_modules) [display_label: "Unit 1", seq: 1]
              │     │     └── SyllabusDraftTopic (syllabus_draft_topics) [is_lesson_candidate: true]
              │     ├── ... (Units 2, 3, 4, 5)
              │     ├── SyllabusDraftModule (syllabus_draft_modules) [display_label: "Lab Practical", seq: 6]
              │     │     └── SyllabusDraftTopic (syllabus_draft_topics) [24 candidate practical topics]
              │     └── SyllabusDraftOutcome (syllabus_draft_outcomes) [CO1 - CO5, scope: course, origin: explicit]
              └── SyllabusDraftPrerequisite (syllabus_draft_prerequisites) [5 inferred progressive prerequisite links]
```

---

## 3. Persistent Database Audit (Real Syllabus)

Target Syllabus: `Algorithm_Design_Techniques___3rd_Semester.pdf`  
User ID: `d52061f5-0fc1-497f-bbba-7142519eab0d`  
Syllabus ID: `75af4ac9-7bab-46c8-b66c-f01ca4a8821f`  
Version ID: `91e47350-e025-41b7-a634-ccc6416edcc2`  
Draft ID: `9df75534-0b5f-465a-aef4-cda29a05f90b`

### 3.1 Draft Compilation State
| Field | Value | Verification Notes |
| :--- | :--- | :--- |
| `status` | `review_required` | Required State C |
| `compilation_status` | `compiled` | Successfully compiled from 03R extraction |
| `compilation_version` | `2` | Idempotently incremented upon re-compilation |
| `compiled_at` | `2026-09-27 13:35:23` | Timestamped |
| `is_active` (version) | `False` | **CRITICAL INVARIANT PRESERVED** |
| `curriculum_status` | `review_required` | **CRITICAL INVARIANT PRESERVED** |

### 3.2 Canonical Modules & Lesson Candidates
| Seq | Display Label | Module Title | Original Label | Lesson Candidates Count | Review Required |
| :---: | :--- | :--- | :--- | :---: | :---: |
| 1 | `Unit 1` | Introduction to Fundamentals | `Unit 1` | 4 | 0 |
| 2 | `Unit 2` | Brute Force and Divide-and-Conquer | `Unit 2` | 7 | 0 |
| 3 | `Unit 3` | Dynamic Programming and Greedy Technique | `Unit 3` | 7 | 0 |
| 4 | `Unit 4` | Techniques for Iterative Improvement | `Unit 4` | 3 | 0 |
| 5 | `Unit 5` | Limitations of Algorithm Power | `Unit 5` | 6 | 0 |
| 6 | `Lab Practical` | Lab Component (Practical Applications) | `Lab Practical` | 24 | 0 |
| **Total**| — | **6 Modules** | — | **51 Lesson Candidates** | **0** |

### 3.3 Learning Outcomes
| Code | Scope | Origin | Confidence | Description Snippet |
| :--- | :---: | :---: | :---: | :--- |
| CO1 | `course` | `explicit` | `high` | Upon completion of the course, students shall have ability to Illustrate the... |
| CO2 | `course` | `explicit` | `high` | Interpret the design principles of greedy and pattern searching algorithms... |
| CO3 | `course` | `explicit` | `high` | Implement problem-solving methodology used in Backtracking... |
| CO4 | `course` | `explicit` | `high` | Analyse the time and space complexities of dynamic programming strategy... |
| CO5 | `course` | `explicit` | `high` | Discover range query and graph algorithms in real world applications... |

### 3.4 Prerequisites
| # | Type | Confidence | Review Required | Description |
| :---: | :---: | :---: | :---: | :--- |
| 1 | `inferred` | `medium` | `False` | Unit 1 foundational concepts required for Unit 2 |
| 2 | `inferred` | `medium` | `False` | Unit 2 foundational concepts required for Unit 3 |
| 3 | `inferred` | `medium` | `False` | Unit 3 foundational concepts required for Unit 4 |
| 4 | `inferred` | `medium` | `False` | Unit 4 foundational concepts required for Unit 5 |
| 5 | `inferred` | `medium` | `False` | Unit 5 foundational concepts required for Lab Practical |

---

## 4. Invariant Verification & Non-Contamination Audit

| Check | Expected | Actual Persistent DB Value | Status |
| :--- | :---: | :---: | :---: |
| `SyllabusVersion.is_active` | `False` | `False` | **PASSED** |
| `SyllabusVersion.curriculum_status` | `review_required` | `review_required` | **PASSED** |
| Runtime `subjects` populated from draft | 0 | 0 | **PASSED** |
| Runtime `learning_modules` populated from draft | 0 | 0 | **PASSED** |
| Runtime `lessons` populated from draft | 0 | 0 | **PASSED** |
| Practice questions generated | 0 | 0 | **PASSED** |
| Lab simulations created | 0 | 0 | **PASSED** |
| Binary Search fallback used | None | None | **PASSED** |
| External knowledge injected | None | None | **PASSED** |

---

## 5. Automated Test Suite Results

Test Execution Command:
```powershell
.venv\Scripts\pytest.exe -v tests/test_curriculum_compiler_and_draft.py
```

Results: **31 passed, 0 failed in 18.27s**
- `test_1_compile_authenticated_syllabus_version`: PASSED
- `test_2_ownership_validation`: PASSED
- `test_3_context_validation`: PASSED
- `test_4_missing_syllabus_failure`: PASSED
- `test_5_missing_extraction_failure`: PASSED
- `test_6_valid_draft_creation`: PASSED
- `test_7_subject_persistence`: PASSED
- `test_8_module_unit_persistence`: PASSED
- `test_9_lesson_topic_candidate_persistence`: PASSED
- `test_10_source_evidence_persistence`: PASSED
- `test_11_confidence_persistence`: PASSED
- `test_12_ordering_preservation`: PASSED
- `test_13_duplicate_detection`: PASSED
- `test_14_idempotent_compilation`: PASSED
- `test_15_retry_after_failure`: PASSED
- `test_16_draft_is_not_active_curriculum`: PASSED
- `test_17_no_practice_generation`: PASSED
- `test_18_no_simulation_generation`: PASSED
- `test_19_no_progress_creation`: PASSED
- `test_20_no_default_subjects`: PASSED
- `test_21_no_default_modules`: PASSED
- `test_22_no_binary_search_fallback`: PASSED
- `test_23_cross_user_isolation`: PASSED
- `test_24_cross_context_isolation`: PASSED
- `test_25_refresh_persistence`: PASSED
- `test_26_logout_login_persistence`: PASSED
- `test_27_malformed_structured_llm_response_handling`: PASSED
- `test_28_missing_ambiguous_extraction_handling`: PASSED
- `test_29_low_confidence_review_flag`: PASSED
- `test_30_no_external_source_injection`: PASSED
- `test_real_uploaded_syllabus_compilation_integration`: PASSED

Full Repository Backend Regression Suite:
```powershell
.venv\Scripts\pytest.exe
```
Results: **170 passed, 0 failed in 40.53s**

Frontend Build Verification:
```powershell
npm run build
```
Results: **Built cleanly in 4.98s (0 TypeScript errors)**

---

## 6. Known Invariants & Roadmap to Prompt 05R

- **Draft State Only**: The curriculum draft remains strictly un-activated.
- **Activation Block**: "Activate Curriculum" button in the frontend is disabled with a security lock tooltip designating activation for Prompt 05R.
- **Student Review**: The student can review candidate lessons, modify order, and approve outcomes prior to graduation into runtime learning structures.
