// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const CYAN = "#4CC9F0"; // celeste “comparador”
const API_BASE =
  import.meta?.env?.VITE_API_BASE?.replace(/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

/** Fondos (public/) */
const BG_CASILLAS = "/hero-fondo-casillas.png"; // casillasSharp en tu public
const BG_JUGADOR = "/hero-profile-hud.png";
const BG_12000 = "/hero-12000.png";
const BG_PARTIDAZOS = "/hero-fondo-partidos.png";

/** IMPORTANTE: nombre fijo para el banner semanal; cada lunes reemplazas el archivo */
const IMG_PARTIDAZOS_SEMANA = "/partidazos-semana.png";

/* ------------------- helpers ------------------- */
function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const dt = new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function enumerateDates(fromStr, toStr, hardLimit = 10) {
  // Devuelve array de YYYY-MM-DD (máx hardLimit días) para no spamear el backend.
  const from = new Date(fromStr);
  const to = new Date(toStr);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  if (from > to) return [];

  const out = [];
  let cur = new Date(from);
  while (cur <= to && out.length < hardLimit) {
    out.push(toYYYYMMDD(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/* ------------------- Mini UI ------------------- */
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

function LockIcon({ size = 18, color = "rgba(230,196,100,0.9)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7.5 11V8.8c0-2.9 2.1-5.3 4.7-5.3s4.7 2.4 4.7 5.3V11"
        stroke={color}
        strokeWidth="1.6"
        opacity="0.9"
      />
      <path
        d="M7.2 11h9.6c1 0 1.8.8 1.8 1.8v6.4c0 1-.8 1.8-1.8 1.8H7.2c-1 0-1.8-.8-1.8-1.8v-6.4c0-1 .8-1.8 1.8-1.8Z"
        stroke={color}
        strokeWidth="1.6"
        opacity="0.9"
      />
      <path
        d="M12 15.2v2.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
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
  imgClassName = "",
  imgStyle = {},
}) {
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.70) 52%, rgba(2,6,23,0.42) 78%, rgba(2,6,23,0.25) 100%)",
          "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.20), rgba(2,6,23,0) 58%)",
          "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.18), rgba(2,6,23,0) 58%)",
        ]
      : [
          "linear-gradient(180deg, rgba(2,6,23,0.86) 0%, rgba(2,6,23,0.60) 38%, rgba(2,6,23,0.86) 100%)",
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
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          style={imgStyle}
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

/* ------------------- Reco semanal ------------------- */
function RecoWeeklyCard() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-white/5"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.16)",
      }}
    >
      <img
        src={BG_PARTIDAZOS}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,6,23,0.86) 0%, rgba(2,6,23,0.55) 48%, rgba(2,6,23,0.88) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.16), rgba(2,6,23,0) 60%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.16), rgba(2,6,23,0) 60%)",
        }}
      />

      <div className="relative p-5 md:p-6">
        <div className="text-xs tracking-wide text-emerald-200/90 font-semibold">
          Factor Victoria recomienda
        </div>
        <div className="mt-1 text-lg md:text-xl font-bold text-slate-100">Partidazos de la semana</div>
        <div className="mt-1 text-xs text-slate-300">
          Actualizado cada lunes. Estos son los encuentros más atractivos para analizar.
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 overflow-hidden">
          <img
            src={IMG_PARTIDAZOS_SEMANA}
            alt="Partidazos de la semana"
            className="w-full h-auto block"
            loading="lazy"
          />
        </div>

        <div className="mt-3 text-[11px] text-slate-400">
          Tip: reemplaza <span className="font-semibold">/public/partidazos-semana.png</span> cada lunes.
        </div>
      </div>
    </div>
  );
}

/* ------------------- Simulador ------------------- */
function formatMoney(value, currency) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;
  const decimals = currency === "CLP" ? 0 : 2;
  const locale = currency === "CLP" ? "es-CL" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(safe);
}

