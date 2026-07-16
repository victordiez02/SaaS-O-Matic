"""Schemas Pydantic del cliente corporativo (contrato de la API, spec 02).

La validación fiscal estricta NO vive aquí: es lógica de negocio y se aplica en
`services/customer.py` vía `validators/spanish_tax_id.py`. Este schema solo valida
forma básica de entrada (campos presentes, email con formato, plan del enum) y da
forma a la salida.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_serializer

from app.schemas.serializers import iso_utc_z

Plan = Literal["basic", "pro", "enterprise"]


class CustomerCreate(BaseModel):
    """Datos que envía el alta de cliente."""

    company_name: str = Field(min_length=1, max_length=200)
    tax_id: str = Field(min_length=1, max_length=20)
    email: EmailStr
    country: str = Field(pattern=r"^[A-Za-z]{2}$", description="ISO alpha-2")
    plan: Plan


class CustomerRead(BaseModel):
    """Representación de un cliente en las respuestas de la API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    tax_id: str
    email: str
    country: str
    plan: str
    created_at: datetime

    @field_serializer("created_at")
    def _serialize_created_at(self, value: datetime) -> str:
        return iso_utc_z(value)


class CustomerListResponse(BaseModel):
    """Sobre del buscador (spec 02): lista + total de coincidencias."""

    items: list[CustomerRead]
    total: int
