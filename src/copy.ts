// src/copy.ts
type Plan = {
  id: "x10" | "x20" | "x50" | "x100";
  nombre: string;
  precioCLP: number;
  periodicidad: "mensual" | "único" | "anual" | "vitalicia";
  bullets: string[];
  destacado?: boolean;
  multiplo: number;
};

const copy = {
  marca: {
    nombre: "Factor Victoria",
    claim: "Convierte información en ventaja",
    subclaim:
      "Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.",
    bannerPago: "Paga con Flow o Mercado Pago · hasta 6 cuotas*",
  },

  nav: {
    inicio: "Inicio",
    comparador: "Comparador",
    partidos: "Partidos",
    login: "Iniciar sesión",
  },

  ctas: {
    verPlanes: "Ver planes",
    comprar: "Comprar",
  },

  planes: <Plan[]>[
    {
      id: "x10",
      nombre: "Mensual",
      precioCLP: 19990,
      periodicidad: "mensual",
      multiplo: 10,
      bullets: [
        "Ebook para principiantes",
        "Picks y análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuota segura de regalo (1.5 a 3)",
        "Desfase del mercado (básico)",
      ],
    },
    {
      id: "x20",
      nombre: "Trimestral",
      precioCLP: 44990,
      periodicidad: "único",
      multiplo: 20,
      destacado: true,
      bullets: [
        "Todo lo del Mensual",
        "Guía de estrategia y gestión de banca",
        "Picks y análisis ampliados",
        "Alertas clave de partido (cuando las actives)",
        "Cuotas potenciadas x20",
        "Cuota segura de regalo (1.5 a 3)",
        "Desfase del mercado",
        "50 cupos disponibles",
      ],
    },
    {
      id: "x50",
      nombre: "Anual",
      precioCLP: 99990,
      periodicidad: "anual",
      multiplo: 50,
      bullets: [
        "Todo lo del Trimestral",
        "Guía de estrategia PRO",
        "Informe premium mensual",
        "Cuotas potenciadas x50",
        "Cuota segura de regalo (1.5 a 3)",
        "Desfase del mercado",
        "Estrategia Doble Oportunidad",
        "Estrategia Supera a la Casa",
        "30 cupos disponibles",
      ],
    },
    {
      id: "x100",
      nombre: "Premium",
      precioCLP: 249990,
      periodicidad: "vitalicia",
      multiplo: 100,
      bullets: [
        "Todo lo del Anual",
        "Acceso anticipado a herramientas",
        "Membresía vitalicia",
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
