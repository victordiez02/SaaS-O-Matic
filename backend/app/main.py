"""Creación y configuración de la aplicación FastAPI.

Registra middleware, routers y los handlers de error unificado. La documentación
interactiva (Swagger) queda en `/docs` automáticamente.

IMPORTANTE — gestión del esquema: la app NO crea ni modifica tablas al arrancar
(no hay `create_all` en el lifespan ni en las peticiones). El esquema se crea con
`python -m scripts.init_db` antes de levantar el servidor. Ver ADR-005.
"""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.customers import router as customers_router
from app.api.health import router as health_router
from app.core.errors import AppError

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


@app.exception_handler(RequestValidationError)
def handle_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """Normaliza los 422 de Pydantic al mismo formato unificado de error."""
    first = exc.errors()[0] if exc.errors() else {"msg": "Entrada inválida"}
    field = " → ".join(str(p) for p in first.get("loc", []) if p != "body")
    detail = f"{field}: {first['msg']}" if field else first["msg"]
    return JSONResponse(
        status_code=422,
        content={"detail": detail, "code": "VALIDATION_ERROR"},
    )


# Prefijo común de la API (ver spec 02-contrato-api.md). El health de liveness
# queda en /api/health; los routers de negocio bajo /api/v1.
app.include_router(health_router, prefix="/api")
app.include_router(customers_router, prefix="/api/v1")
