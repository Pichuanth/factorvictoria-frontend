// src/copy.ts
export type Plan = {
  id: string;
  name: string;
  price: number;     // CLP sin puntos
  badge?: "Recomendado" | "Más popular" | "Nuevo";
  bullets: string[];
  cta: string;       // texto botón
  includedSimulator: boolean; // simulador visible en este plan
  locked?: boolean;  // para pintar "Mejorar" / candado
};

const currencyCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

const copy = {
  brand: "Factor Victoria",
  hero: {
    kicker: "Paga con Flow o Mercado Pago • hasta 6 cuotas*",
    title: "Convierte información en ventaja",
    subtitle:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
    primaryCta: "Ver planes",
  },

  why: {
    title: "¿Por qué Factor Victoria?",
    items: [
      { n: "1", title: "Setup veloz", text: "Arrancamos con un MVP que valida sin esperar meses." },
      { n: "2", title: "Diseño claro", text: "Interfaz limpia y enfocada en conversión." },
      { n: "3", title: "Data que suma", text: "Comparador, simulador y alertas orientadas a ROI." },
    ],
  },

  // ====== PLANES ======
  plans: [
    {
      id: "x10",
      name: "Mensual",
      price: 19990,
      badge: undefined,
      bullets: [
        "Ebook para principiantes",
        "Picks y análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuotas objetivo x10",
        "15 cupos disponibles",
      ],
      cta: "Empezar",
      includedSimulator: true,
      locked: false,
    },
    {
      id: "x20",
      name: "3 meses",
      price: 44990,
      badge: "Recomendado",
      bullets: [
        "Guía de estrategia y gestión de banca",
        "Picks y análisis ampliados",
        "Alertas clave de partido",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ],
      cta: "Mejorar",
      includedSimulator: true,
      locked: true,
    },
    {
      id: "x50",
      name: "Anual",
      price: 99990,
      badge: "Más popular",
      bullets: [
        "Guía de estrategia PRO",
        "Informe premium mensual",
        "Cuotas potenciadas x50",
        "30 cupos disponibles",
      ],
      cta: "Mejorar",
      includedSimulator: true,
      locked: true,
    },
    {
      id: "x100",
      name: "PRO+",
      price: 249990,
      badge: "Nuevo",
      bullets: [
        "Acceso a research avanzado",
        "Automatizaciones y reportes",
        "Cuotas objetivo x100",
        "Cupos limitados",
      ],
      cta: "Hablar con nosotros",
      includedSimulator: true,
      locked: true,
    },
  ] as Plan[],

  // ====== COMPARADOR (landing / upsell) ======
  comparator: {
    header: "Comparador de cuotas",
    searchPlaceholder: "Buscar (equipo/mercado/selección)",
    tiers: [
      { id: "x10", title: "X10", price: currencyCLP(19990), included: true, locked: false },
      { id: "x20", title: "X20", price: currencyCLP(44990), included: false, locked: true },
      { id: "x50", title: "X50", price: currencyCLP(99990), included: false, locked: true },
      { id: "x100", title: "X100", price: currencyCLP(249990), included: false, locked: true },
    ],
    ctas: { included: "Incluido", upgrade: "Mejorar" },
  },

  // ====== SIMULADOR (visible en todos los planes) ======
  simulator: {
    title: "Simula tus ganancias",
    placeholder: "Ingresa un monto a apostar",
    rows: [
      { id: "x10", label: "Mensual", times: 10 },
      { id: "x20", label: "3 meses", times: 20 },
      { id: "x50", label: "Anual", times: 50 },
      { id: "x100", label: "PRO+", times: 100 },
    ],
    notes: [
      "La cuota segura de regalo: de 1.5 a 3 máximo (≈95% de acierto por cada una por separado).",
      "La cuota generada apunta a x10 o cercana para no cometer errores.",
      "Probabilidad objetivo por selección: ≥ 85%.",
      "Incluye bloque de desfase del mercado (todas las membresías).",
    ],
  },

  // ====== FAQ ======
  faq: [
    { q: "¿Cómo pago?", a: "Aceptamos Flow y Mercado Pago. Habilitamos pago en cuotas." },
    { q: "¿Reembolsos?", a: "Si no te sirve en 7 días, contáctanos y lo vemos caso a caso." },
    { q: "¿El simulador está en todos los planes?", a: "Sí, el simulador está incluido en todas las membresías." },
  ],

  currencyCLP,
};

export default copy;
