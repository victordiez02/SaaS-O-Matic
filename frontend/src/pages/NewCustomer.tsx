import { useNavigate } from "react-router-dom";

import BackLink from "../components/BackLink";
import CustomerForm from "../components/CustomerForm";

/**
 * Página fina sobre el `CustomerForm` que ya existía: le da destino al CTA del
 * estado vacío del índice. El formulario no se toca en esta sesión.
 */
export default function NewCustomer() {
  const navigate = useNavigate();

  return (
    <section className="grid max-w-[34rem] gap-2">
      <BackLink />
      <h1 className="m-0 mt-1.5 text-2xl font-bold tracking-[-0.02em]">
        Nuevo cliente
      </h1>
      <p className="m-0 mb-4 text-sm leading-normal text-muted-foreground">
        El identificador fiscal de los clientes españoles se valida con el
        algoritmo oficial al guardar.
      </p>
      {/* Al alta, de vuelta al índice: la ficha nueva aparece ya en la rejilla. */}
      <CustomerForm onCreated={() => navigate("/")} />
    </section>
  );
}
