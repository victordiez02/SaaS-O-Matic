import { useEffect, useState, type CSSProperties } from "react";
import { searchCustomers } from "./api/customers";
import { fetchHealth } from "./api/health";
import type { Customer } from "./api/types";
import CustomerForm from "./components/CustomerForm";

type Status = "loading" | "error" | "success";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchHealth()
      .then(() => {
        setStatus("success");
        return searchCustomers();
      })
      .then((data) => setCustomers(data.items))
      .catch(() => setStatus("error"));
  }, []);

  const backendOk = status === "success";

  return (
    <main style={styles.card}>
      <h1 style={styles.title}>SaaS-O-Matic</h1>
      <p style={styles.subtitle}>Demo de alta de clientes — formulario · API · SQLite</p>

      <ul style={styles.list}>
        <ServiceRow label="Frontend (React + Vite)" ok={true} />
        <ServiceRow
          label="Backend (FastAPI)"
          ok={backendOk}
          detail={status === "loading" ? "comprobando…" : undefined}
        />
      </ul>

      {status === "error" && (
        <p style={styles.error}>
          No se pudo contactar con el backend. ¿Está levantado en <code>/api</code>?
        </p>
      )}

      {backendOk && (
        <>
          <h2 style={styles.section}>Nuevo cliente</h2>
          <CustomerForm onCreated={(c) => setCustomers((prev) => [c, ...prev])} />

          <h2 style={styles.section}>
            Clientes registrados <span style={styles.count}>({customers.length})</span>
          </h2>
          {customers.length === 0 ? (
            <p style={styles.empty}>Aún no hay clientes. Registra el primero arriba.</p>
          ) : (
            <ul style={styles.customerList}>
              {customers.map((c) => (
                <li key={c.id} style={styles.customerRow}>
                  <span style={styles.company}>{c.company_name}</span>
                  <span style={styles.meta}>
                    {c.tax_id} · {c.country} · {c.plan}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function ServiceRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <li style={styles.row}>
      <span style={{ ...styles.dot, background: ok ? "#22c55e" : "#ef4444" }} />
      <span>{label}</span>
      {detail && <span style={styles.detail}>{detail}</span>}
    </li>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    width: "min(480px, 92vw)",
    padding: "2rem",
    borderRadius: "16px",
    background: "#1e293b",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
  },
  title: { margin: "0 0 0.25rem", fontSize: "1.6rem" },
  subtitle: { margin: "0 0 1.5rem", color: "#94a3b8", fontSize: "0.9rem" },
  section: { margin: "1.8rem 0 0.9rem", fontSize: "1rem", color: "#e2e8f0" },
  count: { color: "#64748b", fontWeight: 400 },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gap: "0.75rem",
  },
  row: { display: "flex", alignItems: "center", gap: "0.6rem" },
  dot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  detail: { marginLeft: "auto", color: "#94a3b8", fontSize: "0.8rem" },
  error: { color: "#fca5a5", fontSize: "0.85rem" },
  empty: { color: "#94a3b8", fontSize: "0.85rem" },
  customerList: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" },
  customerRow: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    padding: "0.6rem 0.8rem",
    borderRadius: "8px",
    background: "#0f172a",
  },
  company: { fontSize: "0.9rem", color: "#e2e8f0" },
  meta: { fontSize: "0.75rem", color: "#64748b" },
};
