// src/lib/auth.js
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const LS_KEY = "fv_auth_v1";

export const PLAN_RANK = {
  BASIC: 1,      // $19.990
  PRO: 2,        // $44.990
  POPULAR: 3,    // $99.990 (Anual)
  VITALICIO: 4,  // $249.990
};

const DEMO_USERS = [
  { email: "basic@demo.cl",     password: "123456", name: "Demo Basic",     plan: "BASIC",     rank: PLAN_RANK.BASIC },
  { email: "pro@demo.cl",       password: "123456", name: "Demo Pro",       plan: "PRO",       rank: PLAN_RANK.PRO },
  { email: "anual@demo.cl",     password: "123456", name: "Demo Anual",     plan: "POPULAR",   rank: PLAN_RANK.POPULAR },
  { email: "vitalicio@demo.cl", password: "123456", name: "Demo Vitalicio", plan: "VITALICIO", rank: PLAN_RANK.VITALICIO },
];

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Cargar del localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {}
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    try {
      if (user) localStorage.setItem(LS_KEY, JSON.stringify(user));
      else localStorage.removeItem(LS_KEY);
    } catch (e) {}
  }, [user]);

  const login = async (email, password) => {
    const found = DEMO_USERS.find(
      u => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
    );
    if (!found) throw new Error("Credenciales inválidas");
    setUser({ email: found.email, name: found.name, plan: found.plan, rank: found.rank });
    return true;
  };

  const logout = () => setUser(null);

  const value = useMemo(() => ({
    user,
    isLoggedIn: !!user,
    login,
    logout,
    getUser: () => user,
  }), [user]);

  // *** IMPORTANTE: devolver SIN JSX para evitar el parse error en .js ***
  return React.createElement(AuthCtx.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

// Helpers fuera de React (opcionales)
export function isLoggedIn() {
  try { return !!JSON.parse(localStorage.getItem(LS_KEY)); } catch { return false; }
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch { return null; }
}
