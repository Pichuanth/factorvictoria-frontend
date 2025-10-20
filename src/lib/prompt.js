// src/lib/prompt.js

// Texto para IA / futuras integraciones: puedes editar libremente.
export const PROMPTS = {
  vitalicio: `
Eres un generador de selecciones de apuestas deportivas. 
Debes proponer cuotas con alto valor esperado, basadas en estadísticas y señales de mercado.
Devuelve siempre un JSON con estas secciones:
- regalo: una cuota segura x1.5–x3
- xPlan: una combinada conforme al multiplicador del plan
- arbitros: 2-3 ligas con árbitros muy tarjeteros y breve justificación
- desfase: 1-2 picks con posible error de mercado y motivo
`,
};

// Títulos visibles en la UI del Comparador (según lo que pediste)
export const SECTION_TITLES = {
  regalo: "Cuota segura (Regalo) x1.5 a x3 · 90–95% de acierto",
  xPlan: "Cuota Generada",
  arbitros: "Árbitros más tarjeteros",
  desfase: "Desfase del mercado",
};

// Multiplicador por plan (PLAN_RANK viene de lib/auth)
export const PLAN_MULTIPLIER = {
  0: 10,  // Básico $19.990 → x10
  1: 20,  // Trimestral $44.990 → x20
  2: 50,  // Anual $99.990 → x50
  3: 100, // Vitalicio $249.990 → x100
};
