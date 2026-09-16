import uuid
from typing import Optional
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin


class Note(Base, TimestampMixin):
    """Student personal notes attached to a concept or standalone reflection."""
    __tablename__ = "notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    concept_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("concepts.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    user = relationship("UserProfile", back_populates="notes")
    concept = relationship("Concept", back_populates="notes")
