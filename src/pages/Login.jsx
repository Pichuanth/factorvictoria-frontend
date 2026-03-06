// src/pages/Login.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const q = useQuery();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState("");

  // Prefill email from return redirect (?email=...)
  useEffect(() => {
    const qEmail = (q.get("email") || "").trim().toLowerCase();
    const saved = (localStorage.getItem("fv_email") || "").trim().toLowerCase();
    const initial = qEmail || saved;
    if (initial && !email) setEmail(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Paid / not paid banner from Flow return
  useEffect(() => {
    const paid = q.get("paid");
    if (paid === "1") {
      setBanner(
        "Pago confirmado ✅. Ya puedes entrar con tu correo. Si quieres, crea una contraseña."
      );
    } else if (paid === "0") {
      setBanner(
        "Pago recibido, pero aún no aparece confirmado. Si ya pagaste, espera 1–2 minutos y vuelve a intentar."
      );
    } else {
      setBanner("");
    }
  }, [q]);
  // Auto-confirmación post-pago: si venimos de Flow con paid=0, hacemos polling cada 3s
  // hasta que la membresía aparezca activa en el backend, y entonces actualizamos la URL a paid=1.
  useEffect(() => {
    const email = q.get("email") || "";
    const paid = q.get("paid");
    // Solo aplica cuando hay email y venimos recién del flujo de pago
    if (!email || paid !== "0") return;

    let alive = true;
    let attempts = 0;
    const controller = new AbortController();

    const base = (import.meta.env.VITE_API_BASE || "https://factorvictoria-backend.vercel.app")
      .replace(/\/$/, "");

    const tick = async () => {
      attempts += 1;
      try {
        const url = `${base}/api/membership?email=${encodeURIComponent(email)}`;
        const r = await fetch(url, { signal: controller.signal, credentials: "omit" });
        const j = await r.json().catch(() => null);

        if (!alive) return;

        if (j && j.ok && j.active === true) {
          // Fuerza URL a paid=1 (sin recargar toda la app)
          const next = new URL(window.location.href);
          next.searchParams.set("paid", "1");
          window.history.replaceState({}, "", next.toString());
          setPaidMsg("✅ Pago confirmado. Ya puedes ingresar.");
          controller.abort();
          return;
        }

        // corta después de ~2 min (40 intentos * 3s)
        if (attempts >= 40) {
          controller.abort();
          return;
        }
      } catch (e) {
        // si abortamos, no hacemos nada
      }
    };

    // primera verificación inmediata + luego cada 3s
    tick();
    const id = setInterval(tick, 3000);

    return () => {
      alive = false;
      controller.abort();
      clearInterval(id);
    };
  }, [q]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const eMail = (email || "").trim().toLowerCase();
    if (eMail) localStorage.setItem("fv_email", eMail);
    const res = await login(eMail, password);
    if (!res.ok) {
      setErr(res.message || "Correo o contraseña inválidos.");
      return;
    }
    nav("/comparator");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1020] px-4">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-6">
          <img src="/logo-fv.png" alt="Factor Victoria" className="mx-auto mb-5 w-28 md:w-36" />
          <div className="text-2xl font-semibold text-white">Iniciar sesión</div>
          <div className="text-sm text-white/60 mt-1">
            Ingresa tu correo (de compra) para activar el modo correspondiente.
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {banner ? (
            <div
              className="text-sm text-white/90 rounded-xl p-3 border"
              style={{
                background: "rgba(11, 31, 22, 0.55)",
                borderColor: "rgba(230, 196, 100, 0.35)",
              }}
            >
              {banner}
            </div>
          ) : null}

          <input
            className="w-full px-4 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            placeholder="correo@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          
<div className="relative">
  <input
    className="w-full px-4 py-3 pr-12 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
    placeholder="contraseña (opcional)"
    type={showPwd ? "text" : "password"}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    autoComplete="current-password"
  />
  <button
    type="button"
    onClick={() => setShowPwd(!showPwd)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
  >
    {showPwd ? (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.73-1.63 1.9-3.13 3.37-4.37M9.9 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a11.05 11.05 0 0 1-4.06 5.06M1 1l22 22"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>)}
  </button>
</div>


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
