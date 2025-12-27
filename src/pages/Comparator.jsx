// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

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
  mexico: "Mexico",
  eeuu: "USA",
  estadosunidos: "USA",
};

function normalizeCountryQuery(q) {
  const key = String(q || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");
  return COUNTRY_ALIAS[key] || null;
}

// Emojis de banderas (fallback a 🏳️)
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
  "CONMEBOL Sudamericana",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Copa del Rey",
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
  const iso = f.date || f.fixture?.date;
  if (typeof iso === "string" && iso.includes("T")) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return f.time || f.hour || "--:--";
}

/** FUTUROS */
function isFutureFixture(fx) {
  const now = Date.now();

  const ts = fx.timestamp || fx.fixture?.timestamp || null;
  if (ts) {
    const ms = Number(ts) * 1000;
    if (!Number.isNaN(ms)) return ms > now;
  }

  const iso = fx.date || fx.fixture?.date || null;
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.getTime() > now;
  }

  return true;
}

/** Filtra juveniles / reservas / femenino */
function isYouthOrWomenOrReserve(fx) {
  const blob = `${getLeagueName(fx)} ${getHomeName(fx)} ${getAwayName(fx)}`.toLowerCase();
  const banned = [
    "u17","u18","u19","u20","u21","u23",
    "reserves","reserve","youth","juvenil",
    "sub-","sub ",
    " women","womens","femen"," fem"," w ",
    " ii"," b ",
  ];
  return banned.some((p) => blob.includes(p));
}

