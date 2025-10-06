import React, { useState } from "react";

export default function LandingPage() {
  const [amount, setAmount] = useState(10000);

  const plans = [
    { key: "pro-100", name: "Mensual", price: 19990, multiplier: 10, label: "Cuotas x10",
      note: "Ideal para probar",
      bullets: [
        "Ebook para principiantes",
        "Picks y análisis básicos diarios",
        "Simulador de ganancias incluido",
        "Cuotas potenciadas x10",
        "100 cupos disponibles",
      ]},
    { key: "pro-45", name: "3 meses", price: 44990, multiplier: 20, label: "Cuotas x20",
      note: "≈ $14.997 / mes",
      bullets: [
        "Guía de estrategia y gestión de banca",
        "Picks y análisis ampliados",
        "Alertas clave de partido (cuando las actives)",
        "Cuotas potenciadas x20",
        "50 cupos disponibles",
      ]},
    { key: "pro-250", name: "Anual", price: 99990, multiplier: 50, label: "Cuotas x50",
      note: "≈ $8.333 / mes", highlight: true,
      bullets: [
        "Guía de estrategia PRO",
        "Informe premium mensual",
        "Cuotas potenciadas x50",
        "30 cupos disponibles",
      ]},
    { key: "lifetime", name: "Vitalicio", price: 249990, multiplier: 100, label: "Cuotas x100",
      note: "Acceso de por vida",
      bullets: [
        "Acceso de por vida a todas las mejoras",
        "Informe premium mensual",
        "Cuotas potenciadas x100",
        "15 cupos disponibles",
      ]},
  ];

  const clp = (n) => n.toLocaleString("es-CL", { maximumFractionDigits: 0 });

  const buy = async (p, provider) => {
    const res = await fetch(`/api/pay/checkout?provider=${provider}&plan=${p.key}`, { method: "POST" });
    const { payment_url } = await res.json();
    window.location.href = payment_url;
  };

  return (
    <div>
      {/* Header brand */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-fv.png" alt="Factor Victoria" className="h-10 w-10 rounded-md" />
            <span className="text-xl font-bold">Factor Victoria</span>
          </div>
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-sm">
            Paga con <b>Flow</b> o <b>Mercado Pago</b> • hasta 6 cuotas*
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Convierte información en ventaja</h1>
          <p className="mt-3 text-white/80 max-w-2xl mx-auto">
            Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.
          </p>
          <div className="mt-6">
            <a href="#planes" className="inline-block rounded-xl px-5 py-3 font-semibold text-slate-900"
               style={{ background: "linear-gradient(90deg,#D4AF37,#F0D98A)" }}>
              Ver planes
            </a>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <main className="bg-gray-50">
        <div id="planes" className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map((p) => (
              <div
                key={p.key}
                className={`relative rounded-2xl border bg-white p-6 flex flex-col shadow-sm ${
                  p.highlight ? "border-yellow-500 shadow-xl" : "border-gray-200"
                }`}
              >
                {p.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full"
                    style={{ background: "linear-gradient(90deg,#D4AF37,#F0D98A)", color: "#1c2230" }}
                  >
                    Más popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm font-medium" style={{ color: "#D4AF37" }}>
                  {p.label}
                </p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold ${p.highlight ? "text-yellow-600" : "text-gray-900"}`}>
                    ${clp(p.price)}
                  </span>
                  <span className="text-sm text-gray-500">/ {p.name === "Mensual" ? "mes" : "plan"}</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{p.note}</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-700">
                  {p.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full" style={{ background: "#D4AF37" }} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => buy(p, "flow")}
                    className="w-full rounded-xl px-4 py-3 text-slate-900 font-semibold shadow"
                    style={{ background: "linear-gradient(90deg,#D4AF37,#F0D98A)" }}
                  >
                    Elegir {p.name} • Flow
                  </button>
                  <button
                    onClick={() => buy(p, "mp")}
                    className="w-full rounded-xl px-4 py-3 text-center font-semibold transition shadow bg-white border hover:bg-gray-50"
                  >
                    Elegir {p.name} • Mercado Pago
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Simulador */}
          <div className="bg-white rounded-2xl shadow-md p-8 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-4">Simula tus ganancias</h2>
            <p className="text-center text-gray-600 mb-6">
              Ingresa un monto a apostar y descubre cuánto podrías ganar.
            </p>
            <div className="flex justify-center mb-6">
              <input
                type="number"
                className="w-48 px-4 py-2 border rounded-lg text-center"
                value={amount}
                min="1000"
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value || 0)))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((p) => (
                <div key={p.key} className="bg-gray-50 rounded-xl p-4 text-center border">
                  <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                  <p className="text-sm font-medium mb-2" style={{ color: "#D4AF37" }}>
                    {p.label}
                  </p>
                  <p className="text-gray-600 text-sm mb-1">Apuesta: ${clp(amount)}</p>
                  <p className="text-green-700 font-bold text-xl">
                    Ganancia: ${clp(amount * p.multiplier)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-gray-500">
              *Las cuotas dependen del medio/emisor de la tarjeta.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
