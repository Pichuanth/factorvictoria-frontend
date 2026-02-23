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

function setupLeaguesCountryFilter() {
  // Filtra visualmente el listado de países/ligas (panel “Ligas”) para que SOLO queden los países allowlist.
  // Nota: esto no impide que el widget descargue data global, pero evita “basura” visual y mejora UX.
  if (window.__FV_leaguesFilterSetup) return;
  window.__FV_leaguesFilterSetup = true;

  const allowed = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));

  const norm = (s) => (s || "").toString().replace(/\s+/g, " ").trim();
  const getCountryFromNode = (node) => {
    if (!node) return "";
    // 1) Atributos típicos
    const attrCandidates = [
      node.getAttribute?.("data-country"),
      node.getAttribute?.("aria-label"),
      node.getAttribute?.("title"),
    ].filter(Boolean);
    for (const a of attrCandidates) {
      const t = norm(a);
      if (t && t.length <= 40) return t;
    }

    // 2) Imagen con alt/title (común cuando sólo se ven banderas)
    const img =
      node.querySelector?.("img[alt]") ||
      node.querySelector?.("img[title]") ||
      node.querySelector?.("svg[aria-label]");
    if (img) {
      const t = norm(img.getAttribute?.("alt") || img.getAttribute?.("title") || img.getAttribute?.("aria-label"));
      if (t && t.length <= 40) return t;
    }

    // 3) Texto visible (fallback)
    const txt = norm(node.textContent);
    // Si hay formato "Pais : Liga", nos quedamos con el país
    const m = txt.match(/^([\p{L}\s-]{2,})\s*:/u);
    if (m?.[1]) return norm(m[1]);
    // Si parece un país (corto y solo letras)
    if (txt && txt.length <= 30 && /^[\p{L}\s-]+$/u.test(txt)) return txt;
    return "";
  };

  const hideBlock = (el) => {
    const block =
      el.closest("li") ||
      el.closest("[class*='country']") ||
      el.closest("[class*='Country']") ||
      el.closest("[class*='wg-item']") ||
      el.closest("div");
    (block || el).style.display = "none";
  };

  const filter = () => {
    const root = document.getElementById("leagues-list");
    if (!root) return;

    // En este widget, los países suelen ser items (li/div/button) con bandera y a veces sin texto.
    const items = Array.from(root.querySelectorAll("li, button, a, div"))
      .filter((el) => el.offsetParent !== null); // visibles

    for (const el of items) {
      const country = getCountryFromNode(el);
      if (!country) continue;

      const key = country.toLowerCase();
      if (allowed.has(key)) continue;

      // Heurística: solo ocultar cuando el item parece “país” (bandera/favorito)
      const hasFlag = !!el.querySelector?.("img, svg");
      const shortText = norm(el.textContent).length <= 25;

      if (hasFlag || shortText) {
        hideBlock(el);
      }
    }
  };

  const root = document.getElementById("leagues-list");
  const obsTarget = root || document.body;
  const observer = new MutationObserver(() => filter());
  observer.observe(obsTarget, { childList: true, subtree: true });

  filter();
  setTimeout(filter, 250);
  setTimeout(filter, 800);
}

function setupWidgetUiPrune() {
  // Oculta secciones/tabs que no aportan (sobre todo en móvil):
  // - “Tabla / Standings”
  // - “Equipo / Jugadores / Squad / Players”
  // No tocamos la lógica interna del widget: solo ocultamos elementos del DOM cuando aparezcan.
  if (window.__FV_widgetUiPruneSetup) return;
  window.__FV_widgetUiPruneSetup = true;

  const SHOULD_HIDE = [
    "tabla",
    "standings",
    "equipo",
    "jugadores",
    "players",
    "squad",
    "alineación",
    "lineup",
  ];

  const shouldHide = (txt) => {
    const t = (txt || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!t) return false;
    return SHOULD_HIDE.some((k) => t === k || t.includes(k));
  };

  const prune = () => {
    const scope = document.querySelector("#leagues-list, #games-list, #game-content") || document.body;

    const clickable = Array.from(scope.querySelectorAll("button, a, li, span, div"))
      .filter((el) => {
        const txt = (el.textContent || "").trim();
        if (!txt) return false;
        // Evita borrar contenedores grandes; prioriza elementos “tipo botón/tab”
        const isInteractive =
          el.tagName === "BUTTON" ||
          el.tagName === "A" ||
          (el.getAttribute?.("role") || "").toLowerCase().includes("tab") ||
          (el.className || "").toString().toLowerCase().includes("tab");
        return isInteractive || txt.length <= 20;
      });

    for (const el of clickable) {
      const txt = (el.textContent || "").trim();
      if (!shouldHide(txt)) continue;

      // Oculta el tab/botón y, si corresponde, el contenedor cercano.
      el.style.display = "none";

      const wrap =
        el.closest("[role='tab']") ||
        el.closest("[class*='tab']") ||
        el.closest("li") ||
        el.closest("button") ||
        null;
      if (wrap && wrap !== el) wrap.style.display = "none";
    }
  };

  const observer = new MutationObserver(() => prune());
  observer.observe(document.body, { childList: true, subtree: true });

  prune();
  setTimeout(prune, 250);
  setTimeout(prune, 800);
}



