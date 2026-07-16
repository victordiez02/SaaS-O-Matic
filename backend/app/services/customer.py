"""Servicio de clientes: validación fiscal, persistencia y lectura.

Orquesta el caso de uso y concentra las reglas de negocio del alta: valida el
identificador fiscal (vía `validators/`) y garantiza la unicidad de `tax_id`. El
router solo llama aquí; los errores de dominio se lanzan como `AppError` y los
traduce el handler unificado de `main.py`.
"""

import unicodedata

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate
from app.validators.spanish_tax_id import validate_tax_id


def create_customer(db: Session, data: CustomerCreate) -> Customer:
    """Valida el identificador fiscal y persiste el cliente.

    - `tax_id` inválido → 422 `INVALID_TAX_ID` (estricto solo si país == ES).
    - `tax_id` duplicado → 409 `TAX_ID_ALREADY_EXISTS`.
    Persiste el `tax_id` ya normalizado (mayúsculas, sin espacios ni guiones).
    """
    validation = validate_tax_id(data.tax_id, data.country)
    if not validation.is_valid:
        raise AppError(
            status_code=422,
            code="INVALID_TAX_ID",
            detail=f"El identificador fiscal '{validation.normalized}' no es válido: {validation.reason}.",
        )

    customer = Customer(
        company_name=data.company_name,
        tax_id=validation.normalized,
        email=str(data.email),
        country=data.country.strip().upper(),
        plan=data.plan,
    )
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise AppError(
            status_code=409,
            code="TAX_ID_ALREADY_EXISTS",
            detail=f"Ya existe un cliente con el identificador fiscal '{validation.normalized}'.",
        )
    db.refresh(customer)
    return customer


def _normalize_for_search(text: str) -> str:
    """Pasa a minúsculas y quita los diacríticos ("Ibérica" → "iberica")."""
    decomposed = unicodedata.normalize("NFD", text.casefold())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def search_customers(db: Session, search: str | None) -> list[Customer]:
    """Buscador por `company_name` o `tax_id`: parcial, insensible a mayúsculas
    y a acentos, del más reciente al más antiguo. Sin `search` devuelve todos.
    """
    stmt = select(Customer).order_by(Customer.created_at.desc(), Customer.id.desc())
    customers = list(db.scalars(stmt).all())

    needle = _normalize_for_search(search).strip() if search else ""
    if not needle:
        return customers
    return [
        customer
        for customer in customers
        if needle in _normalize_for_search(customer.company_name)
        or needle in _normalize_for_search(customer.tax_id)
    ]


def get_customer(db: Session, customer_id: int) -> Customer:
    """Devuelve el cliente por id o lanza 404 `CUSTOMER_NOT_FOUND`."""
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise AppError(
            status_code=404,
            code="CUSTOMER_NOT_FOUND",
            detail=f"No existe ningún cliente con id {customer_id}.",
        )
    return customer
