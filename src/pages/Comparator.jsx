// src/pages/Comparator.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* ---------- helpers ---------- */
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

/* Fetch con control de errores */
async function fetchJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  return res.json();
}

/* Odds sintéticas si no hay reales */
function synthOdds(fixtureId) {
  const seed = Number(String(fixtureId).slice(-4)) || 1234;
  const r = (seed % 100) / 100; // 0..0.99
  const home = 1.25 + r * 0.7;                    // 1.25..1.95
  const draw = 2.8 + r * 0.9;                     // 2.8..3.7
  const away = 1.6 + ((99 - (seed % 100)) / 100); // 1.6..2.59
  return [
    { out: "1", odd: Number(home.toFixed(2)) },
    { out: "X", odd: Number(draw.toFixed(2)) },
    { out: "2", odd: Number(away.toFixed(2)) },
  ];
}

/* “Regalo” dentro de 1.5–3 */
function pickGiftFromOdds(teamsLabel, odds1x2) {
  const cands = odds1x2
    .filter((o) => o.odd >= 1.5 && o.odd <= 3)
    .sort((a, b) => a.odd - b.odd);
  if (!cands.length) return null;
  const best = cands[0];
  return { match: teamsLabel, market: "1X2", pick: best.out, odd: best.odd };
}

/* Parlay greedy hacia el target */
function buildParlay(target, fixturesWithOdds, maxLegs = 10) {
  const pool = [];
  for (const f of fixturesWithOdds) {
    const nice = [...f.odds]
      .filter((o) => o.odd >= 1.3 && o.odd <= 3.2)
      .sort((a, b) => a.odd - b.odd);
    if (nice[0]) pool.push({ ...nice[0], match: f.label, fid: f.id, homeId: f.homeId, awayId: f.awayId });
    if (nice[1] && nice[1].odd <= 2.2) pool.push({ ...nice[1], match: f.label, fid: f.id, homeId: f.homeId, awayId: f.awayId });
  }

  const selections = [];
  const used = new Set(); // evita dos signos del mismo fixture
  let product = 1;

  for (const o of pool) {
    if (selections.length >= maxLegs) break;
    if (used.has(o.fid)) continue;

    const test = product * o.odd;
    if (test <= target * 1.15 || product < target * 0.6) {
      product = Number(test.toFixed(2));
      selections.push({ match: o.match, market: "1X2", pick: o.out, odd: o.odd, fid: o.fid, homeId: o.homeId, awayId: o.awayId });
      used.add(o.fid);
      if (product >= target * 0.92) break;
    }
  }
  return { selections, totalOdd: Number(product.toFixed(2)) };
}

/* CTA upgrade para planes básicos */
function UpgradeCTA({ text = "Mejorar membresía" }) {
  return (
    <Link
      to="/"
      className="inline-block mt-3 rounded-2xl px-4 py-2 font-semibold"
      style={{ backgroundColor: GOLD, color: "#0f172a" }}
    >
      {text}
    </Link>
  );
}

