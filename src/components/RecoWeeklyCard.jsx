// src/components/RecoWeeklyCard.jsx
import React, { useMemo } from "react";

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
function getLeagueName(f) {
  return f?.league?.name || f?.leagueName || f?.league_name || f?.competition || "Liga";
}
function getCountryName(f) {
  return f?.league?.country || f?.country || f?.country_name || f?.location || "World";
}

/** Opcional: si en tu data el country viene "World", igual sirve. */
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
  World: "🌍",
};

function PartidazoLine({ f }) {
  const id = getFixtureId(f);
  const home = getHomeName(f);
  const away = getAwayName(f);
  const league = getLeagueName(f);
  const country = getCountryName(f);

  const date = fixtureDateKey(f);
  const time = fixtureTimeLabel(f);
  const whenLabel = date ? `${date} · ${time || "--:--"}` : (time || "--:--");

  const hLogo = getHomeLogo(f);
  const aLogo = getAwayLogo(f);

  const flag = COUNTRY_FLAG[country] || "🏳️";

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* izquierda */}
        <div className="min-w-0">
          {/* línea 1: equipos */}
          <div className="flex items-center gap-2 min-w-0">
            {hLogo ? (
              <img src={hLogo} alt="" aria-hidden="true" className="h-6 w-6 rounded-sm object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-white/5 border border-white/10" />
            )}

            <div className="text-sm font-semibold text-slate-100 truncate">{home}</div>

            <div className="text-xs font-bold text-yellow-200/90">vs</div>

            <div className="text-sm font-semibold text-slate-100 truncate">{away}</div>

            {aLogo ? (
              <img src={aLogo} alt="" aria-hidden="true" className="h-6 w-6 rounded-sm object-contain" />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-white/5 border border-white/10" />
            )}
          </div>

          {/* línea 2: liga/país */}
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            <span className="mr-2">{flag}</span>
            {country} · {league}
          </div>

          {/* si quieres usar el espacio del fixtureId, ponlo solo en debug */}
          {/* <div className="mt-1 text-[11px] text-slate-500">fixtureId: {String(id)}</div> */}
          <div className="sr-only">fixtureId: {String(id)}</div>
        </div>

        {/* derecha: fecha/hora */}
        <div className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-200 self-start sm:self-auto">
          {whenLabel}
        </div>
      </div>
    </div>
  );
}

/**
 * props:
 * - HudCard: tu wrapper UI
 * - picksFromFixtures: tu función que arma manual desde PARTIDAZOS_MANUAL
 * - fixtures: weeklyFixtures (7 días)
 * - loading/error: estados del fetch
 */
export default function RecoWeeklyCard({
  HudCard,
  fixtures = [],
  loading = false,
  error = "",
  picksFromFixtures,
  title = "Partidazos de la semana",
}) {
  const manual = useMemo(() => {
    if (typeof picksFromFixtures !== "function") return [];
    return picksFromFixtures(fixtures) || [];
  }, [fixtures, picksFromFixtures]);

  const autoTop = useMemo(() => {
    const arr = Array.isArray(fixtures) ? [...fixtures] : [];
    // Auto simple: toma los próximos 8 (ya filtrados/ordenados si vienes de tu weekly loader)
    return arr.slice(0, 8);
  }, [fixtures]);

  // ✅ REGLA: si hay manual, SOLO manual. Si no, auto.
  const list = manual.length ? manual : autoTop;

  const subtitle = manual.length ? "Selección curada manualmente." : "Top automático (cuando no hay selección manual).";

  return (
    <HudCard bg={null} bgColor="#132A23" overlayVariant="casillasSharp" className="mt-4" glow="gold">
      <div className="p-4 md:p-6">
        <div className="text-emerald-200/90 text-xs font-semibold tracking-wide">Factor Victoria recomienda</div>
        <div className="mt-1 text-xl md:text-2xl font-bold text-slate-100">{title}</div>
        <div className="mt-1 text-xs text-slate-200">{subtitle}</div>

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
          {manual.length ? (
            <>Modo: <span className="font-semibold">Manual</span></>
          ) : (
            <>Modo: <span className="font-semibold">Automático</span></>
          )}
        </div>
      </div>
    </HudCard>
  );
}
