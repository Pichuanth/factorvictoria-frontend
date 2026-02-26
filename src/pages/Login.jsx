// src/pages/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const res = await login(email, password);
    if (!res.ok) {
      setErr(res.message || "Correo o contraseña inválidos.");
      return;
    }
    nav("/comparator");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1020] px-4">
      <div className="w-full max-w-md rounded-2xl bg-[#0f1730] border border-white/10 p-6 shadow-xl">
        <div className="text-center mb-6">
          <img src="/logo-fv.png" alt="Factor Victoria" className="mx-auto mb-5 w-28 md:w-36" />
          <div className="text-2xl font-semibold text-white">Iniciar sesión</div>
          <div className="text-sm text-white/60 mt-1">
            Ingresa tu correo (de compra) para activar el modo correspondiente.
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="correo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white outline-none focus:border-white/30"
            placeholder="contraseña (opcional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#E6C464] text-[#0b1020] font-semibold py-3"
          >
            Entrar
          </button>
        </form>

        <div className="mt-4 text-sm text-white/70">
          ¿Aún no tienes membresía?{" "}
          <Link className="text-[#E6C464] underline" to="/#planes">
            Ver planes
          </Link>
        </div>
      </div>
    </div>
  );
}
