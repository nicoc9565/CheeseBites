import { isAuthorized, rejectUnauthorized } from "./_lib/auth.js";

// Visitas de la web real, leídas de Vercel Web Analytics para la pantalla Stats del panel.
// La llave (VERCEL_ANALYTICS_TOKEN) solo vive en el servidor: nunca llega al navegador.
const PROJECT_ID = "prj_HqA4hGxDibLuxGzIYmXiv5zWDLKH";
const TEAM_ID = "team_HUHHd8WCO7qlb0YHN4gYl2C5";
const BASE = "https://api.vercel.com/v1/query/web-analytics/visits";
const DAY = 86400000;

let cache = { at: 0, data: null }; // 5 minutos, para no consultar a Vercel en cada vuelta

async function query(path, params) {
  const qs = new URLSearchParams({ projectId: PROJECT_ID, teamId: TEAM_ID, ...params });
  const r = await fetch(`${BASE}/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_ANALYTICS_TOKEN}` },
  });
  if (!r.ok) throw Object.assign(new Error(`Analytics ${r.status}`), { status: r.status });
  return (await r.json()).data;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!(await isAuthorized(req))) return rejectUnauthorized(res);
  res.setHeader("Cache-Control", "no-store");

  if (!process.env.VERCEL_ANALYTICS_TOKEN) return res.status(503).json({ error: "Visit stats are not set up yet." });
  if (cache.data && Date.now() - cache.at < 5 * 60_000) return res.status(200).json(cache.data);

  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const until = iso(now);
  try {
    const [week, month, days, sources, devices] = await Promise.all([
      query("count", { since: iso(now - 7 * DAY), until }),
      query("count", { since: iso(now - 30 * DAY), until }),
      query("aggregate", { by: "day", since: iso(now - 14 * DAY), until, limit: "20" }),
      query("aggregate", { by: "referrerHostname", since: iso(now - 30 * DAY), until, limit: "6" }),
      query("aggregate", { by: "deviceType", since: iso(now - 30 * DAY), until, limit: "4" }),
    ]);
    const pick = (rows, key) => (rows || []).map((r) => ({ key: r[key] ?? "", visitors: r.visitors || 0, pageviews: r.pageviews || 0 }));
    const data = {
      week: { visitors: week?.visitors || 0, pageviews: week?.pageviews || 0 },
      month: { visitors: month?.visitors || 0, pageviews: month?.pageviews || 0 },
      days: pick(days, "timestamp"),
      sources: pick(sources, "referrerHostname"),
      devices: pick(devices, "deviceType"),
    };
    cache = { at: Date.now(), data };
    return res.status(200).json(data);
  } catch (err) {
    const msg = err?.status === 403 || err?.status === 401
      ? "The Vercel key expired or was removed. Ask the person who manages the website to create a new one."
      : "Could not load visits right now. Try again in a minute.";
    return res.status(502).json({ error: msg });
  }
}
