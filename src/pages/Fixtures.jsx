// src/pages/Fixtures.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";
const CYAN = "#4CC9F0";

const API_BASE =
  import.meta?.env?.VITE_API_BASE?.replace(/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

/** Fondos (public/) */
const BG_CASILLAS = "/hero-fondo-casillas.png";
const BG_JUGADOR = "/hero-profile-hud.png";
const BG_12000 = "/hero-12000.png";
const BG_PARTIDAZOS = "/hero-fondo-partidos.png";
const BG_DINERO = "/hero.dinero.png";

/* ------------------- helpers fechas ------------------- */
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

/* ------------------- helpers orden/importancia ------------------- */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Prioridad menor = más importante
function countryPriority(countryName) {
  const c = norm(countryName);

  if (c.includes("england") || c.includes("inglaterra")) return 0;
  if (c.includes("spain") || c.includes("espana") || c.includes("españa")) return 1;
  if (c.includes("france") || c.includes("francia")) return 2;
  if (c.includes("italy") || c.includes("italia")) return 3;
  if (c.includes("argentina")) return 4;
  if (c.includes("chile")) return 5;
  if (c.includes("portugal")) return 6;
  if (c.includes("mexico") || c.includes("méxico")) return 7;
  if (c.includes("germany") || c.includes("alemania")) return 8;

  return 50;
}

function leaguePriority(leagueName) {
  const n = norm(leagueName);

  // Champions SIEMPRE arriba
  if (n.includes("champions league") || n.includes("uefa champions")) return 0;

  // Europe
  if (n.includes("europa league") || n.includes("uefa europa")) return 1;
  if (n.includes("conference league") || n.includes("uefa conference")) return 2;

  // Big 5
  if (n.includes("premier league")) return 3;
  if (n.includes("la liga") || n.includes("laliga")) return 4;
  if (n.includes("serie a")) return 5;
  if (n.includes("bundesliga") && !n.includes("2.")) return 6;
  if (n.includes("ligue 1")) return 7;
  if (n.includes("copa del rey")) return 8;
  if (n.includes("paulista serie a1")) return 9;
  if (n.includes("liga MX")) return 10;
  if (n.includes("copa africana de naciones")) return 11;

  // Conmebol
  if (n.includes("libertadores")) return 12;
  if (n.includes("sudamericana")) return 13;

  return 50;
}

function fixtureDateKey(f) {
  const when = f?.fixture?.date || f?.date || "";
  if (!when) return "";
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return "";
  return toYYYYMMDD(d);
}

function fixtureTimeLabel(f) {
  const when = f?.fixture?.date || f?.date || "";
  if (!when) return "";
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function fixtureTitleParts(f) {
  const home = f?.teams?.home?.name || f?.home?.name || "Local";
  const away = f?.teams?.away?.name || f?.away?.name || "Visita";
  return { home, away };
}

function fixtureMeta(f) {
  const country = f?.league?.country || f?.country || "";
  const league = f?.league?.name || f?.league || "";
  const timeLabel = fixtureTimeLabel(f);
  return { country, league, timeLabel };
}

function teamLogo(teamObj) {
  return teamObj?.logo || "";
}

function safeTeamShort(name, max = 16) {
  const s = String(name || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function fixtureId(f) {
  return (
    f?.fixture?.id ??
    f?.id ??
    `${f?.teams?.home?.name}-${f?.teams?.away?.name}-${f?.fixture?.date || f?.date || ""}`
  );
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
 * ✅ HudCard estilo Perfil (tarjeta flotante + glow dorado)
 */
function HudCard({
  bg,
  bgColor,
  children,
  className = "",
  style = {},
  overlay = true,
  overlayVariant = "casillasSharp",
  glow = "gold",
  imgClassName = "",
  imgStyle = {},
}) {
  const variants = {
    player: {
      overlays: [
        "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.70) 52%, rgba(2,6,23,0.42) 78%, rgba(2,6,23,0.25) 100%)",
        "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.20), rgba(2,6,23,0) 58%)",
        "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.18), rgba(2,6,23,0) 58%)",
      ],
      imgFilter: "contrast(1.12) saturate(1.08) brightness(0.95)",
    },
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
  const [o1, o2, o3] = v.overlays;

  const borderColor = "rgba(255,255,255,0.10)";
  const boxShadow =
    glow === "gold"
      ? [
          "0 0 0 1px rgba(255,255,255,0.03) inset",
          "0 18px 60px rgba(0,0,0,0.55)",
          "0 0 70px rgba(230,196,100,0.18)",
        ].join(", ")
      : ["0 0 0 1px rgba(255,255,255,0.05) inset", "0 18px 60px rgba(0,0,0,0.55)"].join(", ");

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-slate-950/25 backdrop-blur-md ${className}`}
      style={{
        borderColor,
        boxShadow,
        backgroundColor: bgColor || undefined,
        ...style,
      }}
    >
      {bg ? (
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover ${imgClassName}`}
          style={{ filter: v.imgFilter, ...imgStyle }}
        />
      ) : null}

      {overlay ? (
        <>
          <div className="absolute inset-0" style={{ background: o1 }} />
          <div className="absolute inset-0" style={{ background: o2 }} />
          <div className="absolute inset-0" style={{ background: o3 }} />
        </>
      ) : null}

      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------- Partidazos manuales ------------------- */
/**
 * ✅ EDITA SOLO ESTA LISTA (PARTIDAZOS_MANUAL)
 * IMPORTANTE: agrega "date" cuando puedas (YYYY-MM-DD) para que sea 100% preciso.
 */
const PARTIDAZOS_MANUAL = [
  { date: "2026-01-20", league: "Champions League", match: "Inter" },
  { date: "2026-01-20", league: "Champions League", match: "Arsenal" },
  { date: "2026-01-20", league: "Champions League", match: "Real Madrid" },
  { date: "2026-01-20", league: "Champions League", match: "Monaco" },
  { date: "2026-01-20", league: "Champions League", match: "PSG" },
  { date: "2026-01-20", league: "Champions League", match: "Paris" },
  { date: "2026-01-20", league: "Champions League", match: "Manchester City" },
  { date: "2026-01-20", league: "Champions League", match: "Napoli" },
];

function matchIncludes(haystack, needle) {
  return norm(haystack).includes(norm(needle));
}

function picksFromFixtures(fixtures) {
  const out = [];
  const used = new Set();

  for (const pick of PARTIDAZOS_MANUAL) {
    const { fixtureId: wantedId, date, league, country, match } = pick || {};
    let found = null;

    if (wantedId) {
      found = fixtures.find((f) => String(f?.fixture?.id ?? f?.id ?? "") === String(wantedId));
    } else {
      found = fixtures.find((f) => {
        const dKey = fixtureDateKey(f);
        const meta = fixtureMeta(f);
        const { home, away } = fixtureTitleParts(f);
        const title = `${home} vs ${away}`;

        if (date && dKey !== date) return false;
        if (league && !matchIncludes(meta.league || "", league)) return false;
        if (country && !matchIncludes(meta.country || "", country)) return false;
        if (match && !matchIncludes(title, match)) return false;

        return true;
      });
    }

    if (found) {
      const id = fixtureId(found);
      if (!used.has(id)) {
        used.add(id);
        out.push(found);
      }
    }
  }

  return out;
}

function MatchLine({ f }) {
  const { home, away } = fixtureTitleParts(f);
  const meta = fixtureMeta(f);
  const hLogo = teamLogo(f?.teams?.home);
  const aLogo = teamLogo(f?.teams?.away);
  const dKey = fixtureDateKey(f);

  return (
    <div
      className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3"
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 truncate">
            {dKey} · {meta.league || "Liga"} {meta.country ? `· ${meta.country}` : ""}
          </div>

          <div className="mt-1 flex items-center gap-2 min-w-0">
            {hLogo ? (
              <img src={hLogo} alt="" aria-hidden="true" className="h-6 w-6 rounded-sm object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-white/5 border border-white/10" />
            )}

            <div className="text-sm font-semibold text-slate-100 truncate">{safeTeamShort(home, 18)}</div>

            <div className="text-xs font-bold" style={{ color: "rgba(230,196,100,0.80)" }}>
              vs
            </div>

            <div className="text-sm font-semibold text-slate-100 truncate">{safeTeamShort(away, 18)}</div>

            {aLogo ? (
              <img src={aLogo} alt="" aria-hidden="true" className="h-6 w-6 rounded-sm object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-white/5 border border-white/10" />
            )}
          </div>
        </div>

        <div
          className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-200"
          style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset" }}
        >
          {meta.timeLabel || "—"}
        </div>
      </div>
    </div>
  );
}

function LockedFixtureCard({ f, isLoggedIn, goPlans }) {
  const { home, away } = fixtureTitleParts(f);
  const meta = fixtureMeta(f);
  const hLogo = teamLogo(f?.teams?.home);
  const aLogo = teamLogo(f?.teams?.away);

  return (
    <div
      className="rounded-3xl border border-white/10 bg-slate-950/25 px-4 py-4"
      style={{
        boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 14px 44px rgba(0,0,0,0.50)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {hLogo ? (
              <img src={hLogo} alt="" aria-hidden="true" className="h-8 w-8 rounded-sm object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-sm bg-white/5 border border-white/10" />
            )}

            <div className="text-sm font-semibold text-slate-100 truncate">{safeTeamShort(home, 22)}</div>

            <div className="text-xs font-bold" style={{ color: "rgba(230,196,100,0.80)" }}>
              vs
            </div>

            <div className="text-sm font-semibold text-slate-100 truncate">{safeTeamShort(away, 22)}</div>

            {aLogo ? (
              <img src={aLogo} alt="" aria-hidden="true" className="h-8 w-8 rounded-sm object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-sm bg-white/5 border border-white/10" />
            )}
          </div>

          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {meta.league ? `${meta.league} · ` : ""}
            {meta.country ? `${meta.country} · ` : ""}
            {meta.timeLabel ? `${meta.timeLabel}` : ""}
          </div>
        </div>

        <span className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-200">
          {f?.fixture?.status?.short || f?.status || "—"}
        </span>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          { label: "1X2/Goles", key: "odds" },
          { label: "Tarjetas", key: "cards" },
          { label: "Corners", key: "corners" },
          { label: "Prob.", key: "prob" },
        ].map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 flex items-center justify-between"
            style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset", backdropFilter: "blur(8px)" }}
          >
            <div>
              <div className="text-xs text-slate-300">{item.label}</div>
              <div className="text-sm font-bold text-slate-100 mt-0.5">—</div>
            </div>
            <LockIcon />
          </div>
        ))}
      </div>

      {!isLoggedIn ? (
        <div className="mt-3 text-xs text-slate-300">
          Nota: Este contenido está bloqueado.{" "}
          <button type="button" onClick={goPlans} className="underline font-semibold" style={{ color: GOLD }}>
            Ver planes
          </button>
          .
        </div>
      ) : null}
    </div>
  );
}

function RecoWeeklyCard({ fixtures = [] }) {
  const picks = useMemo(() => picksFromFixtures(fixtures), [fixtures]);

  return (
    <HudCard bg={BG_PARTIDAZOS} overlayVariant="casillasSharp" glow="gold">
      <div className="relative p-5 md:p-6">
        <div className="text-xs tracking-wide text-emerald-200/90 font-semibold">Factor Victoria recomienda</div>
        <div className="mt-1 text-lg md:text-xl font-bold text-slate-100">Partidazos de la semana</div>
        <div className="mt-1 text-xs text-slate-300">Selección curada manualmente.</div>

        <div className="mt-4 space-y-2">
          {picks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
              Aún no hay coincidencias con tus partidazos manuales (revisa texto/fecha/liga).
            </div>
          ) : (
            picks.map((f, i) => <MatchLine key={`${fixtureId(f)}-${i}`} f={f} />)
          )}
        </div>

        <div className="mt-3 text-[11px] text-slate-400">
          Edita la lista <span className="font-semibold">PARTIDAZOS_MANUAL</span> para cambiar la selección.
        </div>
      </div>
    </HudCard>
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
      bg={BG_DINERO}
      overlayVariant="casillasSharp"
      className="mt-4"
      glow="gold"
      imgStyle={{ objectPosition: "60% 35%" }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Simulador de ganancias</div>
            <div className="text-xs text-slate-300 mt-1">Estima cuánto podrías obtener con cuotas potenciadas.</div>
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
              type="text"
              inputMode="numeric"
              value={formatMoney(stake, currency)}
              onChange={(e) => {
                const digits = String(e.target.value || "").replace(/[^\d]/g, "");
                const n = digits ? Number(digits) : 0;
                setStake(n);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
              placeholder={currency === "CLP" ? "$10.000" : "$100.00"}
            />
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
              style={{ background: GOLD, color: "#0f172a", boxShadow: "0 0 26px rgba(230,196,100,0.18)" }}
            >
              Ver planes
            </button>
          </div>
        </div>
      </div>
    </HudCard>
  );
}
function manualPickDates() {
  const set = new Set(
    (PARTIDAZOS_MANUAL || [])
      .map((p) => (p?.date ? String(p.date).trim() : ""))
      .filter(Boolean)
  );
  return [...set];
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

  const goPlans = () => nav("/#planes");

  function parseQuickFilter(q) {
    const raw = String(q || "").trim();
    if (!raw) return { country: "", league: "", team: "" };

    const parts = raw
      .split(/[,\-\/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    return { country: parts[0] || "", league: parts[1] || "", team: parts[2] || "" };
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

  function manualPickDates() {
    // Trae las fechas únicas definidas en PARTIDAZOS_MANUAL (para que SIEMPRE aparezcan arriba)
    const s = new Set();
    for (const p of PARTIDAZOS_MANUAL) {
      if (p?.date) s.add(String(p.date));
    }
    return [...s];
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
      return;
    }

    // traer fechas de PARTIDAZOS aunque no estén en el rango
    const extra = manualPickDates().filter((d) => !dates.includes(d));

    const chunks = [];

    // rango del usuario (aplica filtro)
    for (const d of dates) {
      // eslint-disable-next-line no-await-in-loop
      const day = await fetchDay(d, quick);
      chunks.push(...day);
    }

    // fechas partidazos (NO aplica filtro para no romperlos)
    for (const d of extra) {
      // eslint-disable-next-line no-await-in-loop
      const day = await fetchDay(d, { country: "", league: "", team: "" });
      chunks.push(...day);
    }

    // Dedup
    const map = new Map();
    for (const f of chunks) {
      const id = fixtureId(f);
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

  // Orden general
  const fixturesSorted = useMemo(() => {
    const arr = Array.isArray(fixtures) ? [...fixtures] : [];

    arr.sort((a, b) => {
      const da = new Date(a?.fixture?.date || a?.date || 0).getTime();
      const db = new Date(b?.fixture?.date || b?.date || 0).getTime();
      if (da !== db) return da - db;

      const la = a?.league?.name || a?.league || "";
      const lb = b?.league?.name || b?.league || "";
      const pa = leaguePriority(la);
      const pb = leaguePriority(lb);
      if (pa !== pb) return pa - pb;

      const ca = countryPriority(a?.league?.country || a?.country || "");
      const cb = countryPriority(b?.league?.country || b?.country || "");
      if (ca !== cb) return ca - cb;

      return String(la).localeCompare(String(lb));
    });

    return arr;
  }, [fixtures]);

  const picksAll = useMemo(() => picksFromFixtures(fixturesSorted), [fixturesSorted]);
  const picksTop3 = useMemo(() => picksAll.slice(0, 3), [picksAll]);

  // Agrupar SOLO para la sección "Todos los partidos" (del rango del usuario)
  const baseDatesUser = useMemo(() => new Set(enumerateDates(fromDate, toDate, 10)), [fromDate, toDate]);

  const groupedCompact = useMemo(() => {
    const byDate = new Map();

    for (const f of fixturesSorted) {
      const dKey = fixtureDateKey(f) || "Sin fecha";

      // IMPORTANT: acá filtramos solo el rango del usuario (para que los extras manuales no contaminen “todos”)
      if (!baseDatesUser.has(dKey)) continue;

      const meta = fixtureMeta(f);
      const league = meta.league || "Liga";
      const cPr = countryPriority(meta.country);
      const lPr = leaguePriority(league);
      const lKey = `${lPr}|${cPr}|${league}|${meta.country || ""}`;

      if (!byDate.has(dKey)) byDate.set(dKey, new Map());
      const leagueMap = byDate.get(dKey);

      if (!leagueMap.has(lKey)) leagueMap.set(lKey, []);
      leagueMap.get(lKey).push(f);
    }

    const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b));
    return dates.map((dKey) => {
      const leagueMap = byDate.get(dKey);
      const leagues = [...leagueMap.keys()]
        .sort((a, b) => {
          const sa = String(a).split("|");
          const sb = String(b).split("|");

          const lpa = Number(sa[0] || 999);
          const lpb = Number(sb[0] || 999);
          if (lpa !== lpb) return lpa - lpb;

          const cpa = Number(sa[1] || 999);
          const cpb = Number(sb[1] || 999);
          if (cpa !== cpb) return cpa - cpb;

          return String(a).localeCompare(String(b));
        })
        .map((k) => {
          const parts = String(k).split("|");
          const leagueName = parts[2] || "Liga";
          const items = leagueMap.get(k) || [];
          items.sort((x, y) => {
            const tx = new Date(x?.fixture?.date || x?.date || 0).getTime();
            const ty = new Date(y?.fixture?.date || y?.date || 0).getTime();
            return tx - ty;
          });
          return { leagueName, items };
        });

      return { dKey, leagues };
    });
  }, [fixturesSorted, baseDatesUser]);

  const totalUserRange = useMemo(() => {
    // total SOLO del rango usuario
    let count = 0;
    for (const f of fixturesSorted) {
      const dKey = fixtureDateKey(f);
      if (baseDatesUser.has(dKey)) count += 1;
    }
    return count;
  }, [fixturesSorted, baseDatesUser]);

  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      {/* Fondo ambiental */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle at center, rgba(16,185,129,0.55), rgba(15,23,42,0) 60%)" }}
        />
        <div
          className="absolute -top-52 right-[-140px] h-[560px] w-[560px] rounded-full blur-3xl opacity-16"
          style={{ background: "radial-gradient(circle at center, rgba(230,196,100,0.45), rgba(15,23,42,0) 62%)" }}
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

      {/* Hero */}
      <HudCard
        bg={BG_JUGADOR}
        overlayVariant="player"
        className="mt-6"
        glow="gold"
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
      <HudCard bg={BG_PARTIDAZOS} overlayVariant="casillasSharp" className="mt-4" glow="gold">
        <div className="p-5 md:p-6">
          <div className="text-sm font-semibold">Filtros</div>

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

          {!isLoggedIn ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3"
              style={{
                borderColor: "rgba(230,196,100,0.28)",
                background: "rgba(230,196,100,0.08)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: GOLD }}>
                Vista gratuita (limitada)
              </div>
              <div className="text-xs text-slate-200 mt-1">
                Para estadísticas avanzadas y cuotas potenciadas (x10, x20, x50 o x100), necesitas membresía.{" "}
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

      {/* 1) Partidazos de la semana (manual) */}
      <div className="mt-4">
        <RecoWeeklyCard fixtures={fixturesSorted} />
      </div>

      {/* 2) Partidazos bloqueados (solo top 3) */}
      <HudCard
  bg={null}
  bgColor="#071a17"
  overlayVariant="casillasSharp"
  className="mt-4"
  glow="gold"
>
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Partidazos bloqueados</div>
              <div className="text-xs text-slate-300 mt-1">Solo 3 destacados para mostrar el valor de la membresía.</div>
            </div>

            <Chip
              className="border-white/10"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(226,232,240,0.92)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset",
              }}
            >
              Zona horaria: <span className="font-semibold" style={{ color: GOLD }}>America/Santiago</span>
            </Chip>
          </div>

          <div className="mt-4 space-y-3">
            {picksTop3.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
                Aún no hay coincidencias para bloquear. Revisa tus textos en PARTIDAZOS_MANUAL (ej: “Inter Milan vs Arsenal”).
              </div>
            ) : (
              picksTop3.map((f) => (
                <LockedFixtureCard key={fixtureId(f)} f={f} isLoggedIn={isLoggedIn} goPlans={goPlans} />
              ))
            )}
          </div>
        </div>
      </HudCard>

      {/* 3) Todos los partidos (del rango del usuario) en modo compacto */}
      <HudCard bg={null} bgColor="#071a17" overlayVariant="casillasSharp" className="mt-4" glow="gold">
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Todos los partidos</div>
              <div className="text-xs text-slate-300 mt-1">Total (según tu filtro): {totalUserRange}</div>
            </div>

            <div className="text-[11px] text-slate-400">Ligas importantes primero</div>
          </div>

          {totalUserRange === 0 && !loading ? (
            <div className="mt-4 text-sm text-slate-200">Por ahora no hay partidos para este rango o filtro.</div>
          ) : null}

          <div className="mt-5 space-y-6">
            {groupedCompact.map((day) => (
              <div key={day.dKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-slate-100">{day.dKey}</div>
                </div>

                {day.leagues.map((lg) => (
                  <div key={`${day.dKey}-${lg.leagueName}`} className="rounded-3xl border border-white/10 bg-slate-950/20">
                    <div className="px-4 md:px-5 py-3 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-100">{lg.leagueName}</div>
                      <div
                        className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-200"
                        style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset" }}
                      >
                        {lg.items.length} partidos
                      </div>
                    </div>

                    <div className="px-3 md:px-4 pb-4 space-y-2">
                      {lg.items.map((f) => (
                        <MatchLine key={fixtureId(f)} f={f} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {!isLoggedIn ? (
            <div className="mt-4 text-xs text-slate-300">
              Nota: Para ver estadísticas avanzadas, picks y cuotas potenciadas,{" "}
              <button type="button" onClick={goPlans} className="underline font-semibold" style={{ color: GOLD }}>
                activa tu plan
              </button>
              .
            </div>
          ) : null}
        </div>
      </HudCard>

      {/* Simulador */}
      <GainSimulatorCard onGoPlans={goPlans} />

      {/* CTA final */}
      <HudCard bg={BG_12000} overlayVariant="player" className="mt-4" glow="gold" imgStyle={{ objectPosition: "70% 22%" }}>
        <div className="p-5 md:p-6">
          <div className="text-lg font-bold">Únete a la comunidad</div>
          <p className="text-sm text-slate-200 mt-1 max-w-xl">
            +12.000 usuarios activos. Miles confían en nuestros datos, simulador y picks para apostar con ventaja.
          </p>

          <button
            type="button"
            onClick={goPlans}
            className="mt-4 w-full md:w-fit px-6 py-3 rounded-full text-sm font-bold"
            style={{ backgroundColor: GOLD, color: "#0f172a", boxShadow: "0 0 26px rgba(230,196,100,0.18)" }}
          >
            Unirme
          </button>
        </div>
      </HudCard>

      <div className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} Factor Victoria</div>
    </div>
  );
}
