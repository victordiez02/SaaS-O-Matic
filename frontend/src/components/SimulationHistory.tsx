import { Link } from "react-router-dom";

import type { Simulation } from "../api/types";
import type { Resource } from "../hooks/useResource";
import { formatDateTime, formatMoney, formatRate } from "../utils/format";
import StatePanel from "./StatePanel";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Card } from "./ui/card";

const SKELETON_ROWS = 3;

/** Historial de simulaciones guardadas del cliente, con sus propios estados de red */
export default function SimulationHistory({
  history,
  customerId,
}: {
  history: Resource<{ items: Simulation[] }>;
  customerId: number;
}) {
  const { status, data, retry } = history;

  return (
    <section className="grid gap-2.5">
      <h2 className="m-0 mt-2 text-[1.0625rem] font-bold tracking-[-0.02em]">
        Simulaciones guardadas
      </h2>

      {status === "loading" && <HistorySkeleton />}

      {status === "error" && (
        <StatePanel
          title="No se pudo cargar el historial"
          description="La ficha del cliente sí está disponible; solo ha fallado la consulta de las simulaciones."
        >
          <Button type="button" onClick={retry} className="mt-2.5">
            Reintentar
          </Button>
        </StatePanel>
      )}

      {status === "success" &&
        (data && data.items.length > 0 ? (
          <SimulationTable simulations={data.items} />
        ) : (
          <StatePanel
            title="Aún no hay simulaciones para este cliente"
            description="Simula un consumo para ver el desglose por tramos y el impuesto que le corresponde."
          >
            <Button asChild className="mt-2.5">
              <Link to={`/customers/${customerId}/simulate`}>
                Crear la primera simulación
              </Link>
            </Button>
          </StatePanel>
        ))}
    </section>
  );
}

function SimulationTable({ simulations }: { simulations: Simulation[] }) {
  return (
    <Card className="overflow-x-auto border border-border p-0 [--card-spacing:0px]">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <Th>Fecha</Th>
            <Th className="text-right">Usuarios</Th>
            <Th className="text-right">Base</Th>
            <Th className="text-right">Impuesto</Th>
            <Th className="text-right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {simulations.map((simulation) => (
            <tr
              key={simulation.id}
              className="border-b border-border last:border-b-0 hover:bg-muted/40"
            >
              <Td className="whitespace-nowrap text-muted-foreground">
                {formatDateTime(simulation.created_at)}
              </Td>
              <Td className="text-right font-mono tabular-nums">
                {simulation.active_users}
              </Td>
              <Td className="text-right font-mono tabular-nums">
                {formatMoney(simulation.base_cost, simulation.currency)}
              </Td>
              <Td className="text-right font-mono tabular-nums">
                {formatMoney(simulation.tax_amount, simulation.currency)}
                {/* La tasa es la congelada en la fila, no la de hoy (spec 02). */}
                <span className="ml-1.5 text-[0.6875rem] text-muted-foreground">
                  {formatRate(simulation.tax_rate)}
                </span>
              </Td>
              <Td className="text-right font-mono font-bold tabular-nums">
                {formatMoney(simulation.total_cost, simulation.currency)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2.5 font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase ${className}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function HistorySkeleton() {
  return (
    <Card
      className="gap-0 border border-border p-0 [--card-spacing:0px]"
      aria-hidden="true"
    >
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-4 border-b border-border px-4 py-3.5 last:border-b-0"
        >
          <Skeleton className="h-2.5 w-[30%] rounded-sm" />
          <Skeleton className="h-2.5 w-[15%] rounded-sm" />
        </div>
      ))}
    </Card>
  );
}
