import { useState } from "react";

export default function Forgot(){
  const [email, setEmail] = useState("");
  const send = (e)=>{ e.preventDefault(); alert("Demo: te enviaremos un correo para recuperar tu contraseña cuando activemos el backend."); };

  return (
    <div className="fv-bg" style={{minHeight:"calc(100vh - 64px)",padding:"28px 0"}}>
      <div className="container" style={{maxWidth:560}}>
        <h1 style={{color:"#e5e7eb",fontWeight:900,marginBottom:12}}>Recuperar contraseña</h1>
        <div style={{background:"#0b1322",border:"1px solid #1f2a3b",borderRadius:24,padding:22,color:"#e5e7eb"}}>
          <form onSubmit={send} style={{display:"grid",gap:14}}>
            <div>
              <label className="label">Correo</label>
              <input className="input" type="email" placeholder="tu@correo.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </div>
            <button className="fv-btn-primary">Enviar enlace</button>
          </form>
        </div>
      </div>
    </div>
  );
}
