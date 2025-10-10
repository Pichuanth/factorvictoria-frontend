// src/pages/Login.jsx
export default function Login() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-white">
      <h1 className="text-3xl font-black mb-6">Iniciar sesión</h1>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <div className="flex justify-center mb-6">
          <img src="/logo-fv.png" alt="logo" className="h-16" />
        </div>

        <label className="block text-sm mb-2">Correo</label>
        <input className="w-full mb-4 rounded-2xl bg-white text-slate-900 px-4 py-3" />

        <label className="block text-sm mb-2">Contraseña</label>
        <input type="password" className="w-full mb-6 rounded-2xl bg-white text-slate-900 px-4 py-3" />

        <button className="w-full rounded-xl py-3 font-semibold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900">
          Entrar
        </button>

        <div className="mt-4 text-sm text-white/70">
          ¿Aún no tienes cuenta? Regístrate
        </div>
      </div>
    </div>
  );
}
