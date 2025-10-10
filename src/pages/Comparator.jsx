// src/pages/Comparador.jsx
import copy from "../copy";
import Simulator from "../components/Simulator";

export default function Comparador() {
  return (
    <div className="bg-slate-900">
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-14">
        <h1 className="text-white text-3xl md:text-4xl font-bold">Comparador de cuotas</h1>
        <p className="text-white/80 mt-2">
          Busca partidos, compara mercados y genera tu cuota objetivo.
        </p>

        {/* Simulador visible en Comparador */}
        <div className="mt-8">
          <Simulator />
        </div>

        {/* Upsell de planes (X20, X50, X100) */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {copy.planes.filter(p => p.id !== "x10").map(p => (
            <div key={p.id} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-white font-bold text-xl">{p.title}</h3>
              <div className="text-white/80 mt-1">{p.priceCLP}</div>
              <a
                href={`/checkout?plan=${p.id}`}
                className="mt-4 inline-flex px-5 py-2 rounded-xl bg-amber-400 text-slate-900 font-semibold hover:opacity-90"
              >
                {copy.ctas.comprar}
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
