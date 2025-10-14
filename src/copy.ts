// src/copy.ts (fragmento clave)
type Plan = {
  id: string;
  title: string;
  priceCLP: string;
  freq?: string;   // texto junto al precio (p.ej. / Anual, / Vitalicio)
  note?: string;   // leyenda pequeña (p.ej. +1 Mes de Regalo 🎁)
  badge?: string;  // “Más popular”
  bullets: string[];
};

const copy: {
  marca: { subclaim: string };
  ctas: { verPlanes: string; comprar: string };
  planes: Plan[];
  home: {
    simuladorTitulo: string;
    simuladorSub: string;
    imagenCierreAlt: string;
    acercaTitulo: string;
    acercaTexto: string;
  };
} = {
  marca: {
    subclaim:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
  },
  ctas: {
    verPlanes: "Ver planes",
    comprar: "Comprar",
  },

  planes: [
    {
      id: "x20",
      title: "Trimestral",
      priceCLP: "$44.990",
      note: "+1 Mes de Regalo 🎁",
      bullets: [
        "Guía de estrategia y gestión de banca",
        "1 Estrategia VIP incluida",
        "Cuotas x1.5 a x3 de regalo",
        "Picks análisis ampliados",
        "Simulador de ganancias incluido",
        "Alertas claves de partidos",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ],
    },
    {
      id: "x50",
      title: "Anual",
      priceCLP: "$99.990",
      freq: "/ Anual",
      badge: "Más popular",
      bullets: [
        "Guía de estrategia PRO",
        "2 Estrategias VIP incluidas",
        "Cuotas x1.5 a x3 de regalo",
        "Cuota Corrección del mercado",
        "Picks análisis ampliados",
        "Simulador de ganancias incluido",
        "Alertas claves de partidos",
        "Cuotas potenciadas x50",
        "50 cupos disponibles",
      ],
    },
    {
      id: "x100",
      title: "Vitalicio",
      priceCLP: "$249.990",
      freq: "/ Vitalicio",
      bullets: [
        "Guía de estrategia PRO",
        "Alertas claves de partidos al correo",
        "2 Estrategias VIP incluidas",
        "Cuotas x1.5 a x3 de regalo",
        "Corrección del mercado VIP",
        "Picks análisis PRO",
        "Simulador de ganancias incluido",
        "Informe mensual personalizado",
        "Cuotas potenciadas x100",
        "Solo 20 cupos disponibles",
      ],
    },
  ],

  home: {
    simuladorTitulo: "Simula tus ganancias",
    simuladorSub:
      "Ingresa un monto y revisa cuánto podrías ganar con cada membresía.",
    imagenCierreAlt: "Jugadores saliendo del notebook",
    acercaTitulo: "Convierte información en ventaja",
    acercaTexto:
      "Nuestra IA analiza estadísticas, tendencias en tiempo real y señales del mercado para detectar cuotas con verdadero valor. Tú eliges el plan; nosotros te entregamos las herramientas que marcan la diferencia: picks precisos, simuladores avanzados y estrategias inteligentes para apostar con ventaja.\n\nMientras más alto tu plan, mayor tu poder de decisión: accede a cuotas potenciadas, alertas exclusivas y estrategias PRO diseñadas para elevar tu expectativa de ganancia.",
  },
};

export default copy;
