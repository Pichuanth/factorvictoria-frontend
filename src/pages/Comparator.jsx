import { useState } from "react";

const TIERS = [
  { key:"x10",  title:"x10",  price:19990, included:true  },
  { key:"x20",  title:"x20",  price:44990, included:false },
  { key:"x50",  title:"x50",  price:99990, included:false },
  { key:"x100", title:"x100", price:249000, included:false },
];

export default function Comparator(){
  const [q,setQ]=useState("");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-4">Comparador de Cuotas</h1>

      <input
        className="w-full mb-4 rounded-2xl border px-4 py-3 bg-white"
        placeholder="Buscar (equipo/mercado/selección)"
        value={q} onChange={(e)=>setQ(e.target.value)}
      />

      {/* Tiers */}
      <div className="tiers-grid mb-4">
        {TIERS.map(t=>(
          <div key={t.key} className={`plan-card ${t.included?"":"locked"}`}>
            <div className="text-2xl font-extrabold">{t.title}</div>
            <div className="text-sm opacity-70">${t.price.toLocaleString("es-CL")}</div>

            {t.included ? (
              <button className="btn-navy mt-4">Incluido</button>
            ) : (
              <button className="btn-navy mt-4">Mejorar</button>
            )}
          </div>
        ))}
      </div>

      {/* Filtros de ejemplo (placeholder, deja tu lógica actual si la tienes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border px-3 py-2">Objetivo <select className="ml-2"><option>Objetivo x10</option></select></div>
        <div className="rounded-xl border px-3 py-2">Tolerancia <select className="ml-2"><option>±10%</option></select></div>
        <div className="rounded-xl border px-3 py-2">Min legs: 3</div>
        <div className="rounded-xl border px-3 py-2">Max legs: 6</div>
      </div>

      <button className="fv-btn-primary">Generar</button>

      {/* Tabla (placeholder sin datos mientras no haya backend) */}
      <div className="table-wrap mt-4">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Local</th><th>Visita</th><th>Bookmaker</th><th>Mercado</th><th>Selección</th><th>Cuota</th><th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="muted" colSpan={8}>Sin datos.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
