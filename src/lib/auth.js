// src/lib/auth.js
import React, { createContext, useContext, useEffect, useState } from "react";

/**
 * USUARIOS DEMO (solo pruebas locales / vercel de staging)
 * Puedes cambiar correos o passwords si quieres.
 */
const DEMO_USERS = [
  { email: "basic@demo.cl",      password: "demo123",  plan: "basic" },       // $19.990
  { email: "trimestral@demo.cl", password: "demo123",  plan: "trimestral" },  // $44.990
  { email: "anual@demo.cl",      password: "demo123",  plan: "anual" },       // $99.990
  { email: "vitalicio@demo.cl",  password: "demo123",  plan: "vitalicio" },   // $249.990
  { email: "admin@demo.cl",      password: "admin123", plan: "admin" },       // full
];

/**
 * ranking de planes para bloquear/desbloquear secciones
 */
export const PLAN_RANK = {
  basic: 1,         // x10 oculto, regalo 1.5–3 visible, etc. (ajusta a tu regla)
  trimestral: 2,
  anual: 3,
  vitalicio: 4,
  admin: 999,
};

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // {email, plan}

  useEffect(() => {
    const raw = localStorage.getItem("fv:user");
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
  }, []);

  const login = async (email, password) => {
    const found = DEMO_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) throw new Error("Credenciales inválidas");
    const payload = { email: found.email, plan: found.plan };
    localStorage.setItem("fv:user", JSON.stringify(payload));
    setUser(payload);
    return payload;
  };

  const logout = () => {
    localStorage.removeItem("fv:user");
    setUser(null);
  };

  const value = {
    user,          // null | {email, plan}
    isLoggedIn: !!user,
    plan: user?.plan || null,
    rank: user ? PLAN_RANK[user.plan] ?? 0 : 0,
    login, logout,
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
