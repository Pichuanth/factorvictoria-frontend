// src/pages/Activate.jsx
import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/\/$/, "") || "https://factorvictoria-backend.vercel.app";
const GOLD = "#E6C464";

export default function Activate() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { login } = useAuth();

  const token = sp.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOkMsg("");

    if (!token) return setErr("Token inválido o faltante.");
    if (!pw || pw.length < 6) return setErr("La contraseña debe tener al menos 6 caracteres.");
    if (pw !== pw2) return setErr("Las contraseñas no coinciden.");

    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) {
        setErr(data?.error || "No se pudo activar la cuenta.");
        return;
      }
      setOkMsg("Cuenta activada ✅ Iniciando sesión...");
      // auto login
      if (data?.email) {
        await login(data.email, pw);
      }
      nav("/perfil");
    } catch {
      setErr("Error activando la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b16] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-extrabold">Crear contraseña</h1>
        <p className="mt-2 text-sm text-white/70">
          Esto activa tu cuenta y deja tu plan listo para usar.
        </p>

        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-white/70">Contraseña</label>
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-xl bg-white text-black px-4 py-2"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="text-sm text-white/70">Repetir contraseña</label>
            <input
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              type="password"
              className="mt-1 w-full rounded-xl bg-white text-black px-4 py-2"
              placeholder="Repite tu contraseña"
            />
          </div>

          {okMsg ? <div className="text-sm text-emerald-300">{okMsg}</div> : null}
          {err ? <div className="text-sm text-red-400">{err}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl font-semibold py-3 disabled:opacity-60"
            style={{ backgroundColor: GOLD, color: "#0b1020" }}
          >
            {loading ? "Activando..." : "Activar cuenta"}
          </button>
        </form>

        <div className="mt-4 text-sm text-white/70">
          ¿Ya tienes cuenta? <Link className="underline" to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
