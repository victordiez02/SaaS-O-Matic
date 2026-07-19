import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { getCustomer } from "../api/customers";
import type { Simulation } from "../api/types";
import CustomerCardSkeleton from "../components/CustomerCardSkeleton";
import FiscalKey from "../components/FiscalKey";
import SimulationForm from "../components/SimulationForm";
import StatePanel from "../components/StatePanel";
import { Button } from "../components/ui/button";
import { useResource } from "../hooks/useResource";

/** Vista 3 de la spec 04: simulación interactiva con proyección en vivo. */
export default function NewSimulation() {
  const { id } = useParams();
  const customerId = Number(id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return <NotFound />;
  }
  return <NewSimulationView customerId={customerId} />;
}

function NewSimulationView({ customerId }: { customerId: number }) {
  // El preview necesita el país del cliente: el IVA sale de ahí (spec 01 §2).
  const customer = useResource(getCustomer, customerId);
  const [saved, setSaved] = useState<Simulation | null>(null);
  const navigate = useNavigate();

  const notFound =
    customer.error instanceof ApiError &&
    customer.error.code === "CUSTOMER_NOT_FOUND";

  return (
    <section className="grid gap-3.5">
      <Link
        to={`/customers/${customerId}`}
        className="inline-flex items-center gap-1 justify-self-start text-[0.8125rem] text-muted-foreground no-underline hover:text-destructive"
      >
        ← Volver a la ficha
      </Link>

      {customer.status === "loading" && <CustomerCardSkeleton />}

      {customer.status === "error" &&
        (notFound ? (
          <NotFound />
        ) : (
          <StatePanel
            title="No se pudo cargar el cliente"
            description="Sin sus datos no se puede calcular el impuesto que le corresponde."
          >
            <Button type="button" onClick={customer.retry} className="mt-2.5">
              Reintentar
            </Button>
          </StatePanel>
        ))}

      {customer.status === "success" && customer.data && (
        <>
          <div className="grid gap-1">
            <FiscalKey
              customer={customer.data}
              className="justify-self-start"
            />
            <h1 className="m-0 text-2xl leading-tight font-bold tracking-[-0.02em]">
              Simular consumo
            </h1>
            <p className="m-0 text-sm text-muted-foreground">
              {customer.data.company_name} · el coste se recalcula al mover el
              slider, sin llamar al backend.
            </p>
          </div>

          <SimulationForm customer={customer.data} onSaved={setSaved} />

          {saved && (
            // Volver es una acción explícita, no un salto automático.
            <div className="flex flex-wrap items-center gap-2.5 border-t border-border pt-3.5">
              <p className="m-0 text-sm text-muted-foreground">
                Guardada en el historial de {customer.data.company_name}.
              </p>
              <Button
                type="button"
                onClick={() => navigate(`/customers/${customerId}`)}
              >
                Ver en el historial
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function NotFound() {
  return (
    <StatePanel
      title="Cliente no encontrado"
      description="No se puede simular el consumo de una ficha que no existe."
    >
      <Button asChild className="mt-2.5">
        <Link to="/">Volver al índice</Link>
      </Button>
    </StatePanel>
  );
}
