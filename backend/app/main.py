"""Aplicación FastAPI — placeholder de infraestructura.

Expone endpoints mínimos bajo /api para verificar que el contenedor arranca,
que SQLite responde y que el volumen persiste datos entre reinicios.
La lógica de negocio real (clientes, simulaciones) se añadirá en fases
posteriores respetando las capas router → schema → service → model.
"""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import get_connection


app = FastAPI(title="SaaS-O-Matic API", version="0.1.0")

# En producción el frontend llega vía proxy nginx (mismo origen). CORS abierto
# solo facilita el arranque manual con `pnpm dev` durante el desarrollo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict:
    """Comprueba que el servicio y la base de datos responden."""
    conn = get_connection()
    conn.execute("SELECT 1")
    conn.close()
    return {"status": "ok", "service": "backend", "database": "ok"}


@router.get("/ping")
def ping() -> dict:
    """Inserta un registro y devuelve el total: demuestra persistencia real."""
    conn = get_connection()
    conn.execute("INSERT INTO health_pings DEFAULT VALUES")
    conn.commit()
    total = conn.execute("SELECT COUNT(*) FROM health_pings").fetchone()[0]
    conn.close()
    return {"message": "pong", "total_pings": total}


app.include_router(router)
