// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

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
const BG_PARTIDAZOS = asset("partidazos-semana.png");
const BG_GRAFICO_DORADO = asset("grafico-dorado.png");
const BG_PASTO = asset("hero-pasto.png");
const BG_ESTADIO_PAGE = asset("estadio-fondo.png");
const BG_VERDE_GENERAR = asset("hero-verde-generar.png");

/* --------------------- helpers --------------------- */

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function stripDiacritics(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Alias ES -> EN para country de API-SPORTS
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

const IMPORTANT_LEAGUES = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Primeira Liga",
  "Eredivisie",

  "FA Cup",
  "EFL Cup",
  "Copa del Rey",
  "DFB Pokal",
  "Coppa Italia",
  "Coupe de France",
  "Supercopa",
  "Super Cup",

  "UEFA Champions League",
  "UEFA Europa League",
  "UEFA Conference League",
  "Copa Libertadores",
  "Copa Sudamericana",
  "Club World Cup",
  "World Cup",
  "Euro Championship",

  "Liga MX",
  "Brasileirão",
  "Copa do Brasil",
  "Primera Division",
  "Copa Argentina",
  "Copa Chile",
];

// Prioridad para ordenar ligas
function getLeaguePriority(leagueName = "", country = "") {
  const name = String(leagueName || "").toLowerCase();
  const countryLower = String(country || "").toLowerCase();

  for (let i = 0; i < IMPORTANT_LEAGUES.length; i++) {
    if (name.includes(IMPORTANT_LEAGUES[i].toLowerCase())) return i;
  }

  if (["england", "spain", "italy", "germany", "france"].includes(countryLower)) return 12;
  if (["chile", "argentina", "brazil", "portugal", "mexico"].includes(countryLower)) return 14;

  return 25;
}

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
    "u17",
    "u18",
    "u19",
    "u20",
    "u21",
    "u23",
    "reserves",
    "reserve",
    "youth",
    "juvenil",
    "sub-",
    "sub ",
    " women",
    "womens",
    "femen",
    " fem",
    " w ",
    " ii",
    " b ",
  ];
  return banned.some((p) => blob.includes(p));
}

/** ✅ Detecta 2ª/3ª/4ª y ligas “B”/reservas por nombre */
function isLowerDivisionLeagueName(leagueName = "") {
  const s = String(leagueName || "").toLowerCase();

  const spainBanned = ["rfef", "primera rfef", "segunda rfef", "tercera rfef", "federacion", "federación"];

  const genericBanned = [
    "segunda",
    "segunda división",
    "segunda division",
    "tercera",
    "tercera división",
    "tercera division",
    "fourth",
    "4th",
    "reserve",
    "reserves",
    "b team",
    " ii",
    " u23",
  ];

  const leaguesBanned = ["serie b", "serie c", "ligue 2", "2. bundesliga", "3. liga", "league one", "league two", "championship"];

  const banned = [...spainBanned, ...genericBanned, ...leaguesBanned];
  return banned.some((k) => s.includes(k));
}

/** Solo ligas “top” y evita ligas desconocidas */
function isMajorLeague(fx) {
  const league = String(getLeagueName(fx) || "");
  const s = league.toLowerCase();

  if (isLowerDivisionLeagueName(league)) return false;

  const bad = [
    "u17",
    "u18",
    "u19",
    "u20",
    "u21",
    "youth",
    "reserve",
    "reserves",
    "friendly",
    "women",
    "femen",
    "amateur",
    "regional",
    "state",
    "non league",
    "development",
  ];
  if (bad.some((k) => s.includes(k))) return false;

  if (IMPORTANT_LEAGUES.some((x) => s.includes(String(x).toLowerCase()))) return true;

  const okPatterns = [
    "champions league",
    "europa league",
    "conference league",
    "libertadores",
    "sudamericana",

    "copa del rey",
    "fa cup",
    "efl cup",
    "dfb pokal",
    "coppa italia",
    "coupe de france",
    "supercopa",
    "super cup",
    "cup",
    "copa",

    "premier league",
    "la liga",
    "serie a",
    "bundesliga",
    "ligue 1",
    "primeira liga",
    "eredivisie",
    "liga mx",
    "brasileirão",
    "copa do brasil",
    "copa argentina",
    "copa chile",
    "primera división",
    "primera division",
  ];

  const englandNoise = ["isthmian", "northern", "southern", "npl", "vanarama", "trophy", "vase", "counties", "county"];
  if (getCountryName(fx) === "England" && englandNoise.some((k) => s.includes(k))) return false;

  return okPatterns.some((p) => s.includes(p));
}

