"""Router de clientes corporativos.

DEMO: alta y listado para verificar el flujo extremo a extremo (formulario →
API → SQLite). El router solo orquesta; el acceso a datos vive en el servicio.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.db.session import get_db
from app.schemas.customer import CustomerCreate, CustomerRead
from app.services import customer as customer_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db)) -> CustomerRead:
    """Registra un cliente. `tax_id` duplicado → 409 (formato de error unificado)."""
    try:
        customer = customer_service.create_customer(db, payload)
    except IntegrityError:
        db.rollback()
        raise AppError(
            status_code=status.HTTP_409_CONFLICT,
            code="TAX_ID_ALREADY_EXISTS",
            detail=f"Ya existe un cliente con el identificador fiscal '{payload.tax_id}'.",
        )
    return CustomerRead.model_validate(customer)


@router.get("", response_model=list[CustomerRead])
def list_customers(db: Session = Depends(get_db)) -> list[CustomerRead]:
    """Lista los clientes registrados (para verificar la persistencia en la demo)."""
    customers = customer_service.list_customers(db)
    return [CustomerRead.model_validate(c) for c in customers]
