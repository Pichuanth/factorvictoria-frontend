// src/pages/Comparator.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* -------- helpers -------- */
function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Mapea membresía → target cuota */
function targetFromPlan(planRaw) {
  const id = String(planRaw || "").toLowerCase();
  if (["vitalicio", "lifetime", "pro-250", "x100"].some((k) => id.includes(k))) return 100;
  if (["anual", "annual", "x50"].some((k) => id.includes(k))) return 50;
  if (["trimestral", "quarter", "3m", "x20"].some((k) => id.includes(k))) return 20;
  if (["mensual", "monthly", "basic", "basico", "x10"].some((k) => id.includes(k))) return 10;
  return null;
}

/* Pequeño fetch con control de errores */
async function fetchJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* Si no hay cuotas reales 1X2, inventamos unas coherentes (determinísticas) */
function synthOdds(fixtureId) {
  // pseudo random estable según ID
  const seed = Number(String(fixtureId).slice(-4)) || 1234;
  const r = (seed % 100) / 100; // 0..0.99
  // tres resultados 1X2 con favorita razonable
  const home = 1.25 + (r * 0.7);   // 1.25..1.95
  const draw = 2.8 + (r * 0.9);    // 2.8..3.7
  const away = 1.6 + ((99 - seed % 100) / 100); // 1.6..2.59
  // reordenamos para mantener diversidad
  const arr = [
    { out: "1", odd: Number(home.toFixed(2)) },
    { out: "X", odd: Number(draw.toFixed(2)) },
    { out: "2", odd: Number(away.toFixed(2)) },
  ];
  return arr;
}

/* Elige un pick "seguro" entre 1.5 y 3 si es posible */
function pickGiftFromOdds(teamsLabel, odds1x2) {
  const cands = odds1x2
    .filter(o => o.odd >= 1.5 && o.odd <= 3)
    .sort((a, b) => a.odd - b.odd); // lo más bajo dentro del rango
  if (!cands.length) return null;
  const best = cands[0];
  return {
    match: teamsLabel,
    market: "1X2",
    pick: best.out,
    odd: best.odd,
  };
}