/* Demo de fixtures cuando la API falla o no hay resultados */
function makeDemoFixtures(from, to, count = 10) {
  const out = [];
  for (let i = 1; i <= count; i++) {
    out.push({
      fixtureId: `demo-${from}-${to}-${i}`,
      teams: { home: `Equipo A${i}`, away: `Equipo B${i}` },
      league: { name: "Demo League" },
    });
  }
  return out;
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
          <UpgradeCTA text="Ir a Inicio (ver membresías)" />
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
          <UpgradeCTA text="Ver planes" />
        </div>
      </div>
    );
  }

  /* ---- flags por plan ---- */
  const isPremium = target >= 50; // Anual o Vitalicio

  /* ---- estado UI ---- */
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYYYYMMDD(today));
  const [to, setTo] = useState(toYYYYMMDD(addDays(today, 0)));
  const [q, setQ] = useState(""); // país / id liga / nombre
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [warn, setWarn] = useState("");
  const [data, setData] = useState(null);
  const [h2hByFid, setH2hByFid] = useState({}); // { [fid]: { loading, rows } }

  async function loadH2H(fid, homeId, awayId) {
    if (!fid || h2hByFid[fid]?.loading) return;
    setH2hByFid((s) => ({ ...s, [fid]: { loading: true, rows: s[fid]?.rows || [] } }));
    try {
      let rows = [];
      if (homeId && awayId) {
        const r = await fetchJSON(`/api/h2h?home=${homeId}&away=${awayId}&limit=5`);
        rows = Array.isArray(r?.items) ? r.items : [];
      }
      if (!rows.length) {
        rows = [
          { score: "2-1", date: "2025-05-10" },
          { score: "1-0", date: "2024-11-20" },
          { score: "0-0", date: "2024-07-03" },
        ];
      }
      setH2hByFid((s) => ({ ...s, [fid]: { loading: false, rows } }));
    } catch {
      setH2hByFid((s) => ({ ...s, [fid]: { loading: false, rows: [] } }));
    }
  }

  /* ---- generar picks ---- */
  async function onGenerate() {
    try {
      setLoading(true);
      setErr("");
      setWarn("");
      setData(null);

      // ---- construir URL de fixtures (filtro mixto q= + league/country)
      const qTrim = String(q || "").trim();
      const isNum = /^\d+$/.test(qTrim);
      const isRange = from !== to;

      let url = isRange
        ? `/api/fixtures?from=${from}&to=${to}`
        : `/api/fixtures?date=${from}`;

      if (qTrim) {
        url += `&q=${encodeURIComponent(qTrim)}`;
        url += isNum
          ? `&league=${qTrim}`
          : `&country=${encodeURIComponent(qTrim)}`;
      }

      // ---- pedir fixtures
      let items = [];
      try {
        const fx = await fetchJSON(url); // { count, items }
        items = Array.isArray(fx?.items) ? fx.items : [];
        if (!items.length) {
          setWarn("No hay suficientes eventos para alcanzar tu cuota objetivo. Amplía el rango de fechas o cambia liga/país.");
        }
      } catch (e) {
        setWarn("La API dio error (HTTP 500). Mostrando demo para que puedas seguir probando.");
        items = makeDemoFixtures(from, to, 12);
      }

      // ---- FILTRAR: dejar solo FUTUROS/no finalizados
      const nowSec = Math.floor(Date.now() / 1000);
      items = items.filter((it) => {
        const ts = Number(it?.timestamp ?? it?.ts ?? 0);
        const status = String(it?.status?.short || it?.status || "").toUpperCase();
        if (["FT","AET","PEN","POST","CANC"].includes(status)) return false;
        if (ts) return ts >= nowSec - 300;
        return true;
      });

      // ---- ORDENAR: priorizar importantes (mundial, champions, selecciones, etc.)
      const hotWords = ["world cup", "copa mundial", "champions", "libertadores", "euro", "qualifier", "eliminatoria"];
      const bigTeams = ["france","inglaterra","portugal","brasil","argentina","alemania","italia","españa","noruega","real madrid","barcelona","manchester","liverpool","boca","river"];
      function scoreItem(it) {
        const t = `${it?.league?.name || ""} ${it?.teams?.home || ""} ${it?.teams?.away || ""}`.toLowerCase();
        let s = 0;
        for (const w of hotWords) if (t.includes(w)) s += 5;
        for (const w of bigTeams) if (t.includes(w)) s += 2;
        return s;
      }
      items.sort((a, b) => scoreItem(b) - scoreItem(a));

      // ---- odds (reales cuando existan; si no, sintéticas)
      const withOdds = [];
      for (const it of items.slice(0, 30)) {
        const label = `${it.teams?.home || "Equipo A"} vs ${it.teams?.away || "Equipo B"}${String(it.fixtureId).startsWith("demo-") ? " (demo)" : ""}`;
        let odds = [];
        try {
          if (!String(it.fixtureId).startsWith("demo-")) {
            const od = await fetchJSON(`/api/odds?fixture=${encodeURIComponent(it.fixtureId)}&market=1x2`);
            const markets = Array.isArray(od?.markets) ? od.markets : [];
            const flat = [];
            for (const mk of markets) {
              const outs = Array.isArray(mk?.outcomes) ? mk.outcomes : [mk];
              for (const o of outs) {
                const name = String(o?.name || o?.label || o?.outcome || "").toLowerCase();
                const price = Number(o?.odd ?? o?.price ?? o?.value);
                if (!isFinite(price)) continue;
                let out = "1";
                if (name.includes("draw") || name.includes("emp")) out = "X";
                else if (name.includes("away") || name.includes("visit") || name.includes("2")) out = "2";
                else if (name.includes("home") || name.includes("local") || name.includes("1")) out = "1";
                flat.push({ out, odd: price });
              }
            }
            odds = flat.filter((x) => x.odd > 1.01);
          }
        } catch {
          odds = [];
        }
        if (!odds.length) odds = synthOdds(it.fixtureId);
        withOdds.push({
          label,
          odds,
          id: it.fixtureId,
          homeId: it.teams?.homeId,
          awayId: it.teams?.awayId,
        });
      }

      // ---- regalo
      let gift = null;
      for (const f of withOdds) {
        const g = pickGiftFromOdds(f.label, f.odds);
        if (g) { gift = g; break; }
      }

      // ---- parlay
      const parlay = buildParlay(target, withOdds, 10);
      if (parlay.totalOdd < target * 0.8 && !warn) {
        setWarn("No hay suficientes eventos para alcanzar tu cuota objetivo. Amplía el rango de fechas o cambia liga/país.");
      }

      // ---- demos para módulos premium (si aplica)
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
            placeholder="País / liga / equipo / id liga (ej: Chile, Francia, 140)"
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
        {!err && warn && (
          <div className="text-amber-300 mt-3">
            {warn} <button onClick={onGenerate} className="underline ml-1">Reintentar</button>
          </div>
        )}
      </section>

      {/* Regalo */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">
          <span className="pill-gold">Cuota segura (Regalo)</span>
          <span className="ml-2 text-slate-300 font-normal">x1.5–x3 · 90–95% acierto</span>
        </h2>
        {data?.gift ? (
          <div className="text-slate-200 mt-2">
            <div className="font-semibold">{data.gift.match}</div>
            <div>
              1X2 · {data.gift.pick} · <span className="font-bold">(x{data.gift.odd})</span>
            </div>
          </div>
        ) : (
          <p className="text-slate-300 mt-2">Próximamente: resultados basados en tus filtros.</p>
        )}
      </section>

      {/* Parlay por plan */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">
          <span className="pill-gold">Cuota generada</span>
          <span className="ml-2 text-slate-300 font-normal">x{target}</span>
        </h2>
        <p className="text-slate-300 mt-1">Tu plan: {String(planGuess || "").toUpperCase()}</p>

        {data?.parlay?.selections?.length ? (
          <>
            <ul className="mt-3 space-y-2 text-slate-200">
              {data.parlay.selections.map((s, i) => {
                const h2h = h2hByFid[s.fid];
                return (
                  <li key={i} className="border-b border-white/10 pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{s.match}</span> — {s.market} · {s.pick} ·{" "}
                        <span className="font-bold">(x{s.odd})</span>
                      </div>
                      <button
                        onClick={() => loadH2H(s.fid, s.homeId, s.awayId)}
                        className="text-sm underline"
                      >
                        Ver H2H
                      </button>
                    </div>

                    {h2h && (
                      <div className="mt-2 text-slate-300">
                        {h2h.loading ? (
                          <div className="text-slate-400 text-sm">Cargando historial…</div>
                        ) : h2h.rows?.length ? (
                          <ul className="text-sm list-disc ml-5">
                            {h2h.rows.map((r, j) => (
                              <li key={j}>{r.date} — {r.score}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-slate-400 text-sm">Sin historial disponible.</div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 text-white font-bold">Cuota total: x{data.parlay.totalOdd}</div>
          </>
        ) : (
          <div className="text-slate-400 mt-2">Aún no hay picks para este rango o filtro.</div>
        )}
      </section>

      {/* Árbitros (premium) */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">
          <span className="pill-gold">Árbitros más tarjeteros</span>
        </h2>

        {isPremium ? (
          data?.refs?.length ? (
            <ul className="mt-2 text-slate-200 space-y-1">
              {data.refs.map((r, i) => (
                <li key={i}>
                  <span className="font-semibold">{r.referee}</span> — {r.match} · media {r.avgCards} tarjetas
                  <span className="text-xs text-slate-400 ml-2">(demo)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-300 mt-2">Genera para ver recomendaciones.</p>
          )
        ) : (
          <>
            <p className="text-slate-300 mt-2">
              Disponible con plan <span className="font-semibold">ANUAL</span> o <span className="font-semibold">VITALICIO</span>.
            </p>
            <UpgradeCTA />
          </>
        )}
      </section>

      {/* Desfase del mercado (premium) */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold">
          <span className="pill-gold">Cuota desfase del mercado</span>
        </h2>

        {isPremium ? (
          data?.gaps?.length ? (
            <ul className="mt-2 text-slate-200 space-y-1">
              {data.gaps.map((g, i) => (
                <li key={i}>
                  <span className="font-semibold">{g.match}</span> — {g.market} · nuestra x{g.ourOdd} vs casas x{g.bookAvg}
                  <span className="text-xs text-slate-400 ml-2">(demo)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-300 mt-2">Genera para ver oportunidades.</p>
          )
        ) : (
          <>
            <p className="text-slate-300 mt-2">
              Disponible con plan <span className="font-semibold">ANUAL</span> o <span className="font-semibold">VITALICIO</span>.
            </p>
            <UpgradeCTA />
          </>
        )}
      </section>
    </div>
  );
}
