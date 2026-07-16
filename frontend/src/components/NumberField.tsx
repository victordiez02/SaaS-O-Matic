import { Input } from "./ui/input";
import { Label } from "./ui/label";

/** Entero ≥ 0 a partir de lo tecleado; el campo vacío cuenta como 0. */
export function toCount(raw: string): number {
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Mensaje del 422 junto a su campo, usando el array `errors` del backend (F14). */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="m-0 text-xs text-destructive">{message}</p>;
}

/** Campo numérico entero con su etiqueta y el error del backend debajo. */
export default function NumberField({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(toCount(e.target.value))}
        className="font-mono tabular-nums"
      />
      <FieldError message={error} />
    </div>
  );
}
