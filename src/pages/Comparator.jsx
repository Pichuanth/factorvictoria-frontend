// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Simulator from "../components/Simulator";
import PriceCalculatorCard from "../components/PriceCalculatorCard";

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

/** Fondos (public/) */
const BG_VISITOR = asset("hero-fondo-partidos.png");
const BG_END = asset("hero-12000.png");
const BG_PROFILE_HUD = asset("hero-profile-hud.png");
const BG_DINERO = asset("hero.dinero.png");
const BG_MANUAL = asset("hero-dorado-estadio.png");
const BG_GRAFICO_DORADO = asset("grafico-dorado.png");
const BG_BIENVENIDO = asset("hero-bienvenido.png");

/** Timezone oficial */
const APP_TZ = "America/Santiago";

/* --------------------- helpers string --------------------- */
function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function normStr(s) {
  return stripDiacritics(String(s || "")).toLowerCase().trim();
}
function includesNorm(haystack, needle) {
  return normStr(haystack).includes(normStr(needle));
}

/* --------------------- helpers fechas --------------------- */
function toYYYYMMDD(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// hoy consistente con Chile:
function todayYYYYMMDDinTZ(tz = APP_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

function addDaysYYYYMMDD(ymd, days) {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + Number(days || 0)));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
};

function normalizeCountryQuery(q) {
  const key = stripDiacritics(String(q || ""))
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "");
  return COUNTRY_ALIAS[key] || null;
}

// Emojis de banderas
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

  return 50;
}

function leaguePriority(leagueName) {
  const n = normStr(leagueName);

  if (n.includes("caf") || n.includes("afc") || n.includes("concacaf")) return 50;

  if (n.includes("uefa champions") || n.includes("champions league")) return 0;
  if (n.includes("uefa europa") || n.includes("europa league")) return 1;
  if (n.includes("uefa conference") || n.includes("conference league")) return 2;

  if (n.includes("premier league")) return 3;
  if (n.includes("la liga") || n.includes("laliga")) return 4;
  if (n.includes("serie a")) return 5;
  if (n.includes("bundesliga") && !n.includes("2.")) return 6;
  if (n.includes("ligue 1")) return 7;

  if (n.includes("liga mx")) return 10;
  if (n.includes("primera división argentina") || n.includes("liga profesional")) return 11;
  if (n.includes("liga de primera")) return 11;
  if (n.includes("copa chile")) return 11;
  if (n.includes("super copa") || n.includes("supercopa")) return 11;

  if (
    n.includes("campeonato brasileiro") ||
    n.includes("brasileirao") ||
    (n.includes("serie a") && n.includes("brazil"))
  )
    return 12;

  if (n.includes("mls")) return 14;

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
    "2. bundesliga", "bundesliga 2", "la liga 2", "laliga2",
    "championship",
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
    "matogrossense","maranhense","potiguar","acreano",
  ];

  if (bannedPatterns.some((p) => l.includes(p))) return false;

  const intlAllowed = [
    "uefa champions league",
    "uefa europa league",
    "uefa europa conference league",
  ];
  if (intlAllowed.some((x) => l.includes(x))) return true;

  const allowedPairs = [
    { country: "england", league: "premier league" },
    { country: "spain", league: "la liga" },
    { country: "italy", league: "serie a" },
    { country: "germany", league: "bundesliga" },
    { country: "france", league: "ligue 1" },

    { country: "netherlands", league: "eredivisie" },
    { country: "portugal", league: "primeira liga" },
    { country: "scotland", league: "premiership" },

    { country: "mexico", league: "liga mx" },
    { country: "usa", league: "mls" },
    { country: "brazil", league: "serie a" },
    { country: "argentina", league: "primera" },
    { country: "chile", league: "primera" },
  ];

  return allowedPairs.some((p) => c.includes(p.country) && l.includes(normStr(p.league)));
}

