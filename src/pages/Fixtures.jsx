import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// Página PARTIDOS: centro de estadísticas con Widgets oficiales de API-FOOTBALL.
// Requiere membresía (o al menos sesión) para acceder.
// Tutorial: https://www.api-football.com/news/post/how-to-create-a-sports-website-in-just-a-few-minutes-using-widgets

const WIDGET_SCRIPT_SRC = "https://widgets.api-sports.io/3.1.0/widgets.js";

const TOP_LEAGUES_BY_COUNTRY = {
  Chile: ["Primera División", "Copa Chile", "Primera B", "Super Cup", "Segunda División"],
  Argentina: ["Liga Profesional", "Copa de la Liga", "Copa Argentina", "Primera Nacional", "Super Cup"],
  Brazil: ["Serie A", "Serie B", "Copa do Brasil", "Paulista A1", "Carioca"],
  Colombia: ["Primera A", "Copa Colombia", "Primera B", "Super Cup", "Liga Femenina"],
  Mexico: ["Liga MX", "Liga Premier Serie A", "Liga de Expansión", "Copa MX", "Liga MX Femenil"],
  Spain: ["La Liga", "Copa del Rey", "Segunda División", "Super Cup", "Primera RFEF"],
  England: ["Premier League", "FA Cup", "Championship", "EFL Cup", "Community Shield"],
  Italy: ["Serie A", "Coppa Italia", "Serie B", "Super Cup", "Primavera"],
  Germany: ["Bundesliga", "DFB Pokal", "2. Bundesliga", "Super Cup", "3. Liga"],
  Portugal: ["Primeira Liga", "Taça de Portugal", "Liga 2", "Super Cup", "Liga 3"],
  France: ["Ligue 1", "Coupe de France", "Ligue 2", "Trophée des Champions", "National"]
};

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
  // Panel izquierdo (Ligas): queremos SOLO nuestros países y que aparezcan ARRIBA.
  // Clave: NO remover nodos (rompe listeners internos). Solo ocultar + reordenar con appendChild.
  if (window.__FV_leaguesFilterSetup) return;
  window.__FV_leaguesFilterSetup = true;

  const allowedList = ALLOWED_COUNTRIES.slice();
  const allowed = new Set(allowedList.map((c) => c.toLowerCase()));

  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const stripTrailingCount = (s) => normalize(s).replace(/\s+\d+\s*$/g, "").trim();

  const extractCountry = (rowEl) => {
    const raw = stripTrailingCount(rowEl?.textContent || "");
    if (!raw) return "";
    // quita símbolos raros; deja letras/espacios/guiones
    const cleaned = raw.replace(/[^\p{L}\s-]/gu, "").replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length > 30) return "";
    return cleaned;
  };

  const findLeaguesCardScope = () => {
    // #leagues-list es nuestro wrapper; el widget renderiza dentro
    return document.getElementById("leagues-list");
  };

  const clickFavoritesTabIfPresent = () => {
    const scope = findLeaguesCardScope();
    if (!scope) return;
    const btns = Array.from(scope.querySelectorAll("button, a, [role='tab'], div"));
    const favBtn =
      btns.find((b) => normalize(b.textContent).toLowerCase() === "favoritos") ||
      btns.find((b) => normalize(b.textContent).toLowerCase() === "favorites") ||
      btns.find((b) => normalize(b.textContent).toLowerCase().includes("favoritos")) ||
      btns.find((b) => normalize(b.textContent).toLowerCase().includes("favorites")) ||
      null;
    if (favBtn) {
      try { favBtn.click(); } catch (_) {}
    }
  };

  const getCountryRows = (scope) => {
    // Heurística: países suelen ser <li> con bandera (img) y texto corto SIN ":".
    const lis = Array.from(scope.querySelectorAll("li"));
    return lis.filter((li) => {
      const txt = stripTrailingCount(li.textContent || "");
      if (!txt || txt.length > 40) return false;
      if (txt.includes(":")) return false;
      const hasImg = !!li.querySelector("img");
      if (!hasImg) return false;
      return true;
    });
  };

  const apply = () => {
    const scope = findLeaguesCardScope();
    if (!scope) return;

    const rows = getCountryRows(scope);
    if (!rows.length) return;

    // 1) ocultar no permitidos
    for (const row of rows) {
      const country = extractCountry(row);
      if (!country) continue;
      const key = country.toLowerCase();
      if (!allowed.has(key)) {
        row.style.display = "none";
        row.setAttribute("data-fv-hidden-country", "1");
      } else {
        row.style.display = "";
        row.removeAttribute("data-fv-hidden-country");
      }
    }

    // 2) reordenar permitidos arriba, en el orden de ALLOWED_COUNTRIES
    // Buscamos un contenedor padre común (ul) para reordenar sin romper listeners.
    const parent = rows[0]?.parentElement;
    if (parent) {
      for (const c of allowedList) {
        const match = rows.find((r) => extractCountry(r).toLowerCase() === c.toLowerCase());
        if (match && match.parentElement === parent) {
          parent.appendChild(match); // appendChild lo mueve al final -> lo acumulamos con "reverse" para dejar arriba
        }
      }
      // Como appendChild mueve al final, repetimos en reversa para que queden arriba en orden correcto
      const ordered = allowedList.slice().reverse();
      for (const c of ordered) {
        const match = rows.find((r) => extractCountry(r).toLowerCase() === c.toLowerCase());
        if (match && match.parentElement === parent) {
          parent.insertBefore(match, parent.firstChild);
        }
      }
    }

    // 3) abrir Favoritos si está disponible (UX)
    clickFavoritesTabIfPresent();
  };

  // Observamos SOLO el scope para evitar ruido.
  const startObserver = () => {
    const scope = findLeaguesCardScope();
    if (!scope) return false;
    const obs = new MutationObserver(() => schedule());
    obs.observe(scope, { childList: true, subtree: true });
    return true;
  };

  let t = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(apply, 120);
  };

  // Primera pasada + polling corto (porque el widget carga async)
  apply();
  setTimeout(apply, 350);
  setTimeout(apply, 900);
  setTimeout(apply, 1600);

  // Polling liviano por si el widget refresca y no muta como esperamos
  let ticks = 0;
  const iv = setInterval(() => {
    ticks += 1;
    apply();
    if (ticks >= 10) clearInterval(iv); // solo 10s
  }, 1000);

  // Observer
  const ok = startObserver();
  if (!ok) {
    // si aún no existe el scope, reintenta
    setTimeout(startObserver, 600);
    setTimeout(startObserver, 1400);
  }
}


