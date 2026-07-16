import { useParams } from "react-router-dom";

import BackLink from "../components/BackLink";

/** Ruta preparada para la sesión 8: card de cliente + historial de simulaciones. */
export default function CustomerDetail() {
  const { id } = useParams();

  return (
    <section className="grid max-w-[34rem] justify-items-start gap-2">
      <span className="border-l-2 border-destructive pl-2 font-mono text-xs font-medium text-destructive">
        Ficha nº {id}
      </span>
      <h1 className="m-0 mt-1 text-2xl font-bold tracking-[-0.02em]">
        Detalle del cliente
      </h1>
      <p className="m-0 text-sm leading-normal text-muted-foreground">
        Esta vista se construye en la sesión 8: datos del cliente, historial de
        simulaciones y selector de divisa.
      </p>
      <div className="mt-1.5">
        <BackLink />
      </div>
    </section>
  );
}
