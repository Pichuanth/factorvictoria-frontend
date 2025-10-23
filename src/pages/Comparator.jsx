// src/pages/Comparator.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { SECTION_TITLES } from "../lib/prompt"; // si lo tienes; opcional

const GOLD = "#E6C464";
const IVORY = "#FFFFF0";

export default function Comparator() {
  const { user, isLoggedIn } = useAuth();

  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    const iso = d.toISOString().slice(0, 10);
    return iso;
  });
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [options, setOptions] = useState({ teams: [], leagues: [], countries: [] });
  const [picked, setPicked] = useState({ leagueId: "", teamId: "", country: "" });

  const [rows, setRows] = useState([]);
  const [odds, setOdds] = useState({}); // fixtureId -> {home,draw,away,bookmaker}
  const [error, setError] = useState("");

  // Busca sugerencias al tipear
  useEffect(() => {
    let abort = false;
    (async () => {
      if (q.trim().length < 2) {
        setOptions({ teams: [], leagues: [], countries: [] });
        return;
      }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const json = await r.json();
        if (!abort) setOptions(json);
      } catch (e) {
        if (!abort) console.error(e);
      }
    })();
    return () => { abort = true; };
  }, [q]);

  const onPick = (obj) => {
    // obj = {type: 'league'|'team'|'country', id?, name?}
    if (obj.type === "league") setPicked({ leagueId: obj.id, teamId: "", country: "" });
    if (obj.type === "team") setPicked({ teamId: obj.id, leagueId: "", country: "" });
    if (obj.type === "country") setPicked({ country: obj.name, leagueId: "", teamId: "" });
    setQ(obj.label || "");
  };

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      setRows([]);
      setOdds({});

      const u = new URLSearchParams({
        date: dateStr,
        ...(picked.leagueId ? { leagueId: picked.leagueId } : {}),
        ...(picked.teamId ? { teamId: picked.teamId } : {}),
        ...(picked.country ? { country: picked.country } : {}),
      }).toString();

      const fr = await fetch(`/api/fixtures?${u}`);
      const fj = await fr.json();
      if (fj.error) throw new Error(fj.error);

      setRows(fj.fixtures || []);

      // trae cuotas (limitamos a 20 para no quemar la API en demo)
      const slice = (fj.fixtures || []).slice(0, 20);
      await Promise.all(slice.map(async (f) => {
        try {
          const r = await fetch(`/api/odds?fixtureId=${f.id}`);
          const j = await r.json();
          setOdds(prev => ({ ...prev, [f.id]: j }));
        } catch (e) {
          console.warn("odds fail", f.id, e.message);
        }
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-white text-3xl font-bold mb-4">Comparador</h1>

      {!isLoggedIn ? (
        <div className="rounded-2xl bg-slate-800/70 text-white p-5">
          Para generar cuotas, primero{" "}
          <a className="underline text-[color:#E6C464]" href="/#planes">compra una membresía</a>{" "}
          e inicia sesión.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
          <div className="grid gap-3 md:grid-cols-[240px_1fr_160px]">
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: IVORY, color: "#0f172a" }}
            />

            <div className="relative">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Equipo / liga / país"
                className="w-full rounded-xl px-4 py-3 pr-4"
                style={{ backgroundColor: IVORY, color: "#0f172a" }}
              />
              {/* Dropdown simple */}
              {(options.teams.length + options.leagues.length + options.countries.length) > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow max-h-72 overflow-auto">
                  {options.teams.slice(0,6).map(t => (
                    <div
                      key={`t${t.team?.id}`}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                      onClick={() => onPick({ type: "team", id: t.team.id, label: t.team.name })}
                    >{t.team?.name}</div>
                  ))}
                  {options.leagues.slice(0,6).map(l => (
                    <div
                      key={`l${l.league?.id}`}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                      onClick={() => onPick({ type: "league", id: l.league.id, label: l.league.name })}
                    >{l.league?.name}</div>
                  ))}
                  {options.countries.slice(0,6).map(c => (
                    <div
                      key={`c${c.code || c.name}`}
                      className="px-3 py-2 hover:bg-slate-100 cursor-pointer"
                      onClick={() => onPick({ type: "country", name: c.name, label: c.name })}
                    >{c.name}</div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={generate}
              disabled={loading}
              className="rounded-xl px-4 py-3 font-semibold"
              style={{ backgroundColor: GOLD, color: "#0f172a" }}
            >
              {loading ? "Cargando..." : "Generar"}
            </button>
          </div>

          {error && <div className="mt-3 text-red-400">{error}</div>}
        </div>
      )}

      {/* Tabla de resultados */}
      {isLoggedIn && rows.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-800/40 overflow-hidden">
          <div className="grid grid-cols-8 gap-0 px-4 py-3 text-white/80 font-semibold border-b border-white/10">
            <div>Hora</div>
            <div className="col-span-2">Local</div>
            <div className="col-span-2">Visita</div>
            <div>Liga</div>
            <div>País</div>
            <div>1&nbsp;/&nbsp;X&nbsp;/&nbsp;2</div>
          </div>
          {rows.map((r) => {
            const o = odds[r.id] || {};
            const dt = new Date(r.date);
            const hh = dt.toTimeString().slice(0,5);
            return (
              <div key={r.id} className="grid grid-cols-8 gap-0 px-4 py-3 border-b border-white/5 text-white/90">
                <div>{hh}</div>
                <div className="col-span-2">{r.home.name}</div>
                <div className="col-span-2">{r.away.name}</div>
                <div>{r.league}</div>
                <div>{r.country}</div>
                <div className="font-semibold">
                  {o.home ?? "–"} / {o.draw ?? "–"} / {o.away ?? "–"}
                  <span className="text-white/50 text-xs ml-1">{o.bookmaker ? `(${o.bookmaker})` : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Nota: árbitro visible por fixture (debajo de la tabla, compacto) */}
      {isLoggedIn && rows.length > 0 && (
        <div className="mt-4 text-white/70 text-sm">
          {rows.slice(0,10).map(r => (
            <div key={`ref-${r.id}`}>
              <span className="text-white/60">{r.home.name} vs {r.away.name}</span>: árbitro <span className="text-white">{r.referee || "N/D"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
