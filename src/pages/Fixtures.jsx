// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

// Fondos (public/)
const BG_CASILLAS = "/hero-fondo-casillas.png";
const BG_HERO_PARTIDOS = "/hero-profile-hud.png";
const BG_12000 = "/hero-12000.png";

// ---------- Mini UI ----------
function Chip({ children, style, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] border ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

function LockBadge() {
  return (
    <span
      className="inline-flex items-center justify-center h-6 w-6 rounded-md"
      style={{
        background: "rgba(230,196,100,0.14)",
        border: "1px solid rgba(230,196,100,0.30)",
        boxShadow: "0 0 18px rgba(230,196,100,0.18)",
      }}
      title="Contenido PRO"
      aria-label="Contenido PRO"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 11V8.8a5 5 0 0 1 10 0V11"
          stroke="rgba(255,241,199,0.95)"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M6.5 11h11A1.5 1.5 0 0 1 19 12.5v6A2.5 2.5 0 0 1 16.5 21h-9A2.5 2.5 0 0 1 5 18.5v-6A1.5 1.5 0 0 1 6.5 11Z"
          stroke="rgba(255,241,199,0.95)"
          strokeWidth="1.7"
        />
      </svg>
    </span>
  );
}

/**
 * Card con fondo (imagen) + overlays para legibilidad (igual estilo Perfil)
 */
function HudCard({
  bg,
  children,
  className = "",
  style = {},
  overlayVariant = "casillas", // "casillas" | "player" | "cta"
}) {
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.68) 52%, rgba(2,6,23,0.40) 78%, rgba(2,6,23,0.25) 100%)",
          "radial-gradient(circle at 18% 42%, rgba(16,185,129,0.18), rgba(2,6,23,0) 60%)",
          "radial-gradient(circle at 84% 52%, rgba(230,196,100,0.20), rgba(2,6,23,0) 58%)",
        ]
      : overlayVariant === "cta"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.70) 55%, rgba(2,6,23,0.42) 80%, rgba(2,6,23,0.22) 100%)",
          "radial-gradient(circle at 20% 55%, rgba(230,196,100,0.22), rgba(2,6,23,0) 58%)",
          "radial-gradient(circle at 78% 45%, rgba(16,185,129,0.18), rgba(2,6,23,0) 62%)",
        ]
      : [
          "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.62) 38%, rgba(2,6,23,0.86) 100%)",
          "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.18), rgba(2,6,23,0) 60%)",
          "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.14), rgba(2,6,23,0) 60%)",
        ];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-white/5 ${className}`}
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 36px rgba(230,196,100,0.10)`,
        ...style,
      }}
    >
      {bg ? (
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="absolute inset-0" style={{ background: overlayLayers[0] }} />
      <div className="absolute inset-0" style={{ background: overlayLayers[1] }} />
      <div className="absolute inset-0" style={{ background: overlayLayers[2] }} />

      <div className="relative">{children}</div>
    </div>
  );
}

