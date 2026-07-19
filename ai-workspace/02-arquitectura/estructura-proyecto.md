# Estructura del proyecto y separación de capas

## Objetivo

Evitar los dos males clásicos del código generado con IA: **archivos masivos** que
mezclan responsabilidades y **lógica de negocio esparcida** por los controladores.
La estructura de capas + la regla "ningún fichero > 200 líneas" (en `CLAUDE.md`)
fuerzan a que cada pieza tenga un sitio único y predecible.

## Backend: flujo router → schema → service → model

```
Petición HTTP
   │
   ▼
api/ (routers) ──── solo orquesta: recibe, delega, responde. CERO lógica de negocio.
   │
   ▼
schemas/ (Pydantic) ── valida forma y tipos de entrada/salida. Contrato de la API.
   │
   ▼
services/ + validators/ ── TODA la lógica de negocio: tramos, IVA, validación fiscal.
   │                        Funciones puras donde sea posible → fáciles de testear.
   ▼
models/ (SQLAlchemy) ── persistencia. Sin lógica, solo estructura y restricciones.
```

Reglas que hacen cumplir la separación:

1. Un router **nunca** importa de `models/` directamente ni contiene cálculos: si un
   `if` de negocio aparece en un router, está en el sitio equivocado.
2. `services/` y `validators/` **no importan de `api/`**: la lógica no sabe que existe
   HTTP. Esto permite testearla sin levantar la aplicación.
3. Los schemas Pydantic son el único contrato entre el exterior y el dominio: los
   modelos SQLAlchemy jamás se serializan directamente en una respuesta.
4. Cada regla de negocio de las specs tiene su test en `tests/` antes de darse por
   terminada (TDD sobre los ejemplos calculados a mano de la spec 01).

## Organización de carpetas

```
backend/
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py              # creación de la app, registro de routers y handlers de error
│   ├── api/                 # routers: customers.py, simulations.py, health.py
│   ├── core/                # config, errors.py (AppError) y constantes de negocio (tramos, tabla de IVA)
│   ├── schemas/             # Pydantic: customer.py, simulation.py, serializers.py
│   ├── services/            # customer.py, simulation.py, pricing.py (tramos + IVA)
│   ├── validators/          # spanish_tax_id.py (DNI/NIE/CIF)
│   ├── models/              # SQLAlchemy: customer.py, simulation.py
│   └── db/                  # base declarativa, engine, session, PRAGMA foreign_keys
├── scripts/
│   └── init_db.py           # único punto que crea el esquema (ADR-005)
└── tests/
    ├── test_tax_id_validator.py   # tabla de casos de la spec 01 §3.4
    ├── test_tiered_pricing.py     # ejemplos 5/15/50/120 de la spec 01 §1
    ├── test_customers_api.py      # integración: alta, búsqueda, detalle
    ├── test_simulations_api.py    # integración: creación e historial
    └── test_error_format_api.py   # contrato {detail, code, errors} transversal

frontend/
├── Dockerfile
├── package.json             # pnpm
└── src/
    ├── api/                 # ÚNICO lugar con fetch: cliente backend + er-api
    ├── components/          # CustomerCard, SearchBar, SimulationForm, CurrencySelector…
    ├── context/             # CurrencyContext (divisa seleccionada + conversión)
    ├── hooks/               # useExchangeRates, useCustomerSearch, useResource
    ├── pages/               # Dashboard, CustomerDetail, NewCustomer, NewSimulation
    └── utils/               # pricing.ts (preview de tramos), format.ts (moneda/fecha/tasa)
```

## Por qué esta estructura evita archivos masivos

- **Un concepto = un fichero**: el validador fiscal, el motor de precios y cada router
  viven separados; ninguno tiene motivo para crecer más allá de su responsabilidad.
- **El límite de 200 líneas es ejecutable**: si un fichero lo supera, la división
  natural ya está definida por la capa (p. ej., `pricing.py` se partiría en
  `pricing.py` + `tax.py`, no en un "utils.py" cajón de sastre).
- **En el frontend**, la regla "fetch solo en `src/api/`" impide el patrón de
  componentes de 500 líneas que mezclan UI, red y lógica.

## Dónde vive cada regla de negocio

| Regla | Spec | Código | Test |
|---|---|---|---|
| Tramos 10/8/5 € | 01 §1 | `services/pricing.py` | `test_tiered_pricing.py` |
| IVA por país | 01 §2 | `core/` (tabla) + `services/pricing.py` | `test_tiered_pricing.py` |
| DNI/NIE/CIF | 01 §3 | `validators/spanish_tax_id.py` | `test_tax_id_validator.py` |
| Preview en cliente | 04 | `frontend/src/utils/pricing.ts` | tests de utils del frontend |

Las dos primeras filas están además fijadas como skills (`tiered-pricing`,
`spanish-tax-id-validator`) para que cualquier sesión de IA aplique exactamente el
mismo algoritmo en backend y frontend.
