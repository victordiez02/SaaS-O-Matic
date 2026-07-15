"""Creación explícita del esquema de la base de datos.

Este es el ÚNICO punto del proyecto que crea tablas (`create_all`). Se ejecuta a
mano ANTES de arrancar el servidor:

    python -m scripts.init_db

La app FastAPI nunca crea ni modifica el esquema al arrancar (ver ADR-005). El
script es idempotente: si las tablas ya existen no las toca ni borra datos
(`create_all` usa `checkfirst=True`), así que puede reejecutarse sin riesgo.

Ejecutar desde el directorio `backend/` para que el paquete `app` sea importable.
"""

import io
import sys

from sqlalchemy import inspect

import app.models
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine

# Referencia explícita: el import de arriba registra las tablas del dominio en
# Base.metadata como efecto secundario. Sin usar el nombre aquí, los linters
# (Pylance) lo marcan como "no usado" y lo eliminan en el organize-imports,
# lo que deja a create_all() sin tablas que crear.
assert app.models.__all__


def init_db() -> None:
    """Crea las tablas ausentes y deja un informe claro por consola."""
    # Salida UTF-8 para que los acentos se vean bien sea cual sea el codepage
    # de la consola de Windows.
    if isinstance(sys.stdout, io.TextIOWrapper):
        sys.stdout.reconfigure(encoding="utf-8")

    db_path = settings.database_path
    db_path.parent.mkdir(parents=True, exist_ok=True)

    print("SaaS-O-Matic · inicialización del esquema")
    print(f"  Base de datos: {db_path.resolve()}")

    existing_before = set(inspect(engine).get_table_names())

    Base.metadata.create_all(bind=engine)

    existing_after = set(inspect(engine).get_table_names())
    created = sorted(existing_after - existing_before)
    already = sorted(t for t in Base.metadata.tables if t in existing_before)

    if created:
        print(f"  Tablas creadas:    {', '.join(created)}")
    if already:
        print(f"  Tablas ya existían (sin cambios): {', '.join(already)}")
    if not created and not already:
        print("  No había tablas declaradas que crear.")

    print("Esquema listo.")


if __name__ == "__main__":
    init_db()
