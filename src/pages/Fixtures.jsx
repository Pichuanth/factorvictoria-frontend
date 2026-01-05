// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

/* ------------------- Helpers de plan ------------------- */
function getPlanLabel(user) {
  const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
  return String(raw || "").toUpperCase();
}

function hasPaidMembership(planLabel = "") {
  const p = String(planLabel || "").toUpperCase();
  // Ajusta aquí si tus IDs reales son distintos
  if (p.includes("VITAL")) return true;
  if (p.includes("ANUAL") || p.includes("CAMPE")) return true;
  if (p.includes("TRI") || p.includes("GOLE") || p.includes("3")) return true;
  // Mensual también cuenta como pagado si lo usas:
  if (p.includes("MENS") || p.includes("MONTH")) return true;
  return false;
}

/* ------------------- UI reutilizable (estilo Perfil) ------------------- */
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

/**
 * Card con fondo (imagen) + overlays para legibilidad.
 */
function HudCard({
  bg,
  children,
  className = "",
  style = {},
  overlay = true,
  overlayVariant = "casillas", // "casillas" | "player"
}) {
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.68) 52%, rgba(2,6,23,0.40) 78%, rgba(2,6,23,0.25) 100%)",
          "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.20), rgba(2,6,23,0) 58%)",
          "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.18), rgba(2,6,23,0) 58%)",
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

      {overlay ? (
        <>
          <div className="absolute inset-0" style={{ background: overlayLayers[0] }} />
          <div className="absolute inset-0" style={{ background: overlayLayers[1] }} />
          <div className="absolute inset-0" style={{ background: overlayLayers[2] }} />
        </>
      ) : null}

      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------- Página ------------------- */
