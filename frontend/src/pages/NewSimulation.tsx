import { Link, useParams } from "react-router-dom";

import BackLink from "../components/BackLink";
import StatePanel from "../components/StatePanel";
import { Button } from "../components/ui/button";

/**
 * Stub de la ruta `/customers/:id/simulate` (vista 3 de la spec 04), que se
 * construye en la sesión 9. Existe ya porque el estado vacío del historial
 * ofrece "crear la primera simulación": sin esta ruta, el comodín del router
 * mandaría al índice sin explicación, que es peor que una página honesta.
 */
export default function NewSimulation() {
  const { id } = useParams();

  return (
    <section className="grid gap-3.5">
      <BackLink />
      <StatePanel
        title="Simulador en construcción"
        description="El formulario con el slider de usuarios y la proyección de factura en vivo llega en la sesión 9."
      >
        <Button asChild variant="outline" className="mt-2.5">
          <Link to={`/customers/${id}`}>Volver a la ficha</Link>
        </Button>
      </StatePanel>
    </section>
  );
}
