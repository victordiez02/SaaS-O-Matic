"""Servicio de simulaciones: cálculo de coste y persistencia del desglose.

Usa el motor de precios (`services/pricing.py`) para calcular base + IVA del país
del cliente y persiste el desglose completo congelado (base, tasa, impuesto, total,
currency) — nunca solo el total (spec 03: auditoría e inmutabilidad).
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.simulation import Simulation
from app.schemas.simulation import SimulationCreate
from app.services.customer import get_customer
from app.services.pricing import calculate_pricing


def create_simulation(db: Session, data: SimulationCreate) -> Simulation:
    """Calcula el coste para el cliente y persiste la simulación con su desglose.

    - Cliente inexistente → 404 `CUSTOMER_NOT_FOUND` (vía `get_customer`).
    - La tasa aplicada se congela en la fila (`tax_rate`): cambios futuros de la
      tabla de IVA no reescriben el histórico.
    """
    customer = get_customer(db, data.customer_id)
    breakdown = calculate_pricing(data.active_users, customer.country)

    simulation = Simulation(
        customer_id=customer.id,
        active_users=data.active_users,
        storage_gb=data.storage_gb,
        api_calls=data.api_calls,
        base_cost=breakdown.base_cost,
        tax_rate=breakdown.tax_rate,
        tax_amount=breakdown.tax_amount,
        total_cost=breakdown.total_cost,
    )
    db.add(simulation)
    db.commit()
    db.refresh(simulation)
    return simulation


def list_customer_simulations(db: Session, customer_id: int) -> list[Simulation]:
    """Historial de un cliente, del más reciente al más antiguo.

    Valida antes que el cliente exista (404 `CUSTOMER_NOT_FOUND`); un cliente sin
    simulaciones devuelve lista vacía.
    """
    get_customer(db, customer_id)
    stmt = (
        select(Simulation)
        .where(Simulation.customer_id == customer_id)
        .order_by(Simulation.created_at.desc(), Simulation.id.desc())
    )
    return list(db.scalars(stmt).all())
