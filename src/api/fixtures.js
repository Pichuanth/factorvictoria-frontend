// src/api/fixtures.js
const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function fetchFixtures(qs) {
  const url = `${API_BASE}/api/fixtures?${qs.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);
  return await res.json();
}
