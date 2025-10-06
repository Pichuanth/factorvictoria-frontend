// src/components/Pricing.jsx
export default function Pricing() {
  const tiers = [
    {
      title: "Mensual",
      price: "$19.990",
      note: "Ideal para probar",
      quota: "Cuotas x10",
      cta: "Elegir Mensual",
      features: [
        "Ebook Principiantes",
        "Guía Tecnicismo y cómo apostar de manera profesional",
        "Cuotas x 10",
        "100 cupos disponibles",
      ],
    },
    {
      title: "3 meses",
      price: "$44.990",
      note: "≈ $14.997 / mes",
      quota: "Cuotas x20",
      cta: "Elegir 3 meses",
      features: [
        "Guía Tecnicismo y cómo apostar de manera profesional",
        "Cuotas x 20",
        "50 cupos disponibles",
      ],
    },
    {
      title: "Anual",
      price: "$99.990",
      note: "≈ $8.333 / mes + Pelota de regalo",
      quota: "Cuotas x50",
      cta: "Elegir Anual",
      highlight: true,
      features: [
        "Guía Tecnicismo",
        "Pelota profesional de regalo",
        "Análisis e informe premium mensual",
        "Cuotas x 100",
        "30 cupos disponibles",
      ],
    },
    {
      title: "Vitalicio",
      price: "$249.990",
      note: "Acceso de por vida + Pelota + Trofeo",
      quota: "Cuotas x100",
      cta: "Elegir Vitalicio",
      features: [
        "Guía Tecnicismo y cómo apostar de manera profesional",
        "Pelota profesional de regalo",
        "Trofeo copa del mundo (edición limitada)",
        "Análisis e informe premium mensual",
        "Cuotas x 200",
        "15 cupos disponibles",
      ],
    },
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          Planes y Membresías
        </h2>
        <p className="text-center text-slate-300 mb-10">
          Escoge el plan que mejor se adapta a tu estrategia
        </p>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((t) => (
            <div
              key={t.title}
              className={`rounded-2xl p-6 shadow-xl border ${
                t.highlight
                  ? "border-indigo-500/50 bg-indigo-950/30"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t.title}</h3>
                <span className="text-xs text-indigo-300">{t.quota}</span>
              </div>

              <div className="mt-4">
                <div className="text-3xl font-extrabold">{t.price}</div>
                {t.note && (
                  <div className="text-xs text-slate-400 mt-1">{t.note}</div>
                )}
              </div>

              <button
                className={`mt-5 w-full py-2.5 rounded-xl font-medium transition
                ${t.highlight ? "bg-indigo-500 hover:bg-indigo-400 text-white" :
                "bg-white/10 hover:bg-white/20"} `}
              >
                {t.cta}
              </button>

              <ul className="mt-6 space-y-2 text-sm text-slate-300">
                {t.features.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400/80 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
