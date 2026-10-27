import sys
from pathlib import Path
backend_dir = Path("backend").resolve()
sys.path.insert(0, str(backend_dir))

from app.db.session import SessionLocal
from app.models.syllabus import Syllabus, SyllabusVersion, SyllabusCurriculumDraft

db = SessionLocal()
syllabi = db.query(Syllabus).all()
print(f"Total Syllabi in DB: {len(syllabi)}")
for s in syllabi:
    print(f"Syllabus: {s.id} | User: {s.user_id} | Title: {s.title} | Versions: {len(s.versions)}")
    for v in s.versions:
        print(f"  Version: {v.id} | v{v.version_number} | Status: {v.status} | Processing: {v.processing_status} | Curriculum: {v.curriculum_status} | Path: {v.storage_path}")

drafts = db.query(SyllabusCurriculumDraft).all()
print(f"\nTotal Drafts in DB: {len(drafts)}")
for d in drafts:
    print(f"Draft: {d.id} | Version: {d.syllabus_version_id} | Status: {d.status} | Title: {d.title}")
db.close()
