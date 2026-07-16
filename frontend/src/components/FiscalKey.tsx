import { cn } from "@/lib/utils";
import type { Customer } from "../api/types";
import Highlighted from "./Highlighted";

/** Clave fiscal (`ES · B12345674`) como una unidad */
export default function FiscalKey({
  customer,
  term = "",
  className,
}: {
  customer: Customer;
  term?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "border-l-2 border-destructive pl-2 font-mono text-xs font-medium text-destructive tracking-[0.02em]",
        className,
      )}
    >
      {customer.country} · <Highlighted text={customer.tax_id} term={term} />
    </span>
  );
}
