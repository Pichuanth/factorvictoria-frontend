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


// Ligas prioritarias para el panel "Detalle" (para evitar que quede pegado en World Cup 2022)
const PREFERRED_LEAGUES = [
  "UEFA Champions League",
  "England : Premier League",
  "Premier League",
  "Spain : La Liga",
  "La Liga",
  "Italy : Serie A",
  "Serie A",
  "Germany : Bundesliga",
  "Bundesliga",
  "France : Ligue 1",
  "Ligue 1",
  "Portugal : Primeira Liga",
  "Primeira Liga",
  "Chile : Primera Division",
  "Primera Division",
  "Mexico : Liga MX",
  "Liga MX",
  "Brazil : Serie A",
  "Argentina : Liga Profesional",
];

// Normaliza texto (quita acentos) para comparar de forma robusta
function norm(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function extractCountry(rawText) {
  // Ejemplos reales del widget:
  // "Chile 5", "Chinese-Taipei 1", "Japan : J2 League", "Mexico : Liga MX"
  const t = (rawText || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const beforeColon = t.includes(":") ? t.split(":")[0] : t;
  // quita contadores al final ("Chile 5", "Japan 12")
  const noCount = beforeColon.replace(/\s*\d+\s*$/g, "").trim();
  return noCount;
}

function isAllowedCountry(country) {
  const c = norm(country);
  if (!c) return false;
  // Alias comunes / tolerancia
  if (c === "brasil") return true; // a veces viene en español
  if (c === "méxico" || c === "mexico") return true;
  return new Set(ALLOWED_COUNTRIES.map((x) => norm(x))).has(c);
}

function looksLikeCountryRow(el) {
  // Heurística: filas "clickeables" o items de lista
  if (!el || el.nodeType !== 1) return false;
  const tag = el.tagName?.toLowerCase();
  if (!["li", "a", "button", "div"].includes(tag)) return false;
  const txt = (el.textContent || "").trim();
  if (!txt) return false;
  // La fila de país suele ser corta y tiene algún contador o flecha
  if (txt.length > 60) return false;
  // Debe contener letras
  if (!/[a-zA-Z]/.test(txt)) return false;
  return true;
}

function setupWidgetsFiltersAndDefaults() {
  if (window.__FV_widgetsFiltersSetup) return;
  window.__FV_widgetsFiltersSetup = true;

  const allowedSet = new Set(ALLOWED_COUNTRIES.map((c) => norm(c)));

  const filterLeaguesPanel = () => {
    const root = document.getElementById("leagues-list");
    if (!root) return;

    // Intentamos encontrar items dentro del widget
    const candidates = Array.from(root.querySelectorAll("li, a, button, div"))
      .filter(looksLikeCountryRow);

    for (const el of candidates) {
      const txt = (el.textContent || "").trim();
      const country = extractCountry(txt);
      const c = norm(country);

      // Si el item NO parece país (no se puede extraer), no lo tocamos
      if (!c) continue;

      // OJO: aquí si NO está permitido, removemos la fila completa
      if (!allowedSet.has(c) && c !== "brasil" && c !== "mexico" && c !== "méxico") {
        // Pero evitamos remover contenedores grandes: solo si la fila es “pequeña”
        if ((el.textContent || "").trim().length <= 60) {
          el.remove();
        }
      }
    }
  };

  const isHeaderText = (t) => {
    const s = (t || "").replace(/\s+/g, " ").trim();
    if (!s) return false;
    // headers típicos: "Japan : J2 League"
    return s.includes(":") && s.length <= 80 && /[a-zA-Z]/.test(s.split(":")[0] || "");
  };

  const removeSectionFromHeaderBlock = (headerEl) => {
    const block = headerEl.closest("li, div") || headerEl;
    const parent = block.parentElement;
    if (!parent) return;

    // Eliminamos el bloque del header y los siguientes siblings hasta el próximo header
    let node = block;
    while (node) {
      const next = node.nextElementSibling;
      node.remove();
      if (!next) break;

      // Si el siguiente sibling contiene un header, paramos
      const nextText = (next.textContent || "").trim();
      if (isHeaderText(nextText)) break;

      node = next;
    }
  };

  const filterGamesPanel = () => {
    const root = document.getElementById("games-list");
    if (!root) return;

    // Encontrar headers de secciones dentro de "Partidos"
    const allEls = Array.from(root.querySelectorAll("li, div, a, button"));
    const headers = allEls.filter((el) => isHeaderText((el.textContent || "").trim()));

    for (const h of headers) {
      const txt = (h.textContent || "").replace(/\s+/g, " ").trim();
      const country = extractCountry(txt);
      if (!country) continue;

      if (!isAllowedCountry(country)) {
        removeSectionFromHeaderBlock(h);
      }
    }
  };

  let lastAutoPick = 0;

  const tryPickBetterDefault = () => {
    const now = Date.now();
    if (now - lastAutoPick < 2000) return; // throttle
    lastAutoPick = now;

    const detailRoot = document.getElementById("game-content");
    const detailText = (detailRoot?.textContent || "");
    const isStaleWorldCup =
      /world\s*:\s*world\s*cup/i.test(detailText) ||
      /world\s*cup/i.test(detailText);

    if (!isStaleWorldCup) return;

    const gamesRoot = document.getElementById("games-list");
    if (!gamesRoot) return;

    const normText = (s) => norm((s || "").replace(/\s+/g, " "));
    const pref = PREFERRED_LEAGUES.map((x) => normText(x));

    // Buscamos el primer partido clickeable dentro de una liga preferida
    const clickable = Array.from(gamesRoot.querySelectorAll("a, button, li, div")).filter(
      (el) => {
        const t = (el.textContent || "").trim();
        if (!t || t.length > 120) return false;
        // partido suele tener 2 equipos (múltiples palabras) y/o un score
        const hasTwoTeams = (t.match(/\n/g) || []).length >= 1 || /\s\d+\s*-\s*\d+\s*/.test(t);
        return hasTwoTeams;
      }
    );

    // Recorremos el DOM y elegimos el primer click bajo una cabecera preferida
    // (Heurística: buscamos cabeceras y luego el siguiente item clickeable)
    const headers = Array.from(gamesRoot.querySelectorAll("li, div")).filter((el) =>
      isHeaderText((el.textContent || "").trim())
    );

    for (const h of headers) {
      const ht = normText((h.textContent || "").trim());
      if (!pref.some((p) => ht.includes(p))) continue;

      // Tomamos el siguiente sibling como primer partido de esa liga
      let sib = (h.closest("li, div") || h).nextElementSibling;
      while (sib) {
        const t = (sib.textContent || "").trim();
        if (t && t.length <= 160) {
          // Intento click
          try {
            sib.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            return;
          } catch (_) {}
        }
        // no nos vamos demasiado abajo
        sib = sib.nextElementSibling;
      }
    }

    // Fallback: click al primer elemento clickeable encontrado
    if (clickable[0]) {
      try {
        clickable[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
      } catch (_) {}
    }
  };

  const runAll = () => {
    filterLeaguesPanel();
    filterGamesPanel();
    tryPickBetterDefault();
  };

  // Observer global y también por contenedor (porque el widget refresca por data-refresh)
  const obs = new MutationObserver(() => runAll());
  obs.observe(document.body, { childList: true, subtree: true });

  // ticks iniciales
  runAll();
  setTimeout(runAll, 400);
  setTimeout(runAll, 1200);
  setTimeout(runAll, 2500);
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
    setupWidgetsFiltersAndDefaults();
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
