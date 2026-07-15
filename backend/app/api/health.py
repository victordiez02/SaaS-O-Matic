"""Router de estado del servicio.

Comprobación de liveness pura: confirma que la app arranca y responde, sin tocar
el esquema de la BD. La creación de tablas es responsabilidad del script de init
(ver ADR-005), así que este endpoint no la asume ni la dispara.
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Devuelve el estado del servicio."""
    return {"status": "ok", "service": "backend"}
