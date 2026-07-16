import { LoaderCircle, TriangleAlert } from "lucide-react";

import { CURRENCIES, useCurrency, type Currency } from "../context/CurrencyContext";
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
    <div className="flex items-center gap-1.5">
      {status === "error" && (
        // La app nunca se bloquea por la API externa: se avisa, se sigue en EUR
        // y se ofrece reintentar (spec 04).
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={retry}
          title={`Tipos de cambio no disponibles, mostrando EUR (${error}). Reintentar`}
          className="gap-1.5 text-destructive hover:text-destructive"
        >
          <TriangleAlert className="size-3.5" />
          <span className="hidden text-xs sm:inline">Reintentar tipos</span>
        </Button>
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
