// src/components/RecoWeeklyCard.jsx
import React, { useMemo } from "react";

/* Helpers (autosuficiente para usarlo en Fixtures y Comparator) */
const APP_TZ = "America/Santiago";

function normStr(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function includesNorm(haystack, needle) {
  return normStr(haystack).includes(normStr(needle));
}

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

function getHomeLogo(f) {
  return f?.teams?.home?.logo || f?.homeLogo || f?.home_logo || null;
}

function getAwayLogo(f) {
  return f?.teams?.away?.logo || f?.awayLogo || f?.away_logo || null;
}

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

function leaguePriority(leagueName) {
  const n = normStr(leagueName);
  if (n.includes("uefa champions") || n.includes("champions league")) return 0;
  if (n.includes("uefa europa") || n.includes("europa league")) return 1;
  if (n.includes("uefa conference") || n.includes("conference league")) return 2;

  if (n.includes("premier league")) return 3;
  if (n.includes("la liga") || n.includes("laliga")) return 4;
  if (n.includes("serie a")) return 5;
  if (n.includes("bundesliga") && !n.includes("2.")) return 6;
  if (n.includes("ligue 1")) return 7;

  return 50;
}

function countryPriority(countryName) {
  const c = normStr(countryName);
  if (c.includes("england") || c.includes("inglaterra")) return 0;
  if (c.includes("spain") || c.includes("espana") || c.includes("españa")) return 1;
  if (c.includes("france") || c.includes("francia")) return 2;
  if (c.includes("italy") || c.includes("italia")) return 3;
  if (c.includes("germany") || c.includes("alemania")) return 4;
  return 50;
}

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

function isYouthOrWomenOrReserve(fx) {
  const blob = `${getLeagueName(fx)} ${getHomeName(fx)} ${getAwayName(fx)}`.toLowerCase();
  const banned = [
    "u17","u18","u19","u20","u21","u23",
    "reserves","reserve","youth","juvenil","sub-","sub ",
    " women","womens","femen"," wsl"," ii"," b ",
    "friendly","amistoso",
  ];
  return banned.some((p) => blob.includes(p));
}

function PartidazoLine({ f }) {
  const home = getHomeName(f);
  const away = getAwayName(f);
  const league = getLeagueName(f);
  const country = getCountryName(f);
  const flagEmoji = COUNTRY_FLAG[country] || (country === "World" ? "🌍" : "🏳️");

  const date = fixtureDateLabel(f) || fixtureDateKey(f);
  const time = fixtureTimeLabel(f) || "—";
  const whenLabel = date ? `${date} · ${time}` : time;

  const hLogo = getHomeLogo(f);
  const aLogo = getAwayLogo(f);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {hLogo ? (
              <img src={hLogo} alt="" className="h-6 w-6 rounded-sm object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-white/5 border border-white/10" />
            )}

            <div className="text-sm font-semibold text-slate-100 truncate">{home}</div>

            <div className="text-xs font-bold shrink-0" style={{ color: "rgba(230,196,100,0.80)" }}>
              vs
            </div>

            <div className="text-sm font-semibold text-slate-100 truncate">{away}</div>

            {aLogo ? (
              <img src={aLogo} alt="" className="h-6 w-6 rounded-sm object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-white/5 border border-white/10" />
            )}
          </div>
        </div>

        <div className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-200 w-fit">
          {whenLabel}
        </div>
      </div>

      <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
        <span className="text-base leading-none">{flagEmoji}</span>
        <span className="text-slate-200 font-semibold">{country}</span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{league}</span>
      </div>
    </div>
  );
}

/**
 * RecoWeeklyCard
 * - Usa picksFromFixtures(fixtures) si se lo pasas (pin manual)
 * - Si no, muestra top automático (ordenado por fecha + prioridades)
 * - Reusa tu HudCard si lo pasas; si no, renderiza un contenedor simple
 */
export default function RecoWeeklyCard({
  fixtures = [],
  loading = false,
  error = "",
  picksFromFixtures,
  HudCard,
}) {
  const manual = useMemo(() => {
    if (typeof picksFromFixtures !== "function") return [];
    try {
      return picksFromFixtures(fixtures) || [];
    } catch {
      return [];
    }
  }, [fixtures, picksFromFixtures]);

  const autoTop = useMemo(() => {
    const arr = Array.isArray(fixtures) ? [...fixtures] : [];
    const filtered = arr
      .filter(isFutureFixture)
      .filter((fx) => !isYouthOrWomenOrReserve(fx));

    filtered.sort((a, b) => {
      const da = new Date(a?.fixture?.date || a?.date || 0).getTime();
      const db = new Date(b?.fixture?.date || b?.date || 0).getTime();
      if (da !== db) return da - db;

      const pla = leaguePriority(getLeagueName(a));
      const plb = leaguePriority(getLeagueName(b));
      if (pla !== plb) return pla - plb;

      const ca = countryPriority(getCountryName(a));
      const cb = countryPriority(getCountryName(b));
      if (ca !== cb) return ca - cb;

      return String(getLeagueName(a)).localeCompare(String(getLeagueName(b)));
    });

    return filtered.slice(0, 8);
  }, [fixtures]);

  const list = useMemo(() => {
    if (manual.length > 0) return manual.slice(0, 10);
    return autoTop.slice(0, 10);
  }, [manual, autoTop]);

  const Card = HudCard
    ? ({ children }) => (
        <HudCard bg={null} bgColor="#132A23" overlayVariant="casillasSharp" className="mt-4" glow="gold">
          <div className="p-4 md:p-6">{children}</div>
        </HudCard>
      )
    : ({ children }) => (
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/25 p-4 md:p-6">{children}</div>
      );

  return (
    <Card>
      <div className="text-emerald-200/90 text-xs font-semibold tracking-wide">Factor Victoria recomienda</div>
      <div className="mt-1 text-xl md:text-2xl font-bold text-slate-100">Partidazos de la semana</div>
      
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
            Cargando partidazos…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm text-amber-300">
            {error}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4 text-sm text-slate-300">
            Aún no hay coincidencias (revisa texto/fecha/liga o usa fixtureId).
          </div>
        ) : (
          list.map((f) => <PartidazoLine key={String(getFixtureId(f))} f={f} />)
        )}
      </div>

      <div className="mt-3 text-[11px] text-slate-400">
        Edita la lista <span className="font-semibold">PARTIDAZOS_MANUAL</span> para cambiar la selección.
      </div>
    </Card>
  );
}
