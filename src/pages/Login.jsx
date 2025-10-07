export default function Login(){
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-6">Iniciar sesión</h1>
      <div className="plan-card">
        <label className="text-sm font-semibold">Correo</label>
        <input type="email" className="money-input" placeholder="tu@correo.com" />
        <label className="text-sm font-semibold mt-3">Contraseña</label>
        <input type="password" className="money-input" placeholder="••••••••" />
        <button className="btn-navy mt-4">Entrar</button>
      </div>
      <p className="muted mt-3 text-sm">*Página de ejemplo (sin backend aún).</p>
    </div>
  );
}
