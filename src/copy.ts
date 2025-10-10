// src/copy.ts
type Plan = { name: string; price: string; per?: string; bullets: string[]; cta: string; tag?: string };
type Copy = {
  brand: { name: string; tagline: string };
  hero: { badge: string; title: string; subtitle: string; cta: string };
  plans: Plan[];
  simulator: { title: string; subtitle: string; placeholder: string; tiers: { label: string; mult: number }[]; notes: string[] };
  footer: { legal: string };
};

const copy: Copy = {
  brand: { name: "Factor Victoria", tagline: "Convierte información en ventaja" },

  hero: {
    badge: "Paga con Flow o Mercado Pago • hasta 6 cuotas*",
    title: "Convierte información en ventaja",
    subtitle: "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
    cta: "Ver planes",
  },

  // CLP tal como pediste
  plans: [
    { name: "Mensual",   price: "$19.990", per: "/ mes", bullets: ["Ebook para principiantes", "Picks y análisis básicos diarios", "Simulador de ganancias incluido"], cta: "Mejorar" },
    { name: "3 meses",   price: "$44.990", per: "/ plan", bullets: ["Guía de estrategia y gestión de banca", "Picks y análisis ampliados", "Alertas clave de partido", "Cuotas potenciadas x20", "50 cupos disponibles"], cta: "Mejorar", tag: "Recomendado" },
    { name: "Anual",     price: "$99.990", per: "/ plan", bullets: ["Guía de estrategia PRO", "Informe premium mensual", "Cuotas potenciadas x50", "30 cupos disponibles"], cta: "Mejorar", tag: "Más popular" },
    { name: "PRO+",      price: "$249.990", per: "/ plan", bullets: ["Todo lo anterior", "Acceso prioritario y soporte 1:1", "Features beta y límites extendidos"], cta: "Hablar con nosotros" },
  ],

  simulator: {
    title: "Simula tus ganancias",
    subtitle: "Ingresa un monto a apostar y descubre cuánto podrías ganar.",
    placeholder: "Ingresa monto en CLP",
    // este orden debe coincidir con lo visual que tienes (x10, x20, x50)
    tiers: [
      { label: "Mensual", mult: 10 },
      { label: "3 meses", mult: 20 },
      { label: "Anual", mult: 50 },
    ],
    notes: [
      "Cuota segura de regalo: de 1.5 a 3 máximo (sobre el 95% de acierto por cada una por separado).",
      "Cuota generada: (x10 o cercana para no cometer errores).",
      "Probabilidad de acierto de cada una: ≥ 90% (ejemplo, sobre 85% por cada una hasta completar).",
      "Cuota desfase del mercado (para todas las membresías).",
    ],
  },

  footer: { legal: "© 2025 Factor Victoria" },
};

export default copy;
