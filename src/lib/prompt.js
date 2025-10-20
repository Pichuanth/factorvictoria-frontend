// src/lib/prompt.js

// Mapa de multiplicadores por plan
export const PLAN_MULTIPLIER = {
  mensual: 10,         // $19.990
  trimestral: 20,      // $44.990
  anual: 50,           // $99.990
  vitalicio: 100       // $249.990
};

/**
 * buildPrompt: devuelve el prompt para el generador de cuotas
 * @param {{date:string, query:string, plan:'mensual'|'trimestral'|'anual'|'vitalicio', country?:string}} opts
 * @returns {string}
 */
export function buildPrompt({ date, query, plan, country = "" }) {
  const multiplier = PLAN_MULTIPLIER[plan] ?? 10;

  return `
Eres un generador de selecciones de apuestas deportivas orientado a valor esperado positivo (EV+). 
Usa contexto futbolístico general (estadísticas recientes, tendencia, estilos) y compón respuestas 
en ESPAÑOL NEUTRO. NO inventes datos concretos de un feed; si no tienes seguridad, marca “nota: revisar”.

Contexto del usuario:
- Fecha objetivo: ${date}
- Filtros libres: ${query || "(vacío)"}
- País preferente (opcional): ${country || "(no especificado)"}
- Plan del usuario: ${plan.toUpperCase()}
- Multiplicador objetivo por plan (principal): ${multiplier}x
- Rango de “cuota regalo”: entre 1.5 y 3.0 (alta probabilidad)
- Mostrar además: “Árbitros más tarjeteros” y “Desfase del mercado”
- Número objetivo por sección:
  • Regalo 1.5–3: 1–2 combinaciones simples o dobles
  • x${multiplier}: 1 combinada (3–6 selecciones según valor)
  • Árbitros: 2–3 partidos con media alta de tarjetas y breve razón
  • Desfase: 2 partidos con hipótesis de mispricing y breve razón

Reglas de construcción:
1) Evita ligas/partidos inexistentes; si el filtro es demasiado estrecho y no hay nada, devuelve arrays vacíos.
2) Prefiere mercados comunes: 1X2, Doble Oportunidad, Over/Under goles (1.5/2.5), Ambos Marcan, Hándicap 0, 
   tarjetas totales (cuando aplique).
3) Explica en “rationale” el porqué (racha, xG aproximado, estilo, localía, bajas probables, tendencia arbitral).
4) Mantén riesgo escalonado: “regalo” conservador; “x${multiplier}” mezcla valor y correlaciones bajas.
5) NUNCA uses lenguaje de garantía. Señala “probabilidad_aprox” como estimación (0.0–1.0).
6) Formato de salida: SOLO JSON con el siguiente esquema.

Devuelve EXACTAMENTE este JSON:

{
  "meta": {
    "fecha": "${date}",
    "filtro": "${query}",
    "plan": "${plan}",
    "moneda": "CLP",
    "nota": "Estimaciones orientativas. Verifica disponibilidad en tu casa de apuestas."
  },
  "regalo": [
    {
      "titulo": "Doble oportunidad o línea conservadora",
      "legs": [
        { "partido": "EquipoA vs EquipoB", "mercado": "Doble Oportunidad 1X", "cuota": 1.55 }
      ],
      "cuota_total": 1.55,
      "probabilidad_aprox": 0.90,
      "rationale": "Local sólido + invicto reciente; visitante con baja producción ofensiva."
    }
  ],
  "x${multiplier}": {
    "legs": [
      { "partido": "EquipoC vs EquipoD", "mercado": "Over 1.5 goles", "cuota": 1.30 },
      { "partido": "EquipoE vs EquipoF", "mercado": "1X2: Local", "cuota": 1.80 },
      { "partido": "EquipoG vs EquipoH", "mercado": "Ambos marcan: Sí", "cuota": 1.70 }
    ],
    "cuota_total_aprox": ${multiplier}.0,
    "rationale": "Selecciones con valor histórico y baja correlación entre ligas."
  },
  "arbitros_tarjeteros": [
    {
      "partido": "EquipoI vs EquipoJ",
      "arbitro": "Árbitro X",
      "media_tarjetas_estimada": 5.8,
      "mercado_sugerido": "Over 4.5 tarjetas",
      "rationale": "Árbitro con tendencia over + clásico con fricción."
    }
  ],
  "desfase_mercado": [
    {
      "partido": "EquipoK vs EquipoL",
      "hipotesis": "Línea de goles subvalorada",
      "seleccion": "Over 2.0 asiático",
      "cuota": 1.95,
      "rationale": "xG recientes altos y defensas con bajas; mercado lento en ajustar."
    }
  ]
}
`.trim();
}