function setupGamesCountryFilter() {
  // Filtra visualmente la lista de “Partidos” (panel central) para ocultar ligas cuyo país NO esté en allowlist.
  // Además, permite “Europe : UEFA Champions League” aunque Europe no esté en allowlist.
  if (window.__FV_gamesCountryFilterSetup) return;
  window.__FV_gamesCountryFilterSetup = true;

  const allowedCountries = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));
  const allowedLeagueKeywords = [
    "uefa champions league",
    "champions league",
  ];

  const norm = (s) => (s || "").toString().replace(/\s+/g, " ").trim();
  const parseCountryLeague = (txt) => {
    const t = norm(txt);
    if (!t || t.length > 100) return null;
    const m = t.match(/^([\p{L}\s-]{2,})\s*:\s*(.+)$/u);
    if (!m) return null;
    const country = norm(m[1]);
    const league = norm(m[2]);
    if (!country || !league) return null;
    if (country.length > 35) return null;
    if (/\d/.test(country)) return null;
    return { country, league };
  };

  const isAllowed = ({ country, league }) => {
    const c = country.toLowerCase();
    const l = league.toLowerCase();
    if (allowedCountries.has(c)) return true;
    // excepción: Champions League (normalmente viene como Europe)
    if (allowedLeagueKeywords.some((k) => l.includes(k))) return true;
    return false;
  };

  const hideSection = (headerEl) => {
    // Intentamos ocultar el bloque completo de esa liga (header + partidos)
    // El widget suele usar <li> por sección; si no, caemos a un div cercano.
    const li = headerEl.closest("li");
    if (li) {
      li.style.display = "none";
      return;
    }
    const block =
      headerEl.closest("[class*='league']") ||
      headerEl.closest("[class*='League']") ||
      headerEl.closest("[class*='competition']") ||
      headerEl.closest("[class*='Competition']") ||
      headerEl.closest("div");
    (block || headerEl).style.display = "none";
  };

  const filterGames = () => {
    const root = document.getElementById("games-list");
    if (!root) return;

    // Buscamos encabezados tipo "Country : League"
    const nodes = Array.from(root.querySelectorAll("button, a, li, div, span, strong, h1, h2, h3, h4"))
      .filter((el) => {
        const t = norm(el.textContent);
        return t.includes(":") && t.length <= 120;
      });

    for (const el of nodes) {
      const parsed = parseCountryLeague(el.textContent);
      if (!parsed) continue;
      if (isAllowed(parsed)) continue;

      // Solo ocultamos cuando parece un header (clickeable o con flecha)
      const isInteractive =
        el.tagName === "BUTTON" ||
        el.tagName === "A" ||
        (el.getAttribute?.("role") || "").toLowerCase().includes("button") ||
        (el.className || "").toString().toLowerCase().includes("header") ||
        (el.className || "").toString().toLowerCase().includes("league") ||
        !!el.querySelector?.("svg, i");

      if (isInteractive || norm(el.textContent).split(":").length === 2) {
        hideSection(el);
      }
    }
  };

  const root = document.getElementById("games-list");
  const obsTarget = root || document.body;
  const observer = new MutationObserver(() => filterGames());
  observer.observe(obsTarget, { childList: true, subtree: true });

  filterGames();
  setTimeout(filterGames, 250);
  setTimeout(filterGames, 800);
}

function setupDefaultDetailSelection() {
  // Evita que el panel “Detalle” quede mostrando cosas viejas (World Cup 2022).
  // Intentamos auto-seleccionar una liga más actual (Champions / ligas top).
  if (window.__FV_defaultDetailSetup) return;
  window.__FV_defaultDetailSetup = true;

  const PREFERRED = [
    // Europe
    "UEFA Champions League",
    "Champions League",
    // Top leagues
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
    // LatAm
    "Chile : Primera División",
    "Campeonato Nacional",
    "Mexico : Liga MX",
    "Liga MX",
    "Brazil : Serie A",
    "Brasileirão",
    "Argentina : Liga Profesional",
    "Liga Profesional",
  ];

  const norm = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, " ").trim();

  const trySelect = () => {
    const gamesRoot = document.getElementById("games-list");
    const leaguesRoot = document.getElementById("leagues-list");
    const scopes = [leaguesRoot, gamesRoot, document.body].filter(Boolean);

    const candidates = [];
    for (const s of scopes) {
      candidates.push(...Array.from(s.querySelectorAll("button, a, li, div, span, strong")));
    }

    // 1) Click en liga preferida (si existe)
    for (const pref of PREFERRED) {
      const prefLc = norm(pref);
      const el = candidates.find((x) => norm(x.textContent).includes(prefLc));
      if (!el) continue;

      const clickable = el.closest("button, a, li") || el;
      try {
        clickable.click();
        break;
      } catch (_) {}
    }

    // 2) Click en el primer partido visible para poblar el panel “Detalle”
    if (gamesRoot) {
      const matchCandidate = Array.from(gamesRoot.querySelectorAll("a, button, li, div"))
        .find((el) => {
          if (el.offsetParent === null) return false;
          const t = (el.textContent || "").trim();
          // Heurística: filas con 2 equipos suelen tener más texto que un header y NO contienen ":"
          if (!t || t.length < 8) return false;
          if (t.includes(":")) return false;
          // suele tener dos nombres + quizá marcador
          return t.split("\n").length >= 2 || t.split(" ").length >= 3;
        });

      if (matchCandidate) {
        try {
          (matchCandidate.closest("a,button,li") || matchCandidate).click();
          return true;
        } catch (_) {}
      }
    }

    return false;
  };

  setTimeout(trySelect, 600);
  setTimeout(trySelect, 1200);
  setTimeout(trySelect, 2200);
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

    // Oculta tabs/paneles que no aportan (Tabla/Equipo/Jugadores)
    setupWidgetUiPrune();

    // Filtra el listado central de Partidos (oculta ligas de países fuera de allowlist)
    setupGamesCountryFilter();

    // Ajusta detalle por defecto (evita World Cup viejo)
    setupDefaultDetailSelection();
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