/* --------------------- Plan & Features --------------------- */

function normalizePlanLabel(raw) {
  const p = String(raw || "").toUpperCase();
  if (p.includes("VITA")) return "VITALICIO";
  if (p.includes("ANU")) return "ANUAL";
  if (p.includes("TRI") || p.includes("3")) return "TRIMESTRAL";
  if (p.includes("MES")) return "MENSUAL";
  return "MENSUAL";
}

function getMaxBoostFromPlan(planLabel) {
  if (planLabel === "VITALICIO") return 100;
  if (planLabel === "ANUAL") return 50;
  if (planLabel === "TRIMESTRAL") return 20;
  return 10;
}

function getPlanFeatures(planLabel) {
  const base = { giftPick: true, boosted: true };

  if (planLabel === "MENSUAL") return { ...base, referees: false, marketValue: false, scorers: false, shooters: 0 };
  if (planLabel === "TRIMESTRAL") return { ...base, referees: false, marketValue: false, scorers: false, shooters: 0 };
  if (planLabel === "ANUAL") return { ...base, referees: true, marketValue: false, scorers: false, shooters: 5 };
  return { ...base, referees: true, marketValue: true, scorers: true, shooters: 10 };
}

/* --------------------- UI helpers --------------------- */

/**
 * ✅ HudCard:
 * - Sin borde dorado visible (borde neutro MUY suave)
 * - Brillo dorado más fuerte tipo Perfil
 * - Mantiene overlays y permite usar bg (imagen) como antes
 */
