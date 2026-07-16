"""Schemas Pydantic de la simulación (contrato de la API, spec 02).

El cliente HTTP nunca envía importes: el backend los calcula y persiste. La entrada
son solo los contadores de consumo; la salida incluye el desglose completo.

Los importes se serializan como *string* decimal ("140.00", "0.21") para no perder
precisión en JSON (spec 02). El cálculo vive en `services/pricing.py`.
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_serializer

from app.schemas.serializers import iso_utc_z


class SimulationCreate(BaseModel):
    """Datos de consumo que envía el formulario de simulación."""

    customer_id: int
    active_users: int = Field(ge=0)
    storage_gb: int = Field(ge=0)
    api_calls: int = Field(ge=0)


class SimulationRead(BaseModel):
    """Simulación persistida con su desglose de coste congelado."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    active_users: int
    storage_gb: int
    api_calls: int
    base_cost: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_cost: Decimal
    currency: str
    created_at: datetime

    @field_serializer("base_cost", "tax_rate", "tax_amount", "total_cost")
    def _as_decimal_string(self, value: Decimal) -> str:
        """Serializa los importes con 2 decimales fijos ("140.00", "0.21")."""
        return f"{value:.2f}"

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str:
        return iso_utc_z(value)


class SimulationListResponse(BaseModel):
    """Sobre del historial de simulaciones (spec 02): lista + total."""

    items: list[SimulationRead]
    total: int
