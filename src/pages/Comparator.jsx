import { useEffect, useState, useMemo } from "react";
import TierTeasers from "../components/TierTeasers.jsx";
import ConfidencePick from "../components/ConfidencePick.jsx";
import "../index.css";

// API base: .env (VITE_API_BASE) o localhost
const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return isNaN(d) ? "-" : d.toLocaleString();
  } catch { return "-"; }
}
function fmtNum(n) {
  const v = Number(n);
  return isNaN(v) ? "-" : v.toFixed(2);
}

export default function Comparator() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [text, setText] = useState("");
  const [book, setBook] = useState("");

  // teaser
  const currentPlan = "x10";
  const upgradeOptions = [
    { tier: "x10",  price: "$19.990" },
    { tier: "x20",  price: "$44.990",  locked: true },
    { tier: "x50",  price: "$99.990",  locked: true },
    { tier: "x100", price: "$250.000", locked: true },
  ];
  const onUpgrade = (tier) => alert(`Aquí redirigimos a checkout del plan ${tier}`);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch(`${API_BASE}/api/odds?limit=200`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(String(e?.message || e));
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const books = useMemo(() => {
    const s = new Set(rows.map(r => r.bookmaker).filter(Boolean));
    return ["", ...Array.from(s).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const t = text.trim().toLowerCase();
    return rows.filter(r => {
      const okText =
        !t ||
        r.home?.toLowerCase().includes(t) ||
        r.away?.toLowerCase().includes(t) ||
        r.market?.toLowerCase().includes(t) ||
        r.selection?.toLowerCase().includes(t);
      const okBook = !book || r.bookmaker === book;
      return okText && okBook;
    });
  }, [rows, text, book]);

  return (
    <div style={{ padding: 16 }}>
      <h1>Comparador de Cuotas</h1>

      <div className="controls">
        <input
          placeholder="Buscar (equipo/mercado/selección)…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select value={book} onChange={(e) => setBook(e.target.value)}>
          {books.map((b) => (
            <option key={b} value={b}>{b || "Todos los bookmakers"}</option>
          ))}
        </select>
        <span className="muted">
          {loading ? "Cargando…" : `${filtered.length} filas`}
        </span>
      </div>

      {/* Teaser de planes */}
      <TierTeasers current={currentPlan} options={upgradeOptions} onUpgrade={onUpgrade} />

      {/* Cuota de confianza */}
      <ConfidencePick apiBase={API_BASE} defaultBook="" markets="1X2" />

      {err && <div className="error">Error: {err}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Local</th>
              <th>Visita</th>
              <th>Bookmaker</th>
              <th>Mercado</th>
              <th>Selección</th>
              <th className="right">Cuota</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="muted" colSpan={8}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="muted" colSpan={8}>Sin datos.</td></tr>
            ) : (
              filtered.map((r, i) => (
                <tr key={(r.match_id ?? "m") + "-" + i}>
                  <td>{fmtDate(r.start_time)}</td>
                  <td>{r.home}</td>
                  <td>{r.away}</td>
                  <td>{r.bookmaker}</td>
                  <td>{r.market}</td>
                  <td>{r.selection}</td>
                  <td className="right">{fmtNum(r.price)}</td>
                  <td>{fmtDate(r.last_updated)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
