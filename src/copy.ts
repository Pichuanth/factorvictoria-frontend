// src/copy.ts
type Plan = {
  id: string;
  title: string;
  priceCLP: string;
  freq?: string;
  badge?: string;
  bullets: string[];
  multiplo: number;
  note?: string;
};

const copy = {
  marca: {
    subclaim: "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
  },
  ctas: {
    verPlanes: "Ver planes",
    comprar: "Comprar",
  },
  home: {
    simuladorTitulo: "Simula tus ganancias",
    simuladorSub: "Ingresa un monto y revisa cuánto podrías ganar con cada membresía.",
    imagenCierreAlt: "Jugadores saliendo del notebook",
  },
  planes: <Plan[]>[
    {
      id: "x10",
      title: "Mensual",
      priceCLP: "$19.990",
      freq: "/ mes",
      bullets: ["Cuotas x10", "Cuota segura (1.5 a 3)", "Desfase del mercado"],
      multiplo: 10,
    },
    {
      id: "x20",
      title: "X20",
      priceCLP: "$44.990",
      bullets: [
        "Todo lo del plan X10",
        "Cuotas potenciadas x20",
        "Estrategia PRO",
      ],
      multiplo: 20,
      note: "Mejora",
    },
    {
      id: "x50",
      title: "X50",
      priceCLP: "$99.990",
      bullets: [
        "Todo lo del plan X20",
        "Estrategia Doble oportunidad",
        "Estrategia Supera a la casa",
      ],
      multiplo: 50,
    },
    {
      id: "x100",
      title: "X100",
      priceCLP: "$249.990",
      bullets: [
        "Todo lo del plan X50",
        "Membresía vitalicia",
      ],
      multiplo: 100,
      badge: "Top",
    },
  ],
};

export default copy;
