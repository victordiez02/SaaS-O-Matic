"""Servicio de clientes: persistencia y lectura.

DEMO: sin lógica de negocio todavía (la validación fiscal irá en validators/).
Mantiene el acceso a la BD fuera del router para respetar la separación de capas
de CLAUDE.md: el router orquesta, el servicio toca los modelos.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate


def create_customer(db: Session, data: CustomerCreate) -> Customer:
    """Inserta un cliente y devuelve la fila persistida (con id y created_at)."""
    customer = Customer(
        company_name=data.company_name,
        tax_id=data.tax_id.strip().upper(),
        email=str(data.email),
        country=data.country.strip().upper(),
        plan=data.plan,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(db: Session) -> list[Customer]:
    """Devuelve todos los clientes, del más reciente al más antiguo."""
    stmt = select(Customer).order_by(Customer.created_at.desc())
    return list(db.scalars(stmt).all())
