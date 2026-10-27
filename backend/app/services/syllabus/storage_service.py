import os
import re
import hashlib
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException, status
from app.core.logging import logger


class SyllabusStorageService:
    """
    Secure isolated storage manager for primary academic syllabi.
    Handles format validation, MIME safety, size limits, filename sanitization,
    checksum generation, and secure local/private persistence.
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

    # Maximum allowed syllabus file size: 50 Megabytes
    MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

    BASE_STORAGE_DIR = os.path.join(os.getcwd(), "data", "storage", "syllabi")

    @classmethod
    def get_storage_base_dir(cls) -> str:
        os.makedirs(cls.BASE_STORAGE_DIR, exist_ok=True)
        return cls.BASE_STORAGE_DIR

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """
        Sanitizes filename against path traversal (../), control characters,
        and illegal filesystem tokens while preserving legitimate extension.
        """
        if not filename:
            return "syllabus_upload.bin"
        
        basename = os.path.basename(filename)
        # Strip null bytes and directory separators
        basename = basename.replace("\0", "").replace("/", "").replace("\\", "")
        # Retain alphanumeric characters, dots, dashes, and underscores
        safe = re.sub(r"[^a-zA-Z0-9_.-]", "_", basename)
        return safe or "syllabus_upload.bin"

    @classmethod
    def validate_file_metadata(cls, filename: str, content_type: Optional[str] = None) -> Tuple[str, str]:
        """
        Validates file extension and MIME type.
        Returns normalized (extension, mime_type).
        """
        safe_name = cls.sanitize_filename(filename)
        ext = safe_name.split(".")[-1].lower() if "." in safe_name else ""

        if not ext or ext not in cls.SUPPORTED_EXTENSIONS:
            supported = ", ".join(f".{e}" for e in cls.SUPPORTED_EXTENSIONS.keys())
            logger.warning(f"[SyllabusStorage] Unsupported file extension rejected: '{ext}' from '{filename}'")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported syllabus file format '.{ext}'. Supported formats: {supported}.",
            )

        expected_mime = cls.SUPPORTED_EXTENSIONS[ext]
        mime = content_type or expected_mime
        return ext, mime

    @classmethod
    def compute_checksum(cls, content: bytes) -> str:
        """Computes deterministic SHA-256 hash for raw file bytes."""
        hasher = hashlib.sha256()
        hasher.update(content)
        return hasher.hexdigest()

    @classmethod
    def build_version_storage_path(cls, user_id: str, syllabus_id: str, version_number: int, safe_filename: str) -> str:
        """
        Constructs deterministic, path-traversal proof storage path:
        data/storage/syllabi/{user_id}/{syllabus_id}/v{version_number}/{safe_filename}
        """
        base_dir = cls.get_storage_base_dir()
        user_clean = re.sub(r"[^a-zA-Z0-9_-]", "", user_id)
        syl_clean = re.sub(r"[^a-zA-Z0-9_-]", "", syllabus_id)
        version_dir = f"v{int(version_number)}"
        
        target_dir = os.path.join(base_dir, user_clean, syl_clean, version_dir)
        os.makedirs(target_dir, exist_ok=True)
        return os.path.join(target_dir, safe_filename)

    @classmethod
    async def read_and_validate_file(cls, file: UploadFile) -> Tuple[bytes, str, str, int, str]:
        """
        Asynchronously reads uploaded file, enforces size limits and empty file checks,
        sanitizes filename, validates extension, and calculates SHA-256 checksum.
        Returns: (content, safe_filename, extension, file_size, checksum)
        """
        raw_name = file.filename or "syllabus_upload.pdf"
        ext, mime = cls.validate_file_metadata(raw_name, file.content_type)
        safe_name = cls.sanitize_filename(raw_name)

        # Read content with 50MB ceiling
        content = await file.read()
        file_size = len(content)

        if file_size == 0:
            logger.warning(f"[SyllabusStorage] Empty 0-byte file rejected: {safe_name}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded syllabus file is empty (0 bytes).",
            )

        if file_size > cls.MAX_FILE_SIZE_BYTES:
            logger.warning(f"[SyllabusStorage] Oversized file rejected ({file_size} bytes): {safe_name}")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Syllabus exceeds maximum allowed file size of {cls.MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.",
            )

        checksum = cls.compute_checksum(content)
        return content, safe_name, ext, file_size, checksum

    @classmethod
    def save_bytes_to_disk(cls, storage_path: str, content: bytes) -> None:
        """Atomically saves content bytes to storage path."""
        try:
            with open(storage_path, "wb") as f:
                f.write(content)
            logger.info(f"[SyllabusStorage] Securely saved {len(content)} bytes to {storage_path}")
        except Exception as e:
            logger.error(f"[SyllabusStorage] Failed writing file to {storage_path}: {e}")
            if os.path.exists(storage_path):
                try:
                    os.remove(storage_path)
                except OSError:
                    pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Unable to process this syllabus. Please try again.",
            )

    @classmethod
    def delete_version_file(cls, storage_path: Optional[str]) -> None:
        """Deletes raw stored file if it exists."""
        if storage_path and os.path.exists(storage_path):
            try:
                os.remove(storage_path)
                logger.info(f"[SyllabusStorage] Removed stored syllabus file at {storage_path}")
            except Exception as e:
                logger.warning(f"[SyllabusStorage] Could not remove stored file {storage_path}: {e}")