function setupDefaultFavoritesBootstrap() {
  // Idea: dejar el widget intacto, pero marcar favoritos por defecto y abrir la pestaña "FAVORITOS".
  // - No removemos nodos (rompe listeners internos).
  // - Solo hacemos clicks controlados en estrellas / tabs.
  // - Se ejecuta UNA vez por navegador (localStorage), con reintentos seguros porque el widget renderiza async.
  if (window.__FV_favoritesBootstrapSetup) return;
  window.__FV_favoritesBootstrapSetup = true;

  const LS_KEY = "fv_fixtures_bootstrap_favs_v1";

  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  const stripTrailingCount = (s) => (s || "").replace(/\s+\d+\s*$/g, "").trim();

  const findTabButton = (label) => {
    const want = normalize(label);
    const scope = document.querySelector("#leagues-list")?.closest(".card") || document.body;
    const btns = Array.from(scope.querySelectorAll("button, a, [role='tab'], div"));
    return (
      btns.find((b) => normalize(b.textContent) === want) ||
      btns.find((b) => normalize(b.textContent).includes(want)) ||
      null
    );
  };

  const clickSafe = (el) => {
    try {
      el?.click?.();
      return true;
    } catch (_) {
      return false;
    }
  };

  const findStarControlInRow = (row) => {
    if (!row) return null;

    // Heurística: el icono de favorito suele estar al inicio de la fila
    const candidates = [
      row.querySelector("[class*='star']"),
      row.querySelector("[class*='fav']"),
      row.querySelector("button"),
      row.querySelector("svg"),
      row.querySelector("span"),
      row.querySelector("i"),
    ].filter(Boolean);

    // Preferimos algo clickeable cercano
    for (const c of candidates) {
      // si es svg, normalmente el click va al parent
      if (c.tagName === "svg" || c.tagName === "SVG") return c.parentElement || c;
      // botones/spans suelen funcionar directo
      return c;
    }
    return null;
  };

  const isFavorited = (row) => {
    // No hay API oficial; intentamos deducir por clases comunes o aria-pressed.
    const star =
      row?.querySelector("[aria-pressed]") ||
      row?.querySelector("[class*='active']") ||
      row?.querySelector("[class*='selected']") ||
      null;
    if (!star) return false;
    const ap = star.getAttribute?.("aria-pressed");
    if (ap === "true") return true;
    const cls = (star.className || "").toString().toLowerCase();
    return cls.includes("active") || cls.includes("selected") || cls.includes("on");
  };

  const ensureFavorited = (row) => {
    if (!row) return false;
    if (isFavorited(row)) return true;
    const star = findStarControlInRow(row);
    if (!star) return false;
    return clickSafe(star);
  };

  const getLeagueRowsUnderExpandedCountry = (root) => {
    // En el widget, las ligas suelen ser <li> sin bandera dentro del mismo root.
    // No hay estructura fija; buscamos li que no tengan img bandera y que tengan texto corto.
    const all = Array.from(root.querySelectorAll("li"));
    return all.filter((li) => {
      const t = stripTrailingCount(li.textContent || "").trim();
      if (!t) return false;
      const hasFlag = !!li.querySelector("img");
      // ligas suelen venir sin bandera o con icono pequeño
      return !hasFlag && t.length > 2 && t.length < 60;
    });
  };

  const attempt = () => {
    if (localStorage.getItem(LS_KEY) === "1") return true;

    const root = document.getElementById("leagues-list");
    if (!root) return false;

    // 1) Abrir tab FAVORITOS (si existe). Si no existe, seguimos.
    const favTab = findTabButton("Favoritos") || findTabButton("Favorites");
    if (favTab) clickSafe(favTab);

    // 2) Marcar países permitidos como favoritos
    const allowed = new Set(ALLOWED_COUNTRIES.map((c) => normalize(c)));

    const countryRows = Array.from(root.querySelectorAll("li")).filter((li) => !!li.querySelector("img"));
    for (const row of countryRows) {
      const name = normalize(stripTrailingCount(row.textContent || ""));
      if (!name) continue;
      if (!allowed.has(name)) continue;
      ensureFavorited(row);
    }

    // 3) Para cada país permitido: expandir (click en el row) y marcar top ligas
    for (const country of ALLOWED_COUNTRIES) {
      const cKey = normalize(country);

      // encuentra fila del país
      const row = countryRows.find((r) => normalize(stripTrailingCount(r.textContent || "")) === cKey);
      if (!row) continue;

      // expandir
      clickSafe(row);

      // marcar ligas top (hasta 5)
      const wanted = (TOP_LEAGUES_BY_COUNTRY[country] || []).slice(0, 5).map(normalize);
      if (!wanted.length) continue;

      const leagueRows = getLeagueRowsUnderExpandedCountry(root);
      for (const leagueName of wanted) {
        const lr = leagueRows.find((li) => normalize(li.textContent || "").includes(leagueName));
        if (lr) ensureFavorited(lr);
      }
    }

    // 4) Volver a FAVORITOS para que el usuario vea solo lo marcado
    if (favTab) clickSafe(favTab);

    localStorage.setItem(LS_KEY, "1");
    return true;
  };

  // Reintentos con debounce, porque el widget renderiza async y refresca.
  let t = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => attempt(), 300);
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });

  // Primeras pasadas
  setTimeout(() => attempt(), 1200);
  setTimeout(() => attempt(), 2400);
  setTimeout(() => attempt(), 4200);
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
  // Filtra el panel central (Partidos) sin romper el widget:
  // - Solo ocultamos (display:none) bloques de liga fuera de allowlist.
  // - Además limitamos a máximo 5 ligas por país (priorizando ligas "grandes").
  if (window.__FV_gamesCountryFilterSetup) return;
  window.__FV_gamesCountryFilterSetup = true;

  const allowedCountries = new Set(ALLOWED_COUNTRIES.map((c) => c.toLowerCase()));
  const MAX_LEAGUES_PER_COUNTRY = 5;


  // Top leagues por país (match flexible por "includes").
  // Usamos TOP_LEAGUES_BY_COUNTRY para mantener una sola fuente de verdad.
  const TOP_LEAGUE_PATTERNS = (() => {
    const out = {};
    for (const [country, leagues] of Object.entries(TOP_LEAGUES_BY_COUNTRY || {})) {
      const key = (country || "").toLowerCase();
      out[key] = (leagues || []).map((x) => (x || "").toLowerCase());
    }
    return out;
  })();


  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const parseCountryLeague = (txt) => {
    const t = normalize(txt);
    // "Mexico : Liga MX"
    const m = t.match(/^([\p{L}\s-]{2,})\s*:\s*(.+)$/u);
    if (!m) return null;
    const country = normalize(m[1]);
    const league = normalize(m[2]);
    if (!country || !league) return null;
    if (country.length > 30) return null;
    if (/\d/.test(country)) return null;
    return { country, league };
  };

  const scoreLeague = (countryKey, leagueName) => {
    const list = TOP_LEAGUE_PATTERNS[countryKey] || [];
    const l = leagueName.toLowerCase();
    // score 0..N (más alto = mejor)
    for (let i = 0; i < list.length; i++) {
      if (l.includes(list[i])) return 100 - i; // preferimos el orden del array
    }
    return 0;
  };

  const filterGames = () => {
    const root = document.getElementById("games-list");
    if (!root) return;

    // Heurística: cada bloque de liga suele ser un <li> grande con header "Country : League"
    const blocks = Array.from(root.querySelectorAll(":scope > li, :scope > div")).filter((b) => {
      const t = normalize(b.textContent);
      return t.includes(":") && t.length < 220;
    });

    // Primero agrupamos por país para aplicar MAX 5
    const parsedBlocks = [];
    for (const b of blocks) {
      // buscar el primer texto con ":" dentro del bloque
      const headerEl =
        b.querySelector("button, a, strong, h1, h2, h3, h4, span, div") || b;
      const headerTxt = normalize(headerEl.textContent);
      const parsed = parseCountryLeague(headerTxt);
      if (!parsed) continue;
      parsedBlocks.push({ block: b, headerEl, ...parsed });
    }

    const perCountry = new Map();
    for (const item of parsedBlocks) {
      const cKey = item.country.toLowerCase();
      if (!perCountry.has(cKey)) perCountry.set(cKey, []);
      perCountry.get(cKey).push(item);
    }

    for (const [countryKey, items] of perCountry.entries()) {
      // País no permitido => ocultar todo
      if (!allowedCountries.has(countryKey)) {
        for (const it of items) {
          it.block.style.display = "none";
          it.block.setAttribute("data-fv-hidden-league", "1");
        }
        continue;
      }

      // País permitido => elegimos top 5 por score (y si empatan, por orden DOM)
      const scored = items
        .map((it, idx) => ({ it, idx, score: scoreLeague(countryKey, it.league) }))
        .sort((a, b) => (b.score - a.score) || (a.idx - b.idx));

      const keep = new Set(scored.slice(0, MAX_LEAGUES_PER_COUNTRY).map((x) => x.it.block));

      for (const it of items) {
        if (keep.has(it.block)) {
          if (it.block.getAttribute("data-fv-hidden-league") === "1") {
            it.block.style.display = "";
            it.block.removeAttribute("data-fv-hidden-league");
          }
        } else {
          it.block.style.display = "none";
          it.block.setAttribute("data-fv-hidden-league", "1");
        }
      }
    }
  };

  let t = null;
  const schedule = () => {
    if (t) clearTimeout(t);
    t = setTimeout(filterGames, 80);
  };

  const observer = new MutationObserver(() => schedule());
  observer.observe(document.body, { childList: true, subtree: true });

  filterGames();
  setTimeout(filterGames, 250);
  setTimeout(filterGames, 900);
}


