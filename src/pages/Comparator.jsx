import React from "react";
import Simulator from "../components/Simulator";

export default function Comparador() {
  return (
    <div className="bg-slate-900 min-h-screen">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-white text-3xl font-bold mb-6">Comparador</h1>
        <p className="text-white/80 mb-8">
          Aquí verás cuotas, “regalos”, desfase del mercado y el simulador.
        </p>
        <Simulator />
      </section>
    </div>
  );
}
