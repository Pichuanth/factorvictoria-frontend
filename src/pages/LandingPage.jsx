import React, { useState } from "react";

export default function LandingPage() {
  // input de dinero (string) para poder borrar todo en móvil
  const [amountRaw, setAmountRaw] = useState("10000");
  const amount = Number(amountRaw || 0);

  const plans = [
    { key:"pro-100",  name:"Mensual",  price:19990, multiplier:10,  label:"Cuotas x10",
      note:"Ideal para probar",
      bullets:["Ebook para principiantes","Picks y análisis básicos diarios","Simulador de ganancias incluido","Cuotas potenciadas x10","100 cupos disponibles"] },
    { key:"pro-45",   name:"3 meses",  price:44990, multiplier:20,  label:"Cuotas x20",
      note:"≈ $14.997 / mes",
      bullets:["Guía de estrategia y gestión de banca","Picks y análisis ampliados","Alertas clave de partido (cuando las actives)","Cuotas potenciadas x20","50 cupos disponibles"] },
    { key:"pro-250",  name:"Anual",    price:99990, multiplier:50,  label:"Cuotas x50",
      note:"≈ $8.333 / mes", highlight:true,
      bullets:["Guía de estrategia PRO","Informe premium mensual","Cuotas potenciadas x50","30 cupos disponibles"] },
    { key:"lifetime", name:"Vitalicio", price:249990, multiplier:100, label:"Cuotas x100",
      note:"Acceso de por vida",
      bullets:["Acceso de por vida a todas las mejoras","Informe premium mensual","Cuotas potenciadas x100","15 cupos disponibles"] },
  ];

  const clp = (n)=> n.toLocaleString("es-CL",{maximumFractionDigits:0});
  const formatCLP = (digits) => `$${clp(Number(digits || 0))}`;
  const onMoneyChange = (e) => setAmountRaw((e.target.value || "").replace(/\D/g,""));

  const buy = async(p,provider)=>{
    try{
      const res = await fetch(`/api/pay/checkout?provider=${provider}&plan=${p.key}`,{method:"POST"});
      const { payment_url } = await res.json();
      window.location.href = payment_url;
    }catch{
      alert("Aún no está conectado el backend de pagos. Vamos a activarlo pronto 🙌");
    }
  };

  return (
    <div>
      {/* HERO */}
      <section className="fv-bg text-white">
        <div className="container" style={{padding:"18px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/logo-fv.png" alt="Factor Victoria" className="hero-logo" />
            <span style={{fontSize:22,fontWeight:900,letterSpacing:.2}}>Factor Victoria</span>
          </div>
          <span className="fv-chip">Paga con <b>Flow</b> o <b>Mercado Pago</b> • hasta 6 cuotas*</span>
        </div>

        <div className="container" style={{padding:"0 16px 26px"}}>
          <h1 style={{fontSize:42,lineHeight:1.1,margin:"6px 0 6px",fontWeight:900}}>Convierte información en ventaja</h1>
          <p className="muted" style={{color:"#cbd5e1",fontSize:18,maxWidth:720}}>
            Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.
          </p>
          <div style={{marginTop:16}}>
            <a href="#planes" className="fv-btn-primary">Ver planes</a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <main style={{background:"#f9fafb"}}>
        <div id="planes" className="container" style={{padding:"24px 16px 28px"}}>
          <div className="plan-grid" style={{marginBottom:24}}>
            {plans.map((p)=>(
              <div key={p.key} className={`plan-card ${p.highlight?"highlight":""}`}>
                {p.highlight && <div className="plan-badge">Más popular</div>}
                <h3 style={{fontSize:20,fontWeight:800}}>{p.name}</h3>
                <p className="muted" style={{color:"var(--fv-gold)",fontWeight:700}}>{p.label}</p>

                <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:6}}>
                  <span style={{fontSize:28,fontWeight:900}}>${clp(p.price)}</span>
                  <span className="muted">/ {p.name==="Mensual"?"mes":"plan"}</span>
                </div>

                <p className="muted">{p.note}</p>

                <ul style={{marginTop:8,display:"grid",gap:6}}>
                  {p.bullets.map((b,i)=>(
                    <li key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{marginTop:8,display:"inline-block",height:8,width:8,borderRadius:999,background:"var(--fv-gold)"}} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div style={{marginTop:14,display:"grid",gap:8}}>
                  <button onClick={()=>buy(p,"flow")} className="fv-btn-primary">Elegir {p.name} • Flow</button>
                  <button onClick={()=>buy(p,"mp")} className="btn-outline">Elegir {p.name} • Mercado Pago</button>
                </div>
              </div>
            ))}
          </div>

          {/* SIMULADOR azul marino */}
          <div className="simulator-wrap">
            <h2 style={{fontSize:22,fontWeight:900,textAlign:"center",margin:"0 0 6px"}}>Simula tus ganancias</h2>
            <p style={{textAlign:"center",color:"#9fb0c9",margin:"0 0 16px"}}>Ingresa un monto a apostar y descubre cuánto podrías ganar.</p>

            <div style={{maxWidth:460,margin:"0 auto 16px"}}>
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                className="money-input money-elegant"
                placeholder="$0"
                value={formatCLP(amountRaw)}
                onChange={onMoneyChange}
                onFocus={(e)=>e.target.select()}
              />
            </div>

            <div className="plan-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
              {plans.map((p)=>(
                <div key={p.key} style={{background:"#fff",color:"#0f172a",borderRadius:14,padding:14,textAlign:"center",border:"1px solid #e5e7eb"}}>
                  <h3 style={{fontWeight:800,margin:0}}>{p.name}</h3>
                  <p style={{margin:"2px 0",color:"var(--fv-gold)",fontWeight:700}}>{p.label}</p>
                  <p className="muted" style={{margin:"4px 0"}}>Apuesta: {formatCLP(amountRaw)}</p>
                  <p style={{color:"#166534",fontWeight:900,fontSize:18}}>Ganancia: ${clp(amount * p.multiplier)}</p>
                </div>
              ))}
            </div>

            <p className="section-note">*Las ganancias son estimadas y pueden variar según bookmaker y método de pago.</p>
          </div>

          {/* Breve explicación + imagen final */}
          <section style={{padding:"22px 0"}}>
            <h3 style={{fontSize:22,fontWeight:900,marginBottom:8}}>¿Qué es Factor Victoria?</h3>
            <p className="muted" style={{maxWidth:900}}>
              En Factor Victoria aprenderás a apostar como un profesional:
              técnicas de <b>doble oportunidad</b> (cuotas bajas y consistentes)
              y <b>desfase del mercado</b> (cuando la cuota se “equivoca” por unos minutos).
              Nuestro enfoque prioriza picks con <b>85–90% de acierto</b> por selección, según estadísticas y contexto.
              Antes de apostar, te recomendamos leer nuestra <b>guía</b> incluida en tu plan.
            </p>

            <div style={{marginTop:14,display:"grid",placeItems:"center"}}>
              {/* Sube tu imagen a public/img/players-laptop.jpg */}
              <img src="/img/players-laptop.jpg" alt="Jugada saliendo del notebook – Factor Victoria" style={{borderRadius:20,maxWidth:920,width:"100%"}} onError={(e)=>{e.currentTarget.style.display="none"}}/>
              <p className="section-note" style={{marginTop:8,color:"#64748b"}}>Aprende a apostar como un profesional.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
