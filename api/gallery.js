import { list } from "@vercel/blob";
import { blobPath } from "./_lib/env.js";
import { readSettings } from "./_lib/settings.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const [{ blobs }, settings] = await Promise.all([
      list({ prefix: blobPath("gallery/"), limit: 1000 }),
      readSettings().catch(() => null),
    ]);
    // Orden elegido en el panel. Las fotos que no están en ese orden (recién subidas)
    // van primero, de la más nueva a la más vieja.
    const order = settings?.galleryOrder || [];
    const pos = new Map(order.map((u, i) => [u, i]));
    blobs.sort((a, b) => {
      const pa = pos.has(a.url) ? pos.get(a.url) : -1;
      const pb = pos.has(b.url) ? pos.get(b.url) : -1;
      if (pa === -1 && pb === -1) return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      if (pa === -1) return -1;
      if (pb === -1) return 1;
      return pa - pb;
    });
    const images = blobs.map((b) => ({ url: b.url, pathname: b.pathname }));
    const fresh = "fresh" in (req.query || {});
    // Vercel guarda una copia 30 segundos; el navegador siempre pregunta
    res.setHeader("Cache-Control", fresh ? "no-store" : "no-cache");
    if (!fresh) res.setHeader("Vercel-CDN-Cache-Control", "max-age=30, stale-while-revalidate=60");
    return res.status(200).json({ images });
  } catch {
    return res.status(500).json({ error: "Failed to list images" });
  }
}
