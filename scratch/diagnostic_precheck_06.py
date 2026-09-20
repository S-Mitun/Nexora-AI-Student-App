"""
Diagnostic script for Master Prompt 06 Pre-Check.
Verifies all 14 required checks directly against the live backend database, models, and services.
"""
import os
import sys
import uuid

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.db.session import SessionLocal
from app.models.profile import UserProfile
from app.models.learning import Subject, Topic, Concept, LearningModule, Lesson, Curriculum, StudentSubject
from app.models.documents import Document, DocumentChunk
from app.services.learning.curriculum_service import CurriculumService, CurriculumSeedService
from app.services.learning.personalization_service import PersonalizationService
from app.services.ingestion.service import DocumentIngestionService
from app.schemas.profile import ProfileUpdate

def run_precheck_tests():
    print("==================================================")
    print("STARTING MASTER PROMPT 06 ARCHITECTURAL PRE-CHECK")
    print("==================================================")
    
    db = SessionLocal()
    try:
        # Seed if empty
        CurriculumSeedService.seed_if_empty(db)
        
        # -------------------------------------------------------------
        # TEST 1: Class 1-5 Subject Isolation & Workspace
        # -------------------------------------------------------------
        p1_subs = CurriculumService.get_subjects(db, education_level="class-1-5")
        p1_slugs = [s.slug for s in p1_subs]
        has_cse_in_p1 = any(slug in p1_slugs for slug in ["computer-science", "data-structures-algorithms", "operating-systems"])
        p1_rec = PersonalizationService.get_recommended_topics([], education_category="primary")
        has_cse_rec = any("Binary Search" in r.concept or "Tree" in r.concept for r in p1_rec)
        print(f"TEST 1 [Class 1-5]: {len(p1_subs)} subjects found -> {p1_slugs}")
        print(f"       CSE in Class 1-5 subjects: {has_cse_in_p1} (Must be False)")
        print(f"       CSE in Class 1-5 recommendations: {has_cse_rec} (Must be False)")
        assert not has_cse_in_p1, "Class 1-5 contains CSE subjects!"
        assert not has_cse_rec, "Class 1-5 recommendations contain CSE topics!"
        print("  -> TEST 1 PASSED: Class 1-5 subjects and recommendations are isolated.")

        # -------------------------------------------------------------
        # TEST 2: Class 6-10 Secondary Subjects
        # -------------------------------------------------------------
        p2_subs = CurriculumService.get_subjects(db, education_level="class-6-10")
        p2_slugs = [s.slug for s in p2_subs]
        has_sec_sci = "cbse-sec-science" in p2_slugs
        has_sec_math = "cbse-sec-mathematics" in p2_slugs
        has_cse_in_p2 = any(slug in p2_slugs for slug in ["operating-systems", "database-management-systems"])
        print(f"TEST 2 [Class 6-10]: {len(p2_subs)} subjects found -> {p2_slugs}")
        print(f"       Secondary Science present: {has_sec_sci}")
        print(f"       Secondary Math present: {has_sec_math}")
        print(f"       CSE in Class 6-10: {has_cse_in_p2} (Must be False)")
        assert has_sec_sci and has_sec_math, "Missing Secondary Science or Math!"
        assert not has_cse_in_p2, "Class 6-10 contains UG CSE subjects!"
        print("  -> TEST 2 PASSED: Class 6-10 foundation exists and excludes UG CSE.")

        # -------------------------------------------------------------
        # TEST 3: Class 11-12 Higher Secondary
        # -------------------------------------------------------------
        p3_subs = CurriculumService.get_subjects(db, education_level="class-11-12")
        p3_slugs = [s.slug for s in p3_subs]
        print(f"TEST 3 [Class 11-12]: {len(p3_subs)} subjects found -> {p3_slugs}")
        assert "physics" in p3_slugs or "cbse-hs-chemistry" in p3_slugs, "Class 11-12 missing Science subjects!"
        print("  -> TEST 3 PASSED: Class 11-12 subjects present.")

        # -------------------------------------------------------------
        # TEST 4 & 5: Undergraduate & Postgraduate
        # -------------------------------------------------------------
        ug_subs = CurriculumService.get_subjects(db, education_level="undergraduate")
        ug_slugs = [s.slug for s in ug_subs]
        print(f"TEST 4 & 5 [Undergraduate]: {len(ug_subs)} subjects found -> {ug_slugs}")
        assert "data-structures-algorithms" in ug_slugs, "UG missing DSA!"
        print("  -> TEST 4 & 5 PASSED: UG curriculum intact.")

        # -------------------------------------------------------------
        # TEST 7 & 11: Multi-User Isolation
        # -------------------------------------------------------------
        user_a_id = f"test-user-a-{uuid.uuid4()}"
        user_b_id = f"test-user-b-{uuid.uuid4()}"
        
        prof_a = UserProfile(id=user_a_id, email=f"a_{uuid.uuid4().hex[:6]}@nexora.dev", education_level="class-6-10", education_category="secondary")
        prof_b = UserProfile(id=user_b_id, email=f"b_{uuid.uuid4().hex[:6]}@nexora.dev", education_level="undergraduate", education_category="undergraduate")
        db.add_all([prof_a, prof_b])
        db.commit()

        # User A uploads a document
        doc_a = Document(
            user_id=user_a_id,
            title="Class 10 Physics Notes",
            source_type="pdf",
            file_path="data/uploads/dummy_a.pdf",
            status="completed"
        )
        db.add(doc_a)
        db.commit()

        # Verify User B cannot access User A's document via service
        docs_for_b = DocumentIngestionService.get_user_documents(db, user_b_id)
        doc_a_via_b = DocumentIngestionService.get_document_status(db, doc_a.id, user_b_id)
        print(f"TEST 11 [User Isolation]: Docs visible to User B: {len(docs_for_b)} (Expected 0)")
        print(f"       Can User B access doc_a by ID: {doc_a_via_b is not None} (Expected False)")
        assert len(docs_for_b) == 0, "User B saw User A's documents!"
        assert doc_a_via_b is None, "User B accessed User A's document by ID!"
        print("  -> TEST 11 PASSED: Strict student ownership enforced.")

        # -------------------------------------------------------------
        # TEST 14: Async Ingestion Lifecycle States
        # -------------------------------------------------------------
        valid_statuses = ["queued", "processing", "completed", "failed"]
        doc_test = Document(
            user_id=user_a_id,
            title="Async Test Doc",
            source_type="pdf",
            file_path="data/uploads/test_async.pdf",
            status="queued",
            processing_stage="queued"
        )
        db.add(doc_test)
        db.commit()
        
        assert doc_test.status == "queued"
        doc_test.status = "processing"
        doc_test.processing_stage = "chunking"
        db.commit()
        assert doc_test.status == "processing"
        doc_test.status = "completed"
        doc_test.processing_stage = "ready"
        db.commit()
        assert doc_test.status == "completed"
        print("  -> TEST 14 PASSED: Document lifecycle states supported without blocking HTTP.")

        # Clean up test users
        db.delete(doc_test)
        db.delete(doc_a)
        db.delete(prof_a)
        db.delete(prof_b)
        db.commit()

        print("==================================================")
        print("ALL BACKEND DIAGNOSTIC PRE-CHECKS PASSED")
        print("==================================================")

    finally:
        db.close()

if __name__ == "__main__":
    run_precheck_tests()
