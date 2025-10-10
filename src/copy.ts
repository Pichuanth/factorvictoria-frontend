// src/copy.ts
export type Plan = {
  key: string;
  name: string;
  priceCLP: number;
  label: string;        // ej: "Cuotas x10"
  multiplier: number;   // para el simulador
  highlight?: boolean;  // “Más popular”
  note?: string;        // texto chico bajo el precio
  bullets: string[];
};

export const copy = {
  brand: {
    name: "Factor Victoria",
    badge: "Paga con Flow o Mercado Pago • hasta 6 cuotas*",
  },
  hero: {
    title: "Convierte información en ventaja",
    subtitle:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
    ctaPrimary: "Ver planes",
  },
  // planes en pesos chilenos
  plans: <Plan[]>[
    {
      key: "pro-100",
      name: "Mensual",
      priceCLP: 19990,
      label: "Cuotas x10",
      multiplier: 10,
      note: "Ideal para probar",
      bullets: [
        "Ebook para principiantes",
        "Picks y análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuotas potenciadas x10",
        "100 cupos disponibles",
      ],
    },
    {
      key: "pro-45",
      name: "3 meses",
      priceCLP: 44990,
      label: "Cuotas x20",
      multiplier: 20,
      note: "≈ $14.997 / mes",
      bullets: [
        "Guía de estrategia y gestión de banca",
        "Picks y análisis ampliados",
        "Alertas clave de partido (cuando las actives)",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ],
    },
    {
      key: "pro-250",
      name: "Anual",
      priceCLP: 99990,
      label: "Cuotas x50",
      multiplier: 50,
      highlight: true,
      note: "≈ $8.333 / mes",
      bullets: [
        "Guía de estrategia PRO",
        "Informe premium mensual",
        "Cuotas potenciadas x50",
        "30 cupos disponibles",
      ],
    },
    {
      key: "lifetime",
      name: "Vitalicio",
      priceCLP: 249990,
      label: "Cuotas x100",
      multiplier: 100,
      note: "Acceso de por vida",
      bullets: [
        "Acceso de por vida a todas las mejoras",
        "Informe premium mensual",
        "Cuotas potenciadas x100",
        "15 cupos disponibles",
      ],
    },
  ],
  simulator: {
    // monto inicial que aparece en el input del simulador (puedes cambiarlo)
    defaultStake: 10000,
    stakeLabel: "Ingresa un monto a apostar y descubre cuánto podrías ganar.",
  },
  faq: [
    {
      q: "¿Las ganancias están garantizadas?",
      a: "No. Ofrecemos datos, estrategia y herramientas. Las apuestas siempre conllevan riesgo.",
    },
    {
      q: "¿Cómo funcionan las cuotas potenciadas?",
      a: "Mediante análisis, combinaciones y alertas, buscamos cuotas con mayor valor esperado.",
    },
    {
      q: "¿Puedo pagar en cuotas?",
      a: "Sí, con Flow o Mercado Pago (hasta 6 cuotas, sujeto al emisor).",
    },
  ],
  contact: {
    title: "¿Dudas? Hablemos",
    subtitle: "Escríbenos y te ayudamos a elegir el plan ideal.",
    cta: "Hablar con nosotros",
  },
} as const;
