import { Link, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import { getCustomer, listCustomerSimulations } from "../api/customers";
import BackLink from "../components/BackLink";
import CustomerDetailCard from "../components/CustomerDetailCard";
import CustomerCardSkeleton from "../components/CustomerCardSkeleton";
import SimulationHistory from "../components/SimulationHistory";
import StatePanel from "../components/StatePanel";
import { Button } from "../components/ui/button";
import { useResource } from "../hooks/useResource";

/** Vista 2 de la spec 04: ficha del cliente + historial de simulaciones */
export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = Number(id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return <CustomerNotFound />;
  }
  return <CustomerDetailView customerId={customerId} />;
}

function CustomerDetailView({ customerId }: { customerId: number }) {
  // Dos peticiones con estados independientes (spec 04): la ficha no espera al
  // historial. `getCustomer` y `listCustomerSimulations` son funciones estables
  // del módulo de API, así que el efecto solo se relanza si cambia el id.
  const customer = useResource(getCustomer, customerId);
  const history = useResource(listCustomerSimulations, customerId);

  const notFound =
    customer.error instanceof ApiError &&
    customer.error.code === "CUSTOMER_NOT_FOUND";

  return (
    <section className="grid gap-3.5">
      <BackLink />

      {customer.status === "loading" && <CustomerCardSkeleton />}

      {customer.status === "error" &&
        (notFound ? (
          <CustomerNotFound />
        ) : (
          <StatePanel
            title="No se pudo cargar la ficha"
            description="No hubo respuesta del backend. Comprueba que está levantado y vuelve a intentarlo."
          >
            {customer.error instanceof Error && (
              <p className="m-0 font-mono text-xs text-destructive">
                {customer.error.message}
              </p>
            )}
            <Button type="button" onClick={customer.retry} className="mt-2.5">
              Reintentar
            </Button>
          </StatePanel>
        ))}

      {customer.status === "success" && customer.data && (
        <>
          <CustomerDetailCard customer={customer.data} />
          {/* El historial solo se pinta con la ficha cargada: si el cliente no
              existe, su historial da el mismo 404 y repetir el aviso sobraría. */}
          <SimulationHistory history={history} customerId={customerId} />
        </>
      )}
    </section>
  );
}

/** 404 explícito: la ficha no está, y eso no es un fallo de la herramienta. */
function CustomerNotFound() {
  return (
    <StatePanel
      title="Cliente no encontrado"
      description="Esta ficha no existe en el índice. Puede que se haya borrado o que el enlace esté mal."
    >
      <Button asChild className="mt-2.5">
        <Link to="/">Volver al índice</Link>
      </Button>
    </StatePanel>
  );
}
