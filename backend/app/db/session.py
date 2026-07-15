"""Engine y sesión de SQLAlchemy sobre SQLite.

Aquí vive la fontanería de acceso a datos: el engine (con la ruta que sale de
`core.config`), la factoría de sesiones y la activación de `PRAGMA foreign_keys`
en cada conexión (obligatorio en SQLite para que las FK y el ON DELETE CASCADE
se apliquen de verdad).

IMPORTANTE: este módulo NO crea el esquema. La creación de tablas es
responsabilidad exclusiva del script `scripts/init_db.py`, ejecutado a mano por
la persona usuaria antes de arrancar el servidor (ver ADR-005).
"""

from collections.abc import Iterator

from sqlalchemy import Engine, event
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# check_same_thread=False: FastAPI puede servir peticiones desde distintos hilos
# del threadpool; cada una usa su propia sesión, así que es seguro.
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    """Activa la comprobación de claves foráneas en cada conexión SQLite."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys = ON")
    cursor.close()


def get_db() -> Iterator[Session]:
    """Dependencia de FastAPI: cede una sesión y garantiza su cierre."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