function GainSimulatorCard({ onGoPlans }) {
  const [currency, setCurrency] = useState("CLP");
  const [stake, setStake] = useState(10000);
  const [mult, setMult] = useState(10);

  const potential = Number(stake || 0) * Number(mult || 1);

  return (
    <HudCard
      bg={BG_CASILLAS}
      overlayVariant="casillas"
      className="mt-4"
      style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.14)` }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Simulador de ganancias</div>
            <div className="text-xs text-slate-300 mt-1">
              Estima cuánto podrías obtener con cuotas potenciadas.
            </div>
          </div>

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-full border border-white/10 bg-slate-950/30 px-3 py-2 text-xs text-slate-200 outline-none"
          >
            <option value="CLP">CLP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-300">Monto</div>
            <input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
              placeholder="Ej: 10000"
            />
            <div className="mt-2 text-[11px] text-slate-400">
              Vista: <span className="font-semibold">{formatMoney(stake, currency)}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-300">Cuota potenciada</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[10, 20, 50, 100].map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => setMult(x)}
                  className="px-3 py-2 rounded-full text-xs font-semibold border transition"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    background: mult === x ? "rgba(56,189,248,0.18)" : "rgba(2,6,23,0.25)",
                    color: mult === x ? "rgba(186,230,253,0.95)" : "rgba(226,232,240,0.92)",
                  }}
                >
                  x{x}
                </button>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Para activar x20/x50/x100 necesitas membresía.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-300">Resultado estimado</div>
            <div className="mt-2 text-lg font-bold" style={{ color: "rgba(230,196,100,0.95)" }}>
              {formatMoney(potential, currency)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">(Simulación simple: monto × multiplicador)</div>

            <button
              type="button"
              onClick={onGoPlans}
              className="mt-3 inline-flex w-full justify-center rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: GOLD,
                color: "#0f172a",
                boxShadow: "0 0 26px rgba(230,196,100,0.18)",
              }}
            >
              Ver planes
            </button>
          </div>
        </div>
      </div>
    </HudCard>
  );
}

/* ------------------- Fixtures ------------------- */
export default function Fixtures() {
  const { isLoggedIn } = useAuth();
  const nav = useNavigate();

  const today = useMemo(() => toYYYYMMDD(new Date()), []);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [filterText, setFilterText] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [fixtures, setFixtures] = useState([]);

  // CTA a planes
  const goPlans = () => nav("/#planes");

  function parseQuickFilter(q) {
    const raw = String(q || "").trim();
    if (!raw) return { country: "", league: "", team: "" };

    const parts = raw
      .split(/[,\-\/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      country: parts[0] || "",
      league: parts[1] || "",
      team: parts[2] || "",
    };
  }

  async function fetchDay(dateStr, { country, league, team }) {
    const params = new URLSearchParams();
    if (dateStr) params.set("date", dateStr);
    if (country) params.set("country", country);
    if (league) params.set("league", league);
    if (team) params.set("team", team);

    const url = `${API_BASE}/api/fixtures?${params.toString()}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Error ${r.status}`);
    const data = await r.json();

    const list = data?.fixtures || data?.response || data?.data || data || [];
    return Array.isArray(list) ? list : [];
  }

  async function onSearch() {
    setErr("");
    setLoading(true);
    try {
      const quick = parseQuickFilter(filterText);
      const dates = enumerateDates(fromDate, toDate, 10);
      if (!dates.length) {
        setFixtures([]);
        setErr("Rango de fechas inválido.");
        setLoading(false);
        return;
      }

      const chunks = [];
      for (const d of dates) {
        // eslint-disable-next-line no-await-in-loop
        const day = await fetchDay(d, quick);
        chunks.push(...day);
      }

      // Dedup (por fixture id si viene)
      const map = new Map();
      for (const f of chunks) {
        const id =
          f?.fixture?.id ??
          f?.id ??
          `${f?.teams?.home?.name}-${f?.teams?.away?.name}-${f?.fixture?.date || f?.date || ""}`;
        if (!map.has(id)) map.set(id, f);
      }

      setFixtures([...map.values()]);
    } catch (e) {
      setErr("No se pudieron cargar los partidos. Intenta nuevamente.");
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    onSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function fixtureTitle(f) {
    const home = f?.teams?.home?.name || f?.home?.name || "Local";
    const away = f?.teams?.away?.name || f?.away?.name || "Visita";
    return `${home} vs ${away}`;
  }

  function fixtureMeta(f) {
    const country = f?.league?.country || f?.country || "";
    const league = f?.league?.name || f?.league || "";
    const when = f?.fixture?.date || f?.date || "";
    let timeLabel = "";
    if (when) {
      const d = new Date(when);
      if (!Number.isNaN(d.getTime())) {
        timeLabel = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      }
    }
    return { country, league, timeLabel };
  }

  function fixtureFlagUrl(countryName) {
    const name = String(countryName || "").toLowerCase();

    const map = {
      chile: "cl",
      argentina: "ar",
      brazil: "br",
      brasil: "br",
      spain: "es",
      españa: "es",
      portugal: "pt",
      italy: "it",
      italia: "it",
      france: "fr",
      francia: "fr",
      england: "gb",
      "united kingdom": "gb",
      mexico: "mx",
      germany: "de",
      alemania: "de",
      usa: "us",
      "united states": "us",
    };

    const code = map[name];
    if (!code) return "";
    return `https://flagcdn.com/w40/${code}.png`;
  }

  const total = fixtures.length;

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* ------------------- Hero: Partidos (jugador) ------------------- */}
      <HudCard
        bg={BG_JUGADOR}
        overlayVariant="player"
        className="mt-6"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 46px rgba(230,196,100,0.18)` }}
        imgClassName="object-right"
        imgStyle={{ objectPosition: "80% 18%" }}
      >
        <div className="p-5 md:p-7 min-h-[180px] md:min-h-[160px]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Partidos</h1>
              <p className="text-slate-300 text-sm md:text-base mt-1 max-w-2xl">
                Este módulo está pensado para analizar antes de armar tus combinadas.
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

      {/* ------------------- Filtros (casillas) ------------------- */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillas"
        className="mt-4"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 40px rgba(230,196,100,0.14)` }}
      >
        <div className="p-5 md:p-6">
          <div>
            <div className="text-sm font-semibold">Filtros</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Desde</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-slate-100 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Hasta</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-slate-100 outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Filtro (país / liga / equipo)</label>
              <input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Ej: España, Premier League, Milan"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* ✅ Botón abajo (como pediste) */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onSearch}
              className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar partidos"}
            </button>
          </div>

          {/* Mensaje de “vista gratuita” */}
          {!isLoggedIn ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(230,196,100,0.28)",
                background: "rgba(230,196,100,0.08)",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: GOLD }}>
                Vista gratuita (limitada)
              </div>
              <div className="text-xs text-slate-200 mt-1">
                Puedes ver partidos del día. Para estadísticas avanzadas y cuotas potenciadas (x10, x20, x50 o x100),
                necesitas membresía.{" "}
                <button type="button" onClick={goPlans} className="underline font-semibold" style={{ color: GOLD }}>
                  Ver planes
                </button>
                .
              </div>
            </div>
          ) : null}

          {err ? <div className="mt-3 text-xs text-rose-300">{err}</div> : null}
        </div>
      </HudCard>

      {/* ✅ NUEVA: Partidazos de la semana (siempre entre filtros y resultados) */}
      <div className="mt-4">
        <RecoWeeklyCard />
      </div>

      {/* ------------------- Resultados (casillas) ------------------- */}
      <HudCard
        bg={BG_CASILLAS}
        overlayVariant="casillas"
        className="mt-4"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 36px rgba(230,196,100,0.12)` }}
      >
        <div className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Partidos encontrados</div>
              <div className="text-xs text-slate-300 mt-1">Total: {total}</div>
            </div>

            <Chip
              className="border-white/10"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(226,232,240,0.92)" }}
            >
              Zona horaria: <span className="font-semibold" style={{ color: GOLD }}>America/Santiago</span>
            </Chip>
          </div>

          {total === 0 && !loading ? (
            <div className="mt-4 text-sm text-slate-200">Por ahora no hay partidos para este rango o filtro.</div>
          ) : null}

          <div className="mt-4 space-y-4">
            {fixtures.slice(0, 60).map((f, idx) => {
              const title = fixtureTitle(f);
              const meta = fixtureMeta(f);
              const flagUrl = fixtureFlagUrl(meta.country);

              return (
                <div
                  key={f?.fixture?.id ?? f?.id ?? idx}
                  className="rounded-3xl border border-white/10 bg-slate-950/25 p-4 md:p-5"
                  style={{
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-bold truncate">{title}</div>

                      <div className="mt-1 text-xs text-slate-300 flex items-center gap-2">
                        {flagUrl ? (
                          <img
                            src={flagUrl}
                            alt=""
                            aria-hidden="true"
                            className="h-4 w-6 rounded-sm object-cover opacity-90"
                          />
                        ) : null}
                        <span className="truncate">
                          {meta.country ? `${meta.country} · ` : ""}
                          {meta.league ? `${meta.league} · ` : ""}
                          {meta.timeLabel ? `${meta.timeLabel}` : ""}
                        </span>
                      </div>
                    </div>

                    <span className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-200">
                      {f?.fixture?.status?.short || f?.status || "—"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    {/* Ver estadísticas (celeste) */}
                    <button
                      type="button"
                      onClick={() => (isLoggedIn ? alert("Aquí abrirás estadísticas (PRO).") : goPlans())}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full text-sm font-semibold border transition"
                      style={{
                        borderColor: "rgba(76,201,240,0.28)",
                        background: "rgba(76,201,240,0.14)",
                        color: "rgba(219,242,255,0.96)",
                        boxShadow: "0 0 28px rgba(76,201,240,0.12)",
                      }}
                    >
                      Ver estadísticas
                    </button>

                    {/* Añadir a combinada (oro) */}
                    <button
                      type="button"
                      onClick={() => (isLoggedIn ? alert("Añadir a combinada (PRO).") : goPlans())}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full text-sm font-semibold"
                      style={{
                        backgroundColor: GOLD,
                        color: "#0f172a",
                        boxShadow: "0 0 26px rgba(230,196,100,0.18)",
                      }}
                    >
                      Añadir a combinada
                    </button>
                  </div>

                  {/* Candados */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      { label: "1X2", key: "odds" },
                      { label: "Tarjetas", key: "cards" },
                      { label: "Corners", key: "corners" },
                      { label: "Prob.", key: "prob" },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 flex items-center justify-between"
                        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset" }}
                      >
                        <div>
                          <div className="text-xs text-slate-300">{item.label}</div>
                          <div className="text-sm font-bold text-slate-100 mt-0.5">—</div>
                        </div>
                        {!isLoggedIn ? <LockIcon /> : <span className="text-xs text-slate-400">OK</span>}
                      </div>
                    ))}
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
              );
            })}
          </div>
        </div>
      </HudCard>

      {/* ✅ NUEVO: Simulador antes de “Únete a la comunidad” */}
      <GainSimulatorCard onGoPlans={goPlans} />

      {/* ------------------- CTA final: 12.000 ------------------- */}
      <HudCard
        bg={BG_12000}
        overlayVariant="player"
        className="mt-4"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.16)` }}
        imgStyle={{ objectPosition: "70% 22%" }}
      >
        <div className="p-5 md:p-6">
          <div className="text-lg font-bold">Únete a la comunidad</div>
          <p className="text-sm text-slate-200 mt-1 max-w-xl">
            +12.000 usuarios activos. Miles confían en nuestros datos, simulador y picks para apostar con ventaja.
          </p>

          <button
            type="button"
            onClick={goPlans}
            className="mt-4 w-full md:w-fit px-6 py-3 rounded-full text-sm font-bold"
            style={{
              backgroundColor: GOLD,
              color: "#0f172a",
              boxShadow: "0 0 26px rgba(230,196,100,0.18)",
            }}
          >
            Ver planes
          </button>
        </div>
      </HudCard>

      <div className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} Factor Victoria</div>
    </div>
  );
}
