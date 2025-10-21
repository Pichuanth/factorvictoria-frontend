// src/lib/auth.js
import { useEffect, useState } from "react";

/** Escalera de planes */
export const PLAN_RANK = {
  basic: 1,        // $19.990 (x10)
  trimestral: 2,   // $44.990 (x20)
  anual: 3,        // $99.990 (x50)
  vitalicio: 4,    // $249.990 (x100)
};

/** Demos predefinidos */
const DEMO_USERS = {
  "basic@demo.cl": {
    email: "basic@demo.cl",
    name: "Demo Básico",
    rank: PLAN_RANK.basic,
    planId: "basic",
  },
  "trimestral@demo.cl": {
    email: "trimestral@demo.cl",
    name: "Demo Trimestral",
    rank: PLAN_RANK.trimestral,
    planId: "trimestral",
  },
  "anual@demo.cl": {
    email: "anual@demo.cl",
    name: "Demo Anual",
    rank: PLAN_RANK.anual,
    planId: "anual",
  },
  "vitalicio@demo.cl": {
    email: "vitalicio@demo.cl",
    name: "Demo Vitalicio",
    rank: PLAN_RANK.vitalicio,
    planId: "vitalicio",
  },
};

const DEMO_PASSWORD = "Factor1986?"; // misma para todos los demo

const LS_KEY = "fv_user";

/** Lectura/escritura localStorage */
export function getUser() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(u) {
  localStorage.setItem(LS_KEY, JSON.stringify(u));
  window.dispatchEvent(new Event("storage")); // notifica a listeners locales
}

export function clearUser() {
  localStorage.removeItem(LS_KEY);
  window.dispatchEvent(new Event("storage"));
}

/** API pública de auth */
export async function login(email, password) {
  const key = String(email || "").trim().toLowerCase();
  const demo = DEMO_USERS[key];

  if (!demo) {
    throw new Error("Usuario no encontrado (usa basic@demo.cl, trimestral@demo.cl, anual@demo.cl o vitalicio@demo.cl)");
  }
  if (password !== DEMO_PASSWORD) {
    throw new Error("Contraseña incorrecta (usa Factor1986?)");
  }

  // Lo que guardamos SIEMPRE incluye rank numérico y planId string
  const user = {
    email: demo.email,
    name: demo.name,
    rank: demo.rank,
    planId: demo.planId,
    loggedAt: Date.now(),
  };
  setUser(user);
  return user;
}

export function logout() {
  clearUser();
}

export function isLoggedIn() {
  return !!getUser();
}

/** Hook react: estado de sesión reactivo */
export function useAuth() {
  const [user, setU] = useState(() => getUser());

  useEffect(() => {
    const onStorage = () => setU(getUser());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return {
    isLoggedIn: !!user,
    user,
    login,
    logout,
  };
}
