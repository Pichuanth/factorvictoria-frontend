// src/copy.ts
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
    subclaim:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
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
        "Ebook para principiantes",
        "Análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuota segura de regalo (1.5 a 3)",
        "Desfase del mercado (búsqueda de errores)",
      ],
    },
    {
      id: "x20",
      title: "Crecimiento",
      priceCLP: "$44.990",
      note: "≈ $14.997 / mes",
      bullets: [
        "Todo lo del plan Mensual",
        "Guía de estrategia y gestión de banca",
        "Picks y análisis ampliados",
        "Alertas clave de partido (cuando las actives)",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ],
    },
    {
      id: "x50",
      title: "Anual",
      priceCLP: "$99.990",
      note: "≈ $8.333 / mes",
      bullets: [
        "TODO lo del plan de $44.990",
        "Guía de estrategia PRO",
        "Informe premium mensual",
        "Estrategia Doble oportunidad",
        "Estrategia “Supera a la casa”",
        "Cuotas potenciadas x50",
        "30 cupos disponibles",
      ],
    },
    {
      id: "x100",
      title: "X100",
      priceCLP: "$249.990",
      badge: "Más potente",
      bullets: [
        "Membresía vitalicia",
        "TODO lo anterior incluido",
        "Acceso prioritario a nuevas funciones",
        "Cuotas potenciadas x100",
      ],
    },
  ],
  home: {
    simuladorTitulo: "Simula tus ganancias",
    simuladorSub:
      "Ingresa un monto a apostar y descubre cuánto podrías ganar con cada membresía.",
    imagenCierreAlt: "Jugadores saliendo del notebook",
  },
};

export default copy;
