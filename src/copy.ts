// src/copy.ts
export const brand = {
  name: "Factor Victoria",
  payBanner: "Paga con Flow o Mercado Pago • hasta 6 cuotas*",
  colors: {
    primaryBg: "#0d1624",    // azul marino oscuro
    goldFrom: "#f7d14a",
    goldTo: "#e2b84e",
  },
  hero: {
    titleH1: "Convierte información en ventaja",
    subtitle:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
    cta: "Ver planes",
  },
};

export const plans = [
  {
    id: "m1",
    name: "Mensual",
    bullets: [
      "Ebook para principiantes",
      "Picks y análisis básicos diarios",
      "Simulador de ganancias incluido",
    ],
    priceCLP: 19990,
    priceText: "$19.990 / mes",
    badge: null,
  },
  {
    id: "g1",
    name: "Crecimiento",
    bullets: [
      "Todo del Básico",
      "Secciones extra (FAQ/Blog corto)",
      "Métricas iniciales",
    ],
    priceCLP: 44990,
    priceText: "$44.990 / plan",
    badge: "Recomendado",
  },
  {
    id: "a1",
    name: "Anual",
    bullets: [
      "Guía de estrategia PRO",
      "Informe premium mensual",
      "Cuotas potenciadas x50",
    ],
    priceCLP: 99990,
    priceText: "$99.990 / plan",
    badge: "Más popular",
  },
  {
    id: "pro",
    name: "PRO",
    bullets: [
      "Integraciones a medida",
      "Soporte prioritario",
      "Panel avanzado de métricas",
    ],
    priceCLP: 249990,
    priceText: "$249.990 / plan",
    badge: "Avanzado",
  },
];

export const simulator = {
  title: "Simula tus ganancias",
  placeholder: "Ingresa un monto a apostar",
  cards: [
    { label: "Mensual", x: 10, caption: "Cuotas x10" },
    { label: "3 meses", x: 20, caption: "Cuotas x20" },
    { label: "Anual", x: 50, caption: "Cuotas x50" },
  ],
  notes: [
    "Cuota segura de regalo: de 1.5 a 3 máximo (sobre el 95% de acierto en cada una por separado).",
    "Cuota generada: (x10 o cercana para no cometer errores).",
    "Probabilidad de acierto de cada una: ≈90% (sugerencia: sobre 85% por cada una hasta completar).",
    "Desfase del mercado (todas las membresías): detectar errores de cuota y aprovecharlos.",
  ],
};

export const comparator = {
  title: "Comparador de cuotas",
  searchPlaceholder: "Buscar (equipo/mercado/selección)",
  tiers: [
    { name: "X10", priceText: "$19.990", unlocked: true,  cta: "Incluido" },
    { name: "X20", priceText: "$44.990", unlocked: false, cta: "Mejorar" },
    { name: "X50", priceText: "$99.990", unlocked: false, cta: "Mejorar" },
  ],
  upsell: {
    title: "¿Estás listo para mejorar tus ganancias?",
    buttons: ["Cuota mejorada x20", "Cuota mejorada x50", "Cuota mejorada x100"],
  },
};

export const fixturesCopy = {
  title: "PARTIDOS",
  adminWarning: "TOKEN INTERNO (NO PUBLICAR EN PRODUCCIÓN)",
  tableHead: ["HORA", "LOCAL", "VISITA", "LIGA", "PAÍS", "ESTADIO"],
  dateLabel: "BUSCAR (EQUIPO/LIGA/PAÍS)",
};

export const faq = [
  { q: "¿Cómo pago?", a: "Puedes pagar con Flow o Mercado Pago en hasta 6 cuotas." },
  { q: "¿Cuándo veré resultados?", a: "Nos enfocamos en procesos con criterio y control de riesgo." },
];

export const footer = {
  copyright: "© 2025 Factor Victoria",
  heroImage: "/hero-players.png", // en /public
};
