// src/lib/prompt.js

export const PROMPTS = {
  vitalicio: `
Eres un generador de selecciones de apuestas deportivas.
Devuelve SIEMPRE un JSON con cuatro secciones:
- "regalo": una cuota segura x1.5–x3 con >90% de acierto.
- "xPlan": una combinada cuyo total respete el multiplicador del plan (x100 en vitalicio).
- "arbitros": 2–3 ligas con árbitros más tarjeteros y breve motivo.
- "desfase": 1–2 picks con posible error de mercado y motivo.
Formato de salida:
{
 "regalo":[{ "partido":"...", "mercado":"...", "cuota":1.85, "motivo":"..." }],
 "xPlan":[{ "partido":"...", "mercado":"...", "cuota":1.35 }, ...],
 "arbitros":[{ "liga":"...", "arbitro":"...", "promTarjetas": "..." }],
 "desfase":[{ "partido":"...", "mercado":"...", "cuota":2.10, "motivo":"..." }]
}`,
};

export const SECTION_TITLES = {
  regalo: 'Cuota segura (Regalo) 1.5–3 · 90–95% acierto',
  xPlan: 'Cuota generada',
  arbitros: 'Árbitros más tarjeteros',
  desfase: 'Cuota desfase del mercado',   // <-- nuevo texto
};

export const PLAN_MULTIPLIER = {
  0: 10,    // Básico
  10: 20,   // Trimestral
  50: 50,   // Anual
  100: 100, // Vitalicio
};
