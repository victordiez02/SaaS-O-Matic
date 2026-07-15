"""Validación de identificadores fiscales españoles (DNI / NIE / CIF).

Lógica pura: recibe identificador y país, devuelve válido/inválido con el motivo y
el valor normalizado. Sin BD ni FastAPI (se testea sin levantar la app).

Fuente de verdad: ai-workspace/01-specs/01-reglas-de-negocio.md §3 y la skill
`spanish-tax-id-validator`. Si algo aquí diverge de la spec, gana la spec.

Comportamiento por país:
- `country == "ES"` (insensible a mayúsculas): validación algorítmica estricta con
  los algoritmos oficiales de control (DNI, NIE, CIF).
- Cualquier otro país: solo formato mínimo (3–20 caracteres alfanuméricos tras
  normalizar). Añadir validadores por país es una extensión natural de este módulo.
"""

import re
from dataclasses import dataclass

# Tabla de letras de control del DNI/NIE, indexada por (número % 23).
_DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE"

# Prefijos de NIE y su sustitución numérica.
_NIE_PREFIX = {"X": "0", "Y": "1", "Z": "2"}

# Letras de organización válidas para el CIF.
_CIF_ORG_LETTERS = "ABCDEFGHJNPQRSUVW"
# Letra equivalente al dígito de control del CIF, indexada por ese dígito.
_CIF_CONTROL_LETTERS = "JABCDEFGHI"
# Organizaciones cuyo control es obligatoriamente letra / obligatoriamente dígito.
_CIF_LETTER_CONTROL = "PQRSWN"
_CIF_DIGIT_CONTROL = "ABEH"

_DNI_RE = re.compile(r"^[0-9]{8}[A-Z]$")
_NIE_RE = re.compile(r"^[XYZ][0-9]{7}[A-Z]$")
_CIF_RE = re.compile(rf"^[{_CIF_ORG_LETTERS}][0-9]{{7}}[0-9A-Z]$")


@dataclass(frozen=True)
class TaxIdValidation:
    """Resultado de validar un identificador fiscal.

    - `is_valid`:   True si supera la validación aplicable al país.
    - `normalized`: identificador en mayúsculas y sin espacios ni guiones; es el
      valor que la capa de servicio debe persistir.
    - `reason`:     None si es válido; motivo del rechazo si no lo es.
    """

    is_valid: bool
    normalized: str
    reason: str | None


def _normalize(raw: str) -> str:
    """Mayúsculas y sin espacios ni guiones (`12345678-z` → `12345678Z`)."""
    return re.sub(r"[\s-]", "", raw).upper()


def _dni_control_letter(eight_digits: str) -> str:
    """Letra de control que corresponde a un número de 8 dígitos (DNI y NIE)."""
    return _DNI_LETTERS[int(eight_digits) % 23]


def _validate_dni(value: str) -> str | None:
    """Devuelve el motivo del rechazo, o None si el DNI es válido."""
    if _dni_control_letter(value[:8]) != value[8]:
        return "dígito de control incorrecto"
    return None


def _validate_nie(value: str) -> str | None:
    """Devuelve el motivo del rechazo, o None si el NIE es válido."""
    eight_digits = _NIE_PREFIX[value[0]] + value[1:8]
    if _dni_control_letter(eight_digits) != value[8]:
        return "dígito de control incorrecto"
    return None


def _validate_cif(value: str) -> str | None:
    """Devuelve el motivo del rechazo, o None si el CIF es válido."""
    org_letter = value[0]
    digits = value[1:8]
    control_char = value[8]

    odd_sum = 0  # posiciones impares (1.ª, 3.ª, 5.ª, 7.ª): dígito × 2, sumar cifras
    for digit in digits[0::2]:
        doubled = int(digit) * 2
        odd_sum += doubled // 10 + doubled % 10
    even_sum = sum(int(d) for d in digits[1::2])  # pares (2.ª, 4.ª, 6.ª): tal cual

    control_digit = (10 - (odd_sum + even_sum) % 10) % 10
    expected_letter = _CIF_CONTROL_LETTERS[control_digit]

    if org_letter in _CIF_LETTER_CONTROL:
        expected = expected_letter
    elif org_letter in _CIF_DIGIT_CONTROL:
        expected = str(control_digit)
    else:  # C D F G J U V → se acepta dígito o su letra equivalente
        if control_char in {str(control_digit), expected_letter}:
            return None
        return "dígito de control incorrecto"

    if control_char != expected:
        return "dígito de control incorrecto"
    return None


def _validate_spanish(normalized: str) -> str | None:
    """Detecta el tipo por patrón y delega. Motivo del rechazo, o None si válido."""
    if not normalized:
        return "el identificador fiscal está vacío"
    if _DNI_RE.match(normalized):
        return _validate_dni(normalized)
    if _NIE_RE.match(normalized):
        return _validate_nie(normalized)
    if _CIF_RE.match(normalized):
        return _validate_cif(normalized)
    return "no corresponde a un DNI, NIE ni CIF válido (patrón o longitud incorrectos)"


def _validate_minimal(normalized: str) -> str | None:
    """Formato mínimo para países distintos de ES: 3–20 alfanuméricos."""
    if not (3 <= len(normalized) <= 20) or not normalized.isalnum():
        return "debe tener entre 3 y 20 caracteres alfanuméricos"
    return None


def validate_tax_id(tax_id: str, country: str) -> TaxIdValidation:
    """Valida un identificador fiscal según el país.

    Estricta (algoritmos oficiales) solo si `country == "ES"`; en el resto se aplica
    únicamente el formato mínimo. El identificador se normaliza siempre antes.
    """
    normalized = _normalize(tax_id)
    if country.strip().upper() == "ES":
        reason = _validate_spanish(normalized)
    else:
        reason = _validate_minimal(normalized)
    return TaxIdValidation(is_valid=reason is None, normalized=normalized, reason=reason)
