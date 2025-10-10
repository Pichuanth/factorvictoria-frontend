type Plan = {
  id: string;
  title: string;
  priceCLP: string;
  freq?: string;
  note?: string;
  badge?: string;
  bullets: string[];
};

const copy: {
  marca: { subclaim: string };
  ctas: { verPlanes: string; comprar: string };
  planes: Plan[];
  home: { simuladorTitulo: string; simuladorSub: string; imagenCierreAlt: string };
} = {
  marca: {
    subclaim: "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
  },
  ctas: {
    verPlanes: "Ver planes",
    comprar: "Comprar",
  },
  planes: [
    {
      id: "x10",
      title: "Mensual",
      priceCLP: "$19.990",
      freq: "/ mes",
      bullets: [
        "Cuotas x10",
        "Cuota segura (1.5 a 3) de regalo",
        "Desfase del mercado de regalo",
      ],
    },
    {
      id: "x20",
      title: "X20",
      priceCLP: "$44.990",
      bullets: [
        "Todo lo de X10",
        "Cuotas potenciadas x20",
        "Cuota segura de regalo",
        "Desfase del mercado de regalo",
      ],
    },
    {
      id: "x50",
      title: "X50",
      priceCLP: "$99.990",
      bullets: [
        "Todo lo de $44.990 (X20)",
        "Estrategia PRO",
        "Doble oportunidad",
        "Supera a la casa",
        "Cuota segura de regalo",
        "Desfase del mercado de regalo",
      ],
    },
    {
      id: "x100",
      title: "X100",
      priceCLP: "$249.990",
      note: "Membresía vitalicia",
      bullets: [
        "Todo lo de X50",
        "Membresía vitalicia",
        "Cuota segura de regalo",
        "Desfase del mercado de regalo",
      ],
    },
  ],
  home: {
    simuladorTitulo: "Simula tus ganancias",
    simuladorSub: "Ingresa un monto y revisa cuánto podrías ganar con cada membresía.",
    imagenCierreAlt: "Jugadores saliendo del notebook",
  },
};

export default copy;
