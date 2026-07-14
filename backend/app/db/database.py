"""Conexión mínima a SQLite para el placeholder de infraestructura.

NOTA: es deliberadamente simple (sqlite3 crudo) solo para verificar que el
volumen Docker persiste datos. La versión real usará SQLAlchemy según las specs
(ver ai-workspace/02-arquitectura/estructura-proyecto.md → app/models, app/db).
"""

import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.getenv("DATABASE_PATH", "/app/data/saas_o_matic.db"))


def get_connection() -> sqlite3.Connection:
    """Abre una conexión asegurando que el directorio de datos existe."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn
