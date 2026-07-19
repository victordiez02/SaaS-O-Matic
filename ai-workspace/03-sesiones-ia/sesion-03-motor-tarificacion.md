# Sesión 03 — Motor de tarificación por tramos + IVA

- **Fecha:** 2026-07-15
- **Objetivo:** implementar el motor de precios (spec 01 §1–2) en TDD estricto, como
  lógica pura con `Decimal`, sin conectarlo aún a ningún endpoint. Corresponde a la
  sesión 3 de la Fase 3 del plan maestro.

- **Specs de partida:**
  - `ai-workspace/01-specs/01-reglas-de-negocio.md` §1 (tramos, 4 ejemplos a mano)
    y §2 (tabla de IVA) — fuente de verdad.
  - Skill `.claude/skills/tiered-pricing/` (fórmula, tabla y ejemplos canónicos).
  - `ai-workspace/02-arquitectura/estructura-proyecto.md` (pricing en `services/`,
    constantes en `core/`).

- **Método:** TDD en dos pasos revisados por separado.
  - **Paso A — solo tests** (aprobados antes de implementar): suite en rojo
    (`ModuleNotFoundError: app.services.pricing`).
  - **Paso B — implementación**: constantes + servicio hasta poner la suite en verde.

- **Qué se generó:**
  - `backend/tests/test_tiered_pricing.py` (32 tests): los 4 ejemplos obligatorios
    (5→50, 15→140, 50→420, 120→770) más fronteras de tramo (10/11 y 50/51 usuarios),
    0 y 200 usuarios; negativos → `ValueError`; tabla de IVA completa + país
    desconocido → 0 % + case-insensitive; desglose completo con 7 combinaciones
    (incluido el ejemplo 15 usuarios ES → 140.00/0.21/29.40/169.40); importes
    `Decimal` cuantizados a 2 decimales; integridad `total = base + impuesto`
    (regla de la spec 03).
  - `backend/app/core/billing.py`: `PRICING_TIERS` y `TAX_RATES`/`DEFAULT_TAX_RATE`
    como configuración, fuera de la lógica (exigencia de la spec 01 §2).
  - `backend/app/services/pricing.py`: `calculate_base_cost`, `get_tax_rate` y
    `calculate_pricing(active_users, country) -> PricingBreakdown` (dataclass
    congelada con `base_cost`, `tax_rate`, `tax_amount`, `total_cost`).

- **Decisiones de diseño de la sesión:**
  1. **`PricingBreakdown` replica los nombres de las columnas de `simulations`**:
     la capa de servicio de la sesión 4 persistirá el desglose campo a campo, sin
     traducciones (auditoría e inmutabilidad, spec 03).
  2. **Tramos como datos** (`PRICING_TIERS` en core, tuplas capacidad/precio): añadir
     o cambiar un tramo no toca el algoritmo; el bucle del servicio es genérico.
  3. **`currency` no viaja en el desglose**: es constante "EUR" y la aporta el modelo
     con su default (spec 03); incluirla sería duplicación.
  4. **País case-insensitive** en `get_tax_rate`, coherente con la decisión tomada
     en el validador fiscal (sesión 2).
  5. **Redondeo `ROUND_HALF_UP`** aplicado solo a impuesto y total (skill). Nota
     honesta: con la tabla actual (base entera × tasas de 2 decimales) el modo de
     redondeo no es observable en tests de caja negra; queda garantizada en su lugar
     la cuantización exacta a 2 decimales (`exponent == -2`).

- **Qué se corrigió/rechazó:** nada en esta sesión; los 4 valores canónicos de la
  skill se reprodujeron a la primera. Los tests de frontera (11 → 108.00, 51 →
  425.00) se añadieron por iniciativa propia al detectar que la tabla de la spec no
  cubría los bordes exactos de tramo, que es donde suelen fallar estas
  implementaciones (off-by-one).

- **Resultado:** `pytest` → **70 passed in 0.09s** (38 del validador de la sesión 2 +
  32 nuevos). Motor puro terminado y cubierto. NO conectado a endpoints.

- **Siguiente sesión:** sesión 4 — endpoints: `POST /simulations` (usa
  `calculate_pricing` y persiste el desglose), integración del validador fiscal en
  `POST /customers` (422 `INVALID_TAX_ID`), `GET /customers?search=` con sobre
  `{items, total}`, `GET /customers/{id}` y `GET /customers/{id}/simulations`, más
  `test_api.py` de integración.