// ---------- Helpers ----------
function toYYYYMMDD(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function prettyKickoff(dateStr, timeZone = "America/Santiago") {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CL", {
    timeZone,
    weekday: undefined,
    year: undefined,
    month: undefined,
    day: undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Page ----------
export default function Fixtures() {
  const { isLoggedIn } = useAuth();

  // API base (Vite)
  const API_BASE = (import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "");

  // Filtros
  const [date, setDate] = useState(() => toYYYYMMDD(new Date()));
  const [todayOnly, setTodayOnly] = useState(false);
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");

  // Data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fixtures, setFixtures] = useState([]);

  const timeZone = "America/Santiago";

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (date) p.set("date", date);
    if (country) p.set("country", country);
    if (league) p.set("league", league);
    if (team) p.set("team", team);
    if (todayOnly) p.set("today", "1");
    return p.toString();
  }, [date, country, league, team, todayOnly]);

  async function fetchFixtures() {
    setLoading(true);
    setError("");

    try {
      const url = `${API_BASE}/api/fixtures?${queryString}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error ${res.status}. ${txt || "No se pudo cargar fixtures."}`);
      }

      const data = await res.json();

      // Soporta varios formatos:
      // - { fixtures: [...] }
      // - { response: [...] } (API-FOOTBALL)
      // - [...] directo
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.fixtures)
        ? data.fixtures
        : Array.isArray(data?.response)
        ? data.response
        : [];

      setFixtures(list);
    } catch (e) {
      setFixtures([]);
      setError(e?.message || "No se pudo cargar partidos.");
    } finally {
      setLoading(false);
    }
  }

  // Primera carga
  useEffect(() => {
    fetchFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToPlans() {
    window.location.href = "/#planes";
  }

  // Botón celeste tipo comparador
  const CYAN_BG = "rgba(56,189,248,0.18)";
  const CYAN_BORDER = "rgba(56,189,248,0.32)";
  const CYAN_TEXT = "rgba(186,230,253,0.95)";

  // Card de un partido
  function FixtureCard({ fx }) {
    // Compat: API-FOOTBALL vs normalizado
    const home =
      fx?.teams?.home?.name ||
      fx?.homeTeam?.name ||
      fx?.home ||
      fx?.home_name ||
      fx?.fixture?.home ||
      "Local";
    const away =
      fx?.teams?.away?.name ||
      fx?.awayTeam?.name ||
      fx?.away ||
      fx?.away_name ||
      fx?.fixture?.away ||
      "Visita";

    const leagueName =
      fx?.league?.name || fx?.competition?.name || fx?.leagueName || fx?.league_name || "Liga";
    const countryName =
      fx?.league?.country ||
      fx?.country ||
      fx?.countryName ||
      fx?.country_name ||
      "—";

    const status =
      fx?.fixture?.status?.short ||
      fx?.status ||
      fx?.fixture?.status ||
      fx?.state ||
      "NS";

    const kickoff =
      fx?.fixture?.date ||
      fx?.date ||
      fx?.kickoff ||
      fx?.fixture_date ||
      "";

    // Vista pública: bloquear acciones PRO
    const isPublic = !isLoggedIn;

    function onStatsClick() {
      if (isPublic) return goToPlans();
      // Aquí iría tu ruta real de estadísticas si la tienes
      // Por ahora: llevar a comparador o a futuro /match/:id
      window.location.href = "/comparador";
    }

    function onAddClick() {
      if (isPublic) return goToPlans();
      // lógica real de añadir a combinada si ya la tienes
      alert("Partido añadido a combinada (demo).");
    }

    return (
      <div
        className="rounded-2xl border p-4 md:p-5"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          background: "rgba(2,6,23,0.35)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm md:text-base font-bold truncate">
              {home} <span className="text-slate-400 font-semibold">vs</span> {away}
            </div>
            <div className="text-xs text-slate-300 mt-1 truncate">
              {countryName} · {leagueName} · {prettyKickoff(kickoff, timeZone)}
            </div>
          </div>

          <span
            className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(226,232,240,0.92)",
            }}
          >
            {String(status).toUpperCase()}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onStatsClick}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            Ver estadísticas
          </button>

          <button
            type="button"
            onClick={onAddClick}
            className="px-4 py-2 rounded-full text-sm font-semibold transition"
            style={{
              backgroundColor: GOLD,
              color: "#0f172a",
              boxShadow: "0 0 22px rgba(230,196,100,0.20)",
            }}
          >
            Añadir a combinada
          </button>

          {/* Botón celeste (estilo comparador) */}
          <button
            type="button"
            onClick={goToPlans}
            className="px-4 py-2 rounded-full text-sm font-semibold border transition hover:bg-white/5"
            style={{
              background: CYAN_BG,
              borderColor: CYAN_BORDER,
              color: CYAN_TEXT,
              boxShadow: "0 0 20px rgba(56,189,248,0.12)",
            }}
          >
            Desbloquear PRO
          </button>
        </div>

        {/* Bloque PRO (candados) */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: "Forma", key: "forma" }, // si quieres, lo cambiamos a "1X2" (ver nota abajo)
            { label: "Tarjetas", key: "cards" },
            { label: "Corners", key: "corners" },
            { label: "Prob.", key: "prob" },
          ].map((it) => (
            <div
              key={it.key}
              className="rounded-xl border px-3 py-2 flex items-center justify-between"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                background: "rgba(2,6,23,0.28)",
              }}
            >
              <div>
                <div className="text-[11px] text-slate-300">{it.label}</div>
                <div className="text-sm font-bold text-slate-100">—</div>
              </div>
              <LockBadge />
            </div>
          ))}
        </div>

        {isPublic ? (
          <div className="mt-4 text-xs text-slate-300">
            Nota: Estás viendo la versión pública.{" "}
            <Link to="/login" className="underline font-semibold" style={{ color: GOLD }}>
              Inicia sesión
            </Link>{" "}
            para ver tu plan.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Fondo general HUD suave */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-48 left-1/2 -translate-x-1/2 h-[660px] w-[660px] rounded-full blur-3xl opacity-20"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.55), rgba(15,23,42,0) 60%)",
          }}
        />
        <div
          className="absolute -top-56 right-[-160px] h-[580px] w-[580px] rounded-full blur-3xl opacity-16"
          style={{
            background:
              "radial-gradient(circle at center, rgba(230,196,100,0.45), rgba(15,23,42,0) 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Header Partidos (con jugador) */}
      <HudCard bg={BG_HERO_PARTIDOS} overlayVariant="player" className="mt-6">
        <div className="p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Partidos</h1>
              <p className="text-slate-300 text-sm md:text-base mt-1 max-w-2xl">
                Revisa partidos por fecha y aplica filtros rápidos. Este módulo está pensado para analizar
                antes de armar tus combinadas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip
                className="border-white/10"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(226,232,240,0.92)",
                }}
              >
                Fuente: <span className="font-semibold" style={{ color: GOLD }}>Datos en vivo</span>
              </Chip>
              <Chip
                className="border-emerald-500/20"
                style={{
                  background: "rgba(16,185,129,0.10)",
                  color: "rgba(167,243,208,0.95)",
                  boxShadow: "0 0 0 1px rgba(16,185,129,0.10) inset",
                }}
              >
                Modo análisis
              </Chip>
            </div>
          </div>
        </div>
      </HudCard>

      {/* Filtros (casillas) */}
      <section className="mt-4 grid grid-cols-1 gap-4">
        <HudCard bg={BG_CASILLAS} overlayVariant="casillas">
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Filtros</div>
                <div className="text-xs text-slate-300 mt-1">
                  Ajusta la búsqueda. Si tu backend no usa algunos parámetros, no se rompe.
                </div>
              </div>

              {/* NO aquí: lo bajamos más abajo */}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-slate-300">Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border px-4 py-3 bg-slate-950/30 text-slate-100"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={todayOnly}
                    onChange={(e) => setTodayOnly(e.target.checked)}
                  />
                  Solo hoy (si backend lo soporta)
                </label>
              </div>

              <div>
                <label className="text-xs text-slate-300">País</label>
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ej: Chile"
                  className="mt-1 w-full rounded-2xl border px-4 py-3 bg-slate-950/30 text-slate-100"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>

              <div>
                <label className="text-xs text-slate-300">Liga</label>
                <input
                  value={league}
                  onChange={(e) => setLeague(e.target.value)}
                  placeholder="Ej: Primera"
                  className="mt-1 w-full rounded-2xl border px-4 py-3 bg-slate-950/30 text-slate-100"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>

              <div>
                <label className="text-xs text-slate-300">Equipo</label>
                <input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="Ej: Colo Colo"
                  className="mt-1 w-full rounded-2xl border px-4 py-3 bg-slate-950/30 text-slate-100"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Endpoint: {API_BASE || "(define VITE_API_BASE)"} /api/fixtures
            </div>

            {/* BOTÓN MOVIDO: va aquí */}
            <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
              <button
                type="button"
                onClick={fetchFixtures}
                className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
              >
                {loading ? "Buscando..." : "Buscar partidos"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={goToPlans}
                  className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border transition hover:bg-white/5"
                  style={{
                    background: CYAN_BG,
                    borderColor: CYAN_BORDER,
                    color: CYAN_TEXT,
                  }}
                >
                  Desbloquear PRO
                </button>
              </div>
            </div>

            {/* Vista gratuita + Cuotas potenciadas */}
            <div
              className="mt-4 rounded-2xl border p-4"
              style={{
                borderColor: "rgba(230,196,100,0.25)",
                background: "rgba(230,196,100,0.06)",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: GOLD }}>
                Vista gratuita (limitada)
              </div>
              <div className="text-xs text-slate-200 mt-1">
                Puedes ver partidos del día. Para estadísticas avanzadas, combinadas (parlays) y cuotas potenciadas,
                necesitas membresía.{" "}
                <button type="button" onClick={goToPlans} className="underline font-semibold" style={{ color: GOLD }}>
                  Ver planes
                </button>
                .
              </div>

              <div
                className="mt-3 rounded-xl border p-3"
                style={{
                  borderColor: "rgba(56,189,248,0.22)",
                  background: "rgba(2,6,23,0.25)",
                }}
              >
                <div className="text-xs font-semibold" style={{ color: CYAN_TEXT }}>
                  Cuotas potenciadas (x10 · x20 · x50 · x100)
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  Para generar cuotas potenciadas x10, x20, x50 o x100, adquiere tu membresía PRO.
                </div>

                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={goToPlans}
                    className="px-4 py-2 rounded-full text-sm font-semibold border transition hover:bg-white/5"
                    style={{
                      background: CYAN_BG,
                      borderColor: CYAN_BORDER,
                      color: CYAN_TEXT,
                    }}
                  >
                    Generar cuotas potenciadas x100
                  </button>

                  <button
                    type="button"
                    onClick={goToPlans}
                    className="px-4 py-2 rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: GOLD,
                      color: "#0f172a",
                      boxShadow: "0 0 22px rgba(230,196,100,0.18)",
                    }}
                  >
                    Ver planes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </HudCard>

        {/* Partidos encontrados (casillas) */}
        <HudCard bg={BG_CASILLAS} overlayVariant="casillas">
          <div className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Partidos encontrados</div>
                <div className="text-xs text-slate-300 mt-1">
                  Total: <span className="font-semibold text-slate-100">{fixtures?.length || 0}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Chip
                  className="border-white/10"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(226,232,240,0.92)",
                  }}
                >
                  Zona horaria: <span className="font-semibold" style={{ color: GOLD }}>{timeZone}</span>
                </Chip>

                <button
                  type="button"
                  onClick={goToPlans}
                  className="px-4 py-2 rounded-full text-sm font-semibold border transition hover:bg-white/5"
                  style={{
                    background: CYAN_BG,
                    borderColor: CYAN_BORDER,
                    color: CYAN_TEXT,
                  }}
                >
                  Desbloquear PRO
                </button>
              </div>
            </div>

            {error ? (
              <div className="mt-4 text-sm text-red-300">
                {error}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={fetchFixtures}
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : null}

            {!loading && !error && (!fixtures || fixtures.length === 0) ? (
              <div className="mt-4 text-sm text-slate-300">
                Por ahora no hay partidos para este rango o filtro.
              </div>
            ) : null}

            {loading ? (
              <div className="mt-4 text-sm text-slate-300">Cargando partidos...</div>
            ) : null}

            <div className="mt-4 grid grid-cols-1 gap-3">
              {fixtures?.map((fx, idx) => (
                <FixtureCard key={fx?.fixture?.id || fx?.id || idx} fx={fx} />
              ))}
            </div>
          </div>
        </HudCard>

        {/* CTA final (hero-12000) */}
        <div className="mt-0">
          <HudCard
            bg={BG_12000}
            overlayVariant="cta"
            style={{
              boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.12)`,
            }}
          >
            {/* Ajuste para que NO se corte la cabeza del jugador */}
            <img
              src={BG_12000}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: "center 22%", // sube un poco el encuadre
              }}
            />

            {/* Reaplicamos overlays arriba (porque el img extra reemplaza el anterior) */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.70) 55%, rgba(2,6,23,0.42) 80%, rgba(2,6,23,0.22) 100%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 20% 55%, rgba(230,196,100,0.22), rgba(2,6,23,0) 58%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 78% 45%, rgba(16,185,129,0.18), rgba(2,6,23,0) 62%)" }} />

            <div className="relative p-5 md:p-6">
              <div className="text-lg md:text-xl font-bold">Únete a la comunidad</div>
              <div className="text-sm text-slate-200 mt-1 max-w-2xl">
                <span className="font-semibold" style={{ color: GOLD }}>
                  +12.000 usuarios activos.
                </span>{" "}
                Miles confían en nuestros datos, simulador y picks para apostar con ventaja.
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={goToPlans}
                  className="w-full md:w-fit px-6 py-3 rounded-full text-base font-bold"
                  style={{
                    backgroundColor: GOLD,
                    color: "#0f172a",
                    boxShadow: "0 0 28px rgba(230,196,100,0.20)",
                  }}
                >
                  Ver planes
                </button>
              </div>
            </div>
          </HudCard>
        </div>
      </section>

      {/* Footer mini */}
      <div className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} Factor Victoria</div>
    </div>
  );
}
