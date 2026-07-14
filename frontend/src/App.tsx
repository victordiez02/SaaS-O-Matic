import { useEffect, useState, type CSSProperties } from "react";
import { fetchHealth, fetchPing, type HealthResponse } from "./api/client";

type Status = "loading" | "error" | "success";

export default function App() {
  const [status, setStatus] = useState<Status>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [pings, setPings] = useState<number | null>(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => {
        setHealth(data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handlePing() {
    try {
      const data = await fetchPing();
      setPings(data.total_pings);
    } catch {
      setPings(null);
    }
  }

  const backendOk = status === "success";

  return (
    <main style={styles.card}>
      <h1 style={styles.title}>SaaS-O-Matic</h1>
      <p style={styles.subtitle}>
        Placeholder de infraestructura — comprobación de servicios
      </p>

      <ul style={styles.list}>
        <ServiceRow label="Frontend (React + Vite)" ok={true} />
        <ServiceRow
          label="Backend (FastAPI)"
          ok={backendOk}
          detail={status === "loading" ? "comprobando…" : undefined}
        />
        <ServiceRow
          label="Base de datos (SQLite)"
          ok={backendOk && health?.database === "ok"}
          detail={status === "loading" ? "comprobando…" : undefined}
        />
      </ul>

      {status === "error" && (
        <p style={styles.error}>
          No se pudo contactar con el backend. ¿Está levantado en{" "}
          <code>/api</code>?
        </p>
      )}

      <button style={styles.button} onClick={handlePing} disabled={!backendOk}>
        Probar persistencia (POST ping)
      </button>
      {pings !== null && (
        <p style={styles.pings}>
          Registros guardados en SQLite: <strong>{pings}</strong>
        </p>
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
    width: "min(440px, 90vw)",
    padding: "2rem",
    borderRadius: "16px",
    background: "#1e293b",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
  },
  title: { margin: "0 0 0.25rem", fontSize: "1.6rem" },
  subtitle: { margin: "0 0 1.5rem", color: "#94a3b8", fontSize: "0.9rem" },
  list: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 1.5rem",
    display: "grid",
    gap: "0.75rem",
  },
  row: { display: "flex", alignItems: "center", gap: "0.6rem" },
  dot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  detail: { marginLeft: "auto", color: "#94a3b8", fontSize: "0.8rem" },
  error: { color: "#fca5a5", fontSize: "0.85rem" },
  button: {
    width: "100%",
    padding: "0.7rem",
    borderRadius: "10px",
    border: "none",
    background: "#3b82f6",
    color: "white",
    fontSize: "0.95rem",
    cursor: "pointer",
  },
  pings: { textAlign: "center", marginBottom: 0, color: "#cbd5e1" },
};
