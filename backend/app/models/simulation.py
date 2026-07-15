"""Modelo ORM de la tabla `simulations`.

Refleja 1:1 la spec ai-workspace/01-specs/03-modelo-de-datos.md. Persiste el
desglose completo del cálculo (base, tasa, impuesto, total) para auditoría e
inmutabilidad. Los importes viajan como `decimal.Decimal` gracias a `Numeric`
con `asdecimal=True`; el redondeo se controla en el servicio de pricing, no aquí.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.customer import Customer


def _utcnow() -> datetime:
    """Marca temporal actual en UTC (los timestamps se guardan siempre en UTC)."""
    return datetime.now(timezone.utc)


class Simulation(Base):
    """Simulación de consumo con el desglose de coste ya calculado y congelado."""

    __tablename__ = "simulations"
    __table_args__ = (
        CheckConstraint("active_users >= 0", name="ck_simulations_active_users_ge_0"),
        CheckConstraint("storage_gb >= 0", name="ck_simulations_storage_gb_ge_0"),
        CheckConstraint("api_calls >= 0", name="ck_simulations_api_calls_ge_0"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    active_users: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_gb: Mapped[int] = mapped_column(Integer, nullable=False)
    api_calls: Mapped[int] = mapped_column(Integer, nullable=False)
    base_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        Text, nullable=False, default="EUR", server_default=text("'EUR'")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=_utcnow
    )

    customer: Mapped["Customer"] = relationship(back_populates="simulations")
