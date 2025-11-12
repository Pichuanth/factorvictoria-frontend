// src/pages/Comparator.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* -------- helpers -------- */
const pad = (n) => String(n).padStart(2, "0");
function toYYYYMMDD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function diffDays(a, b) {
  const d1 = new Date(a + "T00:00:00Z");
  const d2 = new Date(b + "T00:00:00Z");
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}
function listDates(from, to) {
  let f = from, t = to; if (f > t) [f, t] = [t, f];
  const out = []; let d = new Date(f + "T00:00:00Z"), end = new Date(t + "T00:00:00Z");
  while (d <= end) { out.push(toYYYYMMDD(d)); d = addDays(d, 1); }
  return out;
}

/** Mapea membresía → target cuota */
function targetFromPlan(planRaw) {
  const id = String(planRaw || "").toLowerCase();
  if (["vitalicio","lifetime","pro-250","x100"].some(k=>id.includes(k))) return 100;
  if (["anual","annual","x50"].some(k=>id.includes(k))) return 50;
  if (["trimestral","quarter","3m","x20"].some(k=>id.includes(k))) return 20;
  if (["mensual","monthly","basic","basico","x10"].some(k=>id.includes(k))) return 10;
  return null;
}

/* fetch con control (soft = no romper UI) */
async function fetchJSON(path, { soft=false } = {}) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(()=> "");
      const msg = `HTTP ${res.status} ${res.statusText || ""}${t ? " – " + t : ""}`;
      if (soft) return { __error: msg };
      throw new Error(msg);
    }
    return res.json();
  } catch (e) {
    if (soft) return { __error: String(e.message || e) };
    throw e;
  }
}

/* Odds sintéticas si no hay 1X2 reales */
function synthOdds(seedish) {
  const seed = Number(String(seedish).replace(/\D/g,"").slice(-4)) || 1234;
  const r = (seed % 100) / 100;
  const home = 1.25 + r * 0.7;
  const draw = 2.8 + r * 0.9;
  const away = 1.6 + ((99 - (seed % 100)) / 100);
  return [
    { out: "1", odd: Number(home.toFixed(2)) },
    { out: "X", odd: Number(draw.toFixed(2)) },
    { out: "2", odd: Number(away.toFixed(2)) },
  ];
}

/* Demo fixtures si la API no devuelve nada */
function makeDemoFixtures(n = 6) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const id = `demo-${Date.now()}-${i}`;
    out.push({ fixtureId: id, teams: { home: `Equipo A${i+1}`, away: `Equipo B${i+1}` }, __demo: true });
  }
  return out;
}

function pickGiftFromOdds(label, odds) {
  const c = odds.filter(o=>o.odd >= 1.5 && o.odd <= 3).sort((a,b)=>a.odd-b.odd);
  if (!c.length) return null;
  const best = c[0];
  return { match: label, market: "1X2", pick: best.out, odd: best.odd };
}

