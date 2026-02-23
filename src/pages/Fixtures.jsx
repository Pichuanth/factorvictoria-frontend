import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Página PARTIDOS: centro de estadísticas con Widgets oficiales de API-FOOTBALL.
// Requiere membresía (o al menos sesión) para acceder.
// Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

const ALLOWED_COUNTRIES = [
  "Argentina",
  "Brazil",
  "Chile",
  "Colombia",
  "Mexico",
  "Spain",
  "England",
  "Italy",
  "Germany",
  "Portugal",
  "France",
];

function normalizeTxt(s = "") {
  return String(s)
    .replace(/\(\d+\)/g, " ")
    .replace(/\d+$/g, " ")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function setupLeaguesCountryFilter() {
  // Objetivo:
  // - Mostrar SOLO los países permitidos.
  // - Dejar esos países arriba (no alfabético global).
  // - NO remover nodos (remover rompe expansión/favoritos del widget).
  // - Si un país se expande, mostrar máximo 5 ligas importantes (TOP_LEAGUES_BY_COUNTRY).
  // - Mantener estable con refresh del widget (MutationObserver + debounce).
  if (window.__FV_leaguesFilterSetup) return;
  window.__FV_leaguesFilterSetup = true;

  const allowedOrdered = [...ALLOWED_COUNTRIES];
  const allowedSet = new Set(allowedOrdered.map((c) => normalizeTxt(c)));

  const apply = () => {
    const root = document.getElementById("leagues-list");
    if (!root) return false;

    const items = Array.from(root.querySelectorAll("li")).filter((li) => {
      const t = normalizeTxt(li.textContent || "");
      return t && t.length <= 25;
    });

    // 1) Ocultar países no permitidos
    for (const li of items) {
      const t = normalizeTxt(li.textContent || "");
      if (t && !allowedSet.has(t)) li.style.display = "none";
      else if (t) li.style.display = "";
    }

    // 2) Reordenar países permitidos al top
    const allowedLis = [];
    for (const country of allowedOrdered) {
      const key = normalizeTxt(country);
      const li = items.find((x) => normalizeTxt(x.textContent || "") === key);
      if (li) allowedLis.push(li);
    }
    for (let i = allowedLis.length - 1; i >= 0; i--) {
      const li = allowedLis[i];
      const first = root.querySelector("li");
      if (first && li !== first) first.parentNode.insertBefore(li, first);
    }

    // 3) Limitar ligas visibles a TOP 5 dentro del país expandido (filtro suave)
    const topByCountryNorm = {};
    for (const [cty, leagues] of Object.entries(TOP_LEAGUES_BY_COUNTRY)) {
      topByCountryNorm[normalizeTxt(cty)] = new Set(leagues.map((l) => normalizeTxt(l)));
    }

    const allLis = Array.from(root.querySelectorAll("li"));
    let currentCountry = null;
    for (const li of allLis) {
      const txt = normalizeTxt(li.textContent || "");
      if (!txt) continue;

      if (allowedSet.has(txt)) {
        currentCountry = txt;
        continue;
      }

      // Otra fila "país" (texto corto) no permitido → reset
      if (txt.length <= 25 && !allowedSet.has(txt)) {
        currentCountry = null;
        continue;
      }

      if (currentCountry) {
        const top = topByCountryNorm[currentCountry];
        if (top && top.size) {
          const ok = Array.from(top).some((needle) => txt.includes(needle));
          li.style.display = ok ? "" : "none";
        }
      }
    }

    return true;
  };

  let t = null;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(apply, 250);
  };

  const target = document.getElementById("leagues-list") || document.body;
  const observer = new MutationObserver(debounced);
  observer.observe(target, { childList: true, subtree: true });

  apply();
  setTimeout(apply, 400);
  setTimeout(apply, 900);
}



