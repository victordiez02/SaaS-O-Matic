import { cn } from "@/lib/utils";
import { useCurrency } from "../context/CurrencyContext";
import { formatRate } from "../utils/format";
import { Card } from "./ui/card";

/** Desglose de factura. Mismo formato para el preview y para lo que devuelve el backend. */
export default function CostBreakdown({
  baseCost,
  taxRate,
  taxAmount,
  totalCost,
  label,
  className,
}: {
  baseCost: string | number;
  taxRate: string | number;
  taxAmount: string | number;
  totalCost: string | number;
  /** Encabezado que dice de dónde sale la cifra: proyección o dato guardado. */
  label: string;
  className?: string;
}) {
  const { formatAmount } = useCurrency();

  return (
    <Card className={cn("gap-3 border border-border px-[1.2rem] py-[1.1rem]", className)}>
      <span className="border-l-2 border-destructive pl-2 font-mono text-xs font-medium tracking-[0.02em] text-destructive">
        {label}
      </span>

      <dl className="m-0 grid gap-2">
        <Row label="Coste base" value={formatAmount(baseCost)} />
        <Row
          label={`Impuesto (${formatRate(taxRate)})`}
          value={formatAmount(taxAmount)}
        />
        <div className="mt-1 grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-border pt-2.5">
          <dt className="font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            Total mensual
          </dt>
          <dd className="m-0 font-mono text-2xl font-bold tabular-nums">
            {formatAmount(totalCost)}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="m-0 font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}