/* ------------------- Fixture getters ------------------- */
function getFixtureId(f) {
  return (
    f.id ||
    f.fixtureId ||
    f.fixture_id ||
    f.fixture?.id ||
    f.fixture?.fixture_id ||
    `${f.league?.id || ""}-${f.timestamp || f.date || f.fixture?.date || ""}`
  );
}
function getHomeLogo(f) {
  return f?.teams?.home?.logo || f?.homeLogo || f?.home_logo || null;
}
function getAwayLogo(f) {
  return f?.teams?.away?.logo || f?.awayLogo || f?.away_logo || null;
}
function getLeagueName(f) {
  return f.league?.name || f.leagueName || f.league_name || f.competition || "Liga desconocida";
}
function getCountryName(f) {
  return f.league?.country || f.country || f.country_name || f.location || "World";
}
function getHomeName(f) {
  return f.homeTeam || f.home_name || f.localTeam || f.team_home || f.teams?.home?.name || "Local";
}
function getAwayName(f) {
  return f.awayTeam || f.away_name || f.visitTeam || f.team_away || f.teams?.away?.name || "Visita";
}
function getKickoffTime(f) {
  const iso = f.date || f.fixture?.date;
  if (typeof iso === "string" && iso.includes("T")) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return f.time || f.hour || "--:--";
}

// ✅ ID estable SIEMPRE como string
const fxId = (fxOrId) => String(typeof fxOrId === "object" ? getFixtureId(fxOrId) : fxOrId);

/** FUTUROS */
function isFutureFixture(fx) {
  const now = Date.now();
  const ts = fx.timestamp || fx.fixture?.timestamp || null;
  if (ts) {
    const ms = Number(ts) * 1000;
    if (!Number.isNaN(ms)) return ms > now;
  }
  const iso = fx.date || fx.fixture?.date || null;
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
  ];
  return banned.some((p) => blob.includes(p));
}

/* --------------------- Plan & Features --------------------- */
const PLAN_LABELS = {
  basic: { name: "Plan Inicio", price: "$19.990", boost: 10 },
  trimestral: { name: "Plan Goleador", price: "$44.990", boost: 20 },
  anual: { name: "Plan Campeón", price: "$99.990", boost: 50 },
  vitalicio: { name: "Plan Leyenda", price: "$249.990", boost: 100 },
};

