import { useNavigate } from "react-router-dom";

import BackLink from "../components/BackLink";
import CustomerForm from "../components/CustomerForm";

/** Vista de alta de cliente (spec 04): envuelve `CustomerForm` con navegación de vuelta al índice. */
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
