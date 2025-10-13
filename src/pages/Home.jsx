// src/pages/Home.jsx
import { Link } from "react-router-dom";
import copy from "../copy";
import Simulator from "../components/Simulator";

export default function Home() {
  return (
    <div className="bg-slate-900">
      {/* Héroe */}
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-14">
        <div className="flex items-center gap-3">
          <img
            src="/logo-fv.png"
            alt="Factor Victoria"
            className="w-12 h-12 md:w-14 md:h-14 object-contain"
          />
          <span className="text-white text-3xl md:text-4xl font-extrabold">
            Factor Victoria
          </span>
        </div>

        <div className="mt-4 inline-flex">
          <span className="px-4 py-1 rounded-full bg-slate-800 text-white/80 text-sm">
            Paga con Flow o Mercado Pago · hasta 6 cuotas*
          </span>
        </div>

        <h1 className="mt-6 text-white text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl">
          Convierte información <br /> en ventaja
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-3xl">{copy.marca.subclaim}</p>

        <Link
          to="#planes"
          className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-amber-400 text-slate-900 font-semibold shadow hover:opacity-90"
        >
          {copy.ctas.verPlanes}
        </Link>
      </section>

      {/* Planes */}
      <section id="planes" className="max-w-6xl mx-auto px-4 -mt-6">
        <div className="grid gap-6 md:grid-cols-2">
          {copy.planes.map((p) => (
            <div
              key={p.id}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8"
            >
              {p.badge && (
                <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-amber-300 text-slate-900 mb-4">
                  {p.badge}
                </span>
              )}

              <h3 className="text-white text-2xl font-bold">{p.title}</h3>
              <div className="mt-2 text-3xl md:text-4xl font-extrabold text-white">
                {p.priceCLP}
                {p.freq && (
                  <span className="text-white/60 text-base font-medium"> {p.freq}</span>
                )}
              </div>

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
                  className="inline-flex px-6 py-3 rounded-2xl bg-amber-400 text-slate-900 font-semibold hover:opacity-90"
                >
                  {copy.ctas.comprar}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Simulador */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <Simulator />
      </section>

      {/* Imagen de cierre (full width en mobile) */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <img
          src="/hero-players.png"
          alt={copy.home.imagenCierreAlt}
          className="w-full h-auto object-cover rounded-none md:rounded-3xl"
        />
      </section>

      {/* Acerca de / Cómo funciona + CTA + © 2025 */}
      <section className="max-w-6xl mx-auto px-4 pb-16 text-white/90">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Convierte información en ventaja
        </h2>
        <p className="mt-3">
          Nuestra IA combina estadísticas, momentum y señales de mercado para
          encontrar cuotas con valor. Tú eliges el plan y nosotros te damos
          herramientas: picks, simulador y estrategias para decidir mejor.
        </p>
        <p className="mt-2">
          Cuanto mejor tu plan, mayor el potencial: cuotas potenciadas, alertas
          y estrategias PRO para subir tu expectativa de ganancia.
        </p>
        <a
          href="#planes"
          className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-amber-400 text-slate-900 font-semibold"
        >
          Empieza ahora
        </a>
        <div className="mt-10 text-center text-white/60">© 2025 Factor Victoria</div>
      </section>
    </div>
  );
}
