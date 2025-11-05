export const config = { runtime: "nodejs" }; // fuerza Node (no Edge)

export default async function handler(req, res) {
  const hasEnv = !!process.env.APIFOOTBALL_KEY;
  res.status(200).json({
    ok: true,
    runtime: "nodejs",
    hasEnvAPIFOOTBALL_KEY: hasEnv,
    now: new Date().toISOString(),
  });
}
