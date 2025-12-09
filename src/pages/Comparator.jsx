// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

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
};

function normalizeCountryQuery(q) {
  const key = String(q || "").toLowerCase().trim();
  return COUNTRY_ALIAS[key] || null;
}

// Emoji banderas simples (fallback cuando no viene flag URL)
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

// Ligas importantes (para ordenar tipo Flashscore)
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
    if (name.includes(IMPORTANT_LEAGUES[i].toLowerCase())) {
      return i; // cuanto más chico, más arriba
    }
  }

  if (["england", "spain", "italy", "germany", "france"].includes(countryLower))
    return 12;

  if (["chile", "argentina", "brazil", "portugal", "mexico"].includes(countryLower))
    return 14;

  return 25;
}

// Helpers defensivos para leer campos del backend
function getFixtureId(f) {
  return (
    f.id ||
    f.fixtureId ||
    f.fixture_id ||
    f.fixture?.id ||
    `${f.league?.id || ""}-${f.timestamp || f.date}`
  );
}

function getLeagueName(f) {
  return (
    f.league?.name ||
    f.leagueName ||
    f.league_name ||
    f.competition ||
    "Liga desconocida"
  );
}

function getCountryName(f) {
  return (
    f.league?.country ||
    f.country ||
    f.country_name ||
    f.location ||
    "World"
  );
}

function getHomeName(f) {
  return (
    f.homeTeam ||
    f.home_name ||
    f.localTeam ||
    f.team_home ||
    f.teams?.home?.name ||
    "Local"
  );
}

function getAwayName(f) {
  return (
    f.awayTeam ||
    f.away_name ||
    f.visitTeam ||
    f.team_away ||
    f.teams?.away?.name ||
    "Visita"
  );
}

function getKickoffTime(f) {
  if (f.time) return f.time;
  if (f.kickoffTime) return f.kickoffTime;

  if (typeof f.date === "string" && f.date.includes("T")) {
    try {
      const d = new Date(f.date);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "--:--";
    }
  }
  if (f.fixture?.date) {
    try {
      const d = new Date(f.fixture.date);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    } catch {
      return "--:--";
    }
  }

  return f.hour || f.hora || "--:--";
}