function setupGamesCountryFilter() {
  if (window.__FV_gamesFilterSetup) return;
  window.__FV_gamesFilterSetup = true;

  const allowedSet = new Set(ALLOWED_COUNTRIES.map((c) => normalizeTxt(c)));
  const topByCountryNorm = {};
  for (const [cty, leagues] of Object.entries(TOP_LEAGUES_BY_COUNTRY)) {
    topByCountryNorm[normalizeTxt(cty)] = new Set(leagues.map((l) => normalizeTxt(l)));
  }

  const isHeader = (el) => {
    const t = (el.textContent || "").trim();
    return t.includes(":") && t.length < 80 && /\w\s*:\s*\w/.test(t);
  };

  const apply = () => {
    const root = document.getElementById("games-list");
    if (!root) return false;

    const all = Array.from(root.querySelectorAll("*"));
    let currentCountry = null;
    let currentLeagueOk = true;

    for (const el of all) {
      const raw = (el.textContent || "").trim();
      if (!raw) continue;

      if (isHeader(el)) {
        const parts = raw.split(":");
        const cty = normalizeTxt(parts[0] || "");
        const league = normalizeTxt(parts.slice(1).join(":") || "");
        currentCountry = cty;

        const countryOk = allowedSet.has(cty);
        if (!countryOk) {
          currentLeagueOk = false;
          el.style.display = "none";
          continue;
        }

        const top = topByCountryNorm[cty];
        if (top && top.size) {
          const ok = Array.from(top).some((needle) => league.includes(needle));
          currentLeagueOk = ok;
          el.style.display = ok ? "" : "none";
        } else {
          currentLeagueOk = true;
          el.style.display = "";
        }
        continue;
      }

      // debajo del header
      if (currentCountry) {
        el.style.display = currentLeagueOk ? "" : "none";
      }
    }

    // Si hay partidos visibles, clickea el primero para que el detalle salga actualizado
    setTimeout(() => {
      const candidates = Array.from(root.querySelectorAll("li, a, button, div")).filter((x) => {
        const t = (x.textContent || "").trim();
        return t && t.length > 15 && t.length < 160;
      });
      const first = candidates.find((x) => /\bFIN\b|\bHOY\b|\bEN VIVO\b/i.test(x.textContent || ""));
      if (first && typeof first.click === "function") first.click();
    }, 600);

    return true;
  };

  let t = null;
  const debounced = () => {
    clearTimeout(t);
    t = setTimeout(apply, 250);
  };

  const target = document.getElementById("games-list") || document.body;
  const observer = new MutationObserver(debounced);
  observer.observe(target, { childList: true, subtree: true });

  apply();
  setTimeout(apply, 500);
  setTimeout(apply, 1200);
}

function setupDefaultFavorites() {
  // Marca países permitidos como favoritos y fuerza pestaña FAVORITOS en panel de ligas (no el de partidos)
  const KEY = "fv_fixtures_bootstrap_favs_v3";
  if (localStorage.getItem(KEY) === "1") return;

  const run = () => {
    const panel = document.getElementById("leagues-list");
    if (!panel) return false;

    // tab favoritos dentro del panel
    const favBtn = Array.from(panel.querySelectorAll("button, a, div")).find((el) => {
      const t = normalizeTxt(el.textContent || "");
      return t === "favoritos" || t === "favorites";
    });
    if (favBtn) favBtn.click();

    // intentar marcar estrellas en países permitidos (si hay star)
    for (const cty of ALLOWED_COUNTRIES) {
      const key = normalizeTxt(cty);
      const li = Array.from(panel.querySelectorAll("li")).find((x) => normalizeTxt(x.textContent || "") === key);
      if (!li) continue;
      const star = li.querySelector("button, svg, i, span");
      if (star && typeof star.click === "function") star.click();
    }

    if (favBtn) favBtn.click();
    localStorage.setItem(KEY, "1");
    return true;
  };

  setTimeout(run, 900);
  setTimeout(run, 1800);
  setTimeout(run, 3000);
}


