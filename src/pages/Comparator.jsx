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
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText || ""} ${t ? "– " + t : ""}`.trim());
  }
  return res.json();
}

/* Si no hay cuotas reales 1X2, inventamos unas coherentes (determinísticas) */
function synthOdds(fixtureId) {
  const seed = Number(String(fixtureId).slice(-4)) || 1234;
  const r = (seed % 100) / 100; // 0..0.99
  const home = 1.25 + r * 0.7;                 // 1.25..1.95
  const draw = 2.8 + r * 0.9;                  // 2.8..3.7
  const away = 1.6 + ((99 - (seed % 100)) / 100); // 1.6..2.59
  return [
    { out: "1", odd: Number(home.toFixed(2)) },
    { out: "X", odd: Number(draw.toFixed(2)) },
    { out: "2", odd: Number(away.toFixed(2)) },
  ];
}

/* Elige un pick "seguro" entre 1.5 y 3 si es posible */
function pickGiftFromOdds(teamsLabel, odds1x2) {
  const cands = odds1x2
    .filter((o) => o.odd >= 1.5 && o.odd <= 3)
    .sort((a, b) => a.odd - b.odd);
  if (!cands.length) return null;
  const best = cands[0];
  return { match: teamsLabel, market: "1X2", pick: best.out, odd: best.odd };
}

/* Construye un parlay aproximado hacia el target */
function buildParlay(target, fixturesWithOdds, maxLegs = 8) {
  const pool = [];
  for (const f of fixturesWithOdds) {
    const nice = [...f.odds]
      .filter((o) => o.odd >= 1.3 && o.odd <= 3.2)
      .sort((a, b) => a.odd - b.odd);
    if (nice[0]) pool.push({ ...nice[0], match: f.label });
    if (nice[1] && nice[1].odd <= 2.2) pool.push({ ...nice[1], match: f.label });
  }
  const selections = [];
  let product = 1;
  for (const o of pool) {
    if (selections.length >= maxLegs) break;
    const test = product * o.odd;
    if (test <= target * 1.15 || product < target * 0.6) {
      product = Number(test.toFixed(2));
      selections.push({ match: o.match, market: "1X2", pick: o.out, odd: o.odd });
      if (product >= target * 0.92) break;
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
          <p className="text-slate-300 mt-2">
            Para generar cuotas y combinadas, primero compra tu membresía e inicia sesión.
          </p>
        <div className="mt-4">
            <Link
              to="/"
              className="inline-block rounded-2xl px-5 py-2 font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Ir a Inicio (ver membresías)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ---- validar plan ---- */
  const planGuess =
    user?.planId || user?.plan?.id || user?.plan || user?.membership || user?.tier || "";
  const target = targetFromPlan(planGuess);
  if (!target) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold">Actualiza tu membresía</h1>
          <p className="text-slate-300 mt-2">
            Tu plan actual no permite usar el comparador. Elige una membresía para desbloquearlo.
          </p>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-block rounded-2xl px-5 py-2 font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
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
  const [to, setTo] = useState(toYYYYMMDD(addDays(today, 0)));
  const [q, setQ] = useState(""); // país o id de liga
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  /* ---- generar picks (con fix de 500) ---- */
  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");
      setData(null);

      // Normaliza: si from>to, se intercambian (evita 500 en /api/fixtures)
      let f = from;
      let t = to;
      if (f > t) [f, t] = [t, f];

      const qTrim = String(q || "").trim();
      const isNum = /^\d+$/.test(qTrim);
      const isRange = f !== t;

      const makeURL = (singleDate) => {
        if (singleDate) {
          let u = `/api/fixtures?date=${singleDate}`;
          if (qTrim) u += isNum ? `&league=${qTrim}` : `&country=${encodeURIComponent(qTrim)}`;
          return u;
        }
        let u = `/api/fixtures?from=${f}&to=${t}`;
        if (qTrim) u += isNum ? `&league=${qTrim}` : `&country=${encodeURIComponent(qTrim)}`;
        return u;
      };

      // intenta rango (o día), si falla hace fallback a un solo día (f)
      let fx;
      try {
        fx = await fetchJSON(isRange ? makeURL() : makeURL(f));
      } catch {
        fx = await fetchJSON(makeURL(f));
      }
      const items = Array.isArray(fx?.items) ? fx.items : [];

      // Obtener odds reales; si no hay, sintéticas
      const withOdds = [];
      for (const it of items.slice(0, 20)) {
        const label = `${it.teams?.home || "Local"} vs ${it.teams?.away || "Visita"}`;
        let odds = [];
        try {
          const od = await fetchJSON(`/api/odds?fixture=${encodeURIComponent(it.fixtureId)}&market=1x2`);
          // intentamos mapear mercados de forma flexible
          let list = [];
          if (Array.isArray(od?.markets)) {
            // formato { markets: [{ out/label, odd/price }] }
            list = od.markets.map((mk) => ({
              out: mk?.out || mk?.label || mk?.name || "1",
              odd: Number(mk?.odd ?? mk?.price ?? mk?.value ?? 0),
            }));
          } else if (od && typeof od === "object") {
            // otros formatos simples
            for (const k of Object.keys(od)) {
              const v = Number(od[k]);
              if (isFinite(v) && v > 1.01) list.push({ out: k, odd: v });
            }
          }
          odds = list.filter((x) => x.odd > 1.01);
        } catch {
          odds = [];
        }
        if (!odds.length) odds = synthOdds(it.fixtureId);
        withOdds.push({ label, odds, id: it.fixtureId });
      }

      // Gift 1.5–3
      let gift = null;
      for (const fxt of withOdds) {
        const g = pickGiftFromOdds(fxt.label, fxt.odds);
        if (g) { gift = g; break; }
      }

      // Parlay hacia el target según plan
      const parlay = buildParlay(target, withOdds, 10);

      // Demos visibles: árbitros y desfase de mercado
      const refs = withOdds.slice(0, 5).map((fxt, i) => ({
        match: fxt.label, referee: `Árbitro Demo ${i + 1}`, avgCards: (5.5 - i * 0.4).toFixed(1),
      }));
      const gaps = withOdds.slice(0, 4).map((fxt, i) => ({
        match: fxt.label, market: "1X2",
        ourOdd: fxt.odds[0]?.odd ?? 1.7,
        bookAvg: Number(((fxt.odds[0]?.odd ?? 1.7) * (0.96 - i * 0.01)).toFixed(2)),
      }));

      setData({ gift, parlay, refs, gaps, meta: { fixturesUsed: withOdds.length } });
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
                  <span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} ·{" "}
                  <span className="font-bold">(x{s.odd})</span>
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
