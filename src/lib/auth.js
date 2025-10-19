// src/lib/auth.js

// Usuarios DEMO por plan
export const DEMO_USERS = [
  { email: "vitalicio@demo.cl",  password: "FV-demo-249990", plan: "vitalicio" },
  { email: "anual@demo.cl",      password: "FV-demo-99990",  plan: "anual" },
  { email: "trimestral@demo.cl", password: "FV-demo-44990",  plan: "trimestral" },
  { email: "basico@demo.cl",     password: "FV-demo-19990",  plan: "basico" },
];

const KEY = "fv_auth";

// Guarda sesión simple en localStorage
function saveSession(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getUser() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getUser();
}

export function signOut() {
  localStorage.removeItem(KEY);
}

// “Login” demo (match exacto email/clave)
export function signIn(email, password) {
  const user = DEMO_USERS.find(
    (u) => u.email.trim().toLowerCase() === String(email).trim().toLowerCase() &&
           u.password === String(password)
  );

  if (!user) {
    return { ok: false, error: "Correo o contraseña incorrectos." };
  }

  const session = {
    email: user.email,
    plan: user.plan,
    ts: Date.now(),
  };
  saveSession(session);
  return { ok: true, user: session };
}
