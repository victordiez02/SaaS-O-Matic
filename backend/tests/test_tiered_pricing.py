"""Tests del motor de tarificación por tramos + IVA.

TDD estricto: esta suite existe ANTES que la implementación y fija su contrato.
Fuente de verdad: ai-workspace/01-specs/01-reglas-de-negocio.md §1–2 y la skill
`tiered-pricing`. Los ejemplos numéricos verificados a mano en la spec (5, 15, 50 y
120 usuarios) son obligatorios y se testean tal cual.

Contrato que exige esta suite a `app.services.pricing`:

    calculate_base_cost(active_users: int) -> Decimal
    get_tax_rate(country: str) -> Decimal
    calculate_pricing(active_users: int, country: str) -> PricingBreakdown

- Funciones puras: sin BD, sin FastAPI, sin I/O. `Decimal` siempre, nunca float.
- `PricingBreakdown` expone el desglose completo para persistir (spec 03):
  `base_cost`, `tax_rate`, `tax_amount`, `total_cost` — todos `Decimal`, importes
  cuantizados a 2 decimales (listos para serializar como "140.00").
- `active_users` negativo → ValueError (la API lo convertirá en 422).
- La tabla de IVA vive en `app/core/` (spec 01 §2); el servicio solo la consulta.
"""

from decimal import Decimal

import pytest

from app.services.pricing import (
    PricingBreakdown,
    calculate_base_cost,
    calculate_pricing,
    get_tax_rate,
)

# ---------------------------------------------------------------------------
# Coste base por tramos (spec 01 §1): ejemplos verificados + fronteras
# ---------------------------------------------------------------------------

BASE_COST_CASES: list[tuple[int, str, str]] = [
    # (usuarios, base esperada, qué cubre)
    (0, "0.00", "0 usuarios es válido y cuesta 0"),
    (1, "10.00", "primer usuario del tramo 1"),
    (5, "50.00", "ejemplo spec: 5 × 10"),
    (10, "100.00", "frontera superior del tramo 1"),
    (11, "108.00", "primer usuario del tramo 2 (100 + 8)"),
    (15, "140.00", "ejemplo del enunciado: 100 + 5 × 8"),
    (50, "420.00", "frontera superior del tramo 2 (100 + 320)"),
    (51, "425.00", "primer usuario del tramo 3 (420 + 5)"),
    (120, "770.00", "ejemplo spec: 100 + 320 + 70 × 5"),
    (200, "1170.00", "tramo 3 profundo: 100 + 320 + 150 × 5"),
]


@pytest.mark.parametrize(
    ("users", "expected"),
    [(users, expected) for users, expected, _ in BASE_COST_CASES],
    ids=[covers for _, _, covers in BASE_COST_CASES],
)
def test_base_cost_tiers(users: int, expected: str) -> None:
    """La tarificación es acumulativa: cada tramo se cobra a su precio."""
    result = calculate_base_cost(users)
    assert isinstance(result, Decimal)
    assert result == Decimal(expected)


def test_negative_users_raise_value_error() -> None:
    """Usuarios negativos → error de validación (422 en la API)."""
    with pytest.raises(ValueError):
        calculate_base_cost(-1)
    with pytest.raises(ValueError):
        calculate_pricing(-5, country="ES")


# ---------------------------------------------------------------------------
# Tabla de IVA por país (spec 01 §2)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("country", "rate"),
    [
        ("ES", "0.21"),
        ("PT", "0.23"),
        ("FR", "0.20"),
        ("DE", "0.19"),
        ("IT", "0.22"),
        ("US", "0.00"),  # resto de países → 0 % (exportación fuera de alcance)
        ("XX", "0.00"),  # código desconocido → 0 %, nunca error
    ],
)
def test_tax_rate_table(country: str, rate: str) -> None:
    result = get_tax_rate(country)
    assert isinstance(result, Decimal)
    assert result == Decimal(rate)


def test_tax_rate_country_is_case_insensitive() -> None:
    """`"es"` debe resolver al 21 % igual que `"ES"` (coherente con el validador)."""
    assert get_tax_rate("es") == Decimal("0.21")


# ---------------------------------------------------------------------------
# Desglose completo (spec 01 §1–2 + regla de integridad de la spec 03)
# ---------------------------------------------------------------------------

BREAKDOWN_CASES: list[tuple[int, str, str, str, str, str]] = [
    # (usuarios, país, base, tasa, impuesto, total)
    (15, "ES", "140.00", "0.21", "29.40", "169.40"),  # ejemplo completo de la spec
    (5, "PT", "50.00", "0.23", "11.50", "61.50"),
    (120, "FR", "770.00", "0.20", "154.00", "924.00"),
    (50, "DE", "420.00", "0.19", "79.80", "499.80"),
    (10, "IT", "100.00", "0.22", "22.00", "122.00"),
    (15, "US", "140.00", "0.00", "0.00", "140.00"),  # sin IVA fuera de la tabla
    (0, "ES", "0.00", "0.21", "0.00", "0.00"),  # 0 usuarios: desglose coherente
]


@pytest.mark.parametrize(
    ("users", "country", "base", "rate", "tax", "total"),
    BREAKDOWN_CASES,
    ids=[f"{u}u-{c}" for u, c, *_ in BREAKDOWN_CASES],
)
def test_pricing_breakdown(
    users: int, country: str, base: str, rate: str, tax: str, total: str
) -> None:
    result = calculate_pricing(users, country=country)
    assert isinstance(result, PricingBreakdown)
    assert result.base_cost == Decimal(base)
    assert result.tax_rate == Decimal(rate)
    assert result.tax_amount == Decimal(tax)
    assert result.total_cost == Decimal(total)


def test_breakdown_amounts_are_decimals_quantized_to_cents() -> None:
    """Los importes salen `Decimal` con exactamente 2 decimales, listos para
    persistir y serializar como string ("140.00", spec 02)."""
    result = calculate_pricing(15, country="ES")
    for amount in (result.base_cost, result.tax_amount, result.total_cost):
        assert isinstance(amount, Decimal)
        assert amount.as_tuple().exponent == -2


@pytest.mark.parametrize(
    ("users", "country"),
    [(15, "ES"), (7, "PT"), (120, "FR"), (0, "DE"), (51, "US")],
)
def test_total_equals_base_plus_tax(users: int, country: str) -> None:
    """Regla de integridad de la spec 03: total_cost = base_cost + tax_amount."""
    result = calculate_pricing(users, country=country)
    assert result.total_cost == result.base_cost + result.tax_amount