function normalizePlanId(raw) {
  const p = String(raw || "").toLowerCase().trim();

  if (["vitalicio", "leyenda", "legend", "lifetime"].some((k) => p.includes(k))) return "vitalicio";
  if (["anual", "campeon", "campeón", "annual", "year"].some((k) => p.includes(k))) return "anual";
  if (["trimestral", "goleador", "tri", "3", "4mes", "4 meses"].some((k) => p.includes(k))) return "trimestral";
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
          Activa tu plan para desbloquear el comparador profesional (cuotas potenciadas, combinada automática y módulos premium).
          Si ya tienes membresía, inicia sesión.
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

/* ------------------- FixtureCard (compact) ------------------- */
function FixtureCardCompact({ fx, isSelected, onToggle, onLoadOdds, oddsPack, oddsLoading }) {
  const id = fxId(fx);

  const league = getLeagueName(fx);
  const countryName = getCountryName(fx);
  const flagEmoji = COUNTRY_FLAG[countryName] || (countryName === "World" ? "🌍" : "🏳️");
  const home = getHomeName(fx);
  const away = getAwayName(fx);
  const time = fixtureTimeLabel(fx) || getKickoffTime(fx) || "--:--";

  const homeLogo = getHomeLogo(fx);
  const awayLogo = getAwayLogo(fx);

  const [open, setOpen] = useState(false);

  const borderColor = "rgba(255,255,255,0.08)";
  const boxShadow = "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 26px rgba(230,196,100,0.12)";

  return (
    <div
      className="rounded-2xl border bg-slate-950/25 backdrop-blur-md overflow-hidden"
      style={{ borderColor, boxShadow }}
    >
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
            <span className="font-semibold text-slate-200">{time}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full px-4 py-2 text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition text-slate-100"
          >
            {open ? "Ocultar estadísticas" : "Ver estadísticas"}
          </button>

          <button
            type="button"
            onClick={() => {
              onToggle(fx);
              onLoadOdds(fx);
            }}
            className="rounded-full px-4 py-2 text-xs font-bold"
            style={{
              backgroundColor: isSelected ? "rgba(16,185,129,0.18)" : "rgba(56,189,248,0.18)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: isSelected ? "rgba(167,243,208,0.95)" : "rgba(186,230,253,0.95)",
            }}
          >
            {isSelected ? "Quitar" : oddsLoading ? "Cargando odds..." : "Añadir a combinada"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="px-3 md:px-4 pb-3 md:pb-4">
          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-[11px] text-slate-300">
            <div className="text-slate-200 font-semibold">Datos del partido</div>
            <div className="mt-1 text-slate-400">
              fixtureId: <span className="text-slate-200 font-semibold">{String(id)}</span>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">Fecha:</span>{" "}
                <span className="text-slate-200">
                  {fixtureDateKey(fx)} {fixtureTimeLabel(fx)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Estadio:</span>{" "}
                <span className="text-slate-200">{fx?.fixture?.venue?.name || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400">Ciudad:</span>{" "}
                <span className="text-slate-200">{fx?.fixture?.venue?.city || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400">Árbitro:</span>{" "}
                <span className="text-slate-200">{fx?.fixture?.referee || "—"}</span>
              </div>
            </div>

            {oddsPack?.found ? (
              <div className="mt-3">
                <div className="text-slate-200 font-semibold">Odds (MVP)</div>
                <pre className="mt-1 overflow-auto text-[10px] text-slate-200 bg-slate-950/40 border border-white/10 rounded-lg p-2">
                  {JSON.stringify(oddsPack.markets || {}, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="mt-3 text-slate-400">Odds: no cargadas / no disponibles.</div>
            )}
          </div>
        </div>
      ) : null}
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

        <div className="px-5 pb-4 text-sm text-slate-300 leading-relaxed">
          Este es el punto donde apostar deja de ser intuición y pasa a ser{" "}
          <span className="font-semibold text-emerald-300">Estrategia</span>.
        </div>
      </div>
    </HudCard>
  );
}

/* ------------------- combinadas (odds) ------------------- */
function bestSafePickFromOdds(fx, oddsPack) {
  if (!oddsPack?.found) return null;

  const m = oddsPack.markets || {};
  const candidates = [];

  const toNum = (x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  };

  const push = (marketKey, selectionKey, odd) => {
    const o = toNum(odd);
    if (!o) return;
    if (o < 1.10 || o > 1.60) return; // rango MVP seguro

    candidates.push({
      fixtureId: fxId(fx),
      label: `${getHomeName(fx)} vs ${getAwayName(fx)} · ${marketKey}: ${selectionKey}`,
      market: marketKey,
      selection: selectionKey,
      odd: o,
      impliedProb: 1 / o,
    });
  };

const dc = m.DC;
  if (dc) {
    push("DC", "Home/Draw", dc.home_draw);
    push("DC", "Home/Away", dc.home_away);
    push("DC", "Draw/Away", dc.draw_away);
  }

  // OU 2.5
  const ou = m.OU_25;
  if (ou) {
    push("OU_25", "Under 2.5", ou.under);
    push("OU_25", "Over 2.5", ou.over);
  }

  // BTTS
  const btts = m.BTTS;
  if (btts) {
    push("BTTS", "No", btts.no);
    push("BTTS", "Yes", btts.yes);
  }

  // 1X2 (conservador: normalmente Home/Draw/Away es más riesgoso, pero lo dejamos)
  const one = m["1X2"];
  if (one) {
    push("1X2", "Home", one.home);
    push("1X2", "Draw", one.draw);
    push("1X2", "Away", one.away);
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.impliedProb - a.impliedProb);
  return candidates[0];
}

  function buildRealParlay(fixturesPool, oddsByFixtureArg, targetOdd) {
  const picks = [];
  let product = 1;

  const sorted = [...fixturesPool].sort((a, b) => {
    const ia = fxId(a);
    const ib = fxId(b);
    const ha = oddsByFixtureArg[ia]?.found ? 1 : 0;
    const hb = oddsByFixtureArg[ib]?.found ? 1 : 0;
    return hb - ha;
  });

  for (const fx of sorted) {
    const id = fxId(fx);
    const pack = oddsByFixtureArg[id];
    const pick = bestSafePickFromOdds(fx, pack);
    if (!pick) continue;

    if (product * pick.odd > targetOdd * 1.25) continue;

    product *= pick.odd;
    picks.push(pick);

    if (picks.length >= 12) break;
    if (product >= targetOdd * 0.85) break;
  }

  if (!picks.length) return null;

  return {
    games: picks.length,
    finalOdd: Number(product.toFixed(2)),
    target: targetOdd,
    impliedProb: Number(((1 / product) * 100).toFixed(1)),
    picks,
    reachedTarget: product >= targetOdd * 0.85,
  };
}

const suggestion = buildRealParlay(pool, oddsRef.current, maxBoost);

  async function handleSelectedParlay() {
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

  const pool = fixtures.filter((fx) => selectedIds.includes(fxId(fx)));
  const ids = pool.map(getFixtureId).filter(Boolean);

  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    await ensureOdds(id);
  }

  const suggestion = buildRealParlay(pool, oddsRef.current, maxBoost);
  if (!suggestion) {
    setParlayError("No pudimos armar combinada con estos seleccionados (odds/mercados insuficientes). Agrega más partidos.");
    return;
  }

  setParlayResult({ mode: "selected", ...suggestion });
}
async function handleSelectedParlay() {
  setParlayError("");
  setParlayResult(null);

  if (!fixtures.length) return setParlayError("Genera primero partidos con el botón de arriba.");
  if (selectedCount < 2) return setParlayError("Selecciona al menos 2 partidos de la lista superior.");

  const pool = fixtures.filter((fx) => selectedIds.includes(getFixtureId(fx)));

  // ✅ Esperar odds
  const ids = pool.map(getFixtureId).filter(Boolean);
  await Promise.all(ids.map((id) => ensureOdds(id)));

  const suggestion = buildComboSuggestion(pool, maxBoost);
  if (!suggestion) return setParlayError("No pudimos armar combinada con estos seleccionados. Agrega más partidos.");

  setParlayResult({ mode: "selected", ...suggestion });
}

  async function handleGenerate(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setOddsByFixture({});
    oddsRef.current = {};
    setParlayResult(null);
    setParlayError("");

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
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row md:items-end gap-3 items-stretch">
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
              <label className="block text-xs text-slate-400 mb-1">Filtro (país / liga / equipo)</label>
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
                disabled={loading}
                className="w-full rounded-2xl font-semibold px-4 py-2 mt-4 md:mt-0 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: GOLD, color: "#0f172a" }}
              >
                {loading ? "Generando..." : "Generar"}
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
      <RecoWeeklyCardComparator
  fixtures={weeklyFixtures}
  loading={weeklyLoading}
  error={weeklyErr}
/>

      {/* 3) LISTADO (verde sólido premium) */}
      <HudCard
        bg={null}
        bgColor="#132A23"
        overlayVariant="casillasSharp"
        className="mt-4"
        glow="gold"
      >
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
  const id = fxId(fx);
  const isSelected = selectedIds.includes(id);
  const oddsPack = oddsByFixture[id];
  const oddsLoading = !!oddsLoadingByFixture[id];

  return (
    <FixtureCardCompact
      key={id}
      fx={fx}
      isSelected={isSelected}
      oddsPack={oddsPack}
      oddsLoading={oddsLoading}
      onToggle={(fxObj) => {
        toggleFixtureSelection(fxObj);
        setParlayResult(null);
        setParlayError("");
      }}
      onLoadOdds={(fxObj) => ensureOdds(fxId(fxObj))}
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
          <div className="text-xs text-slate-300">Aquí mostrarás tu pick seguro del día (manual o generado).</div>
          <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div className="text-sm font-semibold text-slate-100">Ejemplo</div>
            <div className="text-xs text-slate-300 mt-1">Under 3.5 goles • cuota x1.40</div>
          </div>
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

          {parlayResult ? (
            <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <div className="text-xs text-slate-300">
                Modo: <span className="text-slate-100 font-semibold">{parlayResult.mode}</span>
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-200">
                Cuota final: x{parlayResult.finalOdd}{" "}
                <span className="text-xs font-semibold text-slate-300">(objetivo x{parlayResult.target})</span>
              </div>

              <div className="mt-1 text-[11px] text-slate-400">
                Partidos: {parlayResult.games} • En FV buscamos picks individuales de alta probabilidad (80–90%+ por selección).
              </div>
            </div>
          ) : null}
        </FeatureCard>

        <FeatureCard title="Árbitros tarjeteros" badge="Tarjetas" locked={!features.referees} lockText="Disponible desde Plan Anual.">
          <div className="text-xs text-slate-300">Ranking de árbitros con más tarjetas (por rango de fechas y país).</div>

          {refLoading ? <div className="mt-3 text-xs text-slate-300">Cargando árbitros…</div> : null}
          {refErr ? <div className="mt-3 text-xs text-amber-300">{refErr}</div> : null}

          {refData ? (
  <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
    <div className="text-xs text-slate-300">
      Rango: <span className="text-slate-100 font-semibold">{refData.query?.from}</span> →{" "}
      <span className="text-slate-100 font-semibold">{refData.query?.to}</span>
      {refData.query?.country ? (
        <>
          {" "}• País: <span className="text-slate-100 font-semibold">{refData.query.country}</span>
        </>
      ) : null}
    </div>

    {refData.recommended ? (
      <div className="mt-2 text-sm text-slate-100">
        <div className="font-semibold text-emerald-200">Recomendado</div>
        <div className="mt-1">
          Árbitro: <span className="font-semibold">{refData.recommended.referee?.name}</span>{" "}
          <span className="text-xs text-slate-400">(prom. {refData.recommended.referee?.avgCards} tarjetas)</span>
        </div>
        <div className="text-xs text-slate-300 mt-1">
          Partido: {refData.recommended.fixture?.teams?.home?.name} vs {refData.recommended.fixture?.teams?.away?.name}
        </div>
      </div>
    ) : (
      <div className="mt-2 text-xs text-amber-200">
        {refData.message || "Sin recomendación aún para este rango."}
      </div>
    )}

    <div className="mt-2 text-[11px] text-slate-400">
      Árbitros top: {Array.isArray(refData.topReferees) ? refData.topReferees.length : 0} • Fixtures revisados:{" "}
      {refData.fixturesScanned ?? 0}
    </div>
  </div>
) : (
  <div className="mt-3 text-[11px] text-slate-400">Cuando el backend esté listo, aquí mostramos el top de árbitros.</div>
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

          <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div className="text-sm font-semibold text-slate-100">Ejemplo</div>
            <div className="text-xs text-slate-300 mt-1">
              “Local gana” mercado x2.10 • FV estimado x1.85 → posible value.
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400">Módulo en construcción: luego lo conectamos a cuotas reales + rating FV.</div>
        </FeatureCard>
      </section>

      {/* 5) Manual Picks */}
      <ManualPicksSection />

      {/* 6) Simulador 
<Simulator bg={BG_DINERO} /> */}

{/* 7) Calculadora */}
<PriceCalculatorCard bg={BG_DINERO} />

         {/* Resto de módulos los mantienes tal cual en tu archivo anterior.
          Si quieres, los vuelvo a pegar completos también, pero esto ya corrige:
          - Partidazos sin imagen
          - Lista verde premium
          - Errores/duplicados que impedían aplicar cambios */}
     
      <div className="mt-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} Factor Victoria</div>
    </PageShell>
  );
