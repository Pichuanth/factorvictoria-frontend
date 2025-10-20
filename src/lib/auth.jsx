// src/lib/auth.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

// Demo users (puedes editar/añadir)
const USERS = [
  { email: "mensual@demo.cl",    password: "Factor1986?", rank: "mensual" },
  { email: "trimestral@demo.cl", password: "Factor1986?", rank: "trimestral" },
  { email: "anual@demo.cl",      password: "Factor1986?", rank: "anual" },
  { email: "vitalicio@demo.cl",  password: "Factor1986?", rank: "vitalicio" },
];

// jerarquía del plan
export const PLAN_RANK = {
  mensual: 1,
  trimestral: 2,
  anual: 3,
  vitalicio: 4,
};

// multiplicador por plan (lo que me pediste)
export const MULT_BY_PLAN = {
  mensual: 10,
  trimestral: 20,
  anual: 50,
  vitalicio: 100,
};

const STORAGE_KEY = "fv_user";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // cargar desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login = (email, password) => {
    const found = USERS.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === password
    );
    if (!found) throw new Error("Credenciales inválidas");
    setUser(found);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    return found;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: !!user,
      rank: user?.rank ?? null,
      login,
      logout,
      // utilidades por si las quieres en otros lados
      multiplier: user ? MULT_BY_PLAN[user.rank] : null,
    }),
    [user]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
