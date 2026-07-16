import { Search } from "lucide-react";

import { Input } from "./ui/input";
import { Label } from "./ui/label";

/**
 * Buscador del índice: el campo es el producto de esta vista, así que ocupa el
 * lugar del héroe. Controlado desde fuera; el debounce vive en el hook.
 */
export default function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2.5">
      <Label
        htmlFor="customer-search"
        className="text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
      >
        Buscar por empresa o identificador fiscal
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[1.05rem] -translate-y-1/2 text-muted-foreground" />
        <Input
          id="customer-search"
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Acme Ibérica S.L.  ·  B12345674"
          autoComplete="off"
          autoFocus
          className="h-auto rounded-sm py-4 pr-4 pl-11 text-[1.0625rem] tracking-[-0.01em]"
        />
      </div>
    </div>
  );
}
