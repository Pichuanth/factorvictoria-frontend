// src/pages/Comparator.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

const GOLD = "#E6C464";

const API_BASE =
  (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "") ||
  "https://factorvictoria-backend.vercel.app";

/** Fondos (public/) */
const BG_12000 = "/hero-fondo-partidos.png";
const BG_DINERO = "/hero.dinero.png";

/* --------------------- helpers --------------------- */

function toYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  eeuu: "USA",
  estadosunidos: "USA",
};

function normalizeCountryQuery(q) {
  const key = String(q || "").toLowerCase().trim().replace(/\s+/g, "");
  return COUNTRY_ALIAS[key] || null;
}

// Emojis de banderas (fallback a 🏳️)
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
  "UEFA Champions League",
  "Champions League",
  "Europa League",
  "CONMEBOL Libertadores",
  "Copa Libertadores",
  "CONMEBOL Sudamericana",
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "Copa del Rey",
];

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
    "u17","u18","u19","u20","u21","u23",
    "reserves","reserve","youth","juvenil",
    "sub-","sub ",
    " women","womens","femen"," fem"," w ",
    " ii"," b ",
  ];
  return banned.some((p) => blob.includes(p));
}

/** Solo ligas “top” (con fallback automático si deja 0) */
function isMajorLeague(fx) {
  const name = String(getLeagueName(fx) || "").toLowerCase();
  const country = String(getCountryName(fx) || "").toLowerCase();

  const hit = IMPORTANT_LEAGUES.some((imp) => name.includes(String(imp).toLowerCase()));
  if (hit) return true;

  const commonTop =
    name.includes("primera") ||
    name.includes("1st division") ||
    name.includes("first division") ||
    name.includes("liga professional") ||
    name.includes("serie a") ||
    name.includes("bundesliga") ||
    name.includes("ligue 1") ||
    name.includes("premier league") ||
    name.includes("la liga");

  if (
    commonTop &&
    ["england","spain","italy","germany","france","chile","argentina","brazil","portugal","mexico"].includes(country)
  ) {
    return true;
  }

  return false;
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

  if (planLabel === "MENSUAL") {
    return { ...base, referees: false, marketValue: false, scorers: false, shooters: 0 };
  }
  if (planLabel === "TRIMESTRAL") {
    return { ...base, referees: false, marketValue: false, scorers: false, shooters: 0 };
  }
  if (planLabel === "ANUAL") {
    return { ...base, referees: true, marketValue: false, scorers: false, shooters: 5 };
  }
  // VITALICIO
  return { ...base, referees: true, marketValue: true, scorers: true, shooters: 10 };
}

/* --------------------- UI helpers --------------------- */

