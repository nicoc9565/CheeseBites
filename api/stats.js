import { list } from "@vercel/blob";
import { isAuthorized, rejectUnauthorized } from "./_lib/auth.js";
import { blobPath } from "./_lib/env.js";

// Devuelve los toques en "enviar pedido" para el panel.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!(await isAuthorized(req))) return rejectUnauthorized(res);
  res.setHeader("Cache-Control", "no-store");

  const prefix = blobPath("stats/orders/");
  try {
    const events = [];
    let cursor;
    for (let page = 0; page < 5; page++) {
      const r = await list({ prefix, limit: 1000, cursor });
      for (const b of r.blobs) {
        const name = b.pathname.slice(prefix.length);
        const m = name.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_(sms|whatsapp|email)_(\d+)_(\d+)_([01])/);
        if (!m) continue;
        events.push({
          at: `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`,
          channel: m[6],
          qty: Number(m[7]),
          total: Number(m[8]) / 100,
          promo: m[9] === "1",
        });
      }
      if (!r.hasMore) break;
      cursor = r.cursor;
    }
    events.sort((a, b) => (a.at < b.at ? 1 : -1));
    return res.status(200).json({ events });
  } catch {
    return res.status(500).json({ error: "Could not load stats" });
  }
}