function setupDefaultDetailSelection() {
  // Evita que el panel “Detalle” quede en World Cup 2022.
  // Estrategia segura:
  // 1) Esperar a que exista #games-list con ligas visibles (ya filtradas).
  // 2) Buscar una liga preferida (Champions / ligas top) dentro de #games-list.
  // 3) Clickear la PRIMERA fila de partido de esa liga (no solo el header), para forzar carga de detalle.
  //
  // IMPORTANTE: correr 1 vez por render/refresco (sin spamear clicks).
  if (window.__FV_defaultDetailSetup) return;
  window.__FV_defaultDetailSetup = true;

  const PREFERRED = [
    "UEFA Champions League",
    "Champions League",
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
    "Chile",
    "Mexico",
    "Brazil",
    "Argentina",
    "Colombia",
  ].map((x) => x.toLowerCase());

  const normalize = (s) =>
    (s || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const isWorldCupDetail = () => {
    const detail = document.getElementById("game-content") || document.body;
    const t = normalize(detail.textContent).toLowerCase();
    return t.includes("world : world cup") || t.includes("world cup");
  };

  const trySelect = () => {
    if (!isWorldCupDetail()) return false;

    const root = document.getElementById("games-list");
    if (!root) return false;

    const blocks = Array.from(root.querySelectorAll(":scope > li, :scope > div")).filter((b) => {
      if (b.style.display === "none") return false;
      const t = normalize(b.textContent);
      return t.includes(":") && t.length < 240;
    });

    // Buscar primer bloque que matchee preferidas
    for (const pref of PREFERRED) {
      const b = blocks.find((x) => normalize(x.textContent).toLowerCase().includes(pref));
      if (!b) continue;

      // Dentro del bloque, intenta encontrar una fila de partido clickeable
      const matchRow =
        b.querySelector("a, button, [role='button'], li, div") || null;

      // Preferimos algo que tenga dos equipos o un score; heurística por presencia de números o 'FIN'
      const candidates = Array.from(b.querySelectorAll("a, button, [role='button'], li, div"))
        .filter((el) => {
          const t = normalize(el.textContent);
          if (!t || t.length > 120) return false;
          return /\bFIN\b|\bFT\b|\d\s*-\s*\d/.test(t) || t.split(" ").length >= 2;
        });

      const clickable = candidates.find((el) => el !== b) || matchRow;
      if (!clickable) continue;

      try {
        clickable.click();
        return true;
      } catch (_) {
        // no-op
      }
    }

    return false;
  };

  // Debounce + varias pasadas porque el widget carga async y además refresca (data-refresh)
  let attempts = 0;
  const tick = () => {
    attempts += 1;
    if (attempts > 8) return;
    const ok = trySelect();
    if (!ok) setTimeout(tick, 450);
  };

  setTimeout(tick, 600);
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
          // Marcar favoritos por defecto y abrir tab FAVORITOS
          setupDefaultFavoritesBootstrap();
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
            <div className="mt-3 inline-flex items-center rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200 border border-emerald-500/30">
              Se sugiere elegir tus <span className="mx-1 font-semibold">5 ligas favoritas</span> para una mayor rapidez en la carga de estadísticas.
            </div>
          </div>
          <div className="text-xs text-white/50">Datos oficiales Factor Victoria</div>
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
          data-refresh="120"
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
