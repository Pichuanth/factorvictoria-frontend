// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const TEAL = "rgba(56,189,248,0.95)"; // celeste tipo "comparador"

function toYYYYMMDD(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Card con fondo (imagen) + overlays para legibilidad.
 * Permite objectPosition para evitar cortes (ej: CTA hero-12000).
 */
function HudCard({
  bg,
  children,
  className = "",
  style = {},
  overlay = true,
  overlayVariant = "casillas", // "casillas" | "player"
  imgObjectPosition = "center center",
}) {
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.68) 52%, rgba(2,6,23,0.40) 78%, rgba(2,6,23,0.22) 100%)",
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
          style={{ objectPosition: imgObjectPosition }}
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

function LockStat({ label }) {
  return (
    <div
      className="rounded-2xl border px-4 py-3 flex items-center justify-between gap-3"
      style={{
        borderColor: "rgba(255,255,255,0.12)",
        background: "rgba(2,6,23,0.35)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="min-w-0">
        <div className="text-xs text-slate-300">{label}</div>
        <div className="mt-0.5 text-sm font-bold text-slate-200">—</div>
      </div>

      <span
        className="inline-flex items-center justify-center h-8 w-8 rounded-xl"
        title="Disponible en PRO"
        style={{
          background: "rgba(230,196,100,0.16)",
          border: "1px solid rgba(230,196,100,0.35)",
          boxShadow: "0 0 18px rgba(230,196,100,0.18)",
        }}
      >
        <span style={{ color: GOLD, fontWeight: 900 }}>🔒</span>
      </span>
    </div>
  );
}

export default function Fixtures() {
  const { isLoggedIn } = useAuth();

  // ---- Fondos (public/) ----
  const BG_HEADER = "/hero-profile-hud.png"; // header Partidos
  const BG_CASILLAS = "/hero-fondo-casillas.png"; // resto
  const BG_JOIN = "/hero-12000.png"; // CTA final

  const API_BASE =
    (import.meta?.env?.VITE_API_BASE && String(import.meta.env.VITE_API_BASE)) || "";

  // Endpoint (ajusta si el tuyo es distinto)
  const FIXTURES_ENDPOINT = `${API_BASE}/api/fixtures`;

  // filtros
  const [date, setDate] = useState(toYYYYMMDD(new Date()));
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");
  const [onlyToday, setOnlyToday] = useState(false);

  // data
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fixtures, setFixtures] = useState([]);

  const tzLabel = "America/Santiago";

  const plansUrl = "/#planes";
  const goToPlans = () => {
    window.location.href = plansUrl;
  };

  const canSeePro = Boolean(isLoggedIn);

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (country) params.set("country", country);
    if (league) params.set("league", league);
    if (team) params.set("team", team);
    if (onlyToday) params.set("today", "1");
    return params.toString();
  }, [date, country, league, team, onlyToday]);

  async function fetchFixtures() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${FIXTURES_ENDPOINT}?${qs}`);
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();

      // Acepta varios formatos comunes
      const list =
        data?.fixtures ||
        data?.response ||
        data?.data ||
        (Array.isArray(data) ? data : []);

      setFixtures(Array.isArray(list) ? list : []);
    } catch (e) {
      setFixtures([]);
      setError(e?.message || "No se pudo cargar partidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // carga inicial
    fetchFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helpers para normalizar fixture (API-Football / tu BD)
  function getFixtureMeta(fx) {
    const home = fx?.teams?.home?.name || fx?.homeTeam || fx?.home || "Local";
    const away = fx?.teams?.away?.name || fx?.awayTeam || fx?.away || "Visita";

    const leagueName = fx?.league?.name || fx?.leagueName || "Liga";
    const countryName = fx?.league?.country || fx?.country || "País";

    const status =
      fx?.fixture?.status?.short ||
      fx?.status?.short ||
      fx?.status ||
      (fx?.isFinished ? "FT" : "NS");

    const ts =
      fx?.fixture?.date ||
      fx?.date ||
      fx?.fixtureDate ||
      null;

    let timeLabel = "—";
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
      {/* Fondo HUD suave global */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-20"
          style={{
            background: `radial-gradient(circle at center, rgba(16,185,129,0.55), rgba(15,23,42,0) 60%)`,
          }}
        />
        <div
          className="absolute -top-52 right-[-140px] h-[560px] w-[560px] rounded-full blur-3xl opacity-16"
          style={{
            background: `radial-gradient(circle at center, rgba(230,196,100,0.45), rgba(15,23,42,0) 62%)`,
          }}
        />
      </div>

      {/* Header Partidos (con jugador / HUD) */}
      <HudCard
        bg={BG_HEADER}
        overlayVariant="player"
        className="mt-6"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.18)` }}
      >
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
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
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

      {/* Filtros */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillas"
        className="mt-4"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(230,196,100,0.14)` }}
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
              onClick={fetchFixtures}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-slate-950/30 hover:bg-slate-950/50 transition"
              disabled={loading}
              title="Buscar partidos"
            >
              {loading ? "Cargando..." : "Buscar partidos"}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-300 mb-1">Fecha</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-slate-100 outline-none"
              />
            </div>

            <div className="min-w-0">
              <div className="text-xs text-slate-300 mb-1">País</div>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ej: Chile"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-slate-100 outline-none"
              />
            </div>

            <div className="min-w-0">
              <div className="text-xs text-slate-300 mb-1">Liga</div>
              <input
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Ej: Primera"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-slate-100 outline-none"
              />
            </div>

            <div className="min-w-0">
              <div className="text-xs text-slate-300 mb-1">Equipo</div>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ej: Colo Colo"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-slate-100 outline-none"
              />
            </div>
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={onlyToday}
              onChange={(e) => setOnlyToday(e.target.checked)}
            />
            Solo hoy (si backend lo soporta)
          </label>

          <div className="mt-3 text-xs text-slate-400 break-all">
            Endpoint: {FIXTURES_ENDPOINT}
          </div>

          {/* Mensaje vista gratuita */}
          {!canSeePro ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(230,196,100,0.28)",
                background: "rgba(230,196,100,0.08)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: GOLD }}>
                Vista gratuita (limitada)
              </div>
              <div className="text-xs text-slate-200 mt-1">
                Puedes ver partidos del día. Para estadísticas avanzadas y combinadas (parlays), necesitas membresía.{" "}
                <button className="underline font-semibold" onClick={goToPlans} type="button">
                  Ver planes
                </button>
                .
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 text-sm text-red-300">
              {error}
            </div>
          ) : null}
        </div>
      </HudCard>

      {/* Resultados */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillas"
        className="mt-4"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(230,196,100,0.12)` }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Partidos encontrados</div>
              <div className="text-xs text-slate-300 mt-1">
                Total: {Array.isArray(fixtures) ? fixtures.length : 0}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Chip
                className="border-white/10"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
              >
                Zona horaria: <span className="font-semibold" style={{ color: GOLD }}>{tzLabel}</span>
              </Chip>

              {!canSeePro ? (
                <button
                  type="button"
                  onClick={goToPlans}
                  className="px-4 py-2 rounded-full text-sm font-semibold border"
                  style={{
                    borderColor: "rgba(56,189,248,0.35)",
                    background: "rgba(56,189,248,0.12)",
                    color: "rgba(224,242,254,0.95)",
                    boxShadow: "0 0 26px rgba(56,189,248,0.14)",
                  }}
                >
                  Desbloquear PRO
                </button>
              ) : null}
            </div>
          </div>

          {!loading && (!fixtures || fixtures.length === 0) ? (
            <div className="mt-4 text-sm text-slate-300">
              Por ahora no hay partidos para este rango o filtro.
            </div>
          ) : null}

          <div className="mt-4 space-y-4">
            {(fixtures || []).map((fx, idx) => {
              const meta = getFixtureMeta(fx);

              const onStats = () => {
                if (!canSeePro) return goToPlans();
                // si tienes ruta real de estadísticas, ponla aquí:
                // window.location.href = `/advice?fixture=${fx.fixture?.id || fx.id}`;
                return;
              };

              const onAddParlay = () => {
                if (!canSeePro) return goToPlans();
                // aquí mantén tu lógica real de añadir combinada
                return;
              };

              return (
                <div
                  key={fx?.fixture?.id || fx?.id || idx}
                  className="rounded-3xl border p-4 md:p-5"
                  style={{
                    borderColor: "rgba(255,255,255,0.10)",
                    background: "rgba(2,6,23,0.22)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
                    backdropFilter: "blur(6px)",
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold truncate">
                          {meta.home} vs {meta.away}
                        </div>
                        <span
                          className="text-[11px] px-2 py-1 rounded-full border"
                          style={{
                            borderColor: "rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(226,232,240,0.9)",
                          }}
                        >
                          {meta.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 mt-1 truncate">
                        {meta.countryName} · {meta.leagueName} · {meta.timeLabel}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={onStats}
                        className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                      >
                        Ver estadísticas
                      </button>

                      {/* “Añadir a combinada” con color celeste (como pediste) */}
                      <button
                        type="button"
                        onClick={onAddParlay}
                        className="px-4 py-2 rounded-full text-sm font-semibold border transition"
                        style={{
                          borderColor: "rgba(56,189,248,0.30)",
                          background: "rgba(56,189,248,0.16)",
                          color: "rgba(224,242,254,0.95)",
                          boxShadow: "0 0 26px rgba(56,189,248,0.14)",
                        }}
                      >
                        Añadir a combinada
                      </button>
                    </div>
                  </div>

                  {/* Stats: si no es PRO -> candados */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                    {canSeePro ? (
                      <>
                        {/* Aquí van tus stats reales cuando ya estés listo */}
                        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(2,6,23,0.35)" }}>
                          <div className="text-xs text-slate-300">Forma</div>
                          <div className="mt-0.5 text-sm font-bold text-slate-100">—</div>
                        </div>
                        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(2,6,23,0.35)" }}>
                          <div className="text-xs text-slate-300">Tarjetas</div>
                          <div className="mt-0.5 text-sm font-bold text-slate-100">—</div>
                        </div>
                        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(2,6,23,0.35)" }}>
                          <div className="text-xs text-slate-300">Corners</div>
                          <div className="mt-0.5 text-sm font-bold text-slate-100">—</div>
                        </div>
                        <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(2,6,23,0.35)" }}>
                          <div className="text-xs text-slate-300">Prob.</div>
                          <div className="mt-0.5 text-sm font-bold text-slate-100">—</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <LockStat label="Forma" />
                        <LockStat label="Tarjetas" />
                        <LockStat label="Corners" />
                        <LockStat label="Prob." />
                      </>
                    )}
                  </div>

                  {!canSeePro ? (
                    <div className="mt-4 text-xs text-slate-300">
                      Nota: Estás viendo la versión pública.{" "}
                      <Link className="underline font-semibold" to="/login">
                        Inicia sesión
                      </Link>{" "}
                      para ver tu plan.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </HudCard>

      {/* CTA final "12.000 usuarios" (ajustado para que NO se corte) */}
      <HudCard
        bg={BG_JOIN}
        overlayVariant="player"
        className="mt-4"
        imgObjectPosition="center 22%"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.16)` }}
      >
        <div className="p-5 md:p-6">
          <div className="text-lg font-bold">Únete a la comunidad</div>
          <div className="text-sm text-slate-200 mt-1 max-w-2xl">
            <span className="font-semibold">+12.000 usuarios activos.</span> Miles confían en nuestros datos, simulador y picks para apostar con ventaja.
          </div>

          <button
            type="button"
            onClick={goToPlans}
            className="mt-4 w-full md:w-fit px-6 py-3 rounded-full text-sm font-bold"
            style={{ backgroundColor: GOLD, color: "#0f172a", boxShadow: "0 0 30px rgba(230,196,100,0.25)" }}
          >
            Ver planes
          </button>
        </div>
      </HudCard>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Factor Victoria
      </div>
    </div>
  );
}
