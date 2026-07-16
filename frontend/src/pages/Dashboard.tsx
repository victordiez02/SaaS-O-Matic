import { useState } from "react";
import { Link } from "react-router-dom";

import CustomerCard from "../components/CustomerCard";
import CustomerCardSkeleton from "../components/CustomerCardSkeleton";
import SearchBar from "../components/SearchBar";
import StatePanel from "../components/StatePanel";
import {
  useCustomerSearch,
  type SearchStatus,
} from "../hooks/useCustomerSearch";
import { Button } from "../components/ui/button";

const SKELETON_COUNT = 4;

export default function Dashboard() {
  const [term, setTerm] = useState("");
  const { customers, total, status, error, retry } = useCustomerSearch(term);

  return (
    <section className="grid gap-3.5">
      <SearchBar value={term} onChange={setTerm} />
      <p
        className="m-0 mb-1 font-mono text-xs tracking-[0.01em] text-muted-foreground"
        role="status"
      >
        <StatusLine status={status} term={term} total={total} />
      </p>

      {status === "loading" && (
        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <li key={index}>
              <CustomerCardSkeleton />
            </li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <StatePanel
          title="El índice no responde"
          description="No se pudo contactar con el backend. Comprueba que está levantado y vuelve a intentarlo."
        >
          {error && (
            <p className="m-0 font-mono text-xs text-destructive">{error}</p>
          )}
          <Button type="button" onClick={retry} className="mt-2.5">
            Reintentar
          </Button>
        </StatePanel>
      )}

      {status === "success" &&
        (customers.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
            {customers.map((customer, index) => (
              <li
                key={customer.id}
                className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-150"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CustomerCard customer={customer} term={term} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState term={term} />
        ))}
    </section>
  );
}

/** Línea viva bajo el buscador: qué hay en el índice y qué ha devuelto la búsqueda. */
function StatusLine({
  status,
  term,
  total,
}: {
  status: SearchStatus;
  term: string;
  total: number;
}) {
  if (status === "loading") return <>Consultando el índice…</>;
  if (status === "error") return <>Sin conexión con el índice</>;
  if (term)
    return (
      <>
        «{term}» → {total} {total === 1 ? "ficha" : "fichas"}
      </>
    );
  return (
    <>
      {total} {total === 1 ? "ficha" : "fichas"} en el índice
    </>
  );
}

function EmptyState({ term }: { term: string }) {
  const searching = term.length > 0;
  return (
    <StatePanel
      title={searching ? `Sin resultados para «${term}»` : "El índice está vacío"}
      description={
        searching
          ? "Ninguna ficha coincide con ese nombre ni con ese identificador fiscal."
          : "Aquí aparecerán las fichas de los clientes que registres."
      }
    >
      <Button asChild className="mt-2.5">
        <Link to="/customers/new">
          {searching ? "Registrar cliente nuevo" : "Registrar el primer cliente"}
        </Link>
      </Button>
    </StatePanel>
  );
}
