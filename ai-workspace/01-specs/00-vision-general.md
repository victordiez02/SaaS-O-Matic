# 00 — Visión general

## Qué es SaaS-O-Matic

Herramienta interna para que el equipo comercial pueda **simular, optimizar y presupuestar
suscripciones SaaS multi-divisa** para clientes corporativos. Un comercial registra un
cliente (con validación fiscal estricta si es español), lanza simulaciones de consumo
(usuarios, almacenamiento, llamadas API) y obtiene la proyección de factura mensual con
desglose de impuestos, visualizable en distintas divisas.

## Alcance

**Dentro del alcance:**

- Alta de clientes corporativos con validación algorítmica del identificador fiscal
  español (DNI/NIE/CIF).
- Motor de tarificación acumulativa por tramos según número de usuarios activos.
- Aplicación de IVA según el país del cliente.
- Persistencia de simulaciones con desglose completo del cálculo (auditable).
- Buscador de clientes, vista de detalle con historial de simulaciones y formulario
  de simulación interactiva con conversión de divisa en tiempo real.

**Fuera del alcance (decisiones de diseño documentadas en las demás specs):**

- Facturación real, pagos o integración con ERPs.
- Autenticación/usuarios: es una herramienta interna; se asume red de confianza.
- Precio por almacenamiento o llamadas API (se persisten sin coste; ver
  [01-reglas-de-negocio.md](01-reglas-de-negocio.md)).

## Stack

| Capa | Tecnología | Justificación |
|---|---|---|
| Backend | Python 3.12 + FastAPI | Opción preferida del enunciado; ver ADR-001 |
| Base de datos | SQLite + SQLAlchemy | Obligatoria según enunciado; ver ADR-003 |
| Frontend | React (Vite) + pnpm | Libre elección; ecosistema maduro |
| Orquestación | Docker Compose | Arranque en un comando (criterio README/Despliegue) |

## Principios transversales

1. **Las specs son la fuente de verdad.** Si el código contradice una spec, gana la spec
   (regla de `CLAUDE.md`).
2. **El dinero se calcula con `Decimal`, nunca con float**, y se redondea a 2 decimales.
3. **Todos los importes se almacenan y calculan en EUR.** La conversión de divisa es
   exclusivamente de presentación en el frontend.
4. **La lógica de negocio reutilizable (validación fiscal y tarificación) está extraída
   además a skills** (`.claude/skills/`) para aplicarla de forma consistente en backend
   y frontend. La spec sigue mandando; la skill deriva de ella (ver nota en
   [01-reglas-de-negocio.md](01-reglas-de-negocio.md)).

## Mapa de especificaciones

| Documento | Contenido |
|---|---|
| [01-reglas-de-negocio.md](01-reglas-de-negocio.md) | Tramos, IVA por país, validación fiscal española |
| [02-contrato-api.md](02-contrato-api.md) | Endpoints, request/response, códigos de estado, errores |
| [03-modelo-de-datos.md](03-modelo-de-datos.md) | Tablas, tipos, claves, restricciones e índices |
| [04-frontend-ux.md](04-frontend-ux.md) | Vistas, estados de UI, selector de divisa |

## Criterios de éxito

- Alta de cliente con NIF inválido → error 422 con mensaje claro.
- Simulación de 15 usuarios → base 140,00 € (coincide con el ejemplo del enunciado).
- El desglose (base, tasa, impuesto, total) queda persistido en base de datos.
- Cambio de divisa instantáneo sin recalcular en backend.
- `docker compose up` levanta todo el sistema.