function buildParlay(target, fixturesWithOdds, maxLegs = 10) {
  const pool = [];
  for (const f of fixturesWithOdds) {
    const nice = [...f.odds].filter(o=>o.odd >= 1.3 && o.odd <= 3.2).sort((a,b)=>a.odd-b.odd);
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

/* Fixtures resiliente (rango → por días) */
async function fetchFixturesSmart({ from, to, q }) {
  let f = from, t = to; if (f > t) [f, t] = [t, f];
  const isNum = /^\d+$/.test(String(q || "").trim());
  const qs = (base) => {
    let u = base + `&t=${Date.now()}`;
    if (q) u += isNum ? `&league=${q}` : `&country=${encodeURIComponent(q)}`;
    return u;
  };

  const delta = diffDays(f, t);
  if (delta <= 1) {
    const url = f === t ? qs(`/api/fixtures?date=${f}`) : qs(`/api/fixtures?from=${f}&to=${t}`);
    let data = await fetchJSON(url, { soft: true });
    if (!data || data.__error) data = await fetchJSON(qs(`/api/fixtures?date=${f}`), { soft: true });
    return Array.isArray(data?.items) ? data.items : [];
  }

  const days = listDates(f, t);
  const all = [];
  for (const day of days) {
    const d = await fetchJSON(qs(`/api/fixtures?date=${day}`), { soft: true });
    if (Array.isArray(d?.items)) all.push(...d.items);
  }
  return all;
}

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();

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
  const [to, setTo] = useState(toYYYYMMDD(addDays(today, 0)));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState("");
  const [data, setData] = useState(null);

  /* Permitir generar muchas veces seguidas */
  async function onGenerate() {
    setLoading(true);
    setErr("");
    setWarn("");
    setData(null); // limpia resultados anteriores para no confundir
    try {
      // 1) fixtures
      const fixtures = await fetchFixturesSmart({ from, to, q });
      const items = fixtures.length ? fixtures : makeDemoFixtures(6);

      // 2) odds para cada fixture (reales si hay; si no, sintéticas)
      const withOdds = [];
      for (const it of items.slice(0, 24)) {
        const label = `${it.teams?.home || "Local"} vs ${it.teams?.away || "Visita"}${it.__demo ? " (demo)" : ""}`;
        let odds = [];
        if (!it.__demo) {
          const od = await fetchJSON(`/api/odds?fixture=${encodeURIComponent(it.fixtureId)}&market=1x2&t=${Date.now()}`, { soft: true });
          if (Array.isArray(od?.markets)) {
            const list = od.markets.map(mk => ({
              out: mk?.out || mk?.label || mk?.name || "1",
              odd: Number(mk?.odd ?? mk?.price ?? mk?.value ?? 0),
            })).filter(x=>x.odd > 1.01);
            odds = list;
          }
        }
        if (!odds.length) odds = synthOdds(it.fixtureId);
        withOdds.push({ label, odds, id: it.fixtureId });
      }

      // 3) regalo
      let gift = null;
      for (const f of withOdds) { const g = pickGiftFromOdds(f.label, f.odds); if (g) { gift = g; break; } }

      // 4) parlay
      const parlay = buildParlay(target, withOdds, 12);

      // 5) avisos si no alcanza
      if (!parlay.selections.length || parlay.totalOdd < target * 0.7) {
        setWarn("No hay suficientes eventos para alcanzar tu cuota objetivo. Amplía el rango de fechas o cambia liga/país.");
      }

      // 6) demos de tarjetas/desfase
      const refs = withOdds.slice(0, 5).map((f,i)=>({ match:f.label, referee:`Árbitro Demo ${i+1}`, avgCards:(5.5 - i*0.4).toFixed(1) }));
      const gaps = withOdds.slice(0, 4).map((f,i)=>({
        match:f.label, market:"1X2", ourOdd:f.odds[0]?.odd ?? 1.7, bookAvg:Number(((f.odds[0]?.odd ?? 1.7)*(0.96 - i*0.01)).toFixed(2))
      }));

      setData({ gift, parlay, refs, gaps, meta: { fixturesUsed: withOdds.length } });
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      {/* Filtros */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="date" value={from} onChange={(e)=>setFrom(e.target.value)}
                 className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10" title="Desde" />
          <input type="date" value={to} onChange={(e)=>setTo(e.target.value)}
                 className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10" title="Hasta" />
          <input placeholder="País o id de liga (ej: Chile o 140)" value={q} onChange={(e)=>setQ(e.target.value)}
                 className="rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10 md:col-span-1" />
          <button onClick={onGenerate} disabled={loading}
                  className="rounded-2xl font-semibold px-4 py-2"
                  style={{ backgroundColor: GOLD, color: "#0f172a" }}>
            {loading ? "Generando..." : "Generar"}
          </button>
        </div>
        {err && <div className="text-red-400 mt-3">{err}</div>}
        {warn && !err && (
          <div className="text-amber-300 mt-3">
            {warn} <button onClick={onGenerate} className="underline font-semibold">Reintentar</button>
          </div>
        )}
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
              {data.parlay.selections.map((s,i)=>(
                <li key={i}><span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} · <span className="font-bold">(x{s.odd})</span></li>
              ))}
            </ul>
            <div className="mt-3 text-white font-bold">Cuota total: x{data.parlay.totalOdd}</div>
          </>
        ) : (
          <div className="text-slate-400 mt-2">Aún no hay picks para este rango o filtro.</div>
        )}
      </section>

      {/* Árbitros demo */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Árbitros más tarjeteros</h2>
        {data?.refs?.length ? (
          <ul className="mt-2 text-slate-200 space-y-1">
            {data.refs.map((r,i)=>(
              <li key={i}><span className="font-semibold">{r.referee}</span> — {r.match} · media {r.avgCards} tarjetas <span className="text-xs text-slate-400 ml-2">(demo)</span></li>
            ))}
          </ul>
        ) : <p className="text-slate-300 mt-2">Disponible con tu plan.</p>}
      </section>

      {/* Desfase demo */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">Cuota desfase del mercado</h2>
        {data?.gaps?.length ? (
          <ul className="mt-2 text-slate-200 space-y-1">
            {data.gaps.map((g,i)=>(
              <li key={i}><span className="font-semibold">{g.match}</span> — {g.market} · nuestra x{g.ourOdd} vs casas x{g.bookAvg} <span className="text-xs text-slate-400 ml-2">(demo)</span></li>
            ))}
          </ul>
        ) : <p className="text-slate-300 mt-2">Disponible con tu plan.</p>}
      </section>
    </div>
  );
}
