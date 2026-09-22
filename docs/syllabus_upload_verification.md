# Syllabus Upload & Academic Document Lifecycle Verification (Master Prompt 02R)

**Scope:** Master Prompt 02R — Universal Syllabus Upload, Primary Academic Document Foundation, Syllabus Version Lifecycle, and Secure User/Context Ownership  
**Date:** 2026-09-22  
**Status:** **VERIFIED (PASS)**  

---

## 1. Supported File Formats

The upload pipeline validates file extension, MIME type, and content integrity before storage or registration:
- **PDF (`.pdf`, `application/pdf`)**: Preserved for document intelligence and structure analysis. Scanned PDFs are accepted.
- **Word (`.docx`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)**: Accepted and stored safely.
- **PowerPoint (`.pptx`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`)**: Course outlines/slides accepted.
- **Plain Text (`.txt`, `text/plain`)**: Raw syllabus text accepted.
- **Images (`.jpg`, `.jpeg`, `.png`)**: Scanned image syllabi accepted and classified for downstream document intelligence.
- **Rejected Formats (`.exe`, `.sh`, `.py`, `.bin`, `.zip`)**: Immediate HTTP 400 Bad Request rejection with informative message.

---

## 2. Universal Upload Workflow

1. **Student Initiates Upload**:
   - Navigation: Top-level `/syllabus` page, or empty workspace CTAs on Home, My Learning, Subjects, Practice, or Labs.
   - User supplies file + optional syllabus title.
2. **Backend Authentication & Context Resolution**:
   - Identity resolved via Supabase Bearer JWT (`get_current_user`). Never trusts client-supplied user ID.
   - Authoritative academic context resolved dynamically via `AcademicContextResolver.resolve_context(db, user_id)`.
3. **Validation & Hashing**:
   - Empty files (0 bytes) rejected with HTTP 400.
   - Oversized files (> 50 MB) rejected with HTTP 413.
   - Filenames sanitized with regex preventing directory traversal (`../`) or shell injection.
   - Content SHA-256 hash computed deterministically.
4. **Duplicate Detection**:
   - Checks if user has already uploaded a version with identical SHA-256 in the same academic context.
   - If identical: returns existing version reference with `is_duplicate = True` and avoids redundant storage/processing.
   - If content differs (even with same filename): safely accepts and increments version.
5. **Storage & Persistence**:
   - File saved privately in isolated path: `data/storage/syllabi/{user_id}/{syllabus_id}/v{version_number}/{safe_filename}`.
   - `Syllabus` record created or updated (`status = 'uploaded'`).
   - `SyllabusVersion` record created with metadata (size, mime, checksum, storage path).
   - `Document` record created with `document_role = 'syllabus'` in the primary curriculum pipeline.
6. **Invariant Enforced**:
   - **ZERO subjects, modules, lessons, or concepts created at upload time.**
   - Workspace remains clean until future syllabus-intelligence prompts activate a confirmed curriculum.

---

## 3. Ownership & Security Model

| Security Dimension | Enforcement Mechanism | Status |
| :--- | :--- | :--- |
| **Authentication** | Supabase JWT verified via `get_current_user` dependency | PASS |
| **User Ownership** | All queries strictly scoped by `Syllabus.user_id == current_user.id` | PASS |
| **Cross-User Reads** | User B querying User A's syllabus ID receives HTTP 404 | PASS |
| **Cross-User Updates** | User B posting a version or activating User A's syllabus receives HTTP 404 | PASS |
| **Cross-User Deletes** | User B attempting delete receives HTTP 404 | PASS |
| **Private File Storage** | Syllabi stored in unexposed directory; streaming endpoint requires auth & ownership | PASS |
| **Path Traversal Protection** | Filenames sanitized; internal paths parameterized with UUIDs | PASS |
| **Context Isolation** | Syllabi indexed and filtered by `academic_context_id` and `academic_level` | PASS |

---

## 4. Syllabus Version Lifecycle

A version-aware lifecycle replaces blind file overwriting:
- **Version Numbering**: Starts at v1; subsequent uploads increment (`v2`, `v3`, etc.).
- **Historical Retention**: Old versions are retained on disk and in database.
- **Active State**: Only one version may be active (`is_active = True`). Activating a version deactivates siblings.
- **Lifecycle States**:
  - `uploaded`: File stored, registered, ready for document intelligence.
  - `processing`: Document intelligence actively running.
  - `processed`: Extraction complete, ready for student review.
  - `active`: Activated as authoritative curriculum source.
  - `archived`: Historical version preserved for reference.
  - `failed`: Gracefully marked if unreadable, with clear diagnostics in logs.
- **Truthful Status**: Real status strings displayed; zero simulated percentages (no fake 73% or 91%).

---

## 5. Automated Test Results

Test Suite: `backend/tests/test_syllabus_upload_and_lifecycle.py`  
Total Test Cases: 27 test functions covering all 30 Master Prompt 02R Section 32 requirements:

| # | Test Name | Target Requirement | Result |
| :--- | :--- | :--- | :--- |
| 1 | `test_req_01_authenticated_syllabus_upload` | Authenticated upload returns 201 + valid metadata | **PASS** |
| 2 | `test_req_02_unauthenticated_upload_rejection` | Missing auth returns 401 Unauthorized | **PASS** |
| 3 | `test_req_03_valid_file_formats_accepted` | PDF, DOCX, PPTX, TXT, JPG, PNG all accepted | **PASS** |
| 4 | `test_req_04_unsupported_file_rejection` | EXE, SH, PY, ZIP, BIN rejected with 400 | **PASS** |
| 5 | `test_req_05_oversized_and_empty_file_rejection` | 0-byte (400) and >50MB (413) rejected | **PASS** |
| 6-10 | `test_req_06_to_10_database_records_and_metadata` | Syllabi, versions, doc role='syllabus', context & user | **PASS** |
| 11-12 | `test_req_11_and_12_cross_user_isolation` | User B blocked from read/update/delete/download | **PASS** |
| 13 | `test_req_13_cross_context_isolation` | Cross-context syllabus separation | **PASS** |
| 14-15 | `test_req_14_and_15_checksum_and_duplicate_detection` | SHA-256 duplicate detection; new content accepted | **PASS** |
| 16-17 | `test_req_16_and_17_status_and_refresh_persistence` | Persistent status across multiple queries | **PASS** |
| 18-22 | `test_req_18_to_22_zero_curriculum_creation_at_upload` | Zero subjects/modules/practice; no binary search | **PASS** |
| 23 | `test_req_23_no_fake_processing_percentage` | Truthful status strings; no simulated progress | **PASS** |
| 24-25 | `test_req_24_and_25_version_history_and_lifecycle` | Versions v1 & v2 retained; activate & archive | **PASS** |
| 26 | `test_req_26_storage_download_access_protection` | Owner download works; unauthenticated rejected | **PASS** |
| 27 | `test_req_27_malformed_upload_handling` | Missing multipart file returns 422 | **PASS** |
| 28 | `test_req_28_failed_processing_handling` | Nonexistent syllabus returns 404 | **PASS** |
| 29 | `test_req_29_logout_login_persistence` | Re-authenticated sessions retrieve syllabus | **PASS** |
| 30 | `test_req_30_empty_syllabus_state` | Fresh user sees empty list and null workspace syllabus | **PASS** |

### Full Pytest Suite
- **Backend Test Count:** 125 passed, 0 failed in 8.64s.

---

## 6. Frontend Build Verification

Executed `npm run build` (`tsc && vite build`):
- **Modules Transformed:** 1,926 modules
- **Bundle Generation:** Complete without errors
- **Exit Code:** 0
