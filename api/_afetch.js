// Backend helper para llamar a API-FOOTBALL desde las funciones serverless
export default async function afetch(path, params = {}) {
  const key = process.env.APIFOOTBALL_KEY;
  if (!key) throw new Error("Falta APIFOOTBALL_KEY en variables de entorno");

  const url = new URL(`https://v3.football.api-sports.io${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  }

  const resp = await fetch(url, {
    headers: { "x-apisports-key": key },
    // Nota: fetch nativo en Node 18+ (Vercel usa Node 18+ por defecto)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API error ${resp.status}: ${text || resp.statusText}`);
  }

  return resp.json();
}
