"""Tests del validador fiscal español (DNI / NIE / CIF).

TDD estricto: esta suite existe ANTES que la implementación y fija su contrato.
Fuente de verdad: ai-workspace/01-specs/01-reglas-de-negocio.md §3 (tabla §3.4) y
la skill spanish-tax-id-validator. Cada fila de la tabla canónica es un caso aquí.

Contrato que exige esta suite a `app.validators.spanish_tax_id.validate_tax_id`:

    validate_tax_id(tax_id: str, country: str) -> TaxIdValidation

- Función pura: sin BD, sin FastAPI, sin I/O.
- `TaxIdValidation.is_valid`   → bool.
- `TaxIdValidation.normalized` → identificador en mayúsculas, sin espacios ni
  guiones (es lo que la capa de servicio persistirá).
- `TaxIdValidation.reason`     → None si es válido; si no, texto no vacío con el
  motivo (letra de control errónea, longitud, patrón desconocido…).
- Validación estricta (algoritmos oficiales) SOLO si country == "ES".
- Otros países: formato mínimo — 3 a 20 caracteres alfanuméricos tras normalizar.
"""

import pytest

from app.validators.spanish_tax_id import validate_tax_id

# ---------------------------------------------------------------------------
# Tabla canónica de la spec 01 §3.4 (18 casos, país ES)
# ---------------------------------------------------------------------------

SPEC_CASES: list[tuple[str, bool, str]] = [
    # (entrada, esperado_valido, qué cubre)
    ("12345678Z", True, "DNI caso base"),
    ("12345678A", False, "DNI letra de control errónea"),
    ("12345678z", True, "DNI normalización a mayúsculas"),
    ("12345678-Z", True, "DNI normalización de guiones"),
    ("1234567Z", False, "DNI longitud incorrecta (7 dígitos)"),
    ("X1234567L", True, "NIE prefijo X"),
    ("Y1234567X", True, "NIE prefijo Y"),
    ("Z7654321H", True, "NIE prefijo Z"),
    ("X1234567T", False, "NIE letra de control errónea"),
    ("B12345674", True, "CIF letra que exige dígito de control"),
    ("B12345670", False, "CIF dígito de control erróneo"),
    ("A58818501", True, "CIF letra A (exige dígito)"),
    ("Q2826000H", True, "CIF letra que exige letra de control"),
    ("Q28260008", False, "CIF con dígito donde Q exige letra"),
    ("B 1234567 4", True, "CIF normalización de espacios"),
    ("M1234567X", False, "letra de organización no válida para CIF"),
    ("", False, "entrada vacía"),
    ("HOLA", False, "no encaja en ningún patrón"),
]


@pytest.mark.parametrize(
    ("tax_id", "expected_valid"),
    [(tax_id, expected) for tax_id, expected, _ in SPEC_CASES],
    ids=[covers for _, _, covers in SPEC_CASES],
)
def test_es_strict_validation(tax_id: str, expected_valid: bool) -> None:
    """País ES → validación algorítmica estricta según la tabla de la spec."""
    result = validate_tax_id(tax_id, country="ES")
    assert result.is_valid is expected_valid


# ---------------------------------------------------------------------------
# Normalización: el valor devuelto es el que se persistirá
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected_normalized"),
    [
        ("12345678-z", "12345678Z"),
        ("b 1234567 4", "B12345674"),
        ("  x1234567l  ", "X1234567L"),
        ("12345678Z", "12345678Z"),
    ],
)
def test_normalized_value(raw: str, expected_normalized: str) -> None:
    """Mayúsculas y sin espacios/guiones, listo para persistir (spec 03)."""
    result = validate_tax_id(raw, country="ES")
    assert result.is_valid
    assert result.normalized == expected_normalized


# ---------------------------------------------------------------------------
# Motivo del rechazo: presente solo cuando es inválido
# ---------------------------------------------------------------------------


def test_valid_result_has_no_reason() -> None:
    result = validate_tax_id("12345678Z", country="ES")
    assert result.is_valid
    assert result.reason is None


@pytest.mark.parametrize(
    "tax_id",
    ["12345678A", "1234567Z", "X1234567T", "B12345670", "Q28260008", "", "HOLA"],
)
def test_invalid_result_carries_reason(tax_id: str) -> None:
    """Todo rechazo lleva un motivo no vacío (la API lo usará en el 422)."""
    result = validate_tax_id(tax_id, country="ES")
    assert not result.is_valid
    assert result.reason  # texto no vacío


# ---------------------------------------------------------------------------
# Países distintos de ES: formato mínimo (spec 01 §3, decisión documentada)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("tax_id", "country", "expected_valid"),
    [
        ("DE811907980", "DE", True),  # VAT alemán real: alfanumérico, 11 chars
        ("fr-40 303 265 045", "FR", True),  # normaliza a FR40303265045
        ("12345678A", "PT", True),  # letra errónea para ES, pero PT no es estricto
        ("AB", "US", False),  # < 3 caracteres tras normalizar
        ("A" * 21, "PT", False),  # > 20 caracteres
        ("", "DE", False),  # vacío
        ("!!!", "IT", False),  # no alfanumérico tras normalizar
    ],
)
def test_non_es_minimal_format(tax_id: str, country: str, expected_valid: bool) -> None:
    """Fuera de España solo se exige formato mínimo: 3–20 alfanuméricos."""
    result = validate_tax_id(tax_id, country=country)
    assert result.is_valid is expected_valid


def test_country_code_is_case_insensitive() -> None:
    """`country="es"` debe activar la validación estricta igual que "ES"."""
    assert not validate_tax_id("12345678A", country="es").is_valid
    assert validate_tax_id("12345678Z", country="es").is_valid
