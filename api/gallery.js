import { list } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { blobs } = await list({ prefix: "gallery/", limit: 1000 });
    // Más nuevas primero, igual en la web y en el panel
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const images = blobs.map((b) => ({ url: b.url, pathname: b.pathname }));
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate");
    return res.status(200).json({ images });
  } catch {
    return res.status(500).json({ error: "Failed to list images" });
  }
}
