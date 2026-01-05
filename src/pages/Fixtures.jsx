// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const BG_CASILLAS = "/hero-fondo-casillas.png";

/* ------------------- UI helpers ------------------- */
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

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: {
      background: "rgba(255,255,255,0.06)",
      borderColor: "rgba(255,255,255,0.12)",
      color: "rgba(226,232,240,0.92)",
    },
    good: {
      background: "rgba(16,185,129,0.10)",
      borderColor: "rgba(16,185,129,0.20)",
      color: "rgba(167,243,208,0.95)",
    },
    warn: {
      background: "rgba(230,196,100,0.10)",
      borderColor: "rgba(230,196,100,0.22)",
      color: "rgba(255,241,199,0.95)",
    },
    bad: {
      background: "rgba(239,68,68,0.10)",
      borderColor: "rgba(239,68,68,0.22)",
      color: "rgba(254,202,202,0.95)",
    },
  };

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-[12px] border" style={tones[tone] || tones.neutral}>
      {children}
    </span>
  );
}

/**
 * Card con fondo (imagen) + overlays para legibilidad.
 * overlayVariant:
 *  - "casillasSharp": nítido (recomendado)
 */
function HudCard({
  bg,
  children,
  className = "",
  style = {},
  overlay = true,
  overlayVariant = "casillasSharp",
  imgStyle = {},
}) {
  const variants = {
    casillasSharp: {
      overlays: [
        "linear-gradient(180deg, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.45) 42%, rgba(2,6,23,0.78) 100%)",
        "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.14), rgba(2,6,23,0) 62%)",
        "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.10), rgba(2,6,23,0) 62%)",
      ],
      imgFilter: "contrast(1.18) saturate(1.10) brightness(0.97)",
    },
  };

  const v = variants[overlayVariant] || variants.casillasSharp;

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
          style={{
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            filter: v.imgFilter,
            ...imgStyle,
          }}
        />
      ) : null}

      {overlay ? (
        <>
          <div className="absolute inset-0" style={{ background: v.overlays[0] }} />
          <div className="absolute inset-0" style={{ background: v.overlays[1] }} />
          <div className="absolute inset-0" style={{ background: v.overlays[2] }} />
        </>
      ) : null}

      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------- Data helpers ------------------- */
