// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const CYAN = "#38BDF8"; // celeste estilo comparador (Tailwind sky-400 aprox)

/* --------------------- Helpers --------------------- */

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/**
 * Ajusta esta lógica si tu backend define planes de otra forma.
 * - Si NO está logueado => público.
 * - Si está logueado pero plan FREE => público (si aplica).
 */
function isProUser(user, isLoggedIn) {
  if (!isLoggedIn) return false;

  const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "";
  const p = String(raw || "").toUpperCase();

  // Si tienes un plan FREE explícito, marca como false aquí:
  if (!p) return false;
  if (p.includes("FREE") || p.includes("PUBLIC") || p.includes("GRATIS")) return false;

  // Si tiene cualquier plan distinto a free, lo tratamos como PRO
  return true;
}

function goToPlans(targetPlan) {
  const base = "/#planes";
  window.location.href = targetPlan ? `${base}&plan=${encodeURIComponent(targetPlan)}` : base;
}

/* --------------------- UI Helpers --------------------- */

function Chip({ children, style = {}, className = "" }) {
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
      className="inline-flex items-center justify-center w-7 h-7 rounded-xl border"
      style={{
        borderColor: "rgba(255,255,255,0.14)",
        background: "rgba(2,6,23,0.30)",
        backdropFilter: "blur(6px)",
      }}
      title="Disponible con membresía"
      aria-label="Disponible con membresía"
    >
      <span style={{ color: GOLD, fontSize: 16, lineHeight: 1 }}>🔒</span>
    </span>
  );
}

/**
 * Card con fondo (imagen) + overlays para legibilidad.
 * overlayVariant:
 * - "casillas": suave
 * - "player": más oscuro (imagen con detalle/luz)
 */
function HudCard({
  bg,
  children,
  className = "",
  style = {},
  overlay = true,
  overlayVariant = "casillas",
}) {
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.70) 52%, rgba(2,6,23,0.42) 78%, rgba(2,6,23,0.22) 100%)",
          "radial-gradient(circle at 22% 40%, rgba(16,185,129,0.18), rgba(2,6,23,0) 58%)",
          "radial-gradient(circle at 82% 55%, rgba(230,196,100,0.18), rgba(2,6,23,0) 58%)",
        ]
      : [
          "linear-gradient(180deg, rgba(2,6,23,0.86) 0%, rgba(2,6,23,0.60) 38%, rgba(2,6,23,0.86) 100%)",
          "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.16), rgba(2,6,23,0) 60%)",
          "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.12), rgba(2,6,23,0) 60%)",
        ];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-white/5 ${className}`}
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.14)", // glow suave dorado
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

function Btn({ children, onClick, disabled, variant = "ghost", className = "" }) {
  const base =
    "inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold transition select-none";
  const styles =
    variant === "gold"
      ? {
          backgroundColor: GOLD,
          color: "#0f172a",
          boxShadow: "0 0 26px rgba(230,196,100,0.22)",
          border: "1px solid rgba(230,196,100,0.55)",
        }
      : variant === "cyan"
      ? {
          backgroundColor: "rgba(56,189,248,0.22)",
          color: "rgba(224,242,254,0.95)",
          border: "1px solid rgba(56,189,248,0.40)",
          boxShadow: "0 0 26px rgba(56,189,248,0.16)",
        }
      : variant === "outline"
      ? {
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "rgba(226,232,240,0.92)",
          border: "1px solid rgba(255,255,255,0.14)",
        }
      : {
          backgroundColor: "rgba(2,6,23,0.22)",
          color: "rgba(226,232,240,0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
        };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-white/10"} ${className}`}
      style={styles}
    >
      {children}
    </button>
  );
}

/* --------------------- Page --------------------- */

