// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Simulator from "../components/Simulator";
import PriceCalculatorCard from "../components/PriceCalculatorCard";
import RecoWeeklyCard from "../components/RecoWeeklyCard";
import {
  buildCandidatePicks,
  pickSafe,
  buildGiftPickBundle,   // ✅ ESTE FALTA
  buildParlay,
  buildValueList,
} from "../lib/fvModel";

const GOLD = "#E6C464";

const API_BASE =
  (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

/** ✅ Helper: rutas a public que funcionan también en /app (Vite BASE_URL) */
function asset(path) {
  const base = import.meta.env.BASE_URL || "/";
  const clean = String(path || "").replace(/^\/+/, "");
  return `${base}${clean}`;
}

const PLAN_LABELS = {
  basic: { name: "Plan Inicio", price: "$19.990", boost: 10 },
  trimestral: { name: "Plan Goleador", price: "$44.990", boost: 20 },
  anual: { name: "Plan Campeón", price: "$99.990", boost: 50 },
  vitalicio: { name: "Plan Leyenda", price: "$249.990", boost: 100 },
};

/** Fondos (public/) */
const BG_VISITOR = asset("hero-fondo-partidos.png");
const BG_END = asset("hero-12000.png");
const BG_PROFILE_HUD = asset("hero-profile-hud.png");
const BG_DINERO = asset("hero.dinero.png"); // verifica que exista EXACTO en /public
const BG_MANUAL = asset("hero-dorado-estadio.png");
const BG_GRAFICO_DORADO = asset("grafico-dorado.png");
const BG_BIENVENIDO = asset("hero-bienvenido.png");

/** Timezone oficial (igual que Fixtures) */
const APP_TZ = "America/Santiago";

/* --------------------- helpers base --------------------- */
function toOdd(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const s = String(v)
    .trim()
    .toLowerCase()
    .replace(/^x/i, "")     // quita "x1.22"
    .replace(/\s+/g, "")
    .replace(",", ".");     // "1,22" -> "1.22"

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normStr(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function toOdd(v) {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;

  const s = String(v)
    .trim()
    .toLowerCase()
    .replace(/^x/, "")     // quita "x1.22"
    .replace(/\s+/g, "")
    .replace(",", ".");    // "1,22" -> "1.22"

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function includesNorm(haystack, needle) {
  return normStr(haystack).includes(normStr(needle));
}

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysYYYYMMDD(baseYYYYMMDD, days) {
  const d = new Date(`${baseYYYYMMDD}T00:00:00`);
  d.setDate(d.getDate() + Number(days || 0));
  return toYYYYMMDD(d);
}

function refereeLevel(avg) {
  if (avg >= 5.5) return "Muy tarjetero";
  if (avg >= 4.5) return "Tarjetero";
  if (avg >= 3.5) return "Normal";
  return "Pocas tarjetas";
}

function getRefereeName(fx) {
  return fx?.fixture?.referee || fx?.referee || "";
}

/* ------------------- Helpers de fecha/hora (APP_TZ) ------------------- */
function fixtureDateKey(f) {
  const when = f?.fixture?.date || f?.date || "";
  if (!when) return "";
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function fixtureDateLabel(f) {
  const when = f?.fixture?.date || f?.date || "";
  if (!when) return "";
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: APP_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function fixtureTimeLabel(f) {
  const when = f?.fixture?.date || f?.date || "";
  if (!when) return "";
  const d = new Date(when);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* ------------------- País alias ------------------- */
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
  brasil: "Brazil",
  eeuu: "USA",
  estadosunidos: "USA",
  colombia: "Colombia"
};

function normalizeCountryQuery(q) {
  const key = normStr(q);
  return COUNTRY_ALIAS[key] || null;
}

/* Emojis banderas */
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
  Colombia: "🇨🇴"
};

/* ------------------- Prioridades / filtro TOP ------------------- */
function countryPriority(countryName) {
  const c = normStr(countryName);
  if (c.includes("england") || c.includes("inglaterra")) return 0;
  if (c.includes("spain") || c.includes("espana") || c.includes("españa")) return 1;
  if (c.includes("france") || c.includes("francia")) return 2;
  if (c.includes("italy") || c.includes("italia")) return 3;
  if (c.includes("germany") || c.includes("alemania")) return 4;

  if (c.includes("argentina")) return 5;
  if (c.includes("chile")) return 6;
  if (c.includes("portugal")) return 7;
  if (c.includes("mexico") || c.includes("méxico")) return 8;
  if (c.includes("usa")) return 9;
  if (c.includes("brazil") || c.includes("brasil")) return 10;
  if (c.includes("colombia")) return 11;

  return 50;
}

function leaguePriority(leagueName) {
  const n = normStr(leagueName);

  // UEFA aqui eliminé, uefa champions league, europa league y conference league

  // Big-5
  if (n.includes("uefa champions league")) return 0;
  if (n.includes("premier league")) return 3;
  if (n.includes("la liga") || n.includes("laliga")) return 4;
  if (n.includes("serie a")) return 5;
  if (n.includes("bundesliga") && !n.includes("2.")) return 6;
  if (n.includes("ligue 1")) return 7;
  if (n.includes("primera division") || n.includes("primera división") || n.includes("campeonato itau") || n.includes("campeonato itaú")) return 8;
  if (n.includes("copa chile")) return 9;

  // América
  if (n.includes("liga mx")) return 10;
  if (n.includes("primera division argentina") || n.includes("liga profesional")) return 11;
  if (n.includes("mls")) return 14;

    // Otras copas (robusto)
if (n.includes("libertadores")) return 15;
if (n.includes("sudamericana")) return 16;

// Copa Alemania suele venir como "dfb pokal" o "dfb-pokal"
if (n.includes("dfb") || n.includes("pokal") || n.includes("copa alemania")) return 17;

// Carabao Cup puede venir como "efl cup" o "carabao"
if (n.includes("carabao") || n.includes("efl cup") || n.includes("league cup")) return 18;

// Copa Argentina
if (n.includes("copa argentina")) return 19;

// Liga Colombia (puede venir como "primera a colombia", "categoría primera a", etc.)
if (n.includes("colombia")) return 20;

// CONCACAF Champions Cup (por tu screenshot de partidos)
if (n.includes("concacaf") && (n.includes("champions") || n.includes("champions cup"))) return 21;


  return 50;
}

function isAllowedCompetition(countryName, leagueName) {
  const c = normStr(countryName);
  const l = normStr(leagueName);

  const bannedPatterns = [
    "u23","u22","u21","u20","u19","u18","u17","u16",
    "youth","juvenil","reserves","reserve","b team"," ii",
    "development","professional development",
    "premier league 2","premier league 2 division",
    "women","femenil","femenino","femin","wsl",
    "friendly","friendlies","amistoso",
    "non league",
    "national league - south",
    "national league - north",
    "efl trophy",
    "serie c","serie d",
    "liga 3",
    "tercera division",
    "tercera division rfef",
    "paulista","paulista a2","baiano","goiano","cearense","pernambucano",
    "matogrossense","maranhense","potiguar","acreano","ofc",
    "ofc champions league",

  ];
  if (bannedPatterns.some((p) => l.includes(p))) return false;

  // ✅ Copas internacionales (permitidas)
const intlAllowedIncludes = [
  "libertadores",
  "sudamericana",
  "dfb pokal",          // copa alemania
  "copa alemania",
  "carabao cup",
  "efl cup",
  "copa argentina",
  "liga colombiana",
];

if (intlAllowedIncludes.some((k) => l.includes(k))) return true;

  const intlAllowedExact = new Set([
  "uefa champions league",
  "uefa europa league",
  "uefa europa conference league",
  "uefa super cup",
]);

if (intlAllowedExact.has(l)) return true;

  const allowedPairs = [
    { country: "england", league: "premier league" },
    { country: "spain", league: "la liga" },
    { country: "italy", league: "serie a" },
    { country: "germany", league: "bundesliga" },
    { country: "france", league: "ligue 1" },
    { country: "portugal", league: "primeira liga" },
    { country: "mexico", league: "liga mx" },
    { country: "usa", league: "mls" },
    { country: "brazil", league: "serie a" },
    { country: "argentina", league: "primera división argentina" },
    { country: "chile", league: "primera division" },
    { country: "chile", league: "primera división" },
    { country: "chile", league: "primera" },         // opcional si quieres más amplio
    { country: "chile", league: "copa chile" },


  ];

  return allowedPairs.some((p) => c.includes(p.country) && l.includes(normStr(p.league)));
}

/* ------------------- Fixture getters ------------------- */
function getFixtureId(f) {
  return (
    f?.id ||
    f?.fixtureId ||
    f?.fixture_id ||
    f?.fixture?.id ||
    f?.fixture?.fixture_id ||
    `${f?.league?.id || ""}-${f?.timestamp || f?.date || f?.fixture?.date || ""}`
  );
}

function getHomeLogo(f) {
  return f?.teams?.home?.logo || f?.homeLogo || f?.home_logo || null;
}
function getAwayLogo(f) {
  return f?.teams?.away?.logo || f?.awayLogo || f?.away_logo || null;
}

function getLeagueName(f) {
  return f?.league?.name || f?.leagueName || f?.league_name || f?.competition || "Liga desconocida";
}

function getCountryName(f) {
  return f?.league?.country || f?.country || f?.country_name || f?.location || "World";
}

function getHomeName(f) {
  return f?.homeTeam || f?.home_name || f?.localTeam || f?.team_home || f?.teams?.home?.name || "Local";
}

function getAwayName(f) {
  return f?.awayTeam || f?.away_name || f?.visitTeam || f?.team_away || f?.teams?.away?.name || "Visita";
}

function getKickoffTime(f) {
  const iso = f?.date || f?.fixture?.date;
  if (typeof iso === "string" && iso.includes("T")) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return f?.time || f?.hour || "--:--";
}

/** FUTUROS */
function isFutureFixture(fx) {
  const now = Date.now();

  const ts = fx?.timestamp || fx?.fixture?.timestamp || null;
  if (ts) {
    const ms = Number(ts) * 1000;
    if (!Number.isNaN(ms)) return ms > now;
  }

  const iso = fx?.date || fx?.fixture?.date || null;
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
    "reserves","reserve","youth","juvenil","sub-","sub ",
    " women","womens","femen"," fem"," w "," ii"," b ",
    "friendly","amistoso",
  ];
  return banned.some((p) => blob.includes(p));
}

/* --------------------- Plan & Features --------------------- */
function normalizePlanId(raw) {
  const p = String(raw || "").toLowerCase().trim();

  if (["vitalicio", "leyenda", "legend", "lifetime"].some((k) => p.includes(k))) return "vitalicio";
  if (["anual", "campeon", "campeón", "annual", "year"].some((k) => p.includes(k))) return "anual";
  if (["trimestral", "goleador", "tri", "3"].some((k) => p.includes(k))) return "trimestral";
  if (["basic", "mensual", "inicio", "month"].some((k) => p.includes(k))) return "basic";

  return "basic";
}

function getFeaturesByPlanId(planId) {
  const base = { giftPick: true, boosted: true };
  if (planId === "basic") return { ...base, referees: false, scorersValue: false, marketValue: false };
  if (planId === "trimestral") return { ...base, referees: false, scorersValue: false, marketValue: false };
  if (planId === "anual") return { ...base, referees: true, scorersValue: false, marketValue: false };
  return { ...base, referees: true, scorersValue: true, marketValue: true };
}

/* --------------------- UI helpers --------------------- */
function HudCard({
  bg,
  bgColor,
  children,
  className = "",
  style = {},
  overlayVariant = "casillas",
  glow = "gold",
  imgStyle = {},
}) {
  const variants = {
    player: {
      overlays: [
        "linear-gradient(90deg, rgba(2,6,23,0.92) 0%, rgba(2,6,23,0.68) 52%, rgba(2,6,23,0.40) 78%, rgba(2,6,23,0.25) 100%)",
        "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.20), rgba(2,6,23,0) 58%)",
        "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.18), rgba(2,6,23,0) 58%)",
      ],
      imgFilter: "contrast(1.12) saturate(1.08) brightness(0.95)",
    },
    casillas: {
      overlays: [
        "linear-gradient(180deg, rgba(2,6,23,0.88) 0%, rgba(2,6,23,0.62) 38%, rgba(2,6,23,0.86) 100%)",
        "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.18), rgba(2,6,23,0) 60%)",
        "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.14), rgba(2,6,23,0) 60%)",
      ],
      imgFilter: "contrast(1.10) saturate(1.06) brightness(0.96)",
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

  const v = variants[overlayVariant] || variants.casillas;
  const [o1, o2, o3] = v.overlays;

  const borderColor = "rgba(255,255,255,0.10)";
  const boxShadow =
    glow === "gold"
      ? [
          "0 0 0 1px rgba(255,255,255,0.03) inset",
          "0 18px 60px rgba(0,0,0,0.55)",
          "0 0 85px rgba(230, 196, 100, 0.30)",
        ].join(", ")
      : ["0 0 0 1px rgba(255,255,255,0.30) inset", "0 18px 60px rgba(0,0,0,0.55)"].join(", ");

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-slate-950/25 backdrop-blur-md ${className}`}
      style={{ borderColor, boxShadow, backgroundColor: bgColor || undefined, ...style }}
    >
      {bg ? (
        <img
          src={bg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: v.imgFilter, ...imgStyle }}
        />
      ) : null}

      <div className="absolute inset-0" style={{ background: o1 }} />
      <div className="absolute inset-0" style={{ background: o2 }} />
      <div className="absolute inset-0" style={{ background: o3 }} />

      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------- Partidazos manuales ------------------- */
const PARTIDAZOS_MANUAL = [
  { date: "2026-01-28", league: "UEFA Champions League", home: "Arsenal", away: "FC kairat" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "paris", away: "newcastle" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "atletico" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "napoli" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "barcelona", away: "København" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "Benfica", away: "madrid" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "Manchester city", away: "galatasaray" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "borusia", away: "inter" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "club brugge", away: "marseille" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "atalanta" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "Pafos" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "Juventus" },
  { date: "2026-01-28", league: "UEFA Champions League", home: "Liverpool", away: "qarabag fk" },

  // ✅ IDs estables
  { fixtureId: 1504664 },
  { fixtureId: 1451134 },
  { fixtureId: 1451132 },
  { fixtureId: 1451161 }, // fc barcelona champions 28-01-2026
  { fixtureId: 1451162 }, // Benfica vs madrid  28-01-2026
];

function picksFromFixturesComparator(fixtures) {
  const out = [];
  const used = new Set();

  for (const pick of PARTIDAZOS_MANUAL) {
    const p = pick || {};
    const wantedId = p.fixtureId;
    let found = null;

    if (wantedId) {
      found = fixtures.find((f) => String(getFixtureId(f)) === String(wantedId));
    } else {
      found = fixtures.find((f) => {
        const dKey = fixtureDateKey(f);
        const league = getLeagueName(f);
        const home = getHomeName(f);
        const away = getAwayName(f);

        if (p.date && dKey !== String(p.date)) return false;
        if (p.league && !includesNorm(league || "", p.league)) return false;
        if (p.home && !includesNorm(home || "", p.home)) return false;
        if (p.away && !includesNorm(away || "", p.away)) return false;

        return true;
      });
    }

    if (found) {
      const id = getFixtureId(found);
      if (!used.has(id)) {
        used.add(id);
        out.push(found);
      }
    }
  }

  return out;
}

/** ✅ Wrapper layout */
function PageShell({ children }) {
  return (
    <div className="relative max-w-5xl mx-auto px-4 pb-20">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-44 left-1/2 -translate-x-1/2 h-[640px] w-[640px] rounded-full blur-3xl opacity-20"
          style={{
            background: "radial-gradient(circle at center, rgba(16,185,129,0.55), rgba(15,23,42,0) 60%)",
          }}
        />
        <div
          className="absolute -top-52 right-[-140px] h-[560px] w-[560px] rounded-full blur-3xl opacity-16"
          style={{
            background: "radial-gradient(circle at center, rgba(230,196,100,0.45), rgba(15,23,42,0) 62%)",
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

      {children}
    </div>
  );
}

/* ------------------- Visitante ------------------- */
function VisitorBanner() {
  const nav = useNavigate();
  const goPlans = () => window.location.assign("/#planes");

  return (
    <HudCard bg={BG_VISITOR} overlayVariant="player" className="mt-4" glow="gold">
      <div className="p-5 md:p-7">
        <div className="text-xs tracking-wide text-emerald-200/90 font-semibold">Modo visitante</div>

        <div className="mt-1 text-lg md:text-xl font-bold text-slate-100">
          Para crear cuotas x10, x20, x50 y x100 necesitas membresía
        </div>

        <div className="mt-2 text-sm text-slate-200 max-w-2xl">
          Activa tu plan para desbloquear el comparador profesional (cuotas potenciadas, combinada automática y módulos
          premium). Si ya tienes membresía, inicia sesión.
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={goPlans}
            className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold"
            style={{ backgroundColor: GOLD, color: "#0f172a", boxShadow: "0 0 28px rgba(230,196,100,0.24)" }}
          >
            Comprar membresía
          </button>

          <button
            type="button"
            onClick={() => nav("/login")}
            className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    </HudCard>
  );
}

function LockedPlanCard({ title, price, bullets, href }) {
  return (
    <div className="relative rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm md:text-base font-semibold text-emerald-400">{title}</div>
          <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-200">
            {price}
          </div>
        </div>
        <div className="text-xs text-slate-400">Bloqueado por plan</div>
      </div>

      <ul className="mt-3 space-y-1 text-xs text-slate-300">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <a
        href={href}
        className="inline-flex mt-4 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-yellow-400/60 bg-yellow-500/10 text-yellow-200"
      >
        Ver este plan
      </a>
    </div>
  );
}

function VisitorPlansGrid() {
  return (
    <section className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <LockedPlanCard
        title="Plan Mensual"
        price="$19.990 · x10"
        href="/#plan-mensual"
        bullets={["Cuotas potenciadas hasta x10", "Cuota segura (regalo)", "Acceso a herramientas base"]}
      />
      <LockedPlanCard
        title="Plan Trimestral"
        price="$44.990 · x20"
        href="/#plan-trimestral"
        bullets={["Cuotas potenciadas hasta x20", "Mejor filtrado de partidos", "Más herramientas para combinadas"]}
      />
      <LockedPlanCard
        title="Plan Anual"
        price="$99.990 · x50"
        href="/#plan-anual"
        bullets={["Cuotas potenciadas hasta x50", "Módulo árbitros tarjeteros", "Top remates (hasta 5)"]}
      />
      <LockedPlanCard
        title="Plan Vitalicio"
        price="$249.990 · x100"
        href="/#plan-vitalicio"
        bullets={["Cuotas potenciadas hasta x100", "Value / desfase del mercado (VIP)", "Goleadores + remates (Top 10)"]}
      />
    </section>
  );
}

function VisitorEndingHero() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 overflow-hidden bg-white/5">
      <div className="w-full h-[260px] md:h-[360px] lg:h-[420px] bg-slate-950 overflow-hidden">
        <img src={BG_END} alt="Factor Victoria" className="w-full h-full object-cover object-center" />
      </div>
      <div className="p-4 text-center text-xs text-slate-500">© {new Date().getFullYear()} Factor Victoria</div>
    </div>
  );
}

/* --------------------- componente principal --------------------- */
function WelcomeProCard({ planInfo }) {
  return (
    <HudCard bg={BG_BIENVENIDO} overlayVariant="casillas" className="mt-4" glow="gold">
      <div className="p-5 md:p-6">
        <div className="text-emerald-200/90 text-xs font-semibold tracking-wide">Bienvenido a Factor Victoria PRO</div>
        <div className="mt-1 text-xl md:text-2xl font-bold text-slate-100">{planInfo.name} activo</div>

        <div className="mt-3 text-sm text-slate-300 leading-relaxed">
          Este es el punto donde apostar deja de ser intuición y pasa a ser <span className="font-semibold">estrategia</span>.
        </div>
      </div>
    </HudCard>
  );
}

/* ------------------- FixtureCard (compact) ------------------- */
function FixtureCardCompact({ fx, isSelected, onToggle, onLoadOdds, onLoadStats, fvPack, last5, fvLoading, fvErr }) {
  const id = getFixtureId(fx);

  const league = getLeagueName(fx);
  const countryName = getCountryName(fx);
  const flagEmoji = COUNTRY_FLAG[countryName] || (countryName === "World" ? "🌍" : "🏳️");
  const home = getHomeName(fx);
  const away = getAwayName(fx);
  const date = fixtureDateLabel(fx) || fixtureDateKey(fx);
  const time = fixtureTimeLabel(fx) || getKickoffTime(fx);
  const whenLabel = date ? `${date} · ${time || "--:--"}` : time || "--:--";

  const homeLogo = getHomeLogo(fx);
  const awayLogo = getAwayLogo(fx);

  const [open, setOpen] = useState(false);

  const borderColor = "rgba(255,255,255,0.08)";
  const boxShadow = "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 26px rgba(230,196,100,0.12)";

  return (
    <div className="rounded-2xl border bg-slate-950/25 backdrop-blur-md overflow-hidden" style={{ borderColor, boxShadow }}>
      <div className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {homeLogo ? (
                <img src={homeLogo} alt={home} className="w-7 h-7 rounded-full bg-white/5 object-contain" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/5" />
              )}
              <div className="truncate text-slate-100 font-semibold">{home}</div>
            </div>

            <div className="text-slate-400 font-semibold">vs</div>

            <div className="flex items-center gap-2 min-w-0">
              {awayLogo ? (
                <img src={awayLogo} alt={away} className="w-7 h-7 rounded-full bg-white/5 object-contain" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/5" />
              )}
              <div className="truncate text-slate-100 font-semibold">{away}</div>
            </div>
          </div>

          <div className="mt-1 text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span className="text-base leading-none">{flagEmoji}</span>
            <span className="font-medium">{countryName}</span>
            <span className="text-slate-500">·</span>
            <span className="truncate">{league}</span>
            <span className="text-slate-500">·</span>
            <span className="font-semibold text-slate-200">{whenLabel}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen((v) => {
                const next = !v;
                if (next) onLoadStats?.(id);
                return next;
              });
            }}
            className="rounded-full px-4 py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition text-slate-100"
          >
            {open ? "Ocultar estadísticas" : "Ver estadísticas"}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle?.(id);
              onLoadOdds?.(id);
            }}
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{
              backgroundColor: isSelected ? "rgba(16,185,129,0.18)" : "rgba(56,189,248,0.18)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: isSelected ? "rgba(167,243,208,0.95)" : "rgba(186,230,253,0.95)",
            }}
          >
            {isSelected ? "Quitar" : "Añadir a combinada"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-[11px] text-slate-300">
            {fvLoading ? (
              <div className="text-[11px] text-slate-300">Cargando estadísticas reales…</div>
            ) : fvPack ? (
              <div className="text-[11px] text-slate-300 leading-relaxed">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div>
  <span className="text-slate-400">Racha (últ.5) local:</span>{" "}
  <span className="text-slate-100 font-semibold">{last5?.home?.form || "--"}</span>
</div>

<div>
  <span className="text-slate-400">Racha (últ.5) visita:</span>{" "}
  <span className="text-slate-100 font-semibold">{last5?.away?.form || "--"}</span>
</div>

<div>
  <span className="text-slate-400">Goles (últ.5) local:</span>{" "}
  <span className="text-slate-100 font-semibold">
    {last5?.home?.gf ?? "--"} / {last5?.home?.ga ?? "--"}
  </span>
</div>

<div>
  <span className="text-slate-400">Goles (últ.5) visita:</span>{" "}
  <span className="text-slate-100 font-semibold">
    {last5?.away?.gf ?? "--"} / {last5?.away?.ga ?? "--"}
  </span>
</div>

                  <div>
                    <span className="text-slate-400">Corners prom:</span>{" "}
                    <span className="text-slate-100 font-semibold">
                      {last5?.home?.avgCorners ?? "-"} / {last5?.away?.avgCorners ?? "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Tarjetas prom:</span>{" "}
                    <span className="text-slate-100 font-semibold">
                      {last5?.home?.avgCards ?? "-"} / {last5?.away?.avgCards ?? "-"}
                    </span>
                  </div>
                  <div>
  <span className="text-slate-400">Goles esperados (FV):</span>{" "}
  <span className="text-emerald-200 font-semibold">
    {(fvPack?.model?.lambdaTotal ?? "--")}
  </span>
</div>

                </div>

                <div className="mt-2 text-slate-400">
                  fixtureId: <span className="text-slate-200 font-semibold">{String(id)}</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">
                Sin estadísticas aún (o no disponibles). Igual podemos estimar con heurísticas.
                <div className="mt-2 text-slate-400">
                  fixtureId: <span className="text-slate-200 font-semibold">{String(id)}</span>
                </div>
              </div>
            )}

            {fvErr ? <div className="mt-2 text-amber-300">Error stats: {fvErr}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------- FeatureCard ------------------- */
function FeatureCard({ title, badge, children, locked, lockText, bg }) {
  return (
    <HudCard bg={bg || BG_GRAFICO_DORADO} overlayVariant="casillas" glow="gold" className="overflow-hidden">
      <div className="relative p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm md:text-base font-semibold text-emerald-400">{title}</div>
            {badge ? (
              <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-200">
                {badge}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-3">{children}</div>

        {locked ? (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center p-4">
            <div className="max-w-sm text-center">
              <div className="text-sm font-semibold text-slate-50">Bloqueado por plan</div>
              <div className="mt-1 text-xs text-slate-300">{lockText || "Disponible en planes superiores."}</div>
              <Link
                to="/#planes"
                className="inline-flex mt-3 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold border border-yellow-400/60 bg-yellow-500/10 text-yellow-200"
              >
                Ver planes
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </HudCard>
  );
}

/* ------------------- Manual Picks ------------------- */
function ManualPicksSection() {
  const singles = [
    { label: "Arsenal gana (1X)", odd: 1.3, note: "Alta probabilidad" },
    { label: "Real Madrid (handicap+4)", odd: 1.1, note: "Conservador" },
  ];

  const combos = [
    { label: "Barcelona doble oportunidad", odd: 1.3, note: "Cuota media" },
    { label: "1+ goles en el primer tiempo", odd: 1.35, note: "Más riesgo" },
  ];

  const players = [
    { label: "Raphinha +1.5 remates", odd: 2.8, note: "Si es titular" },
    { label: "Raúl Asencio 0.5 faltas concedidas", odd: 1.45, note: "Tendencia" },
  ];

  function Card({ title, items }) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-100">{title}</div>
          <div className="text-xs font-semibold text-emerald-200">Cuotas exclusivas para miembros</div>
        </div>

        <div className="mt-3 space-y-2">
          {items.map((x) => (
            <div
              key={x.label}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-sm text-slate-100 font-semibold truncate">{x.label}</div>
                {x.note ? <div className="text-[11px] text-slate-400">{x.note}</div> : null}
              </div>
              <div className="text-sm font-bold text-emerald-200">x{Number(x.odd).toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="mt-6">
      <HudCard bg={BG_MANUAL} overlayVariant="casillas" glow="gold" className="overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="Partidos únicos" items={singles} />
            <Card title="Combinadas" items={combos} />
            <Card title="Jugadores" items={players} />
          </div>
        </div>
      </HudCard>
    </section>
  );
}

export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const [searchParams] = useSearchParams();

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYYYYMMDD(today));
  const [to, setTo] = useState(toYYYYMMDD(today));
  const [q, setQ] = useState("");

  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [loading, setLoading] = useState(false);
  const [generatedOk, setGeneratedOk] = useState(false);
  const okTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (okTimerRef.current) clearTimeout(okTimerRef.current);
    };
  }, []);

  const [fixtures, setFixtures] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  // ✅ Partidazos semanal
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyErr, setWeeklyErr] = useState("");
  const [weeklyFixtures, setWeeklyFixtures] = useState([]);

  // ✅ Multi-país
  const [selectedCountries, setSelectedCountries] = useState([]);

  // odds cache
  const [oddsByFixture, setOddsByFixture] = useState({});
  const oddsRef = useRef({});

  // FV pack cache (stats + modelo + markets)
  const [fvPackByFixture, setFvPackByFixture] = useState({});
  const [fvLoadingByFixture, setFvLoadingByFixture] = useState({});
  const fvRef = useRef({});
  const [fvErrByFixture, setFvErrByFixture] = useState({});

  const planId = useMemo(() => {
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "basic";
    return normalizePlanId(raw);
  }, [user]);

  const planInfo = useMemo(() => PLAN_LABELS[planId] || PLAN_LABELS.basic, [planId]);
  const maxBoost = planInfo.boost;
  const features = useMemo(() => getFeaturesByPlanId(planId), [planId]);
  const canReferees = !!features?.referees; // ✅ AQUÍ (dentro del componente)

  // combinadas
  const [parlayResult, setParlayResult] = useState(null);
  const [parlayError, setParlayError] = useState("");
  const [fvOutput, setFvOutput] = useState(null);

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

  const quickCountries = ["Chile", "España", "Portugal", "Italia", "Alemania", "Argentina", "Inglaterra", "Francia", "Brasil", "México"];

  function toggleCountryChip(countryEs) {
    const en = normalizeCountryQuery(countryEs) || countryEs;
    setSelectedCountries((prev) => (prev.includes(en) ? prev.filter((x) => x !== en) : [...prev, en]));
  }

  // ✅ cargar weekly al montar
  useEffect(() => {
    let alive = true;

    async function loadWeekly() {
      setWeeklyErr("");
      setWeeklyLoading(true);

      try {
        const fromW = toYYYYMMDD(new Date());
        const toW = addDaysYYYYMMDD(fromW, 7);

        const params = new URLSearchParams();
        params.set("from", fromW);
        params.set("to", toW);

        const res = await fetch(`${API_BASE}/api/fixtures?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
if (!window.__fvpackOnce) {
  window.__fvpackOnce = true;
  console.log("[FVPACK sample]", fixtureId, data);
  console.log("[FVPACK keys]", Object.keys(data || {}));
}

        const itemsRaw =
          (Array.isArray(data?.items) && data.items) ||
          (Array.isArray(data?.response) && data.response) ||
          (Array.isArray(data?.fixtures) && data.fixtures) ||
          [];

        const base = itemsRaw
          .filter(isFutureFixture)
          .filter((fx) => !isYouthOrWomenOrReserve(fx));

        const filteredTop = base.filter((fx) => isAllowedCompetition(getCountryName(fx), getLeagueName(fx)));

        const sorted = [...filteredTop].sort((a, b) => {
          const da = new Date(a?.fixture?.date || a?.date || 0).getTime();
          const db = new Date(b?.fixture?.date || b?.date || 0).getTime();
          if (da !== db) return da - db;

          const pla = leaguePriority(getLeagueName(a));
          const plb = leaguePriority(getLeagueName(b));
          if (pla !== plb) return pla - plb;

          const ca = countryPriority(getCountryName(a));
          const cb = countryPriority(getCountryName(b));
          if (ca !== cb) return ca - cb;

          const ta = fixtureTimeLabel(a) || getKickoffTime(a) || "";
          const tb = fixtureTimeLabel(b) || getKickoffTime(b) || "";
          return ta.localeCompare(tb);
        });

        if (!alive) return;
        setWeeklyFixtures(sorted.slice(0, 220));
      } catch (e) {
        if (!alive) return;
        setWeeklyErr(String(e?.message || e));
      } finally {
        if (!alive) return;
        setWeeklyLoading(false);
      }
    }

    loadWeekly();
    return () => {
      alive = false;
    };
  }, []);

  function toggleFixtureSelection(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedCount = selectedIds.length;

  // odds cache
const ensureOdds = useCallback(
  async (fixtureId) => {
    if (!fixtureId) return;

    const ODDS_TTL = 1000 * 60 * 10;
    const cached = oddsRef.current[fixtureId];
    
    // ✅ si ya hay cache y está fresco, no vuelvas a pedirlo
    if (cached?.fetchedAt && Date.now() - cached.fetchedAt < ODDS_TTL) return;

    try {
      const res = await fetch(`${API_BASE}/api/odds?fixture=${encodeURIComponent(fixtureId)}`);

      // ✅ si falla HTTP, igual guarda cache con fetchedAt (si no, el TTL no sirve)
      if (!res.ok) {
        const pack = { found: false, markets: {}, fetchedAt: Date.now() };
        oddsRef.current[fixtureId] = pack;
        setOddsByFixture((prev) => ({ ...prev, [fixtureId]: pack }));
        return;
      }

      const data = await res.json();
      const pack = {
        found: !!data?.found,
        markets: data?.markets || {},
        fetchedAt: Date.now(),
      };
      // DEBUG una sola vez
      if (!window.__oddsDebugOnce) {
     window.__oddsDebugOnce = true;
     console.log("[ODDS raw data]", fixtureId, data);
     console.log("[ODDS markets keys]", fixtureId, Object.keys(data?.markets || {}));
     console.log("[ODDS markets dump]", fixtureId, data?.markets);

     }

      oddsRef.current[fixtureId] = pack;
      setOddsByFixture((prev) => ({ ...prev, [fixtureId]: pack }));
    } catch (e) {
      // ✅ en catch, también guarda fetchedAt
      const pack = { found: false, markets: {}, fetchedAt: Date.now() };
      oddsRef.current[fixtureId] = pack;
      setOddsByFixture((prev) => ({ ...prev, [fixtureId]: pack }));
    }
  },
  [API_BASE]
);

// FV pack cache (stats + modelo + markets)
const ensureFvPack = useCallback(
  async (fixtureId) => {
    if (!fixtureId) return null;

    // cache rápido
    if (fvRef.current[fixtureId]) return fvRef.current[fixtureId];

    setFvLoadingByFixture((m) => ({ ...m, [fixtureId]: true }));
    setFvErrByFixture((m) => ({ ...m, [fixtureId]: null }));

    try {
      const res = await fetch(`${API_BASE}/api/fixture/${encodeURIComponent(fixtureId)}/fvpack`);
      if (!res.ok) throw new Error(`fvpack ${res.status}`);

      const data = await res.json();

      fvRef.current[fixtureId] = data;
      setFvPackByFixture((m) => ({ ...m, [fixtureId]: data }));
      return data;
    } catch (e) {
      console.error("ensureFvPack error", fixtureId, e);
      setFvErrByFixture((m) => ({ ...m, [fixtureId]: String(e?.message || e) }));
      fvRef.current[fixtureId] = null;
      setFvPackByFixture((m) => ({ ...m, [fixtureId]: null }));
      return null;
    } finally {
      setFvLoadingByFixture((m) => ({ ...m, [fixtureId]: false }));
    }
  },
  [API_BASE]
);

    const loadReferees = useCallback(async () => {
      
    try {
      setRefErr("");
      setRefLoading(true);
      setRefData(null);

      // MVP: usa el endpoint existente. Más adelante rankeamos con estadísticas de tarjetas.
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);

      // si hay un país seleccionado, tomamos el primero
      const country = (selectedCountries || []).filter(Boolean)[0];
      if (country) params.set("country", country);

      const res = await fetch(`${API_BASE}/api/referees/cards?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRefData(data);
    } catch (e) {
      setRefErr(String(e?.message || e));
    } finally {
      setRefLoading(false);
    }
  }, [from, to, selectedCountries, API_BASE]);

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

  const runGeneration = useCallback(
  async (mode) => {
    setParlayError("");
    setParlayResult(null);
    setFvOutput(null);
    
    try {
      if (!fixtures.length) {
        setParlayError("Genera primero partidos con el botón de arriba.");
        return;
      }

      const pool =
        mode === "selected"
          ? fixtures.filter((fx) => selectedIds.includes(getFixtureId(fx)))
          : fixtures.slice(0, Math.min(28, fixtures.length));

      if (mode === "selected" && pool.length < 2) {
        setParlayError("Selecciona al menos 2 partidos de la lista superior.");
        return;
      }
     
      const ids = pool.map(getFixtureId).filter(Boolean);

      // 1) precarga
      await Promise.all(ids.map((id) => Promise.all([ensureFvPack(id), ensureOdds(id)])));

      // 2) ahora sí valida si llegaron markets reales
      const anyMarkets = ids.some((id) => {
      const mk =
      oddsByFixture?.[id]?.markets ||
      oddsRef.current?.[id]?.markets ||
      null;
   return mk && Object.keys(mk).length > 0;
});

if (!anyMarkets) {
  setParlayError("Aún no hay cuotas reales (markets vacío). Generaré con Cuota FV por mientras.");
  // NO return -> dejamos que parlays usen FV
}

      // Referees: siempre que el plan lo permita
if (canReferees) {
  await loadReferees();
}

const candidatesByFixture = {};
let debugOnce = false;

// ================= DEBUG candidates / odds =================
const firstFx = Object.keys(candidatesByFixture)[0];

// debug resumen (FUERA del loop: aquí NO uses "id")
console.log("cand sample", Object.values(candidatesByFixture)[0]?.slice(0, 3));
console.log("cand fixtures:", Object.keys(candidatesByFixture).length);
console.log(
  "cand count total:",
  Object.values(candidatesByFixture).reduce((acc, arr) => acc + (arr?.length || 0), 0)
);

// model sample del primer fixture (si existe)
if (firstFx) {
  console.log(
    "[PARLAY] model sample",
    (candidatesByFixture[firstFx] || []).slice(0, 5).map((c) => ({
      pick: c.pick || c.label,
      prob: c.prob,
      lambdaTotal: c.lambdaTotal,
      gfH: c.gfH,
      gaH: c.gaH,
      gfA: c.gfA,
      gaA: c.gaA,
      fvOdd: c.fvOdd,
      marketOdd: c.marketOdd,
      usedOdd: c.usedOdd,
      usedOddDisplay: c.usedOddDisplay,
    }))
  );

  console.log(
    "[PARLAY] sample first fixture candidates",
    (candidatesByFixture[firstFx] || []).slice(0, 8)
  );

  console.log("[PARLAY] first fixture id =", firstFx);
  console.log("[PARLAY] first candidates (raw) =", (candidatesByFixture[firstFx] || []).slice(0, 5));

  console.log(
    "[PARLAY] odds sample =",
    (candidatesByFixture[firstFx] || []).slice(0, 5).map((c) => ({
      pick: c?.pick || c?.label,
      prob: c?.prob,
      fvOdd: c?.fvOdd,
      marketOdd: c?.marketOdd,
      usedOdd: c?.usedOdd,
      usedOddDisplay: c?.usedOddDisplay,
    }))
  );
}
for (const fx of pool) {
  const id = getFixtureId(fx);
  if (!id) continue;

  // 1) pack SIEMPRE definido aquí (nunca usar pack antes de esta línea)
  const pack = fvPackByFixture?.[id] || fvRef.current?.[id] || null;

  // 2) markets desde odds cache (independiente de pack)
  const markets =
    oddsByFixture?.[id]?.markets ||
    oddsRef.current?.[id]?.markets ||
    {};

  const rawCands = buildCandidatePicks({
  fixture: fx,
  pack: pack || {},
  markets,
});

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function shrinkProb(p, k = 0.45) { return 0.5 + (p - 0.5) * k; } // k<1 baja confianza

const fixedCands = (rawCands || []).map((c) => {
  const prob = Number(c?.prob);
  const probOk = Number.isFinite(prob) ? prob : null;

  // FV odd "más realista": baja confianza y evita extremos
  let fvOddAdj = c?.fvOdd;
  if (probOk != null) {
    const pAdj = clamp(shrinkProb(probOk, 0.45), 0.08, 0.90);
    fvOddAdj = 1 / pAdj;
  }

  const marketOddNum = toOdd(c?.marketOdd);
  const fvOddNum = toOdd(fvOddAdj) ?? fvOddAdj;

  const usedOddNum = marketOddNum ?? fvOddNum;

  return {
    ...c,
    fvOdd: fvOddNum,
    marketOdd: marketOddNum ?? c?.marketOdd, // si vino string, igual lo dejas para debug
    usedOdd: usedOddNum,
    usedOddDisplay: usedOddNum,
  };
});

candidatesByFixture[id] = fixedCands;

  // debug seguro (dentro del loop, aquí sí existe id)
  // console.log("[ODDS]", id, oddsRef.current?.[id]);
}


const flat = Object.values(candidatesByFixture).flat();

const usable = flat.filter((c) => {
  const n = toOdd(c.usedOddDisplay) ?? toOdd(c.usedOdd) ?? toOdd(c.marketOdd) ?? toOdd(c.fvOdd);
  return n != null && n > 1;
});

console.log("[PARLAY] candidates total =", flat.length);
console.log("[PARLAY] candidates usable(odd>1) =", usable.length);
console.log(
  "[PARLAY] usable sample =",
  usable.slice(0, 10).map((c) => ({
    pick: c.pick || c.label,
    prob: c.prob,
    fvOdd: c.fvOdd,
    marketOdd: c.marketOdd,
    usedOdd: c.usedOdd,
    usedOddDisplay: c.usedOddDisplay,
  }))
);
// ===========================================================
const candidatesByFixtureSanitized = Object.fromEntries(
  Object.entries(candidatesByFixture).map(([fxId, arr]) => {
    const clean = (arr || []).map((c) => {
      const fv = toOdd(c.fvOdd);
      const mk = toOdd(c.marketOdd);
      const used = toOdd(c.usedOddDisplay) ?? toOdd(c.usedOdd) ?? mk ?? fv;

      return {
        ...c,
        fvOdd: fv ?? c.fvOdd,
        marketOdd: mk ?? c.marketOdd,
        usedOdd: used ?? c.usedOdd,
        usedOddDisplay: used ?? c.usedOddDisplay,
      };
    });

    return [fxId, clean];
  })
);

const targets = [3, 5, 10, 20, 50, 100].filter((t) => t <= maxBoost);
console.log("[PARLAY] targets =", targets);

const parlays = targets
  .map((t) => {
    const r = buildParlay({ candidatesByFixture: candidatesByFixtureSanitized, target: t, cap: maxBoost });
    console.log("[PARLAY] buildParlay target", t, "=>", r);
    return r;
  })
  .filter(Boolean);

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function shrinkProb(p, k = 0.45) { return 0.5 + (p - 0.5) * k; } // k<1 baja confianza

const valueList = buildValueList(candidatesByFixture, 0.06);

console.log("parlays:", parlays);
console.log("valueList:", valueList?.length);

// console.log("[FVPACK keys]", String(id), fvPack && Object.keys(fvPack));
//console.log("[FVPACK last5]", String(id), fvPack?.last5);


if (!safe && !parlays.length) {
  setParlayError("No pudimos armar picks con stats/odds disponibles. Prueba con otro rango o liga.");
  return;
}

setFvOutput({ mode, safe, giftBundle, parlays, valueList, candidatesByFixture: candidatesByFixtureSanitized });

// si quieres que el “panel principal” muestre la mejor potenciadas:
if (parlays[0]) setParlayResult({ mode, ...parlays[0] });

    } catch (e) {
      console.error("[FV] runGeneration error", e);
      setParlayError(String(e?.message || e));
    }
  },
  [
    fixtures,
  selectedIds,
  ensureFvPack,
  ensureOdds,
  fvPackByFixture,
  oddsByFixture,
  maxBoost,
  canReferees,
  loadReferees,
  ]
);

const handleAutoParlay = () => runGeneration("auto");
const handleSelectedParlay = () => runGeneration("selected");

    async function handleGenerate() {
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

  async function handleLoadFixtures(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setOddsByFixture({});
    oddsRef.current = {};
    setParlayResult(null);
    setParlayError("");
    setFvOutput(null);

    setRefData(null);
    setRefErr("");

    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);

      const qTrim = String(q || "").trim();
      const countries = selectedCountries.filter(Boolean);

      if (countries.length === 1) {
        params.set("country", countries[0]);
        if (qTrim) params.set("q", qTrim);
      } else if (countries.length > 1) {
        if (qTrim) params.set("q", qTrim);
      } else {
        const countryEN = normalizeCountryQuery(qTrim);
        if (countryEN) params.set("country", countryEN);
        else if (qTrim) params.set("q", qTrim);
      }

      
      const res = await fetch(`${API_BASE}/api/fixtures?${params.toString()}`);
     if (!res.ok) throw new Error(`HTTP ${res.status}`);
     const data = await res.json();

      if (!window.__fixturesDebugOnce) {
  window.__fixturesDebugOnce = true;
  console.log("[FIXTURES raw]", data);
  console.log("[FIXTURES keys]", Object.keys(data || {}));
  console.log("[FIXTURES items sample]", (data?.items || data?.response || data?.fixtures || []).slice?.(0, 2));
}

      const itemsRaw =
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.response) && data.response) ||
        (Array.isArray(data?.fixtures) && data.fixtures) ||
        [];

      let items = itemsRaw;

      if (selectedCountries.length > 1) {
        items = items.filter((fx) => selectedCountries.includes(getCountryName(fx)));
      }

      const base = items
        .filter(isFutureFixture)
        .filter((fx) => !isYouthOrWomenOrReserve(fx));

      const filteredTop = base.filter((fx) => isAllowedCompetition(getCountryName(fx), getLeagueName(fx)));

      if (!filteredTop.length) {
        setErr("No encontramos partidos de ligas TOP para ese rango. Prueba 7–14 días y sin filtro.");
        setFixtures([]);
        return;
      }

      const sorted = [...filteredTop].sort((a, b) => {
        const da = new Date(a?.fixture?.date || a?.date || 0).getTime();
        const db = new Date(b?.fixture?.date || b?.date || 0).getTime();
        if (da !== db) return da - db;

        const pla = leaguePriority(getLeagueName(a));
        const plb = leaguePriority(getLeagueName(b));
        if (pla !== plb) return pla - plb;

        const ca = countryPriority(getCountryName(a));
        const cb = countryPriority(getCountryName(b));
        if (ca !== cb) return ca - cb;

        const ta = fixtureTimeLabel(a) || getKickoffTime(a) || "";
        const tb = fixtureTimeLabel(b) || getKickoffTime(b) || "";
        return ta.localeCompare(tb);
      });

      const LIMITED = sorted.slice(0, 140);

      setFixtures(LIMITED);
      setInfo(`API: ${itemsRaw.length} | base: ${base.length} | TOP: ${filteredTop.length} | mostrando: ${LIMITED.length}`);

      setGeneratedOk(true);
      if (okTimerRef.current) clearTimeout(okTimerRef.current);
      okTimerRef.current = setTimeout(() => setGeneratedOk(false), 2500);

      if (canReferees) await loadReferees();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  }

  /* =========================
      VISITANTE (NO LOGUEADO)
     ========================= */
  if (!isLoggedIn) {
    return (
      <PageShell>
        <VisitorBanner />
        <VisitorPlansGrid />

        <Simulator bg={BG_DINERO} />
        <PriceCalculatorCard bg={BG_DINERO} />

        <VisitorEndingHero />
      </PageShell>
    );
  }

  /* =========================
      LOGUEADO (COMPARADOR)
     ========================= */
  return (
    <PageShell>
      <WelcomeProCard planInfo={planInfo} />

      {/* 1) Filtros + Generar */}
      <HudCard bg={BG_PROFILE_HUD} overlayVariant="casillas" className="mt-4" glow="gold">
        <div className="p-4 md:p-6">
          <form onSubmit={handleLoadFixtures} className="flex flex-col md:flex-row md:items-end gap-3 items-stretch">
            <div className="flex-[2]">
              <label htmlFor="qFilter" className="block text-xs text-slate-400 mb-1">
                Filtro (país / liga / equipo)
              </label>
              <input
                id="qFilter"
                name="qFilter"
                placeholder="Ej: Chile, La Liga, Colo Colo, Premier League..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
              />
            </div>

            <div className="flex-1">
              <label htmlFor="fromDate" className="block text-xs text-slate-400 mb-1">
                Desde
              </label>
              <input
                id="fromDate"
                name="fromDate"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
              />
            </div>

            <div className="flex-1">
              <label htmlFor="toDate" className="block text-xs text-slate-400 mb-1">
                Hasta
              </label>
              <input
                id="toDate"
                name="toDate"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full rounded-xl bg-white/10 text-white px-3 py-2 border border-white/10"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl font-semibold px-4 py-2 mt-4 md:mt-0 disabled:opacity-60 disabled:cursor-not-allowed transition"
                style={{
                  backgroundColor: loading
                    ? "rgba(230,196,100,0.65)"
                    : generatedOk
                    ? "rgba(16,185,129,0.55)"
                    : GOLD,
                  color: "#0f172a",
                }}
              >
                {loading ? "Generando..." : generatedOk ? "Listo" : "Generar"}
              </button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickCountries.map((c) => {
              const en = normalizeCountryQuery(c) || c;
              const active = selectedCountries.includes(en);

              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCountryChip(c)}
                  className="text-xs md:text-sm rounded-full px-3 py-1 border transition"
                  style={{
                    borderColor: active ? "rgba(16,185,129,0.55)" : "rgba(255,255,255,0.15)",
                    background: active ? "rgba(16,185,129,0.16)" : "rgba(255,255,255,0.05)",
                    color: "rgba(226,232,240,0.95)",
                  }}
                  title={active ? "Quitar" : "Agregar"}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {err && <div className="mt-3 text-sm text-amber-300">{err}</div>}
          {!err && info && <div className="mt-3 text-xs text-slate-300/80">{info}</div>}
        </div>
      </HudCard>

      {/* 2) Partidazos */}
      <RecoWeeklyCard
        HudCard={HudCard}
        fixtures={weeklyFixtures}
        loading={weeklyLoading}
        error={weeklyErr}
        picksFromFixtures={picksFromFixturesComparator}
      />

      {/* 3) LISTADO */}
      <HudCard bg={null} bgColor="#132A23" overlayVariant="casillasSharp" className="mt-4" glow="gold">
        <section className="p-3 md:p-4">
          <div className="flex items-center justify-between px-2 py-2 text-[11px] md:text-xs text-slate-300 tracking-wide">
            <span className="uppercase">Partidos encontrados (COMPACT): {fixtures.length}</span>
            <span className="uppercase text-right">Usa “Añadir a combinada” para seleccionar y cargar cuotas.</span>
          </div>

          {fixtures.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Genera partidos para verlos aquí con el formato profesional.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {fixtures.map((fx) => {
  const id = getFixtureId(fx);
  if (!id) return null;

  const fvPack = fvPackByFixture[id] || fvRef.current?.[id] || null;

const last5 =
  fvPack?.last5 ||
  fvPack?.stats?.last5 ||
  fvPack?.form?.last5 ||
  null;

  const isSelected = selectedIds.includes(id);

  return (
    <FixtureCardCompact
      key={String(id)}
      fx={fx}
      isSelected={isSelected}
      fvPack={fvPack}
      last5={last5}
      onToggle={(fixtureId) => {
        toggleFixtureSelection(fixtureId);
        setParlayResult(null);
        setParlayError("");
        setFvOutput(null);
      }}
      onLoadOdds={(fixtureId) => ensureOdds(fixtureId)}
      onLoadStats={(fixtureId) => ensureFvPack(fixtureId)}
      fvLoading={!!fvLoadingByFixture[id]}
      fvErr={fvErrByFixture?.[id] || null}
    />
  );
})}

            </div>
          )}
        </section>
      </HudCard>

      {/* 4) MÓDULOS premium */}
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeatureCard title="Cuota segura (regalo)" badge="Alta probabilidad" locked={!features.giftPick}>
          <div className="text-xs text-slate-300">
  Pick con mayor probabilidad (FV). Si hay cuota de mercado, la mostramos; si no, usamos FV.
</div>

{fvOutput?.safe ? (
  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
    <div className="text-sm font-semibold text-slate-100">{fvOutput.safe.label}</div>
    <div className="text-xs text-slate-300 mt-1">
      {fvOutput.safe.home} vs {fvOutput.safe.away}
    </div>
    <div className="mt-2 text-xs text-slate-300">
      Prob FV: <span className="text-emerald-200 font-semibold">{Math.round(fvOutput.safe.prob * 100)}%</span>{" "}
      · Cuota FV justa: <span className="text-slate-100 font-semibold">x{fvOutput.safe.fvOdd}</span>
      {fvOutput.safe.marketOdd ? (
        <>
          {" "}· Mercado: <span className="text-slate-100 font-semibold">x{fvOutput.safe.marketOdd}</span>
        </>
      ) : null}
    </div>
  </div>
) : (
  <div className="mt-3 text-[11px] text-slate-400">Genera una combinada para que aparezca aquí.</div>
)}
        </FeatureCard>

        <FeatureCard title="Cuotas potenciadas" badge={`Hasta x${maxBoost}`} locked={!features.boosted}>
          <div className="text-xs text-slate-300">Arma una combinada automática o con partidos seleccionados.</div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleAutoParlay}
              className="px-4 py-2 rounded-full text-xs font-bold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              Generar combinada automática
            </button>

            <button
              type="button"
              onClick={handleSelectedParlay}
              className="px-4 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              Generar con seleccionados ({selectedCount})
            </button>
          </div>

          {parlayError ? <div className="mt-3 text-xs text-amber-300">{parlayError}</div> : null}

          <div className="mt-2 space-y-1">
  {(parlayResult?.legs || []).map((leg, idx) => {
  const oddToShow =
  (toOdd(leg.usedOddDisplay) ?? toOdd(leg.usedOdd)) > 1
    ? (toOdd(leg.usedOddDisplay) ?? toOdd(leg.usedOdd))
    : null;

  return (
    <div key={`${leg.fixtureId}-${idx}`} className="text-[11px] text-slate-300">
      <span className="text-slate-500">#{idx + 1}</span>{" "}
      <span className="text-slate-100 font-semibold">{leg.label}</span>{" "}
      <span className="text-slate-500">—</span>{" "}
      {leg.home} vs {leg.away}{" "}
      {oddToShow ? (
        <>
          <span className="text-slate-500">·</span>{" "}
          <span className="text-amber-200 font-semibold">{oddToShow}</span>
        </>
      ) : null}
    </div>
  );
})}
</div>

        </FeatureCard>

        <FeatureCard title="Árbitros tarjeteros" badge="Tarjetas" locked={!canReferees} lockText="Disponible desde Plan Anual.">
          <div className="text-xs text-slate-300">Ranking de árbitros con más tarjetas (por rango de fechas y país).</div>

          {refLoading ? <div className="mt-3 text-xs text-slate-300">Cargando árbitros…</div> : null}
          {refErr ? <div className="mt-3 text-xs text-amber-300">{refErr}</div> : null}

          {refData?.topReferees?.length ? (
  <ul className="mt-3 space-y-2">
    {refData.topReferees.slice(0, 5).map((r) => (
      <li key={r.id} className="text-slate-200">
        {r.name} — <span className="text-emerald-200 font-semibold">{r.avgCards}</span> tarjetas/partido
      </li>
    ))}
  </ul>
) : (
  <div className="mt-3 text-xs text-slate-400">
    Aún sin ranking (fixturesScanned: {refData?.fixturesScanned ?? 0}). Endpoint OK.
  </div>
)}
</FeatureCard>

        <FeatureCard
          title="Goleadores / Remates / Value"
          badge="VIP"
          locked={!(features.scorersValue || features.marketValue)}
          lockText="Disponible en planes superiores (Anual/Vitalicio)."
        >
          <div className="text-xs text-slate-300">Aquí reactivaremos los módulos avanzados (goleadores, remates, value del mercado).</div>
        </FeatureCard>

        <FeatureCard title="Cuota desfase del mercado" badge="Value" locked={!features.marketValue} lockText="Disponible desde Plan Vitalicio.">
          <div className="text-xs text-slate-300">Detecta cuotas con posible valor (desfase entre tu estimación y el mercado).</div>

          {fvOutput?.valueList?.length ? (
  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
    <div className="text-sm font-semibold text-slate-100">Value (desfase mercado vs FV)</div>

    <div className="mt-2 space-y-1">
      {fvOutput.valueList.map((v, idx) => {
        const edgePct =
          typeof v.valueEdge === "number" ? Math.round(v.valueEdge * 100) : null;

        return (
          <div key={`${v.fixtureId}-${idx}`} className="text-[11px] text-slate-300">
            <span className="text-slate-100 font-semibold">{v.home}</span>{" "}
            vs{" "}
            <span className="text-slate-100 font-semibold">{v.away}</span>{" "}
            <span className="text-slate-500">·</span>{" "}
            <span className="text-slate-100 font-semibold">{v.label}</span>{" "}
            <span className="text-slate-500">·</span>{" "}
            Mercado x<span className="text-slate-100 font-semibold">{v.marketOdd}</span>{" "}
            FV justa x<span className="text-slate-100 font-semibold">{v.fvOdd}</span>

            {edgePct !== null && edgePct > 0 ? (
              <>
                {" "}<span className="text-slate-500">·</span>{" "}
                <span className="text-amber-200 font-semibold">
                  Ventaja estimada +{edgePct}%
                </span>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  </div>
) : (
  <div className="mt-3 text-[11px] text-slate-400">
    Genera una combinada para buscar value (si la API entrega odds para esos fixtures).
  </div>
)}

        </FeatureCard>
      </section>

      {/* 5) Manual Picks */}
      <ManualPicksSection />

      {/* 7) Calculadora */}
      <PriceCalculatorCard bg={BG_DINERO} />

      <div className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} Factor Victoria</div>
    </PageShell>
  );
}
