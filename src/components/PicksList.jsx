import { useEffect, useState } from "react";

const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

export default function PicksList() {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/picks/demo`);
        const data = await r.json();
        setPicks(Array.isArray(data.picks) ? data.picks : []);
      } catch (e) {
        console.error(e);
        setPicks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Qué apostar</h2>
      {loading && <p style={{ color: "#888" }}>Cargando…</p>}
      {!loading && picks.length === 0 && <p style={{ color: "#888" }}>Sin sugerencias.</p>}
      <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
        {picks.map((p, i) => (
          <li key={i} style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{p.match}</div>
            <div>{p.market}: <strong>{p.selection}</strong></div>
            <div>Cuota: <strong>{p.odds}</strong> · Prob: <strong>{Math.round(p.prob * 100)}%</strong></div>
            <div style={{ color: "#666", fontSize: 14 }}>Motivo: {p.reason}</div>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
        Nota: si la suma de cuotas no llega a x10, ajustamos automáticamente con otra selección segura para no quedar cortos.
      </p>
    </div>
  );
}
