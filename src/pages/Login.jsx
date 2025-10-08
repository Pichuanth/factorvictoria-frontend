import { useState } from "react";
import { Link } from "react-router-dom";

export default function Login(){
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [busy, setBusy]   = useState(false);

  const submit = async(e)=>{
    e.preventDefault();
    setBusy(true);
    try{
      // DEMO: sin backend todavía
      if(email && pass){
        alert("Demo: login exitoso. (Cuando conectemos backend, te redirigiremos a tu panel)");
        window.location.href = "/app";
      }else{
        alert("Completa correo y contraseña");
      }
    }finally{ setBusy(false); }
  };

  return (
    <div className="fv-bg" style={{minHeight:"calc(100vh - 64px)",padding:"28px 0"}}>
      <div className="container" style={{maxWidth:560}}>
        <h1 style={{color:"#e5e7eb",fontWeight:900,marginBottom:12}}>Iniciar sesión</h1>

        <div style={{background:"#0b1322",border:"1px solid #1f2a3b",borderRadius:24,padding:22,color:"#e5e7eb"}}>
          <form onSubmit={submit} style={{display:"grid",gap:14}}>
            <div>
              <label className="label">Correo</label>
              <input
                type="email"
                className="input"
                placeholder="tu@correo.com"
                value={email} onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={pass} onChange={(e)=>setPass(e.target.value)}
                required
              />
            </div>
            <button className="fv-btn-primary" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
            <div style={{display:"flex",justifyContent:"space-between",color:"#cbd5e1"}}>
              <Link to="/#planes" style={{color:"#f0d98a",fontWeight:800,textDecoration:"none"}}>¿Aún no tienes cuenta? Regístrate</Link>
              <Link to="/forgot" style={{color:"#f0d98a",fontWeight:800,textDecoration:"none"}}>Recuperar contraseña</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
