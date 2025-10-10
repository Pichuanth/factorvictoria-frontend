import React from "react";
import copy from "../copy";
import Simulator from "../components/Simulator"; // si no existe, crea un placeholder

export default function Home() {
  return (
    <div className="bg-slate-900 min-h-screen">
      {/* Héroe */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-14">
        <div className="flex items-center gap-3">
          <img src="/logo-fv.png" alt="Factor Victoria" className="w-10 h-10 object-contain" />
          <span className="text-white text-2xl md:text-3xl font-bold">Factor Victoria</span>
        </div>

        <div className="mt-4 inline-flex">
          <span className="px-4 py-1 rounded-full bg-slate-800 text-white/80 text-sm">
            Paga con Flow o Mercado Pago · hasta 6 cuotas*
          </span>
        </div>

        <h1 className="mt-6 text-white text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Convierte información <br /> en ventaja
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-3xl">
          {copy.marca.subclaim}
        </p>

        <a
          href="#planes"
          className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 font-semibold shadow hover:opacity-90"
        >
          {copy.ctas.verPlanes}
        </a>
      </section>

      {/* Planes */}
      <section id="planes" className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid gap-6 md:grid-cols-2">
          {copy.planes.length === 0 && (
            <div className="text-white/70">Sin planes cargados.</div>
          )}
          {copy.planes.map((p) => (
            <div key={p.id} className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
              {p.badge && (
                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-amber-300 text-slate-900 mb-4">
                  {p.badge}
                </span>
              )}
              <h3 className="text-white text-2xl font-bold">{p.title}</h3>
              <div className="mt-2 text-3xl md:text-4xl font-extrabold text-white">
                {p.priceCLP}
                {p.freq && <span className="text-white/60 text-base font-medium"> {p.freq}</span>}
              </div>
              {p.note && <div className="text-white/60 text-sm mt-1">{p.note}</div>}

              <ul className="mt-5 space-y-2 text-white/90">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <a
                  href={`/checkout?plan=${p.id}`}
                  className="inline-flex px-6 py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:opacity-90"
                >
                  {copy.ctas.comprar}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Simulador (demo) */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <Simulator />
      </section>

      {/* Imagen de cierre */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <img src="/hero-players.png" className="rounded-3xl w-full object-cover" alt="Jugadores saliendo del notebook" />
      </section>
    </div>
  );
}
