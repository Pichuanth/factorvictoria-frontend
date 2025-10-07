import { useState } from "react";

export default function Comparator(){
  const [tier, setTier] = useState("x10");

  const TierCard = ({t, price, locked}) => (
    <div className="relative plan-card {locked?'locked':''}" style={{marginBottom:16}}>
      <div style={{fontSize:'22px', fontWeight:800, marginBottom:6}}> {t} </div>
      <div style={{color:'#6b7280', marginBottom:12}}>${price.toLocaleString("es-CL")}</div>
      {locked ? (
        <button className="btn-navy">Mejorar</button>
      ) : (
        <button className="fv-btn-primary" style={{width:'100%'}}>Incluido</button>
      )}
    </div>
  );

  return (
    <div style={{padding:16}}>
      <h2 style={{fontSize:24, fontWeight:800, marginBottom:12}}>Comparador de Cuotas</h2>

      <input
        placeholder="Buscar (equipo/mercado/selección)"
        style={{width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:12, marginBottom:12}}
      />

      <div style={{display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:16}}>
        <div onClick={()=>setTier('x10')}><TierCard t="x10" price={19990} locked={false}/></div>
        <div><TierCard t="x20" price={44990} locked/></div>
        <div><TierCard t="x50" price={99990} locked/></div>
        <div><TierCard t="x100" price={249990} locked/></div>
      </div>

      {/* Controles: simple layout visual (puedes conectar a tu backend cuando quieras) */}
      <div style={{display:'flex', gap:12, alignItems:'center', marginTop:12, flexWrap:'wrap'}}>
        <div>Objetivo</div>
        <select defaultValue="x10"><option>Objetivo x10</option><option>Objetivo x20</option><option>Objetivo x50</option><option>Objetivo x100</option></select>
        <div>Tolerancia</div>
        <select defaultValue="+-10%"> <option>±10%</option><option>±5%</option><option>±2%</option></select>
        <div>Min legs</div><input style={{width:60}} defaultValue={3}/>
        <div>Max legs</div><input style={{width:60}} defaultValue={6}/>
        <button className="btn-outline">Generar</button>
      </div>

      <div className="table-wrap" style={{marginTop:12}}>
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Local</th><th>Visita</th><th>Bookmaker</th><th>Mercado</th><th>Selección</th><th>Cuota</th><th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={8} className="fv-muted">Sin datos.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
