import React, { useState } from "react";

export default function LandingPage(){
  const [amountRaw, setAmountRaw] = useState("10000");
  const amount = Number(amountRaw || 0);

  const plans = [
    { key:"pro-100",  name:"Mensual",  price:19990, multiplier:10,  label:"Cuotas x10",
      note:"Ideal para probar",
      bullets:["Ebook para principiantes","Picks y análisis básicos diarios","Simulador de ganancias incluido","Cuotas potenciadas x10","100 cupos disponibles"] },
    { key:"pro-45",   name:"3 meses",  price:44990, multiplier:20,  label:"Cuotas x20",
      note:"≈ $14.997 / mes", locked:true,
      bullets:["Guía de estrategia y gestión de banca","Picks y análisis ampliados","Alertas clave de partido (cuando las actives)","Cuotas potenciadas x20","50 cupos disponibles"] },
    { key:"pro-250",  name:"Anual",    price:99990, multiplier:50,  label:"Cuotas x50",
      note:"≈ $8.333 / mes", highlight:true, locked:true,
      bullets:["Guía de estrategia PRO","Informe premium mensual","Cuotas potenciadas x50","30 cupos disponibles"] },
    { key:"lifetime", name:"Vitalicio", price:249990, multiplier:100, label:"Cuotas x100",
      note:"Acceso de por vida", locked:true,
      bullets:["Acceso de por vida a todas las mejoras","Informe premium mensual","Cuotas potenciadas x100","15 cupos disponibles"] },
  ];

  const clp = (n)=> n.toLocaleString("es-CL",{maximumFractionDigits:0});
  const formatCLP = (digits)=> `$${clp(Number(digits||0))}`;
  const onMoneyChange = (e)=> setAmountRaw((e.target.value||"").replace(/\D/g,""));

  const buy = async(p,provider)=>{
    try{
      const r = await fetch(`/api/pay/checkout?provider=${provider}&plan=${p.key}`,{method:"POST"});
      const { payment_url } = await r.json();
      window.location.href = payment_url;
    }catch{
      alert("Aún no está conectado el backend de pagos. Vamos a activarlo pronto 🙌");
    }
  };

  return (
    <div>
      {/* HERO */}
      <section className="fv-bg text-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-fv.png" alt="Factor Victoria" className="h-14 w-14 md:h-16 md:w-16 rounded-md" />
            <span className="text-2xl md:text-3xl font-extrabold tracking-tight">Factor Victoria</span>
          </div>
          <span className="fv-chip">Paga con <b>Flow</b> o <b>Mercado Pago</b> • hasta 6 cuotas*</span>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Convierte información en ventaja
          </h1>
          <p className="mt-3 fv-muted text-lg max-w-2xl mx-auto">
            Estadísticas, pronósticos y simulador de ganancias para apostar con criterio.
          </p>
          <div className="mt-6">
            <a href="#planes" className="fv-btn-primary">Ver planes</a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <main className="bg-gray-50">
        <div id="planes" className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map(p=>(
              <div key={p.key} className={`relative plan-card ${p.locked?"locked":""} ${p.highlight?"highlight":""}`}>
                {p.highlight && <div className="plan-badge">Más popular</div>}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm fv-gold font-medium">{p.label}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold ${p.locked?"text-[var(--fv-navy)]":"text-gray-900"}`}>${clp(p.price)}</span>
                  <span className={`text-sm ${p.locked?"text-[var(--fv-navy)]/70":"text-gray-500"}`}>/ {p.name==="Mensual"?"mes":"plan"}</span>
                </div>
                <p className={`mt-1 text-sm ${p.locked?"text-[var(--fv-navy)]/70":"text-gray-600"}`}>{p.note}</p>

                <ul className={`mt-4 space-y-2 text-sm ${p.locked?"text-[var(--fv-navy)]/90":"text-gray-700"}`}>
                  {p.bullets.map((b,i)=>(
                    <li key={i} className="flex gap-2">
                      <span className="mt-1 inline-block h-2 w-2 rounded-full" style={{background:"var(--fv-gold)"}}/>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 grid grid-cols-1 gap-2">
                  {!p.locked ? (
                    <>
                      <button onClick={()=>buy(p,"flow")} className="fv-btn-primary w-full shadow">Elegir {p.name} • Flow</button>
                      <button onClick={()=>buy(p,"mp")} className="btn-outline w-full">Elegir {p.name} • Mercado Pago</button>
                    </>
                  ) : (
                    <a href="#planes" className="btn-navy">Mejorar</a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* SIMULADOR */}
          <div className="simulator-wrap">
            <h2 className="text-2xl font-bold text-center mb-2">Simula tus ganancias</h2>
            <p className="text-center fv-muted mb-6">Ingresa un monto a apostar y descubre cuánto podrías ganar.</p>

            <div className="max-w-md mx-auto mb-8">
              <input
                type="text" inputMode="numeric" pattern="[0-9]*"
                className="money-input money-elegant text-3xl md:text-4xl"
                placeholder="$0"
                value={formatCLP(amountRaw)}
                onChange={onMoneyChange}
                onFocus={(e)=>e.target.select()}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map(p=>(
                <div key={p.key} className="bg-white/95 text-slate-900 rounded-xl p-4 text-center border">
                  <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                  <p className="text-sm fv-gold font-medium mb-2">{p.label}</p>
                  <p className="text-gray-600 text-sm mb-1">Apuesta: {formatCLP(amountRaw)}</p>
                  <p className="text-green-700 font-bold text-xl">Ganancia: ${clp(amount * p.multiplier)}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-xs fv-muted">
              *Las ganancias son estimadas y pueden variar según bookmaker y método de pago.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
