"""Fixtures compartidas de los tests de integración.

Levanta la app FastAPI contra una BD SQLite en memoria y aislada por test: se crea
el esquema con `Base.metadata.create_all`, se sobreescribe la dependencia `get_db`
y se descarta al terminar. Nunca toca la BD de desarrollo (`backend/data/`).

El listener global `PRAGMA foreign_keys=ON` (definido en `app/db/session.py` sobre
la clase `Engine`) se aplica también a este engine, así que las FK y el cascade
funcionan igual que en producción.
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  — registra las tablas en Base.metadata
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture
def client() -> Iterator[TestClient]:
    """Cliente HTTP con una BD en memoria propia, creada y destruida por test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # una sola conexión compartida entre hilos del test
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Iterator[Session]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
