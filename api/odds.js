// /api/odds.js
export const config = { runtime: "edge" };

const API_KEY  = process.env.APISPORTS_KEY;
const API_HOST = process.env.APISPORTS_HOST || "v3.football.api-sports.io";
const TZ       = process.env.VITE_API_TZ || "America/Santiago";

async function api(path, params) {
  if (!API_KEY) {
    return new Response(JSON.stringify({ error: "Missing APISPORTS_KEY" }), { status: 500 });
  }
  const url = new URL(`https://${API_HOST}${path}`);
  for (const [k, v] of Object.entries(params || {})) if (v != null && v !== "") url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY, "x-rapidapi-key": API_KEY },
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>"");
    return new Response(JSON.stringify({ error: `Upstream ${res.status}`, detail: t }), { status: res.status });
  }
  const data = await res.json();
  return data;
}

function to1x2Markets(resp) {
  const out = [];
  const books = Array.isArray(resp?.response) ? resp.response : [];
  // estructura: response[ { bookmaker: {...}, bets: [ { name: 'Match Winner'|'1X2' , values: [ {value:'Home',odd:'1.85'} ... ] } ] } ]
  for (const book of books) {
    for (const bet of (book?.bets || [])) {
      const nm = String(bet?.name || "").toLowerCase();
      if (nm.includes("match winner") || nm.includes("1x2")) {
        for (const v of (bet?.values || [])) {
          const label = String(v?.value || "").toLowerCase();
          let outName = label.includes("home") || label === "1" ? "1" :
                        label.includes("draw") || label === "x" ? "X" :
                        label.includes("away") || label === "2" ? "2" : null;
          const odd = Number(v?.odd);
          if (outName && isFinite(odd) && odd > 1.01) {
            out.push({ out: outName, odd });
          }
        }
      }
    }
  }
  return out;
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const fixture = searchParams.get("fixture");
    if (!fixture) return new Response(JSON.stringify({ markets: [] }), { status: 200 });

    const raw = await api("/odds", { fixture });
    if (raw instanceof Response) return raw;

    const odds = to1x2Markets(raw);
    return new Response(JSON.stringify({ markets: odds }), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
