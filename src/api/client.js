// src/api/client.js
const API_BASE = import.meta.env.VITE_API_BASE || "";

function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  return q.toString();
}

export async function apiGet(path, params = {}) {
  const url = `${API_BASE}${path}?${qs(params)}`;
  const res = await fetch(url);
  const text = await res.text();

  let data;
  try { data = JSON.parse(text); } catch { data = { error: "bad_json", raw: text }; }

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}