export default function Fixtures() {
  const { user, isLoggedIn } = useAuth();

  // Ajusta aquí si tus planes están en otra ruta
  const UPSELL_URL = "/#planes";

  // Fondos
  const BG_CASILLAS = "/hero-fondo-casillas.png";
  const BG_HERO = "/hero-profile-hud.png";
  const BG_12000 = "/hero-12000.png";

  const planLabel = useMemo(() => getPlanLabel(user), [user]);
  const canUsePremium = useMemo(() => hasPaidMembership(planLabel), [planLabel]);

  const API_BASE = import.meta.env.VITE_API_BASE || "";

  // Filtros (similares a tu UI)
  const [date, setDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");
  const [onlyToday, setOnlyToday] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fixtures, setFixtures] = useState([]);

  function goUpsell() {
    window.location.href = UPSELL_URL;
  }

  function guardPremium(actionName = "esta función") {
    if (canUsePremium) return true;

    // Mensaje corto + redirección directa (como pediste)
    // Si prefieres sin alert, bórralo.
    alert(`Para usar ${actionName} necesitas una membresía. Te llevamos a los planes.`);
    goUpsell();
    return false;
  }

  async function fetchFixtures() {
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);
      if (country) qs.set("country", country);
      if (league) qs.set("league", league);
      if (team) qs.set("team", team);
      if (onlyToday) qs.set("today", "1");

      const url = `${API_BASE}/api/fixtures?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.fixtures || data?.response || [];
      setFixtures(list);
    } catch (e) {
      setError(e?.message || "Error cargando partidos");
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }

  // Cargar al entrar / al cambiar fecha
  useEffect(() => {
    fetchFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Render helpers (tolerante a distintos formatos de API)
  function getFixtureMeta(fx) {
    // Intenta cubrir: API-Football style y BD propia
    const home =
      fx?.teams?.home?.name ||
      fx?.homeTeam ||
      fx?.home ||
      fx?.home_name ||
      "Local";
    const away =
      fx?.teams?.away?.name ||
      fx?.awayTeam ||
      fx?.away ||
      fx?.away_name ||
      "Visita";

    const leagueName =
      fx?.league?.name ||
      fx?.leagueName ||
      fx?.league_name ||
      fx?.competition ||
      "Liga";
    const countryName =
      fx?.league?.country ||
      fx?.country ||
      fx?.country_name ||
      "";

    const status =
      fx?.fixture?.status?.short ||
      fx?.status ||
      fx?.status_short ||
      "";

    const ts =
      fx?.fixture?.date ||
      fx?.date ||
      fx?.kickoff ||
      "";

    let timeLabel = "";
    if (ts) {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        timeLabel = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      }
    }

    return { home, away, leagueName, countryName, status, timeLabel };
  }

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Fondo general suave (igual a Perfil) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-18"
          style={{
            background: "radial-gradient(circle at center, rgba(16,185,129,0.55), rgba(15,23,42,0) 60%)",
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

      {/* HERO: Partidos (con hero-profile-hud.png) */}
      <HudCard
        bg={BG_HERO}
        overlayVariant="player"
        className="mt-6"
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.20)",
        }}
      >
        <div className="p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Partidos</h1>
              <p className="text-slate-300 text-sm md:text-base mt-1 max-w-2xl">
                Revisa partidos por fecha y aplica filtros rápidos. Esta vista es una muestra gratuita; para ver estadísticas y construir combinadas necesitas membresía.
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

              {!canUsePremium ? (
                <button
                  type="button"
                  onClick={goUpsell}
                  className="px-4 py-2 rounded-full text-sm font-semibold"
                  style={{ backgroundColor: GOLD, color: "#0f172a" }}
                >
                  Comprar membresía
                </button>
              ) : (
                <Chip
                  className="border-white/10"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
                >
                  Plan <span className="font-semibold" style={{ color: GOLD }}>{planLabel || "ACTIVO"}</span>
                </Chip>
              )}
            </div>
          </div>
        </div>
      </HudCard>

      {/* FILTROS (casillas) */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillas"
        className="mt-4"
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(230,196,100,0.16)",
        }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Filtros</div>
              <div className="text-xs text-slate-300 mt-1">
                Ajusta la búsqueda. Si tu backend no usa algunos parámetros, no se rompe.
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // “Actualizar / Generar” bloqueado para no miembros (como pediste)
                if (!guardPremium("Actualizar / Generar")) return;
                fetchFixtures();
              }}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
              style={{ boxShadow: "0 0 26px rgba(230,196,100,0.12)" }}
            >
              Actualizar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-xs text-slate-300 mb-1">Fecha</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl px-4 py-2.5 bg-slate-950/30 border border-white/10 text-slate-100 outline-none"
              />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyToday}
                  onChange={(e) => setOnlyToday(e.target.checked)}
                />
                Solo hoy (si backend lo soporta)
              </label>
            </div>

            <div>
              <div className="text-xs text-slate-300 mb-1">País</div>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ej: Chile"
                className="w-full rounded-2xl px-4 py-2.5 bg-slate-950/30 border border-white/10 text-slate-100 outline-none"
              />
            </div>

            <div>
              <div className="text-xs text-slate-300 mb-1">Liga</div>
              <input
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Ej: Primera"
                className="w-full rounded-2xl px-4 py-2.5 bg-slate-950/30 border border-white/10 text-slate-100 outline-none"
              />
            </div>

            <div>
              <div className="text-xs text-slate-300 mb-1">Equipo</div>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ej: Colo Colo"
                className="w-full rounded-2xl px-4 py-2.5 bg-slate-950/30 border border-white/10 text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400">
            Endpoint:{" "}
            <span className="text-slate-300">
              {API_BASE ? `${API_BASE}/api/fixtures` : "/api/fixtures"}
            </span>
          </div>

          {!canUsePremium ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <div className="text-sm font-semibold" style={{ color: GOLD }}>
                Vista gratuita (limitada)
              </div>
              <div className="text-xs text-slate-200 mt-1">
                Puedes ver partidos del día. Para estadísticas avanzadas y combinadas (parlays), necesitas membresía.
                {" "}
                <button onClick={goUpsell} className="underline font-semibold" style={{ color: GOLD }}>
                  Ver planes
                </button>
                .
              </div>
            </div>
          ) : null}
        </div>
      </HudCard>

      {/* RESULTADOS (casillas) */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillas"
        className="mt-4"
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.16)",
        }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Partidos encontrados</div>
              <div className="text-xs text-slate-300 mt-1">
                {loading ? "Cargando..." : `Total: ${fixtures.length}`}
              </div>
            </div>

            <Chip
              className="border-white/10"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
            >
              Zona horaria: <span className="font-semibold" style={{ color: GOLD }}>America/Santiago</span>
            </Chip>
          </div>

          {error ? (
            <div className="mt-4 text-sm text-red-300">{error}</div>
          ) : null}

          <div className="mt-4 space-y-3">
            {fixtures.length === 0 && !loading ? (
              <div className="text-sm text-slate-300">
                Por ahora no hay partidos para este rango o filtro.
              </div>
            ) : null}

            {fixtures.map((fx, idx) => {
              const m = getFixtureMeta(fx);
              return (
                <div
                  key={fx?.id || fx?.fixture?.id || idx}
                  className="rounded-3xl border border-white/10 bg-slate-950/25 p-4 md:p-5"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset" }}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold truncate">
                          {m.home} <span className="text-slate-400 font-semibold">vs</span> {m.away}
                        </div>
                        {m.status ? (
                          <span className="text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-200">
                            {m.status}
                          </span>
                        ) : null}
                      </div>

                      <div className="text-xs text-slate-300 mt-1">
                        {m.countryName ? `${m.countryName} · ` : ""}
                        {m.leagueName}
                        {m.timeLabel ? ` · ${m.timeLabel}` : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => guardPremium("Ver estadísticas")}
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                      >
                        Ver estadísticas
                      </button>

                      <button
                        type="button"
                        onClick={() => guardPremium("Añadir a combinada")}
                        className="px-4 py-2 rounded-full text-sm font-semibold"
                        style={{ backgroundColor: GOLD, color: "#0f172a" }}
                      >
                        Añadir a combinada
                      </button>
                    </div>
                  </div>

                  {/* mini placeholders (se ven “pro” pero no entregan valor premium) */}
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      ["Forma", "—"],
                      ["Tarjetas", "—"],
                      ["Corners", "—"],
                      ["Prob.", "—"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-2xl border border-white/10 bg-slate-950/20 px-3 py-2"
                      >
                        <div className="text-[11px] text-slate-300">{k}</div>
                        <div className="text-sm font-semibold text-slate-100">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoggedIn ? (
            <div className="mt-4 text-xs text-slate-300">
              Nota: Estás viendo la versión pública.{" "}
              <Link to="/login" className="underline font-semibold" style={{ color: GOLD }}>
                Inicia sesión
              </Link>{" "}
              para ver tu plan.
            </div>
          ) : null}
        </div>
      </HudCard>

      {/* CTA final 12.000 (hero-12000.png) */}
      <HudCard
        bg={BG_12000}
        overlayVariant="player"
        className="mt-4"
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.18)",
        }}
      >
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-sm md:text-base font-semibold text-slate-100">
                Únete a la comunidad
              </div>
              <div className="text-xs text-slate-200 mt-1 max-w-xl">
                +12.000 usuarios activos. Miles de usuarios confían en nuestros datos, simulador y picks para apostar con ventaja.
              </div>
            </div>

            <button
              type="button"
              onClick={goUpsell}
              className="w-full md:w-auto px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Ver planes y comprar
            </button>
          </div>
        </div>
      </HudCard>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Factor Victoria
      </div>
    </div>
  );
}