function ensureWidgetScriptLoaded() {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`);
    if (existing) return resolve(true);

    const s = document.createElement("script");
    s.src = WIDGET_SCRIPT_SRC;
    s.type = "module";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = (e) => reject(e);
    document.body.appendChild(s);
  });
}

function refreshApiSportsWidgets() {
  // En SPA (React Router), los custom elements a veces no se “re-hidratan” al navegar.
  // Forzamos re-render interno del widget y disparamos DOMContentLoaded como sugiere el tutorial.
  const widgets = Array.from(document.querySelectorAll("api-sports-widget"));
  widgets.forEach((w) => {
    try {
      // Reset interno
      w.innerHTML = "";
      if (typeof w.connectedCallback === "function") w.connectedCallback();
    } catch (_) {
      // no-op
    }
  });

  try {
    window.document.dispatchEvent(
      new Event("DOMContentLoaded", { bubbles: true, cancelable: true })
    );
  } catch (_) {
    // no-op
  }
}

export default function Fixtures() {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useAuth();

  // Ajusta esto si tu backend/front maneja planes de otra forma.
  const hasMembership = !!(user && (user.planId || user.plan || user.membership));

  const widgetKey = useMemo(() => {
    // OJO: Esto corre en FRONT. La key del widget se verá en el navegador.
    // API-SPORTS entiende que las keys para widgets se usan en cliente.
    return (
      import.meta?.env?.VITE_APISPORTS_WIDGET_KEY ||
      import.meta?.env?.VITE_APISPORTS_KEY ||
      ""
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await ensureWidgetScriptLoaded();

    // Filtra países para que el widget de ligas quede liviano
    setupLeaguesCountryFilter();
        setupGamesCountryFilter();
        setupDefaultFavorites();
        if (cancelled) return;

        // Espera un tick para asegurar que el DOM esté montado
        setTimeout(() => {
          if (cancelled) return;
          refreshApiSportsWidgets();
        }, 50);
      } catch (e) {
        // Si falla la carga del script, igual dejamos la UI (con mensaje).
        console.error("[WIDGETS] Error cargando script:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Gating (si quieres solo miembros, deja solo hasMembership)
  if (!isLoggedIn || !hasMembership) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-2xl w-full rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-sm text-white/60">Módulo premium</div>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Partidos & Estadísticas
          </h1>
          <p className="mt-2 text-white/70">
            Este centro de estadísticas es solo para miembros. Activa tu plan o inicia sesión.
          </p>

          <div className="mt-5 flex gap-3">
            <button
              className="px-4 py-2 rounded-xl bg-[#E6C464] text-black font-semibold hover:opacity-90"
              onClick={() => navigate("/")}
            >
              Ver planes
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-white/15 text-white hover:bg-white/5"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay key, muestra un aviso (pero igual renderiza estructura).
  const showKeyWarning = !widgetKey;

  return (
    <div className="px-4 md:px-8 py-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">Centro de estadísticas</div>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              Partidos & Estadísticas
            </h1>
            <p className="mt-1 text-white/70">
              Selecciona una liga, revisa los partidos del día y abre el detalle con estadísticas.
            </p>
          </div>
          <div className="text-xs text-white/50">Widgets oficiales de API-FOOTBALL</div>
        </div>

        {showKeyWarning && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
            <div className="font-semibold">Falta la API Key para Widgets</div>
            <div className="text-sm opacity-90">
              Configura <code>VITE_APISPORTS_WIDGET_KEY</code> (o <code>VITE_APISPORTS_KEY</code>) en tu entorno.
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Ligas */}
        <div className="lg:col-span-3">
          <div id="leagues-list" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[520px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Ligas</div>
            <div className="rounded-xl overflow-hidden">
              <api-sports-widget data-type="leagues"></api-sports-widget>
            </div>
          </div>
        </div>

        {/* Partidos */}
        <div className="lg:col-span-5">
          <div id="games-list" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[520px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Partidos</div>
            <div className="rounded-xl overflow-hidden">
              <api-sports-widget data-type="games"></api-sports-widget>
            </div>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div id="game-content" className="rounded-2xl border border-white/10 bg-white/5 p-3 min-h-[320px]">
            <div className="text-sm font-semibold text-white/80 mb-2">Detalle</div>
            <div className="card-body rounded-xl overflow-hidden">
              {/* Un game-id inicial para que el widget renderice algo; luego se reemplaza al seleccionar partido */}
              <api-sports-widget data-type="game" data-game-id="977705"></api-sports-widget>
            </div>
          </div>
        </div>
      </div>

      {/* Config widget (Dynamic Targeting). Debe existir en el DOM para que el resto funcione. */}
      {!!widgetKey && (
        <api-sports-widget
          data-type="config"
          data-sport="football"
          data-key={widgetKey}
          data-lang="es"
          data-theme="grey"
          data-show-error="true"
          data-show-logos="true"
          data-refresh="30"
          data-favorite="true"
          data-standings="false"
          data-team-squad="false"
          data-team-statistics="false"
          data-player-statistics="false"
          data-game-tab="statistics"
          data-target-league="#games-list"
          data-target-game="#game-content .card-body"
          style={{ display: "none" }}
        ></api-sports-widget>
      )}
    </div>
  );
}
