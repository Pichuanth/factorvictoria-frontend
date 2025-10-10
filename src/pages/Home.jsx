// src/pages/Home.jsx
import React from "react";
import copy from "../copy";
import Simulator from "../components/Simulator";
import { Link } from "react-router-dom";

const money = (n: number) =>
  `$${n.toLocaleString("es-CL")}`;

export default function Home() {
  return (
    <div className="pb-16">
      {/* Héroe (logo + nombre) sobre fondo azul */}
      <section className="bg-[#0f1a2a]">
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-10">
          {/* Logo + Nombre */}
          <div className="flex items-center gap-3">
            <img src="/logo-fv.png" alt="Logo" className="h-10 w-10" />
            <h1 className="text-white text-2xl md:text-3xl font-bold">
              {copy.marca.nombre}
            </h1>
          </div>

          {/* Banner pago */}
          <div className="mt-4 inline-flex items-center rounded-2xl px-4 py-2 bg-white/10 text-white/90">
            {copy.marca.bannerPago}
          </div>

          {/* Claim */}
          <div className="mt-6 text-white">
            <h2 className="text-4xl md:text-6xl font-extrabold leading-tight">
              {copy.marca.claim.split(" en ").length === 2 ? (
                <>
                  {copy.marca.claim.split(" en ")[0]}{" "}
                  <span className="text-white/80">en</span>{" "}
                  <span className="inline-block bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 px-2 py-1 rounded-xl">
                    ventaja
                  </span>
                </>
              ) : (
                copy.marca.claim
              )}
            </h2>
            <p className="mt-4 text-lg md:text-xl text-white/80 max-w-3xl">
              {copy.marca.subclaim}
            </p>

            <Link
              to="#planes"
              className="inline-flex mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400 text-slate-900 font-semibold shadow"
            >
              {copy.ctas.verPlanes}
            </Link>
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="max-w-6xl mx-auto px-4 -mt-8">
        <div className="grid gap-6 md:grid-cols-2">
          {copy.planes.map((p) => (
            <div
              key={p.id}
              className={[
                "rounded-3xl border p-6 md:p-8",
                p.destacado
                  ? "bg-gradient-to-b from-amber-50 to-white border-amber-100 shadow"
                  : "bg-white border-slate-200",
              ].join(" ")}
            >
              {p.destacado && (
                <div className="inline-block text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 mb-2">
                  Recomendado
                </div>
              )}
              <div className="text-2xl font-bold text-slate-900">{p.nombre}</div>
              <div className="text-sm text-slate-500 mt-1">
                Cuotas x{p.multiplo} • {p.periodicidad}
              </div>

              <div className="text-4xl font-extrabold text-slate-900 mt-4">
                {money(p.precioCLP)}{" "}
                <span className="text-base font-semibold text-slate-500">
                  / {p.periodicidad === "único" ? "plan" : p.periodicidad}
                </span>
              </div>

              <ul className="mt-4 space-y-2">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
                    <span className="mt-1 h-2 w-2 rounded-full bg-amber-400" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {/* Redirige a tu flujo de pago (Flow/Mercado Pago) */}
                <a
                  href={`/checkout?plan=${p.id}`} // reemplaza por tu URL real a Flow o MP
                  className="inline-flex px-6 py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:opacity-90"
                >
                  {copy.ctas.comprar}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Simulador */}
      <Simulator />

      {/* Imagen de cierre */}
      <section className="max-w-6xl mx-auto px-4 mt-10">
        <img
          src="/assets/landing-cierre.jpg" // pon aquí tu imagen (los 2 jugadores)
          alt={copy.home.imagenCierreAlt}
          className="w-full rounded-3xl border border-slate-200 shadow"
        />
      </section>
    </div>
  );
}
