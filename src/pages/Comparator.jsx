// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const API_BASE = import.meta.env.VITE_API_BASE || "";

/* --------------------- helpers --------------------- */

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Alias ES -> EN para country de API-SPORTS
const COUNTRY_ALIAS = {
  chile: "Chile",
  argentina: "Argentina",
  españa: "Spain",
  espana: "Spain",
  inglaterra: "England",
  francia: "France",
  portugal: "Portugal",
  italia: "Italy",
  alemania: "Germany",
};

function normalizeCountryQuery(q) {
  const key = String(q || "").toLowerCase().trim();
  return COUNTRY_ALIAS[key] || null;
}

// Emojis de banderas
const COUNTRY_FLAG = {
  Chile: "🇨🇱",
  Argentina: "🇦🇷",
  Spain: "🇪🇸",
  England: "🏴",
  France: "🇫🇷",
  Brazil: "🇧🇷",
  Germany: "🇩🇪",
  Italy: "🇮🇹",
  Portugal: "🇵🇹",
  Mexico: "🇲🇽",
  USA: "🇺🇸",
};

const IMPORTANT_LEAGUES = [
  "UEFA Champions League",
  "Champions League",
  "Europa League",
  "CONMEBOL Libertadores",
  "Copa Libertadores",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Copa del Rey",
  "CONMEBOL Sudamericana",
];

function getLeaguePriority(leagueName = "", country = "") {
  const name = String(leagueName || "").toLowerCase();
  const countryLower = String(country || "").toLowerCase();

  for (let i = 0; i < IMPORTANT_LEAGUES.length; i++) {
    if (name.includes(IMPORTANT_LEAGUES[i].toLowerCase())) return i;
  }

  if (["england", "spain", "italy", "germany", "france"].includes(countryLower)) return 12;
  if (["chile", "argentina", "brazil", "portugal", "mexico"].includes(countryLower)) return 14;

  return 25;
}

function getFixtureId(f) {
  return (
    f.id ||
    f.fixtureId ||
    f.fixture_id ||
    f.fixture?.id ||
    f.fixture?.fixture_id ||
    f.fixture?.fixtureId ||
    `${f.league?.id || ""}-${f.timestamp || f.date || f.fixture?.date || ""}`
  );
}

function getLeagueName(f) {
  return f.league?.name || f.leagueName || f.league_name || f.competition || "Liga desconocida";
}

function getCountryName(f) {
  return f.league?.country || f.country || f.country_name || f.location || "World";
}

function getHomeName(f) {
  return f.homeTeam || f.home_name || f.localTeam || f.team_home || f.teams?.home?.name || "Local";
}

function getAwayName(f) {
  return f.awayTeam || f.away_name || f.visitTeam || f.team_away || f.teams?.away?.name || "Visita";
}

function getKickoffTime(f) {
  if (f.time) return f.time;
  if (f.kickoffTime) return f.kickoffTime;

  const iso = f.date || f.fixture?.date;
  if (typeof iso === "string" && iso.includes("T")) {
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "--:--";
    }
  }
  return f.hour || "--:--";
}

function getMaxBoostFromPlan(planLabel) {
  const p = String(planLabel || "").toUpperCase();
  if (p.includes("VITA")) return 100;
  if (p.includes("ANU")) return 50;
  if (p.includes("TRI") || p.includes("3")) return 20;
  return 10;
}

/** FUTUROS */
function isFutureFixture(fx) {
  const now = Date.now();

  const ts = fx.timestamp || fx.fixture?.timestamp || null;
  if (ts) {
    const ms = Number(ts) * 1000;
    if (!Number.isNaN(ms)) return ms > now;
  }

  const iso = fx.date || fx.fixture?.date || null; // ✅ arreglado
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.getTime() > now;
  }

  // si no podemos determinar, lo consideramos futuro para no eliminar por error
  return true;
}

/** Filtra juveniles / reservas / femenino */
function isYouthOrWomenOrReserve(fx) {
  const blob = `${getLeagueName(fx)} ${getHomeName(fx)} ${getAwayName(fx)}`.toLowerCase();

  const banned = [
    "u17", "u18", "u19", "u20", "u21", "u23",
    "reserves", "reserve", "youth", "juvenil",
    "sub-", "sub ",
    " women", "womens", "femen", " fem", " w ",
    " ii", " b ",
  ];

  return banned.some((p) => blob.includes(p));
}

