"""Constantes de negocio de facturación: tramos de precio y tabla de IVA.

Fuente de verdad: ai-workspace/01-specs/01-reglas-de-negocio.md §1–2. Viven en
`core/` (configuración), no en la lógica: cambiar un precio o añadir un país no
debe tocar el servicio de pricing (spec 01 §2).
"""

from decimal import Decimal

# Tramos acumulativos de la tarificación (spec 01 §1). Cada entrada es
# (capacidad_del_tramo, precio_por_usuario); None = sin límite (último tramo).
#   Tramo 1: usuarios 1–10  → 10 €/usuario
#   Tramo 2: usuarios 11–50 → 8 €/usuario (capacidad 40)
#   Tramo 3: usuarios > 50  → 5 €/usuario
PRICING_TIERS: tuple[tuple[int | None, Decimal], ...] = (
    (10, Decimal("10")),
    (40, Decimal("8")),
    (None, Decimal("5")),
)

# IVA por país, código ISO 3166-1 alpha-2 (spec 01 §2). Alcance: los 5 países UE
# donde opera el equipo comercial; cualquier otro país → tasa por defecto 0 %
# (exportación fuera de alcance fiscal, decisión documentada en la spec).
TAX_RATES: dict[str, Decimal] = {
    "ES": Decimal("0.21"),
    "PT": Decimal("0.23"),
    "FR": Decimal("0.20"),
    "DE": Decimal("0.19"),
    "IT": Decimal("0.22"),
}

DEFAULT_TAX_RATE = Decimal("0.00")