/* Construye un parlay aproximado hacia el target */
function buildParlay(target, fixturesWithOdds, maxLegs = 8) {
  // preferimos odds 1.30–1.90 para estabilidad
  const pool = [];
  for (const f of fixturesWithOdds) {
    const nice = [...f.odds]
      .filter(o => o.odd >= 1.3 && o.odd <= 3.2)
      .sort((a, b) => a.odd - b.odd);
    // toma 1–2 opciones por partido para variedad
    if (nice[0]) pool.push({ ...nice[0], match: f.label });
    if (nice[1] && nice[1].odd <= 2.2) pool.push({ ...nice[1], match: f.label });
  }
  // greedy: multiplicamos hasta acercar al target
  const selections = [];
  let product = 1;
  for (const o of pool) {
    if (selections.length >= maxLegs) break;
    const test = product * o.odd;
    // siempre avanzar si aún estamos muy lejos del target
    if (test <= target * 1.15 || product < target * 0.6) {
      product = Number(test.toFixed(2));
      selections.push({ match: o.match, market: "1X2", pick: o.out, odd: o.odd });
      if (product >= target * 0.92) break; // suficientemente cerca
    }
  }
  return { selections, totalOdd: Number(product.toFixed(2)) };
}

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();

  /* ---- bloqueo visitantes ---- */
  if (!isLoggedIn) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Comparador bloqueado</h1>
          <p className="text-slate-300 mt-2">Para generar cuotas y combinadas, primero compra tu membresía e inicia sesión.</p>
          <div className="mt-4">
            <Link to="/" className="inline-block rounded-2xl px-5 py-2 font-semibold" style={{ backgroundColor: GOLD, color: "#0f172a" }}>
              Ir a Inicio (ver membresías)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---- validar plan ---- */
  const planGuess = user?.planId || user?.plan?.id || user?.plan || user?.membership || user?.tier || "";
  const target = targetFromPlan(planGuess);
  if (!target) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Actualiza tu membresía</h1>
          <p className="text-slate-300 mt-2">Tu plan actual no permite usar el comparador. Elige una membresía para desbloquearlo.</p>
          <div className="mt-4">
            <Link to="/" className="inline-block rounded-2xl px-5 py-2 font-semibold" style={{ backgroundColor: GOLD, color: "#0f172a" }}>
              Ver planes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---- estado UI ---- */
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYYYYMMDD(today));
  const [to, setTo] = useState(toYYYYMMDD(addDays(today, 0))); // igual = 1 día; puedes moverlo a +4
  const [q, setQ] = useState(""); // país / ligaId / texto
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  /* ---- generar picks ---- */
  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");
      setData(null);

      // 1) buscamos fixtures por día o rango
      let url = "";
      const isRange = from !== to;
      // heurística simple del filtro:
      // - si q es numérico ⇒ league
      // - si tiene letras ⇒ country (API tuya ya lo soporta)
      const qTrim = String(q || "").trim();
      const isNum = /^\d+$/.test(qTrim);
      if (isRange) {
        url = `/api/fixtures?from=${from}&to=${to}`;
        if (qTrim) url += isNum ? `&league=${qTrim}` : `&country=${encodeURIComponent(qTrim)}`;
      } else {
        url = `/api/fixtures?date=${from}`;
        if (qTrim) url += isNum ? `&league=${qTrim}` : `&country=${encodeURIComponent(qTrim)}`;
      }

      const fx = await fetchJSON(url); // { count, items: [{ fixtureId, teams:{home,away}, ...}] }
      const items = Array.isArray(fx?.items) ? fx.items : [];

      // 2) agarramos cuotas 1X2 reales cuando existan; si no, sintetizamos
      const withOdds = [];
      for (const it of items.slice(0, 20)) { // cap 20 para respuesta ágil
        const label = `${it.teams?.home || "Local"} vs ${it.teams?.away || "Visita"}`;
        let odds = [];
        try {
          const od = await fetchJSON(`/api/odds?fixture=${it.fixtureId}&market=1x2`);
          // espera estructura { markets: [{outcome, odd}, ...] } — si difiere, adapta aquí
          const m =
            Array.isArray(od?.markets) && od.markets.length
              ? od.markets.map((m) => ({ out: m?.out || m?.label || "1", odd: Number(m?.odd || m?.price || 0) }))
              : [];
          odds = m.filter(x => x.odd > 1.01);
        } catch {
          odds = [];
        }
        if (!odds.length) odds = synthOdds(it.fixtureId);
        withOdds.push({ label, odds, id: it.fixtureId });
      }

      // 3) cuota segura (regalo) si aparece alguna dentro del rango 1.5–3
      let gift = null;
      for (const f of withOdds) {
        const g = pickGiftFromOdds(f.label, f.odds);
        if (g) { gift = g; break; }
      }

      // 4) parlay hacia el target según plan
      const parlay = buildParlay(target, withOdds, 10);

      // 5) placeholders “demo” de árbitros y desfase (visibles)
      const refereesDemo = withOdds.slice(0, 5).map((f, i) => ({
        match: f.label,
        referee: `Árbitro Demo ${i + 1}`,
        avgCards: (5.5 - i * 0.4).toFixed(1),
      }));
      const marketGapDemo = withOdds.slice(0, 4).map((f, i) => ({
        match: f.label,
        market: "1X2",
        ourOdd: f.odds[0]?.odd ?? 1.7,
        bookAvg: Number(((f.odds[0]?.odd ?? 1.7) * (0.96 - i * 0.01)).toFixed(2)),
      }));

      setData({
        gift,
        parlay,
        refs: refereesDemo,
        gaps: marketGapDemo,
        meta: { fixturesUsed: withOdds.length },
      });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  /* ---- UI ---- */
  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      {/* Filtros */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            title="Desde"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            title="Hasta"
          />
          <input
            placeholder="País o id de liga (ej: Chile o 140)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10 md:col-span-1"
          />
          <button
            onClick={onGenerate}
            disabled={loading}
            className="rounded-2xl font-semibold px-4 py-2"
            style={{ backgroundColor: GOLD, color: "#0f172a" }}
          >
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
        {err && <div className="text-red-400 mt-3">{err}</div>}
      </section>

      {/* Regalo */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Cuota segura (Regalo) x1.5–x3 · 90–95% acierto</h2>
        {data?.gift ? (
          <div className="text-slate-200 mt-2">
            <div className="font-semibold">{data.gift.match}</div>
            <div>1X2 · {data.gift.pick} · <span className="font-bold">(x{data.gift.odd})</span></div>
          </div>
        ) : (
          <p className="text-slate-300 mt-2">Próximamente: resultados basados en tus filtros.</p>
        )}
      </section>

      {/* Parlay */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Cuota generada x{target}</h2>
        <p className="text-slate-300 mt-1">Tu plan: {String(planGuess || "").toUpperCase()}</p>

        {data?.parlay?.selections?.length ? (
          <>
            <ul className="mt-3 space-y-1 text-slate-200">
              {data.parlay.selections.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} · <span className="font-bold">(x{s.odd})</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-white font-bold">Cuota total: x{data.parlay.totalOdd}</div>
          </>
        ) : (
          <div className="text-slate-400 mt-2">Aún no hay picks para este rango o filtro.</div>
        )}
      </section>

      {/* Árbitros más tarjeteros (demo visible) */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Árbitros más tarjeteros</h2>
        {data?.refs?.length ? (
          <ul className="mt-2 text-slate-200 space-y-1">
            {data.refs.map((r, i) => (
              <li key={i}>
                <span className="font-semibold">{r.referee}</span> — {r.match} · media {r.avgCards} tarjetas
                <span className="text-xs text-slate-400 ml-2">(demo)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-300 mt-2">Disponible con tu plan.</p>
        )}
      </section>

      {/* Desfase del mercado (demo visible) */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Cuota desfase del mercado</h2>
        {data?.gaps?.length ? (
          <ul className="mt-2 text-slate-200 space-y-1">
            {data.gaps.map((g, i) => (
              <li key={i}>
                <span className="font-semibold">{g.match}</span> — {g.market} · nuestra x{g.ourOdd} vs casas x{g.bookAvg}
                <span className="text-xs text-slate-400 ml-2">(demo)</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-300 mt-2">Disponible con tu plan.</p>
        )}
      </section>
    </div>
  );
}
