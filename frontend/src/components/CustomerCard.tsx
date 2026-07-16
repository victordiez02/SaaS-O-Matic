import { Link } from "react-router-dom";

import type { Customer } from "../api/types";
import Highlighted from "./Highlighted";

/**
 * Ficha de cliente del índice. La clave fiscal (país + identificador) es la
 * card entera enlazada; por eso no usa el componente Card de shadcn (pensado
 * para contenedores no interactivos), sino sus mismas clases sobre el <Link>.
 */
export default function CustomerCard({
  customer,
  term,
}: {
  customer: Customer;
  term: string;
}) {
  return (
    <Link
      to={`/customers/${customer.id}`}
      className="grid h-full gap-1 rounded-xl border border-border bg-card px-[1.2rem] py-[1.1rem] text-inherit no-underline ring-1 ring-foreground/10 transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-destructive hover:shadow-[0_6px_16px_rgba(19,28,46,0.08)]"
    >
      <span className="mb-0.5 overflow-hidden border-l-2 border-destructive pl-2 font-mono text-xs font-medium text-nowrap text-ellipsis text-destructive tracking-[0.02em]">
        {customer.country} · <Highlighted text={customer.tax_id} term={term} />
      </span>
      <h2 className="m-0 text-[1.0625rem] leading-tight font-bold tracking-[-0.02em] break-words">
        <Highlighted text={customer.company_name} term={term} />
      </h2>
      <p className="m-0 text-[0.8125rem] break-words text-muted-foreground">
        {customer.email}
      </p>
      <span className="mt-2.5 border-t border-border pt-2.5 font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {customer.plan}
      </span>
    </Link>
  );
}
