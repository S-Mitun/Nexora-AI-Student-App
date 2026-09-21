import sys
import os
from pathlib import Path

# Add project root and backend dir to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))
sys.path.insert(0, str(backend_dir))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db

# Use in-memory SQLite database for isolated test execution
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    with TestingSessionLocal() as session:
        from app.services.learning.curriculum_service import CurriculumSeedService
        CurriculumSeedService.seed_if_empty(session)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def create_active_syllabus(db_session):
    def _create(user_id: str, academic_level: str = "class_6_10", title: str = "Test Active Syllabus"):
        import uuid
        from app.models.syllabus import Syllabus, SyllabusVersion
        syl_id = f"syl-{uuid.uuid4().hex[:8]}"
        ver_id = f"ver-{uuid.uuid4().hex[:8]}"
        syl = Syllabus(
            id=syl_id,
            user_id=user_id,
            title=title,
            academic_level=academic_level,
            status="confirmed",
        )
        db_session.add(syl)
        ver = SyllabusVersion(
            id=ver_id,
            syllabus_id=syl_id,
            version_number=1,
            is_active=True,
            raw_extracted_json={"modules": []},
        )
        db_session.add(ver)
        db_session.commit()
        return syl, ver
    return _create

