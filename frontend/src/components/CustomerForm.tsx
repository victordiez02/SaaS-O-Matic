import { useId, useState, type FormEvent } from "react";

import { ApiError } from "../api/client";
import { createCustomer } from "../api/customers";
import type { Customer, CustomerCreate, Plan } from "../api/types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type SubmitState = "idle" | "loading" | "error";

const EMPTY: CustomerCreate = {
  company_name: "",
  tax_id: "",
  email: "",
  country: "ES",
  plan: "basic",
};

const PLANS: Plan[] = ["basic", "pro", "enterprise"];

/** Alta de cliente corporativo (spec 02): valida y persiste vía `POST /customers`. */
export default function CustomerForm({
  onCreated,
}: {
  onCreated: (customer: Customer) => void;
}) {
  const [form, setForm] = useState<CustomerCreate>(EMPTY);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const ids = {
    companyName: useId(),
    taxId: useId(),
    email: useId(),
    country: useId(),
    plan: useId(),
  };

  function update<K extends keyof CustomerCreate>(
    key: K,
    value: CustomerCreate[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    setError(null);
    try {
      const created = await createCustomer(form);
      setForm(EMPTY);
      onCreated(created);
    } catch (err) {
      setState("error");
      setError(
        err instanceof ApiError
          ? err.message
          : "Error de red. ¿Backend levantado?",
      );
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <Label htmlFor={ids.companyName}>Nombre de empresa</Label>
        <Input
          id={ids.companyName}
          value={form.company_name}
          onChange={(e) => update("company_name", e.target.value)}
          required
          placeholder="Acme Ibérica S.L."
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={ids.taxId}>Identificador fiscal (DNI/NIF/CIF)</Label>
        <Input
          id={ids.taxId}
          value={form.tax_id}
          onChange={(e) => update("tax_id", e.target.value)}
          required
          placeholder="B12345674"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={ids.email}>Email de contacto</Label>
        <Input
          id={ids.email}
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
          placeholder="cfo@acme.es"
        />
      </div>

      <div className="flex gap-4">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={ids.country}>País (ISO)</Label>
          <Input
            id={ids.country}
            value={form.country}
            onChange={(e) => update("country", e.target.value.toUpperCase())}
            required
            maxLength={2}
            placeholder="ES"
          />
        </div>

        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={ids.plan}>Plan</Label>
          <Select
            value={form.plan}
            onValueChange={(value) => update("plan", value as Plan)}
          >
            <SelectTrigger id={ids.plan} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={state === "loading"} className="mt-1">
        {state === "loading" ? "Guardando…" : "Registrar cliente"}
      </Button>

      {state === "error" && error && (
        <p className="m-0 text-sm text-destructive">{error}</p>
      )}
    </form>
  );
}
