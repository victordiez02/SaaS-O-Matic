"""Router de clientes corporativos (spec 02).

Solo orquesta: recibe, delega en el servicio y responde. La validación fiscal, la
unicidad y el "no encontrado" son reglas de negocio que viven en el servicio y
llegan como `AppError` (formato de error unificado).
"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.customer import CustomerCreate, CustomerListResponse, CustomerRead
from app.schemas.simulation import SimulationListResponse, SimulationRead
from app.services import customer as customer_service
from app.services import simulation as simulation_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> CustomerRead:
    """Registra un cliente validando su identificador fiscal (422/409 si procede)."""
    customer = customer_service.create_customer(db, payload)
    return CustomerRead.model_validate(customer)


@router.get("", response_model=CustomerListResponse)
def search_customers(
    search: str | None = Query(default=None, description="Nombre o identificador fiscal"),
    db: Session = Depends(get_db),
) -> CustomerListResponse:
    """Buscador por nombre de empresa o identificador fiscal (parcial, sin acentos)."""
    customers = customer_service.search_customers(db, search)
    items = [CustomerRead.model_validate(c) for c in customers]
    return CustomerListResponse(items=items, total=len(items))


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(customer_id: int, db: Session = Depends(get_db)) -> CustomerRead:
    """Detalle de un cliente (404 `CUSTOMER_NOT_FOUND` si no existe)."""
    customer = customer_service.get_customer(db, customer_id)
    return CustomerRead.model_validate(customer)


@router.get("/{customer_id}/simulations", response_model=SimulationListResponse)
def list_customer_simulations(
    customer_id: int, db: Session = Depends(get_db)
) -> SimulationListResponse:
    """Historial de simulaciones del cliente, de más reciente a más antigua."""
    simulations = simulation_service.list_customer_simulations(db, customer_id)
    items = [SimulationRead.model_validate(s) for s in simulations]
    return SimulationListResponse(items=items, total=len(items))
