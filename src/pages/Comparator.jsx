import { useState } from "react";

const PLANS = [
  { key:"x10", name:"x10", price:19990, included:true },
  { key:"x20", name:"x20", price:44990 },
  { key:"x50", name:"x50", price:99990 },
  { key:"x100", name:"x100", price:249990 },
];

const clp = (n)=> n.toLocaleString("es-CL",{maximumFractionDigits:0});

export default function Comparator(){
  const [q, setQ] = useState("");
  const [rows] = useState([]); // cuando conectemos backend: setRows(...)
  const [minLegs, setMinLegs] = useState(3);
  const [maxLegs, setMaxLegs] = useState(6);
  const [goal, setGoal] = useState("Objetivo x10");
  const [tol, setTol] = useState("±10%");

  const upgrade = (planKey)=>{
    // Por ahora redirigimos a la landing para comprar
    window.location.href = "/#planes";
  };

  return (
    <div className="container" style={{padding:"18px 16px 26px"}}>
      <h1 style={{fontSize:28,fontWeight:900}}>Comparador de Cuotas</h1>

      <input
        className="input" style={{margin:"12px 0 16px"}}
        placeholder="Buscar (equipo/mercado/selección)"
        value={q} onChange={(e)=>setQ(e.target.value)}
      />

      {/* Tarjetas de planes (móvil: 1 por fila) */}
      <div style={{display:"grid",gap:16}}>
        {PLANS.map((p)=>(
          <div key={p.key} className={`plan-card ${!p.included ? 'locked':''}`} style={{margin:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:900,fontSize:20,textTransform:"uppercase"}}>{p.name}</div>
                <div style={{fontWeight:800,opacity:.9}}>${clp(p.price)}</div>
              </div>
              {p.included ? (
                <div className="badge">✔ Incluido</div>
              ) : (
                <div className="badge" style={{background:"#fef3c7",color:"#7c5a02"}}>🔒 Bloqueado</div>
              )}
            </div>

            <div style={{marginTop:12}}>
              {p.included ? (
                <button className="btn-navy" disabled style={{opacity:.9}}>Incluido</button>
              ) : (
                <button className="btn-navy" onClick={()=>upgrade(p.key)}>Mejorar</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filtros básicos */}
      <div style={{display:"grid",gap:12,gridTemplateColumns:"repeat(2,1fr)",marginTop:18}}>
        <div>
          <label className="muted" style={{fontWeight:800}}>Objetivo</label>
          <select className="input" value={goal} onChange={(e)=>setGoal(e.target.value)}>
            <option>Objetivo x10</option>
            <option>Objetivo x20</option>
            <option>Objetivo x50</option>
            <option>Objetivo x100</option>
          </select>
        </div>
        <div>
          <label className="muted" style={{fontWeight:800}}>Tolerancia</label>
          <select className="input" value={tol} onChange={(e)=>setTol(e.target.value)}>
            <option>±5%</option><option>±10%</option><option>±15%</option>
          </select>
        </div>
        <div>
          <label className="muted" style={{fontWeight:800}}>Min legs</label>
          <input className="input" type="number" min={1} max={20} value={minLegs} onChange={(e)=>setMinLegs(+e.target.value)} />
        </div>
        <div>
          <label className="muted" style={{fontWeight:800}}>Max legs</label>
          <input className="input" type="number" min={minLegs} max={30} value={maxLegs} onChange={(e)=>setMaxLegs(+e.target.value)} />
        </div>
      </div>

      <div style={{marginTop:16}}>
        <button className="fv-btn-primary">Generar</button>
      </div>

      {/* Tabla resultados (placeholder) */}
      <div className="table-wrap" style={{marginTop:16}}>
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Local</th><th>Visita</th><th>Bookmaker</th><th>Mercado</th><th>Selección</th><th>Cuota</th><th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td className="muted" colSpan={8}>Sin datos.</td></tr>
              : rows.map((r)=>(
                <tr key={r.id}>
                  <td>{r.date}</td><td>{r.home}</td><td>{r.away}</td><td>{r.bookmaker}</td><td>{r.market}</td><td>{r.pick}</td><td>{r.odds}</td><td>{r.updatedAt}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Explicación y upsell */}
      <section style={{marginTop:22,display:"grid",gap:12}}>
        <h3 style={{fontSize:18,fontWeight:900}}>Cuotas generadas y porcentaje de acierto</h3>

        <div className="info-card"><b>Cuota de regalo:</b> 1.5 a 3 máximo (una selección individual muy probable, para todos los planes).</div>
        <div className="info-card"><b>Cuota generada:</b> Ajustamos legs y tolerancia para alcanzar <b>{goal}</b> (o la más cercana) sin forzar picks arriesgados.</div>
        <div className="info-card"><b>Probabilidad promedio por selección:</b> 85–90% aprox. (cada pick por separado).</div>
        <div className="info-card"><b>Error de cuota / desfase de mercado:</b> si aparece una oportunidad, la verás aquí marcada para aprovecharla a tiempo.</div>

        <h4 style={{marginTop:6,fontWeight:900}}>¿Listo para mejorar tus ganancias?</h4>
        <div style={{display:"grid",gap:10,gridTemplateColumns:"1fr"}}>
          {PLANS.filter(p=>!p.included).map(p=>(
            <button key={p.key} className="fv-btn-primary" onClick={()=>upgrade(p.key)}>
              Cuota mejorada {p.name.toUpperCase()} 🔒
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
