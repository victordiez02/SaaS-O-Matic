# 03 — Modelo de datos

Base de datos: **SQLite** gestionada con **SQLAlchemy** (modelos en
`backend/app/models/`, sesión en `backend/app/db/`). Dos tablas: `customers` y
`simulations`, relación 1:N.

```
customers 1 ──── N simulations
```

> **Decisión de diseño — persistir el desglose, no solo el total.** Cada simulación
> guarda `base_cost`, `tax_rate`, `tax_amount` y `total_cost`. Motivos: (1) auditoría —
> se puede verificar cualquier factura histórica sin reejecutar el motor; (2)
> inmutabilidad — si mañana cambia el IVA de un país o los tramos, las simulaciones
> antiguas siguen reflejando lo que se presupuestó; (3) el frontend muestra el desglose
> sin recalcular. El coste extra son 3 columnas.

## Tabla `customers`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | INTEGER | PK, autoincremental | |
| `company_name` | TEXT | NOT NULL | Nombre de la empresa |
| `tax_id` | TEXT | NOT NULL, **UNIQUE** | Normalizado (mayúsculas, sin guiones/espacios) antes de persistir |
| `email` | TEXT | NOT NULL | Validado como email en el schema Pydantic |
| `country` | TEXT | NOT NULL | Código ISO 3166-1 alpha-2 en mayúsculas (`ES`, `FR`…) |
| `plan` | TEXT | NOT NULL | Enum: `basic` \| `pro` \| `enterprise` |
| `created_at` | DATETIME | NOT NULL, default UTC now | Siempre UTC |

**Índices:**

- Índice único implícito sobre `tax_id` (restricción UNIQUE): soporta el buscador y
  garantiza la unicidad del alta.
- `ix_customers_company_name` sobre `company_name`: soporta el buscador por nombre.

## Tabla `simulations`

| Columna | Tipo | Restricciones | Notas |
|---|---|---|---|
| `id` | INTEGER | PK, autoincremental | |
| `customer_id` | INTEGER | NOT NULL, FK → `customers.id` | `ON DELETE CASCADE` |
| `active_users` | INTEGER | NOT NULL, CHECK ≥ 0 | Entrada del motor de tramos |
| `storage_gb` | INTEGER | NOT NULL, CHECK ≥ 0 | Persistido sin coste (alcance actual) |
| `api_calls` | INTEGER | NOT NULL, CHECK ≥ 0 | Persistido sin coste (alcance actual) |
| `base_cost` | NUMERIC(10,2) | NOT NULL | Coste base por tramos, EUR |
| `tax_rate` | NUMERIC(5,4) | NOT NULL | Tasa aplicada (`0.2100`), congelada en el momento del cálculo |
| `tax_amount` | NUMERIC(10,2) | NOT NULL | `base_cost × tax_rate` redondeado a 2 decimales |
| `total_cost` | NUMERIC(10,2) | NOT NULL | `base_cost + tax_amount` |
| `currency` | TEXT | NOT NULL, default `'EUR'` | Constante en el alcance actual; explícita por auditoría |
| `created_at` | DATETIME | NOT NULL, default UTC now | Siempre UTC |

**Índices:**

- `ix_simulations_customer_id` sobre `customer_id`: soporta el historial por cliente.

> **Decisión de diseño — `Decimal` y NUMERIC en SQLite.** SQLite no tiene tipo decimal
> nativo. Se usa `sqlalchemy.Numeric(10, 2)` con `asdecimal=True`, de modo que en
> Python los importes viajan siempre como `decimal.Decimal` (regla de `CLAUDE.md`) y el
> redondeo se controla en el servicio de pricing, no en la base de datos. La columna
> `currency` se persiste aunque hoy sea siempre `'EUR'`: hace la fila autoexplicativa y
> deja la puerta abierta a multi-divisa real sin migración semántica.

> **Decisión de diseño — borrado en cascada.** Si se elimina un cliente (no hay
> endpoint DELETE en el alcance actual, pero sí en consola/tests), sus simulaciones
> huérfanas no tienen sentido y se eliminan con él. En SQLite hay que activar
> `PRAGMA foreign_keys=ON` en cada conexión — se configura en `backend/app/db/`.

## Reglas de integridad resumidas

1. `tax_id` único en todo el sistema (dos clientes no comparten identificador fiscal).
2. Ninguna simulación sin cliente (`FK` + `PRAGMA foreign_keys=ON`).
3. Contadores de consumo nunca negativos (CHECK en BD + validación Pydantic en API).
4. El desglose persistido debe ser internamente coherente:
   `total_cost = base_cost + tax_amount` — verificado por test de integración.
