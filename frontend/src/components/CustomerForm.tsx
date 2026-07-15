import { useState, type CSSProperties, type FormEvent } from "react";
import {
  createCustomer,
  ApiError,
  type Customer,
  type CustomerCreate,
  type Plan,
} from "../api/client";

type SubmitState = "idle" | "loading" | "error" | "success";

const EMPTY: CustomerCreate = {
  company_name: "",
  tax_id: "",
  email: "",
  country: "ES",
  plan: "basic",
};

const PLANS: Plan[] = ["basic", "pro", "enterprise"];

// DEMO: alta de cliente para verificar el flujo formulario → API → SQLite.
// Sin validación fiscal todavía; eso llegará en la capa validators/ del backend.
export default function CustomerForm({
  onCreated,
}: {
  onCreated: (customer: Customer) => void;
}) {
  const [form, setForm] = useState<CustomerCreate>(EMPTY);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CustomerCreate>(key: K, value: CustomerCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setState("loading");
    setError(null);
    try {
      const created = await createCustomer(form);
      setState("success");
      setForm(EMPTY);
      onCreated(created);
    } catch (err) {
      setState("error");
      setError(err instanceof ApiError ? err.message : "Error de red. ¿Backend levantado?");
    }
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <Field label="Nombre de empresa">
        <input
          style={styles.input}
          value={form.company_name}
          onChange={(e) => update("company_name", e.target.value)}
          required
          placeholder="Acme Ibérica S.L."
        />
      </Field>

      <Field label="Identificador fiscal (DNI/NIF/CIF)">
        <input
          style={styles.input}
          value={form.tax_id}
          onChange={(e) => update("tax_id", e.target.value)}
          required
          placeholder="B12345674"
        />
      </Field>

      <Field label="Email de contacto">
        <input
          style={styles.input}
          type="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          required
          placeholder="cfo@acme.es"
        />
      </Field>

      <div style={styles.row}>
        <Field label="País (ISO)">
          <input
            style={styles.input}
            value={form.country}
            onChange={(e) => update("country", e.target.value.toUpperCase())}
            required
            maxLength={2}
            placeholder="ES"
          />
        </Field>

        <Field label="Plan">
          <select
            style={styles.input}
            value={form.plan}
            onChange={(e) => update("plan", e.target.value as Plan)}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <button style={styles.button} type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Guardando…" : "Registrar cliente"}
      </button>

      {state === "error" && error && <p style={styles.error}>{error}</p>}
      {state === "success" && (
        <p style={styles.success}>Cliente registrado y guardado en SQLite ✓</p>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
    </label>
  );
}

const styles: Record<string, CSSProperties> = {
  form: { display: "grid", gap: "0.9rem" },
  field: { display: "grid", gap: "0.3rem" },
  row: { display: "flex", gap: "0.9rem" },
  label: { fontSize: "0.8rem", color: "#94a3b8" },
  input: {
    padding: "0.55rem 0.7rem",
    borderRadius: "8px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "#e2e8f0",
    fontSize: "0.9rem",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    marginTop: "0.3rem",
    padding: "0.7rem",
    borderRadius: "10px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  error: { color: "#fca5a5", fontSize: "0.85rem", margin: 0 },
  success: { color: "#86efac", fontSize: "0.85rem", margin: 0 },
};