function HudCard({
  bg,
  bgColor, // ✅ NUEVO: color sólido de fondo
  children,
  className = "",
  style = {},
  overlayVariant = "casillas",
  glow = "gold", // "gold" | "none"
}) {
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.58) 55%, rgba(2,6,23,0.34) 80%, rgba(2,6,23,0.22) 100%)",
          "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.22), rgba(2,6,23,0) 58%)",
          "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.22), rgba(2,6,23,0) 58%)",
        ]
      : overlayVariant === "verde" // ✅ NUEVO: verde premium SIN degradado al centro
      ? [
          "linear-gradient(180deg, rgba(2,6,23,0.32) 0%, rgba(2,6,23,0.32) 100%)",
          "radial-gradient(circle at 18% 25%, rgba(16,185,129,0.14), rgba(2,6,23,0) 62%)",
          "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.12), rgba(2,6,23,0) 62%)",
        ]
      : [
          // casillas (tu actual: aquí está el “más claro al medio”)
          "linear-gradient(180deg, rgba(2,6,23,0.82) 0%, rgba(2,6,23,0.50) 40%, rgba(2,6,23,0.82) 100%)",
          "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.18), rgba(2,6,23,0) 60%)",
          "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.18), rgba(2,6,23,0) 60%)",
        ];

    // ✅ borde tipo Perfil (más limpio)
  const borderColor = "rgba(255,255,255,0.10)";

  // ✅ sombra + glow tipo “tarjeta flotante” (como Perfil)
  const goldGlow =
    glow === "gold"
      ? [
          "0 0 0 1px rgba(255,255,255,0.05) inset",
          "0 18px 60px rgba(0,0,0,0.55)",           // profundidad (flotante)
          "0 0 70px rgba(230,196,100,0.18)",        // glow dorado suave
        ].join(", ")
      : [
          "0 0 0 1px rgba(255,255,255,0.05) inset",
          "0 18px 60px rgba(0,0,0,0.55)",
        ].join(", ");

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-slate-950/25 backdrop-blur-md ${className}`}
      style={{
        borderColor,
        boxShadow: goldGlow,
        backgroundColor: bgColor || undefined, // ✅ usa #132A23 cuando lo pases
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

/** ✅ Wrapper layout */
function PageShell({ children }) {
  return <div className="max-w-5xl mx-auto px-4 pb-20">{children}</div>;
}

/* ------------------- Partidazos ------------------- */

function PartidazosDeLaSemanaCard() {
  return (
    <HudCard
      bg={BG_VISITOR}
      overlayVariant="player"
      className="mt-6"
      glow="gold"
    >
      <div className="p-4 md:p-6">
        <div className="text-emerald-200/90 text-xs font-semibold tracking-wide">Factor Victoria recomienda</div>
        <div className="mt-1 text-xl md:text-2xl font-bold text-slate-100">Partidazos de la semana</div>
        <div className="mt-1 text-sm text-slate-200">Estos son los encuentros más atractivos para analizar.</div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 overflow-hidden">
          <div className="relative w-full aspect-[16/9] md:aspect-[21/9]">
            <img
              src={BG_PARTIDAZOS}
              alt="Partidazos de la semana"
              className="absolute inset-0 w-full h-full object-cover object-center"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/10 to-slate-950/35" />
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-400">Tip: Apuesta con datos, planificación y visión ganadora.</div>
      </div>
    </HudCard>
  );
}

/* ------------------- Visitante ------------------- */

function VisitorBanner() {
  const nav = useNavigate();
  const goPlans = () => window.location.assign("/#planes");

  return (
    <HudCard
      bg={BG_VISITOR}
      overlayVariant="player"
      className="mt-4"
      glow="gold"
    >
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

function GainSimulatorCard() {
  const [currency, setCurrency] = useState("CLP");
  const [stake, setStake] = useState(10000);
  const [mult, setMult] = useState(10);

  const potential = Number(stake || 0) * Number(mult || 1);

  return (
    <HudCard
      bg={BG_DINERO}
      overlayVariant="casillas"
      className="mt-6"
      glow="gold"
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
            <div className="mt-2 text-lg font-bold" style={{ color: "rgba(230,196,100,0.98)" }}>
              {formatMoney(potential, currency)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">(Simulación simple: monto × multiplicador)</div>
          </div>
        </div>
      </div>
    </HudCard>
  );
}

/* ------------------- Manual Picks ------------------- */

function ManualPicksSection() {
  const singles = [
    { label: "Barcelona doble oportunidad (1X2)", odd: 1.3, note: "Alta probabilidad" },
    { label: "Real Madrid (handicap+4)", odd: 1.1, note: "Conservador" },
  ];

  const combos = [
    { label: "Barcelona doble oportunidad", odd: 1.3, note: "Cuota media" },
    { label: "1+ goles en el primer tiempo", odd: 1.35, note: "Más riesgo" },
  ];

  const players = [
    { label: "Raphinha +1.5 remates", odd: 2.8, note: "Si es titular" },
    { label: "Fermin Lopez tarjeta amarilla", odd: 2.88, note: "Tendencia" },
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
      <HudCard
        bg={BG_MANUAL}
        overlayVariant="casillas"
        glow="gold"
        className="overflow-hidden"
      >
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

/* ------------------- Calculadora de precios ------------------- */

function PriceCalculatorCard() {
  const [currency, setCurrency] = useState("CLP");
  const [stake, setStake] = useState(10000);
  const [odd, setOdd] = useState(1.56);

  const result = Number(stake || 0) * Number(odd || 0);
  const net = result - Number(stake || 0);

  const format = (v) => {
    const n = Number(v || 0);
    const decimals = currency === "CLP" ? 0 : 2;
    const locale = currency === "CLP" ? "es-CL" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(Number.isFinite(n) ? n : 0);
  };

  return (
    <HudCard
      bg={BG_DINERO}
      overlayVariant="casillas"
      className="mt-6"
      glow="gold"
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-100">Calculadora de precios</div>
            <div className="text-xs text-slate-300 mt-1">Ingresa tu monto y tu cuota para calcular ganancia estimada.</div>
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
              value={format(stake)}
              onChange={(e) => {
                const digits = String(e.target.value || "").replace(/[^\d]/g, "");
                setStake(digits ? Number(digits) : 0);
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-300">Cuota</div>
            <input
              type="number"
              step="0.01"
              value={odd}
              onChange={(e) => setOdd(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-300">Resultado</div>
              <div className="text-xs text-slate-300">Ganancia neta</div>
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-lg font-bold" style={{ color: "rgba(230,196,100,0.98)" }}>
                  {format(result)}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">(monto × cuota)</div>
              </div>

              <div className="text-right min-w-0">
                <div className="text-lg font-bold text-emerald-300">{format(net)}</div>
                <div className="mt-1 text-[11px] text-slate-400">(resultado − monto)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </HudCard>
  );
}

/* ------------------- FeatureCard ------------------- */

function FeatureCard({ title, badge, children, locked, lockText, bg }) {
  return (
    <HudCard
      bg={bg || BG_GRAFICO_DORADO}
      overlayVariant="casillas"
      glow="gold"
      className="overflow-hidden"
    >
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

/* ------------------- FixtureCard ------------------- */

function FixtureCard({ fx, isSelected, onToggle, onLoadOdds, oddsPack }) {
  const id = getFixtureId(fx);

  const league = getLeagueName(fx);
  const countryName = getCountryName(fx);
  const flagEmoji = COUNTRY_FLAG[countryName] || (countryName === "World" ? "🌍" : "🏳️");
  const home = getHomeName(fx);
  const away = getAwayName(fx);
  const time = getKickoffTime(fx);

  const m1x2 = oddsPack?.markets?.["1X2"] || null;
  const mou = oddsPack?.markets?.["OU_2_5"] || null;
  const found = oddsPack?.found;

  const hasOdds =
    (m1x2 && (m1x2.home != null || m1x2.draw != null || m1x2.away != null)) ||
    (mou && (mou.over != null || mou.under != null));

  const formatOdd = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return "—";
    return n.toFixed(n < 10 ? 2 : 1).replace(/\.0+$/, "");
  };

  const prob = (() => {
    const h = Number(m1x2?.home);
    const d = Number(m1x2?.draw);
    const a = Number(m1x2?.away);
    if (![h, d, a].every((x) => Number.isFinite(x) && x > 1.0001)) return null;

    const ih = 1 / h;
    const idd = 1 / d;
    const ia = 1 / a;
    const s = ih + idd + ia;

    const ph = ih / s;
    const pd = idd / s;
    const pa = ia / s;

    const best = Math.max(ph, pd, pa);
    const label = best === ph ? "Local" : best === pd ? "Empate" : "Visita";
    return { pct: Math.round(best * 100), label };
  })();

  // ✅ sin borde dorado: borde neutro + glow dorado suave/firme
  const borderColor = "rgba(255,255,255,0.08)";
  const boxShadow = "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 42px rgba(230,196,100,0.18)";

  return (
    <div
      className="relative rounded-3xl border bg-slate-950/25 backdrop-blur-md p-5 md:p-6 overflow-hidden"
      style={{ borderColor, boxShadow }}
    >
      <div className="absolute top-5 right-5">
        <span
          className={[
            "inline-block w-5 h-5 rounded-full border",
            isSelected
              ? "border-emerald-400 bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.9)]"
              : "border-white/10 bg-slate-950/40",
          ].join(" ")}
        />
      </div>

      <div className="text-xl md:text-2xl font-bold text-slate-100 pr-10">
        {home} <span className="text-slate-400 font-semibold">vs</span> {away}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
        <span className="text-lg leading-none">{flagEmoji}</span>
        <span className="font-medium">{countryName}</span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{league}</span>
        <span className="text-slate-500">·</span>
        <span className="font-semibold">{time}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => window.alert("En construcción: aquí irá la vista de estadísticas por partido.")}
          className="w-full rounded-full px-5 py-3 text-sm font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition text-slate-100"
        >
          Ver estadísticas
        </button>

        <button
          type="button"
          onClick={() => {
            onToggle(id);
            onLoadOdds(id);
          }}
          className="w-full rounded-full px-5 py-3 text-sm font-bold"
          style={{ backgroundColor: GOLD, color: "#0f172a" }}
        >
          {isSelected ? "Quitar de combinada" : "Añadir a combinada"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="text-xs text-slate-300 mb-2">1X2 / Goles</div>
          {hasOdds ? (
            <div className="text-sm text-slate-100 leading-snug">
              {m1x2 ? (
                <div className="font-semibold">
                  1: {formatOdd(m1x2.home)} · X: {formatOdd(m1x2.draw)} · 2: {formatOdd(m1x2.away)}
                </div>
              ) : null}
              {mou ? (
                <div className="mt-1 text-emerald-200">
                  O2.5: {formatOdd(mou.over)} · U2.5: {formatOdd(mou.under)}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-cyan-200 font-semibold">
              {found === false ? "Sin cuotas (API)." : "Toca “Añadir a combinada” para cargar cuotas."}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="text-xs text-slate-300 mb-2 flex items-center justify-between">
            <span>Prob.</span>
            <span className="text-[11px] text-slate-500">simple</span>
          </div>
          {prob ? (
            <div className="text-sm font-semibold text-slate-100">
              {prob.pct}% <span className="text-slate-400 font-medium">{prob.label}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">—</div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="text-xs text-slate-300 mb-2">Tarjetas</div>
          <div className="text-xs text-slate-400">En análisis</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="text-xs text-slate-300 mb-2">Corners</div>
          <div className="text-xs text-slate-400">En análisis</div>
        </div>
      </div>
    </div>
  );
}

/* --------------------- componente principal --------------------- */

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

  // ✅ Multi-país
  const [selectedCountries, setSelectedCountries] = useState([]);

  // odds cache
  const [oddsByFixture, setOddsByFixture] = useState({});
  const oddsRef = useRef({});

  // Plan / Features
  const planLabel = useMemo(() => {
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "MENSUAL";
    return normalizePlanLabel(raw);
  }, [user]);

  const maxBoost = useMemo(() => getMaxBoostFromPlan(planLabel), [planLabel]);
  const features = useMemo(() => getPlanFeatures(planLabel), [planLabel]);

  // combinadas
  const [parlayResult, setParlayResult] = useState(null);
  const [parlayError, setParlayError] = useState("");

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

  function toggleFixtureSelection(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedCount = selectedIds.length;

  const ensureOdds = useCallback(async (fixtureId) => {
    if (!fixtureId) return;
    if (oddsRef.current[fixtureId]) return;

    try {
      const res = await fetch(`${API_BASE}/api/odds?fixture=${encodeURIComponent(fixtureId)}`);
      if (!res.ok) {
        oddsRef.current[fixtureId] = { found: false, markets: {} };
        setOddsByFixture((prev) => ({ ...prev, [fixtureId]: oddsRef.current[fixtureId] }));
        return;
      }

      const data = await res.json();

      const pack = {
        found: !!data?.found,
        markets: data?.markets || {},
        fetchedAt: Date.now(),
      };

      oddsRef.current[fixtureId] = pack;
      setOddsByFixture((prev) => ({ ...prev, [fixtureId]: pack }));
    } catch {
      // silencio
    }
  }, []);

  const loadReferees = useCallback(async () => {
    try {
      setRefErr("");
      setRefLoading(true);
      setRefData(null);
      setRefErr("Módulo en construcción: falta crear /api/referees/cards en el backend.");
    } finally {
      setRefLoading(false);
    }
  }, []);

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

  async function handleAutoParlay() {
    setParlayError("");
    setParlayResult(null);

    if (!fixtures.length) {
      setParlayError("Genera primero partidos con el botón de arriba.");
      return;
    }

    fixtures
      .slice(0, 10)
      .map(getFixtureId)
      .filter(Boolean)
      .forEach((id) => ensureOdds(id));

    const suggestion = buildComboSuggestion(fixtures, maxBoost);
    if (!suggestion) {
      setParlayError("No pudimos armar una combinada razonable con los partidos cargados. Prueba con otro rango de fechas.");
      return;
    }

    setParlayResult({ mode: "auto", ...suggestion });
  }

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

    const pool = fixtures.filter((fx) => selectedIds.includes(getFixtureId(fx)));
    pool.map(getFixtureId).filter(Boolean).forEach((id) => ensureOdds(id));

    const suggestion = buildComboSuggestion(pool, maxBoost);
    if (!suggestion) {
      setParlayError("Con esta combinación no pudimos llegar a una cuota interesante. Prueba agregando más partidos.");
      return;
    }

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

      const base = items.filter(isFutureFixture).filter((fx) => !isYouthOrWomenOrReserve(fx));
      const major = base.filter(isMajorLeague);
      const filtered = major.length >= 8 ? major : base;

      const sorted = [...filtered].sort((a, b) => {
        const prioA = getLeaguePriority(getLeagueName(a), getCountryName(a));
        const prioB = getLeaguePriority(getLeagueName(b), getCountryName(b));
        if (prioA !== prioB) return prioA - prioB;

        const tA = getKickoffTime(a) || "";
        const tB = getKickoffTime(b) || "";
        return tA.localeCompare(tB);
      });

      const LIMITED = sorted.slice(0, 140);

      if (!LIMITED.length) {
        setErr(
          `No encontramos partidos para ese rango. API devolvió: ${itemsRaw.length} | base: ${base.length} | ligas top: ${major.length}. ` +
            `Prueba con 7–14 días y sin filtro (q vacío).`
        );
        setFixtures([]);
        return;
      }

      setFixtures(LIMITED);
      setInfo(`API: ${itemsRaw.length} | base: ${base.length} | top: ${major.length} | mostrando: ${LIMITED.length}`);

      if (features.referees) {
        await loadReferees();
      }
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
        <GainSimulatorCard />
        <VisitorEndingHero />
      </PageShell>
    );
  }

  /* =========================
      LOGUEADO (COMPARADOR)
     ========================= */

  return (
    <PageShell>
      {/* 1) Filtros + Generar */}
      <HudCard
        bg={BG_PROFILE_HUD}
        overlayVariant="casillas"
        className="mt-4"
        glow="gold"
      >
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

          {/* Chips multi-país */}
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
                    borderColor: active ? "rgba(16,185,129,0.55)" : "rgba(255,255,255,0.30)",
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
      <PartidazosDeLaSemanaCard />

      {/* 3) LISTADO (con fondo pasto como antes) */}
      <HudCard
  bg={null}                 // ✅ sin imagen
  bgColor="#132A23"         // ✅ Opción B: verde sólido premium
  overlayVariant="verde"    // ✅ overlay plano (sin “centro claro”)
  className="mt-4"
  glow="gold"
>

        <section className="p-3 md:p-4">
          <div className="flex items-center justify-between px-2 py-2 text-[11px] md:text-xs text-slate-300 tracking-wide">
            <span className="uppercase">
              Partidos encontrados: <span className="font-semibold text-slate-50">{fixtures.length}</span>
            </span>
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
                const isSelected = selectedIds.includes(id);
                const oddsPack = oddsByFixture[id] || null;

                return (
                  <FixtureCard
                    key={id}
                    fx={fx}
                    isSelected={isSelected}
                    oddsPack={oddsPack}
                    onToggle={(fixtureId) => {
                      toggleFixtureSelection(fixtureId);
                      setParlayResult(null);
                      setParlayError("");
                    }}
                    onLoadOdds={(fixtureId) => ensureOdds(fixtureId)}
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
            <div className="text-xs text-slate-300 mt-1">Under 3.5 goles · cuota x1.40</div>
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
                Partidos: {parlayResult.games} · En FV buscamos picks individuales de alta probabilidad (80–90%+ por selección).
                En combinada el riesgo se acumula al multiplicar eventos.
              </div>
            </div>
          ) : null}
        </FeatureCard>

        <FeatureCard title="Árbitros tarjeteros" badge="Tarjetas" locked={!features.referees} lockText="Disponible desde Plan Anual.">
          <div className="text-xs text-slate-300">Ranking de árbitros con más tarjetas (por rango de fechas y país).</div>

          {refLoading ? <div className="mt-3 text-xs text-slate-300">Cargando árbitros…</div> : null}
          {refErr ? <div className="mt-3 text-xs text-amber-300">{refErr}</div> : null}

          {refData ? (
            <pre className="mt-3 text-[11px] leading-snug text-slate-200 bg-slate-950/30 border border-white/10 rounded-xl p-3 overflow-auto">
              {JSON.stringify(refData, null, 2)}
            </pre>
          ) : (
            <div className="mt-3 text-[11px] text-slate-400">Cuando el backend esté listo, aquí mostramos el top de árbitros.</div>
          )}
        </FeatureCard>

        <FeatureCard
          title="Goleadores / Remates / Value"
          badge="VIP"
          locked={!(features.scorers || features.marketValue || features.shooters > 0)}
          lockText="Disponible en planes superiores (Anual/Vitalicio)."
        >
          <div className="text-xs text-slate-300">Aquí reactivaremos los módulos avanzados (goleadores, remates, value del mercado).</div>
        </FeatureCard>

        <FeatureCard title="Cuota desfase del mercado" badge="Value" locked={!features.marketValue} lockText="Disponible desde Plan Vitalicio.">
          <div className="text-xs text-slate-300">Detecta cuotas con posible valor (desfase entre tu estimación y el mercado).</div>

          <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <div className="text-sm font-semibold text-slate-100">Ejemplo</div>
            <div className="text-xs text-slate-300 mt-1">
              “Local gana” mercado x2.10 · FV estimado x1.85 → posible value.
            </div>
          </div>

          <div className="mt-2 text-[11px] text-slate-400">Módulo en construcción: luego lo conectamos a cuotas reales + rating FV.</div>
        </FeatureCard>
      </section>

      {/* 5) Manual Picks */}
      <ManualPicksSection />

      {/* 6) Simulador */}
      <GainSimulatorCard />

      {/* 7) Calculadora */}
      <PriceCalculatorCard />
    </PageShell>
  );
}
