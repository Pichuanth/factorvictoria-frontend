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

// Emoji banderas simples (no es perfecto pero se ve pro)
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

// Prioridad de ligas importantes (para ordenar tipo Flashscore)
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

  // 0–9: súper importantes
  for (let i = 0; i < IMPORTANT_LEAGUES.length; i++) {
    if (name.includes(IMPORTANT_LEAGUES[i].toLowerCase())) {
      return i; // cuanto más chico, más arriba
    }
  }

  // 10–19: ligas grandes por país
  if (["england", "spain", "italy", "germany", "france"].includes(countryLower))
    return 12;

  if (["chile", "argentina", "brazil", "portugal", "mexico"].includes(countryLower))
    return 14;

  // 20+: resto
  return 25;
}

// Funciones defensivas para leer campos sin romperse si cambia el backend
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
  // hora tipo "18:00"
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
  return f.hour || "--:--";
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
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
    return String(raw || "").toUpperCase();
  }, [user]);

  async function handleGenerate(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setLoading(true);

    // Bloqueo duro para visitantes (puede ajustarse a demo limitada si quieres)
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
        // filtro por país (Chile, Argentina, etc.)
        params.set("country", countryEN);
      } else if (qTrim) {
        // texto libre: liga, equipo, etc.
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

      // Ordenar tipo Flashscore: primero ligas importantes, luego por hora
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

  // Selección de partidos para la futura cuota x100
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
<section
  className="mt-4 rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.85)]"
>
  {/* Cabecera de la lista */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 text-[11px] md:text-xs text-slate-300 tracking-wide">
    <span className="uppercase">
      Partidos futuros encontrados:{" "}
      <span className="font-semibold text-slate-50">{fixtures.length}</span>
    </span>
    <span className="uppercase text-right">
      Toca un partido para añadirlo / quitarlo de tu combinada.
    </span>
  </div>

  {/* Si no hay partidos */}
  {fixtures.length === 0 ? (
    <div className="px-4 py-6 text-sm text-slate-300">
      Por ahora no hay partidos futuros para este rango o filtro. Prueba con más
      días o sin filtrar por país/equipo.
    </div>
  ) : (
    <ul className="divide-y divide-slate-800/80">
      {fixtures.map((fx) => {
        // Usamos el helper para un id estable
        const id = getFixtureId(fx);
        const isSelected = selectedIds.includes(id);

        const league =
          fx.league?.name ??
          fx.liga ??
          fx.leagueName ??
          "";

        const country =
          fx.league?.country ??
          fx.country ??
          fx.pais ??
          "";

        const flag =
          fx.league?.flag ??
          fx.flag ??
          fx.countryFlag ??
          "";

        const home =
          fx.teams?.home?.name ??
          fx.homeTeam ??
          fx.local ??
          "";

        const away =
          fx.teams?.away?.name ??
          fx.awayTeam ??
          fx.visitante ??
          "";

        // Hora (si ya tienes un campo listo, puedes sustituir esto)
        let time = "";
        if (fx.fixture?.date) {
          time = fx.fixture.date.slice(11, 16); // "HH:MM"
        } else if (fx.hora) {
          time = fx.hora;
        }

        return (
          <li
            key={id}
            onClick={() => toggleFixtureSelection(id)}
            className={[
              "px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors",
              isSelected ? "bg-slate-900/90" : "hover:bg-slate-900/70",
            ].join(" ")}
          >
            {/* Columna hora */}
            <div className="w-14 text-[11px] md:text-xs font-semibold text-slate-100">
              {time}
            </div>

            {/* Columna centro: país/competición + equipos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs md:text-sm text-slate-200">
                {flag && (
                  <span className="mr-1 text-lg leading-none">
                    {/* Si el flag es emoji se ve bien; si es URL se podría cambiar a <img> más adelante */}
                    {flag}
                  </span>
                )}
                {country && (
                  <span className="font-medium truncate">{country}</span>
                )}
                {league && (
                  <span className="text-[11px] md:text-xs text-slate-400 truncate">
                    {" "}
                    · {league}
                  </span>
                )}
              </div>

              <div className="mt-0.5 text-xs md:text-sm text-slate-100 truncate">
                <span className="font-semibold truncate">{home}</span>
                <span className="mx-1 text-slate-400">vs</span>
                <span className="font-semibold truncate">{away}</span>
              </div>
            </div>

            {/* Columna derecha: placeholder de cuotas en celeste */}
            <div className="w-[40%] md:w-[32%] text-right text-[11px] md:text-xs leading-snug">
              <span className="block text-cyan-300 font-semibold">
                Próximamente: cuotas 1X2 y valor esperado.
              </span>
              <span className="hidden md:block text-[11px] text-slate-400">
                Aquí verás las cuotas sugeridas para este partido.
              </span>
            </div>

            {/* Bolita de selección: se pinta cuando está seleccionado */}
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
          <p className="text-slate-200 text-sm">
            Próximamente: resultados basados en tus filtros para usar como
            “regalo” diario a tu comunidad (alta probabilidad, cuota baja).
          </p>
        </div>

        {/* Cuota generada x100 */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 mb-2">
            Cuota generada
            <span className="ml-2 text-[11px] text-emerald-100/90">x100</span>
          </div>

          {fixtures.length === 0 ? (
            <p className="text-slate-300 text-sm">
              Aún no hay picks para este rango o filtro. Genera primero partidos
              con el botón de arriba.
            </p>
          ) : selectedCount === 0 ? (
            <p className="text-slate-300 text-sm">
              Selecciona varios partidos de la lista superior para empezar a
              construir tu combinada objetivo x100.
            </p>
          ) : (
            <p className="text-slate-200 text-sm">
              Has seleccionado{" "}
              <span className="font-semibold">{selectedCount}</span>{" "}
              partidos. Próximamente, Factor Victoria combinará estos partidos y
              sus cuotas para acercarse automáticamente a una cuota objetivo
              cercana a x100.
            </p>
          )}
        </div>

        {/* Árbitros más tarjeteros */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-200 mb-2">
            Árbitros más tarjeteros
          </div>
          <p className="text-slate-200 text-sm">
            Genera para ver recomendaciones sobre partidos con árbitros
            propensos a sacar tarjetas (ideal para over tarjetas).
          </p>
        </div>

        {/* Cuota desfase del mercado */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 mb-2">
            Cuota desfase del mercado
          </div>
          <p className="text-slate-200 text-sm">
            Próximamente: Factor Victoria te mostrará posibles errores de
            mercado con valor esperado positivo según tus filtros.
          </p>
        </div>
      </section>
    </div>
  );
}
