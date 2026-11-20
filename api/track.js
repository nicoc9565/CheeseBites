import { put } from "@vercel/blob";
import { blobPath } from "./_lib/env.js";

// Anota cada vez que alguien toca un botón para mandar el pedido.
// Cada toque es un archivito con los datos en el nombre: así el panel los cuenta
// con una sola consulta, sin abrir uno por uno.
const CHANNELS = ["sms", "whatsapp", "email"];
const recent = new Map(); // límite simple por conexión, para que nadie llene esto a propósito

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const channel = CHANNELS.includes(body?.channel) ? body.channel : null;
  const qty = Math.floor(Number(body?.qty));
  const total = Math.round(Number(body?.total) * 100) / 100;
  if (!channel || !(qty >= 1 && qty <= 999) || !(total >= 0 && total <= 100000)) {
    return res.status(400).json({ error: "Invalid" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 3600_000);
  if (hits.length >= 10) return res.status(429).json({ error: "Too many" });
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();

  const promo = body?.promo ? 1 : 0;
  try {
    // stats/orders/<fecha>_<canal>_<cajas>_<total en centavos>_<promo>.txt
    const name = `${new Date(now).toISOString().replace(/[:.]/g, "-")}_${channel}_${qty}_${Math.round(total * 100)}_${promo}.txt`;
    await put(blobPath(`stats/orders/${name}`), "1", { access: "public", contentType: "text/plain" });
    return res.status(204).end();
  } catch {
    return res.status(500).json({ error: "Failed" });
  }
}
