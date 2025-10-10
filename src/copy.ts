// src/copy.ts
// Tipado opcional simple. Si te da lata, puedes eliminar estas dos líneas.
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
        "Cuota segura (1.5 a 3)",
        "Desfase del mercado",
        "Simulador de ganancias incluido",
      ],
    },
    {
      id: "x20",
      title: "Crecimiento",
      priceCLP: "$44.990",
      note: "≈ $14.997 / mes",
      bullets: [
        "Todo lo del Mensual",
        "Guía de estrategia y gestión de banca",
        "Picks y análisis ampliados",
        "Alertas clave de partido (cuando las actives)",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
        "Cuota segura (1.5 a 3) incluida",
        "Desfase del mercado incluido",
      ],
    },
    {
      id: "x50",
      title: "Anual",
      priceCLP: "$99.990",
      note: "≈ $8.333 / mes",
      badge: "Más popular",
      bullets: [
        "Todo lo de Crecimiento",
        "Guía de estrategia PRO",
        "Informe premium mensual",
        "Cuotas potenciadas x50",
        "Estrategia doble oportunidad",
        "Estrategia supera a la casa",
        "Cuota segura (1.5 a 3) incluida",
        "Desfase del mercado incluido",
        "30 cupos disponibles",
      ],
    },
    {
      id: "x100",
      title: "Vitalicia",
      priceCLP: "$249.990",
      badge: "Membresía vitalicia",
      bullets: [
        "Todo lo del Anual",
        "Cuotas potenciadas x100",
        "Acceso de por vida a actualizaciones",
        "Cuota segura (1.5 a 3) incluida",
        "Desfase del mercado incluido",
        // Quitar “soporte 1 a 1” y “límites extendidos” como pediste
      ],
    },
  ],

  home: {
    simuladorTitulo: "Simula tus ganancias",
    simuladorSub:
      "Ingresa un monto y revisa cuánto podrías ganar con cada membresía.",
    imagenCierreAlt: "Jugadores saliendo del notebook",
  },
};

export default copy;
