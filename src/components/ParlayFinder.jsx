// src/components/ParlayFinder.jsx
import { useEffect, useState } from "react";

const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

export default function ParlayFinder() {
  const [books, setBooks] = useState([]);
  const [book, setBook] = useState("");
  const [target, setTarget] = useState(10);
  const [tol, setTol] = useState(0.07);     // 7% por defecto
  const [minLegs, setMinLegs] = useState(3);
  const [maxLegs, setMaxLegs] = useState(6);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/bookmakers`);
        const data = await r.json();
        setBooks(data.map(d => d.name));
        setBook(prev => prev || (data[0]?.name || ""));
      } catch {}
    })();
  }, []);

  async function search() {
    try {
      setLoading(true);
      setErr("");
      setResult(null);
      const url = new URL(`${API_BASE}/api/parlays`);
      url.searchParams.set("bookmaker", book);
      url.searchParams.set("target", String(target));
      url.searchParams.set("tol", String(tol));
      url.searchParams.set("minLegs", String(minLegs));
      url.searchParams.set("maxLegs", String(maxLegs));
      // puedes agregar minPrice/maxPrice/horizonHours si quieres
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (!data.found || !data.result) {
        setErr("No se encontró una combinación en el rango. Prueba con otra casa u objetivos.");
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ margin: "16px 0", padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <strong>Constructor de Parlays</strong>

        <select value={book} onChange={e => setBook(e.target.value)}>
          {books.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <div style={{ display: "flex", gap: 6 }}>
          {[10, 20, 50, 100].map(t => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className="btn"
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: t === target ? "2px solid #111827" : "1px solid #e5e7eb",
                background: t === target ? "#111827" : "#fff",
                color: t === target ? "#fff" : "#111827",
                cursor: "pointer"
              }}
            >
              x{t}
            </button>
          ))}
        </div>

        <span className="muted">Tolerancia</span>
        <select value={tol} onChange={e => setTol(Number(e.target.value))}>
          {[0.05, 0.07, 0.1, 0.12].map(v => (
            <option key={v} value={v}>±{Math.round(v*100)}%</option>
          ))}
        </select>

        <span className="muted">Legs</span>
        <input style={{ width: 50 }} type="number" min={2} max={10} value={minLegs} onChange={e => setMinLegs(Number(e.target.value))} />
        <span>–</span>
        <input style={{ width: 50 }} type="number" min={minLegs} max={10} value={maxLegs} onChange={e => setMaxLegs(Number(e.target.value))} />

        <button onClick={search} disabled={loading} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid #e5e7eb", cursor: "pointer" }}>
          {loading ? "Buscando…" : "Buscar combinación"}
        </button>
      </div>

      {err && <div className="error" style={{ marginTop: 10 }}>Error: {err}</div>}

      {result && result.result && (
        <div style={{ marginTop: 12 }}>
          <div className="muted">
            {result.bookmaker} • objetivo x{result.target} • logrado x{result.result.product} • diferencia {result.result.diffPercent}%
          </div>
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table>
              <thead>
                <tr>
                  <th>Partido</th>
                  <th>Mercado</th>
                  <th>Selección</th>
                  <th className="right">Cuota</th>
                  <th>Inicio</th>
                </tr>
              </thead>
              <tbody>
                {result.result.legs.map((l, i) => (
                  <tr key={l.match_id + "-" + i}>
                    <td>{l.home} vs {l.away}</td>
                    <td>{l.market}</td>
                    <td>{l.selection}</td>
                    <td className="right">{l.price.toFixed(2)}</td>
                    <td>{new Date(l.start_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