export default function Fixtures() {
  const { user, isLoggedIn } = useAuth();

  const pro = useMemo(() => isProUser(user, isLoggedIn), [user, isLoggedIn]);
  const publicMode = !pro;

  const API_BASE = (import.meta?.env?.VITE_API_BASE || "").trim();
  const endpoint = API_BASE ? `${API_BASE}/api/fixtures` : `/api/fixtures`;

  const [date, setDate] = useState(() => toYYYYMMDD(new Date()));
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");
  const [todayOnly, setTodayOnly] = useState(false);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");

  // Fondos (public/)
  const BG_CASILLAS = "/hero-fondo-casillas.png";
  const BG_HEADER = "/hero-profile-hud.png";
  const BG_12000 = "/hero-12000.png";

  async function fetchFixtures() {
    setErr("");
    setLoading(true);

    try {
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);
      if (country) qs.set("country", country);
      if (league) qs.set("league", league);
      if (team) qs.set("team", team);
      if (todayOnly) qs.set("todayOnly", "true");

      const url = `${endpoint}?${qs.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();

      // Acepta: array directo o { fixtures: [...] }
      const list = Array.isArray(data) ? data : Array.isArray(data?.fixtures) ? data.fixtures : [];
      setItems(list);
    } catch (e) {
      setErr("No se pudieron cargar los partidos. Intenta nuevamente.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requirePro(actionLabel = "esta función") {
    // Aquí empujamos a comprar
    goToPlans();
  }

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Header */}
      <HudCard bg={BG_HEADER} overlayVariant="player" className="mt-6">
        <div className="p-5 md:p-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Partidos</h1>
              <p className="text-slate-300 text-sm md:text-base mt-1 max-w-2xl">
                Revisa partidos por fecha y aplica filtros rápidos. Este módulo está pensado para analizar antes de armar tus combinadas.
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
                Fuente:{" "}
                <span className="font-semibold" style={{ color: GOLD }}>
                  Datos en vivo
                </span>
              </Chip>

              <Chip
                className="border-emerald-500/20"
                style={{
                  background: "rgba(16,185,129,0.10)",
                  color: "rgba(167,243,208,0.95)",
                }}
              >
                Modo análisis
              </Chip>
            </div>
          </div>
        </div>
      </HudCard>

      {/* Filtros */}
      <HudCard bg={BG_CASILLAS} overlayVariant="casillas" className="mt-4">
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Filtros</div>
              <div className="text-xs text-slate-300 mt-1">
                Ajusta la búsqueda. Si tu backend no usa algunos parámetros, no se rompe.
              </div>
            </div>

            <Btn
              variant="outline"
              onClick={fetchFixtures}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar partidos"}
            </Btn>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-white/20"
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
              <label className="block text-xs text-slate-300 mb-1">País</label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ej: Chile"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Liga</label>
              <input
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Ej: Primera"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Equipo</label>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ej: Colo Colo"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-100 outline-none focus:border-white/20"
              />
              <div className="mt-2 text-[11px] text-slate-400 truncate">
                Endpoint: {endpoint}
              </div>
            </div>
          </div>

          {/* Aviso vista pública */}
          {publicMode ? (
            <div className="mt-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(230,196,100,0.22)",
                background: "rgba(230,196,100,0.08)",
                boxShadow: "0 0 24px rgba(230,196,100,0.10)",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: GOLD }}>
                Vista gratuita (limitada)
              </div>
              <div className="text-xs text-slate-200 mt-1">
                Puedes ver partidos del día. Para estadísticas avanzadas y combinadas (parlays), necesitas membresía.{" "}
                <button
                  type="button"
                  className="underline font-semibold"
                  style={{ color: GOLD }}
                  onClick={() => goToPlans()}
                >
                  Ver planes
                </button>
                .
              </div>
            </div>
          ) : null}

          {err ? <div className="mt-3 text-sm text-rose-300">{err}</div> : null}
        </div>
      </HudCard>

      {/* Listado */}
      <HudCard bg={BG_CASILLAS} overlayVariant="casillas" className="mt-4">
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Partidos encontrados</div>
              <div className="text-xs text-slate-300 mt-1">
                Total: {items?.length || 0}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip
                className="border-white/10"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
              >
                Zona horaria:{" "}
                <span className="font-semibold" style={{ color: GOLD }}>
                  America/Santiago
                </span>
              </Chip>

              {publicMode ? (
                <Btn variant="cyan" onClick={() => goToPlans()}>
                  Desbloquear PRO
                </Btn>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {loading ? (
              <div className="text-sm text-slate-300">Cargando partidos...</div>
            ) : items?.length ? (
              items.map((fx, idx) => {
                // Normaliza campos típicos API-Football / BD
                const home = fx?.home?.name || fx?.teams?.home?.name || fx?.home || fx?.local || "Local";
                const away = fx?.away?.name || fx?.teams?.away?.name || fx?.away || fx?.visit || "Visita";
                const status = fx?.status?.short || fx?.fixture?.status?.short || fx?.status || "—";
                const leagueName = fx?.league?.name || fx?.league || fx?.competition || "—";
                const countryName = fx?.country || fx?.league?.country || "—";
                const time = fx?.time || fx?.fixture?.date || fx?.date || "";

                return (
                  <div
                    key={fx?.id || fx?.fixture?.id || idx}
                    className="rounded-3xl border overflow-hidden"
                    style={{
                      borderColor: "rgba(255,255,255,0.10)",
                      background: "rgba(2,6,23,0.32)",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
                      backdropFilter: "blur(10px)",
                    }}
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-bold text-slate-100">
                              {home} <span className="text-slate-400">vs</span> {away}
                            </div>
                            <Chip
                              className="border-white/10"
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(226,232,240,0.92)",
                                padding: "4px 10px",
                              }}
                            >
                              {status}
                            </Chip>
                          </div>

                          <div className="text-xs text-slate-300 mt-1">
                            {countryName} · {leagueName} {time ? `· ${String(time).slice(0, 16)}` : ""}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Btn
                            variant="outline"
                            onClick={() => (publicMode ? requirePro("estadísticas") : console.log("stats", fx))}
                          >
                            Ver estadísticas
                          </Btn>

                          <Btn
                            variant="cyan"
                            onClick={() => (publicMode ? requirePro("combinadas") : console.log("add parlay", fx))}
                          >
                            Añadir a combinada
                          </Btn>
                        </div>
                      </div>

                      {/* Mini métricas (bloqueadas en público) */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Forma", value: publicMode ? "—" : fx?.form || "—" },
                          { label: "Tarjetas", value: publicMode ? "—" : fx?.cards || "—" },
                          { label: "Corners", value: publicMode ? "—" : fx?.corners || "—" },
                          { label: "Prob.", value: publicMode ? "—" : fx?.prob || "—" },
                        ].map((m) => (
                          <div
                            key={m.label}
                            className="rounded-2xl border px-4 py-3 relative"
                            style={{
                              borderColor: "rgba(255,255,255,0.12)",
                              background: "rgba(2,6,23,0.28)",
                              boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
                              backdropFilter: "blur(6px)",
                            }}
                          >
                            <div className="text-xs text-slate-300">{m.label}</div>
                            <div className="mt-0.5 text-sm font-bold text-slate-100">{m.value}</div>

                            {publicMode ? (
                              <div className="absolute right-3 top-3">
                                <LockBadge />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {/* Nota público */}
                      {publicMode ? (
                        <div className="mt-4 text-xs text-slate-300">
                          Nota: Estás viendo la versión pública.{" "}
                          <Link to="/login" className="underline font-semibold" style={{ color: GOLD }}>
                            Inicia sesión
                          </Link>{" "}
                          para ver tu plan.
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-slate-300">
                Por ahora no hay partidos para este rango o filtro.
              </div>
            )}
          </div>
        </div>
      </HudCard>

      {/* CTA final +12.000 */}
      <HudCard bg={BG_12000} overlayVariant="player" className="mt-4">
        <div className="p-5 md:p-6">
          <div className="max-w-xl">
            <div className="text-sm font-semibold">Únete a la comunidad</div>
            <div className="text-xs text-slate-200 mt-1">
              +12.000 usuarios activos. Miles confían en nuestros datos, simulador y picks para apostar con ventaja.
            </div>
          </div>

          <Btn variant="gold" className="mt-4 w-full md:w-auto" onClick={() => goToPlans()}>
            Ver planes
          </Btn>
        </div>
      </HudCard>

      <div className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Factor Victoria
      </div>
    </div>
  );
}
