import { useEffect, useMemo, useState } from "react";

const API_BASE =
  (typeof localStorage !== "undefined" && localStorage.getItem("apiBase")) ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:3001";

/* Mapeo simple a bandera emoji por país (fallback = 🇺🇳) */
const FLAG = (country="")=>{
  const c = country.trim().toLowerCase();
  const map = {
    chile:"🇨🇱", argentina:"🇦🇷", brasil:"🇧🇷", brazil:"🇧🇷",
    uruguay:"🇺🇾", paraguay:"🇵🇾", peru:"🇵🇪", bolivia:"🇧🇴",
    colombia:"🇨🇴", mexico:"🇲🇽", españa:"🇪🇸", spain:"🇪🇸",
    francia:"🇫🇷", france:"🇫🇷", inglaterra:"🇬🇧", italy:"🇮🇹", italia:"🇮🇹",
    alemania:"🇩🇪", germany:"🇩🇪", usa:"🇺🇸", estados:"🇺🇸", portugal:"🇵🇹"
  };
  return map[c] || "🇺🇳";
};

export default function Fixtures() {
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = `${API_BASE}/api/fixtures?date=${encodeURIComponent(date)}`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setRows(Array.isArray(data.fixtures) ? data.fixtures : []);
      } catch (e) {
        console.error(e);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((x) =>
      [x.home, x.away, x.league, x.country].some((v) =>
        String(v || "").toLowerCase().includes(t)
      )
    );
  }, [rows, q]);

  const syncDay = async ()=>{
    if(!adminToken){ alert("Ingresa el token de administrador."); return; }
    try{
      const r = await fetch(`${API_BASE}/api/fixtures/sync-day`,{
        method:"POST",
        headers:{ "Content-Type":"application/json","x-admin-token":adminToken },
        body: JSON.stringify({ date })
      });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      alert("Sincronización enviada. Revisa los partidos en unos minutos.");
    }catch(e){
      alert("No se pudo sincronizar. Revisa el token y el backend.");
      console.error(e);
    }
  };

  return (
    <div className="container" style={{padding:"18px 16px 26px"}}>
      <h1 style={{fontSize:28,fontWeight:900}}>Partidos</h1>

      {/* Panel ADMINISTRADOR (solo uso interno) */}
      <div style={{background:"#0b1322",border:"1px solid #1f2a3b",padding:16,borderRadius:20,color:"#e5e7eb",margin:"10px 0 14px"}}>
        <div className="badge" style={{background:"#e2e8f0"}}>ADMINISTRADOR</div>
        <p style={{margin:"10px 0 8px",color:"#cbd5e1",fontWeight:800}}>Token interno (no publicar en producción):</p>
        <div className="form-row">
          <input className="input" type="text" placeholder="x-admin-token" value={adminToken} onChange={(e)=>setAdminToken(e.target.value)} />
          <button className="fv-btn-primary" onClick={syncDay}>Sincronizar día a Base de Datos</button>
        </div>
      </div>

      {/* Controles */}
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:12,marginBottom:12}}>
        <input className="input" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
        <input className="input" placeholder="Buscar (equipo/liga/país)" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <span className="muted">{loading ? "Cargando…" : `${filtered.length} partidos`}</span>

      {/* Tabla */}
      <div className="table-wrap" style={{marginTop:10}}>
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Local</th>
              <th>Visita</th>
              <th>Liga</th>
              <th>País</th>
              <th>Estadio</th>
              <th>TV</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="muted" colSpan={8}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="muted" colSpan={8}>Sin partidos.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    {new Date(r.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td>{r.home}</td>
                  <td>{r.away}</td>
                  <td>{r.league}</td>
                  <td>{FLAG(r.country)} {r.country}</td>
                  <td>{r.venue || "-"}</td>
                  <td>{r.tv || "-"}</td>
                  <td>{r.status || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