/** Solo ligas “top” (con fallback flexible) */
function isMajorLeague(fx) {
  const name = String(getLeagueName(fx) || "").toLowerCase();
  const country = String(getCountryName(fx) || "").toLowerCase();

  // lista directa
  const hit = IMPORTANT_LEAGUES.some((imp) => name.includes(String(imp).toLowerCase()));
  if (hit) return true;

  // fallback: nombres típicos que varían
  const commonTop =
    name.includes("primera") ||
    name.includes("1st division") ||
    name.includes("first division") ||
    name.includes("liga professional") ||
    name.includes("serie a") ||
    name.includes("bundesliga") ||
    name.includes("ligue 1") ||
    name.includes("premier league") ||
    name.includes("la liga");

  if (
    commonTop &&
    ["england","spain","italy","germany","france","chile","argentina","brazil","portugal","mexico"].includes(country)
  ) {
    return true;
  }

  return false;
}

/* --------------------- componente --------------------- */

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [searchParams] = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYYYYMMDD(today));
  const [to, setTo] = useState(toYYYYMMDD(today));
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [fixtures, setFixtures] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [parlayResult, setParlayResult] = useState(null);
  const [parlayError, setParlayError] = useState("");

  // odds cache: { [fixtureId]: { found, markets, fetchedAt } }
  const [oddsByFixture, setOddsByFixture] = useState({});

  useEffect(() => {
    const urlDate = searchParams.get("date");
    const urlQ = searchParams.get("q");
    if (urlDate) {
      setFrom(urlDate);
      setTo(urlDate);
    }
    if (urlQ) setQ(urlQ);
  }, [searchParams]);

  const planLabel = useMemo(() => {
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "").toUpperCase();
  }, [user]);

  const maxBoost = getMaxBoostFromPlan(planLabel);

  const quickCountries = ["Chile", "España", "Portugal", "Italia", "Alemania", "Argentina", "Inglaterra", "Francia"];

  const ensureOdds = useCallback(
    async (fixtureId) => {
      if (!fixtureId) return;

      // Si ya está en cache, no recargamos
      if (oddsByFixture[fixtureId]) return;

      try {
        const res = await fetch(`${API_BASE}/api/odds?fixture=${encodeURIComponent(fixtureId)}`);
        if (!res.ok) return;

        const data = await res.json();

        setOddsByFixture((prev) => ({
          ...prev,
          [fixtureId]: {
            found: !!data?.found,
            markets: data?.markets || {},
            fetchedAt: Date.now(),
          },
        }));
      } catch (e) {
        console.warn("odds error", e);
      }
    },
    [API_BASE, oddsByFixture]
  );

  async function handleGenerate(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setParlayResult(null);
    setParlayError("");
    setOddsByFixture({});
    setLoading(true);

    if (!isLoggedIn) {
      setLoading(false);
      setErr("Necesitas iniciar sesión y tener una membresía activa para usar el comparador. Usa la pestaña Partidos mientras tanto.");
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);

      const qTrim = String(q || "").trim();
      const countryEN = normalizeCountryQuery(qTrim);

      if (countryEN) params.set("country", countryEN);
      else if (qTrim) params.set("q", qTrim);

      const res = await fetch(`${API_BASE}/api/fixtures?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText || ""}`);

      const data = await res.json();

      // ✅ soporta backend: { items: [...] } o API-Football: { response: [...] }
      const itemsRaw =
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.response) && data.response) ||
        [];

      // 1) filtro base: futuro + no juveniles/reservas/femenino
      const base = itemsRaw.filter(isFutureFixture).filter((fx) => !isYouthOrWomenOrReserve(fx));

      // 2) ligas top, con fallback si deja demasiado vacío
      const majors = base.filter(isMajorLeague);
      const filtered = majors.length >= 8 ? majors : base;

      // orden y límite
      const sorted = [...filtered].sort((a, b) => {
        const prioA = getLeaguePriority(getLeagueName(a), getCountryName(a));
        const prioB = getLeaguePriority(getLeagueName(b), getCountryName(b));
        if (prioA !== prioB) return prioA - prioB;

        const tA = getKickoffTime(a) || "";
        const tB = getKickoffTime(b) || "";
        return tA.localeCompare(tB);
      });

      const LIMITED = sorted.slice(0, 120);

      if (!LIMITED.length) {
        setErr(
          `No encontramos partidos para ese rango. API devolvió: ${itemsRaw.length} | ` +
          `base: ${base.length} | ligas top: ${majors.length}. ` +
          `Prueba con 7–14 días y sin filtro (q vacío).`
        );
        setFixtures([]);
        return;
      }

      setFixtures(LIMITED);
      setInfo(
        `API devolvió ${itemsRaw.length} partidos. Mostrando ${LIMITED.length} tras filtros ` +
        `(base: ${base.length}, top: ${majors.length}${majors.length >= 8 ? "" : ", fallback base"}).`
      );
    } catch (e2) {
      console.error(e2);
      setErr(String(e2.message || e2));
    } finally {
      setLoading(false);
    }
  }

  function handleQuickCountry(countryEs) {
    setQ(countryEs);
  }

  function toggleFixtureSelection(id) {
    setParlayResult(null);
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedCount = selectedIds.length;

  // Demo de producto (luego lo haremos 100% real)
  function fakeOddForFixture(fx) {
    const id = getFixtureId(fx);
    const key = String(id || getHomeName(fx) + getAwayName(fx));
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 7)) % 1000;
    const base = 1.2 + (hash % 26) / 10;
    return Number(base.toFixed(2));
  }

  function buildComboSuggestion(fixturesPool, maxBoost) {
    if (!Array.isArray(fixturesPool) || fixturesPool.length === 0) return null;

    const picks = [];
    let product = 1;

    for (const fx of fixturesPool) {
      const odd = fakeOddForFixture(fx);
      if (product * odd > maxBoost * 1.35) continue;

      product *= odd;
      picks.push({ id: getFixtureId(fx), label: `${getHomeName(fx)} vs ${getAwayName(fx)}`, odd });

      if (picks.length >= 12) break;
      if (product >= maxBoost * 0.8) break;
    }

    if (!picks.length) return null;

    const finalOdd = Number(product.toFixed(2));
    const impliedProb = Number(((1 / finalOdd) * 100).toFixed(1));
    const reachedTarget = finalOdd >= maxBoost * 0.8;

    return { games: picks.length, finalOdd, target: maxBoost, impliedProb, reachedTarget };
  }

  async function handleAutoParlay() {
    setParlayError("");
    setParlayResult(null);

    if (!fixtures.length) {
      setParlayError("Genera primero partidos con el botón de arriba.");
      return;
    }

    const first10 = fixtures.slice(0, 10).map(getFixtureId).filter(Boolean);
    first10.forEach((id) => ensureOdds(id));

    const suggestion = buildComboSuggestion(fixtures, maxBoost);
    if (!suggestion) {
      setParlayError("Por ahora no pudimos armar una combinada razonable con los partidos cargados. Prueba con otro rango de fechas.");
      return;
    }

    setParlayResult({ mode: "auto", ...suggestion });
  }

  async function handleSelectedParlay() {
    setParlayError("");
    setParlayResult(null);

    if (!fixtures.length) {
      setParlayError("Genera primero partidos con el botón de arriba.");
      return;
    }

    if (selectedCount < 2) {
      setParlayError("Selecciona al menos 2 partidos de la lista superior.");
      return;
    }

    const pool = fixtures.filter((fx) => selectedIds.includes(getFixtureId(fx)));
    if (pool.length < 2) {
      setParlayError("Hubo un problema al leer tu selección. Vuelve a elegir 2 o más partidos.");
      return;
    }

    pool.map(getFixtureId).filter(Boolean).forEach((id) => ensureOdds(id));

    const suggestion = buildComboSuggestion(pool, maxBoost);
    if (!suggestion) {
      setParlayError("Con esta combinación no pudimos llegar a una cuota interesante. Prueba agregando más partidos.");
      return;
    }

    setParlayResult({ mode: "selected", ...suggestion });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Comparador</h1>

        {isLoggedIn ? (
          <p className="text-slate-300 text-sm md:text-base">
            Estás usando Factor Victoria con tu membresía{" "}
            <span className="font-semibold">{planLabel || "ACTIVA"}</span>. Elige un rango de fechas y filtra por país, liga o equipo para generar tus parlays.
          </p>
        ) : (
          <p className="text-slate-300 text-sm md:text-base">
            Modo visitante: prueba el comparador con filtros reales pero con funcionalidad limitada.{" "}
            <Link to="/" className="underline font-semibold">Activa una membresía</Link>{" "}
            para desbloquear todas las herramientas profesionales.
          </p>
        )}
      </section>

      {/* Filtros */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row md:items-end gap-3 items-stretch">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1" htmlFor="fromDate">Desde</label>
            <input
              id="fromDate"
              name="fromDate"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1" htmlFor="toDate">Hasta</label>
            <input
              id="toDate"
              name="toDate"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-[2]">
            <label className="block text-xs text-slate-400 mb-1" htmlFor="qFilter">Filtro (país / liga / equipo)</label>
            <input
              id="qFilter"
              name="qFilter"
              placeholder="Ej: Chile, La Liga, Colo Colo, Premier League..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={!isLoggedIn || loading}
              className="w-full rounded-2xl font-semibold px-4 py-2 mt-4 md:mt-0 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              {loading ? "Generando..." : "Generar"}
            </button>
          </div>
        </form>

        {/* Países rápidos */}
        <div className="mt-3 flex flex-wrap gap-2">
          {quickCountries.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleQuickCountry(c)}
              className="text-xs md:text-sm rounded-full px-3 py-1 border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              {c}
            </button>
          ))}
        </div>

        {/* Mensajes */}
        {err && (
          <div className="mt-3 text-sm text-amber-300">
            {err}
            {!isLoggedIn && (
              <>
                {" "}
                <Link to="/" className="underline font-semibold">Ver planes</Link>
              </>
            )}
          </div>
        )}

        {!err && info && <div className="mt-3 text-xs text-slate-400">{info}</div>}
      </section>

      {/* Lista compacta de partidos */}
      <section className="mt-4 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 text-[11px] md:text-xs text-slate-300 tracking-wide">
          <span className="uppercase">
            Partidos encontrados:{" "}
            <span className="font-semibold text-slate-50">{fixtures.length}</span>
          </span>
          <span className="uppercase text-right">
            Toca un partido para añadirlo / quitarlo de tu combinada.
          </span>
        </div>

        {fixtures.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-300">
            Por ahora no hay partidos para este rango o filtro. Prueba con más días o sin filtrar por país/equipo.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {fixtures.map((fx) => {
              const id = getFixtureId(fx);
              const isSelected = selectedIds.includes(id);

              const league = getLeagueName(fx);
              const countryName = getCountryName(fx);
              const flagEmoji = COUNTRY_FLAG[countryName] || (countryName === "World" ? "🌍" : "🏳️");
              const home = getHomeName(fx);
              const away = getAwayName(fx);
              const time = getKickoffTime(fx);

              const oddsPack = oddsByFixture[id] || null;
              const m1x2 = oddsPack?.markets?.["1X2"] || null;
              const mou = oddsPack?.markets?.["OU_2_5"] || null;
              const found = oddsPack?.found; // true/false/undefined

              const hasOdds =
                (m1x2 && (m1x2.home != null || m1x2.draw != null || m1x2.away != null)) ||
                (mou && (mou.over != null || mou.under != null));

              return (
                <li
                  key={id}
                  onClick={() => {
                    toggleFixtureSelection(id);
                    ensureOdds(id);
                  }}
                  className={[
                    "px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors",
                    isSelected ? "bg-slate-900/90" : "hover:bg-slate-900/70",
                  ].join(" ")}
                >
                  {/* Hora */}
                  <div className="w-14 text-[11px] md:text-xs font-semibold text-slate-100">
                    {time || "--:--"}
                  </div>

                  {/* País / competición + equipos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs md:text-sm text-slate-200">
                      <span className="mr-1 text-lg leading-none">{flagEmoji}</span>
                      <span className="font-medium truncate">{countryName}</span>
                      {league && (
                        <span className="text-[11px] md:text-xs text-slate-400 truncate">
                          {" "}· {league}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 text-xs md:text-sm text-slate-100">
                      <div className="font-semibold leading-snug whitespace-normal break-words">{home}</div>
                      <div className="text-[11px] text-slate-400">vs</div>
                      <div className="font-semibold leading-snug whitespace-normal break-words">{away}</div>
                    </div>
                  </div>

                  {/* Odds / Placeholder */}
                  <div className="w-[40%] md:w-[32%] text-right text-[11px] md:text-xs leading-snug">
                    {hasOdds ? (
                      <div className="text-slate-200">
                        {m1x2 && (
                          <div className="text-cyan-200 font-semibold">
                            1X2:{" "}
                            <span className="text-slate-100">1</span> {m1x2.home ?? "--"}{" "}
                            <span className="text-slate-100">X</span> {m1x2.draw ?? "--"}{" "}
                            <span className="text-slate-100">2</span> {m1x2.away ?? "--"}
                          </div>
                        )}
                        {mou && (
                          <div className="text-emerald-200">
                            O/U 2.5: O {mou.over ?? "--"} · U {mou.under ?? "--"}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="block text-cyan-300 font-semibold">
                        {found === false
                          ? "Sin cuotas disponibles para este partido (API)."
                          : "Tocando el partido se cargan cuotas 1X2 y O/U 2.5."}
                      </span>
                    )}

                    <span className="hidden md:block text-[11px] text-slate-400">
                      Cuotas provienen de API-Football (mercado).
                    </span>
                  </div>

                  {/* Bolita de selección */}
                  <div className="w-6 flex justify-end">
                    <span
                      className={[
                        "inline-block w-3.5 h-3.5 rounded-full border",
                        isSelected
                          ? "border-emerald-400 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                          : "border-slate-500/80 bg-slate-950/90",
                      ].join(" ")}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Tarjetas */}
      <section className="mt-4 space-y-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-200 mb-2">
            Cuota segura (Regalo)
            <span className="ml-2 text-[11px] text-yellow-100/90">x1.5–x3 · 90–95% acierto</span>
          </div>
          <p className="text-slate-200 text-sm">
            Próximamente: resultados basados en tus filtros para usar como “regalo” diario a tu comunidad (alta probabilidad, cuota baja).
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 mb-2">
            Cuotas potenciadas
            <span className="ml-2 text-[11px] text-emerald-100/90">hasta x{maxBoost}</span>
          </div>

          {fixtures.length === 0 ? (
            <p className="text-slate-300 text-sm mb-3">
              Genera primero partidos con el botón de arriba para construir tus cuotas potenciadas.
            </p>
          ) : (
            <p className="text-slate-300 text-sm mb-3">
              Tu membresía permite combinadas hasta <span className="font-semibold">x{maxBoost}</span>. Selecciona varios partidos de la lista superior o deja que Factor Victoria arme una combinada automática.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <button
              type="button"
              onClick={handleAutoParlay}
              disabled={!fixtures.length}
              className="flex-1 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold border border-emerald-400/70 bg-emerald-500/10 text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Combinada máxima automática (x{maxBoost})
            </button>

            <button
              type="button"
              onClick={handleSelectedParlay}
              disabled={!fixtures.length}
              className="flex-1 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold border border-cyan-400/70 bg-cyan-500/10 text-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Con partidos seleccionados ({selectedCount})
            </button>
          </div>

          {parlayError && <p className="text-xs text-amber-300 mt-1">{parlayError}</p>}

          {parlayResult && (
            <div className="mt-3 text-sm text-slate-200">
              <p className="font-semibold mb-1">
                {parlayResult.mode === "auto"
                  ? `Ejemplo de combinada automática: ${parlayResult.games} partidos, cuota x${parlayResult.finalOdd}`
                  : `Ejemplo con tus partidos seleccionados: ${parlayResult.games} partidos, cuota x${parlayResult.finalOdd}`}
              </p>

              <p className="text-xs text-slate-400">
                ✅ Cada selección individual tiene una probabilidad estimada superior al 90%.
                <br />
                📉 El porcentaje total disminuye a medida que agregas más partidos a tu combinada.
              </p>

              {!parlayResult.reachedTarget && (
                <p className="text-xs text-amber-200 mt-2">
                  Nota: con esta selección no se alcanzó la cuota objetivo x{parlayResult.target}.
                  <br />
                  Factor Victoria priorizó una cuota máxima controlada y de alta precisión basada en tus elecciones.
                  <br />
                  Agrega 1–3 partidos más si deseas acercarte al potencial máximo de tu plan.
                </p>
              )}
            </div>
          )}

          {!parlayResult && !parlayError && fixtures.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Mientras tanto, estas combinadas son un ejemplo visual. Más adelante se calcularán con las cuotas reales de los partidos.
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 mb-2">
            Árbitros más tarjeteros
          </div>
          <p className="text-slate-200 text-sm">
            Genera para ver recomendaciones sobre partidos con árbitros propensos a sacar tarjetas (ideal para over tarjetas).
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 mb-2">
            Cuota desfase del mercado
          </div>
          <p className="text-slate-200 text-sm">
            Próximamente: Factor Victoria te mostrará posibles errores de mercado con valor esperado positivo según tus filtros.
          </p>
        </div>
      </section>
    </div>
  );
}
