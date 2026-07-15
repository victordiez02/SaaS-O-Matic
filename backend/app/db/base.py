"""Base declarativa de SQLAlchemy.

Todos los modelos heredan de `Base`. Vive aislada para poder importar
`Base.metadata` (p. ej. desde el script de creación del esquema) sin arrastrar
el engine ni la sesión, evitando importaciones circulares.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Clase base común a todos los modelos ORM del proyecto."""
