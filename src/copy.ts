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
    simuladorSub:
      "Ingresa un monto y revisa cuánto podrías ganar con cada membresía.",
    imagenCierreAlt: "Jugadores saliendo del notebook",
  },
  planes: [
    {
      id: "x10",
      title: "Mensual",
      priceCLP: "$19.990",
      freq: "/ mes",
      multiplo: 10,
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
      title: "Mensual",
      priceCLP: "$44.990",
      freq: "/ mes",
      multiplo: 20,
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
      title: "Mensual (El más popular)",
      priceCLP: "$99.990",
      freq: "/ mes",
      multiplo: 50,
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
      multiplo: 100,
      bullets: [
        "Vitalicio",
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