function HudCard({ bg, children, className = "", style = {}, overlayVariant = "casillas" }) {
  // Ajuste CLAVE: overlays menos oscuros para que la hero-12000 se vea
  const overlayLayers =
    overlayVariant === "player"
      ? [
          "linear-gradient(90deg, rgba(2,6,23,0.78) 0%, rgba(2,6,23,0.58) 55%, rgba(2,6,23,0.34) 80%, rgba(2,6,23,0.22) 100%)",
          "radial-gradient(circle at 20% 45%, rgba(16,185,129,0.22), rgba(2,6,23,0) 58%)",
          "radial-gradient(circle at 82% 50%, rgba(230,196,100,0.20), rgba(2,6,23,0) 58%)",
        ]
      : [
          "linear-gradient(180deg, rgba(2,6,23,0.80) 0%, rgba(2,6,23,0.56) 38%, rgba(2,6,23,0.80) 100%)",
          "radial-gradient(circle at 18% 30%, rgba(16,185,129,0.18), rgba(2,6,23,0) 60%)",
          "radial-gradient(circle at 85% 60%, rgba(230,196,100,0.14), rgba(2,6,23,0) 60%)",
        ];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-white/5 ${className}`}
      style={{ borderColor: "rgba(255,255,255,0.10)", ...style }}
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

function VisitorBanner() {
  const nav = useNavigate();

  const goPlans = () => {
    // hash + scroll confiable en SPA
    window.location.assign("/#planes");
  };

  return (
    <HudCard
      bg={BG_12000}
      overlayVariant="player"
      className="mt-4"
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.16)" }}
    >
      <div className="p-5 md:p-7">
        <div className="text-xs tracking-wide text-emerald-200/90 font-semibold">
          Modo visitante
        </div>

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
            style={{ backgroundColor: GOLD, color: "#0f172a", boxShadow: "0 0 26px rgba(230,196,100,0.18)" }}
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

/* ------------------- Simulador (sin "Ver planes") ------------------- */

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
      style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.03) inset, 0 0 44px rgba(230,196,100,0.14)" }}
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
            <div className="mt-2 text-[11px] text-slate-400">
              Para activar x20/x50/x100 necesitas membresía.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-300">Resultado estimado</div>
            <div className="mt-2 text-lg font-bold" style={{ color: "rgba(230,196,100,0.95)" }}>
              {formatMoney(potential, currency)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">(Simulación simple: monto × multiplicador)</div>
          </div>
        </div>
      </div>
    </HudCard>
  );
}

/* --------------------- Visitante: 4 cards por plan --------------------- */

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
        bullets={[
          "Cuotas potenciadas hasta x10",
          "Cuota segura (regalo)",
          "Acceso a herramientas base",
        ]}
      />
      <LockedPlanCard
        title="Plan Trimestral"
        price="$44.990 · x20"
        href="/#plan-trimestral"
        bullets={[
          "Cuotas potenciadas hasta x20",
          "Mejor filtrado de partidos",
          "Más herramientas para combinadas",
        ]}
      />
      <LockedPlanCard
        title="Plan Anual"
        price="$99.990 · x50"
        href="/#plan-anual"
        bullets={[
          "Cuotas potenciadas hasta x50",
          "Módulo árbitros tarjeteros",
          "Top remates (hasta 5)",
        ]}
      />
      <LockedPlanCard
        title="Plan Vitalicio"
        price="$249.990 · x100"
        href="/#plan-vitalicio"
        bullets={[
          "Cuotas potenciadas hasta x100",
          "Value / desfase del mercado (VIP)",
          "Goleadores + remates (Top 10)",
        ]}
      />
    </section>
  );
}

function VisitorEndingHero() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 overflow-hidden bg-white/5">
      <div className="w-full h-[260px] md:h-[360px] lg:h-[420px] bg-slate-950 overflow-hidden">
        <img
          src={BG_12000}
          alt="Factor Victoria"
          className="w-full h-full object-cover object-center"
        />
      </div>

      <div className="p-4 text-center text-xs text-slate-500">© 2026 Factor Victoria</div>
    </div>
  );
}

/* --------------------- FeatureCard (logueado) --------------------- */

function FeatureCard({ title, badge, children, locked, lockText }) {
  return (
    <div className="relative rounded-2xl bg-white/5 border border-white/10 p-4 md:p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm md:text-base font-semibold text-emerald-400">{title}</div>
          {badge && (
            <div className="mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-slate-200">
              {badge}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">{children}</div>

      {locked && (
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
      )}
    </div>
  );
}

/* --------------------- componente principal --------------------- */
export default function Comparator() {
  const { isLoggedIn, user } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  // ✅ MODO VISITANTE: solo lo que pediste (banner + 4 cards + simulador + hero final)
  if (!isLoggedIn) {
    return (
      <div className="max-w-5xl mx-auto px-4 pb-20">
        <VisitorBanner />

        <VisitorPlansGrid />

        <GainSimulatorCard />

        <VisitorEndingHero />
      </div>
    );
  }

  /* --------------------- LOGUEADO: tu comparador completo --------------------- */

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toYYYYMMDD(today));
  const [to, setTo] = useState(toYYYYMMDD(today));
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  const [fixtures, setFixtures] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const [parlayResult, setParlayResult] = useState(null);
  const [parlayError, setParlayError] = useState("");

  // odds cache
  const [oddsByFixture, setOddsByFixture] = useState({});

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

  const planLabel = useMemo(() => {
    const raw = user?.planId || user?.plan?.id || user?.plan || user?.membership || "MENSUAL";
    return normalizePlanLabel(raw);
  }, [user]);

  const maxBoost = getMaxBoostFromPlan(planLabel);
  const features = useMemo(() => getPlanFeatures(planLabel), [planLabel]);

  const quickCountries = ["Chile","España","Portugal","Italia","Alemania","Argentina","Inglaterra","Francia"];

  const ensureOdds = useCallback(async (fixtureId) => {
    if (!fixtureId) return;
    if (oddsByFixture[fixtureId]) return;

    try {
      const res = await fetch(`${API_BASE}/api/odds?fixture=${encodeURIComponent(fixtureId)}`);
      if (!res.ok) return;
      const data = await res.json();

      setOddsByFixture((prev) => ({
        ...prev,
        [fixtureId]: {
          found: !!data?.found,
          markets: data?.markets || {},
          fetchedAt: Date.now(),
        },
      }));
    } catch {
      // silencio
    }
  }, [oddsByFixture]);

  const loadReferees = useCallback(async (fromArg, toArg, countryENOrNull) => {
    try {
      setRefErr("");
      setRefLoading(true);

      const params = new URLSearchParams();
      params.set("from", fromArg);
      params.set("to", toArg);
      if (countryENOrNull) params.set("country", countryENOrNull);

      const r = await fetch(`${API_BASE}/api/referees/cards?${params.toString()}`);

      if (r.status === 404) {
        setRefData(null);
        setRefErr("Módulo en construcción: falta crear /api/referees/cards en el backend.");
        return;
      }

      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.message || j?.error || `HTTP ${r.status}`);

      setRefData(j);
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.toLowerCase().includes("failed to fetch")) {
        setRefErr(
          "No se pudo conectar al backend para cargar árbitros. Verifica que el backend tenga /api/referees/cards y que VITE_API_BASE apunte al backend correcto."
        );
      } else {
        setRefErr(msg);
      }
      setRefData(null);
    } finally {
      setRefLoading(false);
    }
  }, []);

  async function handleGenerate(e) {
    e?.preventDefault?.();

    setErr("");
    setInfo("");
    setFixtures([]);
    setSelectedIds([]);
    setOddsByFixture({});
    setParlayResult(null);
    setParlayError("");
    setLoading(true);

    setRefData(null);
    setRefErr("");

    try {
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);

      const qTrim = String(q || "").trim();
      const countryEN = normalizeCountryQuery(qTrim);

      if (countryEN) params.set("country", countryEN);
      else if (qTrim) params.set("q", qTrim);

      const res = await fetch(`${API_BASE}/api/fixtures?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const itemsRaw =
        (Array.isArray(data?.items) && data.items) ||
        (Array.isArray(data?.response) && data.response) ||
        (Array.isArray(data?.fixtures) && data.fixtures) ||
        [];

      const base = itemsRaw
        .filter(isFutureFixture)
        .filter((fx) => !isYouthOrWomenOrReserve(fx));

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
        const countryENForRefs = normalizeCountryQuery(qTrim);
        await loadReferees(from, to, countryENForRefs);
      } else {
        setRefData(null);
      }
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setLoading(false);
    }
  }

  function handleQuickCountry(countryEs) {
    setQ(countryEs);
  }

  function toggleFixtureSelection(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const selectedCount = selectedIds.length;

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

    fixtures.slice(0, 10).map(getFixtureId).filter(Boolean).forEach((id) => ensureOdds(id));

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

  return (
    <div className="max-w-5xl mx-auto px-4 pb-20">
      {/* Cabecera */}
      <section className="mt-6 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold mb-2">Comparador</h1>

        <p className="text-slate-300 text-sm md:text-base">
          Estás usando Factor Victoria con tu membresía{" "}
          <span className="font-semibold">{planLabel}</span>. Elige un rango de fechas y filtra por país,
          liga o equipo para generar tus parlays.
        </p>
      </section>

      {/* Filtros */}
      <section className="mt-4 rounded-2xl bg-white/5 border border-white/10 p-4 md:p-6">
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
          {quickCountries.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleQuickCountry(c)}
              className="text-xs md:text-sm rounded-full px-3 py-1 border border-white/15 bg-white/5 hover:bg-white/10 transition"
            >
              {c}
            </button>
          ))}
        </div>

        {err && <div className="mt-3 text-sm text-amber-300">{err}</div>}
        {!err && info && <div className="mt-3 text-xs text-slate-400">{info}</div>}
      </section>

      {/* Lista + módulos + simulador: aquí mantienes tu versión actual (sin cambios de lógica) */}
      {/* Tu bloque grande original puede quedarse tal cual desde acá en adelante */}
      {/* Para no duplicar, pega aquí el resto de tu código tal como lo tenías si quieres. */}

      {/* ✅ Simulador */}
      <GainSimulatorCard />
    </div>
  );
}
