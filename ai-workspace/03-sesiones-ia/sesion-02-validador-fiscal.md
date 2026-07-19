# Sesión 02 — Validador de identificador fiscal español (DNI/NIE/CIF)

- **Fecha:** 2026-07-15
- **Objetivo:** implementar la validación fiscal española (spec 01 §3) en TDD
  estricto, como lógica pura reutilizable, sin conectarla aún a ningún endpoint.
  Corresponde a la sesión 2 de la Fase 3 del plan maestro.

- **Specs de partida:**
  - `ai-workspace/01-specs/01-reglas-de-negocio.md` §3 (algoritmos DNI/NIE/CIF y
    tabla de 18 casos §3.4) — fuente de verdad.
  - Skill `.claude/skills/spanish-tax-id-validator/` (algoritmos y casos canónicos).
  - `ai-workspace/02-arquitectura/estructura-proyecto.md` (ubicación en `validators/`).

- **Método:** TDD en dos pasos revisados por separado.
  - **Paso A — solo tests** (aprobado antes de implementar): se escribió la suite y se
    verificó que fallaba en rojo (`ModuleNotFoundError: app.validators`).
  - **Paso B — implementación**: se escribió el validador hasta poner la suite en verde.

- **Qué se generó:**
  - `backend/tests/test_tax_id_validator.py` (38 tests): la tabla canónica de la spec
    (18 casos ES), normalización del valor persistible, presencia de motivo en los
    rechazos, formato mínimo para países ≠ ES y país insensible a mayúsculas.
  - `backend/app/validators/spanish_tax_id.py`: función pura
    `validate_tax_id(tax_id, country) -> TaxIdValidation` (campos `is_valid`,
    `normalized`, `reason`). Sin BD ni FastAPI.
  - `backend/app/validators/__init__.py`, `backend/tests/__init__.py`.
  - `backend/pytest.ini` (pythonpath + testpaths) y `pytest==8.3.4` en
    `requirements.txt` (instalado en el venv).

- **Decisiones de diseño de la sesión:**
  1. **La función devuelve `normalized`** además de válido/motivo. Así la capa de
     servicio (customers) persiste el valor normalizado (mayúsculas, sin espacios ni
     guiones, spec 03) sin duplicar la normalización. Cierra una de las correcciones
     detectadas en el inventario previo.
  2. **`country` insensible a mayúsculas** (`"es"` == `"ES"`): decisión defensiva, no
     literal en la spec, para no depender de que la capa superior normalice el país.
  3. **Motivo del rechazo como texto** (no enum): alimentará el `detail` del futuro
     `422 INVALID_TAX_ID`; los tests comprueban que existe, no su literal, para no
     acoplarse a la redacción.

- **Qué se corrigió/rechazó:** nada que rechazar de la implementación; los algoritmos
  se aplicaron tal cual la skill (verificados los 4 CIF y los 3 NIE a mano contra la
  spec). Ajuste respecto al corte vertical previo: la normalización de `tax_id` deja de
  vivir en `services/customer.py` (`strip().upper()`, insuficiente) y pasará a
  apoyarse en `normalized` de este validador cuando se integre en el endpoint.

- **Resultado:** `pytest` → **38 passed in 0.06s**. Validador puro terminado y cubierto
  por tests. NO conectado a endpoints (fuera del alcance de esta sesión).

- **Siguiente sesión:** sesión 3 — motor de tarificación por tramos + IVA
  (`services/pricing.py`) con `Decimal`, también en TDD sobre los ejemplos 5/15/50/120
  de la spec 01 §1. La integración del validador en `POST /customers` queda para la
  sesión 4 (endpoints).
