"""Router de simulaciones (spec 02).

Solo orquesta: el cálculo del coste por tramos + IVA y la persistencia del desglose
viven en el servicio. El cliente HTTP nunca envía importes.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.simulation import SimulationCreate, SimulationRead
from app.services import simulation as simulation_service

router = APIRouter(prefix="/simulations", tags=["simulations"])


@router.post("", response_model=SimulationRead, status_code=status.HTTP_201_CREATED)
def create_simulation(
    payload: SimulationCreate, db: Session = Depends(get_db)
) -> SimulationRead:
    """Calcula y persiste una simulación (404 si el cliente no existe)."""
    simulation = simulation_service.create_simulation(db, payload)
    return SimulationRead.model_validate(simulation)
