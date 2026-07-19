import { LoaderCircle, TriangleAlert } from "lucide-react";

import {
  CURRENCIES,
  useCurrency,
  type Currency,
} from "../context/CurrencyContext";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/** Selector de divisa global (spec 04): vive en la cabecera, se ve en las tres vistas. */
export default function CurrencySelector() {
  const { currency, setCurrency, status, error, retry } = useCurrency();

  return (
    <div className="flex items-center gap-2">
      {(status === "error" || status === "retrying") && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs"
        >
          {status === "retrying" ? (
            <>
              <LoaderCircle className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
              <span className="hidden text-muted-foreground sm:inline">
                Reintentando…
              </span>
            </>
          ) : (
            <>
              <TriangleAlert className="size-3.5 shrink-0 text-destructive" />
              <span
                className="hidden text-destructive sm:inline"
                title={error ?? undefined}
              >
                Sin tipos de cambio, mostrando EUR
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={retry}
                className="h-6 px-1.5 text-xs text-destructive hover:text-destructive"
              >
                Reintentar
              </Button>
            </>
          )}
        </div>
      )}

      <Select
        value={currency}
        onValueChange={(value) => setCurrency(value as Currency)}
        disabled={status !== "success"}
      >
        <SelectTrigger
          size="sm"
          aria-label="Divisa"
          className="w-[5.25rem] font-mono text-xs"
        >
          {status === "loading" ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <LoaderCircle className="size-3.5 animate-spin" />
              EUR
            </span>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((code) => (
            <SelectItem key={code} value={code} className="font-mono text-xs">
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
