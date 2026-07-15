"""Creación y configuración de la aplicación FastAPI.

Registra middleware y routers. La documentación interactiva (Swagger) queda en
`/docs` automáticamente.

IMPORTANTE — gestión del esquema: la app NO crea ni modifica tablas al arrancar
(no hay `create_all` en el lifespan ni en las peticiones). El esquema se crea con
`python -m scripts.init_db` antes de levantar el servidor. Ver ADR-005.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router

app = FastAPI(title="SaaS-O-Matic API", version="0.1.0")

# En producción el frontend llega vía proxy nginx (mismo origen). CORS abierto
# solo facilita el arranque manual con `pnpm dev` durante el desarrollo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prefijo común de la API (ver spec 02-contrato-api.md). Los routers de negocio
# (customers, simulations) se registrarán aquí en sesiones posteriores.
app.include_router(health_router, prefix="/api")
