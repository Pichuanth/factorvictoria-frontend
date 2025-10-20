// src/lib/prompt.js

// Texto que podremos mandar a la IA (cuando conectemos la API) según plan
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
  // (si quieres, luego agregamos variantes por plan)
};

// Títulos visibles en UI (como me pediste)
export const SECTION_TITLES = {
  regalo: 'Cuota segura (Regalo) 1.5–3 · 90–95% acierto',
  xPlan: 'Cuota generada',
  arbitros: 'Árbitros más tarjeteros',
  desfase: 'Desfase del mercado',
};

// Mapeo de multiplicador por plan (usa los mismos rangos que auth)
export const PLAN_MULTIPLIER = {
  0: 10,   // Básico $19.990  => x10
  10: 20,  // Trimestral      => x20
  50: 50,  // Anual           => x50
  100: 100 // Vitalicio       => x100
};
