"""Capa de acceso a datos: base declarativa, engine y sesión."""

from app.db.base import Base
from app.db.session import SessionLocal, engine, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
