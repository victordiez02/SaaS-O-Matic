"""Schemas Pydantic del cliente corporativo.

DEMO: contrato mínimo para dar de alta y leer clientes. Todavía SIN validación
fiscal ni reglas de negocio (llegarán en validators/ y services/ según la spec
01-reglas-de-negocio.md). Aquí solo se valida forma básica: campos presentes,
email con formato y plan dentro del enum.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Plan = Literal["basic", "pro", "enterprise"]


class CustomerCreate(BaseModel):
    """Datos que envía el formulario de alta."""

    company_name: str = Field(min_length=1, max_length=200)
    tax_id: str = Field(min_length=1, max_length=20)
    email: EmailStr
    country: str = Field(min_length=2, max_length=2, description="ISO alpha-2")
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