/** Solo ligas “top” (con fallback automático si deja 0) */
function isMajorLeague(fx) {
  const name = String(getLeagueName(fx) || "").toLowerCase();
  const country = String(getCountryName(fx) || "").toLowerCase();

  const hit = IMPORTANT_LEAGUES.some((imp) => name.includes(String(imp).toLowerCase()));
  if (hit) return true;

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

/* --------------------- Plan & Features --------------------- */

function normalizePlanLabel(raw) {
  const p = String(raw || "").toUpperCase();
  if (p.includes("VITA")) return "VITALICIO";
  if (p.includes("ANU")) return "ANUAL";
  if (p.includes("TRI") || p.includes("3")) return "TRIMESTRAL";
  if (p.includes("MES")) return "MENSUAL";
  return "MENSUAL";
}

function getMaxBoostFromPlan(planLabel) {
  if (planLabel === "VITALICIO") return 100;
  if (planLabel === "ANUAL") return 50;
  if (planLabel === "TRIMESTRAL") return 20;
  return 10;
}

function getPlanFeatures(planLabel) {
  const base = { giftPick: true, boosted: true };

  if (planLabel === "MENSUAL") {
    return { ...base, referees: false, marketValue: false, scorers: false, shooters: 0 };
  }
  if (planLabel === "TRIMESTRAL") {
    return { ...base, referees: false, marketValue: false, scorers: false, shooters: 0 };
  }
  if (planLabel === "ANUAL") {
    return { ...base, referees: true, marketValue: false, scorers: false, shooters: 5 };
  }
  // VITALICIO
  return { ...base, referees: true, marketValue: true, scorers: true, shooters: 10 };
}

function FeatureCard({ title, badge, children, locked, lockText }) {
  return (
    <div className="relative rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm md:text-base font-semibold text-slate-50">{title}</div>
          {badge && (
            <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-200">
              {badge}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">{children}</div>

      {locked && (
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="max-w-sm text-center">
            <div className="text-sm font-semibold text-slate-50">Bloqueado por plan</div>
            <div className="mt-1 text-xs text-slate-300">{lockText || "Disponible en planes superiores."}</div>
            <Link
              to="/"
              className="inline-flex mt-3 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-yellow-400/60 bg-yellow-500/10 text-yellow-200"
            >
              Ver planes
            </Link>
          </div>
        </div>
      )}
    </div>
  );
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

  // odds cache
  const [oddsByFixture, setOddsByFixture] = useState({});

  // referees module
  const [refData, setRefData] = useState(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refErr, setRefErr] = useState("");

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
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "MENSUAL";
    return normalizePlanLabel(raw);
  }, [user]);

  const maxBoost = getMaxBoostFromPlan(planLabel);
  const features = useMemo(() => getPlanFeatures(planLabel), [planLabel]);

  const quickCountries = ["Chile","España","Portugal","Italia","Alemania","Argentina","Inglaterra","Francia"];

  const ensureOdds = useCallback(async (fixtureId) => {
    if (!fixtureId) return;
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
    } catch {
      // silencio
    }
  }, [oddsByFixture]);

  const loadReferees = useCallback(async (fromArg, toArg, countryENOrNull) => {
    try {
      setRefErr("");
      setRefLoading(true);

      const params = new URLSearchParams();
      params.set("from", fromArg);
      params.set("to", toArg);
      if (countryENOrNull) params.set("country", countryENOrNull);

      const r = await fetch(`${API_BASE}/api/referees/cards?${params.toString()}`);

      // si el endpoint aún no existe, lo mostramos como “en construcción” y no rompemos nada
      if (r.status === 404) {
        setRefData(null);
        setRefErr("Módulo en construcción: falta crear /api/referees/cards en el backend.");
        return;
      }

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || `HTTP ${r.status}`);

      setRefData(j);
    } catch (e) {
      setRefData(null);
      setRefErr(String(e?.message || e));
    } finally {
      setRefLoading(false);
    }
  }, []);

  async function handleGenerate(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setOddsByFixture({});
    setParlayResult(null);
    setParlayError("");
    setLoading(true);

    // también reseteamos módulo árbitros
    setRefData(null);
    setRefErr("");

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const itemsRaw =
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.response) && data.response) ||
        [];

      const base = itemsRaw
        .filter(isFutureFixture)
        .filter((fx) => !isYouthOrWomenOrReserve(fx));

      const major = base.filter(isMajorLeague);
      const filtered = major.length >= 8 ? major : base;

      const sorted = [...filtered].sort((a, b) => {
        const prioA = getLeaguePriority(getLeagueName(a), getCountryName(a));
        const prioB = getLeaguePriority(getLeagueName(b), getCountryName(b));
        if (prioA !== prioB) return prioA - prioB;

        const tA = getKickoffTime(a) || "";
        const tB = getKickoffTime(b) || "";
        return tA.localeCompare(tB);
      });

      const LIMITED = sorted.slice(0, 140);

      if (!LIMITED.length) {
        setErr(
          `No encontramos partidos para ese rango. API devolvió: ${itemsRaw.length} | base: ${base.length} | ligas top: ${major.length}. ` +
          `Prueba con 7–14 días y sin filtro (q vacío).`
        );
        setFixtures([]);
        return;
      }

      setFixtures(LIMITED);
      setInfo(`API: ${itemsRaw.length} | base: ${base.length} | top: ${major.length} | mostrando: ${LIMITED.length}`);

      // ---- cargar árbitros tarjeteros (solo si plan lo permite) ----
      if (features.referees) {
        const countryENForRefs = normalizeCountryQuery(qTrim);
        await loadReferees(from, to, countryENForRefs);
      } else {
        setRefData(null);
      }
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  }

  function handleQuickCountry(countryEs) {
    setQ(countryEs);
  }

  function toggleFixtureSelection(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedCount = selectedIds.length;

  function fakeOddForFixture(fx) {
    const id = getFixtureId(fx);
    const key = String(id || getHomeName(fx) + getAwayName(fx));
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 7)) % 1000;
    const base = 1.2 + (hash % 26) / 10;
    return Number(base.toFixed(2));
  }

  function buildComboSuggestion(fixturesPool, maxBoostArg) {
    if (!Array.isArray(fixturesPool) || fixturesPool.length === 0) return null;

    const picks = [];
    let product = 1;

    for (const fx of fixturesPool) {
      const odd = fakeOddForFixture(fx);
      if (product * odd > maxBoostArg * 1.35) continue;

      product *= odd;
      picks.push({ id: getFixtureId(fx), label: `${getHomeName(fx)} vs ${getAwayName(fx)}`, odd });

      if (picks.length >= 12) break;
      if (product >= maxBoostArg * 0.8) break;
    }

    if (!picks.length) return null;

    const finalOdd = Number(product.toFixed(2));
    const impliedProb = Number(((1 / finalOdd) * 100).toFixed(1));
    const reachedTarget = finalOdd >= maxBoostArg * 0.8;

    return { games: picks.length, finalOdd, target: maxBoostArg, impliedProb, reachedTarget };
  }

  async function handleAutoParlay() {
    setParlayError("");
    setParlayResult(null);

    if (!fixtures.length) {
      setParlayError("Genera primero partidos con el botón de arriba.");
      return;
    }

    fixtures.slice(0, 10).map(getFixtureId).filter(Boolean).forEach((id) => ensureOdds(id));

    const suggestion = buildComboSuggestion(fixtures, maxBoost);
    if (!suggestion) {
      setParlayError("No pudimos armar una combinada razonable con los partidos cargados. Prueba con otro rango de fechas.");
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
            <span className="font-semibold">{planLabel}</span>. Elige un rango de fechas y filtra por país, liga o equipo para generar tus parlays.
          </p>
        ) : (
          <p className="text-slate-300 text-sm md:text-base">
            Modo visitante: prueba la plataforma con información limitada.{" "}
            <Link to="/" className="underline font-semibold">Activa una membresía</Link>{" "}
            para desbloquear el comparador profesional.
          </p>
        )}
      </section>

      {/* Filtros */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <form onSubmit={handleGenerate} className="flex flex-col md:flex-row md:items-end gap-3 items-stretch">
          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-1">
            <label className="block text-xs text-slate-400 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
            />
          </div>

          <div className="flex-[2]">
            <label className="block text-xs text-slate-400 mb-1">Filtro (país / liga / equipo)</label>
            <input
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

        {err && (
          <div className="mt-3 text-sm text-amber-300">
            {err}{" "}
            {!isLoggedIn && <Link to="/" className="underline font-semibold">Ver planes</Link>}
          </div>
        )}
        {!err && info && <div className="mt-3 text-xs text-slate-400">{info}</div>}
      </section>

      {/* Lista de partidos */}
      <section className="mt-4 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 text-[11px] md:text-xs text-slate-300 tracking-wide">
          <span className="uppercase">
            Partidos encontrados:{" "}
            <span className="font-semibold text-slate-50">{fixtures.length}</span>
          </span>
          <span className="uppercase text-right">Toca un partido para añadirlo / quitarlo de tu combinada.</span>
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
              const found = oddsPack?.found;

              const hasOdds =
                (m1x2 && (m1x2.home != null || m1x2.draw != null || m1x2.away != null)) ||
                (mou && (mou.over != null || mou.under != null));

              return (
                <li
                  key={id}
                  onClick={() => {
                    toggleFixtureSelection(id);
                    ensureOdds(id);
                    setParlayResult(null);
                    setParlayError("");
                  }}
                  className={[
                    "px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors",
                    isSelected ? "bg-slate-900/90" : "hover:bg-slate-900/70",
                  ].join(" ")}
                >
                  <div className="w-14 text-[11px] md:text-xs font-semibold text-slate-100">{time || "--:--"}</div>

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

                  <div className="w-[40%] md:w-[32%] text-right text-[11px] md:text-xs leading-snug">
                    {hasOdds ? (
                      <div className="text-slate-200">
                        {m1x2 && (
                          <div className="text-cyan-200 font-semibold">
                            1X2: <span className="text-slate-100">1</span> {m1x2.home ?? "--"}{" "}
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
                        {found === false ? "Sin cuotas disponibles para este partido (API)." : "Toca para cargar cuotas 1X2 y O/U 2.5."}
                      </span>
                    )}
                  </div>

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

      {/* Módulos Premium (grid) */}
      <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeatureCard
          title="Cuota segura (Regalo)"
          badge="x1.5–x3 · 90–95% acierto"
          locked={!features.giftPick}
          lockText="Disponible desde el plan Mensual."
        >
          <p className="text-slate-200 text-sm">
            Próximamente: un “regalo” diario de alta probabilidad basado en tus filtros y calendario de partidos.
          </p>
        </FeatureCard>

        <FeatureCard
          title="Cuotas potenciadas"
          badge={`hasta x${maxBoost}`}
          locked={!features.boosted}
          lockText="Disponible desde el plan Mensual."
        >
          {fixtures.length === 0 ? (
            <p className="text-slate-300 text-sm mb-3">Genera primero partidos para construir tus cuotas potenciadas.</p>
          ) : (
            <p className="text-slate-300 text-sm mb-3">
              Tu plan permite combinadas hasta <span className="font-semibold">x{maxBoost}</span>. Selecciona partidos o genera una combinada automática.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
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

          {parlayError && <p className="text-xs text-amber-300 mt-2">{parlayError}</p>}

          {parlayResult && (
            <div className="mt-3 text-sm text-slate-200">
              <p className="font-semibold mb-1">
                {parlayResult.mode === "auto"
                  ? `Ejemplo automático: ${parlayResult.games} partidos, cuota x${parlayResult.finalOdd}`
                  : `Ejemplo con tu selección: ${parlayResult.games} partidos, cuota x${parlayResult.finalOdd}`}
              </p>
              <p className="text-xs text-slate-400">
                Nota: hoy es un ejemplo visual. Luego se calculará con cuotas reales por mercado.
              </p>
            </div>
          )}
        </FeatureCard>

        <FeatureCard
          title="Árbitros más tarjeteros"
          badge="Over tarjetas · Historial"
          locked={!features.referees}
          lockText="Disponible desde el plan Anual."
        >
          <div className="text-sm text-slate-200">
            {refLoading && <div className="text-xs text-slate-400">Cargando árbitros...</div>}
            {refErr && <div className="text-xs text-amber-300">{refErr}</div>}

            {!refLoading && !refErr && (
              <div className="text-xs text-slate-400">
                Genera partidos para ver el top de árbitros y el “partido recomendado”.
              </div>
            )}

            {!refLoading && !refErr && refData?.topReferees?.length > 0 && (
              <>
                <div className="text-xs text-slate-400 mb-2 mt-2">Top árbitros</div>
                <ul className="space-y-1">
                  {refData.topReferees.slice(0, 10).map((r) => (
                    <li key={r.name} className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">{r.name}</span>
                      <span className="text-amber-200 font-semibold">
                        {r.avgCards != null ? `${r.avgCards} tarjetas / partido` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-slate-400">🔥 Partido recomendado por árbitro tarjetero</div>

                  {refData?.recommended ? (
                    <>
                      <div className="mt-1 text-sm font-semibold text-slate-50">
                        {refData.recommended.referee?.name}{" "}
                        {refData.recommended.referee?.avgCards != null && (
                          <span className="text-amber-200">(prom. {refData.recommended.referee.avgCards} tarjetas)</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-300">
                        {refData.recommended.fixture?.teams?.home?.name} vs {refData.recommended.fixture?.teams?.away?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {refData.recommended.fixture?.league?.country} · {refData.recommended.fixture?.league?.name}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-xs text-slate-300">
                      Aún no se le ha asignado un partido en este rango. Prueba ampliando fechas o quitando el filtro país.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </FeatureCard>

        <FeatureCard
          title="Probabilidad alta de gol"
          badge="BTTS · Over 1.5 · Over 2.5"
          locked={false}
        >
          <p className="text-slate-200 text-sm">
            Recomendación de partidos con alta probabilidad de gol (modelo interno). Lo conectamos cuando definamos el scoring.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Sugerencia: mostrar “Top 5 del día” + “Top 1 recomendado”.
          </p>
        </FeatureCard>

        <FeatureCard
          title="Desfase del mercado (Value)"
          badge="Cuotas con valor esperado"
          locked={!features.marketValue}
          lockText="Disponible en Vitalicio (VIP)."
        >
          <p className="text-slate-200 text-sm">
            Señales de value cuando la cuota del mercado se separa del precio “justo” estimado por Factor Victoria.
          </p>
        </FeatureCard>

        <FeatureCard
          title="Jugadores más goleadores"
          badge="Goleadores · Rachas"
          locked={!features.scorers}
          lockText="Disponible en Vitalicio."
        >
          <p className="text-slate-200 text-sm">
            Top goleadores por liga/fecha y rachas recientes. Ideal para mercados “anota” / “tiros a puerta”.
          </p>
        </FeatureCard>

        <FeatureCard
          title="Remates al arco"
          badge={features.shooters ? `Top ${features.shooters}` : "Top jugadores"}
          locked={features.shooters === 0}
          lockText="Top 5 en Anual · Top 10 en Vitalicio."
        >
          <p className="text-slate-200 text-sm">
            Ranking de jugadores con más remates a puerta (por liga/fecha). Perfecto para props: “+1 tiro a puerta”.
          </p>
        </FeatureCard>
      </section>
    </div>
  );
}
