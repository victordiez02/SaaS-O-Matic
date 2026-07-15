"""Motor de tarificación: tramos acumulativos + IVA por país.

Lógica pura: sin BD, sin FastAPI, sin I/O. Todos los importes en EUR y como
`decimal.Decimal` (prohibido float, regla de CLAUDE.md). Redondeo `ROUND_HALF_UP`
a 2 decimales solo sobre impuesto y total, nunca en pasos intermedios.

Fuente de verdad: ai-workspace/01-specs/01-reglas-de-negocio.md §1–2 y la skill
`tiered-pricing`. Las constantes (tramos, tabla de IVA) viven en `core/billing.py`;
este módulo solo las aplica. `storage_gb` y `api_calls` no participan: se persisten
sin coste en el alcance actual (extensión futura por concepto facturable).
"""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from app.core.billing import DEFAULT_TAX_RATE, PRICING_TIERS, TAX_RATES

_CENTS = Decimal("0.01")


@dataclass(frozen=True)
class PricingBreakdown:
    """Desglose completo del cálculo, listo para persistir (spec 03).

    Los nombres coinciden con las columnas de `simulations` para que la capa de
    servicio lo persista campo a campo. Importes cuantizados a 2 decimales.
    """

    base_cost: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    total_cost: Decimal


def _quantize(amount: Decimal) -> Decimal:
    """Cuantiza a 2 decimales con ROUND_HALF_UP (solo resultados finales)."""
    return amount.quantize(_CENTS, rounding=ROUND_HALF_UP)


def calculate_base_cost(active_users: int) -> Decimal:
    """Coste base mensual en EUR por tramos acumulativos.

    Cada tramo se cobra a su precio (10/8/5 €); nunca se aplica el precio del
    tramo final a todos los usuarios. `active_users` debe ser entero ≥ 0.
    """
    if not isinstance(active_users, int) or active_users < 0:
        raise ValueError("active_users debe ser un entero >= 0")

    base = Decimal("0")
    remaining = active_users
    for capacity, price_per_user in PRICING_TIERS:
        users_in_tier = remaining if capacity is None else min(remaining, capacity)
        base += price_per_user * users_in_tier
        remaining -= users_in_tier
        if remaining == 0:
            break
    return _quantize(base)


def get_tax_rate(country: str) -> Decimal:
    """Tasa de IVA del país (ISO alpha-2, insensible a mayúsculas).

    País fuera de la tabla → tasa por defecto 0 %, nunca error (spec 01 §2).
    """
    return TAX_RATES.get(country.strip().upper(), DEFAULT_TAX_RATE)


def calculate_pricing(active_users: int, country: str) -> PricingBreakdown:
    """Desglose completo: base por tramos + IVA del país del cliente.

    La tasa aplicada viaja en el desglose y se persiste con la simulación
    (`tax_rate`): cambios futuros de la tabla no reescriben el histórico.
    """
    base_cost = calculate_base_cost(active_users)
    tax_rate = get_tax_rate(country)
    tax_amount = _quantize(base_cost * tax_rate)
    total_cost = _quantize(base_cost + tax_amount)
    return PricingBreakdown(
        base_cost=base_cost,
        tax_rate=tax_rate,
        tax_amount=tax_amount,
        total_cost=total_cost,
    )
