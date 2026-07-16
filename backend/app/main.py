"""Creación y configuración de la aplicación FastAPI.

Registra middleware, routers y los handlers de error unificado. La documentación
interactiva (Swagger) queda en `/docs` automáticamente.

IMPORTANTE — gestión del esquema: la app NO crea ni modifica tablas al arrancar
(no hay `create_all` en el lifespan ni en las peticiones). El esquema se crea con
`python -m scripts.init_db` antes de levantar el servidor. Ver ADR-005.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.customers import router as customers_router
from app.api.health import router as health_router
from app.api.simulations import router as simulations_router
from app.core.errors import AppError

logger = logging.getLogger("saas_o_matic")

app = FastAPI(title="SaaS-O-Matic API", version="0.1.0")

# En producción el frontend llega vía proxy nginx (mismo origen). CORS abierto
# solo facilita el arranque manual con `pnpm dev` durante el desarrollo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
    """Traduce los errores de dominio al formato unificado {detail, code}."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code},
    )


def _field_name(loc: tuple) -> str:
    """Nombre del campo tal como lo conoce el cliente HTTP."""
    parts = [str(p) for p in loc if p not in ("body", "query", "path")]
    return ".".join(parts)


@app.exception_handler(RequestValidationError)
def handle_validation_error(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Normaliza los 422 de Pydantic al formato unificado + `errors` por campo."""
    errors = [
        {"field": _field_name(err.get("loc", ())), "message": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Los datos enviados no son válidos.",
            "code": "VALIDATION_ERROR",
            "errors": errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
def handle_http_exception(
    _request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Envuelve los HTTPException internos (404 ruta desconocida, 405 método no
    permitido…) en el formato unificado; no los emite nuestro código, sino el
    enrutado de Starlette, así que carecerían de `code` (F1 de la auditoría)."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": f"HTTP_{exc.status_code}"},
    )


@app.exception_handler(Exception)
def handle_unexpected_error(_request: Request, exc: Exception) -> JSONResponse:
    """Última red de seguridad: cualquier error no controlado sale como 500 con
    formato unificado y queda registrado en el log (F2 de la auditoría)."""
    logger.exception("Error no controlado en la petición")
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor", "code": "INTERNAL_ERROR"},
    )


# Prefijo común de la API (ver spec 02-contrato-api.md). El health de liveness
# queda en /api/health; los routers de negocio bajo /api/v1.
app.include_router(health_router, prefix="/api")
app.include_router(customers_router, prefix="/api/v1")
app.include_router(simulations_router, prefix="/api/v1")
