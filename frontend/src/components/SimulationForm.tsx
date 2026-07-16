import { useMemo, useState } from "react";

import { ApiError } from "../api/client";
import { createSimulation } from "../api/simulations";
import type { Customer, Simulation } from "../api/types";
import { estimateCost } from "../utils/pricing";
import CostBreakdown from "./CostBreakdown";
import NumberField, { FieldError, toCount } from "./NumberField";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";

const SLIDER_MAX = 200;

type SaveStatus = "editing" | "saving" | "error";

/**
 * Formulario de simulación con proyección en vivo (spec 04, vista 3).
 *
 * El preview se calcula en el cliente (`utils/pricing.ts`) para que el slider vaya
 * fluido; al guardar, manda el backend y su respuesta sustituye a la proyección
 * (ADR-006).
 */
export default function SimulationForm({
  customer,
  onSaved,
}: {
  customer: Customer;
  onSaved?: (simulation: Simulation) => void;
}) {
  const [activeUsers, setActiveUsers] = useState(15);
  const [storageGb, setStorageGb] = useState(0);
  const [apiCalls, setApiCalls] = useState(0);
  const [status, setStatus] = useState<SaveStatus>("editing");
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [saved, setSaved] = useState<Simulation | null>(null);

  const preview = useMemo(
    () => estimateCost(activeUsers, customer.country),
    [activeUsers, customer.country],
  );

  // Tocar cualquier control invalida el resultado guardado: lo que se ve vuelve a
  // ser una proyección, no un dato del backend.
  const edit = <T,>(set: (value: T) => void) => {
    return (value: T) => {
      setSaved(null);
      setStatus("editing");
      set(value);
    };
  };

  const fieldError = (field: string) =>
    error instanceof ApiError
      ? error.errors.find((e) => e.field === field)?.message
      : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const simulation = await createSimulation({
        customer_id: customer.id,
        active_users: activeUsers,
        storage_gb: storageGb,
        api_calls: apiCalls,
      });
      setSaved(simulation);
      setStatus("editing");
      onSaved?.(simulation);
    } catch (err) {
      setError(err as Error);
      setStatus("error");
    }
  }

  // El backend redondea con ROUND_HALF_UP sobre Decimal y el preview en céntimos:
  // si algún día no coinciden, manda el guardado y se dice en voz baja.
  const previewDiffers =
    saved !== null && Number(saved.total_cost) !== preview.totalCost;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <div className="grid content-start gap-5">
        <div className="grid gap-2.5">
          <div className="flex items-end justify-between gap-4">
            <Label htmlFor="active-users">Usuarios activos</Label>
            <Input
              id="active-users"
              type="number"
              min={0}
              inputMode="numeric"
              value={activeUsers}
              onChange={(e) => edit(setActiveUsers)(toCount(e.target.value))}
              className="w-24 text-right font-mono tabular-nums"
            />
          </div>
          {/* El slider llega a 200; por encima se escribe en el campo (spec 04). */}
          <Slider
            value={[Math.min(activeUsers, SLIDER_MAX)]}
            onValueChange={([value]) => edit(setActiveUsers)(value)}
            min={0}
            max={SLIDER_MAX}
            step={1}
            aria-label="Usuarios activos"
          />
          <FieldError message={fieldError("active_users")} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField
            id="storage-gb"
            label="Almacenamiento (GB)"
            value={storageGb}
            onChange={edit(setStorageGb)}
            error={fieldError("storage_gb")}
          />
          <NumberField
            id="api-calls"
            label="Llamadas a la API"
            value={apiCalls}
            onChange={edit(setApiCalls)}
            error={fieldError("api_calls")}
          />
        </div>
        <p className="m-0 -mt-2 text-xs text-muted-foreground">
          Se registran con la simulación, sin coste en el plan actual.
        </p>

        <div className="grid justify-items-start gap-2">
          <Button type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Guardando…" : "Guardar simulación"}
          </Button>
          {status === "error" && error && (
            <p className="m-0 text-sm text-destructive">
              {error.message}{" "}
              <span className="text-muted-foreground">
                No se ha guardado nada; los datos siguen aquí.
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="grid content-start gap-2 sm:w-[19rem]">
        {saved ? (
          <CostBreakdown
            label="Simulación guardada"
            baseCost={saved.base_cost}
            taxRate={saved.tax_rate}
            taxAmount={saved.tax_amount}
            totalCost={saved.total_cost}
          />
        ) : (
          <CostBreakdown
            label="Proyección mensual"
            baseCost={preview.baseCost}
            taxRate={preview.taxRate}
            taxAmount={preview.taxAmount}
            totalCost={preview.totalCost}
          />
        )}
        {previewDiffers && (
          <p className="m-0 text-xs text-muted-foreground">
            Importe ajustado al cálculo del backend.
          </p>
        )}
      </div>
    </form>
  );
}

