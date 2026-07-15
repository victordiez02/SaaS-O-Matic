"""Configuración de la aplicación.

Los valores se leen de variables de entorno con valores por defecto razonables
para desarrollo local. La ruta del fichero SQLite NUNCA se hardcodea en el código
de acceso a datos: sale de aquí (`DATABASE_PATH`), de modo que Docker, los tests
y el arranque local puedan apuntar a bases distintas sin tocar código.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Ajustes del backend leídos del entorno (prefijo ninguno, nombres directos)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Ruta del fichero SQLite. Por defecto ./data/saas_o_matic.db (relativa al
    # directorio de arranque). En Docker se sobreescribe con /app/data/... vía
    # docker-compose. Los tests usan una BD en memoria con su propio engine.
    database_path: Path = Path("./data/saas_o_matic.db")

    @property
    def database_url(self) -> str:
        """URL de conexión SQLAlchemy derivada de la ruta del fichero."""
        return f"sqlite:///{self.database_path}"


@lru_cache
def get_settings() -> Settings:
    """Devuelve la instancia de ajustes cacheada (una sola lectura del entorno)."""
    return Settings()


settings = get_settings()
