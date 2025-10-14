// src/copy.ts
const copy = {
  marca: {
    subclaim:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
  },
  ctas: {
    verPlanes: "Ver planes",
    comprar: "Comprar",
  },
  home: {
    simuladorTitulo: "Simula tus ganancias",
    simuladorSub: "Ingresa tu monto y calcula cuánto podrías ganar según tu plan.",
  },
  // IMPORTANTÍSIMO: $19.990 vuelve y queda primero
  planes: [
    {
      id: "x10",
      title: "Mensual",
      priceCLP: "$19.990",
      freq: "",
      note: "",
      badge: "",
      bullets: [
        "Ebook para principiantes",
        "Picks análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuotas x1.5 de regalo",
        "Cuotas potenciadas x10",
        "100 cupos disponibles",
      ],
    },
    {
      id: "x20",
      title: "Trimestral",
      priceCLP: "$44.990",
      freq: "",
      note: "+1 Mes de Regalo 🎁",
      badge: "",
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
      freq: "Anual",
      note: "",
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
      freq: "Vitalicio",
      note: "",
      badge: "",
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
};

export default copy;