function toInputDateYYYYMMDD(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtKickoff(isoLike) {
  if (!isoLike) return "—";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function safeText(v, fallback = "—") {
  const s = String(v ?? "").trim();
  return s ? s : fallback;
}

function getStatusTone(statusShort = "", statusLong = "") {
  const s = `${statusShort} ${statusLong}`.toUpperCase();
  if (s.includes("FT") || s.includes("AET") || s.includes("PEN") || s.includes("FINAL")) return "neutral";
  if (s.includes("LIVE") || s.includes("1H") || s.includes("2H") || s.includes("IN PLAY")) return "good";
  if (s.includes("NS") || s.includes("NOT STARTED") || s.includes("SCHEDULED")) return "warn";
  if (s.includes("POSTP") || s.includes("CANC") || s.includes("SUSP") || s.includes("ABAN")) return "bad";
  return "neutral";
}

export default function Fixtures() {
  const { isLoggedIn } = useAuth();
  const abortRef = useRef(null);

  // Config API
  const API_BASE = (import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "");
  const ENDPOINT = API_BASE ? `${API_BASE}/api/fixtures` : `/api/fixtures`;

  // Filtros UI
  const [date, setDate] = useState(() => toInputDateYYYYMMDD(new Date()));
  const [country, setCountry] = useState("");
  const [league, setLeague] = useState("");
  const [team, setTeam] = useState("");
  const [onlyToday, setOnlyToday] = useState(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fixtures, setFixtures] = useState([]);

  const query = useMemo(() => {
    // Ajusta aquí según tu backend:
    // - si tu endpoint acepta date=YYYY-MM-DD, country, league, team -> perfecto
    // - si no, igual funciona sin filtros (solo muestra lo que devuelva)
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (country.trim()) params.set("country", country.trim());
    if (league.trim()) params.set("league", league.trim());
    if (team.trim()) params.set("team", team.trim());
    if (onlyToday) params.set("onlyToday", "1");
    return params.toString();
  }, [date, country, league, team, onlyToday]);

  async function loadFixtures() {
    setLoading(true);
    setError("");

    try {
      abortRef.current?.abort?.();
      const controller = new AbortController();
      abortRef.current = controller;

      const url = query ? `${ENDPOINT}?${query}` : ENDPOINT;
      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      const data = await res.json();

      // Normalización flexible:
      // - si tu backend devuelve {response:[...]} tipo API-FOOTBALL
      // - o si devuelve directamente [...]
      const list = Array.isArray(data) ? data : Array.isArray(data?.response) ? data.response : Array.isArray(data?.fixtures) ? data.fixtures : [];
      setFixtures(list);
    } catch (e) {
      if (String(e?.name) === "AbortError") return;
      setError(e?.message || "No se pudo cargar la lista de partidos.");
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <HudCard
          bg={BG_CASILLAS}
          overlayVariant="casillasSharp"
          className="mt-6"
          style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.18)` }}
        >
          <div className="p-6">
            <h1 className="text-xl md:text-2xl font-bold">Partidos</h1>
            <p className="text-slate-300 mt-2">
              Para ver partidos y estadísticas,{" "}
              <Link to="/login" className="underline font-semibold">
                inicia sesión
              </Link>
              .
            </p>
          </div>
        </HudCard>
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Fondo general suave (igual que perfil) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-18"
          style={{
            background: "radial-gradient(circle at center, rgba(16,185,129,0.45), rgba(15,23,42,0) 60%)",
          }}
        />
        <div
          className="absolute -top-52 right-[-140px] h-[560px] w-[560px] rounded-full blur-3xl opacity-14"
          style={{
            background: "radial-gradient(circle at center, rgba(230,196,100,0.38), rgba(15,23,42,0) 62%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle at 50% 18%, black 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Header */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillasSharp"
        className="mt-6"
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.18)`,
        }}
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
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(226,232,240,0.92)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
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

      {/* Filtros */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillasSharp"
        className="mt-4"
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(230,196,100,0.16)`,
        }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Filtros</div>
              <div className="text-xs text-slate-300 mt-1">
                Ajusta la búsqueda. Si tu backend no usa algunos parámetros, igual no rompe.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadFixtures()}
                className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                style={{ boxShadow: "0 0 22px rgba(230,196,100,0.12)" }}
              >
                Actualizar
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="block">
              <div className="text-xs text-slate-300 mb-1">Fecha</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2.5 text-sm outline-none focus:border-white/20"
              />
            </label>

            <label className="block">
              <div className="text-xs text-slate-300 mb-1">País</div>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Ej: Chile"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2.5 text-sm outline-none focus:border-white/20"
              />
            </label>

            <label className="block">
              <div className="text-xs text-slate-300 mb-1">Liga</div>
              <input
                value={league}
                onChange={(e) => setLeague(e.target.value)}
                placeholder="Ej: Primera"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2.5 text-sm outline-none focus:border-white/20"
              />
            </label>

            <label className="block">
              <div className="text-xs text-slate-300 mb-1">Equipo</div>
              <input
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Ej: Colo Colo"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-2.5 text-sm outline-none focus:border-white/20"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={onlyToday}
                onChange={(e) => setOnlyToday(e.target.checked)}
              />
              Solo hoy (si backend lo soporta)
            </label>

            <div className="text-xs text-slate-400">
              Endpoint: <span className="text-slate-300">{ENDPOINT}</span>
            </div>
          </div>
        </div>
      </HudCard>

      {/* Lista */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillasSharp"
        className="mt-4"
        style={{
          boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.16)`,
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
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(226,232,240,0.92)",
              }}
            >
              Zona horaria: <span className="font-semibold" style={{ color: GOLD }}>America/Santiago</span>
            </Chip>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-5 grid grid-cols-1 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl border border-white/10 bg-slate-950/25 p-4"
                  style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset" }}
                >
                  <div className="h-4 w-40 bg-white/10 rounded mb-3" />
                  <div className="h-3 w-64 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : fixtures.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/25 p-5 text-sm text-slate-200">
              No hay partidos para esos filtros/fecha.
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3">
              {fixtures.map((fx, idx) => {
                // Compatible con estructura API-FOOTBALL:
                const fixture = fx?.fixture || fx;
                const teams = fx?.teams || fx?.team || {};
                const leagueObj = fx?.league || {};
                const status = fixture?.status || {};
                const home = teams?.home?.name || fx?.home?.name || fx?.home || fx?.homeTeam || "Local";
                const away = teams?.away?.name || fx?.away?.name || fx?.away || fx?.awayTeam || "Visita";
                const kickoff = fixture?.date || fx?.date || fx?.kickoff || "";
                const leagueName = leagueObj?.name || fx?.leagueName || fx?.league || "Liga";
                const countryName = leagueObj?.country || fx?.country || "";

                const tone = getStatusTone(status?.short, status?.long);

                return (
                  <div
                    key={fixture?.id || fx?.id || idx}
                    className="rounded-3xl border border-white/10 bg-slate-950/25 p-4 md:p-5"
                    style={{
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 26px rgba(230,196,100,0.08)",
                    }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold truncate">
                            {safeText(home)} <span className="text-slate-400">vs</span> {safeText(away)}
                          </span>
                          <Badge tone={tone}>
                            {safeText(status?.short || status?.long || "NS")}
                          </Badge>
                        </div>

                        <div className="mt-1 text-xs text-slate-300">
                          {countryName ? `${countryName} • ` : ""}
                          {leagueName} • {fmtKickoff(kickoff)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
                        >
                          Ver estadísticas
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full text-sm font-semibold"
                          style={{
                            backgroundColor: GOLD,
                            color: "#0f172a",
                            boxShadow: "0 0 26px rgba(230,196,100,0.18)",
                          }}
                        >
                          Añadir a combinada
                        </button>
                      </div>
                    </div>

                    {/* Placeholder: mini panel de métricas (para que se vea pro) */}
                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        ["Forma", "—"],
                        ["Tarjetas", "—"],
                        ["Corners", "—"],
                        ["Prob.", "—"],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-2xl border px-3 py-2"
                          style={{
                            borderColor: "rgba(255,255,255,0.10)",
                            background: "rgba(2,6,23,0.35)",
                            backdropFilter: "blur(6px)",
                          }}
                        >
                          <div className="text-[11px] text-slate-300">{k}</div>
                          <div className="text-sm font-bold text-slate-100">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </HudCard>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Factor Victoria
      </div>
    </div>
  );
}
