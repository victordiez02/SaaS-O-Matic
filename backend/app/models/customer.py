"""Modelo ORM de la tabla `customers`.

Refleja 1:1 la spec ai-workspace/01-specs/03-modelo-de-datos.md. Sin lógica de
negocio: la normalización del `tax_id` y la validación fiscal viven en las capas
schema/validators, no aquí.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow


class Customer(Base):
    """Cliente corporativo que contrata el SaaS."""

    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    tax_id: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    email: Mapped[str] = mapped_column(Text, nullable=False)
    country: Mapped[str] = mapped_column(Text, nullable=False)
    plan: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow
    )

    # Relación 1:N. El borrado en cascada real lo garantiza la FK con
    # ON DELETE CASCADE en la BD (ver simulation.py); esto lo replica en el ORM.
    simulations: Mapped[list["Simulation"]] = relationship(
        back_populates="customer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


# Import diferido para el type hint de la relación sin ciclo en tiempo de módulo.
from app.models.simulation import Simulation  # noqa: E402
