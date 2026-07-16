import type { ReactNode } from "react";

import type { Customer } from "../api/types";
import { formatDateTime } from "../utils/format";
import FiscalKey from "./FiscalKey";
import PlanTag from "./PlanTag";
import { Card } from "./ui/card";

/** Ficha completa del cliente (spec 04) */
export default function CustomerDetailCard({
  customer,
}: {
  customer: Customer;
}) {
  return (
    <Card className="gap-4 border border-border px-[1.4rem] py-[1.3rem]">
      <div className="grid gap-1">
        <FiscalKey customer={customer} className="justify-self-start" />
        <h1 className="m-0 text-2xl leading-tight font-bold tracking-[-0.02em] break-words">
          {customer.company_name}
        </h1>
        <a
          href={`mailto:${customer.email}`}
          className="justify-self-start text-sm break-all text-muted-foreground underline-offset-2 hover:text-destructive"
        >
          {customer.email}
        </a>
      </div>

      {/* País e identificador NO se repiten aquí: ya los lleva la clave fiscal
          de arriba, que es donde se leen juntos. */}
      <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3.5 border-t border-border pt-3.5">
        <Field label="Plan">
          <PlanTag plan={customer.plan} className="text-sm text-foreground" />
        </Field>
        <Field label="Alta">
          <span className="text-sm">{formatDateTime(customer.created_at)}</span>
        </Field>
      </dl>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="m-0">{children}</dd>
    </div>
  );
}