// Detectar tipo de membresía a partir del label
function getMembershipTier(planLabel) {
  const t = String(planLabel || "").toUpperCase();

  if (!t || t.includes("DEMO") || t.includes("FREE")) return "DEMO";
  if (t.includes("VITAL")) return "VITALICIO";
  if (t.includes("ANUAL") || t.includes("ANNUAL") || t.includes("YEAR"))
    return "ANUAL";
  if (t.includes("TRIM") || t.includes("3M")) return "TRIMESTRAL";
  if (t.includes("MES") || t.includes("MENSUAL") || t.includes("MONTH"))
    return "MENSUAL";

  // fallback: al menos mensual
  return "MENSUAL";
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

  // Prefill desde /fixture -> "Generar" (date & q en la URL)
  useEffect(() => {
    const urlDate = searchParams.get("date");
    const urlQ = searchParams.get("q");
    if (urlDate) {
      setFrom(urlDate);
      setTo(urlDate);
    }
    if (urlQ) {
      setQ(urlQ);
    }
  }, [searchParams]);

  const planLabel = useMemo(() => {
    const raw =
      user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "").toUpperCase();
  }, [user]);

  const tier = useMemo(() => getMembershipTier(planLabel), [planLabel]);

  // Reglas por membresía
  const canUseRegalo = tier !== "DEMO";
  const canUsePotenciadas = tier !== "DEMO";

  const maxPotenciadaLabel =
    tier === "VITALICIO"
      ? "x100"
      : tier === "ANUAL"
      ? "x50"
      : tier === "TRIMESTRAL"
      ? "x20"
      : tier === "MENSUAL"
      ? "x10"
      : "x10";

  const hasDesfase = tier === "ANUAL" || tier === "VITALICIO";
  const hasArbitros = tier === "VITALICIO";

  async function handleGenerate(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setLoading(true);

    if (!isLoggedIn) {
      setLoading(false);
      setErr(
        "Necesitas iniciar sesión y tener una membresía activa para usar el comparador. Usa la pestaña Partidos mientras tanto."
      );
      return;
    }

    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      params.set("status", "NS"); // solo partidos futuros / no iniciados

      const qTrim = String(q || "").trim();
      const countryEN = normalizeCountryQuery(qTrim);

      if (countryEN) {
        params.set("country", countryEN);
      } else if (qTrim) {
        params.set("q", qTrim);
      }

      const res = await fetch(`/api/fixtures?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} – ${res.statusText || ""}`);
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      if (!items.length) {
        setErr(
          "Por ahora no hay partidos futuros reales suficientes para este rango o filtro. Prueba con más días o sin filtrar por país/equipo."
        );
        setFixtures([]);
        return;
      }

      // Orden tipo Flashscore
      const sorted = [...items].sort((a, b) => {
        const prioA = getLeaguePriority(getLeagueName(a), getCountryName(a));
        const prioB = getLeaguePriority(getLeagueName(b), getCountryName(b));
        if (prioA !== prioB) return prioA - prioB;

        const tA = getKickoffTime(a) || "";
        const tB = getKickoffTime(b) || "";
        return tA.localeCompare(tB);
      });

      setFixtures(sorted);
      setInfo(
        `Se encontraron ${sorted.length} partidos futuros para este rango de fechas. Puedes seleccionar partidos para armar tus parlays.`
      );
    } catch (e) {
      console.error(e);
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Botón rápido de país
  function handleQuickCountry(countryEs) {
    setQ(countryEs);
  }

  const quickCountries = ["Chile", "Argentina", "España", "Inglaterra", "Francia"];

  // Selección de partidos para futuras cuotas
  function toggleFixtureSelection(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedCount = selectedIds.length;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Comparador</h1>

        {isLoggedIn ? (
          <p className="text-slate-300 text-sm md:text-base">
            Estás usando Factor Victoria con tu membresía{" "}
            <span className="font-semibold">{planLabel || "ACTIVA"}</span>. Elige un
            rango de fechas y filtra por país, liga o equipo para generar tus parlays.
          </p>
        ) : (
          <p className="text-slate-300 text-sm md:text-base">
            Modo visitante: prueba el comparador con filtros reales pero con
            funcionalidad limitada.{" "}
            <Link to="/" className="underline font-semibold">
              Activa una membresía
            </Link>{" "}
            para desbloquear todas las herramientas profesionales.
          </p>
        )}
      </section>

      {/* Filtros */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <form
          onSubmit={handleGenerate}
          className="flex flex-col md:flex-row md:items-end gap-3 items-stretch"
        >
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
            <label className="block text-xs text-slate-400 mb-1">
              Filtro (país / liga / equipo)
            </label>
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
                <Link to="/" className="underline font-semibold">
                  Ver planes
                </Link>
              </>
            )}
          </div>
        )}

        {!err && info && (
          <div className="mt-3 text-xs text-slate-400">{info}</div>
        )}
      </section>

      {/* Lista compacta de partidos (estilo Novibet / Flashscore) */}
      <section className="mt-4 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.85)]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 text-[11px] md:text-xs text-slate-300 tracking-wide">
          <span className="uppercase">
            Partidos futuros encontrados:{" "}
            <span className="font-semibold text-slate-50">
              {fixtures.length}
            </span>
          </span>
          <span className="uppercase text-right hidden sm:block">
            Toca un partido para añadirlo / quitarlo de tu combinada.
          </span>
        </div>

        {fixtures.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-300">
            Por ahora no hay partidos futuros para este rango o filtro. Prueba
            con más días o sin filtrar por país/equipo.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {fixtures.map((fx) => {
              const id = getFixtureId(fx);
              const isSelected = selectedIds.includes(id);

              const leagueName = getLeagueName(fx);
              const countryName = getCountryName(fx);
              const home = getHomeName(fx);
              const away = getAwayName(fx);
              const time = getKickoffTime(fx);

              const flagUrl = fx.league?.flag || fx.flag || fx.countryFlag;
              const flagEmoji = COUNTRY_FLAG[countryName] || "";

              return (
                <li
                  key={id}
                  onClick={() => toggleFixtureSelection(id)}
                  className={[
                    "px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors",
                    isSelected ? "bg-slate-900/90" : "hover:bg-slate-900/70",
                  ].join(" ")}
                >
                  {/* Hora */}
                  <div className="w-12 text-[11px] md:text-xs font-semibold text-slate-100 flex-shrink-0">
                    {time}
                  </div>

                  {/* Centro: país / liga / equipos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-200">
                      {(flagUrl || flagEmoji) && (
                        <span className="mr-1 flex-shrink-0">
                          {flagUrl ? (
                            <img
                              src={flagUrl}
                              alt={countryName}
                              className="w-4 h-4 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <span className="text-lg leading-none">
                              {flagEmoji}
                            </span>
                          )}
                        </span>
                      )}

                      {countryName && (
                        <span className="font-medium truncate max-w-[80px] sm:max-w-none">
                          {countryName}
                        </span>
                      )}

                      {leagueName && (
                        <span className="hidden sm:inline text-[11px] md:text-xs text-slate-400 truncate">
                          {" · "}
                          {leagueName}
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 text-xs md:text-sm text-slate-100">
                      <span className="font-semibold truncate inline-block max-w-[45%]">
                        {home}
                      </span>
                      <span className="mx-1 text-slate-400">vs</span>
                      <span className="font-semibold truncate inline-block max-w-[45%] text-right">
                        {away}
                      </span>
                    </div>
                  </div>

                  {/* Derecha: placeholder cuotas */}
                  <div className="w-[42%] sm:w-[34%] md:w-[32%] text-right text-[11px] md:text-xs leading-snug">
                    <span className="block text-cyan-300 font-semibold">
                      Próximamente: cuotas 1X2 y valor esperado.
                    </span>
                    <span className="hidden md:block text-[11px] text-slate-400">
                      Aquí verás las cuotas sugeridas para este partido.
                    </span>
                  </div>

                  {/* Bolita selección */}
                  <div className="w-6 flex justify-end flex-shrink-0">
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

      {/* Tarjetas de resultados / productos del comparador */}
      <section className="mt-4 space-y-4">
        {/* Cuota segura (regalo) */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-200 mb-2">
            Cuota segura (Regalo)
            <span className="ml-2 text-[11px] text-yellow-100/90">
              x1.5–x3 · 90–95% acierto
            </span>
          </div>

          {!canUseRegalo ? (
            <p className="text-slate-400 text-sm">
              Disponible desde el plan <span className="font-semibold">Mensual</span>.
              {" "}
              <Link to="/" className="underline font-semibold">
                Sube tu membresía
              </Link>{" "}
              para desbloquear este tipo de cuota de regalo.
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              Próximamente: resultados basados en tus filtros para usar como
              “regalo” diario a tu comunidad (alta probabilidad, cuota baja).
            </p>
          )}
        </div>

        {/* Cuotas potenciadas */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 mb-2">
            Cuotas potenciadas
            <span className="ml-2 text-[11px] text-emerald-100/90">
              hasta {maxPotenciadaLabel}
            </span>
          </div>

          {!canUsePotenciadas ? (
            <p className="text-slate-400 text-sm">
              Las cuotas potenciadas están disponibles desde el plan{" "}
              <span className="font-semibold">Mensual</span> (x10),{" "}
              <span className="font-semibold">Trimestral</span> (x20),
              <span className="font-semibold"> Anual</span> (x50) y{" "}
              <span className="font-semibold">Vitalicio</span> (x100).
              {" "}
              <Link to="/" className="underline font-semibold">
                Revisa los planes
              </Link>
              .
            </p>
          ) : fixtures.length === 0 ? (
            <p className="text-slate-300 text-sm">
              Aún no hay picks para este rango o filtro. Genera primero partidos
              con el botón de arriba.
            </p>
          ) : selectedCount === 0 ? (
            <p className="text-slate-300 text-sm">
              Tu membresía permite combinadas hasta{" "}
              <span className="font-semibold">{maxPotenciadaLabel}</span>. Selecciona
              varios partidos de la lista superior para empezar a construir tus
              cuotas potenciadas.
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              Has seleccionado{" "}
              <span className="font-semibold">{selectedCount}</span>{" "}
              partidos. Próximamente, Factor Victoria combinará estos partidos y
              sus cuotas para acercarse automáticamente a una cuota objetivo
              acorde a tu plan (por ejemplo {maxPotenciadaLabel}).
            </p>
          )}
        </div>

        {/* Árbitros más tarjeteros */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 mb-2">
            Árbitros más tarjeteros
          </div>

          {!hasArbitros ? (
            <p className="text-slate-400 text-sm">
              Este módulo se desbloquea con la membresía{" "}
              <span className="font-semibold">Vitalicia</span>: partidos con
              árbitros muy propensos a sacar tarjetas (ideal over tarjetas).
              {" "}
              <Link to="/" className="underline font-semibold">
                Ver beneficios Vitalicio
              </Link>
              .
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              Genera para ver recomendaciones sobre partidos con árbitros
              propensos a sacar tarjetas (ideal para over tarjetas).
            </p>
          )}
        </div>

        {/* Cuota desfase del mercado */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 mb-2">
            Cuota desfase del mercado
          </div>

          {!hasDesfase ? (
            <p className="text-slate-400 text-sm">
              Disponible desde el plan{" "}
              <span className="font-semibold">Anual</span> y{" "}
              <span className="font-semibold">Vitalicio</span>. Detecta posibles
              errores de mercado con valor esperado positivo según tus filtros.
              {" "}
              <Link to="/" className="underline font-semibold">
                Mejora tu plan
              </Link>
              .
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              Próximamente: Factor Victoria te mostrará posibles errores de
              mercado con valor esperado positivo según tus filtros.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
