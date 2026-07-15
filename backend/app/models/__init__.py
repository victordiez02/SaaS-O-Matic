"""Modelos ORM del dominio.

Importar este paquete registra todas las tablas en `Base.metadata`, de modo que
el script de creación del esquema solo necesita `import app.models`.
"""

from app.models.customer import Customer
from app.models.simulation import Simulation

__all__ = ["Customer", "Simulation"]
