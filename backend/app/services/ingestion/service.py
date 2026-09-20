import os
import hashlib
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.documents import Document, DocumentChunk
from app.core.logging import logger


class DocumentIngestionService:
    """
    Asynchronous Document Ingestion Service Boundary.
    Manages document intake, validation, background lifecycle, and progress reporting.
    Supports asynchronous execution without blocking HTTP request threads.
    """

    SUPPORTED_EXTENSIONS = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "txt": "text/plain",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
    }

    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB limit

    @staticmethod
    def create_document_record(
        db: Session,
        user_id: str,
        title: str,
        filename: str,
        file_path: str,
        file_size: int,
        source_type: str = "pdf",
        curriculum_id: Optional[str] = None,
        subject_id: Optional[str] = None,
        language: str = "en",
    ) -> Document:
        """Registers a new document with 'queued' status prior to async background processing."""
        doc = Document(
            user_id=user_id,
            title=title or filename,
            source_type=source_type.lower(),
            file_path=file_path,
            file_size_bytes=file_size,
            status="queued",
            processing_stage="queued",
            progress_percent=0,
            curriculum_id=curriculum_id,
            subject_id=subject_id,
            language=language or "en",
            metadata_json={
                "original_filename": filename,
                "upload_timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def get_user_documents(db: Session, user_id: str) -> List[Document]:
        """Returns all documents belonging exclusively to the authenticated student."""
        return (
            db.query(Document)
            .filter(Document.user_id == user_id)
            .order_by(Document.created_at.desc())
            .all()
        )

    @staticmethod
    def get_document_status(db: Session, document_id: str, user_id: str) -> Optional[Document]:
        """Returns a specific document status, strictly verifying ownership."""
        return (
            db.query(Document)
            .filter(Document.id == document_id, Document.user_id == user_id)
            .first()
        )

    @staticmethod
    def delete_document(db: Session, document_id: str, user_id: str) -> bool:
        """Deletes a student document along with any chunks and temporary files."""
        doc = (
            db.query(Document)
            .filter(Document.id == document_id, Document.user_id == user_id)
            .first()
        )
        if not doc:
            return False

        # Attempt to delete file from disk if local
        if doc.file_path and os.path.exists(doc.file_path):
            try:
                os.remove(doc.file_path)
            except Exception as e:
                logger.warning(f"Could not remove local file {doc.file_path}: {e}")

        db.delete(doc)
        db.commit()
        return True

    @classmethod
    def process_document_job_sync(cls, document_id: str) -> None:
        """
        Background worker entrypoint (can be dispatched via BackgroundTasks or worker queue).
        Progressively moves through pipeline stages:
        queued -> validating -> extracting -> analyzing_structure -> extracting_concepts -> chunking -> completed
        """
        logger.info(f"[Async Ingestion Worker] Starting processing job for document: {document_id}")
        with SessionLocal() as db:
            doc = db.query(Document).filter(Document.id == document_id).first()
            if not doc:
                logger.error(f"[Async Ingestion Worker] Document {document_id} not found.")
                return

            try:
                # Stage 1: Validating file & computing content hash
                doc.status = "processing"
                doc.processing_stage = "validating"
                doc.progress_percent = 15
                db.commit()

                content_hash = None
                if os.path.exists(doc.file_path):
                    hasher = hashlib.sha256()
                    with open(doc.file_path, "rb") as f:
                        buf = f.read(65536)
                        while len(buf) > 0:
                            hasher.update(buf)
                            buf = f.read(65536)
                    content_hash = hasher.hexdigest()
                    doc.content_hash = content_hash
                else:
                    doc.content_hash = hashlib.sha256(doc.title.encode("utf-8")).hexdigest()

                # Stage 2: Extracting text & structure
                doc.processing_stage = "extracting_text"
                doc.progress_percent = 40
                db.commit()

                # Mock/baseline structural extraction (Prompt 06 architectural baseline)
                # In upcoming Prompt 07, format-specific parsers (PyMuPDF, docx) will plug in here
                detected_chapters = [
                    {"title": f"Chapter 1: Foundations of {doc.title}", "page_start": 1, "page_end": 15},
                    {"title": f"Chapter 2: Core Principles and Analysis", "page_start": 16, "page_end": 35},
                ]
                extracted_concepts = [
                    f"{doc.title} - Core Definition",
                    f"{doc.title} - Key Principles",
                    f"{doc.title} - Practical Application",
                ]

                # Stage 3: Analyzing structure & detecting concepts
                doc.processing_stage = "analyzing_structure"
                doc.progress_percent = 70
                doc.page_count = 35
                db.commit()

                # Stage 4: Semantic Chunking
                doc.processing_stage = "chunking"
                doc.progress_percent = 85
                db.commit()

                # Generate initial chunks for document
                sample_chunks = [
                    f"Introduction and foundational context for {doc.title}. Covers basic terminology and prerequisites.",
                    f"Detailed theoretical breakdown, equations, and mathematical models associated with {doc.title}.",
                    f"Practical engineering and scientific applications, problem sets, and case studies for {doc.title}.",
                ]

                for idx, chunk_text in enumerate(sample_chunks):
                    chunk = DocumentChunk(
                        document_id=doc.id,
                        chunk_index=idx,
                        page_number=idx * 10 + 1,
                        content=chunk_text,
                        token_count=len(chunk_text.split()),
                        metadata_json={
                            "section": f"Section {idx + 1}",
                            "document_title": doc.title,
                        },
                    )
                    db.add(chunk)

                # Stage 5: Completed
                doc.status = "completed"
                doc.processing_stage = "ready"
                doc.progress_percent = 100
                doc.error_message = None
                
                # Update metadata with discovered educational structure
                meta = dict(doc.metadata_json or {})
                meta["detected_chapters"] = detected_chapters
                meta["extracted_concepts"] = extracted_concepts
                meta["processed_at"] = datetime.now(timezone.utc).isoformat()
                doc.metadata_json = meta

                db.commit()
                logger.info(f"[Async Ingestion Worker] Successfully completed document: {document_id}")

            except Exception as e:
                logger.exception(f"[Async Ingestion Worker] Error processing document {document_id}: {e}")
                doc.status = "failed"
                doc.processing_stage = "error"
                doc.error_message = str(e)
                db.commit()
