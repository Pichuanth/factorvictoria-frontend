// src/components/ConfidencePick.jsx
import { useEffect, useMemo, useState } from "react";

/**
 * Card "Cuota de confianza"
 * - Muestra un formulario pequeño para elegir casa (bookmaker), objetivo (x10/x20/x50/x100),
 *   tolerancia (por defecto 10%), y longitud de combinada.
 * - Llama a /api/parlays del backend y pinta la mejor combinación encontrada.
 *
 * Props:
 *  - apiBase      : string (ej. "http://localhost:3001")
 *  - defaultBook  : string (opcional, ej. "Bet365")
 *  - markets      : string (opcional, hoy no se usa; reservado para más adelante)
 */
export default function ConfidencePick({
  apiBase,
  defaultBook = "",
  markets = "1X2",
}) {
  const [books, setBooks] = useState([]);
  const [book, setBook] = useState(defaultBook);
  const [target, setTarget] = useState(10);      // 10 / 20 / 50 / 100
  const [tol, setTol] = useState(0.10);          // 10% por defecto
  const [minLegs, setMinLegs] = useState(3);
  const [maxLegs, setMaxLegs] = useState(6);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);        // respuesta de /api/parlays

  // Cargar lista de casas de apuestas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${apiBase}/api/bookmakers`);
        const list = (await r.json()) ?? [];
        if (!cancelled) {
          setBooks(list);
          // si no viene defaultBook, toma la primera
          if (!defaultBook && list.length) setBook(list[0].name);
        }
      } catch {
        if (!cancelled) setBooks([]);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, defaultBook]);

  // Llamar al backend para construir la combinada
  async function handleGenerate() {
    if (!book) {
      setErr("Selecciona una casa de apuestas.");
      return;
    }
    setErr("");
    setLoading(true);
    setData(null);
    try {
      const qs = new URLSearchParams({
        bookmaker: book,
        target: String(target),
        tol: String(tol),
        minLegs: String(minLegs),
        maxLegs: String(maxLegs),
      });
      const r = await fetch(`${apiBase}/api/parlays?${qs.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const header = useMemo(() => {
    if (!data) return null;
    const ok = data.found && data.result;
    const prod = data.result?.product ?? null;
    const diff = data.result?.diffPercent ?? null;

    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          {ok ? "✅ Combinada encontrada" : "⚠️ Propuesta cercana"}
        </div>
        {prod != null && (
          <div className="muted" style={{ marginBottom: 6 }}>
            Objetivo x{data.target} | Resultado ≈ x{prod} | Desvío {diff}%
          </div>
        )}
      </div>
    );
  }, [data]);

  return (
    <div className="confidence" style={{
      margin: "12px 0",
      padding: 12,
      border: "1px solid #eee",
      borderRadius: 12,
      background: "#fafafa"
    }}>
      <h3 style={{ margin: "0 0 8px" }}>Cuota de confianza</h3>

      <div className="row" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={book} onChange={(e) => setBook(e.target.value)}>
          {books.map(b => (
            <option key={b.name} value={b.name}>{b.name}</option>
          ))}
        </select>

        <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
          {[10, 20, 50, 100].map(x => (
            <option key={x} value={x}>Objetivo x{x}</option>
          ))}
        </select>

        <select value={tol} onChange={(e) => setTol(Number(e.target.value))}>
          <option value={0.07}>Tolerancia ±7%</option>
          <option value={0.10}>Tolerancia ±10%</option>
        </select>

        <label>
          Min legs:&nbsp;
          <input type="number" min={2} max={10} value={minLegs}
                 onChange={(e) => setMinLegs(Number(e.target.value))}
                 style={{ width: 60 }} />
        </label>

        <label>
          Max legs:&nbsp;
          <input type="number" min={minLegs} max={10} value={maxLegs}
                 onChange={(e) => setMaxLegs(Number(e.target.value))}
                 style={{ width: 60 }} />
        </label>

        <button onClick={handleGenerate} disabled={loading}>
          {loading ? "Buscando…" : "Generar"}
        </button>
      </div>

      {err && <div className="error" style={{ marginTop: 8 }}>Error: {err}</div>}

      {data && header}

      {data?.result?.legs?.length > 0 && (
        <ul className="legs" style={{ marginTop: 6, paddingLeft: 18 }}>
          {data.result.legs.map((l, i) => (
            <li key={l.match_id + "-" + i}>
              <strong>{l.home}</strong> vs <strong>{l.away}</strong> — {l.market}:
              <em> {l.selection}</em> @ <strong>{l.price}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
